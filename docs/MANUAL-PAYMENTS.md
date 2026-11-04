# Đặt trước, thanh toán tiền mặt hoặc trả sau

Checkout website luôn có hai lựa chọn **Thanh toán tiền mặt** và **Đặt trước, trả sau**, kể cả khi chưa bật cổng online. Chọn một phương thức rồi bấm **Xác nhận đặt chỗ**. Email liên hệ vẫn bắt buộc, giá/tồn và thông tin chuyến xe vẫn được kiểm tra như trước.

Hai lựa chọn đều tạo đơn CONFIRMED / UNPAID: đã ghi nhận đặt chỗ, chưa ghi nhận tiền. Không tạo yêu cầu gateway, không mở QR, không chuyển hướng sang ngân hàng và không tự ghi công nợ CTV. Lựa chọn lưu tại contact.paymentPreference, xuất hiện trong admin, email và trang tra cứu có xác thực.

Khi đã nhận tiền thật, admin xác nhận đơn website bằng thao tác thu tiền hiện có. Nhân viên quầy có quyền thu tiền tiếp tục xác nhận các đơn trong quầy được gán. Tiền mặt ghi CASH, chuyển khoản thủ công ghi BANK và mã giao dịch. Trả sau là mong muốn của khách, không phải đã thu tiền hoặc được cấp hạn mức tín dụng. Các thao tác thu tiền vẫn kiểm quyền, kiểm số tiền và chống ghi nhận trùng.

QR/thẻ/PayPal vẫn được giữ sẵn; website chỉ liệt kê cổng được bật ở LIVE. Lựa chọn online mới tạo luồng thanh toán gateway như trước. Đơn chọn tiền mặt/trả sau hiển thị hướng dẫn liên hệ, không tự mở khối gateway trên trang xác nhận của khách.

Số lượng giữ theo luồng đơn hiện có; đặt trả sau vẫn giữ tồn khi đơn được tạo. Đơn chưa thu không tự hết hạn. Khi khách không đi, xử lý hủy theo quy trình hiện có để trả tồn.

Cập nhật code, build image và docker compose up -d như bình thường. Không cần xóa dữ liệu hoặc nhập SQL riêng.
