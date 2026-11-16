# Giá tuyến và giá vùng cha

Sửa ngày 16/11/2026: cây địa lý không tự cho phép kế thừa bảng giá. Trước đây mọi vùng con dùng giá cha, phụ thu chưa nhập được coi là 0, có thể làm điểm xa lấy nhầm giá thành phố.

- Tuyến chính xác theo xe được ưu tiên; tuyến hai chiều áp theo cấu hình twoWay.
- Muốn dùng giá cha phải nhập mức cộng cho đúng loại xe tại mỗi cấp con trên đường tới vùng giá. Để trống = không dùng giá cha. Nhập rõ 0 = đã duyệt cùng giá. Số dương = đã duyệt giá cha cộng phụ thu.
- Tích Trung tâm: điểm này dùng cùng giá vùng cha, không cộng phụ thu trên đường lên vùng giá (kể cả cây có quận/huyện ở giữa). Giá tuyến riêng vẫn ưu tiên. Ô này là xác nhận của người vận hành, không tự suy từ tên điểm.
- Đổi vùng cha xóa mức cộng cũ và bỏ tích Trung tâm để kiểm tra lại. Tích/bỏ Trung tâm cũng xóa mức cộng cũ để tránh bật lại giá chưa duyệt. Công cụ nhập phụ thu/bỏ duyệt hàng loạt chuyển điểm về ngoài trung tâm.
- Lăng Cô, Đỉnh Bàn Cờ, Bạch Mã... chưa có tuyến riêng hoặc mức cộng đã duyệt sẽ không được báo giá/đặt mới bằng giá Đà Nẵng. Nên nhập tuyến riêng theo chi phí đối tác, không tự suy ra từ tên hoặc địa chỉ.
- Sân bay/khách sạn đúng trung tâm muốn cùng giá: tích Trung tâm. Có thể nhập rõ 0 cho riêng loại xe khi ngoài trung tâm nếu thực sự cùng giá. Công cụ hàng loạt có thể áp cho nhiều điểm đã chọn; không chọn cả vùng rộng khi chưa kiểm tra.
- Các mục 0 đã được lưu trước đây vẫn được hiểu là cấu hình rõ ràng. Rà lại ô Trung tâm và các mục đó: xóa giá trị để bỏ quyền kế thừa nếu chưa được duyệt. Không tự xóa cấu hình giá đã nhập của người vận hành.

Admin → Đặt xe → Khu vực: mở Thiết lập để sửa mức cộng. Có thể chọn hàng loạt điểm xa, mở công cụ hàng loạt và chọn Bỏ duyệt giá cha để gỡ cả mức 0 cũ; Admin → Đặt xe → Giá tuyến: nhập giá riêng. Web và POS dùng cùng backend kiểm tra lại khi tạo đơn; browser giữ danh sách cũ cũng không thể tạo đơn với tuyến không còn giá hợp lệ.

Không sửa ngược giá hoặc thanh toán của booking đã tạo. Nếu trước đây có đơn bị áp nhầm 250k, rà riêng các đơn đó và liên hệ khách để xử lý; thay bảng giá không sửa snapshot đã chốt.
