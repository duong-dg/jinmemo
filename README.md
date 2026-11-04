# JinMemo

Nền tảng bán vé, tour địa phương, website Việt/Anh và blog; gồm admin, quầy POS, cộng tác viên, tồn vé, nguồn vé/giá vốn, thanh toán và email.

Repo mới, lịch sử Git mới và PostgreSQL schema `jinmemo_*`. Giữ nguyên chức năng đã xây dựng; không nhập database, đơn, file vé, thanh toán hoặc bí mật cũ.

Đọc [cài mới trên Ubuntu](docs/FRESH-INSTALL.md) trước khi chạy. Không dùng hướng dẫn chuyển nhánh/rebrand từ repo cũ để cài dự án này.

- Docker project/image: `jinmemo` / `jinmemo-app:local`.
- Database/user mặc định: `jinmemo`; volume riêng theo project.
- Port web mặc định: `3101` (JinGo cũ ở 3100 vẫn giữ nguyên).
- `SEED_DEMO_DATA=false`: dữ liệu kinh doanh trống. Có hai loại sản phẩm cơ bản, trang liên hệ chưa điền email và quầy chính để bắt đầu cấu hình.
- Admin chỉ được tạo khi cấu hình `ADMIN_EMAIL`, `ADMIN_PASSWORD` mới.
- SMTP, cổng thanh toán mặc định chưa cấu hình. Có thể dùng Google SMTP sau khi cài.
- Bài viết/sản phẩm có thể nhập lại sau; không tự lấy nội dung hoặc tài khoản từ hệ thống cũ.

## Phát triển và kiểm tra

Node.js 22 trở lên, PostgreSQL 17 và Redis 7. `npm ci`, `npm run build`, `npm test`. Bộ test dùng database mô phỏng độc lập và dữ liệu demo trong môi trường test; không dùng database kinh doanh. Trong Docker, file `apps/api/src/database/schema.sql` được đóng gói cùng ứng dụng.

Đặt xe riêng / xe ghép: xem [khu vực, giá tuyến và bảng booking mới](docs/TRANSPORT-PLANNING.md). [Luồng sản phẩm xe cũ](docs/TRANSFERS.md) chỉ giữ để đối chiếu lịch sử.

Blog: xem [lượt xem, bài nổi bật và bài đọc nhiều](docs/BLOG-DISCOVERY.md).
