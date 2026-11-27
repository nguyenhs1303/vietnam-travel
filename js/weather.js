// Thời tiết thật từ Open-Meteo (miễn phí, không cần key): một yêu cầu cho mọi địa danh, làm mới mỗi 15 phút.
// Cần: PLACES, renderBestNow() (best-now.js). Tạo ra: weatherHtml(), weatherMini(), loadWeather(), WEATHER_TTL

// ===== Thời tiết ngay lúc này (Open-Meteo: miễn phí, không cần key) =====
// Mã thời tiết WMO → [biểu tượng, mô tả]
const WMO = {
  0:["☀️","Trời quang"], 1:["🌤️","Ít mây"], 2:["⛅","Có mây"], 3:["☁️","Nhiều mây"],
  45:["🌫️","Sương mù"], 48:["🌫️","Sương mù đóng băng"],
  51:["🌦️","Mưa phùn nhẹ"], 53:["🌦️","Mưa phùn"], 55:["🌧️","Mưa phùn dày"], 56:["🌧️","Mưa phùn lạnh"], 57:["🌧️","Mưa phùn lạnh"],
  61:["🌦️","Mưa nhỏ"], 63:["🌧️","Mưa vừa"], 65:["🌧️","Mưa to"], 66:["🌧️","Mưa lạnh"], 67:["🌧️","Mưa lạnh to"],
  71:["🌨️","Tuyết nhẹ"], 73:["🌨️","Tuyết"], 75:["🌨️","Tuyết dày"], 77:["🌨️","Hạt tuyết"],
  80:["🌦️","Mưa rào nhẹ"], 81:["🌧️","Mưa rào"], 82:["⛈️","Mưa rào rất to"], 85:["🌨️","Mưa tuyết"], 86:["🌨️","Mưa tuyết"],
  95:["⛈️","Dông"], 96:["⛈️","Dông, mưa đá"], 99:["⛈️","Dông, mưa đá"],
};
const wxIcon = (code, isDay = 1) => (!isDay && code <= 1) ? "🌙" : (WMO[code] || ["🌡️"])[0];
const wxText = code => (WMO[code] || [, "Không rõ"])[1];
const isRain = code => (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
const WEATHER_TTL = 15 * 60 * 1000;           // làm mới mỗi 15 phút
let weatherState = "loading";                  // loading | ok | error

// Lời khuyên ngắn theo thời tiết hiện tại (tối đa 2 câu)
function weatherTips(p, c) {
  const t = c.temperature_2m, tips = [];
  if (t < 12) tips.push("🧥 Rất lạnh, mặc nhiều lớp áo ấm");
  else if (t < 18) tips.push("🧣 Se lạnh, nhớ mang áo khoác");
  else if (t >= 34) tips.push("🥵 Nắng nóng, uống đủ nước, tránh ra ngoài buổi trưa");
  else if (t >= 30 && c.is_day && c.weather_code <= 2) tips.push("🧴 Nắng gắt, mang mũ và kem chống nắng");
  if (c.weather_code >= 95) tips.push("⚡ Có dông, hạn chế leo núi và ra biển");
  else if (isRain(c.weather_code)) tips.push("☔ Đang mưa, mang áo mưa");
  if (c.weather_code === 45 || c.weather_code === 48) tips.push("🌫️ Sương mù, đi đèo và lái xe cẩn thận");
  if (p.cat === "beach" && c.wind_speed_10m >= 30) tips.push("🌊 Gió mạnh, biển có thể động, hỏi kỹ trước khi đi tàu");
  if (!tips.length) tips.push("👍 Thời tiết dễ chịu, hợp để tham quan");
  return tips.slice(0, 2);
}

const DAY_LABELS = ["Hôm nay", "Ngày mai", "Ngày kia"];
function weatherHtml(p) {
  if (weatherState === "loading" && !p.weather) return `<div class="wx wx-wait">⏳ Đang tải thời tiết…</div>`;
  if (!p.weather) return `<div class="wx wx-wait">Không tải được thời tiết. Kiểm tra kết nối mạng.
    <br><button type="button" class="wx-retry">↻ Thử lại</button></div>`;
  const c = p.weather.current, d = p.weather.daily, time = c.time.slice(11, 16);
  const r = p.rating;
  return `${r ? `<div class="score-line"><span class="score-badge">${r.score}</span>
      <span><b>${r.verdict}</b> · hạng ${p.rank}/${PLACES.length} lúc này<small>${r.reasons.join(" · ")}</small></span></div>` : ""}
  <div class="wx">
    <div class="wx-now">
      <span class="wx-ico">${wxIcon(c.weather_code, c.is_day)}</span>
      <span class="wx-temp">${Math.round(c.temperature_2m)}°</span>
      <span class="wx-desc"><b>${wxText(c.weather_code)}</b>
        <small>Cảm giác ${Math.round(c.apparent_temperature)}° · Ẩm ${c.relative_humidity_2m}% · Gió ${Math.round(c.wind_speed_10m)} km/h</small></span>
    </div>
    <ul class="wx-tips">${weatherTips(p, c).map(t => `<li>${t}</li>`).join("")}</ul>
    <div class="wx-days">${d.time.map((_, i) => `
      <div><small>${DAY_LABELS[i]}</small><span>${wxIcon(d.weather_code[i])}</span>
        <b>${Math.round(d.temperature_2m_max[i])}°</b><small>${Math.round(d.temperature_2m_min[i])}° · 💧${d.precipitation_probability_max[i] ?? 0}%</small></div>`).join("")}
    </div>
    <div class="wx-src">Thời tiết lúc ${time} · Open-Meteo</div>
  </div>`;
}
// Nhiệt độ nhỏ ở danh sách bên trái
const weatherMini = p => p.weather
  ? `${wxIcon(p.weather.current.weather_code, p.weather.current.is_day)} ${Math.round(p.weather.current.temperature_2m)}°` : "";

async function loadWeather() {
  // Một yêu cầu cho cả 16 nơi (Open-Meteo nhận nhiều toạ độ, trả về mảng theo đúng thứ tự)
  const params = new URLSearchParams({
    latitude: PLACES.map(p => p.lat).join(","),
    longitude: PLACES.map(p => p.lng).join(","),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: 3, timezone: "Asia/Ho_Chi_Minh",
  });
  try {
    const res = await fetch("https://api.open-meteo.com/v1/forecast?" + params);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data];
    PLACES.forEach((p, i) => { if (list[i]?.current) p.weather = list[i]; });
    weatherState = "ok";
  } catch (err) {
    console.warn("Không tải được thời tiết:", err);
    weatherState = "error";                    // giữ dữ liệu cũ (nếu có), chỉ báo lỗi khi chưa có gì
  }
  refreshWeatherUI();
}
// Vẽ lại mọi chỗ có thời tiết: Top 3, nhiệt độ ở danh sách, popup đang mở
function refreshWeatherUI() {
  renderBestNow();
  PLACES.forEach(p => {
    const mini = p.li?.querySelector(".wx-mini");
    if (mini) mini.innerHTML = weatherMini(p);
    if (p.marker.isPopupOpen()) p.marker.getPopup().update();
  });
}
// Nút "Thử lại" (trong popup và khung Top 3): hiện lại trạng thái đang tải rồi gọi lại API
function retryWeather() {
  if (weatherState === "loading") return;
  weatherState = "loading";
  refreshWeatherUI();
  loadWeather();
}
// Bắt ở pha capture vì Leaflet chặn click lan ra ngoài popup. Dời sang lượt sau (setTimeout):
// dựng lại popup ngay giữa lúc click sẽ làm Leaflet tưởng là bấm ra ngoài và đóng popup.
document.addEventListener("click", e => {
  if (e.target.closest(".wx-retry")) setTimeout(retryWeather);
}, true);
