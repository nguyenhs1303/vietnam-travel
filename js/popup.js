// Bảng thông tin (popup) dạng tab: Thời tiết · Giới thiệu · Chuyện kể · Món ăn.
// Cần: places.js, weather.js. Tạo ra: popupHtml()

// Chuyện kể + món ăn đặc sản
const storyHtml = p => p.story ? `<div class="story"><p>${p.story}</p></div>` : "";
const foodsHtml = p => p.foods?.length
  ? `<ul class="foods">${p.foods.map(([dish, note]) => `<li><b>${dish}</b><span>${note}</span></li>`).join("")}</ul>` : "";

// ===== Popup dạng tab: mặc định chỉ thấy ảnh + thời tiết; các nội dung khác ở tab cùng hàng =====
const POPUP_TABS = [
  { id: "wx",    icon: "🌤️", label: "Thời tiết",  html: p => weatherHtml(p) },
  { id: "info",  icon: "📖", label: "Giới thiệu", html: p => `<p class="desc">${p.desc}</p>
      <div class="best">🗓️ Thời điểm đẹp: ${p.best}</div>${calendarHtml(p)}` },
  { id: "story", icon: "📜", label: "Chuyện kể",  html: p => storyHtml(p), when: p => p.story },
  { id: "food",  icon: "🍜", label: "Món ăn",     html: p => foodsHtml(p), when: p => p.foods?.length },
];
// Chiều cao phần nội dung tab: vừa khung bản đồ hiện tại (màn hình thấp thì thấp lại, tối đa 200px)
function panelHeight() {
  const mapH = map.getContainer().clientHeight;
  const hero = matchMedia("(max-width:760px)").matches ? 110 : 150;
  return Math.max(110, Math.min(200, mapH - hero - 185));   // 185 ≈ tiêu đề + hàng tab + lề + mũi nhọn popup
}
function popupHtml(p, idx) {
  const tabs = POPUP_TABS.filter(t => !t.when || t.when(p));
  const h = panelHeight();
  const active = tabs.some(t => t.id === p.activeTab) ? p.activeTab : "wx";
  return `<div class="popup" data-i="${idx}">
    ${p.photo ? `<figure class="hero"><img src="${p.photo}" alt="${p.name}">${creditHtml(p)}</figure>` : ""}
    <div class="popup-head">
      <h3>${placeIcon(p)} ${p.name}</h3>
      <div class="region">📍 ${p.region} ${catBadge(p.cat)}</div>
    </div>
    <div class="ptabs" role="tablist" aria-label="Thông tin ${p.name}">${tabs.map(t => `
      <button type="button" role="tab" class="ptab" data-tab="${t.id}" id="t-${idx}-${t.id}"
        aria-controls="pn-${idx}-${t.id}" aria-selected="${t.id === active}" tabindex="${t.id === active ? 0 : -1}">
        <span aria-hidden="true">${t.icon}</span>${t.label}</button>`).join("")}
    </div>
    ${tabs.map(t => `<div class="ppanel" style="height:${h}px" role="tabpanel" id="pn-${idx}-${t.id}" aria-labelledby="t-${idx}-${t.id}"
        ${t.id === active ? "" : "hidden"}>${t.html(p)}</div>`).join("")}
  </div>`;
}
// Bấm tab (hoặc phím ← →): đổi tab ngay trong popup đang mở (các ô nội dung cao bằng nhau nên popup không nhảy).
// Không dựng lại popup ở đây — dựng lại giữa lúc click sẽ làm Leaflet tưởng là bấm ra ngoài và đóng popup.
function selectPopupTab(btn) {
  const pop = btn.closest(".popup"), p = PLACES[+pop.dataset.i];
  p.activeTab = btn.dataset.tab;                  // nhớ lại khi popup được dựng lại (vd. thời tiết vừa tải xong)
  pop.querySelectorAll(".ptab").forEach(t => {
    const on = t === btn;
    t.setAttribute("aria-selected", on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  });
  btn.focus();
}
// (bắt ở pha capture vì Leaflet chặn click lan ra ngoài popup)
map.getContainer().addEventListener("click", e => {
  const btn = e.target.closest(".ptab");
  if (btn) selectPopupTab(btn);
}, true);
map.getContainer().addEventListener("keydown", e => {
  const btn = e.target.closest(".ptab");
  if (!btn || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
  e.preventDefault();
  const all = [...btn.parentElement.querySelectorAll(".ptab")];
  const next = all[(all.indexOf(btn) + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
  selectPopupTab(next);
}, true);
// Đóng popup thì lần sau mở lại về tab Thời tiết
map.on("popupclose", () => PLACES.forEach(p => { p.activeTab = "wx"; }));
