# Xuất PostgreSQL sang MySQL để chuyển sang hosting-php

Admin → Cài đặt → Sao lưu & khôi phục → Xuất dữ liệu MySQL (.sql).

Đây là bản chuyển dữ liệu, không phải bản sao khôi phục PostgreSQL và không chuyển mã ứng dụng sang MySQL. Bản PHP tại `G:/D-app/JinGo/hosting-php` hiện đã có blog và nhiều công cụ ánh xạ dữ liệu. Bộ nhập tương thích phải được kiểm tra theo định dạng xuất: profile hiện có ghim exporter v1. Không nhập thẳng dữ liệu Node vào các bảng vận hành PHP.

## Phạm vi

Bài viết/bản sửa/chuyên mục/lượt xem; sản phẩm/điểm đến/nhà cung cấp/ảnh; đơn vé và giỏ, tiền đã thu, phân bổ tồn, voucher; đơn xe/quà/phòng, công nợ CTV và dữ liệu nghiệp vụ liên quan. Xem danh sách cố định trong `apps/api/src/admin/mysql-export.ts`.

Không xuất bảng mật khẩu admin/POS, phiên, OTP, cấu hình SMTP/cổng thanh toán, yêu cầu thanh toán chứa thông tin xác thực. Cột password_hash và secret không xuất. Một số trường bí mật bị lược bỏ nên file không dùng để khôi phục toàn bộ ứng dụng. Metadata ảnh/file được giữ nhưng ảnh/PDF vật lý không nằm trong SQL: chép riêng media_data và vé gốc theo backup.

## Cách nhập

1. Sao lưu hệ thống cũ; giữ nguyên bản backup PostgreSQL đã mã hóa.
2. Tạo database MySQL 8 riêng, charset utf8mb4. Trong phpMyAdmin chọn đúng database đó rồi Import file .sql. Có thể dùng mysql CLI nếu file vượt giới hạn upload hosting.
3. File tạo `jm_transfer_posts`, `jm_transfer_orders`, ...; tên cột và ID giữ theo nguồn, JSON/boolean/số nguyên/thời gian UTC được chuyển sang kiểu MySQL tương ứng. Không có DROP, REPLACE, UPDATE hoặc INSERT IGNORE. Nếu tên bảng đã tồn tại, import phải dừng: không ghi đè.
4. Dòng cuối `TRANSFER COMPLETE` ghi số dòng từng bảng để đối chiếu. Các bảng chuyển dữ liệu không đặt FK/index/default/runtime constraints, phục vụ ánh xạ sang schema đích.
5. Khi hoàn tất module PHP, dùng công cụ ánh xạ có dry-run và kiểm tra mã đơn/snapshot/tiền/tồn/voucher trước khi nạp vào bảng `jingo_*`. Không bật hai website cùng ghi đơn trong lúc chốt chuyển.

MySQL tương thích cú pháp của file; chưa có bộ nhập trực tiếp vào ứng dụng PHP. Bài viết trong jm_transfer_posts được giữ đầy đủ nhưng chưa tự xuất hiện trên website PHP. Mã đơn không đổi (JM/JC/JB/JH...), không đổi thành JG vì sẽ làm hỏng liên kết cũ; PHP cần bổ sung nhận dạng mã tương ứng khi chuyển phần tra cứu.

File được tạo ở thư mục tạm riêng quyền 0600, snapshot PostgreSQL REPEATABLE READ READ ONLY, đọc theo cursor từng 100 dòng; xóa file tạm khi tải xong hoặc lỗi. Một export tại một thời điểm, giới hạn file 512 MB. Dừng/tải lỗi thì tạo lại; không import file chưa tải đủ. Có audit người tải; endpoint cần phiên admin và kiểm tra mutation.

Dùng chuỗi UTF-8 dạng hex có CONVERT(... USING utf8mb4), không nội suy nội dung bài viết vào câu SQL, tránh lỗi dấu nháy, dấu gạch chéo và emoji. Tham khảo https://dev.mysql.com/doc/refman/8.4/en/json.html .

Kiểm tra 12/11/2026: build API/web, kiểm quyền admin và xuất file qua cursor giả lập đã qua; file SQL đã được nhập thật vào MariaDB 10.4.32 riêng, đối chiếu JSON/Unicode/emoji/BIGINT/boolean/DATETIME(6). Chưa thử trên MySQL 8 của hosting hoặc với toàn bộ database sản xuất.

## Bản đầy đủ v2 (18/11/2026)

Có hai nút riêng tại trang Sao lưu: Xuất đầy đủ MySQL v2 và Xuất bản tương thích v1. Endpoint mới là POST `/api/v1/admin/backups/mysql-export/full`; v1 không thay đổi mã nguồn hay định dạng để giữ tương thích với bộ nhập PHP đang ghim v1. Không sửa thư mục PHP trong thay đổi này.

V2 giữ các bảng nghiệp vụ của v1 và thêm:

- `jm_transfer_settings`: chỉ các hàng `gifts` (danh mục hàng/giá/tồn/phí ship), `transport-plan` (loại xe, cây vùng, giá tuyến, lịch/ghép cũ), `features`, `site-seo`, `manual-payments`.
- `jm_transfer_admins`, `jm_transfer_pos_users`: danh tính/ID/email và thông tin nhân sự, không mật khẩu hoặc phiên.
- `jm_transfer_audit`, `jm_transfer_mail_outbox`, `jm_transfer_stay_mail`, `jm_transfer_admin_notifications`: lịch sử nghiệp vụ/trạng thái gửi; không kèm khóa email, không kích hoạt gửi lại.
- `jm_transfer_manifest`: mỗi bảng có trạng thái EXPORTED/FILTERED_BUSINESS_SETTINGS/MISSING_SOURCE/EXCLUDED_SECURITY_OR_RUNTIME, số dòng xuất, cấu trúc cột nguồn và SHA-256 của các câu INSERT của bảng đó. Hash là của nội dung SQL INSERT, không phải toàn file.

ID, mã booking, snapshot giá, tiền đã thu/hoàn, tồn/phân bổ, trạng thái, bản dịch và liên kết đều giữ theo nguồn; không gọi hàm báo giá hoặc lập lại đơn. Cột bí mật (`secret`, `access_hash`, `password_hash`...) bị bỏ, cả các khóa xác thực đã biết lồng trong JSON. Giữ mã QR/vé của đối tác và các hash nghiệp vụ không phải thông tin đăng nhập. Vì bỏ thông tin xác thực, mapper PHP phải cấp quyền/khóa tra cứu mới theo quy trình của nó, không tự bật đăng nhập hoặc phiên cũ.

JSON/array của v2 được lưu dưới dạng LONGTEXT chứa JSON hợp lệ để giữ nguyên token số lớn/thập phân, tránh MySQL JSON nhị phân thay đổi cách biểu diễn số. Các bảng staging không phải schema vận hành. Thời gian xuất UTC có microsecond như v1, tiền nguyên lấy từ PostgreSQL text để không đi qua số JavaScript. Giá trị số trong JSON không bị parse/stringify để xuất.

Chỉ xuất bảng trong allowlist. Nếu phát hiện bảng JinMemo mới chưa có chính sách xuất/loại trừ, v2 dừng với tên bảng để cập nhật, tránh âm thầm bỏ sót. Bảng không tồn tại trên bản nguồn cũ được kê MISSING_SOURCE. Các cấu hình SMTP/thanh toán online, bảo mật, session, OTP, raw webhook mã hóa, khóa gửi vé và dấu vết định danh khách xem bài đều loại trừ. File upload vẫn chép riêng; metadata media/ticket_files vẫn có trong SQL, file đã xóa trước đó không được khôi phục từ SQL.

Import v2 qua phpMyAdmin vào database rỗng riêng. Không dùng v2 với mapper chỉ nhận v1 cho đến khi bổ sung ánh xạ các bảng/cột mới. Không chọn Continue on error khi CREATE TABLE báo trùng; file không dùng DROP, REPLACE hay UPDATE. V2 chưa được nhập thử với dữ liệu sản xuất hoặc MySQL 8 trên hosting.

Kiểm tra v2: 9 kiểm thử xuất/backup/phân quyền đã qua; nhập file mẫu v2 thật vào MariaDB 10.4.32 tách biệt đã tạo được 5 bảng mẫu và 69 dòng manifest, giữ số nguyên JSON 9007199254740993 và loại giá trị credential mẫu. Sau thử nghiệm đã tắt MariaDB QA. Chưa kiểm chứng database sản xuất hoặc bộ ánh xạ PHP v2.
