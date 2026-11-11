# Booking phòng và phân hệ tùy chọn

## Bật và thiết lập

Cài đặt → Phân hệ website điều khiển Quà lưu niệm và Booking phòng. Tắt ẩn menu, dừng nhận đơn mới nhưng giữ dữ liệu và tra cứu đơn cũ. Booking mặc định tắt; quà lưu niệm giữ trạng thái cũ khi nâng cấp.

Booking phòng → Cơ sở & loại phòng: tạo cơ sở Việt/Anh, địa chỉ, Maps, ảnh, chính sách, giờ nhận/trả; tạo phòng với sức chứa, giá và tồn mỗi đêm. Xuất bản sau khi nhập đủ thông tin.

Lịch giá cho phép áp dụng cùng lúc nhiều phòng theo khoảng ngày và thứ. Từng trường giá/tồn/khóa/ưu đãi lấy quy tắc ưu tiên cao nhất; hòa thì khoảng ngắn hơn rồi dòng mới hơn. Đêm trả phòng không tính tiền. Giới hạn bán để trống không giới hạn năm. Lịch tồn dưới form phản ánh dữ liệu đã lưu.

Voucher phòng độc lập với voucher vé: giảm phần trăm hoặc số tiền, giới hạn cơ sở, ngày đặt/ngày nhận, số đêm, số lượt và cộng dồn ưu đãi.

## Luồng đơn và tiền

Khách chọn phòng/ngày/số khách → báo tổng từng đêm → điền liên hệ và chọn phương thức → tạo đơn JH. Tồn được khóa và kiểm tra toàn bộ kỳ ở khi tạo, yêu cầu lặp không tạo hai đơn. Online chưa trả giữ 30 phút; đơn trả sau giữ đến khi admin xử lý. Đơn xác nhận hoặc đã thu tiền không tự hết hạn. Không nhận đơn thì hủy để trả tồn.

Tiếp nhận, xác nhận phòng và thanh toán là ba việc riêng. Chỉ nhận phòng sau khi đã ghi thu. Chuyển khoản/cash ghi thu tại admin hoặc dùng các cổng LIVE đang bật; callback kiểm tra số tiền và ghi nhận một lần. Tiền về sau hết giữ phòng vào đối soát, không tự hồi sinh đơn. Hủy không tự gửi tiền hoàn; sổ Hoàn tiền dùng ghi nhận khoản hoàn thực tế.

Email đi qua hàng đợi SMTP; thất bại thử lại tối đa 5 lần. Chi tiết đơn có lịch sử và gửi lại. Link khách chứa khóa riêng, không chia sẻ công khai. Tắt phân hệ không chặn tra cứu hoặc xử lý khoản tiền đã phát sinh.

## Phạm vi

Tồn nhập thủ công, không đồng bộ Booking.com/Airbnb. Booking dùng checkout riêng; giỏ vé/xe/quà hiện tại giữ nguyên. Chưa có POS/CTV bán phòng, chính sách hủy tự động hay báo cáo lợi nhuận phòng. Kiểm tra SMTP và một giao dịch thật trên môi trường triển khai trước khi mở bán.

## Cập nhật Ubuntu

Sao lưu trước, rồi trong thư mục JinMemo:

```sh
git pull --ff-only
docker compose up -d --build
docker compose ps
```

Schema bổ sung tự tạo khi API khởi động, không xóa cơ sở dữ liệu cũ. Vào Cài đặt → Phân hệ website bật module, tạo cơ sở thử và kiểm tra trên cả điện thoại/máy tính.
