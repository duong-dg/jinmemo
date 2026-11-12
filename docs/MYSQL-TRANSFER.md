# Xuất PostgreSQL sang MySQL để chuyển sang hosting-php

Admin → Cài đặt → Sao lưu & khôi phục → Xuất dữ liệu MySQL (.sql).

Đây là bản chuyển dữ liệu, không phải bản sao khôi phục PostgreSQL và không chuyển mã ứng dụng sang MySQL. Bản PHP tại `hosting-php` hiện có bảng `jingo_*`, nhưng chưa có blog và chưa đủ luồng POS/CTV/thanh toán/giao vé. Do vậy không nhập thẳng dữ liệu Node vào các bảng vận hành PHP.

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
