# Cài JinMemo mới trên Ubuntu

Đây là repo mới `duong-dg/jinmemo`, giữ các chức năng hiện có nhưng bắt đầu từ database, media, tài khoản và cấu hình mới. Không clone đè vào thư mục JinGo; không nhập SQL dump cũ. Các bảng mới có tiền tố `jinmemo_`, schema ban đầu tại `apps/api/src/database/schema.sql`.

## 1. Tải code vào thư mục riêng

```bash
cd ~
git clone https://github.com/duong-dg/jinmemo.git
cd ~/jinmemo
cp .env.example .env
nano .env
```

Điền mật khẩu database mới (nên dùng chuỗi hex tạo bằng `openssl rand -hex 32` để tránh ký tự làm hỏng URL), `ADMIN_EMAIL`, `ADMIN_PASSWORD` mới (ít nhất 12 ký tự), và `ADMIN_PROXY_SECRET` mới. Không đưa khóa/mật khẩu vào chat hoặc Git.

Giữ các giá trị:

```dotenv
POSTGRES_DB=jinmemo
POSTGRES_USER=jinmemo
PUBLIC_BASE_URL=https://jinmemo.com
SEED_DEMO_DATA=false
SEO_INDEXING=false
WEB_PORT=3101
WEB_BIND=0.0.0.0
```

Compose truyền POSTGRES_* thành từng trường kết nối riêng, nên mật khẩu có ký tự đặc biệt không bị diễn giải thành URL. Nếu chạy API trực tiếp ngoài Docker, sửa DATABASE_URL trong `.env` tương ứng với password mới. NPM của bạn nằm trên máy khác nên WEB_BIND dùng 0.0.0.0; trên firewall host chỉ nên cho máy proxy truy cập port 3101.

Không chép `.env` cũ sang; nhập lại các cấu hình cần dùng trong admin sau khi cài. Không sao chép khóa `.smtp-key` hoặc media volume của JinGo. JinMemo sinh khóa mới khi cần mã hóa cấu hình.

## 2. Build và chạy

```bash
sudo docker compose config --quiet
sudo docker compose --progress plain build api
sudo docker compose up -d
sudo docker compose ps
curl http://127.0.0.1:3101/api/v1/health
```

Health trả brand JinMemo/version 1.0.0. Health chỉ cho biết API phản hồi, cần kiểm tra đăng nhập/đặt vé sau đó. Tên project `jinmemo`, image `jinmemo-app:local`, volume `jinmemo_postgres_data`, `jinmemo_media_data`, `jinmemo_redis_data` tách khỏi project `jingo`. Không dùng `-p jingo`, không override COMPOSE_PROJECT_NAME thành jingo, không map volume JinGo cũ vào bộ cài mới.

Mặc định chỉ có hai loại sản phẩm cơ bản, quầy chính và trang liên hệ mẫu (email để trống). Không có sản phẩm, bài blog, khách hàng, đơn, công nợ, kho vé, cấu hình SMTP hay cổng thanh toán cũ. Admin mới được tạo từ ADMIN_EMAIL/ADMIN_PASSWORD. Demo chỉ phục vụ test; không bật `SEED_DEMO_DATA=true` khi cài sạch.

## 3. Chuyển NPM cho domain mới

Proxy Host `jinmemo.com` → upstream `172.16.150.171`, port **3101**, giữ HTTPS hợp lệ. JinGo cũ trên 3100 vẫn giữ nguyên để đối chiếu/copy nội dung sau. Không xóa container/volume cũ ở bước này.

Cấu hình Advanced của JinMemo mới dùng header `X-JinMemo-Edge-Secret`, `X-JinMemo-Client-IP`, cùng ADMIN_PROXY_SECRET mới trong `.env`. Dùng `deploy/nginx/client-ip.conf` làm mẫu; file mới trỏ port 3101. Không dùng header X-Jingo cũ cho app mới vì app sẽ không xác thực được IP từ proxy. Giữ block allowlist SePay riêng nếu đang test webhook; mẫu tại `deploy/nginx/sepay-npm-testmode.conf`. Mã bí mật trong file mẫu phải được thay trước khi lưu NPM.

## 4. Thiết lập lại trong admin

1. Vào `https://jinmemo.com/admin`, đăng nhập admin mới. Tạo SMTP Google, đặt tên gửi JinMemo và email gửi đúng tài khoản/alias đã được phép, gửi mail test. Chỉ bật OTP sau khi SMTP đã nhận mail ổn.
2. Điền email/điện thoại thật tại Trang → Liên hệ. Không tự điền địa chỉ `support@jinmemo.com` nếu chưa tạo mailbox.
3. Tạo điểm đến, sản phẩm, lịch giá, quầy, nhân viên và CTV cần dùng. Bài blog/giá chuẩn có thể copy thủ công từ bản cũ; không nhập cả database cũ chỉ để lấy vài bài.
4. Nhập khóa cổng thanh toán trong chế độ TEST, cấu hình webhook/callback mới đúng domain và thông tin xác thực mới. Các cổng mặc định tắt, không tự lấy khóa hoặc công nợ từ JinGo. Mã đặt vé mới dùng tiền tố JM, mã thanh toán dùng JMP; cấu hình nhận diện nội dung SePay theo mã ứng dụng mới hiển thị. Tạo đơn thử và đối chiếu trạng thái thực sự cập nhật.
5. Kiểm tra web/mobile, quầy, CTV, file vé và email. Chỉ mở index sau khi hoàn tất nội dung/chính sách.

Không có lệnh xóa đơn hoặc DROP database cũ trong bộ cài. Muốn dọn bản cũ, chờ xác nhận JinMemo mới hoạt động đủ chức năng và đã lưu nội dung cần giữ.

## 5. Backup riêng cho JinMemo

```bash
sudo apt-get update
sudo apt-get install -y python3 rsync gnupg
sudo python3 deploy/backup/jinmemo_backup.py install --project-dir "$PWD"
sudo python3 /usr/local/lib/jinmemo-backup/jinmemo_backup.py backup
```

Khóa backup mới: `/etc/jinmemo-backup/key`. Lưu riêng ngoài server. Backup mới tại `/var/backups/jinmemo`, timer `jinmemo-backup.timer`, độc lập với JinGo. Khôi phục thử theo `docs/BACKUP-RESTORE.md` trước khi dựa vào backup cho vận hành thật.
