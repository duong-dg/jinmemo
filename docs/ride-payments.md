# Thu tiền đơn xe qua SePay

1. Cấu hình SePay trong Cổng thanh toán, bật LIVE và xác thực webhook như đơn vé. Dùng nguyên endpoint webhook hiện có; không mở thêm endpoint nhận tiền.
2. Đặt xe → Thiết lập → bật “Cho phép thanh toán đơn xe bằng QR SePay”, lưu.
3. Website: khách chọn trả sau hoặc QR trước khi gửi booking. QR hiện sau khi tạo booking. Trả sau vẫn có thể mở QR tại trang kết quả booking.
4. Admin → Đơn xe → Xử lý: cập nhật xác nhận/điều xe hoặc chốt nhóm trước; chọn Tạo / xem QR thu tiền.
5. Quầy → Thu tiền xe: tài khoản có quyền COLLECT nhập mã JM-X… đã xác nhận/chốt nhóm. Không cấp thêm quyền điều xe cho nhân viên quầy.

QR sống 15 phút; tạo lại khi hết hạn. Nhận tiền đúng nội dung JMR + 24 ký tự, đúng ngân hàng, tài khoản và số tiền thì ghi PAID. Trạng thái chuyến xe không tự thay đổi. Webhook lặp không tạo khoản thu mới; giao dịch sai, quá hạn, đơn đã hủy hoặc đã thu vào Đối soát thanh toán. Có thể tìm giao dịch bằng mã đơn xe. Đối soát thủ công hỗ trợ mã JM-X, xem trước tên khách/số tiền và bắt buộc ghi chú, xác nhận đã kiểm tra tiền thực nhận.

Các khoản thu xe ghi riêng trong sổ tham chiếu RIDE_PAYMENT, không trộn vào ca tiền mặt bán vé. Hủy booking đã trả không tự hoàn tiền; cần liên hệ và xử lý hoàn tiền ngoài hệ thống theo chính sách. Báo cáo doanh thu vé hiện tại vẫn là báo cáo vé.

Kiểm thử tự động mô phỏng SePay, không gửi tiền thật: ride-payments.test.ts; gồm xác thực, quyền booking, số tiền, giao dịch trùng, QR hết hạn, hủy, phân quyền quầy và làm tròn giá ghép khi có khách đã thanh toán.
