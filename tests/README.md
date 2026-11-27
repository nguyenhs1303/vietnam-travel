# Bộ kiểm thử

Kiểm thử tự động bằng [Playwright](https://playwright.dev): mở `index.html` trong Chromium và thao tác như người dùng.
Trang vẫn là HTML/CSS/JS tĩnh, không cần build — `package.json` chỉ phục vụ bộ kiểm thử.

## Chạy

```bash
npm install                              # lần đầu
npx playwright install chromium          # lần đầu: tải trình duyệt
npm test                                 # chạy tất cả (~2–3 phút)
npx playwright test tests/popup.spec.js  # một file
npx playwright test -g "review #2"       # theo tên bài
npm run test:ui                          # giao diện xem từng bước, tua lại
```

Trên GitHub, workflow `.github/workflows/test.yml` tự chạy cho mỗi pull request và mỗi lần đẩy lên `main`.
Bài nào thất bại thì tải `playwright-report` ở mục Artifacts của lượt chạy để xem ảnh chụp + trace.

## Môi trường cố định (`tests/fixtures.js`)

Mọi bài dùng fixture `app` để kết quả không phụ thuộc mạng hay ngày giờ thật:

| Cố định | Giá trị | Đổi trong bài |
|---|---|---|
| Ngày giờ | 27/11/2026 10:00 (tháng 11 → 6 nơi đang mùa đẹp, ban ngày) | — |
| Thời tiết | dữ liệu giả (ít mây, 22–29°) | `test.use({ weather: "fail" })`, giữa chừng `app.setWeather("ok")` |
| Mạng ngoài | chặn hết (font Google, nền OSM) | — |
| Giao diện | ban ngày | `test.use({ theme: "night" })` |
| Hiệu ứng mở đầu | bỏ qua ("giảm chuyển động") | `test.use({ motion: "no-preference" })` |
| Màn hình | 1440×900 | `test.use({ viewport })`, `test.use({ ...iPhone13 })` |

Tiện ích của `app`: `open(tên)`, `isOpen(tên)`, `type(chữ)`, `said()` (các câu đã đọc cho trình đọc màn hình),
`active()`, `axe()`, `idx(tên)`. Lưu ý `PLACES` xếp Bắc → Nam, **khác** thứ tự danh sách hiển thị — tìm theo tên.

## Các nhóm

| File | Kiểm tra |
|---|---|
| `logic.spec.js` | Đọc tháng mùa đẹp, chấm điểm "Đẹp nhất lúc này", tìm kiếm không dấu, giờ mặt trời, lời khuyên thời tiết, thứ tự thông báo |
| `list.spec.js` | Tìm kiếm, lọc loại, sắp theo mùa, khung "Không tìm thấy", chọn địa danh (bay tới, chọn nhanh liên tiếp) |
| `popup.spec.js` | Tab, thời tiết lỗi / thử lại, popup không đè khung nào (16 nơi × 2 cỡ màn hình), focus bàn phím, popup khi lọc / zoom |
| `map.spec.js` | Marker chồng nhau được xếp vòng, tên không đè nhau, trạng thái mùa, dòng thời gian lịch sử |
| `mobile.spec.js` | Bảng trượt (mở / đóng / kéo / Esc), thanh tháng thu gọn, chip một hàng, bản đồ bị che ≤ 18%, thấy ngay địa danh đầu tiên, vùng chạm, ô tìm 16px, dvh, màn hình thấp, 320px |
| `a11y.spec.js` | axe-core 0 vi phạm (ngày, đêm, lịch sử, mobile), lối tắt, viền focus, tên cho trình đọc màn hình, thông báo, tương phản ngày / đêm, chuyển động dừng trong 5 giây |

Bài có `[review #n]` trong tên là bài hồi quy cho lỗi số n trong bản code review — đừng xoá khi lỗi "trông như đã hết".

## Khi thêm tính năng

- Thêm bài vào file theo nhóm ở trên; luôn dùng fixture `app` (đừng `page.goto` trực tiếp).
- Đổi giao diện mà làm hỏng bài tương phản / vùng chạm / axe: sửa giao diện cho đạt, đừng nới bài kiểm tra.
- Sửa lỗi: viết bài tái hiện lỗi trước (phải **thất bại** trên code cũ), rồi mới sửa.
