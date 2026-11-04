# Khung vận hành xe để thử và chỉnh dần

Vào **Đặt xe → Khung xe & ghép chuyến** (`/admin/khung-xe`). Đây là bản khung nội bộ: không mở bán, không tạo đơn, không trừ tồn thật, không gửi mail hay thu tiền. Màn hình xe hiện tại vẫn hoạt động riêng.

## Các tab

1. **Loại xe:** tên 4/7/16 chỗ, số ghế hành khách thực nhận và ghi chú hành lý. Không bắt khách chọn số vali hay kích thước hành lý. Số ghế bán được do admin nhập, không tự suy ra từ tên xe.
2. **Khu vực & phụ thu:** vùng giá cơ bản và cây khu vực con; phụ thu riêng theo loại xe. Ví dụ Hòa Khánh, Hòa Cầm, Hòa Vang thuộc vùng Đà Nẵng.
3. **Giá tuyến:** chiều đi → chiều đến → loại xe → giá xe riêng và giá ghép tham khảo. Chiều ngược lại nhập riêng. Báo giá xe riêng ưu tiên tuyến đúng điểm đón/trả; nếu dùng giá vùng cha thì cộng phụ thu các khu vực con. Không cộng phụ thu vùng cha thêm lần nữa khi đã có giá tuyến chính xác. Hai cấu hình cùng ưu tiên gây mơ hồ thì báo lỗi để nhập tuyến cụ thể.
4. **Chuyến ghép:** tuyến, xe, ngày, khoảng giờ đón, giờ khởi hành dự kiến, hạn nhận và giá/chỗ. Khách HELD/CONFIRMED chiếm ghế; chờ ghép hoặc hủy không chiếm ghế. Chuyến nháp/đóng, hết chỗ hoặc qua hạn nhận không được gợi ý.
5. **Khách chờ ghép:** tên yêu cầu, điểm đi/đến, ngày, giờ mong muốn, linh động 0/±30/±60 phút và số người. Kiểm tra gợi ý rồi bấm ghép để thử giữ chỗ; khách đã xác nhận có trạng thái riêng. Có thể trả về chờ hoặc hủy để trả ghế. Gợi ý yêu cầu cùng ngày và cùng chiều; khu vực con phù hợp với vùng của chuyến. So sánh giờ mong muốn với giờ khởi hành dự kiến, không tự đổi giờ đã nhập.
6. **Thử báo giá:** chọn điểm đi/đến và số khách, hiện tất cả loại xe đủ chỗ. Ba người vẫn được chọn xe 7/16 chỗ. Giá thử hiển thị phần tuyến, phụ thu và tổng; không tạo đặt chỗ.

## Thử ví dụ

**Nạp ví dụ Hội An – Đà Nẵng** đưa dữ liệu và giá minh họa vào trình sửa, chưa ghi đè bản đã lưu cho tới khi bấm Lưu. Có ba loại xe, khu vực trung tâm và các vùng phụ thu, chuyến 10:00 ngày mai cùng khách 07:00/09:00/10:00/11:00.

Khách 07:00 đúng giờ không được gợi ý chuyến 10:00. Khách 09:00 hoặc 11:00 có linh động ±1 giờ có thể được gợi ý chuyến 10:00 nếu còn chỗ. Ghép nhóm 2 người và 3 người vào xe có 6 ghế còn 1 ghế; ghép thêm 1 người thì hết chỗ. Hủy nhóm 2 người trả lại 2 ghế. Không đổi giờ khách để ép ghép. Muốn đổi giờ ngoài khoảng họ chấp nhận phải liên hệ trước rồi sửa yêu cầu theo sự đồng ý của khách.

## Lưu và phạm vi

Bấm **Lưu bản khung** để lưu toàn bộ cấu hình cùng một phiên bản trên server. Hai cửa sổ sửa cùng lúc sẽ bị chặn ghi đè. Kiểm tra tham chiếu, vòng lặp khu vực, ngày/giờ, giá trùng, tính phù hợp của chuyến đã gán và số ghế tối đa ở server. Dữ liệu bản khung lưu riêng ở `jinmemo_settings/transport-plan` và có audit; không tự nhập vào sản phẩm/chuyến/đơn hiện có.

Đây là nơi chốt mô hình và trải nghiệm quản trị trước khi nối vào bán thật. Sau khi chốt cần triển khai bảng chuyến/đặt chỗ vận hành riêng, giữ ghế nguyên tử giữa admin/web/CTV/POS, hạn giữ chỗ, khách chấp nhận đổi giờ, snapshot báo giá, thanh toán và kiểm thử đồng thời trên PostgreSQL thật. Chưa tự tìm xe rảnh, chưa có tối ưu cung đường/GIS và chưa tự ghép khách online.
