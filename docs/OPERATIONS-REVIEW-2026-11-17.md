# Rà soát vận hành 17/11/2026

## Đã kiểm tra tự động

Đăng nhập riêng/OTP và nhật ký, phân quyền quầy/POS, giá CTV/công nợ, giỏ nhiều gói và giỏ thanh toán chung, xác thực webhook/đối chiếu tiền/chống ghi thu trùng, hoàn tiền giới hạn theo khoản đã thu, tồn vé/kho mã, phòng theo toàn kỳ lưu trú, đơn xe và giá trung tâm, thùng rác ảnh giữ tệp được tham chiếu.

Chạy lại bằng `npm run test:critical --workspace @jinmemo/api` và `npm run test --workspace @jinmemo/web`. Bộ trọng yếu giới hạn 2 tiến trình test song song để tránh ngốn RAM khi nhiều Nest/ts-node cùng khởi động. Các kiểm thử dùng pg-mem/SMTP hoặc gateway giả lập, không thay thế nghiệm thu LIVE hay concurrency trên PostgreSQL thật.

## Đã sửa / bổ sung

- Đơn quà trước đây chỉ tìm trong 100 đơn gần nhất. Endpoint `GET /api/v1/admin/gifts/orders` nay lọc trên toàn bộ dữ liệu theo tên, điện thoại, mã đơn/giỏ, tên sản phẩm, giao hàng và thanh toán; 50 đơn/trang, giữ thứ tự ổn định, đưa trang quá giới hạn về trang cuối. Tìm có/không dấu không phân biệt hoa thường; dấu %, _ và chuỗi SQL là văn bản literal. COUNT và trang dùng cùng snapshot đọc.
- Trang Đơn bán quà dùng endpoint mới, có tải/lỗi, tìm/reset/phân trang; tra link đơn cũ vượt 100 đơn vẫn được. Không đổi luồng mua quà, giỏ chung hoặc thu tiền.
- Cập nhật giao/hủy quà ghi audit theo admin thực hiện. Giao diện gửi trạng thái đang xem để chặn ghi đè khi đơn đã đổi trạng thái; thao tác lặp cùng đích vẫn idempotent. Client cũ không gửi expectedStatus vẫn giữ tương thích.
- Hủy quà vẫn trả tồn đúng một lần, không tự hoàn tiền; giữ cảnh báo cho đơn đã thu. Không tự sửa dữ liệu đơn cũ.
- Test tìm/xuất đơn xe được thêm vào bộ test mặc định, tránh bỏ sót hồi quy mới.

## Phạm vi chưa xác minh từ máy này

Không đăng nhập máy Ubuntu, không kiểm tra merchant LIVE/SMTP thật, máy in bill hoặc khôi phục bản backup server trong đợt này. Không thay đổi cấu hình Nginx, khóa thanh toán hoặc dữ liệu đang chạy. Không tuyên bố mọi tính năng đã được kiểm toán toàn diện.

## Kết quả của đợt này

28 kiểm thử API trọng yếu chạy trước thay đổi đều qua; kiểm thử mới về tìm/phân trang và chống cập nhật trạng thái cũ của quà cùng kiểm thử mua/hủy/trả tồn hiện có đều qua sau thay đổi. 45 kiểm thử web và 12 kiểm thử Python backup đều qua. Build API/web và kiểm tra kiểu sau chỉnh giao diện hoàn tất. Không có migration database mới.
