#!/usr/bin/env python3
"""JinMemo host backup tool. Linux/root for operations; stdlib plus Docker, rsync, GnuPG."""
import argparse
import contextlib
import datetime as dt
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import shutil
import signal
import stat
import subprocess
import sys
import tarfile
import tempfile
import time

FORMAT = 1
ID_RE = re.compile(r"jinmemo-backup-\d{8}T\d{6}Z-[a-f0-9]{8}\Z")
CONTENTS = {"database.dump", "media.tar.gz", "compose.json", "environment.env"}
COUNTS_SQL = """SELECT json_build_object(
 'orders',(SELECT count(*) FROM jinmemo_orders),
 'carts',(SELECT count(*) FROM jinmemo_carts),
 'products',(SELECT count(*) FROM jinmemo_products),
 'payments',(SELECT count(*) FROM jinmemo_payment_references),
 'ticketFiles',(SELECT count(*) FROM jinmemo_ticket_files),
 'databaseBytes',pg_database_size(current_database()),
 'postgresVersion',current_setting('server_version_num')::integer,
 'keyRequired',EXISTS(SELECT 1 FROM jinmemo_order_mail_keys)
   OR EXISTS(SELECT 1 FROM jinmemo_carts)
   OR EXISTS(SELECT 1 FROM jinmemo_settings WHERE data::text ~ '(encryptedPassword|Encrypted)'))::text;"""
RECOVERY_SQL = """BEGIN;
DELETE FROM jinmemo_sessions;
DELETE FROM jinmemo_pos_sessions;
DELETE FROM jinmemo_partner_sessions;
UPDATE jinmemo_admin_otp SET status='USED';
UPDATE jinmemo_mail_outbox SET status='FAILED',last_error='Restored backup: review before resending'
 WHERE status<>'SENT';
UPDATE jinmemo_settings SET data=data || '{"vnpayEnabled":false,"vnpayCardEnabled":false,"sepayEnabled":false,"sepayCardEnabled":false,"paypalEnabled":false}'::jsonb,version=version+1 WHERE id='payments';
COMMIT;"""


class BackupError(Exception):
    pass


def safe_failure(error):
    if isinstance(error, BackupError):
        return str(error)
    code = getattr(error, "errno", None)
    return type(error).__name__ + (" (OS error " + str(code) + ")" if code is not None else "")


def utc():
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def safe_json(path, value, mode=0o600):
    path = Path(path)
    tmp = path.with_name(path.name + ".tmp-" + secrets.token_hex(4))
    try:
        with open(tmp, "x", encoding="utf-8") as out:
            os.chmod(tmp, mode)
            json.dump(value, out, ensure_ascii=False, indent=2)
            out.flush()
            os.fsync(out.fileno())
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


def fingerprint(path):
    h = hashlib.sha256()
    with open(path, "rb") as src:
        for block in iter(lambda: src.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def private_file(path):
    path = Path(path)
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode):
        raise BackupError("Expected a regular private file")
    if os.name == "posix" and (info.st_uid != 0 or info.st_mode & 0o077):
        raise BackupError("Private file must be root-owned with mode 0600")
    return path


def private_dir(path, public=False):
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or path.resolve() == Path(path.anchor):
        raise BackupError("Invalid working directory")
    if os.name == "posix" and (info.st_uid != 0 or info.st_mode & 0o022):
        raise BackupError("Working directory must be root-owned and not writable by others")
    os.chmod(path, 0o755 if public else 0o700)
    return path.resolve()


class FileLock:
    def __init__(self, path):
        self.path = path

    def __enter__(self):
        import fcntl
        self.file = open(self.path, "a+b")
        os.chmod(self.path, 0o600)
        try:
            fcntl.flock(self.file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            self.file.close()
            raise BackupError("Another backup or recovery is running") from None
        return self

    def __exit__(self, *_):
        self.file.close()


class Runner:
    def run(self, args, *, source=None, dest=None, label="command"):
        # No shell interpolation, credentials in argv, or raw subprocess errors in journal/UI.
        try:
            result = subprocess.run([str(a) for a in args], stdin=source,
                                    stdout=dest if dest is not None else subprocess.PIPE,
                                    stderr=subprocess.PIPE, check=False)
        except OSError as error:
            raise BackupError(label + " could not start (OS error " + str(error.errno) + ")") from None
        if result.returncode:
            raise BackupError(label + " failed (exit " + str(result.returncode) + ")")
        return result.stdout or b""


class Crypto:
    def __init__(self, key, work, executable="gpg"):
        self.key, self.work, self.executable = Path(key), Path(work), executable

    def command(self, home):
        return [self.executable, "--batch", "--yes", "--no-options", "--homedir", str(home),
                "--pinentry-mode", "loopback", "--passphrase-file", str(self.key)]

    def encrypt(self, payload, manifest, target):
        with tempfile.TemporaryDirectory(prefix="gpg-", dir=self.work) as home:
            os.chmod(home, 0o700)
            with tempfile.TemporaryFile() as err:
                process = subprocess.Popen(self.command(home) + ["--symmetric", "--cipher-algo", "AES256",
                    "--compress-algo", "none", "--output", str(target)], stdin=subprocess.PIPE,
                    stdout=subprocess.DEVNULL, stderr=err)
                try:
                    with tarfile.open(fileobj=process.stdin, mode="w|") as archive:
                        blob = json.dumps(manifest).encode()
                        entry = tarfile.TarInfo("manifest.json")
                        entry.size, entry.mode = len(blob), 0o600
                        archive.addfile(entry, io.BytesIO(blob))
                        for name in sorted(CONTENTS):
                            archive.add(Path(payload) / name, arcname=name, recursive=False)
                    process.stdin.close()
                    if process.wait():
                        raise BackupError("Encryption failed")
                except BaseException:
                    process.stdin.close()
                    if process.poll() is None:
                        process.terminate()
                    process.wait()
                    raise

    def unpack(self, archive_path, destination):
        destination = Path(destination)
        with tempfile.TemporaryDirectory(prefix="gpg-", dir=self.work) as home:
            os.chmod(home, 0o700)
            with tempfile.TemporaryFile() as err:
                process = subprocess.Popen(self.command(home) + ["--decrypt", str(archive_path)],
                    stdout=subprocess.PIPE, stderr=err)
                try:
                    manifest = None
                    seen = set()
                    with tarfile.open(fileobj=process.stdout, mode="r|") as archive:
                        for item in archive:
                            if item.name in seen or not item.isfile() or item.name not in CONTENTS | {"manifest.json"}:
                                raise BackupError("Unexpected archive member")
                            seen.add(item.name)
                            source = archive.extractfile(item)
                            if item.name == "manifest.json":
                                if manifest is not None or item.size > 65536:
                                    raise BackupError("Invalid manifest")
                                manifest = json.loads(source.read())
                                validate_manifest(manifest)
                                continue
                            if manifest is None:
                                raise BackupError("Manifest must be first")
                            expected = manifest["files"][item.name]
                            if item.size != expected["bytes"]:
                                raise BackupError("Archive size mismatch")
                            h = hashlib.sha256()
                            with open(destination / item.name, "xb") as out:
                                os.chmod(destination / item.name, 0o600)
                                for block in iter(lambda: source.read(1024 * 1024), b""):
                                    out.write(block)
                                    h.update(block)
                            if h.hexdigest() != expected["sha256"]:
                                raise BackupError("Archive checksum mismatch")
                    # Drain to EOF so GnuPG verifies the final integrity packet, not just the tar trailer.
                    for padding in iter(lambda: process.stdout.read(1024 * 1024), b""):
                        if padding.strip(b"\0"):
                            raise BackupError("Unexpected trailing archive data")
                    process.stdout.close()
                    if process.wait() or seen != CONTENTS | {"manifest.json"}:
                        raise BackupError("Decryption or integrity verification failed")
                    validate_media(destination / "media.tar.gz", manifest["snapshot"]["keyRequired"])
                    return manifest
                except BaseException:
                    process.stdout.close()
                    if process.poll() is None:
                        process.terminate()
                    process.wait()
                    raise


def validate_manifest(value):
    if not isinstance(value, dict) or value.get("format") != FORMAT or not ID_RE.fullmatch(value.get("id", "")):
        raise BackupError("Invalid JinMemo backup manifest")
    if set(value.get("files", {})) != CONTENTS:
        raise BackupError("Incomplete backup")
    if not re.fullmatch(r"[a-f0-9]{40,64}", value.get("revision", "")):
        raise BackupError("Invalid source revision")
    for item in value["files"].values():
        if not isinstance(item.get("bytes"), int) or item["bytes"] < 0 or not re.fullmatch(r"[a-f0-9]{64}", item.get("sha256", "")):
            raise BackupError("Invalid file checksum metadata")
    for image in (value.get("postgresImage", ""), value.get("appImage", "")):
        if not re.fullmatch(r"sha256:[a-f0-9]{64}", image):
            raise BackupError("Invalid source image ID")
    snapshot = value.get("snapshot", {})
    if not isinstance(snapshot.get("keyRequired"), bool):
        raise BackupError("Missing snapshot key requirement")
    for key in ("orders", "carts", "products", "payments", "ticketFiles", "databaseBytes", "postgresVersion"):
        if not isinstance(snapshot.get(key), int) or snapshot[key] < 0:
            raise BackupError("Invalid snapshot counts")


def validate_media(path, key_required):
    seen = set()
    has_key = False
    with tarfile.open(path, "r:gz") as archive:
        for item in archive:
            name = PurePosixPath(item.name)
            if name.is_absolute() or ".." in name.parts or "\\" in item.name or str(name) in seen or not (item.isfile() or item.isdir()):
                raise BackupError("Unsafe media archive")
            seen.add(str(name))
            if str(name) == ".smtp-key":
                if not item.isfile() or item.size != 32:
                    raise BackupError("Invalid media encryption key")
                has_key = True
    if key_required and not has_key:
        raise BackupError("Media encryption key is missing; backup cannot decrypt stored secrets")


def load_config(path):
    value = json.loads(private_file(path).read_text())
    for key in ("projectDir", "backupDir", "stateDir", "keyFile"):
        if not isinstance(value.get(key), str) or not Path(value[key]).is_absolute():
            raise BackupError("Invalid backup configuration")
    if not 1 <= value.get("keep", 0) <= 90:
        raise BackupError("Invalid retention count")
    private_file(value["keyFile"])
    if not re.fullmatch(r"[a-f0-9]{64}\n?", Path(value["keyFile"]).read_text()):
        raise BackupError("Backup key must be 64 random hex characters")
    return value


class Manager:
    def __init__(self, config, runner=None):
        self.config, self.runner = config, runner or Runner()
        self.project = Path(config["projectDir"]).resolve()
        self.out = private_dir(config["backupDir"], public=True)
        self.state = private_dir(config["stateDir"])
        self.crypto = Crypto(config["keyFile"], self.state)

    def compose(self, *args, **kwargs):
        return self.runner.run(["docker", "compose", "--project-directory", self.project, *args], **kwargs)

    def inspect(self, container):
        if not re.fullmatch(r"[a-f0-9]{12,64}", container):
            raise BackupError("Invalid container ID")
        return json.loads(self.runner.run(["docker", "inspect", container], label="Container inspection"))[0]

    def discover(self):
        found = {}
        for service in ("postgres", "api", "web", "worker"):
            ids = self.compose("ps", "--all", "--quiet", service, label="Compose discovery").decode().split()
            if len(ids) != 1:
                raise BackupError("Expected one " + service + " container")
            info = self.inspect(ids[0])
            if info.get("Config", {}).get("Labels", {}).get("com.docker.compose.service") != service:
                raise BackupError("Container service label mismatch")
            found[service] = info
        projects = {v["Config"]["Labels"].get("com.docker.compose.project") for v in found.values()}
        if len(projects) != 1 or not next(iter(projects)):
            raise BackupError("Containers are not in the same Compose project")
        if not found["postgres"]["State"]["Running"] or not found["api"]["State"]["Running"]:
            raise BackupError("Postgres and API must be running before backup")
        mounts = [m for m in found["api"]["Mounts"] if m["Destination"] == "/app/data/media"]
        if len(mounts) != 1:
            raise BackupError("Expected one media mount")
        media = Path(mounts[0]["Source"])
        if not media.is_absolute() or not media.is_dir() or media.is_symlink() or media.resolve() == Path(media.anchor):
            raise BackupError("Unsafe media source")
        if media.resolve() == self.out or media.resolve() in self.out.parents or self.out in media.resolve().parents:
            raise BackupError("Backup and source media must be separate")
        return found, media

    def psql(self, pg, sql):
        # Dollar variables are expanded only inside the already configured postgres container.
        command = 'exec psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" -X -A -t --set=ON_ERROR_STOP=1 -c "$1"'
        return self.runner.run(["docker", "exec", pg, "sh", "-eu", "-c", command, "jinmemo-backup", sql], label="Database inspection")

    def status(self, state, **extra):
        safe_json(self.out / "last-run.json", {"state": state, "updatedAt": utc(), **extra}, 0o644)

    def resume(self):
        journal = self.state / "resume.json"
        if not journal.exists():
            return
        value = json.loads(private_file(journal).read_text())
        for entry in value["containers"]:
            info = self.inspect(entry["id"])
            labels = info.get("Config", {}).get("Labels", {})
            if labels.get("com.docker.compose.project") != value["project"] or labels.get("com.docker.compose.service") != entry["service"]:
                raise BackupError("Recovery journal container mismatch")
            self.runner.run(["docker", "start", entry["id"]], label="Resume " + entry["service"])
        for _ in range(90):
            states = [self.inspect(x["id"])["State"] for x in value["containers"]]
            if all(s.get("Running") and s.get("Health", {}).get("Status", "healthy") == "healthy" for s in states):
                journal.unlink()
                return
            time.sleep(1)
        raise BackupError("App containers did not resume; run recover and inspect Docker status")

    def source_revision(self):
        try:
            revision = self.runner.run(["git", "-c", "safe.directory=" + str(self.project), "-C", self.project, "rev-parse", "HEAD"], label="Source revision").decode().strip()
        except BackupError:
            try:
                revision = (self.project / "source-revision").read_text().strip()
            except OSError:
                raise BackupError("Source revision unavailable: Git cannot read HEAD and source-revision is missing or unreadable") from None
        if not re.fullmatch(r"[a-f0-9]{40,64}", revision):
            raise BackupError("Invalid source revision; expected a full Git commit ID")
        return revision

    def check(self):
        # Read-only diagnostics: never stop containers, dump data, rotate backups or expose credentials.
        for executable in ("docker", "rsync", "gpg", "git"):
            if not shutil.which(executable):
                raise BackupError("Install prerequisite: " + executable)
        with FileLock(self.state / "operation.lock"):
            found, media = self.discover()
            snapshot = json.loads(self.psql(found["postgres"]["Id"], COUNTS_SQL))
            media_bytes = sum(p.stat().st_size for p in media.rglob("*") if p.is_file() and not p.is_symlink())
            revision = self.source_revision()
            needed = media_bytes + snapshot["databaseBytes"]
            reservations = [(self.state, needed * 3), (self.out, needed)]
            if self.state.stat().st_dev == self.out.stat().st_dev:
                reservations = [(self.state, needed * 4)]
            for path, reserve in reservations:
                if shutil.disk_usage(path).free < reserve + 1024 ** 3:
                    raise BackupError("Insufficient free disk for snapshot, encryption and verification copies")
            print("Preflight passed: Compose, database, media, source revision " + revision[:12] + " and disk space. No containers were stopped. This does not replace a verified backup/restore-test.")

    def backup(self):
        with FileLock(self.state / "operation.lock"):
            self.resume()
            started = utc()
            self.status("RUNNING", startedAt=started, phase="preflight")
            identifier = "jinmemo-backup-" + dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ-") + secrets.token_hex(4)
            partial = self.out / (identifier + ".tar.gpg.partial")
            phase = "discover"
            try:
                found, media = self.discover()
                phase = "database-preflight"
                pg = found["postgres"]["Id"]
                preflight = json.loads(self.psql(pg, COUNTS_SQL))
                phase = "media-preflight"
                media_bytes = sum(p.stat().st_size for p in media.rglob("*") if p.is_file() and not p.is_symlink())
                needed = media_bytes + preflight["databaseBytes"]
                reservations = [(self.state, needed * 3), (self.out, needed)]
                if self.state.stat().st_dev == self.out.stat().st_dev:
                    reservations = [(self.state, needed * 4)]
                for path, reserve in reservations:
                    if shutil.disk_usage(path).free < reserve + 1024 ** 3:
                        raise BackupError("Insufficient free disk; old verified backups were not removed")
                with tempfile.TemporaryDirectory(prefix="snapshot-", dir=self.state) as work:
                    work = Path(work)
                    snapshot_dir = work / "media"
                    snapshot_dir.mkdir(mode=0o700)
                    sync = ["rsync", "--archive", "--numeric-ids", "--delete", "--one-file-system", str(media) + "/", str(snapshot_dir) + "/"]
                    phase = "initial-media-copy"
                    self.runner.run(sync, label="Initial media copy")
                    apps = [{"service": name, "id": found[name]["Id"]} for name in ("api", "worker", "web") if found[name]["State"]["Running"]]
                    project = found["api"]["Config"]["Labels"]["com.docker.compose.project"]
                    safe_json(self.state / "resume.json", {"project": project, "containers": apps})
                    try:
                        self.status("RUNNING", startedAt=started, phase="snapshot")
                        phase = "pause-writers"
                        self.runner.run(["docker", "stop", "--time", "120", *[x["id"] for x in apps]], label="Pause JinMemo writers")
                        phase = "final-media-copy"
                        self.runner.run(sync, label="Final media copy")
                        phase = "database-dump"
                        snapshot = json.loads(self.psql(pg, COUNTS_SQL))
                        with open(work / "database.dump", "xb") as out:
                            self.runner.run(["docker", "exec", pg, "sh", "-eu", "-c", 'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --no-owner --no-privileges'], dest=out, label="Database dump")
                        phase = "compose-snapshot"
                        with open_private(work / "compose.json") as config_out:
                            self.compose("config", "--format", "json", dest=config_out, label="Compose configuration snapshot")
                        captured_at = utc()
                        phase = "environment-snapshot"
                        env = self.project / ".env"
                        if env.is_symlink() or not env.is_file():
                            raise BackupError("Expected project .env file")
                        shutil.copyfile(env, work / "environment.env")
                        os.chmod(work / "environment.env", 0o600)
                    finally:
                        self.resume()
                    self.status("RUNNING", startedAt=started, phase="encrypt-and-verify")
                    phase = "media-archive"
                    with tarfile.open(work / "media.tar.gz", "w:gz", compresslevel=1) as archive:
                        archive.add(snapshot_dir, arcname=".", recursive=True)
                    validate_media(work / "media.tar.gz", snapshot["keyRequired"])
                    phase = "source-revision"
                    revision = self.source_revision()
                    manifest = {"format": FORMAT, "id": identifier, "createdAt": started, "snapshotAt": captured_at, "revision": revision,
                                "appImage": found["api"]["Image"], "postgresImage": found["postgres"]["Image"], "snapshot": snapshot,
                                "files": {name: {"bytes": (work / name).stat().st_size, "sha256": fingerprint(work / name)} for name in CONTENTS}}
                    validate_manifest(manifest)
                    phase = "encryption"
                    self.crypto.encrypt(work, manifest, partial)
                    os.chmod(partial, 0o600)
                    phase = "archive-verification"
                    with tempfile.TemporaryDirectory(prefix="verify-", dir=self.state) as verified:
                        unpacked = self.crypto.unpack(partial, verified)
                        with open(Path(verified) / "database.dump", "rb") as dump:
                            self.runner.run(["docker", "exec", "-i", pg, "pg_restore", "--list"], source=dump, label="Dump format verification")
                    phase = "publish-backup"
                    archive_file = self.out / (identifier + ".tar.gpg")
                    digest = fingerprint(partial)
                    os.replace(partial, archive_file)
                    os.chmod(archive_file, 0o644)  # Only ciphertext is shared with the read-only admin API.
                    safe_json(self.out / (identifier + ".json"), {"id": identifier, "createdAt": started, "verifiedAt": utc(),
                        "bytes": archive_file.stat().st_size, "sha256": digest, "revision": unpacked["revision"], "snapshot": snapshot}, 0o644)
                    self.status("SUCCESS", startedAt=started, backupId=identifier)
                    self.prune()
                    print("Verified encrypted backup created: " + str(archive_file))
            except BaseException as error:
                reason = "Backup failed at " + phase + ": " + safe_failure(error)
                self.status("FAILED", startedAt=started, phase=phase, reason=reason)
                print(reason, file=sys.stderr)
                raise
            finally:
                partial.unlink(missing_ok=True)

    def prune(self):
        records = []
        for path in self.out.glob("jinmemo-backup-*.json"):
            if not ID_RE.fullmatch(path.stem) or path.is_symlink():
                continue
            try:
                data = json.loads(path.read_text())
                archive = self.out / (path.stem + ".tar.gpg")
                if data.get("id") == path.stem and data.get("verifiedAt") and archive.is_file() and not archive.is_symlink():
                    records.append((path.stem, path, archive))
            except (ValueError, OSError):
                continue
        for _, metadata, archive in sorted(records, reverse=True)[self.config["keep"]:]:
            archive.unlink()
            metadata.unlink()
            (self.out / (metadata.stem + ".restore-test.json")).unlink(missing_ok=True)

    def restore(self, archive_path, output=None, app_image=None, postgres_image=None):
        # Production containers/volumes are NEVER a restore target. Only fresh random resources.
        with FileLock(self.state / "operation.lock"), tempfile.TemporaryDirectory(prefix="restore-", dir=self.state) as work:
            work = Path(work)
            manifest = self.crypto.unpack(Path(archive_path).resolve(), work)
            app_image, postgres_image = app_image or manifest["appImage"], postgres_image or manifest["postgresImage"]
            for image in (app_image, postgres_image):
                if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._/@:-]{0,250}", image):
                    raise BackupError("Invalid image reference")
                self.runner.run(["docker", "image", "inspect", image], label="Required local image lookup")
            output = Path(output).resolve() if output else None
            if output and (output.exists() or output == self.project or self.project in output.parents):
                raise BackupError("Recovery output must be a new directory outside the live project")
            token = secrets.token_hex(6)
            prefix = "jinmemo-recovery-" + token
            pg_volume, media_volume, container = prefix + "-postgres", prefix + "-media", prefix + "-check"
            owned_volumes, running = [], False
            keep = False
            try:
                for volume in (pg_volume, media_volume):
                    self.runner.run(["docker", "volume", "create", "--label", "jinmemo.recovery=" + token, volume], label="Create isolated recovery volume")
                    info = json.loads(self.runner.run(["docker", "volume", "inspect", volume], label="Verify recovery volume"))[0]
                    if info.get("Labels", {}).get("jinmemo.recovery") != token:
                        raise BackupError("Recovery volume ownership mismatch")
                    owned_volumes.append(volume)
                password = secrets.token_hex(32)
                credentials = work / "postgres.env"
                credentials.write_text("POSTGRES_USER=jinmemo\nPOSTGRES_DB=jinmemo\nPOSTGRES_PASSWORD=" + password + "\n")
                os.chmod(credentials, 0o600)
                self.runner.run(["docker", "run", "--detach", "--name", container, "--label", "jinmemo.recovery=" + token,
                    "--network", "none", "--security-opt", "no-new-privileges:true", "--memory", "1g", "--cpus", "2",
                    "--env-file", credentials, "--mount", "type=volume,source=" + pg_volume + ",target=/var/lib/postgresql/data", postgres_image], label="Start isolated Postgres")
                running = True
                for attempt in range(60):
                    try:
                        version = int(self.runner.run(["docker", "exec", container, "psql", "-U", "jinmemo", "-d", "jinmemo", "-XAtc", "SHOW server_version_num"], label="Recovery database readiness").decode().strip())
                        break
                    except BackupError:
                        if attempt == 59:
                            raise
                        time.sleep(1)
                if version // 10000 != manifest["snapshot"]["postgresVersion"] // 10000:
                    raise BackupError("Use the same Postgres major version as the source backup")
                with open(work / "database.dump", "rb") as dump:
                    self.runner.run(["docker", "exec", "-i", container, "pg_restore", "--exit-on-error", "--no-owner", "--no-privileges", "-U", "jinmemo", "-d", "jinmemo"], source=dump, label="Isolated database restore")
                actual = json.loads(self.runner.run(["docker", "exec", container, "psql", "-U", "jinmemo", "-d", "jinmemo", "-XAtc", COUNTS_SQL], label="Restored row counts"))
                for name in ("orders", "carts", "products", "payments", "ticketFiles"):
                    if actual[name] != manifest["snapshot"][name]:
                        raise BackupError("Restored row count mismatch")
                with open(work / "media.tar.gz", "rb") as media:
                    self.runner.run(["docker", "run", "--rm", "-i", "--network", "none", "--read-only", "--user", "0", "--entrypoint", "tar",
                        "--mount", "type=volume,source=" + media_volume + ",target=/restore", app_image, "-xzf", "-", "-C", "/restore"], source=media, label="Restore isolated media")
                if output:
                    # Revoke resurrected login sessions. Preserve SMTP for OTP, but never replay old emails.
                    self.runner.run(["docker", "exec", container, "psql", "-U", "jinmemo", "-d", "jinmemo", "-X", "--set=ON_ERROR_STOP=1", "-c", RECOVERY_SQL], label="Quarantine restored sessions and gateways")
                    output.mkdir(mode=0o700)
                    compose = recovery_compose(json.loads((work / "compose.json").read_text()), prefix, pg_volume, media_volume, password, app_image, postgres_image)
                    safe_json(output / "compose.yaml", compose)
                    (output / ".env").write_text("# Runtime configuration is resolved in compose.yaml; do not copy the old COMPOSE_FILE here.\n")
                    os.chmod(output / ".env", 0o600)
                    shutil.copyfile(work / "environment.env", output / "environment.original.env")
                    os.chmod(output / "environment.original.env", 0o600)
                    (output / "source-revision").write_text(manifest.get("revision", "unknown") + "\n")
                    safe_json(output / "recovery.json", {"backupId": manifest["id"], "project": prefix, "postgresVolume": pg_volume, "mediaVolume": media_volume, "preparedAt": utc(), "activated": False})
                    keep = True
                    print("Recovery prepared without starting the website: " + str(output))
                else:
                    archive_hash = fingerprint(archive_path)
                    original = self.out / (manifest["id"] + ".json")
                    if original.is_file() and json.loads(original.read_text()).get("sha256") == archive_hash:
                        safe_json(self.out / (manifest["id"] + ".restore-test.json"), {"id": manifest["id"], "sha256": archive_hash, "testedAt": utc()}, 0o644)
                    print("Isolated Postgres and media restore test passed: " + manifest["id"])
            finally:
                cleanup_errors = []
                # A failed docker run can still have created a container. Only delete our label.
                try:
                    info = json.loads(self.runner.run(["docker", "inspect", container], label="Inspect recovery container"))[0]
                    if info.get("Config", {}).get("Labels", {}).get("jinmemo.recovery") == token:
                        self.runner.run(["docker", "rm", "--force", container], label="Remove isolated database container")
                except BackupError:
                    if running:
                        cleanup_errors.append(container)
                if not keep:
                    for volume in owned_volumes:
                        try:
                            self.runner.run(["docker", "volume", "rm", volume], label="Remove owned recovery volume")
                        except BackupError:
                            cleanup_errors.append(volume)
                if cleanup_errors:
                    raise BackupError("Isolated recovery resources need cleanup: " + ", ".join(cleanup_errors))


def recovery_compose(source, project, pg_volume, media_volume, password, app_image, pg_image):
    if set(source.get("services", {})) != {"web", "api", "worker", "postgres", "redis"}:
        raise BackupError("Recovery supports only the five JinMemo services")
    source["name"] = project
    for name, service in source["services"].items():
        service.pop("build", None)
        service.pop("container_name", None)
        if name in ("api", "web", "worker"):
            service["image"] = app_image
        if name == "postgres":
            service["image"] = pg_image
            service["environment"] = {"POSTGRES_USER": "jinmemo", "POSTGRES_DB": "jinmemo", "POSTGRES_PASSWORD": password}
        if name == "api":
            service.setdefault("environment", {})["DATABASE_URL"] = "postgresql://jinmemo:" + password + "@postgres:5432/jinmemo"
        for mount in service.get("volumes", []):
            if mount.get("type") == "bind" and not (mount.get("target") == "/app/backups" and mount.get("read_only")):
                raise BackupError("Review custom bind mounts before recovery")
            if mount.get("type") == "volume" and mount.get("source") not in ("media_data", "postgres_data", "redis_data"):
                raise BackupError("Unexpected volume in recovery configuration")
    source["volumes"] = {"postgres_data": {"external": True, "name": pg_volume}, "media_data": {"external": True, "name": media_volume}, "redis_data": {"name": project + "-redis"}}
    for name in list(source.get("networks", {"default": {}})):
        source.setdefault("networks", {})[name] = {"name": project + "-" + name}
    # Resolved values may contain literal dollars; Compose must not expand them a second time.
    def dollars(value):
        if isinstance(value, str):
            return value.replace("$", "$$")
        if isinstance(value, list):
            return [dollars(item) for item in value]
        if isinstance(value, dict):
            return {key: dollars(item) for key, item in value.items()}
        return value
    return dollars(source)


def open_private(path):
    out = open(path, "xb")
    os.chmod(path, 0o600)
    return out


def require_root():
    if sys.platform != "linux" or os.geteuid() != 0:
        raise BackupError("Run this operation with sudo on the Ubuntu Docker host")


def install(project, replace_project=False):
    require_root()
    for executable in ("docker", "rsync", "gpg", "systemctl", "git"):
        if not shutil.which(executable):
            raise BackupError("Install prerequisite: " + executable)
    project = Path(project).resolve()
    if not (project / "compose.yaml").is_file() or not (project / ".env").is_file():
        raise BackupError("Select the JinMemo project containing compose.yaml and .env")
    directory = private_dir("/etc/jinmemo-backup")
    key = directory / "key"
    if not key.exists():
        key.write_text(secrets.token_hex(32) + "\n")
        os.chmod(key, 0o600)
    private_file(key)
    config_file = directory / "config.json"
    config = {"projectDir": str(project), "backupDir": "/var/backups/jinmemo", "stateDir": "/var/lib/jinmemo-backup", "keyFile": str(key), "keep": 7}
    if config_file.exists():
        old = load_config(config_file)
        if old["projectDir"] != str(project) and not replace_project:
            raise BackupError("An installation already exists for another project")
        config = old
        config["projectDir"] = str(project)
    safe_json(config_file, config)
    manager = Manager(config)
    manager.discover()
    target = private_dir("/usr/local/lib/jinmemo-backup", public=True) / "jinmemo_backup.py"
    if Path(__file__).resolve() != target:
        shutil.copyfile(__file__, target)
    os.chmod(target, 0o755)
    base = "/usr/bin/python3 /usr/local/lib/jinmemo-backup/jinmemo_backup.py --config /etc/jinmemo-backup/config.json "
    Path("/etc/systemd/system/jinmemo-backup.service").write_text("[Unit]\nDescription=JinMemo encrypted backup\nAfter=docker.service\nRequires=docker.service\n\n[Service]\nType=oneshot\nUMask=0077\nNice=10\nIOSchedulingClass=idle\nTimeoutStartSec=2h\nTimeoutStopSec=180\nExecStart=" + base + "backup\nExecStopPost=" + base + "recover\n")
    Path("/etc/systemd/system/jinmemo-backup.timer").write_text("[Unit]\nDescription=Daily JinMemo backup (Vietnam time)\n\n[Timer]\nOnCalendar=*-*-* 03:15:00 Asia/Ho_Chi_Minh\nPersistent=true\nAccuracySec=1m\n\n[Install]\nWantedBy=timers.target\n")
    Runner().run(["systemctl", "daemon-reload"], label="Reload systemd")
    Runner().run(["systemctl", "enable", "--now", "jinmemo-backup.timer"], label="Enable backup timer")
    safe_json(manager.out / "setup.json", {"schedule": "03:15 Asia/Ho_Chi_Minh", "keep": config["keep"], "installedAt": utc()}, 0o644)
    print("Installed daily timer. Keep /etc/jinmemo-backup/key separately off this server; never send it to chat.")
    print("Run the backup command once, then an isolated restore-test before relying on it.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default="/etc/jinmemo-backup/config.json")
    commands = parser.add_subparsers(dest="command", required=True)
    setup = commands.add_parser("install")
    setup.add_argument("--project-dir", required=True)
    setup.add_argument("--replace-project", action="store_true")
    commands.add_parser("backup")
    commands.add_parser("check")
    commands.add_parser("recover")
    verify = commands.add_parser("verify")
    verify.add_argument("archive")
    for name in ("restore-test", "prepare-restore"):
        restore = commands.add_parser(name)
        restore.add_argument("archive")
        restore.add_argument("--app-image")
        restore.add_argument("--postgres-image")
        if name == "prepare-restore":
            restore.add_argument("--output", required=True)
    args = parser.parse_args()
    os.umask(0o077)
    def interrupted(*_):
        raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, interrupted)
    try:
        require_root()
        if args.command == "install":
            install(args.project_dir, args.replace_project)
            return
        manager = Manager(load_config(args.config))
        if args.command == "check":
            manager.check()
        elif args.command == "backup":
            manager.backup()
        elif args.command == "recover":
            with FileLock(manager.state / "operation.lock"):
                manager.resume()
        elif args.command == "verify":
            with FileLock(manager.state / "operation.lock"), tempfile.TemporaryDirectory(prefix="verify-", dir=manager.state) as work:
                manifest = manager.crypto.unpack(Path(args.archive).resolve(), work)
                print("Archive integrity verified: " + manifest["id"] + ". Database restore has not been exercised by this command.")
        elif args.command in ("restore-test", "prepare-restore"):
            manager.restore(args.archive, getattr(args, "output", None), args.app_image, args.postgres_image)
    except BackupError as error:
        print("JinMemo backup: " + str(error), file=sys.stderr)
        sys.exit(1)
    except (OSError, ValueError, tarfile.TarError, KeyboardInterrupt) as error:
        # Keep errors out of stdout and never print resolved Compose/env/GPG diagnostics.
        print("JinMemo backup operation failed (" + safe_failure(error) + "). Prior backups are retained.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
