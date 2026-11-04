# Phân hệ vé/tour và xe

## Quản trị riêng

- **Vé & tour → Danh sách & giá** (`/admin`): chỉ vé/tour; thêm vé/tour không có cấu hình vận chuyển.
- **Đặt xe → Tuyến xe & giá** (`/admin/xe`): chỉ tuyến xe; có nút Thêm tuyến xe, loại xe, tuyến, sức chứa, chiều đi và lịch bán. Xe mới có sẵn cấu hình xe riêng và sức chứa mặc định để chỉnh; không đổi thành vé ngay trong màn hình này.
- **Đặt xe → Đơn xe & điều xe** (`/admin/dat-xe`): tiếp nhận và điều hành chuyến đã đặt.

Danh sách, thống kê và bản sao theo đúng phân hệ đang mở. Tuyến cũ nhận diện bằng cấu hình transport đã có, không cần xóa hoặc nhập lại dữ liệu. Danh sách vé công khai ở trang chủ, loại sản phẩm và điểm đến không trộn tuyến xe; xe có trang `/dat-xe` riêng.

Đơn hàng, thanh toán, khách hàng, CTV, giá, lịch, kho/nguồn và email tiếp tục dùng chung phần lõi hiện có. Đây là phân tách phân hệ và giao diện; không tách thành các dịch vụ hay database độc lập. API quản trị sản phẩm chung vẫn được bảo vệ bằng quyền admin hiện có, chưa thêm phân quyền biên tập riêng từng phân hệ.

## Khách sạn sau này

Module lưu trú sẽ có danh mục khách sạn, loại phòng, sức chứa, tiện nghi, chính sách, ngày nhận/trả phòng và tồn phòng theo đêm. Báo giá theo số phòng/số đêm; không đưa vào số lượng vé hoặc số chỗ xe. Có thể dùng chung đơn/thanh toán/khách hàng, nhưng cần phần kiểm tra khả dụng và snapshot đặt phòng riêng. Module này chưa được triển khai trong bản hiện tại.

## Cập nhật

Build image và khởi động lại Compose như bình thường; không cần thay SQL hoặc reset dữ liệu cho việc tách giao diện này. Xem TRANSFERS.md để tạo tuyến và mở số chỗ xe ghép.
