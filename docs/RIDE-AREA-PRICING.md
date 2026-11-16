# Giá tuyến và giá vùng cha

Sửa ngày 16/11/2026: cây địa lý không tự cho phép kế thừa bảng giá. Trước đây mọi vùng con dùng giá cha, phụ thu chưa nhập được coi là 0, có thể làm điểm xa lấy nhầm giá thành phố.

- Tuyến chính xác theo xe được ưu tiên; tuyến hai chiều áp theo cấu hình twoWay.
- Muốn dùng giá cha phải nhập mức cộng cho đúng loại xe tại mỗi cấp con trên đường tới vùng giá. Để trống = không dùng giá cha. Nhập rõ 0 = đã duyệt cùng giá. Số dương = đã duyệt giá cha cộng phụ thu.
- Ô Trung tâm chỉ giúp phân loại, không duyệt giá.
- Đổi vùng cha sẽ xóa mức cộng cũ trong trình soạn để buộc kiểm tra lại.
- Lăng Cô, Đỉnh Bàn Cờ, Bạch Mã... chưa có tuyến riêng hoặc mức cộng đã duyệt sẽ không được báo giá/đặt mới bằng giá Đà Nẵng. Nên nhập tuyến riêng theo chi phí đối tác, không tự suy ra từ tên hoặc địa chỉ.
- Sân bay/khách sạn trong vùng muốn cùng giá: chọn đúng điểm, đúng xe rồi duyệt 0 sau khi kiểm tra. Công cụ hàng loạt có thể áp cho nhiều điểm đã chọn; không chọn cả vùng rộng khi chưa kiểm tra.
- Các mục 0 đã được lưu trước đây vẫn được hiểu là cấu hình rõ ràng. Rà lại các mục đó: xóa giá trị để bỏ quyền kế thừa nếu chưa được duyệt. Không tự xóa cấu hình giá đã nhập của người vận hành.

Admin → Đặt xe → Khu vực: mở Thiết lập để sửa mức cộng. Có thể chọn hàng loạt điểm xa, mở công cụ hàng loạt và chọn Bỏ duyệt giá cha để gỡ cả mức 0 cũ; Admin → Đặt xe → Giá tuyến: nhập giá riêng. Web và POS dùng cùng backend kiểm tra lại khi tạo đơn; browser giữ danh sách cũ cũng không thể tạo đơn với tuyến không còn giá hợp lệ.

Không sửa ngược giá hoặc thanh toán của booking đã tạo. Nếu trước đây có đơn bị áp nhầm 250k, rà riêng các đơn đó và liên hệ khách để xử lý; thay bảng giá không sửa snapshot đã chốt.
