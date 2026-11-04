# Đặt xe theo khu vực và bảng điều xe

## Cấu hình

Vào **Đặt xe → Loại xe / Khu vực đón trả / Giá tuyến / Lịch chuyến ghép**.

- **Loại xe:** tên, số ghế hành khách thực nhận, một hình và một ghi chú dùng chung. Không nhập lại ghi chú ở từng tuyến. Số ghế không tự suy ra từ tên xe.
- **Khu vực:** tạo vùng và các phường/xã trực thuộc theo địa chỉ hiện hành của đơn vị vận hành. Không gắn cứng danh mục hành chính cũ. Đây là vùng phục vụ/bảng giá do admin quản lý, không phải tự tra địa chỉ hoặc dữ liệu bản đồ.
- **Giá tuyến:** theo chiều đi và loại xe, giá xe riêng/chuyến, giá xe ghép/người, thời gian di chuyển ước tính. Chiều về cần cấu hình riêng. Giá đúng khu vực được ưu tiên; khi dùng tuyến vùng cha, cộng mức điều chỉnh vùng con theo xe. Website chỉ hiện tổng tiền. Xe ghép tính giá/người × số người + điều chỉnh khu vực một lần cho nhóm.
- **Chuyến ghép:** ngày, loại xe, khoảng đón và giờ khởi hành, hạn ngừng nhận. Giá lấy từ Giá tuyến, không nhập lại ở chuyến. Ghế đã ghép là booking thật, không dùng khách mẫu của bản khung cũ.
- Không có dữ liệu mẫu hoặc tab thử báo giá trong admin. Nhập giá thật, lưu rồi bật **Mở nhận đặt xe trên website** khi đã sẵn sàng.
- Trong **Khu vực đón trả → Nạp xã/phường tự động**, chọn dữ liệu mới (sau 07/2025) hoặc cũ, tải tỉnh/thành. Bộ cũ chọn thêm quận/huyện, rồi bấm nạp và Lưu. Chỉ thêm ID chưa có, không sửa khu vực/giá cũ, không tự quy đổi giá giữa địa giới cũ/mới.
- Nguồn: https://provinces.open-api.vn/ (danh mục tham khảo cộng đồng). API chỉ gọi khi admin nạp, cache một ngày trong bộ nhớ, timeout 12 giây; tối đa 1.000 khu vực phục vụ. Khách dùng dữ liệu đã lưu, API nguồn hỏng không ảnh hưởng tìm xe.
- Thanh tìm xe trên máy tính nằm ngang; điện thoại xếp gọn. Ô nơi đi/nơi đến hỗ trợ gõ không dấu, phím mũi tên, Enter, Escape; cần chọn mục cụ thể để có ID vùng tính giá.

## Website

`/dat-xe`, `/en/transfers` dùng luồng mới; đường dẫn sản phẩm xe cũ chuyển về đây. `/admin/xe` chuyển về cấu hình mới. Nội dung vé/tour không thay đổi.

Khách chọn khu vực/phường/xã cho cả hai đầu, ngày giờ, số người và xe riêng/ghép. Web hiện hình, loại xe, sức chứa, nơi đón/đến, tổng tiền và thời gian ước tính nếu được cấu hình. Ba người có thể chọn xe bảy chỗ. Hành lý chỉ ghi chú, không chọn kích thước vali.

Địa chỉ cụ thể (số nhà/đường) nhập riêng để tài xế đón. Hệ thống không suy đoán phường/xã từ chữ gõ tự do, không gọi dịch vụ bản đồ trả phí. Địa chỉ phải thuộc khu vực khách chọn; nhân viên kiểm tra khi xác nhận. Không dùng thời gian ước tính như ETA giao thông trực tiếp.

Booking mới là **yêu cầu xác nhận thủ công, thanh toán sau**, chưa nối thanh toán online hoặc email xác nhận tự động. Web trả mã booking, nhân viên liên hệ khách theo thông tin đã gửi. Xe ghép chờ ghép chưa giữ ghế, không hứa khách có xe ngay.

## Bảng booking

Vào **Đặt xe → Đơn xe & điều xe** (`/admin/dat-xe`). Bảng hàng/cột gọn, có lọc ngày/trạng thái, 50 dòng/trang và nhãn màu:

- Vàng: chờ xác nhận xe riêng.
- Tím: chờ ghép.
- Xanh dương: chờ đón (đã ghép nếu là xe ghép).
- Xanh ngọc: đã đón.
- Xanh lá: đang đi / hoàn tất.
- Đỏ: đã hủy.

Chọn Xử lý để gán chuyến phù hợp, tài xế, điện thoại, biển số. Chuyến phải đúng loại xe đã chọn, cùng chiều, ngày, trong giờ linh động khách đồng ý, và đủ ghế. Không tự chuyển giờ khách. Không có chuyến phù hợp thì liên hệ khách, không ép ghép 07:00 vào chuyến 10:00.

Chờ đón/đã đón/đang đi giữ ghế; hủy/trả về chờ ghép giải phóng ghế. Server khóa giao dịch chung với cấu hình, kiểm tra sức chứa và phiên bản lại khi lưu, không tin gợi ý cũ trên màn hình. Khi còn khách đang ghép, không được xóa chuyến, đổi loại xe/tuyến/ngày/giờ sai hoặc giảm ghế dưới số đã giữ.

Trạng thái đi xe **không đồng nghĩa đã thu tiền**. Booking dùng bảng `jinmemo_ride_bookings`, không giả tạo khoản thanh toán trong sổ doanh thu vé. Luồng tiền xe sẽ cần tích hợp riêng khi triển khai thu tiền online.

Tab **Tra cứu đơn luồng cũ** giữ các booking lịch sử để đối chiếu/xử lý. Không xóa đơn cũ hay database. Bảng giá mới không tự nhập từ các sản phẩm xe cũ.

## Kiểm tra

Build API/web/worker; test `rides.test.ts` kiểm tra giá server, không lộ dữ liệu khách ở API công khai, origin/header, đăng nhập admin, chống gửi trùng, khóa phiên bản, trạng thái, chặn vượt ghế và trả ghế khi hủy. PG-mem không thay cho kiểm thử tranh chấp trên PostgreSQL thật trước khi triển khai quy mô lớn.
