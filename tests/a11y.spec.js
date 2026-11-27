// Trợ năng (WCAG 2.1 AA): axe-core, bàn phím, trình đọc màn hình, thông báo, tương phản, chuyển động
const { test, expect, iPhone13 } = require("./fixtures");

const EMOJI = /[\u{1F300}-\u{1FAFF}☀-➿]/u;

// ---------- axe-core ----------
test.describe("axe-core: 0 vi phạm", () => {
  test("ban ngày — trang đầu, popup mở", async ({ app }) => {
    expect(await app.axe()).toEqual([]);
    await app.open("Đồng Văn");
    expect(await app.axe()).toEqual([]);
  });
  test("chế độ lịch sử", async ({ app }) => {
    await app.page.click(".season-bar .mode-btn");
    await app.page.waitForTimeout(1500);
    expect(await app.axe()).toEqual([]);
  });
  test.describe("ban đêm", () => {
    test.use({ theme: "night" });
    test("trang đầu + popup", async ({ app }) => {
      await app.open("Hoàn Kiếm");
      expect(await app.axe()).toEqual([]);
    });
  });
  test.describe("mobile", () => {
    test.use({ ...iPhone13 });
    test("trang đầu: thanh tháng thu gọn rồi mở ra", async ({ app }) => {
      expect(await app.axe()).toEqual([]);
      await app.page.getByRole("button", { name: "Chọn tháng" }).tap();
      expect(await app.axe()).toEqual([]);
    });
    test("lối tắt 'Tới thanh chọn tháng' mở hàng tháng đang thu gọn rồi focus vào tháng đang chọn", async ({ app }) => {
      await app.page.focus(".skip-links a:nth-child(3)");
      await app.page.keyboard.press("Enter");
      await expect(app.page.locator(".season-bar .month.active")).toBeFocused();
    });
    test("bảng trượt đang mở", async ({ app }) => {
      await app.open("Hạ Long");
      expect(await app.axe()).toEqual([]);
    });
  });
});

// ---------- Bàn phím ----------
test.describe("Bàn phím", () => {
  test("Tab đầu tiên là lối tắt (hiện ra khi focus); 3 lối tắt đưa tới đúng chỗ", async ({ app }) => {
    await app.page.keyboard.press("Tab");
    const first = app.page.locator(".skip-links a").first();
    await expect(first).toBeFocused();
    expect((await first.boundingBox()).y).toBeGreaterThanOrEqual(0);
    await app.page.keyboard.press("Enter");
    await expect(app.page.locator("#list li:first-child .row")).toBeFocused();
    await app.page.focus(".skip-links a:nth-child(2)"); await app.page.keyboard.press("Enter");
    await expect(app.page.locator("#map")).toBeFocused();
    await app.page.focus(".skip-links a:nth-child(3)"); await app.page.keyboard.press("Enter");
    await expect(app.page.locator(".season-bar .month.active")).toBeFocused();
  });
  test("phím ← → đổi tháng trên thanh tháng", async ({ app }) => {
    await app.page.focus(".season-bar .month.active");
    await app.page.keyboard.press("ArrowRight");
    await expect(app.page.locator(".month.active")).toHaveAttribute("data-m", "12");
    await expect(app.page.locator(".month.active")).toBeFocused();
  });
  test("mọi phần tử focus được đều có viền focus nhìn thấy", async ({ app }) => {
    const missing = [];
    for (let i = 0; i < 45; i++) {
      await app.page.keyboard.press("Tab");
      const r = await app.page.evaluate(() => {
        const a = document.activeElement; if (!a || a === document.body) return null;
        const cs = getComputedStyle(a), pin = a.querySelector?.(".pin");
        const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none"
          || (pin && getComputedStyle(pin).boxShadow !== "none");
        return ring ? null : (a.className || a.tagName).toString().slice(0, 40);
      });
      if (r) missing.push(r);
    }
    expect([...new Set(missing)]).toEqual([]);
  });
  test.describe("có hiệu ứng", () => {
    test.use({ motion: "no-preference" });
    test("khung tiêu đề bản đồ là nút: Enter xem lại hiệu ứng vẽ", async ({ app }) => {
      const cart = app.page.locator(".cartouche");
      await expect(cart).toHaveAttribute("role", "button");
      await cart.focus();
      await app.page.keyboard.press("Enter");
      expect(await app.page.evaluate(() => map.getContainer().classList.contains("intro-anim"))).toBe(true);
    });
  });
});

// ---------- Trình đọc màn hình: tên, vai trò ----------
test.describe("Trình đọc màn hình", () => {
  test("dòng danh sách, chip, Top 3: không đọc emoji; thời tiết đọc thành chữ; Top 3 đọc 'Hạng 1'", async ({ app }) => {
    const snap = await app.page.locator("#sidebar").ariaSnapshot();
    const row = snap.split("\n").find(l => l.includes('button "Cao nguyên'));
    expect(row).toMatch(/Ít mây, 22°/);
    expect(row).not.toMatch(EMOJI);
    expect(snap.split("\n").filter(l => /button "(Thiên nhiên|Biển đảo|Đô thị)"/.test(l))).toHaveLength(3);
    expect(snap).toMatch(/button "Hạng 1: /);
  });
  test("bản đồ: có tên; chữ vẽ trên bản đồ, la bàn bị ẩn; nút zoom tiếng Việt; tiêu đề h1 → h2", async ({ app }) => {
    const snap = await app.page.locator("#map").ariaSnapshot();
    expect(snap).not.toMatch(/B I Ể N|°B|°Đ|La bàn/);
    await expect(app.page.locator("#map")).toHaveAttribute("aria-label", "Bản đồ danh thắng");
    await expect(app.page.getByRole("button", { name: "Phóng to" })).toBeVisible();
    await app.open("Huế");
    expect(await app.page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,h4")].map(h => h.tagName))).toEqual(["H1", "H2"]);
    expect(await app.page.locator(".leaflet-popup").ariaSnapshot()).toMatch(/khả năng mưa 10%/);
  });
  test("nút tháng đọc đầy đủ; ô tìm kiếm có nhãn nhìn thấy được", async ({ app }) => {
    await expect(app.page.locator('.month[data-m="11"]')).toHaveAttribute("aria-label", "Tháng 11 (tháng này), 6 nơi đang mùa đẹp");
    await expect(app.page.getByLabel("Tìm địa điểm, tỉnh hoặc món ăn")).toBeVisible();
  });
});

// ---------- Thông báo (#sr-status) ----------
test.describe("Thông báo cho trình đọc màn hình", () => {
  test("đổi tháng, lọc loại, tìm kiếm", async ({ app }) => {
    await app.page.click('.month[data-m="3"]'); await app.page.waitForTimeout(400);
    await app.page.click(".chip >> text=Thiên nhiên"); await app.page.waitForTimeout(400);
    await app.type("ha"); await app.page.waitForTimeout(1200);
    const s = await app.said();
    expect(s[0]).toMatch(/^Tháng 3: \d+ nơi đang vào mùa đẹp/);
    expect(s[1]).toMatch(/^Hiện \d+ trên 16 nơi trong mục Thiên nhiên$/);
    expect(s[2]).toMatch(/^Hiện \d+ trên 16 nơi khớp “ha” trong mục Thiên nhiên$/);
  });
  test("[review #3 #4] ra 0 kết quả: không đọc số cũ, đọc câu 'Không tìm thấy'", async ({ app }) => {
    await app.type("ph"); await app.page.waitForTimeout(200);
    await app.type("phxq"); await app.page.waitForTimeout(1500);
    expect(await app.said()).toEqual(["Không tìm thấy nơi nào khớp “phxq”. Có nút Xoá tìm kiếm và bộ lọc."]);
    await expect(app.page.locator("#list-empty")).not.toHaveAttribute("role", "status");
  });
  test("[review #4] gõ thêm khi vẫn 0 kết quả: nút 'Xoá' đang focus không bị thay", async ({ app }) => {
    await app.type("phxq");
    await app.page.focus(".empty-reset");
    await app.type("phxq");
    await expect(app.page.locator(".empty-reset")).toBeFocused();
  });
  test.describe("thời tiết lỗi", () => {
    test.use({ weather: "fail" });
    test("[review #8] lỗi chỉ đọc một lần, không lặp lại mỗi lần tự làm mới; Thử lại thì đọc kết quả", async ({ app }) => {
      await app.page.evaluate(() => loadWeather()); await app.page.waitForTimeout(300);
      await app.page.evaluate(() => loadWeather()); await app.page.waitForTimeout(300);
      expect((await app.said()).filter(t => /Không tải được/.test(t))).toEqual([]);
      app.setWeather("ok");
      await app.page.click("#best-now .wx-retry"); await app.page.waitForTimeout(800);
      expect(await app.said()).toContain("Đã tải xong thời tiết.");
    });
    test("[review #5] bấm 'Thử lại' bằng bàn phím: focus ở lại khung Top 3 (không nhảy về đầu trang)", async ({ app }) => {
      app.setWeather("ok");
      await app.page.focus("#best-now .wx-retry");
      await app.page.keyboard.press("Enter");
      await app.page.waitForTimeout(800);
      expect(await app.page.evaluate(() => !!document.activeElement.closest("#best-now"))).toBe(true);
    });
  });
  test("[review #5] làm mới thời tiết giữ focus trên đúng nút Top 3", async ({ app }) => {
    await app.page.focus(".best-list li:nth-child(2) button");
    const i = await app.page.evaluate(() => document.activeElement.dataset.i);
    await app.page.evaluate(() => loadWeather()); await app.page.waitForTimeout(400);
    expect(await app.page.evaluate(() => document.activeElement.dataset?.i)).toBe(i);
  });
});

// ---------- Tương phản ----------
// Đo trong trang: màu chữ (kể cả độ mờ của phần tử cha) so với màu nền thật (bỏ qua vân giấy)
const contrastReport = app => app.page.evaluate(() => {
  const cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = c => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = "#000"; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data]; };
  const lum = ([r, g, b]) => [r, g, b].map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const ratio = (a, c) => { const x = lum(a), y = lum(c); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const blend = (t, u) => { const a = t[3] / 255; return [0, 1, 2].map(i => Math.round(t[i] * a + u[i] * (1 - a))).concat(255); };
  const bgOf = el => { const st = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3]) { st.push(c); if (c[3] === 255) break; } }
    let col = rgba(getComputedStyle(document.body).backgroundColor); for (const c of st.reverse()) col = blend(c, col); return col; };
  const fails = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const t = w.currentNode, el = t.parentElement;
    if (!t.textContent.trim() || !el || el.closest('[hidden], [aria-hidden="true"], .sr-only, .leaflet-labels-pane, .place-name, .credit, .skip-links')) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (cs.display === "none" || cs.visibility === "hidden" || !r.width || r.bottom < 0 || r.top > innerHeight) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    if (!op) continue;
    const bg = bgOf(el), fgRaw = rgba(cs.color), fg = blend([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * op], bg);
    const size = parseFloat(cs.fontSize), need = size >= 24 || (+cs.fontWeight >= 700 && size >= 18.66) ? 3 : 4.5;
    const v = ratio(fg, bg);
    if (v < need) fails.push(`${(el.className || el.tagName).toString().split(" ")[0]} "${t.textContent.trim().slice(0, 20)}" ${v.toFixed(2)} < ${need}`);
  }
  const P = rgba(getComputedStyle(document.body).getPropertyValue("--paper"));
  const border = s => +ratio(blend(rgba(getComputedStyle(document.querySelector(s)).borderTopColor), P), P).toFixed(2);
  return { fails: [...new Set(fails)], borders: { search: border("#search"), chip: border(".chip:not(.active)"), month: border(".month:not(.active):not(.all)") } };
});

for (const theme of ["day", "night"]) {
  test.describe(`Tương phản — ${theme === "day" ? "ban ngày" : "ban đêm"}`, () => {
    test.use({ theme });
    test("chữ ≥ 4.5:1 (chữ to ≥ 3:1) ở trang đầu, popup và chế độ lịch sử; viền ô nhập / chip / nút tháng ≥ 3:1", async ({ app }) => {
      const base = await contrastReport(app);
      expect(base.fails).toEqual([]);
      for (const [k, v] of Object.entries(base.borders)) expect(v, `viền ${k}`).toBeGreaterThanOrEqual(3);
      await app.open("Hoàn Kiếm");
      await app.page.hover("#list li:nth-child(1)");                 // nền rê chuột của dòng danh sách
      expect((await contrastReport(app)).fails).toEqual([]);
      await app.page.evaluate(() => closePlace());
      await app.page.click(".season-bar .mode-btn"); await app.page.waitForTimeout(1500);
      expect((await contrastReport(app)).fails).toEqual([]);
    });
  });
}

// ---------- Chuyển động ----------
test.describe("Chuyển động", () => {
  test.use({ motion: "no-preference" });
  test("không có hiệu ứng nào chạy mãi: vòng sáng dừng sau 2 lượt, đồng hồ không nhấp nháy (WCAG 2.2.2)", async ({ app }) => {
    await app.page.waitForTimeout(500);
    const running = await app.page.evaluate(() => [...new Set(document.getAnimations().filter(a => a.playState === "running").map(a => a.animationName))]);
    expect(running).toEqual([]);
  });
});
