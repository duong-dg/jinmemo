# Ghi nhận hoàn tiền

Mục Thanh toán → Ghi nhận hoàn tiền là sổ ghi khoản đã chuyển lại cho khách/CTV. Không gọi API hoàn tiền, không tạo lệnh chuyển khoản và không tự hủy dịch vụ.

1. Nhập mã đơn, kiểm tra thực thu / đã ghi hoàn / phần còn lại và đối chiếu điều kiện, người nhận.
2. Thực hiện hoàn tiền qua ngân hàng/cổng hoặc trả tiền mặt sau khi kiểm tra.
3. Ghi số tiền, người nhận, hình thức, ngày, mã giao dịch và lý do; xác nhận đã thực hiện hoàn rồi lưu.

Đơn JB phải ghi hoàn tại JB; các mã con không được ghi riêng để tránh cộng hai lần. Gói vé trong JC phải dùng mã JC. Đơn CTV hiển thị CTV là bên nhận hoàn. Đơn công nợ chưa có khoản thu không được coi là đã nhận tiền. Số tiền tối đa dựa trên khoản thu đã ghi nhận, không dựa trên giá niêm yết. Hoàn một phần hoặc nhiều đợt được phép trong phần tiền còn lại.

Mỗi yêu cầu lưu có UUID ổn định. Gửi lại cùng nội dung không tạo bản ghi mới; đổi nội dung trên cùng UUID bị từ chối. Mã giao dịch hoàn không được dùng lại trong cùng hình thức. Khóa transaction cùng kiểm tra tổng bảo vệ hạn mức khi các thao tác diễn ra đồng thời. Trình duyệt giữ bản ghi chưa rõ kết quả trong sessionStorage để gửi lại đúng UUID cả khi tải lại trang.

Lịch sử lưu ngày hoàn, ngày ghi nhận, người thực hiện, tham chiếu, người nhận và lý do. Không sửa/xóa khoản thu gốc hoặc đổi PAID thành UNPAID: đó là lịch sử tiền đã nhận. Khoản hoàn được ghi riêng trong jinmemo_refunds, có audit payment.refund.record. Báo cáo vé hiện tại vẫn là báo cáo thu gốc, chưa tự khấu trừ sổ hoàn tiền này; không coi số đó là lợi nhuận ròng.

Khi ghi sai khoản đã hoàn, cần kiểm tra sổ và xử lý điều chỉnh có dấu vết; giao diện này chưa cung cấp sửa/xóa lịch sử tài chính. Dữ liệu là ghi nhận của nhân viên, không thay thế chứng từ ngân hàng hoặc kết quả thực tế của cổng.
