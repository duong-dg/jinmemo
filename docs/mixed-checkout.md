# Thanh toán chung

Giỏ web có vé, xe hoặc quà được xác nhận thành các đơn nghiệp vụ như trước. Trang `/chot-don` (`/en/checkout`) gom chúng vào một đơn thanh toán `JB…`, tính cả phí giao quà đúng một lần. Khách chọn một phương thức trước khi xác nhận, rồi trả toàn bộ số tiền qua cổng đã bật hoặc chờ nhân viên thu thủ công.

Một đơn thành phần chỉ được gắn với một đơn JB. API kiểm tra khóa truy cập của từng phần, kiểm tra giá phía server và lưu số tiền từng phần. Retry dùng cùng mã yêu cầu. Các bước đặt từng phần đã thành công được giữ trong sessionStorage để không đặt lại khi mạng bị gián đoạn; chưa tạo yêu cầu thu tiền cho đến khi đủ các phần.

Webhook dùng xác thực và đối chiếu hiện có của từng cổng. Số tiền, trạng thái và từng giá thành phần đều phải khớp. Ghi thu cho vé, xe, quà và JB diễn ra cùng một transaction. Callback lặp không tạo thêm khoản thu; tiền sai, đơn hủy hoặc giá thay đổi chuyển sang cần đối soát.

Trong admin: **Thanh toán → Đơn thanh toán chung** để xem mã thành phần và xác nhận thu đủ. Giao dịch SePay cần đối soát có thể gắn vào mã JB tại **Đối soát thanh toán** nếu số tiền bằng toàn bộ đơn. Không ghi thu riêng từng đơn vé/xe đã thuộc JB. Vé và đơn xe/quà tiếp tục được giao/xử lý tại các mục cũ.

Schema mới được thêm khi API khởi động, không xóa dữ liệu cũ. Quy trình thanh toán đơn lẻ hiện có được giữ nguyên. Không chạy giao dịch tiền thật trong kiểm thử tự động.

Tiếng Anh: `/en/souvenirs`, `/en/checkout`; bản dịch tên/mô tả quà nhập tại sản phẩm, tên/địa chỉ quầy nhập tại **Bán hàng → Quản lý quầy bán**. Trường Anh để trống dùng nội dung Việt.
