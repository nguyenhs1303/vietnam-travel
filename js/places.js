// Tiện ích chung cho địa danh: đọc tháng mùa đẹp, tháng đang chọn, icon/màu theo loại, ảnh thu nhỏ, ghi nguồn ảnh.
// Cần: PLACES, CATEGORIES (data/data.js), PHOTO_CREDITS (data/photo-credits.js).
// Tạo ra: CURRENT_MONTH, activeMonth, inSeason(), calendarHtml(), placeIcon(), catVars(), catBadge(), thumbHtml(), creditHtml(),
//         deco(), srOnly(), announce()

// Đọc một câu ngắn cho trình đọc màn hình qua vùng #sr-status (role="status"); delay để gộp khi gõ phím liên tục
let announceTimer = null;
function announce(msg, delay = 0) {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => {
    const el = document.getElementById("sr-status");
    el.textContent = "";                            // xoá trước để câu giống lần trước vẫn được đọc lại
    setTimeout(() => { el.textContent = msg; }, 60);
  }, delay);
}

// ===== Mùa đẹp theo tháng =====
// Đọc tháng từ chuỗi best, vd "Tháng 3–5, 9–11 (ghi chú)" hoặc "Tháng 11–3" (vắt qua năm mới)
function parseMonths(best) {
  const months = new Set();
  const text = best.replace(/\(.*?\)/g, "");          // bỏ phần ghi chú trong ngoặc
  for (const m of text.matchAll(/(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?/g)) {
    const from = +m[1], to = m[2] ? +m[2] : from;
    if (from < 1 || from > 12 || to < 1 || to > 12) continue;
    for (let i = from; ; i = (i % 12) + 1) { months.add(i); if (i === to) break; }
  }
  return months;
}
PLACES.forEach(p => { p.months = parseMonths(p.best); });

const CURRENT_MONTH = new Date().getMonth() + 1;
let activeMonth = CURRENT_MONTH;                       // 0 = cả năm (không lọc theo mùa)
const inSeason = p => activeMonth === 0 || p.months.has(activeMonth);

// Lịch 12 tháng nhỏ trong popup
const calendarHtml = p => `<div class="cal">${
  Array.from({ length: 12 }, (_, i) =>
    `<span class="${p.months.has(i + 1) ? "on" : ""}${i + 1 === CURRENT_MONTH ? " now" : ""}">${i + 1}</span>`).join("")
}</div>`;   // (lịch chỉ để nhìn: aria-hidden ở popup.js, chữ "Thời điểm đẹp: Tháng …" ngay trên đã nói đủ)

// Emoji trang trí: trình đọc màn hình bỏ qua (nếu không sẽ đọc to "hoa anh đào", "núi"… trước mỗi tên)
const deco = s => `<span aria-hidden="true">${s}</span>`;
// Chữ chỉ dành cho trình đọc màn hình (ẩn khỏi mắt), vd. diễn giải emoji thời tiết
const srOnly = s => `<span class="sr-only">${s}</span>`;

// Icon riêng của nơi (nếu có), màu theo loại
const placeIcon = p => p.icon || CATEGORIES[p.cat].icon;
const catVars = cat => `--c:${CATEGORIES[cat].color};--bg:${CATEGORIES[cat].bg}`;
const catBadge = cat => `<span class="cat" style="${catVars(cat)}">${deco(CATEGORIES[cat].icon)} ${CATEGORIES[cat].label}</span>`;

// Ảnh thu nhỏ: có ảnh thì hiện ảnh + huy hiệu icon ở góc, không có thì chỉ hiện icon
const thumbHtml = (p, cls) => p.photo
  ? `<span class="${cls} has-photo"><img src="${p.photo}" alt="" loading="lazy"><span class="badge" aria-hidden="true">${placeIcon(p)}</span></span>`
  : `<span class="${cls}" aria-hidden="true">${placeIcon(p)}</span>`;
// Dòng ghi nguồn ảnh (giấy phép CC yêu cầu ghi tác giả)
const creditHtml = p => {
  const c = typeof PHOTO_CREDITS !== "undefined" && PHOTO_CREDITS[p.photo];
  return c ? `<a class="credit" href="${c.source}" target="_blank" rel="noopener">Ảnh: ${c.author} · ${c.license}</a>` : "";
};
