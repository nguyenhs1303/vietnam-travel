// Fixture dùng chung cho mọi bài kiểm thử: mở trang ở trạng thái xác định, không phụ thuộc mạng hay ngày giờ thật.
//  - Ngày giờ bắt đầu từ 27/11/2026 10:00 giờ Việt Nam (tháng 11 → 6 nơi đang mùa đẹp; ban ngày)
//  - Thời tiết: dữ liệu giả lập (đổi được giữa chừng bằng app.setWeather("fail" | "ok"))
//  - Chặn mọi request ra ngoài (font Google, nền OpenStreetMap…) → chạy được offline, kết quả không đổi theo mạng
//  - Mặc định bật "giảm chuyển động" → bỏ hiệu ứng mở đầu ~5 giây (bài nào cần thì test.use({ motion: "no-preference" }))
const base = require("@playwright/test");
const path = require("path");

const PAGE_URL = "file://" + path.resolve(__dirname, "..", "index.html");
const FIXED_NOW = new Date("2026-11-27T10:00:00+07:00");

// Một bản tin thời tiết giả cho mỗi địa danh (Open-Meteo trả về mảng theo đúng thứ tự toạ độ)
function fakeWeather(n = 16, { code = 1, tmax = [27, 28, 26], rain = [10, 20, 40] } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    current: { time: "2026-11-27T09:45", temperature_2m: 22 + (i % 8), apparent_temperature: 23, relative_humidity_2m: 70,
               weather_code: code, wind_speed_10m: 12, is_day: 1 },
    daily: { time: ["2026-11-27", "2026-11-28", "2026-11-29"], weather_code: [1, 2, 0], temperature_2m_max: tmax,
             temperature_2m_min: [19, 20, 19], precipitation_probability_max: rain },
  }));
}

const test = base.test.extend({
  theme:   ["day", { option: true }],              // "day" | "night" | "auto"
  weather: ["ok", { option: true }],               // trạng thái API thời tiết lúc mở trang
  motion:  ["reduce", { option: true }],           // "reduce" | "no-preference"

  app: async ({ page, theme, weather, motion }, use) => {
    const state = { weather };
    // setSystemTime: đặt ngày giờ nhưng đồng hồ vẫn chạy. (setFixedTime làm Date.now() đứng yên → hiệu ứng bay flyTo
    // của Leaflet tính tiến độ theo Date.now() nên không bao giờ bay xong.)
    await page.clock.setSystemTime(FIXED_NOW);
    await page.emulateMedia({ reducedMotion: motion });
    await page.addInitScript(t => { try { localStorage.setItem("mapTheme", t); } catch {} }, theme);
    await page.route(/^https?:\/\//, route => {
      if (route.request().url().startsWith("https://api.open-meteo.com/") && state.weather === "ok")
        return route.fulfill({ contentType: "application/json", body: JSON.stringify(fakeWeather()) });
      return route.abort();
    });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));

    await page.goto(PAGE_URL);
    await page.waitForFunction(() => typeof weatherState !== "undefined" && weatherState !== "loading"
      && document.querySelector("#list .row") && PLACES.every(p => p.marker.getElement()));
    if (motion !== "reduce") await page.waitForTimeout(5600);   // chờ hiệu ứng mở đầu chạy xong
    // Chờ bản đồ đứng yên (lúc mở trang có hiệu ứng zoom vừa khít các điểm)
    await page.waitForFunction(() => !map._animatingZoom && !(map._panAnim && map._panAnim._inProgress) && !map._flyToFrame);
    await page.waitForTimeout(300);
    // Ghi lại mọi câu đọc cho trình đọc màn hình (vùng #sr-status)
    await page.evaluate(() => {
      window.__said = [];
      new MutationObserver(() => { const t = document.getElementById("sr-status").textContent; if (t) __said.push(t); })
        .observe(document.getElementById("sr-status"), { childList: true, characterData: true, subtree: true });
    });

    const app = {
      page,
      setWeather: v => { state.weather = v; },
      /** Chỉ số trong PLACES theo một phần tên (PLACES xếp Bắc → Nam, khác thứ tự danh sách hiển thị) */
      idx: name => page.evaluate(n => PLACES.findIndex(p => p.name.includes(n)), name),
      /** Mở thông tin địa danh như khi bấm vào marker (không bay) */
      open: async name => { await page.evaluate(n => { const p = PLACES.find(x => x.name.includes(n)); focusPlace(p, p.li, false); }, name);
                            await page.waitForTimeout(400); },
      isOpen: name => page.evaluate(n => isPlaceOpen(PLACES.find(x => x.name.includes(n))), name),
      /** Gõ vào ô tìm kiếm (giống người gõ: phát sự kiện input) */
      type: text => page.evaluate(v => { searchEl.value = v; searchEl.dispatchEvent(new Event("input")); }, text),
      said: () => page.evaluate(() => window.__said.slice()),
      active: () => page.evaluate(() => { const a = document.activeElement;
        return { cls: String(a.className), tag: a.tagName, name: (a.getAttribute("aria-label") || a.textContent || "").trim() }; }),
      /** Chạy axe-core (WCAG 2.1 A + AA + best-practice), trả về danh sách vi phạm dạng chữ */
      axe: async () => {
        await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
        return page.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] }))
          .violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(" ")} — ${v.help}`));
      },
      errors,
    };
    await use(app);
    base.expect(errors, "trang không được có lỗi JavaScript").toEqual([]);
  },
});

// iPhone 13 (390×664, màn cảm ứng, tỉ lệ điểm ảnh 3) nhưng chạy bằng Chromium — bỏ defaultBrowserType "webkit" của mẫu thiết bị
const { defaultBrowserType, ...iPhone13 } = base.devices["iPhone 13"];

module.exports = { test, expect: base.expect, iPhone13, fakeWeather, PAGE_URL };
