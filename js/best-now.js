// "Đẹp nhất lúc này": chấm điểm 0–100 mỗi nơi theo mùa đẹp + dự báo 3 ngày, hiện Top 3 ở thanh bên.
// Cần: places.js, weather.js, focusPlace()/render() (list.js). Tạo ra: scorePlace(), renderBestNow(), ensureVisible()

// ===== "Đẹp nhất lúc này": chấm điểm 0–100 theo mùa + dự báo 3 ngày =====
const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
function scorePlace(p) {
  const d = p.weather?.daily;
  if (!d) return null;
  const reasons = [];
  let s = 0;
  // Mùa (40 điểm): đang vào mùa đẹp tháng này; sắp vào mùa (tháng sau) được 15
  const next = CURRENT_MONTH % 12 + 1;
  if (p.months.has(CURRENT_MONTH)) { s += 40; reasons.push("đang mùa đẹp"); }
  else if (p.months.has(next)) { s += 15; reasons.push("sắp vào mùa"); }
  // Mưa (25 điểm): khả năng mưa trung bình 3 ngày; có dông thì trừ thêm
  const rain = avg(d.precipitation_probability_max.map(x => x ?? 0));
  s += 25 * (1 - rain / 100);
  const storms = d.weather_code.filter(c => c >= 95).length;
  s -= storms * 8;
  if (storms) reasons.push("có dông");
  else if (rain < 20) reasons.push("3 ngày tới khô ráo");
  else if (rain >= 60) reasons.push("dễ có mưa");
  // Nhiệt độ (20 điểm): biển cần ấm hơn mới tắm được
  const tmax = avg(d.temperature_2m_max), tmin = avg(d.temperature_2m_min);
  const [lo, hi] = p.cat === "beach" ? [26, 33] : [18, 30];
  const off = tmax < lo ? lo - tmax : tmax > hi ? tmax - hi : 0;
  s += Math.max(0, 20 - off * 3);
  const feel = off === 0 ? (p.cat === "beach" ? "hợp tắm biển" : "dễ chịu")
             : tmax < lo ? (tmax < 15 ? "lạnh" : "hơi lạnh") : "nóng";
  reasons.push(`${Math.round(tmin)}–${Math.round(tmax)}°, ${feel}`);
  // Bầu trời (15 điểm): nắng > mây > sương > mưa
  const sky = avg(d.weather_code.map(c => c <= 1 ? 15 : c <= 3 ? 9 : c <= 48 ? 4 : 0));
  s += sky;
  if (sky >= 12) reasons.push("trời nắng đẹp");
  const score = Math.max(0, Math.min(100, Math.round(s)));
  const verdict = score >= 80 ? "Rất nên đi" : score >= 60 ? "Nên đi" : score >= 40 ? "Tạm được" : "Chưa phải lúc";
  return { score, verdict, reasons };
}
// Nơi đang bị bộ lọc (loại / tìm kiếm) ẩn đi → bỏ lọc để marker hiện lại trên bản đồ
function ensureVisible(p) {
  if (map.hasLayer(p.marker)) return;
  clearFilters();
  render({ refit: false });
}
const ROMAN = ["I", "II", "III"];
function renderBestNow() {
  const box = document.querySelector("#best-now .best-body");
  if (!box) return;
  const ranked = PLACES.map(p => ({ p, r: (p.rating = scorePlace(p)) })).filter(x => x.r)
                       .sort((a, b) => b.r.score - a.r.score);
  if (!ranked.length) {
    box.innerHTML = weatherState === "error"
      ? `<p class="best-wait">Chưa tải được thời tiết, chưa xếp hạng được.</p><button type="button" class="wx-retry">${deco("↻")} Thử lại</button>`
      : `<p class="best-wait">${deco("⏳")} Đang tính…</p>`;
    return;
  }
  ranked.forEach(({ p }, i) => { p.rank = i + 1; });
  box.innerHTML = `<ol class="best-list">${ranked.slice(0, 3).map(({ p, r }, i) => `
    <li><button type="button" data-i="${PLACES.indexOf(p)}" style="${catVars(p.cat)}">
      <span class="best-rank" aria-hidden="true">${ROMAN[i]}</span>${srOnly(`Hạng ${i + 1}:`)}
      <span class="best-info"><b>${deco(placeIcon(p))} ${p.name}</b><small>${r.reasons.slice(0, 3).join(" · ")}</small></span>
      <span class="best-score"><b>${r.score}${srOnly(" điểm,")}</b><small>${r.verdict}</small></span>
    </button></li>`).join("")}</ol>
    <p class="best-note">Chấm theo mùa đẹp tháng ${CURRENT_MONTH} và dự báo 3 ngày tới · bấm để xem</p>`;
  box.querySelectorAll("button").forEach(btn => btn.onclick = () => {
    const p = PLACES[+btn.dataset.i];
    ensureVisible(p);
    focusPlace(p, p.li, true);
  });
}
