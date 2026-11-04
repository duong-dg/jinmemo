# Đặt xe, ghép nhóm và thông báo

## Bảng cấu hình

**Đặt xe → Loại xe / Khu vực đón trả / Giá tuyến** là ba bảng hàng/cột chỉnh trực tiếp. Mỗi mục có nút lưu riêng và kiểm tra phiên bản riêng; lưu Giá tuyến không ghi đè thay đổi Loại xe từ tab khác. Server ghép mục vừa sửa vào dữ liệu mới nhất và kiểm tra toàn bộ tham chiếu trước khi lưu.

- Loại xe: số ghế hành khách thực nhận, nhóm ghép cho phép, một ảnh và một ghi chú chung. Xe 4 chỗ thường ghép `2`; xe 7 chỗ nhập `3,4` để khách chọn nhóm ba hoặc bốn người. Có thể để trống để chỉ bán xe riêng. Nhóm không vượt sức chứa.
- Khu vực: cây vùng/phường/xã và điều chỉnh vùng tùy chọn. Có nạp tự động bộ cũ hoặc mới từ Province Open API, chỉ thêm mã chưa có, giữ dữ liệu đang chỉnh. Hai địa giới không tự đổi giá cho nhau.
- Giá tuyến: mỗi cặp đi–đến một dòng, các loại xe thành cột giá. Chỉnh nhiều giá trên cùng tuyến; thời gian dự kiến riêng theo xe trong mỗi ô. Để trống/0 để chưa bán xe đó. Bật **Hai chiều** để dùng một giá cho cả đi và về; mặc định bật với tuyến mới. Đây là giá một lượt dùng được ở cả hai chiều, không phải tổng giá khứ hồi. Tuyến cũ giữ cấu hình cũ cho tới khi bật; nếu đã có dòng chiều ngược sẽ hỏi xác nhận gộp để không âm thầm thay giá. Giá cũ tự gom khi hiển thị, giữ mã giá và thời gian; không đổi database. Tổng giá cả chuyến theo chiều đi, loại xe, thời gian dự kiến. Không nhập thêm giá xe ghép theo người. Giá khu vực chính xác ưu tiên; khi dùng vùng cha thì cộng mức điều chỉnh vùng con vào tổng trước khi chia nhóm.

Dữ liệu cũ chưa khai báo nhóm: sức chứa từ 6 hành khách trở lên mặc định cho nhóm 3/4; sức chứa 2–5 mặc định nhóm 2. Đây là mặc định có thể chỉnh, không phải tự suy ra giấy phép hay kích thước xe. Kiểm tra cấu hình thực tế trước khi mở bán.

## Khách tự tạo chuyến ghép

Website `/dat-xe` và `/en/transfers`: gõ nơi đi/đến, chọn ngày giờ và số người trong nhóm mình. Hệ thống hiện các xe riêng hoặc lựa chọn ghép theo quy mô 2/3/4 đã cấu hình.

Lượt đặt đầu tiên tạo nhóm theo đúng khu vực hai đầu, loại xe, ngày, giờ và quy mô ghép. Người sau nhìn thấy chuyến đang chờ, giờ khởi hành, số người đã có/còn thiếu và phần giá của mình. Chỉ gợi ý giờ nằm trong khoảng linh động khách chấp nhận. Không lộ tên, số điện thoại, email hay địa chỉ riêng của khách khác.

Ví dụ chuyến 400.000đ, nhóm bốn người: mỗi người 100.000đ. Khách đặt hai người trả phần 200.000đ; hai lượt đặt một người khác cùng tham gia sẽ đủ bốn. Với số tiền không chia hết, phần lẻ phân bổ để tổng đủ chính xác giá chuyến, chênh tối đa 1đ/người. Lúc nhóm thay đổi, phần lẻ có thể điều chỉnh 1đ; chưa thu tiền tự động.

Tạo/join nhóm được khóa trong giao dịch PostgreSQL, kiểm tra giá, giờ và số chỗ lại ở server. Lượt gửi lại cùng request key không tạo trùng. Chọn rõ một nhóm đã đầy sẽ báo tìm lại, không âm thầm đổi sang nhóm khác.

**Đủ quy mô đã chọn → Đã chốt xe**, đóng nhận thêm dù xe thực tế còn ghế. Không phải chờ đầy mọi ghế vật lý. Admin không phải tạo lịch ghép trước. Mục lịch tạo sẵn được bỏ khỏi menu; dữ liệu và đơn luồng cũ vẫn giữ để tra cứu.

Trang xác nhận của khách tự kiểm tra trạng thái mỗi 15 giây khi tab đang mở, dùng request key riêng trong body. Không đưa khóa vào URL. Chốt nhóm chưa phải đã thanh toán hay đã gán tài xế. Nếu chưa đủ người tới gần giờ đi, nhân viên liên hệ khách để xử lý; không tự tăng phần tiền lên cho số khách còn lại.

## Admin điều xe

**Đặt xe → Đơn xe & điều xe**: bảng booking, nhãn màu chờ ghép/đã chốt/chờ đón/đã đón/đang đi/hoàn tất/hủy. Có số người và giờ của nhóm.

- Nhóm còn chỗ: mở Xử lý, dùng **Ghép thêm khách của mình** để ghi khách ngoài vào cùng nhóm. Không cần tạo lịch riêng; có kiểm tra ghế và tự chốt khi đủ.
- Đủ nhóm: gán tài xế, số điện thoại, biển số rồi chuyển Chờ đón. Tiến độ và tài xế áp dụng cho cả nhóm, không tạo các tài xế khác nhau trên cùng xe.
- Hủy trước khi đón: chỉ hủy booking được chọn, trả chỗ và mở lại nhóm nếu thiếu người. Nhóm đã đón/đang đi không hủy bằng thao tác này.
- Không tự chuyển một khách sang giờ hoặc nhóm có giá khác; nhóm do khách chọn được giữ nguyên.

Booking mới thanh toán sau, chưa nối cổng thanh toán hay mail khách tự động. Trạng thái chuyến không tạo khoản thu trong sổ vé.

## Thông báo mới

Menu vé và xe có huy hiệu số đơn mới (1, 2, 3…), không có chuông hoặc hộp Đơn mới riêng. Cập nhật mỗi 20 giây khi tab hiển thị. Vào Đơn hàng chỉ đánh dấu đơn vé đã xem; vào Đơn xe chỉ đánh dấu xe. Mốc đọc lưu riêng từng loại và từng admin trên server; đọc mốc cũ không nuốt thông báo mới tới sau đó.

Thông báo tạo cùng giao dịch với đơn. Đơn vé nhiều gói chỉ có một thông báo theo mã giỏ, không lặp từng vé con; retry không báo trùng. Không có âm thanh, email hay thông báo push hệ điều hành mặc định.

## Kiểm tra

Test: chia tiền lẻ đúng tổng, tự tạo/join/chốt/mở lại nhóm, chặn đầy nhóm, khóa giá, quyền admin, theo dõi riêng tư, ghép khách ngoài, tiến độ cả xe, lưu từng mục độc lập và mốc đọc thông báo. Kiểm thử tích hợp dùng pg-mem; cần kiểm thử tải/tranh chấp trên PostgreSQL thật trước khi vận hành lưu lượng lớn.
