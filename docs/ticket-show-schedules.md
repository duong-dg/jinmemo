# Lịch suất theo giai đoạn

Mở Vé & tour → sản phẩm → Lịch bán → Lịch sử dụng / khởi hành.

1. Giữ suất mặc định cho thời gian chưa có lịch riêng.
2. Chọn dùng chung cho tất cả gói nếu ECO/High/VIP có cùng giờ.
3. Thêm giai đoạn với ngày sử dụng bắt đầu/kết thúc, các thứ, ưu tiên và các suất.
4. Ví dụ lịch 2027: nhập khoảng ngày chính thức của đối tác, thêm 19:00–20:00 và 20:30–21:30 nếu đúng lịch công bố. Chọn thứ Ba để áp dụng cả ngày đó.
5. Nếu trước đây có khóa thứ Ba định kỳ, bật Mở lại các thứ đang khóa định kỳ trong giai đoạn. Ngày khóa cụ thể (kể cả có chọn thứ) và khoảng khóa không theo thứ vẫn có hiệu lực. Không tự sửa dữ liệu đối tác hiện có.
6. Lưu sản phẩm rồi kiểm tra giá theo ngày. Nếu bật tồn vé, cấp tồn cho từng suất tại Tồn vé; có thể dùng chung giới hạn cả ngày và thêm giới hạn từng suất.

Ngày khớp nhiều giai đoạn chọn ưu tiên cao nhất, rồi khoảng ngắn nhất, rồi dòng thêm sau. Giai đoạn theo thứ không áp dụng ngoài các thứ đã chọn; lúc đó dùng giai đoạn khác phù hợp hoặc lịch mặc định. Một suất tự chọn, nhiều suất khách chọn. Ngừng bán tại giờ bắt đầu theo múi giờ Việt Nam.

Web, POS và CTV dùng cùng quy tắc. Giỏ web có thể sửa ngày và chọn lại suất. Tồn được tách theo gói/ngày/suất. Suất cũ không hoạt động trong giai đoạn mới sẽ bị từ chối khi báo giá/đặt đơn. Đơn đã tạo giữ giờ bắt đầu và kết thúc trong snapshot, không bị đổi khi sửa lịch sau này.

Dữ liệu nằm trong JSON sản phẩm, không cần xóa DB hoặc nhập lại giá. Giá ngày/mùa hiện tại tiếp tục áp dụng cho cả hai show; chưa bổ sung giá khác nhau theo từng show. Các thay đổi cần cập nhật cả API và web.
