# Tìm và xuất booking xe

Quản trị → Đặt xe & điều xe → Booking xe mới: tìm theo mã booking, tên khách, điện thoại hoặc email. Nhấn Tìm hoặc Enter để áp dụng, kết hợp ngày đi và trạng thái; Xóa bộ lọc để xem lại toàn bộ. Tìm không phân biệt hoa thường; %, _ và chuỗi SQL được coi là văn bản.

Xuất CSV / Excel lấy toàn bộ booking khớp bộ lọc đang áp dụng, gồm mọi trang. Nếu sửa từ khóa, cần nhấn Tìm trước khi xuất. File CSV UTF-8 mở bằng Excel, không phải workbook XLSX. Không áp dụng cho bộ lọc Điều xe hôm nay.

Các cột gồm mã/ngày/giờ, trạng thái, xe/số khách, nơi đón/trả, liên hệ khách, giá trị đơn, giá vốn đại lý, tình trạng thanh toán, tiền đã ghi thu, khứ hồi, tài xế/biển số và ghi chú. Giá vốn chưa nhập để trống, 0đ giữ là 0. Tiền ghi thu chưa trừ hoàn, không tự tính lãi hoặc coi đơn hủy là đã hoàn. Booking trong giỏ chung xuất giá trị riêng của chuyến, không xuất tổng toàn giỏ.

Giới hạn 10.000 dòng mỗi lần; vượt giới hạn trả lỗi, không cắt dữ liệu. Một SELECT đọc kết quả. Chặn công thức từ dữ liệu khách, giữ số 0 đầu điện thoại và tiếng Việt. Không xuất request key, hash hoặc link bí mật.

Chỉ admin đăng nhập được xuất, POST kiểm tra nguồn/CSRF, phản hồi private/no-store; audit ride.export kèm số dòng. File có dữ liệu liên hệ và giá vốn, chỉ chia sẻ với người có quyền. Xuất không thay đổi đơn, tiền, email hoặc chuyến.
