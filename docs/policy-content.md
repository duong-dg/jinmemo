# Bộ chính sách JinMemo

Sáu trang Việt/Anh được tạo khi khởi động API, xuất bản và gắn footer: Điều khoản, Bảo mật, Thanh toán, Giao vé/xe/hàng, Đổi/hủy/hoàn tiền, Hỗ trợ/khiếu nại. Trang Thông tin đơn vị vận hành là bản nháp có các ô cần điền; không công bố các chỗ trống ra website.

Quản lý tại Trang → Trang nội dung & menu. Rà tên đăng ký, mã số thuế/đăng ký kinh doanh nếu có, địa chỉ, người phụ trách, kênh hỗ trợ và giờ làm việc; điền tại trang nháp và kiểm tra trang Liên hệ. Nội dung là mẫu theo mô hình đang vận hành, không phải chứng nhận tuân thủ pháp lý hay chứng nhận/đăng ký thương mại điện tử.

Không mặc định mọi vé đều hoàn được; không loại trừ quyền bắt buộc của khách. Giá phí giao và phương thức thanh toán theo đơn thực tế; không gán cứng 50.000đ hay cam kết thời gian giao/hoàn chưa thống nhất. Hủy đơn và hoàn tiền là các việc khác nhau. Không yêu cầu video mở hàng mới tiếp nhận phản ánh. Chính sách bảo mật mô tả giỏ/phiên/lưu trữ tệp và khả năng xử lý qua email/cổng bên thứ ba; cần rà lại khi đổi nhà cung cấp hoặc bật thêm công cụ theo dõi.

`jinmemo_policy_pages` giữ liên kết vai trò–trang. Seed chạy lặp không ghi đè bản đã chỉnh, không tự phục hồi trang nháp/thùng rác, không thay bản dịch cũ. Nếu slug gốc đã có trang, hệ thống nhận trang đó và giữ nguyên nội dung/trạng thái. Nếu slug Anh trùng trang khác, bản mẫu dùng hậu tố. Link chấp thuận thanh toán lấy từ `/site/policies` nên theo đường dẫn mới sau khi admin đổi slug; trang chưa xuất bản hoặc bản Anh tắt không được liên kết.

Nguồn chính thức để đối chiếu (tra cứu 11/11/2026):
- Luật Bảo vệ quyền lợi người tiêu dùng 19/2023/QH15: https://vanban.chinhphu.vn/?classid=1&docid=208363&orggroupid=1&pageid=27160
- Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 (hiệu lực 01/01/2026): https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=
- Luật Thương mại điện tử 122/2025/QH15 (hiệu lực 01/07/2026): https://congbao.chinhphu.vn/van-ban/luat-so-122-2025-qh15-468683.htm

Cần đối chiếu nội dung đã điền với hoạt động thực tế và quy định áp dụng cho chính đơn vị vận hành. Nội dung không tự thực hiện việc đăng ký/thông báo website, xử lý quyền dữ liệu hay chuyển tiền hoàn.
