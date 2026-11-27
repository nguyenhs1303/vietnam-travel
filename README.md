# Bản đồ danh thắng Việt Nam

Bản đồ du lịch phong cách **atlas cổ màu sepia**: 16 danh lam thắng cảnh, ảnh thật, thời tiết trực tiếp,
gợi ý nơi nên đi theo mùa, chuyện kể, món ăn đặc sản và dòng thời gian lịch sử.
Trang tĩnh thuần HTML/CSS/JS, không cần build, không cần server riêng.

## Chạy thử

Mở thẳng `index.html` bằng trình duyệt là chạy được. Hoặc chạy một server tĩnh trong thư mục dự án:

```powershell
python -m http.server 5577
```

rồi mở `http://localhost:5577`. Cần có mạng để tải font, thời tiết và nền OpenStreetMap khi phóng to.

> Sửa file xong mà không thấy thay đổi: bấm **Ctrl + F5** để trình duyệt bỏ bản lưu tạm.

## Kiểm thử

```bash
npm install && npx playwright install chromium   # lần đầu
npm test                                          # 119 bài, ~3 phút
```

Chi tiết, cách viết thêm bài: [`tests/README.md`](tests/README.md). GitHub Actions tự chạy cho mỗi pull request.

## Cấu trúc thư mục

```
index.html            Khung trang + thứ tự nạp CSS/JS
README.md · CREDITS.md
css/                  Giao diện — nạp đúng thứ tự trong index.html (file sau ghi đè file trước)
  base.css            Biến màu, chữ, vân giấy, thanh bên, ô tìm kiếm, danh sách
  best-now.css        Khung "Đẹp nhất lúc này"
  map.css             Bản đồ giấy, chữ trên bản đồ, khung tiêu đề, la bàn, thước, marker
  popup.css           Bảng thông tin dạng tab, chuyện kể, món ăn, lịch 12 tháng, thời tiết
  season-bar.css      Thanh chọn tháng
  theme.css           Màu các lớp bản đồ (biến), công tắc ngày/đêm, đồng hồ
  night.css           Bảng màu bản đồ đêm (body.night)
  timeline.css        Dòng thời gian lịch sử
  intro.css           Hiệu ứng bản đồ tự vẽ khi mở trang
  responsive.css      Màn hình nhỏ (≤ 760px)
js/                   Mã — các file dùng chung biến toàn cục nên PHẢI nạp đúng thứ tự dưới đây
  map.js              Tạo bản đồ, vẽ bản đồ giấy, đổi sang nền OSM sepia khi zoom sâu
  map-controls.js     Khung tiêu đề, la bàn, thước tỷ lệ
  theme.js            Giờ mặt trời mọc/lặn, công tắc ngày/đêm, đồng hồ
  places.js           Tiện ích chung: mùa đẹp, icon/màu theo loại, ảnh, ghi nguồn
  weather.js          Thời tiết Open-Meteo
  best-now.js         Chấm điểm "Đẹp nhất lúc này"
  popup.js            Bảng thông tin dạng tab (máy tính: popup · màn hình nhỏ: bảng trượt từ dưới lên)
  markers.js          Marker địa danh
  declutter.js        Xếp vòng marker chồng nhau, ẩn/hiện tên địa danh để không đè lên nhau
  season.js           Thanh chọn tháng
  timeline.js         Dòng thời gian lịch sử
  list.js             Tìm kiếm, lọc, danh sách, bay tới địa danh
  intro.js            Hiệu ứng mở đầu
  main.js             Khởi động (luôn nạp sau cùng)
data/
  data.js             CATEGORIES (loại), PLACES (địa danh), HISTORY (mốc lịch sử) ← sửa nội dung ở đây
  photo-credits.js    Tác giả & giấy phép từng ảnh
  paper-data.js       Đường bờ, nước láng giềng, sông (Natural Earth) để vẽ bản đồ giấy
  vietnam-border.js   Ranh giới quốc gia gồm lãnh hải (OpenStreetMap)
images/places/        Ảnh địa danh (480px)
vendor/leaflet/       Thư viện bản đồ Leaflet 1.9.4
tests/                Bộ kiểm thử Playwright (xem tests/README.md) · playwright.config.js · package.json
.github/workflows/    Chạy kiểm thử trên GitHub Actions
```

## Thêm một địa danh

1. Chép ảnh (khoảng 480px chiều ngang) vào `images/places/ten-dia-danh.jpg`.
2. Ghi tác giả, giấy phép, link nguồn của ảnh vào `data/photo-credits.js` (và `CREDITS.md`).
3. Thêm một mục vào `PLACES` trong `data/data.js`:

```js
{ name:"Tên địa danh", icon:"🏯", photo:"images/places/ten-dia-danh.jpg", region:"Tỉnh", cat:"heritage",
  lat:16.0, lng:108.0,
  desc:"Mô tả ngắn.",
  story:"Sự tích / giai thoại 1–2 câu.",
  foods:[["Tên món", "mô tả ngắn"], ["Món khác", "…"]],
  best:"Tháng 2–4" },
```

- `cat`: `nature` · `heritage` · `beach` · `city` (màu và nhãn lấy từ `CATEGORIES`).
- `best`: viết tự nhiên kiểu `"Tháng 3–5, 9–11"` hoặc `"Tháng 11–3"`; số tháng được đọc tự động cho thanh mùa và lịch.
- `story`, `foods`, `photo`, `icon` đều có thể bỏ trống — tab tương ứng sẽ tự ẩn.

Thời tiết, điểm "Đẹp nhất lúc này" và tìm kiếm theo món ăn tự áp dụng cho địa danh mới.

## Thêm một mốc lịch sử

Thêm vào `HISTORY` cuối `data/data.js` (giữ thứ tự tăng dần theo `year`):

```js
{ year: 1010, when: "1010", place: "Hồ Hoàn Kiếm & Phố cổ", title: "Tiêu đề ngắn", text: "Một hai câu kể." },
```

`place` phải trùng **chính xác** `name` của một địa danh trong `PLACES`. `when` là chữ hiển thị
(có thể ghi `"TK IV"`, `"30/4/1975"`…); `year` chỉ dùng để sắp xếp.

## Chỉnh nhanh

| Muốn đổi | Ở đâu |
|---|---|
| Cách chấm điểm "Đẹp nhất lúc này" | `scorePlace()` trong `js/best-now.js` |
| Lời khuyên theo thời tiết | `weatherTips()` trong `js/weather.js` |
| Mức zoom chuyển sang nền OSM | `updatePaperDetail()` trong `js/map.js` |
| Mức zoom khi bấm một địa danh (mặc định 7, vẫn là bản đồ giấy) | `focusPlace()` trong `js/list.js` |
| Thời lượng hiệu ứng mở đầu | `playIntro()` trong `js/intro.js` |
| Tốc độ tự chạy dòng thời gian | `startHistoryPlay()` trong `js/timeline.js` (4500 ms) |
| Màu ban ngày / ban đêm | biến CSS trong `css/base.css`, `css/theme.css` · `css/night.css` |
| Màu từng loại địa danh | `CATEGORIES` trong `data/data.js` |

## Trợ năng (accessibility)

Trang nhắm chuẩn WCAG 2.1 AA. Khi sửa giao diện, giữ các quy ước sau:

- **Emoji trang trí** bọc bằng `deco("🌸")` (trình đọc màn hình bỏ qua). Emoji **có nghĩa** (thời tiết, 💧 khả năng mưa)
  thì kèm chữ ẩn `srOnly("ít mây")` hoặc `role="img" aria-label="…"`. Cả hai hàm ở `js/places.js`.
- **Thông báo thay đổi** (số kết quả, tháng đang chọn, thời tiết) gọi `announce("…")` — đọc qua vùng `#sr-status`.
- **Mở thông tin địa danh** luôn qua `openPlace()` / `closePlace()` (`js/popup.js`): tự đưa focus vào tiêu đề và trả focus
  về nút đã bấm khi đóng.
- **Cỡ chữ**: EB Garamond có chữ thường thấp (x-height 0,41) nên tối thiểu 13px (chữ nghiêng 14px); Playfair Display
  chỉ dùng từ 18px (nét thanh rất mảnh khi nhỏ); dòng ghi nguồn tối thiểu 12px. Kiểm tra: `tests/typography.spec.js`.
- **Chữ số** đều chiều cao (`font-variant-numeric: lining-nums` trên body; Playfair mặc định là chữ số oldstyle).
  Số và đơn vị nối bằng khoảng trắng không ngắt (`\u00a0`): "12\u00a0km/h".
- **Màu chữ** ≥ 4.5:1 so với nền (chữ to ≥ 3:1), viền ô nhập / nút ≥ 3:1 — cả ban ngày lẫn ban đêm (`css/night.css`).
- **Hiệu ứng tự chạy** phải dừng trong 5 giây (vòng sáng chỉ chạy 2 lượt) và tắt hẳn khi máy bật "giảm chuyển động".
- **Chữ ẩn cho trình đọc màn hình** (`.sr-only`, `srOnly()`) dùng `position:absolute`: khung cuộn chứa nó phải có
  `position` (như `#sidebar`, `#list`, `.ppanel`), không thì nó kéo dài cả trang và trang cuộn được (lỗi iPhone: bản đồ
  trôi khỏi màn hình). Bài `[iOS cuộn]` trong `tests/mobile.spec.js` canh lỗi này.
- **Vùng chạm** trên màn hình cảm ứng ≥ 40px (`@media (pointer:coarse)` trong `css/responsive.css`).

## Nguồn dữ liệu & giấy phép

- Bản đồ nền khi phóng to: © OpenStreetMap contributors (ODbL).
- Đường bờ, nước láng giềng, sông: Natural Earth (public domain).
- Ranh giới & lãnh hải Việt Nam: OpenStreetMap, relation 49915 (ODbL).
- Thời tiết: Open-Meteo (CC BY 4.0).
- Ảnh địa danh: Wikimedia Commons — tác giả và giấy phép từng ảnh xem `CREDITS.md`.
- Font: EB Garamond, Playfair Display (Google Fonts, SIL Open Font License).
