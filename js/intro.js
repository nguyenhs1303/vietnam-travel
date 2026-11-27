// Mở đầu: bản đồ tự vẽ bằng nét mực (~4,5 giây). Bấm khung tiêu đề để xem lại.
// Cần: map, các lớp bản đồ giấy đã vẽ, PLACES có marker.

// ===== Mở đầu: bản đồ tự vẽ bằng nét mực (~4,5 giây) =====
// Biên giới & bờ biển được vẽ dần → sông chảy vào → đất thấm màu, sóng ven bờ hiện ra → núi, chữ rơi xuống → địa danh bật lên.
// Kéo/zoom giữa chừng thì kết thúc ngay; máy bật "giảm chuyển động" thì bỏ qua; bấm khung tiêu đề để xem lại.
const INTRO_CLASSES = ["intro-anim", "intro-hide-fill", "intro-hide-sea", "intro-hide-labels", "intro-hide-pins"];
let introTimers = [];
function finishIntro() {
  introTimers.forEach(clearTimeout);
  introTimers = [];
  map.off("movestart zoomstart", finishIntro);
  const el = map.getContainer();
  el.classList.remove(...INTRO_CLASSES);
  el.querySelectorAll("path.vn-land, path.nb-land, path.river").forEach(p => {
    p.style.strokeDasharray = p.style.strokeDashoffset = p.style.transition = "";
    p.removeAttribute("pathLength");
  });
  el.querySelectorAll(".leaflet-marker-icon, .lbl").forEach(n => n.style.removeProperty("--d"));
  declutter();                                         // đặt lại tên địa danh khi marker đã về đúng kích thước
}
function playIntro() {
  const z = map.getZoom();
  if (z < 5 || z > 8 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;   // chỉ ở mức bản đồ giấy
  finishIntro();
  const el = map.getContainer();
  el.classList.add(...INTRO_CLASSES);

  // Vẽ nét: coi cả đường dài = 1 (pathLength) → nét đứt dài 1, kéo dịch từ 1 về 0.
  // Không cần đo chiều dài thật (getTotalLength trên đường biên giới rất dài từng làm khựng ~0,2 giây đầu).
  const draw = (selector, dur, delay) => el.querySelectorAll(selector).forEach(p => {
    p.setAttribute("pathLength", "1");
    p.style.transition = "none";
    p.style.strokeDasharray = "1";
    p.style.strokeDashoffset = "1";
    p.getBoundingClientRect();                           // để trình duyệt ghi nhận trạng thái "chưa vẽ"
    p.style.transition = `stroke-dashoffset ${dur}ms ease-in-out ${delay}ms, fill-opacity .9s ease`;
    p.style.strokeDashoffset = 0;
  });
  draw("path.vn-land, path.nb-land", 2200, 0);
  draw("path.river", 1400, 1300);

  // Chữ & núi rơi xuống lần lượt; địa danh bật lên từ Bắc vào Nam
  el.querySelectorAll(".leaflet-labels-pane .lbl").forEach((n, i) => n.style.setProperty("--d", `${i * 35}ms`));
  [...PLACES].sort((a, b) => b.lat - a.lat)
    .forEach((p, i) => p.marker.getElement()?.style.setProperty("--d", `${i * 90}ms`));

  const at = (ms, fn) => introTimers.push(setTimeout(fn, ms));
  at(1700, () => el.classList.remove("intro-hide-fill"));
  at(2000, () => el.classList.remove("intro-hide-sea"));
  at(2300, () => el.classList.remove("intro-hide-labels"));
  at(2900, () => el.classList.remove("intro-hide-pins"));
  at(5200, finishIntro);
  map.once("movestart zoomstart", finishIntro);        // người dùng kéo/zoom → xong luôn
}
// Bấm khung tiêu đề để xem bản đồ được vẽ lại
const cartoucheEl = document.querySelector(".cartouche");
L.DomEvent.disableClickPropagation(cartoucheEl);
cartoucheEl.title = "Bấm để xem bản đồ được vẽ lại";
cartoucheEl.onclick = playIntro;
// Bàn phím: khung tiêu đề là một nút (Enter / Space). Máy bật "giảm chuyển động" thì không có hiệu ứng → không làm nút.
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  cartoucheEl.setAttribute("role", "button");
  cartoucheEl.tabIndex = 0;
  cartoucheEl.setAttribute("aria-label", "Xem lại hiệu ứng bản đồ tự vẽ");
  cartoucheEl.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    playIntro();
  });
}
