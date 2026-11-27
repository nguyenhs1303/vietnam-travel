// Thanh bên: ô tìm kiếm, nút lọc theo loại, danh sách địa danh; bay tới địa danh khi chọn.
// Tạo ra: render(), focusPlace(), activeCat, searchEl

const listEl = document.getElementById("list");
const filtersEl = document.getElementById("filters");
const searchEl = document.getElementById("search");
let activeCat = "all";

// Bộ lọc
function setActiveCat(key) {
  activeCat = key;
  document.querySelectorAll(".chip").forEach(c => {
    const on = c.dataset.cat === key;
    c.classList.toggle("active", on);
    c.setAttribute("aria-pressed", on);
  });
}
function addChip(key, label) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  b.dataset.cat = key;
  if (key !== "all") b.style.cssText = catVars(key);   // chip mang màu của loại
  b.innerHTML = label;
  b.onclick = () => { setActiveCat(key); render(); announceResults(); };
  filtersEl.appendChild(b);
}
filtersEl.setAttribute("role", "group");
filtersEl.setAttribute("aria-label", "Lọc theo loại");
addChip("all", "Tất cả");
Object.entries(CATEGORIES).forEach(([k, v]) => addChip(k, `${deco(v.icon)} ${v.label}`));
setActiveCat(activeCat);

// Bỏ hết tìm kiếm + lọc loại (dùng cho nút "Xoá bộ lọc" và khi cần hiện lại một nơi đang bị ẩn)
function clearFilters() {
  searchEl.value = "";
  setActiveCat("all");
}

// Khung "Không tìm thấy" (chỉ để nhìn; trình đọc màn hình nghe câu tương ứng qua announceResults → announce)
const emptyEl = document.createElement("div");
emptyEl.id = "list-empty";
emptyEl.hidden = true;
listEl.before(emptyEl);
const emptyMessage = () => {
  const raw = searchEl.value.trim();
  return "Không tìm thấy nơi nào" + (raw ? ` khớp “${raw}”` : "") +
         (activeCat !== "all" ? ` trong mục ${CATEGORIES[activeCat].label}` : "") + ".";
};

// Bỏ dấu để gõ không dấu vẫn tìm được. Chuyển chữ thường TRƯỚC rồi mới đổi đ → d (trước đây "Đ" hoa không được đổi
// → gõ "da lat", "dong van" không ra Đà Lạt, Đồng Văn)
const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

function renderEmpty(show) {
  emptyEl.hidden = !show;
  if (!show) { emptyEl.replaceChildren(); delete emptyEl.dataset.msg; return; }
  if (emptyEl.dataset.msg === emptyMessage()) return;   // nội dung không đổi → giữ nguyên (nút "Xoá" đang focus không bị thay)
  emptyEl.dataset.msg = emptyMessage();
  emptyEl.replaceChildren();
  const raw = searchEl.value.trim();
  const msg = document.createElement("p");
  msg.append("Không tìm thấy nơi nào");
  if (raw) { msg.append(" khớp “"); const b = document.createElement("b"); b.textContent = raw; msg.append(b, "”"); }
  if (activeCat !== "all") msg.append(` trong mục ${CATEGORIES[activeCat].label}`);
  msg.append(".");
  const hint = document.createElement("small");
  hint.textContent = "Thử gõ tên tỉnh, tên địa danh hoặc món ăn, vd: Huế, phở, cao lầu.";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "empty-reset";
  btn.textContent = "Xoá tìm kiếm & bộ lọc";
  btn.onclick = () => { clearFilters(); render(); searchEl.focus(); announceResults(); };
  emptyEl.append(msg, hint, btn);
}

// Đọc số kết quả sau khi tìm / lọc; không có kết quả thì đọc câu "Không tìm thấy…" (thay cho câu số lượng đang chờ)
function announceResults(delay = 0) {
  const n = listEl.children.length;
  if (!n) return announce(emptyMessage() + " Có nút Xoá tìm kiếm và bộ lọc.", delay);
  const raw = searchEl.value.trim();
  announce(`Hiện ${n} trên ${PLACES.length} nơi` + (raw ? ` khớp “${raw}”` : "") +
           (activeCat !== "all" ? ` trong mục ${CATEGORIES[activeCat].label}` : ""), delay);
}

function render({ refit = true } = {}) {
  const q = norm(searchEl.value.trim());
  const shown = PLACES.filter(p =>
    (activeCat === "all" || p.cat === activeCat) &&
    (!q || norm(p.name + " " + p.region + " " + (p.foods || []).map(f => f[0]).join(" ")).includes(q)));   // tìm cả theo tên món ăn
  // Nơi đang mùa đẹp lên đầu danh sách (sort ổn định, giữ thứ tự Bắc → Nam)
  shown.sort((a, b) => inSeason(b) - inSeason(a));

  // Nơi đang mở thông tin mà bị bộ lọc ẩn đi → đóng luôn (không thì popup nằm lơ lửng chỗ marker đã biến mất)
  if (PLACES.some(p => isPlaceOpen(p) && !shown.includes(p))) closePlace();

  listEl.innerHTML = "";
  renderEmpty(!shown.length);
  PLACES.forEach(p => { map.removeLayer(p.marker); p.li = null; });

  shown.forEach(p => {
    const hot = activeMonth !== 0 && inSeason(p);
    p.marker.addTo(map);
    p.marker.setZIndexOffset(hot ? 1000 : 0);
    const el = p.marker.getElement();
    el.classList.toggle("in-season", hot);
    el.classList.toggle("off-season", !inSeason(p));
    el.classList.toggle("history-hot", map.getContainer().classList.contains("history-mode") && EVENTS[historyIdx]?.p === p);
    // Tên marker cho trình đọc màn hình: kèm trạng thái mùa (trên bản đồ chỉ thể hiện bằng vòng sáng)
    el.setAttribute("aria-label", p.name + (hot ? ", đang mùa đẹp" : !inSeason(p) ? ", ngoài mùa đẹp" : ""));

    // Mỗi dòng là một <button> bên trong <li> → Tab tới được, Enter / Space để mở, vẫn giữ ngữ nghĩa danh sách
    const li = document.createElement("li");
    li.classList.toggle("off", !inSeason(p));
    li.style.cssText = catVars(p.cat);
    li.innerHTML = `<button type="button" class="row">${thumbHtml(p, "ico")}<span class="info"><b>${p.name}</b>` +
      `<small>${p.region} ${catBadge(p.cat)}</small>${hot ? `<span class="tag">${deco("✨")} Đang mùa đẹp</span>` : ""}</span>` +
      `<span class="wx-mini" title="Thời tiết hiện tại">${weatherMini(p)}</span></button>`;
    li.querySelector(".row").onclick = () => focusPlace(p, li);
    p.li = li;
    listEl.appendChild(li);
  });

  declutter();                                   // xếp lại marker chồng nhau + tên địa danh (declutter.js)

  if (refit && shown.length) {
    // Vừa khít các điểm đang hiện, nhưng không thu nhỏ dưới 5 (dưới 5 là nền OSM, không còn bản đồ giấy)
    const b = L.latLngBounds(shown.map(p => [p.lat, p.lng])).pad(0.2);
    map.setView(b.getCenter(), Math.max(5, Math.min(8, map.getBoundsZoom(b))));
  }
}

// Bay tới nơi A rồi chọn ngay nơi B khi chưa bay xong: huỷ lời hẹn "bay xong thì mở A", chỉ mở B
let pendingOpen = null;
function cancelPendingOpen() { if (pendingOpen) map.off("moveend", pendingOpen); pendingOpen = null; }
function focusPlace(p, li, fly = true) {
  cancelPendingOpen();
  document.querySelectorAll("#list li").forEach(x => x.classList.remove("active"));
  li?.classList.add("active");
  li?.scrollIntoView({ block:"nearest" });
  if (!fly) return openPlace(p);
  // Giữ mức zoom đang xem, chỉ phóng tới tối thiểu 7: vẫn là bản đồ giấy (≥ 9 mới chuyển sang nền OSM), vẫn thấy cả vùng
  // xung quanh. Ai muốn xem đường phố thì tự phóng to tiếp.
  const ll = L.latLng(p.lat, p.lng), zoom = Math.max(map.getZoom(), 7);
  // Đang thấy rõ điểm đó rồi thì mở popup ngay, không bay
  if (map.getZoom() >= 7 && map.getBounds().pad(-0.15).contains(ll)) return openPlace(p);
  // Mở popup sau khi bay xong, để bản đồ tự dịch cho popup nằm gọn trong khung
  closePlace();
  map.flyTo(ll, zoom, { duration: 1.2 });
  // Đăng ký SAU flyTo: flyTo dừng chuyển động đang dở (hiệu ứng zoom lúc mở trang, quán tính khi vừa kéo bản đồ) và việc
  // dừng đó phát "moveend" ngay — đăng ký trước thì popup mở luôn lúc vừa cất cánh, rồi bản đồ mới bay đi.
  pendingOpen = () => { pendingOpen = null; openPlace(p); };
  map.once("moveend", pendingOpen);
}
