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
      <div class="best">${deco("🗓️")} Thời điểm đẹp: ${p.best}</div><div aria-hidden="true">${calendarHtml(p)}</div>` },
  { id: "story", icon: "📜", label: "Chuyện kể",  html: p => storyHtml(p), when: p => p.story },
  { id: "food",  icon: "🍜", label: "Món ăn",     html: p => foodsHtml(p), when: p => p.foods?.length },
];
// Popup không được nằm dưới các khung trên bản đồ (khung tiêu đề, công tắc ngày/đêm, thanh tháng / dòng thời gian…):
// tính lề trên / dưới cho Leaflet tự dịch bản đồ (autoPan), chỉ tính những khung nằm cùng cột với popup.
const POPUP_HALF_W = 175;                         // nửa bề ngang popup (maxWidth 280 + lề) + chút dư
function popupPadding(p) {
  const box = map.getContainer().getBoundingClientRect();
  const x = map.latLngToContainerPoint([p.lat, p.lng]).x + (p.popup.options.offset?.[0] || 0);
  const pad = { top: 10, bottom: 10 };
  map.getContainer().querySelectorAll(".leaflet-control").forEach(c => {
    const r = c.getBoundingClientRect();
    if (!r.height || r.right - box.left < x - POPUP_HALF_W || r.left - box.left > x + POPUP_HALF_W) return;
    if (c.closest(".leaflet-top")) pad.top = Math.max(pad.top, r.bottom - box.top + 10);
    else pad.bottom = Math.max(pad.bottom, box.bottom - r.top + 10);
  });
  return pad;
}
// Chiều cao phần nội dung tab: vừa phần bản đồ còn trống giữa các khung (màn hình thấp thì thấp lại, 110–230px)
function panelHeight(p) {
  const mapH = map.getContainer().clientHeight;
  const hero = matchMedia("(max-width:760px)").matches ? 110 : 150;
  const pad = p?.pad || { top: 10, bottom: 140 };
  return Math.max(110, Math.min(230, mapH - pad.top - pad.bottom - hero - 135));   // 230: đủ hàng dự báo 3 ngày ở cỡ chữ 13px   // 135 ≈ tiêu đề + hàng tab + lề + mũi nhọn
}
function popupHtml(p, idx, h = panelHeight(p)) {
  const tabs = POPUP_TABS.filter(t => !t.when || t.when(p));
  // Tab mặc định: Thời tiết; tải thời tiết bị lỗi (không có số liệu) thì mở Giới thiệu, tránh một ô gần như trống
  const wxOk = p.weather || weatherState === "loading";
  const active = tabs.some(t => t.id === p.activeTab) ? p.activeTab : (wxOk ? "wx" : "info");
  p.activeTab = active;                           // giữ nguyên tab khi popup được dựng lại (vd. thời tiết vừa tải xong)
  return `<div class="popup" data-i="${idx}">
    ${p.photo ? `<figure class="hero"><img src="${p.photo}" alt="${p.name}">${creditHtml(p)}</figure>` : ""}
    <div class="popup-head">
      <h2 class="place-title" tabindex="-1">${deco(placeIcon(p))} ${p.name}</h2>
      <div class="region">${deco("📍")} ${p.region} ${catBadge(p.cat)}</div>
    </div>
    <div class="ptabs" role="tablist" aria-label="Thông tin ${p.name}">${tabs.map(t => `
      <button type="button" role="tab" class="ptab" data-tab="${t.id}" id="t-${idx}-${t.id}"
        aria-controls="pn-${idx}-${t.id}" aria-selected="${t.id === active}" tabindex="${t.id === active ? 0 : -1}">
        <span aria-hidden="true">${t.icon}</span>${t.label}</button>`).join("")}
    </div>
    ${tabs.map(t => `<div class="ppanel" style="height:${h}px" role="tabpanel" tabindex="0" id="pn-${idx}-${t.id}" aria-labelledby="t-${idx}-${t.id}"
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
    pop.querySelector("#" + t.getAttribute("aria-controls")).hidden = !on;
  });
  btn.focus();
}
// (bắt ở pha capture vì Leaflet chặn click lan ra ngoài popup; gắn vào document để dùng chung cho bảng trượt)
document.addEventListener("click", e => {
  const btn = e.target.closest(".ptab");
  if (btn) selectPopupTab(btn);
}, true);
document.addEventListener("keydown", e => {
  const btn = e.target.closest(".ptab");
  if (!btn || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
  e.preventDefault();
  const all = [...btn.parentElement.querySelectorAll(".ptab")];
  const next = all[(all.indexOf(btn) + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
  selectPopupTab(next);
}, true);
// Đóng popup thì lần sau mở lại về tab mặc định
map.on("popupclose", () => PLACES.forEach(p => { p.activeTab = null; }));

// ===== Mở thông tin địa danh: máy tính = popup Leaflet · màn hình nhỏ = bảng trượt từ dưới lên (bottom sheet) =====
// Popup trên điện thoại che kín phần bản đồ vốn đã nhỏ; bảng trượt nằm đè lên thanh bên, bản đồ phía trên vẫn thấy marker.
// Tạo ra: openPlace(), closePlace(), isPlaceOpen(), refreshPlace()
const isSmallScreen = () => matchMedia("(max-width:760px)").matches;
const sheet = document.createElement("section");
sheet.id = "sheet";
sheet.hidden = true;
sheet.tabIndex = -1;
sheet.setAttribute("role", "dialog");
sheet.innerHTML = `<div class="sheet-grip" title="Kéo xuống để đóng"></div>
  <button type="button" class="sheet-close" aria-label="Đóng">✕</button><div class="sheet-body"></div>`;
document.body.appendChild(sheet);
let sheetPlace = null, sheetHideTimer = null;

// Ô nội dung tab: vừa màn hình (tổng bảng trượt khoảng 65% chiều cao), các tab cao bằng nhau để bảng không nhảy
const sheetPanelHeight = () => Math.max(120, Math.min(230, Math.round(innerHeight * 0.64) - 270));
function renderSheet() {
  if (sheetPlace) sheet.querySelector(".sheet-body").innerHTML = popupHtml(sheetPlace, PLACES.indexOf(sheetPlace), sheetPanelHeight());
}
function openSheet(p) {
  clearTimeout(sheetHideTimer);
  sheetPlace = p;
  renderSheet();
  sheet.setAttribute("aria-label", p.name);
  sheet.hidden = false;
  sheet.getBoundingClientRect();                  // để hiệu ứng trượt lên chạy từ vị trí ẩn
  sheet.classList.add("open");
  map.getContainer().classList.add("popup-open");
  focusPlaceTitle(sheet);
  // Dời bản đồ cho marker nằm giữa phần bản đồ còn thấy được phía trên bảng trượt
  const mapRect = map.getContainer().getBoundingClientRect();
  const visibleH = Math.min(mapRect.height, innerHeight - sheet.offsetHeight - mapRect.top);
  const pt = map.latLngToContainerPoint([p.lat, p.lng]).add([p.popup.options.offset[0], p.popup.options.offset[1] - 7]);
  map.panBy([pt.x - mapRect.width / 2, pt.y - Math.max(60, visibleH / 2)]);
}
function closeSheet() {
  if (!sheetPlace) return;
  const p = sheetPlace;
  sheetPlace = null;
  p.activeTab = null;                             // lần sau mở lại về tab mặc định
  sheet.classList.remove("open");
  sheetHideTimer = setTimeout(() => { sheet.hidden = true; }, 260);
  map.getContainer().classList.remove("popup-open");
  if (sheet.contains(document.activeElement)) {
    if (placeOpener?.isConnected) returnFocus(); else p.li?.querySelector(".row")?.focus({ preventScroll: true });
  }
}
// Bàn phím / trình đọc màn hình: mở thì đưa focus vào tiêu đề địa danh (nếu không người dùng không biết popup đã mở —
// popup nằm cuối trang, sau 16 marker); đóng thì trả focus về đúng nút đã bấm (dòng danh sách, marker, Top 3…).
let placeOpener = null, openingPlace = false;
const focusPlaceTitle = root => root?.querySelector(".place-title")?.focus({ preventScroll: true });
function returnFocus() {
  const el = placeOpener;
  placeOpener = null;
  if (el?.isConnected) el.focus({ preventScroll: true });
}
function openPlace(p) {
  // Ghi lại ai mở: nút đang focus; focus đang ở <body> → không có ai (đừng giữ giá trị cũ từ lần trước).
  // Focus đang nằm trong chính popup / bảng trượt (mở nơi khác từ bên trong) → giữ người mở ban đầu.
  const a = document.activeElement;
  if (!a?.closest(".leaflet-popup, #sheet")) placeOpener = a && a !== document.body ? a : null;
  if (isSmallScreen()) { map.closePopup(); openSheet(p); }
  else {
    closeSheet();
    p.pad = popupPadding(p);
    p.popup.options.autoPanPaddingTopLeft = [10, p.pad.top];
    p.popup.options.autoPanPaddingBottomRight = [10, p.pad.bottom];
    openingPlace = true;                          // popup cũ đóng ngay trong openOn → không trả focus lúc đó
    p.popup.setLatLng([p.lat, p.lng]).openOn(map);
    openingPlace = false;
    focusPlaceTitle(p.popup.getElement());
  }
}
function closePlace() { map.closePopup(); closeSheet(); }
map.on("popupopen", e => {
  // Nút đóng của Leaflet mặc định ghi tiếng Anh "Close popup"; vùng bấm 24px → to hơn trong CSS
  const x = e.popup.getElement().querySelector(".leaflet-popup-close-button");
  if (x) { x.setAttribute("aria-label", "Đóng"); x.title = "Đóng"; }
});
// Popup đóng (nút ✕, Esc, bấm ra bản đồ…): focus đang nằm trong popup (Leaflet còn giữ popup ~0,2 giây để mờ dần rồi mới gỡ)
// hoặc đã rơi về <body> → trả về nút đã mở. Focus đã ở chỗ khác (người dùng bấm vào bản đồ, marker khác…) thì để yên.
map.on("popupclose", () => {
  if (openingPlace) return;
  const a = document.activeElement;
  if (!a || a === document.body || a.closest(".leaflet-popup")) returnFocus();
});
// Esc đóng popup ở bất cứ đâu (Leaflet chỉ bắt Esc khi chính bản đồ đang được focus)
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && PLACES.some(p => p.popup.isOpen())) map.closePopup();
});
const isPlaceOpen = p => sheetPlace === p || p.popup.isOpen();
// Dựng lại nội dung đang mở (vd. thời tiết vừa tải xong)
function refreshPlace(p) {
  const root = p.popup.isOpen() ? p.popup.getElement() : sheetPlace === p ? sheet : null;
  if (!root) return;
  const hadFocus = root.contains(document.activeElement);
  const scroll = root.querySelector(".ppanel:not([hidden])")?.scrollTop || 0;
  if (p.popup.isOpen()) p.popup.update(); else renderSheet();
  const newRoot = p.popup.isOpen() ? p.popup.getElement() : sheet;
  const panel = newRoot.querySelector(".ppanel:not([hidden])");
  if (panel) panel.scrollTop = scroll;                // giữ chỗ đang đọc
  if (hadFocus) focusPlaceTitle(newRoot);
}

sheet.querySelector(".sheet-close").onclick = closeSheet;
document.addEventListener("keydown", e => { if (e.key === "Escape" && sheetPlace) closeSheet(); });
map.on("click", closeSheet);                      // chạm vào bản đồ (ngoài marker) thì đóng, giống popup
matchMedia("(max-width:760px)").addEventListener("change", closePlace);   // xoay máy / đổi cỡ cửa sổ qua ngưỡng
// Kéo thanh nắm xuống để đóng
const grip = sheet.querySelector(".sheet-grip");
let dragStart = null;
grip.addEventListener("pointerdown", e => {
  dragStart = e.clientY;
  sheet.style.transition = "none";
  grip.setPointerCapture(e.pointerId);
});
grip.addEventListener("pointermove", e => {
  if (dragStart !== null) sheet.style.transform = `translateY(${Math.max(0, e.clientY - dragStart)}px)`;
});
const endDrag = e => {
  if (dragStart === null) return;
  const moved = e.clientY - dragStart;
  dragStart = null;
  sheet.style.transition = sheet.style.transform = "";
  if (moved > 70) closeSheet();
};
grip.addEventListener("pointerup", endDrag);
grip.addEventListener("pointercancel", endDrag);
