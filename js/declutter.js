// Gỡ rối bản đồ: (1) marker quá gần nhau trên màn hình được xếp thành vòng quanh tâm nhóm, có nét mực chỉ về vị trí thật;
// (2) tên địa danh luôn hiện nếu không đè lên tên / ảnh khác (ưu tiên mốc lịch sử → đang mùa đẹp → còn lại),
//     tên bị ẩn vẫn hiện khi rê chuột hoặc focus bằng bàn phím.
// Cần: map, PLACES có marker + popup (markers.js), inSeason() (places.js). Tạo ra: declutter()
// Gọi lại sau mỗi lần zoom, lọc danh sách (render), đổi mốc lịch sử.

// Khoảng cách tối thiểu giữa tâm 2 marker (px): ảnh 34px ở mức toàn quốc, 44px khi gần hơn, cộng chút lề
const markerGap = () => map.getZoom() < 7 ? 42 : 52;

function spreadMarkers(shown) {
  const gap = markerGap();
  const pts = shown.map(p => map.latLngToLayerPoint([p.lat, p.lng]));
  // Gom nhóm: hai marker gần hơn gap thì chung nhóm (bắc cầu: A gần B, B gần C → cùng một nhóm)
  const parent = shown.map((_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      if (pts[i].distanceTo(pts[j]) < gap) parent[find(i)] = find(j);
  const groups = {};
  shown.forEach((_, i) => (groups[find(i)] ??= []).push(i));

  const offsets = shown.map(() => [0, 0]);
  Object.values(groups).filter(g => g.length > 1).forEach(g => {
    const k = g.length;
    const cx = g.reduce((s, i) => s + pts[i].x, 0) / k, cy = g.reduce((s, i) => s + pts[i].y, 0) / k;
    // Bán kính vòng sao cho 2 marker kề nhau cách đúng gap
    const r = k === 2 ? gap / 2 : gap / (2 * Math.sin(Math.PI / k));
    // Giữ hướng địa lý: sắp theo góc thật quanh tâm, rồi xoay cả vòng cho lệch ít nhất so với góc thật
    const ang = i => Math.atan2(pts[i].y - cy, pts[i].x - cx);
    const order = [...g].sort((a, b) => ang(a) - ang(b));
    const step = 2 * Math.PI / k;
    const rot = Math.atan2(order.reduce((s, i, n) => s + Math.sin(ang(i) - n * step), 0),
                           order.reduce((s, i, n) => s + Math.cos(ang(i) - n * step), 0));
    order.forEach((i, n) => {
      const t = rot + n * step;
      offsets[i] = [Math.round(cx + r * Math.cos(t) - pts[i].x), Math.round(cy + r * Math.sin(t) - pts[i].y)];
    });
  });
  shown.forEach((p, i) => setMarkerOffset(p, ...offsets[i]));
}

// Dời marker bằng thuộc tính CSS `translate` (cộng thêm vào transform định vị của Leaflet, không đụng tới nó)
function setMarkerOffset(p, dx, dy) {
  const el = p.marker.getElement();
  if (!el) return;
  el.style.translate = dx || dy ? `${dx}px ${dy}px` : "";
  const leader = el.querySelector(".leader");
  const len = Math.hypot(dx, dy);
  // Nét mực từ tâm marker (đã dời) chỉ ngược về vị trí thật, đầu nét là chấm tròn
  leader.style.cssText = len ? `width:${len}px;transform:rotate(${Math.atan2(-dy, -dx)}rad)` : "display:none";
  // Mũi popup chỉ vào marker ở chỗ mới (mặc định của Leaflet là [0, 7]). Chỉ dời khi độ lệch đổi, và dời bằng setLatLng
  // (đặt lại vị trí + autoPan) chứ không update() — update() dựng lại nội dung → mất focus, ô đang đọc cuộn về đầu.
  const [ox, oy] = p.popup.options.offset;
  if (ox === dx && oy === dy + 7) return;
  p.popup.options.offset = [dx, dy + 7];
  if (p.popup.isOpen()) p.popup.setLatLng(p.popup.getLatLng());
}

// Vị trí thử lần lượt cho tên: dưới ảnh (mặc định) → bên phải → bên trái → phía trên
const NAME_SPOTS = ["", "at-r", "at-l", "at-t"];
function placeNames(shown) {
  const rect = el => { const r = el.getBoundingClientRect(); return { left: r.left - 3, right: r.right + 3, top: r.top - 1, bottom: r.bottom + 1 }; };
  const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  // Ảnh của mọi marker là vật cản; tên đặt sau không được đè lên ảnh hay tên đã đặt
  const taken = shown.map(p => rect(p.marker.getElement().querySelector(".pin")));
  // Chữ trên bản đồ giấy (vịnh, đảo, sông, dãy núi): tên của nơi ngoài mùa phải tránh; nơi đang nổi bật thì được đè lên
  const paper = [...map.getPane("labels").querySelectorAll(".lbl:not(.mtn):not(.deg)")]
    .filter(l => l.offsetParent).map(rect);
  const rank = p => {
    const el = p.marker.getElement();
    return el.classList.contains("history-hot") ? 0 : el.classList.contains("in-season") ? 1 : inSeason(p) ? 2 : 3;
  };
  [...shown].sort((a, b) => rank(a) - rank(b)).forEach(p => {
    const name = p.marker.getElement().querySelector(".place-name");
    const blockers = rank(p) >= 2 ? [...taken, ...paper] : taken;
    let placed = null;
    for (const spot of NAME_SPOTS) {
      name.classList.remove(...NAME_SPOTS.filter(Boolean));
      if (spot) name.classList.add(spot);
      const box = rect(name);
      if (!blockers.some(t => hit(box, t))) { placed = box; break; }
    }
    if (!placed) name.classList.remove(...NAME_SPOTS.filter(Boolean));   // không chỗ nào trống: ẩn, về chỗ mặc định
    name.classList.toggle("name-hidden", !placed);
    if (placed) taken.push(placed);
  });
}

function declutter() {
  const shown = PLACES.filter(p => map.hasLayer(p.marker) && p.marker.getElement());
  spreadMarkers(shown);
  // Đang chạy hiệu ứng mở đầu (marker còn thu nhỏ) thì đo kích thước sẽ sai → để finishIntro() (intro.js) gọi lại
  if (!map.getContainer().classList.contains("intro-anim")) placeNames(shown);
}
map.on("zoomend viewreset", declutter);
document.fonts?.ready.then(() => declutter());    // font tải xong thì chữ rộng ra → đặt lại tên
