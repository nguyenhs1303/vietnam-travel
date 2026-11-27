// Màn hình nhỏ: bảng trượt thay cho popup, bớt lớp phủ trên bản đồ, vùng chạm lớn, bố cục khi màn hình thấp
const { test, expect, iPhone13 } = require("./fixtures");

const sheet = app => app.page.locator("#sheet");
const sheetOpen = app => app.page.evaluate(() => document.getElementById("sheet").classList.contains("open"));
// Phần trăm diện tích bản đồ bị các khung (leaflet-control) che — lấy mẫu lưới 10px
const mapCoveredPct = app => app.page.evaluate(() => {
  const m = document.getElementById("map").getBoundingClientRect();
  const cs = [...document.querySelectorAll(".leaflet-control")].map(c => c.getBoundingClientRect()).filter(r => r.width && r.height);
  let hit = 0, n = 0;
  for (let x = m.left + 5; x < m.right; x += 10) for (let y = m.top + 5; y < m.bottom; y += 10) {
    n++; if (cs.some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) hit++; }
  return Math.round(hit / n * 100);
});

test.describe("iPhone 13", () => {
  test.use({ ...iPhone13 });

  test("bớt lớp phủ: không khung tiêu đề, la bàn, đồng hồ, nút +/−", async ({ app }) => {
    for (const sel of [".cartouche", ".compass", ".theme-clock", ".leaflet-control-zoom"])
      await expect(app.page.locator(sel), sel).toBeHidden();
    // chữ hiển thị (innerText) là bản rút gọn; textContent vẫn chứa cả phần ẩn trên màn hình nhỏ
    expect(await app.page.locator(".season-title").innerText()).toMatch(/Tháng 11 · 6 nơi đang đẹp$/);
  });

  test("[mobile #2] thanh tháng thu gọn một dòng; nút ▾ mở hàng tháng, 'Cả năm' luôn thấy ở đầu hàng", async ({ app }) => {
    const toggle = app.page.getByRole("button", { name: "Chọn tháng" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(app.page.locator(".season-months")).toBeHidden();
    expect((await app.page.locator(".season-bar").boundingBox()).height).toBeLessThanOrEqual(60);
    await toggle.tap();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(app.page.locator(".month.active")).toBeVisible();
    const inRow = await app.page.evaluate(() => { const b = document.querySelector(".month.all").getBoundingClientRect(),
      r = document.querySelector(".season-months").getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1; });
    expect(inRow).toBe(true);
    await app.page.tap('.month[data-m="3"]');
    await expect(app.page.locator(".season-title")).toContainText("Tháng 3");
    await app.page.tap(".season-title");                              // chạm tiêu đề cũng thu / mở
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("vùng chạm ≥ 40px", async ({ app }) => {
    await app.page.getByRole("button", { name: "Chọn tháng" }).tap();
    const sizes = await app.page.evaluate(() => Object.fromEntries(
      [".chip", ".theme-auto", ".season-bar .mode-btn", ".month:not(.all)", ".months-toggle", ".day-night-switch"].map(s => [s, Math.round(document.querySelector(s).getBoundingClientRect().height)])));
    for (const sel of [".chip", ".theme-auto", ".season-bar .mode-btn", ".month:not(.all)", ".months-toggle"]) expect(sizes[sel], sel).toBeGreaterThanOrEqual(40);
    expect(sizes[".day-night-switch"]).toBeGreaterThanOrEqual(32);
  });

  test("[mobile #1] mở trang thấy ngay ít nhất một địa danh trong danh sách (không phải cuộn)", async ({ app }) => {
    const r = await app.page.evaluate(() => ({ top: document.querySelector("#list li").getBoundingClientRect().top, vh: innerHeight }));
    expect(r.vh - r.top, "phần dòng đầu tiên thấy được (px)").toBeGreaterThanOrEqual(80);
  });

  test("[mobile #1] chip lọc nằm trên một hàng, vuốt ngang được", async ({ app }) => {
    const r = await app.page.evaluate(() => { const f = document.getElementById("filters");
      return { tops: new Set([...f.children].map(c => Math.round(c.getBoundingClientRect().top))).size, scrolls: f.scrollWidth > f.clientWidth,
               ox: getComputedStyle(f).overflowX }; });
    expect(r.tops).toBe(1);
    expect(r.scrolls).toBe(true);
    expect(r.ox).toBe("auto");
  });

  test("[mobile #2] đang chỉnh tay (nút 'Tự động' hiện): các khung che ≤ 22% bản đồ", async ({ app }) => {
    expect(await mapCoveredPct(app)).toBeLessThanOrEqual(22);
  });

  test("[mobile #4] ô tìm kiếm chữ ≥ 16px (iPhone không tự phóng to trang khi chạm)", async ({ app }) => {
    expect(parseFloat(await app.page.locator("#search").evaluate(e => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
  });

  test("[mobile #5] chiều cao trang theo khung nhìn động (dvh), không bị thanh trình duyệt che", async ({ app }) => {
    // (mở qua file:// nên trang không đọc được CSSOM → đọc thẳng file CSS)
    const css = require("fs").readFileSync(require("path").join(__dirname, "..", "css", "base.css"), "utf8");
    expect(css).toMatch(/\nbody \{[^}]*height:100dvh/);
    expect(await app.page.evaluate(() => Math.abs(document.body.getBoundingClientRect().height - innerHeight))).toBeLessThanOrEqual(1);
  });

  test("chạm marker → bảng trượt (không phải popup), marker vẫn thấy phía trên, focus vào tiêu đề", async ({ app }) => {
    await app.page.locator(".leaflet-marker-icon.in-season").first().tap();
    await app.page.waitForTimeout(800);
    expect(await sheetOpen(app)).toBe(true);
    await expect(app.page.locator(".leaflet-popup")).toHaveCount(0);
    await expect(app.page.locator("#sheet .place-title")).toBeFocused();
    const pos = await app.page.evaluate(() => { const p = PLACES.find(isPlaceOpen), r = p.marker.getElement().querySelector(".pin").getBoundingClientRect();
      return { pinBottom: r.bottom, sheetTop: innerHeight - document.getElementById("sheet").offsetHeight }; });
    expect(pos.pinBottom).toBeLessThan(pos.sheetTop);
    await expect(app.page.locator(".season-bar")).toBeHidden();       // nhường chỗ khi bảng đang mở
  });

  test("đóng bảng trượt: nút ✕, Esc, kéo thanh nắm xuống — focus về dòng đã chạm", async ({ app }) => {
    const row = app.page.locator("#list li:nth-child(2) .row");
    // ✕
    await row.tap(); await app.page.waitForTimeout(2500);
    expect((await app.page.locator(".sheet-close").boundingBox()).width).toBeGreaterThanOrEqual(44);
    await app.page.tap(".sheet-close"); await app.page.waitForTimeout(400);
    await expect(sheet(app)).toBeHidden();
    await expect(row).toBeFocused();
    // Esc
    await row.tap(); await app.page.waitForTimeout(2500);
    await app.page.keyboard.press("Escape"); await app.page.waitForTimeout(400);
    await expect(sheet(app)).toBeHidden();
    // kéo xuống
    await row.tap(); await app.page.waitForTimeout(2500);
    const g = await app.page.locator(".sheet-grip").boundingBox();
    await app.page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await app.page.mouse.down();
    await app.page.mouse.move(g.x + g.width / 2, g.y + 140, { steps: 6 });
    await app.page.mouse.up(); await app.page.waitForTimeout(400);
    await expect(sheet(app)).toBeHidden();
  });

  test("đổi tab trong bảng trượt", async ({ app }) => {
    await app.open("Hội An");
    await app.page.tap("#sheet .ptab[data-tab=food]");
    await expect(app.page.locator("#sheet .ptab[aria-selected=true]")).toHaveAttribute("data-tab", "food");
  });

  test("[review #1] tìm kiếm ẩn mất nơi đang mở → bảng trượt đóng", async ({ app }) => {
    await app.open("Hạ Long");
    await app.type("Huế");
    expect(await app.isOpen("Hạ Long")).toBe(false);
  });
});

test.describe("iPhone 13 — thời tiết lỗi", () => {
  test.use({ ...iPhone13, weather: "fail" });
  test("bảng trượt mở tab Giới thiệu; Thử lại trong bảng tải được thời tiết, bảng không đóng", async ({ app }) => {
    await app.open("Đồng Văn");
    await expect(app.page.locator("#sheet .ptab[aria-selected=true]")).toHaveAttribute("data-tab", "info");
    await app.page.tap("#sheet .ptab[data-tab=wx]");
    app.setWeather("ok");
    await app.page.tap("#sheet .wx-retry");
    await expect(app.page.locator("#sheet .wx-temp")).toBeVisible();
    expect(await sheetOpen(app)).toBe(true);
  });
});

test.describe("Màn hình thấp mà ngang (phóng to 200%, điện thoại xoay ngang)", () => {
  for (const viewport of [{ width: 640, height: 360 }, { width: 720, height: 450 }]) {
    test.describe(`${viewport.width}×${viewport.height}`, () => {
      test.use({ viewport });
      test("thanh bên đặt cạnh bản đồ; thanh tháng không che công tắc ngày/đêm; không cuộn ngang", async ({ app }) => {
        const r = await app.page.evaluate(() => {
          const b = s => document.querySelector(s).getBoundingClientRect();
          const t = b(".theme-ctl"), s = b(".season-bar");
          return { mapH: b("#map").height, overlap: t.bottom > s.top && t.top < s.bottom && t.left < s.right && s.left < t.right,
                   hscroll: document.documentElement.scrollWidth > innerWidth };
        });
        expect(r.mapH).toBeGreaterThanOrEqual(300);
        expect(r.overlap).toBe(false);
        expect(r.hscroll).toBe(false);
      });
    });
  }
  test.describe("320×568 (iPhone SE đời đầu)", () => {
    test.use({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, theme: "auto" });
    test("màn hình hẹp nhất: không cuộn ngang", async ({ app }) => {
      expect(await app.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    });
    test("[mobile #1 #2] màn hình hẹp nhất: thấy một phần địa danh đầu tiên, khung che ≤ 25% bản đồ", async ({ app }) => {
      const r = await app.page.evaluate(() => innerHeight - document.querySelector("#list li").getBoundingClientRect().top);
      expect(r).toBeGreaterThanOrEqual(40);
      expect(await mapCoveredPct(app)).toBeLessThanOrEqual(25);
    });
  });
});

test.describe("iPhone 13 — giao diện tự động theo giờ", () => {
  test.use({ ...iPhone13, theme: "auto" });
  test("[mobile #2] mặc định (Tự động): các khung che ≤ 18% bản đồ", async ({ app }) => {
    expect(await mapCoveredPct(app)).toBeLessThanOrEqual(18);
  });
  test("[mobile #2] công tắc ngày/đêm gọn: đang Tự động thì ẩn nút 'Tự động'; gạt tay thì hiện lại để quay về", async ({ app }) => {
    await expect(app.page.locator(".theme-auto")).toBeHidden();
    await app.page.tap(".day-night-switch");
    await expect(app.page.locator(".theme-auto")).toBeVisible();
    await app.page.tap(".theme-auto");
    await expect(app.page.locator(".theme-auto")).toBeHidden();
  });
});

test.describe("Máy tính", () => {
  test("thanh tháng luôn mở, không có nút thu gọn", async ({ app }) => {
    await expect(app.page.locator(".months-toggle")).toBeHidden();
    await expect(app.page.locator(".season-months")).toBeVisible();
    await expect(app.page.locator(".theme-auto")).toBeVisible();
  });
});
