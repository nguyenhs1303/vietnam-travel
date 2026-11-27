// Dòng thời gian lịch sử: thanh kéo qua các mốc trong HISTORY, bay tới & làm nổi bật địa danh; chuyển qua lại với thanh mùa.
// Cần: HISTORY (data/data.js), markers.js, ensureVisible() (best-now.js), focusPlace() (list.js).

// ===== Dòng thời gian lịch sử =====
// Thanh dưới bản đồ có 2 chế độ: "season" (chọn tháng) và "history" (kéo qua các mốc lịch sử)
const EVENTS = HISTORY.map(h => ({ ...h, p: PLACES.find(p => p.name === h.place) })).filter(h => h.p);
let historyIdx = 0, historyTimer = null;

// Biểu tượng nút (SVG nét đặc, theo màu chữ): mốc trước ⏮ · chạy ▶ · dừng ❚❚ · mốc sau ⏭ — trước đây "chạy" và "mốc sau" cùng là ▶
const TL_ICON = {
  prev:  `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3 2h2v12H3zM14 2v12L6 8z" fill="currentColor"/></svg>`,
  play:  `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>`,
  pause: `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" fill="currentColor"/></svg>`,
  next:  `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M11 2h2v12h-2zM2 2v12l8-6z" fill="currentColor"/></svg>`,
};
const timelineBar = L.control({ position: "bottomleft" });
timelineBar.onAdd = () => {
  const el = L.DomUtil.create("div", "timeline-bar");
  L.DomEvent.disableClickPropagation(el);
  L.DomEvent.disableScrollPropagation(el);
  el.innerHTML = `
    <div class="bar-head"><div class="tl-title">⏳ Dòng thời gian lịch sử · <b>${EVENTS.length}</b> mốc</div>
      <button type="button" class="mode-btn" data-mode="season" title="Quay lại chọn theo tháng">🗓️ Theo mùa</button></div>
    <div class="tl-card" aria-live="polite">
      <div class="tl-year"></div>
      <div class="tl-body"><b class="tl-head"></b>
        <button type="button" class="tl-place" title="Mở thông tin địa điểm"></button>
        <p class="tl-text"></p></div>
    </div>
    <div class="tl-controls">
      <button type="button" class="tl-btn tl-prev" aria-label="Mốc trước" title="Mốc trước">${TL_ICON.prev}</button>
      <button type="button" class="tl-btn tl-play" aria-label="Tự chạy" title="Tự chạy qua các mốc">${TL_ICON.play}</button>
      <div class="tl-track">
        <input type="range" class="tl-range" min="0" max="${EVENTS.length - 1}" step="1" value="0" aria-label="Chọn mốc lịch sử">
        <div class="tl-ends"><span>${EVENTS[0].when}</span><span>${EVENTS[EVENTS.length - 1].when}</span></div>
      </div>
      <button type="button" class="tl-btn tl-next" aria-label="Mốc sau" title="Mốc sau">${TL_ICON.next}</button>
    </div>`;
  el.querySelector(".tl-range").oninput = e => { stopHistoryPlay(); showEvent(+e.target.value); };
  el.querySelector(".tl-prev").onclick = () => { stopHistoryPlay(); showEvent(historyIdx - 1); };
  el.querySelector(".tl-next").onclick = () => { stopHistoryPlay(); showEvent(historyIdx + 1); };
  el.querySelector(".tl-play").onclick = () => historyTimer ? stopHistoryPlay() : startHistoryPlay();
  el.querySelector(".tl-place").onclick = () => { stopHistoryPlay(); const p = EVENTS[historyIdx].p; focusPlace(p, p.li, false); };
  return el;
};
timelineBar.addTo(map);

function showEvent(i, fly = true) {
  historyIdx = Math.max(0, Math.min(EVENTS.length - 1, i));
  const ev = EVENTS[historyIdx], bar = document.querySelector(".timeline-bar");
  bar.querySelector(".tl-year").textContent = ev.when;
  bar.querySelector(".tl-head").textContent = ev.title;
  bar.querySelector(".tl-place").textContent = `📍 ${ev.p.name}`;
  bar.querySelector(".tl-text").textContent = ev.text;
  bar.querySelector(".tl-range").value = historyIdx;
  bar.querySelector(".tl-prev").disabled = historyIdx === 0;
  bar.querySelector(".tl-next").disabled = historyIdx === EVENTS.length - 1;
  // Làm nổi bật marker của địa danh, các marker khác mờ đi
  ensureVisible(ev.p);
  PLACES.forEach(p => p.marker.getElement()?.classList.toggle("history-hot", p === ev.p));
  declutter();                                     // tên của nơi đang xem được ưu tiên hiện
  if (fly) {
    closePlace();
    const z = Math.max(6, Math.min(8, map.getZoom()));   // giữ ở mức bản đồ giấy
    // Dời tâm xuống nửa chiều cao thanh dòng thời gian → marker nằm giữa phần bản đồ còn thấy được phía trên thanh
    const barH = document.querySelector(".timeline-bar").offsetHeight + 20;
    const center = map.unproject(map.project([ev.p.lat, ev.p.lng], z).add([0, barH / 2]), z);
    map.flyTo(center, z, { duration: 1.1 });
  }
}
function startHistoryPlay() {
  if (historyIdx >= EVENTS.length - 1) showEvent(0);
  const b = document.querySelector(".tl-play");
  b.innerHTML = TL_ICON.pause;
  b.setAttribute("aria-label", "Dừng");
  b.title = "Dừng tự chạy";
  historyTimer = setInterval(() => {
    if (historyIdx >= EVENTS.length - 1) return stopHistoryPlay();
    showEvent(historyIdx + 1);
  }, 4500);
}
function stopHistoryPlay() {
  clearInterval(historyTimer); historyTimer = null;
  const b = document.querySelector(".tl-play");
  if (b) { b.innerHTML = TL_ICON.play; b.setAttribute("aria-label", "Tự chạy"); b.title = "Tự chạy qua các mốc"; }
}
function setBarMode(mode) {
  const history = mode === "history";
  map.getContainer().classList.toggle("history-mode", history);
  if (history) showEvent(historyIdx);
  else {
    stopHistoryPlay();
    PLACES.forEach(p => p.marker.getElement()?.classList.remove("history-hot"));
    declutter();
  }
  document.querySelector(history ? ".tl-range" : ".season-bar .month.active")?.focus({ preventScroll: true });
}
// Nút chuyển chế độ (có ở cả 2 thanh) — bắt ở pha capture vì thanh chặn click lan ra ngoài
map.getContainer().addEventListener("click", e => {
  const btn = e.target.closest(".mode-btn");
  if (btn) setBarMode(btn.dataset.mode);
}, true);
