# Lượt xem và khám phá bài viết

- **Blog → Bài viết → SEO & xuất bản → Bài viết nổi bật**: admin tự đánh dấu. Bản nháp, bài hẹn giờ chưa tới giờ và thùng rác không xuất hiện công khai.
- Cẩm nang có **Mới nhất / Đọc nhiều / Nổi bật**. Có thể kết hợp với chuyên mục, mỗi lần hiện thêm 6 bài. Mới nhất dựa ngày xuất bản; đọc nhiều dựa tổng lượt xem ghi nhận từ khi triển khai tính năng. Không có số liệu lịch sử để hồi dựng lượt xem trước đó.
- Trang bài viết và danh sách admin hiện lượt xem. Cuối bài có gợi ý bài mới nhất và đọc nhiều; loại trừ bài đang đọc và không hiện nháp/hẹn giờ/thùng rác.

## Quy tắc đếm

Trình duyệt đề nghị ghi nhận sau 8 giây liên tục ở tab đang hiển thị bài. Bản xem trước trong admin không gửi đề nghị. Server chỉ đếm bài đã xuất bản, kiểm tra Origin/header cùng website, giới hạn 120 yêu cầu/phút/IP ở một API process, bỏ qua user-agent bot phổ biến và phiên admin còn hợp lệ.

Chống đếm lặp theo bài + ngày Việt Nam + IP đã xác thực từ proxy + user-agent. Bản Việt/Anh dùng chung lượt xem và cờ nổi bật. Tải lại nhiều lần trong ngày không cộng thêm cho cùng nhóm này. Secret HMAC ngẫu nhiên được lưu trong database để giữ chống trùng qua restart. Chỉ lưu fingerprint, không lưu IP hay user-agent gốc trong bảng thống kê; khóa ngày trước được dọn khi có lượt đọc mới, tổng lượt xem vẫn giữ.

Đây là **thống kê tham khảo**, không phải số người đọc duy nhất hay hệ thống chống gian lận hoàn chỉnh. Người dùng cùng mạng/thiết bị có thể bị gộp; thay IP/UA, chặn JavaScript, chuyển tab sớm và bot giả trình duyệt có thể làm sai lệch số liệu. Cần cấu hình đúng header IP xác thực của NPM để không gộp toàn bộ truy cập vào IP proxy.

Counter được lưu riêng, không sửa version, bản dịch hay updated_at bài viết. Không nhận tổng lượt xem do client nhập. Bài đăng ngay được ghi ngày xuất bản lần đầu, sửa nội dung không tự đẩy bài cũ lên mục mới nhất; admin vẫn có thể chủ động sửa ngày xuất bản.

Cập nhật thông thường bằng git pull, build và docker compose up -d; API tự tạo hai bảng thống kê. Giữ lại database/volume hiện có.
