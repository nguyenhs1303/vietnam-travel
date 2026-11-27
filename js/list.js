// Thanh bên: ô tìm kiếm, nút lọc theo loại, danh sách địa danh; bay tới địa danh khi chọn.
// Tạo ra: render(), focusPlace(), activeCat, searchEl

const listEl = document.getElementById("list");
const filtersEl = document.getElementById("filters");
const searchEl = document.getElementById("search");
let activeCat = "all";

// Bộ lọc
function addChip(key, label) {
  const b = document.createElement("button");
  b.className = "chip" + (key === activeCat ? " active" : "");
  if (key !== "all") b.style.cssText = catVars(key);   // chip mang màu của loại
  b.textContent = label;
  b.onclick = () => { activeCat = key; document.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === b)); render(); };
  filtersEl.appendChild(b);
}
addChip("all", "Tất cả");
Object.entries(CATEGORIES).forEach(([k, v]) => addChip(k, `${v.icon} ${v.label}`));

const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();

function render({ refit = true } = {}) {
  const q = norm(searchEl.value.trim());
  const shown = PLACES.filter(p =>
    (activeCat === "all" || p.cat === activeCat) &&
    (!q || norm(p.name + " " + p.region + " " + (p.foods || []).map(f => f[0]).join(" ")).includes(q)));   // tìm cả theo tên món ăn
  // Nơi đang mùa đẹp lên đầu danh sách (sort ổn định, giữ thứ tự Bắc → Nam)
  shown.sort((a, b) => inSeason(b) - inSeason(a));

  listEl.innerHTML = "";
  PLACES.forEach(p => { map.removeLayer(p.marker); p.li = null; });

  shown.forEach(p => {
    const hot = activeMonth !== 0 && inSeason(p);
    p.marker.addTo(map);
    p.marker.setZIndexOffset(hot ? 1000 : 0);
    const el = p.marker.getElement();
    el.classList.toggle("in-season", hot);
    el.classList.toggle("off-season", !inSeason(p));
    el.classList.toggle("history-hot", map.getContainer().classList.contains("history-mode") && EVENTS[historyIdx]?.p === p);

    const li = document.createElement("li");
    li.classList.toggle("off", !inSeason(p));
    li.style.cssText = catVars(p.cat);
    li.innerHTML = `${thumbHtml(p, "ico")}<div class="info"><b>${p.name}</b>` +
      `<small>${p.region} ${catBadge(p.cat)}</small>${hot ? `<span class="tag">✨ Đang mùa đẹp</span>` : ""}</div>` +
      `<span class="wx-mini" title="Thời tiết hiện tại">${weatherMini(p)}</span>`;
    li.onclick = () => focusPlace(p, li);
    p.li = li;
    listEl.appendChild(li);
  });

  if (refit && shown.length) {
    // Vừa khít các điểm đang hiện, nhưng không thu nhỏ dưới 5 (dưới 5 là nền OSM, không còn bản đồ giấy)
    const b = L.latLngBounds(shown.map(p => [p.lat, p.lng])).pad(0.2);
    map.setView(b.getCenter(), Math.max(5, Math.min(8, map.getBoundsZoom(b))));
  }
}

function focusPlace(p, li, fly = true) {
  document.querySelectorAll("#list li").forEach(x => x.classList.remove("active"));
  li?.classList.add("active");
  li?.scrollIntoView({ block:"nearest" });
  if (!fly) return p.marker.openPopup();
  // Giữ mức zoom đang xem: chỉ phóng to (tối thiểu 11), không bao giờ thu nhỏ ra
  const ll = L.latLng(p.lat, p.lng), zoom = Math.max(map.getZoom(), 11);
  // Đang thấy rõ điểm đó rồi thì mở popup ngay, không bay
  if (map.getZoom() >= 11 && map.getBounds().pad(-0.15).contains(ll)) return p.marker.openPopup();
  // Mở popup sau khi bay xong, để bản đồ tự dịch cho popup nằm gọn trong khung
  map.closePopup();
  map.once("moveend", () => p.marker.openPopup());
  map.flyTo(ll, zoom, { duration: 1.2 });
}
