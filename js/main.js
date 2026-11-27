// Khởi động: vẽ danh sách, tải thời tiết, chạy hiệu ứng mở đầu. File này phải nạp sau cùng.

searchEl.addEventListener("input", () => { render(); announceResults(700); });   // đọc số kết quả khi ngừng gõ
// Màn hình nhỏ: thu gọn khung "Đẹp nhất lúc này" cho danh sách đủ chỗ (bấm tiêu đề để mở)
if (matchMedia("(max-width:760px)").matches) document.getElementById("best-now").open = false;
updateSeasonBar();
render();
loadWeather();
setInterval(loadWeather, WEATHER_TTL);

requestAnimationFrame(playIntro);

// Lối tắt bàn phím (đầu trang): đưa focus tới dòng đầu danh sách / bản đồ / tháng đang chọn (hoặc thanh kéo lịch sử)
document.querySelectorAll(".skip-links a").forEach(a => a.onclick = e => {
  e.preventDefault();
  if (a.dataset.skip === "bar") document.querySelector(".season-bar.collapsed .months-toggle")?.click();
  const target = {
    list: () => listEl.querySelector(".row") || searchEl,
    map:  () => map.getContainer(),
    bar:  () => document.querySelector(map.getContainer().classList.contains("history-mode") ? ".tl-range" : ".season-bar .month.active"),
  }[a.dataset.skip]();
  target?.focus();
});

// Cả trang không bao giờ cần cuộn (chỉ thanh bên / bảng trượt cuộn bên trong). Safari iOS vẫn có thể dời trang: chạm ô tìm
// kiếm → bàn phím bật lên, Safari cuộn trang cho ô nhập khỏi bị che, đóng bàn phím xong không cuộn về → bản đồ trôi khỏi
// màn hình, nửa dưới trống. Hễ trang bị cuộn mà người dùng không đang gõ thì đưa về đầu.
// (Không can thiệp khi người dùng đang phóng to trang bằng hai ngón — họ cần kéo để xem các phần khác.)
const isTyping = () => document.activeElement?.matches("input, textarea");
const isPinchZoomed = () => (window.visualViewport?.scale || 1) > 1.01;
const resetPageScroll = () => {
  if (isTyping() || isPinchZoomed()) return;
  const se = document.scrollingElement, vvTop = window.visualViewport?.offsetTop || 0;
  // Safari có khi chỉ dời vùng nhìn thấy (visualViewport.offsetTop) mà scrollTop vẫn 0 → kiểm tra cả hai
  if (se.scrollTop || se.scrollLeft || vvTop > 0.5) window.scrollTo(0, 0);
};
addEventListener("scroll", resetPageScroll, { passive: true });
document.addEventListener("focusout", () => setTimeout(resetPageScroll, 100));   // đóng bàn phím
window.visualViewport?.addEventListener("resize", resetPageScroll);
window.visualViewport?.addEventListener("scroll", resetPageScroll);
