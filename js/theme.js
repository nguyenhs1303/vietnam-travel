// Bản đồ đêm: tính giờ mặt trời mọc/lặn ở Việt Nam, công tắc Ngày ⇄ Đêm + nút Tự động, đồng hồ giờ Việt Nam.
// Cần: map. Lưu lựa chọn vào localStorage (khoá "mapTheme").

// ===== Bản đồ đêm: tự chuyển theo giờ mặt trời mọc / lặn thật ở Việt Nam =====
// Tính giờ mọc/lặn ngay trên trình duyệt (công thức thiên văn rút gọn, sai số ~1–2 phút), không cần mạng.
function sunTimes(date, lat, lng) {
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, J0 = 0.0009, e = rad * 23.4397;
  const d = date.valueOf() / dayMs - 0.5 + J1970 - J2000;
  const lw = rad * -lng, phi = rad * lat;
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const w = Math.acos((Math.sin(rad * -0.833) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
  const Jset = J2000 + (J0 + (w + lw) / (2 * Math.PI) + n) + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const toDate = j => new Date((j + 0.5 - J1970) * dayMs);
  return { rise: toDate(Jnoon - (Jset - Jnoon)), set: toDate(Jset) };
}
const SUN_REF = [16.46, 107.59];                 // Huế — giữa dải đất Việt Nam
const vnTime = d => d.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });

const THEME_MODES = ["auto", "day", "night"];
let themeMode = THEME_MODES.includes(localStorage.getItem("mapTheme")) ? localStorage.getItem("mapTheme") : "auto";

function setThemeMode(mode) {
  themeMode = mode;
  localStorage.setItem("mapTheme", mode);
  applyTheme();
}

function applyTheme() {
  const now = new Date(), { rise, set } = sunTimes(now, ...SUN_REF);
  const sunIsDown = now < rise || now > set;
  const night = themeMode === "night" || (themeMode === "auto" && sunIsDown);
  const changed = document.body.classList.contains("night") !== night;
  document.body.classList.toggle("night", night);
  if (changed || !applyTheme.painted) { paintRipples(); applyTheme.painted = true; }   // lớp sóng (Canvas) đổi màu theo

  // Cập nhật công tắc ngày/đêm + nút Tự động
  const sw = document.querySelector(".day-night-switch"), auto = document.querySelector(".theme-auto");
  if (!sw) return;
  sw.setAttribute("aria-checked", night);
  sw.title = night ? "Đang là bản đồ đêm — bấm để chuyển sang ngày" : "Đang là bản đồ ngày — bấm để chuyển sang đêm";
  auto.setAttribute("aria-pressed", themeMode === "auto");
  // Màn hình nhỏ: đang Tự động thì chỉ hiện công tắc (CSS ẩn nút "Tự động"); gạt tay thì nút hiện lại để quay về
  sw.closest(".theme-ctl").classList.toggle("is-auto", themeMode === "auto");
  auto.title = `Tự chuyển theo giờ mặt trời ở Việt Nam (hôm nay mọc ${vnTime(rise)}, lặn ${vnTime(set)})`;
  document.querySelector(".theme-note").textContent = themeMode === "auto"
    ? (sunIsDown ? `Tự sáng lúc ${vnTime(rise)}` : `Tự tối lúc ${vnTime(set)}`)
    : "Đang chỉnh tay";
}

// Công tắc ngày ⇄ đêm (gạt tay) + nút "Tự động" để quay lại theo giờ mặt trời
const themeCtl = L.control({ position: "topleft" });
themeCtl.onAdd = () => {
  const box = L.DomUtil.create("div", "theme-ctl");
  L.DomEvent.disableClickPropagation(box);
  box.innerHTML = `
    <button type="button" class="day-night-switch" role="switch" aria-label="Bản đồ đêm">
      <span class="sw-sun" aria-hidden="true">☀️</span><span class="sw-moon" aria-hidden="true">🌙</span>
      <span class="sw-knob" aria-hidden="true"></span>
    </button>
    <span class="theme-clock" title="Giờ Việt Nam (GMT+7)">
      <b class="clock-time"><span class="hh">--</span><span class="colon">:</span><span class="mm">--</span></b>
      <small class="clock-date"></small>
    </span>
    <span class="theme-side">
      <button type="button" class="theme-auto">Tự động</button>
      <small class="theme-note"></small>
    </span>`;
  // Gạt công tắc: đảo trạng thái đang hiển thị, chuyển sang chỉnh tay
  box.querySelector(".day-night-switch").onclick = () =>
    setThemeMode(document.body.classList.contains("night") ? "day" : "night");
  box.querySelector(".theme-auto").onclick = e => {
    setThemeMode("auto");
    // Màn hình nhỏ: nút vừa bấm bị ẩn đi → chuyển focus sang công tắc thay vì để rơi về đầu trang
    if (!e.currentTarget.offsetParent) box.querySelector(".day-night-switch").focus({ preventScroll: true });
  };
  return box;
};
themeCtl.addTo(map);
applyTheme();

// Đồng hồ giờ Việt Nam (GMT+7) cạnh công tắc — cập nhật mỗi giây, dấu ":" nhấp nháy
const clockParts = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit",
  hourCycle: "h23", weekday: "long", day: "2-digit", month: "2-digit" });
function tickClock() {
  const p = Object.fromEntries(clockParts.formatToParts(new Date()).map(x => [x.type, x.value]));
  const ctl = document.querySelector(".theme-ctl");
  if (!ctl) return;
  ctl.querySelector(".hh").textContent = p.hour;
  ctl.querySelector(".mm").textContent = p.minute;
  const weekday = p.weekday.charAt(0).toUpperCase() + p.weekday.slice(1);     // "thứ sáu" → "Thứ sáu"
  ctl.querySelector(".clock-date").textContent = `${weekday}, ${p.day}/${p.month}`;
}
tickClock();
setInterval(tickClock, 1000);
setInterval(applyTheme, 60 * 1000);              // kiểm tra lại mỗi phút (tới giờ lặn là tự chuyển)
