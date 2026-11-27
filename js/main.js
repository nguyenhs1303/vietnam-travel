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
