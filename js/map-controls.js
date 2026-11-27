// Các khung trang trí trên bản đồ: khung tiêu đề (cartouche), la bàn, thước tỷ lệ.
// Cần: map

// Khung tiêu đề (cartouche), la bàn, thước tỷ lệ
const cartouche = L.control({ position: "topright" });
cartouche.onAdd = () => Object.assign(L.DomUtil.create("div", "cartouche"), {
  innerHTML: `<small>Bản đồ</small><h2>Danh thắng<br>Việt Nam</h2><div class="orn">❦</div><small>Atlas du lịch · MMXXVI</small>` });
cartouche.addTo(map);
const compass = L.control({ position: "bottomright" });
compass.onAdd = () => Object.assign(L.DomUtil.create("div", "compass"), { innerHTML: `
  <svg viewBox="-50 -50 100 100" width="88" height="88" aria-label="La bàn">
    <circle r="40" fill="none" stroke="currentColor" stroke-width=".8"/><circle r="36" fill="none" stroke="currentColor" stroke-width=".4"/>
    <g fill="currentColor" opacity=".35"><path d="M0 -30 L5 0 L0 30 L-5 0Z" transform="rotate(45)"/><path d="M0 -30 L5 0 L0 30 L-5 0Z" transform="rotate(-45)"/></g>
    <path d="M0 -38 L7 0 L0 0Z" fill="currentColor"/><path d="M0 -38 L-7 0 L0 0Z" class="cf" stroke="currentColor" stroke-width=".6"/>
    <path d="M0 38 L7 0 L0 0Z" class="cf" stroke="currentColor" stroke-width=".6"/><path d="M0 38 L-7 0 L0 0Z" fill="currentColor"/>
    <path d="M38 0 L0 7 L0 0Z" fill="currentColor"/><path d="M38 0 L0 -7 L0 0Z" class="cf" stroke="currentColor" stroke-width=".6"/>
    <path d="M-38 0 L0 -7 L0 0Z" fill="currentColor"/><path d="M-38 0 L0 7 L0 0Z" class="cf" stroke="currentColor" stroke-width=".6"/>
    <circle r="3" fill="currentColor"/>
    <text y="-42" text-anchor="middle" class="cmp">B</text><text y="49" text-anchor="middle" class="cmp">N</text>
    <text x="46" y="3" text-anchor="middle" class="cmp">Đ</text><text x="-46" y="3" text-anchor="middle" class="cmp">T</text>
  </svg>` });
compass.addTo(map);
// Thước tỷ lệ: ô vừa khít chữ; con số = chiều dài thực tế của chính ô đó (tính theo độ rộng thật của ô)
const scaleCtl = L.control({ position: "topleft" });
scaleCtl.onAdd = () => L.DomUtil.create("div", "scale-box");
scaleCtl.addTo(map);
function scaleText(px) {
  const y = map.getSize().y / 2;   // đo ở giữa khung nhìn
  const m = map.distance(map.containerPointToLatLng([0, y]), map.containerPointToLatLng([px, y]));
  if (m < 1000) return Math.round(m / 10) * 10 + " m";
  const km = m / 1000;
  return (km < 10 ? km.toFixed(1).replace(".", ",") : km < 100 ? Math.round(km) : Math.round(km / 10) * 10) + " km";
}
function updateScale() {
  const el = document.querySelector(".scale-box");
  // Đặt chữ → đo độ rộng ô → tính lại theo độ rộng đó (lặp vài lần cho khớp, vì chữ đổi thì ô đổi)
  for (let i = 0; i < 3; i++) {
    const text = "≈ " + scaleText(el.offsetWidth || 70);
    if (el.textContent === text) break;
    el.textContent = text;
  }
  el.title = `Chiều dài ô này ${el.textContent} ngoài thực tế`;
}
map.on("zoomend moveend", updateScale);
updateScale();
