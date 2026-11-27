// Thanh chọn tháng "Tháng này đi đâu?" ở đáy bản đồ.
// Cần: places.js, render() (list.js). Tạo ra: updateSeasonBar(), setMonth()

// Thanh chọn tháng (góc dưới bản đồ)
const seasonBar = L.control({ position: "bottomleft" });
seasonBar.onAdd = () => {
  const el = L.DomUtil.create("div", "season-bar");
  L.DomEvent.disableClickPropagation(el);
  L.DomEvent.disableScrollPropagation(el);
  el.innerHTML = `<div class="bar-head"><div class="season-title"></div><button type="button" class="mode-btn" data-mode="history" title="Xem các mốc lịch sử trên bản đồ">${deco("⏳")} Lịch sử</button></div><div class="season-months" role="group" aria-label="Chọn tháng"></div>`;
  const row = el.querySelector(".season-months");

  const counts = Array.from({ length: 13 }, (_, m) => PLACES.filter(p => m === 0 || p.months.has(m)).length);
  const max = Math.max(...counts.slice(1));
  [0, ...Array.from({ length: 12 }, (_, i) => i + 1)].forEach(m => {
    const b = document.createElement("button");
    b.className = "month" + (m === 0 ? " all" : "") + (m === CURRENT_MONTH ? " now" : "");
    b.dataset.m = m;
    b.title = m === 0 ? "Hiện tất cả, không lọc theo mùa" : `Tháng ${m}: ${counts[m]} nơi đang mùa đẹp`;
    // Nhãn đọc to: "T11" sẽ bị đọc thành "tê mười một" → đọc đủ "Tháng 11 (tháng này), 6 nơi đang mùa đẹp"
    b.setAttribute("aria-label", m === 0 ? "Cả năm, không lọc theo mùa"
      : `Tháng ${m}${m === CURRENT_MONTH ? " (tháng này)" : ""}, ${counts[m]} nơi đang mùa đẹp`);
    b.innerHTML = m === 0
      ? "Cả năm"
      : `<span class="bar" style="--h:${counts[m] / max}" aria-hidden="true"></span><span>T${m}</span>`;
    b.onclick = () => setMonth(m);
    row.appendChild(b);
  });
  // Phím ← → để đổi tháng
  el.addEventListener("keydown", e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = (activeMonth + (e.key === "ArrowRight" ? 1 : 12)) % 13;
    setMonth(next);
    row.querySelector(`[data-m="${next}"]`).focus();
  });
  return el;
};
seasonBar.addTo(map);
// Đánh dấu lúc popup đang mở — màn hình nhỏ sẽ tạm ẩn thanh tháng cho popup đủ chỗ
map.on("popupopen", () => map.getContainer().classList.add("popup-open"));
map.on("popupclose", () => map.getContainer().classList.remove("popup-open"));

function updateSeasonBar() {
  document.querySelectorAll(".season-bar .month").forEach(b => {
    const on = +b.dataset.m === activeMonth;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", on);
    if (on) {  // màn hình hẹp: cuộn hàng tháng để tháng đang chọn nằm giữa
      const row = b.parentElement;
      row.scrollLeft = b.offsetLeft - row.offsetLeft - (row.clientWidth - b.offsetWidth) / 2;
    }
  });
  const n = PLACES.filter(p => activeMonth && p.months.has(activeMonth)).length;
  document.querySelector(".season-title").innerHTML = activeMonth === 0
    ? `${deco("🗓️")} Cả năm · chọn một tháng để xem nên đi đâu`
    : `${deco("🗓️")} Tháng ${activeMonth}${activeMonth === CURRENT_MONTH ? `<span class="hide-sm"> (tháng này)</span>` : ""} đi đâu? · ` +
      `<b>${n} nơi</b><span class="hide-sm"> đang vào mùa đẹp</span><span class="show-sm"> đang đẹp</span>`;
}

function setMonth(m) {
  activeMonth = m;
  updateSeasonBar();
  render({ refit: false });
  const n = PLACES.filter(p => m && p.months.has(m)).length;
  announce(m === 0 ? "Cả năm: hiện tất cả địa danh, không lọc theo mùa." : `Tháng ${m}: ${n} nơi đang vào mùa đẹp, đã đưa lên đầu danh sách.`);
}
