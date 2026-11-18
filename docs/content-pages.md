# Contact and content pages

Admin: Pages → Content pages & menu (`/admin/trang-noi-dung`).

- The Contact page uses support@jinmemo.com (confirmed by the owner). A one-time migration fills only an empty contact email; existing addresses are retained. Edit the contact tab to change email, phone, address and support hours. `/lien-he`, `/en/contact`.
- Create custom pages (privacy, terms, support, about) as drafts. Enter and review your own content before publishing. No legal policy is automatically published.
- Menu & publication: choose top menu (Contact is a direct desktop link; other pages use the Information dropdown; mobile links stay flat), footer, short labels and order. Only published pages and separately published English translations appear publicly. Long menus scroll rather than overflow.
- English is edited in the same page, with its own slug and content. `/trang/:slug` and `/en/pages/:englishSlug`; hreflang and the language switcher use per-page locale paths.
- Published pages have canonical/social metadata, breadcrumbs and sitemap entries. Alias URLs redirect permanently after a slug change; old aliases are reserved.
- Custom pages support recoverable trash; restore as a draft. Contact can be unpublished, but not trashed. Saves use optimistic version checks and an audit record.
- HTML is sanitized and embedded images must exist in JinMemo media. Public responses exclude draft/English draft content and internal versions. Only the admin guard permits edits.
- Contact includes email/phone/map links, booking lookup, and a real Vietnamese/English enquiry form. Messages are saved privately in the database; success means the enquiry was saved, not that an email was sent. SMTP is not required.
- Pages → Contact enquiries (`/admin/lien-he`): view the newest 100 per status, open a reply in your email application, mark done, move to trash or restore. Admin authentication, mutation origin checks and audit records protect state changes. Customer text is rendered as plain text.
- Public submissions require the configured PUBLIC_BASE_URL origin and X-JinMemo-Contact header. Strict input validation, a honeypot, a per-email limit (3/15 minutes) and a per-process global limit (100/15 minutes) reduce spam. Browser retries reuse a request ID, so a lost response does not create duplicates; changed content uses a new ID. The per-process limits reset on API restart. No request-list endpoint is public.
- Form enquiries do not subscribe visitors to marketing or send automatic emails. Staff should check the admin inbox and reply manually. The configured support mailbox must exist at the email provider to receive direct email links.

## Kênh nhắn tin trên trang Liên hệ

Trang → Liên hệ → Thông tin liên hệ có ô WhatsApp, link Zalo và Messenger. WhatsApp nhập số quốc tế, ví dụ +84 901 234 567 (bỏ số 0 đầu số Việt Nam). Zalo dùng https://zalo.me/...; Messenger dùng https://m.me/tenfanpage hoặc link messages/t của Facebook. Lưu trang để các thẻ nhắn tin xuất hiện ở website. Giá trị để trống tự ẩn, dùng chung cho bản Việt/Anh, không cần nhập lại bản dịch. Giữ nguyên điện thoại, email, bản đồ và form gửi liên hệ hiện có.

Chỉ nhận liên kết HTTPS đúng tên miền của kênh và không có thông tin đăng nhập trong URL. Dữ liệu JSON cũ không có trường mới vẫn đọc/lưu được; không cần migration. Không tự gán số hoặc tài khoản chưa được chủ website nhập.

Facebook / Fanpage có ô riêng nhận https://facebook.com/... hoặc https://www.facebook.com/..., hiện thẻ Xem fanpage. Messenger vẫn là link nhắn tin riêng, không bị thay thế khi nhập Facebook.
