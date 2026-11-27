// Màn hình nhỏ: bảng trượt thay cho popup, bớt lớp phủ trên bản đồ, vùng chạm lớn, bố cục khi màn hình thấp
const { test, expect, iPhone13 } = require("./fixtures");

const sheet = app => app.page.locator("#sheet");
const sheetOpen = app => app.page.evaluate(() => document.getElementById("sheet").classList.contains("open"));

test.describe("iPhone 13", () => {
  test.use({ ...iPhone13 });

  test("bớt lớp phủ: không khung tiêu đề, la bàn, đồng hồ, nút +/−; 'Cả năm' luôn thấy", async ({ app }) => {
    for (const sel of [".cartouche", ".compass", ".theme-clock", ".leaflet-control-zoom"])
      await expect(app.page.locator(sel), sel).toBeHidden();
    const inRow = await app.page.evaluate(() => { const b = document.querySelector(".month.all").getBoundingClientRect(),
      r = document.querySelector(".season-months").getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1; });
    expect(inRow).toBe(true);
    // chữ hiển thị (innerText) là bản rút gọn; textContent vẫn chứa cả phần ẩn trên màn hình nhỏ
    expect(await app.page.locator(".season-title").innerText()).toMatch(/Tháng 11 đi đâu\? · 6 nơi đang đẹp$/);
  });

  test("vùng chạm ≥ 40px", async ({ app }) => {
    const sizes = await app.page.evaluate(() => Object.fromEntries(
      [".chip", ".theme-auto", ".season-bar .mode-btn", ".month:not(.all)", ".day-night-switch"].map(s => [s, Math.round(document.querySelector(s).getBoundingClientRect().height)])));
    for (const [sel, h] of Object.entries(sizes)) expect(h, sel).toBeGreaterThanOrEqual(26);
    for (const sel of [".chip", ".theme-auto", ".season-bar .mode-btn", ".month:not(.all)"]) expect(sizes[sel], sel).toBeGreaterThanOrEqual(40);
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
  test.describe("320×640", () => {
    test.use({ viewport: { width: 320, height: 640 } });
    test("màn hình hẹp nhất: không cuộn ngang", async ({ app }) => {
      expect(await app.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    });
  });
});
