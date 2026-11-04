# Đặt xe riêng và xe ghép

## Tạo tuyến

Trong **Đặt xe → Tuyến xe & giá**, bấm **Thêm tuyến xe**. Danh sách này tách khỏi **Vé & tour**; các tuyến xe cũ tự xuất hiện đúng mục, không cần nhập lại. Tạo loại sản phẩm “Đưa đón / đặt xe” nếu muốn phân loại riêng. Điểm đến, ảnh, mô tả, nội dung chi tiết và bản dịch dùng trình sửa hiện có.

Trong tab **Đặt xe → Đặt xe / đưa đón**, chọn xe riêng hoặc xe ghép; nhập nơi đi, nơi đến và số phút ngừng nhận trước giờ đi. Mỗi gói là một loại xe/dịch vụ. Điền tối đa hành khách cho từng gói.

- Xe riêng: giá cho cả xe/chuyến, mỗi dòng đặt một xe. Có thể tạo gói một chiều và gói khứ hồi với giá riêng. Khứ hồi yêu cầu ngày/giờ về sau giờ đi. Đặt nhiều xe cùng gói/ngày trong một dòng chưa được hỗ trợ; tạo đơn riêng. Đây là yêu cầu điều xe thủ công, chưa phải hệ thống tự kiểm tra xe rảnh của nhà xe.
- Xe ghép: giá mỗi chỗ, mỗi chiều là một gói riêng. Bắt buộc tạo ít nhất một suất giờ tại **Lịch bán**. Vào **Tồn vé & giới hạn**, bật quản lý tồn và mở số chỗ theo gói/ngày/suất. Chưa bật giới hạn thì không nhận đơn xe ghép. Tồn được dùng chung với web, quầy, CTV; hủy đơn theo quy trình hiện có sẽ trả chỗ. Không có sơ đồ chọn ghế cụ thể.

Giá ngày lễ/cuối tuần, giảm online, giá CTV và giá vốn nguồn dùng cơ chế hiện có. Trong dữ liệu giá, ADULT là đơn vị xe/chuyến hoặc chỗ của sản phẩm xe; không bật các nhóm tuổi. Giá khứ hồi bao gồm hai chiều, không tự nhân hai hoặc tự phụ thu. Viết rõ phạm vi đưa đón, hành lý, thời gian chờ và phụ thu ngoài phạm vi trong nội dung sản phẩm trước khi bán.

## Bán và nhận đơn

- Web: menu **Đặt xe** (`/dat-xe`, tiếng Anh `/en/transfers`) → lọc tuyến/hình thức → chọn xe, ngày và số lượng → thanh toán. Bản Anh chỉ hiện sản phẩm có bản dịch được xuất bản.
- Quầy/CTV: chọn sản phẩm xe trong danh mục hiện có; thanh toán/chốt đơn có thêm thông tin chuyến xe.
- Thông tin bắt buộc: địa chỉ đón/trả, giờ đón, số hành khách. Xe ghép lấy số khách bằng số chỗ và giờ đón theo suất đã chọn. Chuyến bay là tùy chọn. Tất cả thời gian theo Việt Nam.
- Mỗi đơn lưu nguyên thông tin chuyến tại lúc đặt; thay đổi tuyến/sức chứa sau đó không sửa đơn cũ. Email xác nhận và trang chi tiết có thông tin đón/trả. Thanh toán dùng các cổng và quy trình hiện có, không tạo một sổ thanh toán riêng cho xe.

## Điều xe

**Bán hàng → Đặt xe & điều xe** (`/admin/dat-xe`): lọc ngày, mở đơn, nhập nhà xe, tài xế, điện thoại, biển số và ghi chú nội bộ.

Luồng: **Chờ điều xe → Đã gán tài xế → Đang chạy → Hoàn thành**. Khi còn ở trạng thái đã gán có thể trả về chờ điều xe. Không được bỏ qua bước đang chạy, sửa chuyến hoàn thành hoặc điều xe cho đơn đã hủy. Lưu có kiểm tra phiên bản để tránh hai admin ghi đè nhau; thao tác có nhật ký.

Thanh toán thành công không tự gán tài xế. Trang này chưa tự gửi SMS/email thông tin tài xế khi gán; dùng hướng dẫn đơn hàng hoặc liên hệ khách để xác nhận. Trang tra cứu đơn hiển thị trạng thái điều xe và tên/điện thoại/biển số tài xế đã được gán. Ghi chú nội bộ không đưa vào trang khách hoặc email xác nhận. Hủy/hoàn xử lý tại Đơn hàng, không đổi trạng thái thanh toán bằng thao tác điều xe.

## Cập nhật

```bash
cd ~/jinmemo
git pull --ff-only
sudo docker compose --progress plain build api
sudo docker compose up -d
```

API bổ sung bảng `jinmemo_transport_jobs` khi khởi động; giữ nguyên dữ liệu cũ. Chưa kết nối API nhà xe hay tự phân bổ đội xe.

Kiểm thử tự động dùng pg-mem cho checkout web/quầy/CTV, giữ/trả chỗ, hạn nhận chuyến, thông tin khứ hồi, phân quyền và phiên bản điều xe. Cần thử thêm trên PostgreSQL thật với số chỗ và lịch vận hành của nhà xe trước khi mở bán.
