// Khởi động: vẽ danh sách, tải thời tiết, chạy hiệu ứng mở đầu. File này phải nạp sau cùng.

searchEl.addEventListener("input", () => render());
// Màn hình nhỏ: thu gọn khung "Đẹp nhất lúc này" cho danh sách đủ chỗ (bấm tiêu đề để mở)
if (matchMedia("(max-width:760px)").matches) document.getElementById("best-now").open = false;
updateSeasonBar();
render();
loadWeather();
setInterval(loadWeather, WEATHER_TTL);

requestAnimationFrame(playIntro);
