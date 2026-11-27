// Popup thông tin địa danh (máy tính): tab, thời tiết, vị trí tránh các khung, focus bàn phím
const { test, expect } = require("./fixtures");

const popup = app => app.page.locator(".leaflet-popup");
const selectedTab = app => app.page.locator(".leaflet-popup .ptab[aria-selected=true]");

test.describe("Nội dung & tab", () => {
  test("mặc định mở tab Thời tiết, có điểm + 3 ngày dự báo", async ({ app }) => {
    await app.open("Hạ Long");
    await expect(selectedTab(app)).toHaveAttribute("data-tab", "wx");
    await expect(popup(app).locator(".score-badge")).toBeVisible();
    await expect(popup(app).locator(".wx-days > div")).toHaveCount(3);
  });
  test("phím ← → đổi tab; ô nội dung focus được để cuộn bằng phím", async ({ app }) => {
    await app.open("Hội An");
    await app.page.focus(".leaflet-popup .ptab[aria-selected=true]");
    await app.page.keyboard.press("ArrowRight");
    await expect(selectedTab(app)).toHaveAttribute("data-tab", "info");
    await app.page.keyboard.press("ArrowLeft");
    await app.page.keyboard.press("ArrowLeft");
    await expect(selectedTab(app)).toHaveAttribute("data-tab", "food");          // vòng về tab cuối
    const panels = await popup(app).locator("[role=tabpanel]").evaluateAll(ps => ps.map(p => p.tabIndex));
    expect(panels.every(t => t === 0)).toBe(true);
  });
  test("tiêu đề là h2, nút đóng ghi tiếng Việt và đủ lớn", async ({ app }) => {
    await app.open("Đà Lạt");
    await expect(popup(app).getByRole("heading", { level: 2, name: "Đà Lạt" })).toBeVisible();
    const close = popup(app).locator(".leaflet-popup-close-button");
    await expect(close).toHaveAttribute("aria-label", "Đóng");
    expect((await close.boundingBox()).width).toBeGreaterThanOrEqual(32);
  });
});

test.describe("Thời tiết lỗi", () => {
  test.use({ weather: "fail" });
  test("mở tab Giới thiệu thay vì ô trống; Thử lại tải được thì hiện thời tiết, popup không đóng", async ({ app }) => {
    await app.open("Hạ Long");
    await expect(selectedTab(app)).toHaveAttribute("data-tab", "info");
    await popup(app).locator(".ptab[data-tab=wx]").click();
    app.setWeather("ok");
    await popup(app).getByRole("button", { name: "Thử lại" }).click();
    await expect(popup(app).locator(".wx-temp")).toBeVisible();
    await expect(selectedTab(app)).toHaveAttribute("data-tab", "wx");
  });
});

test.describe("Vị trí", () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }]) {
    test.describe(`${viewport.width}×${viewport.height}`, () => {
      test.use({ viewport });
      test("popup của cả 16 nơi không đè lên khung nào trên bản đồ và nằm gọn trong bản đồ", async ({ app }) => {
        test.setTimeout(120_000);
        const bad = [];
        for (let i = 0; i < 16; i++) {
          await app.page.evaluate(() => { closePlace(); map.setView([16.3, 106.5], 6, { animate: false }); });
          await app.page.evaluate(i => focusPlace(PLACES[i], PLACES[i].li, true), i);
          await app.page.waitForTimeout(2200);
          const r = await app.page.evaluate(i => {
            const pop = document.querySelector(".leaflet-popup-content-wrapper");
            if (!pop) return { name: PLACES[i].name, err: "không mở" };
            const a = pop.getBoundingClientRect(), box = map.getContainer().getBoundingClientRect();
            const hits = [...document.querySelectorAll(".leaflet-control")].filter(c => { const b = c.getBoundingClientRect();
              return b.height && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; }).map(c => c.className.split(" ")[0]);
            const out = a.top < box.top - 1 || a.bottom > box.bottom + 1;
            return hits.length || out ? { name: PLACES[i].name, hits, out } : null;
          }, i);
          if (r) bad.push(r);
        }
        expect(bad).toEqual([]);
      });
    });
  }
  test("marker bị dời khỏi chỗ chồng nhau: mũi popup chỉ đúng marker", async ({ app }) => {
    await app.page.evaluate(() => map.setZoom(7, { animate: false }));
    await app.page.waitForTimeout(500);
    const moved = app.page.locator('.leaflet-marker-pane .leaflet-marker-icon[style*="translate:"]').first();
    await moved.click();
    await app.page.waitForTimeout(900);
    const dx = await app.page.evaluate(() => {
      const tip = document.querySelector(".leaflet-popup-tip-container").getBoundingClientRect();
      const pin = PLACES.find(p => p.popup.isOpen()).marker.getElement().querySelector(".pin").getBoundingClientRect();
      return Math.abs((tip.left + tip.right) / 2 - (pin.left + pin.right) / 2);
    });
    expect(dx).toBeLessThanOrEqual(3);
  });
});

test.describe("Focus bàn phím", () => {
  test("mở từ danh sách: focus vào tiêu đề; Esc (ở bất cứ đâu) đóng và trả focus về dòng đã bấm", async ({ app }) => {
    await app.page.focus("#list li:nth-child(2) .row");
    await app.page.keyboard.press("Enter");
    await app.page.waitForTimeout(2500);
    await expect(app.page.locator(".leaflet-popup .place-title")).toBeFocused();
    await app.page.keyboard.press("Escape");
    await expect(popup(app)).toHaveCount(0);
    await expect(app.page.locator("#list li:nth-child(2) .row")).toBeFocused();
  });
  test("mở từ marker bằng Enter, đóng bằng nút ✕ → focus về marker", async ({ app }) => {
    const marker = app.page.locator(".leaflet-marker-pane .leaflet-marker-icon").first();
    await marker.focus();
    await app.page.keyboard.press("Enter");
    await expect(app.page.locator(".leaflet-popup .place-title")).toBeFocused();
    await app.page.locator(".leaflet-popup-close-button").focus();
    await app.page.keyboard.press("Enter");
    await expect(marker).toBeFocused();
  });
  test("[review #7] đóng popup không nhảy về nút cũ từ lần mở trước", async ({ app }) => {
    await app.page.focus(".best-list li:nth-child(1) button");
    await app.page.keyboard.press("Enter");
    await app.page.waitForTimeout(2500);
    await app.page.click(".chip >> text=Tất cả");                    // focus sang chỗ khác, popup đóng
    await app.page.evaluate(() => { closePlace(); document.activeElement.blur(); openPlace(PLACES[5]); document.activeElement.blur(); map.closePopup(); });
    expect(await app.page.evaluate(() => !!document.activeElement.closest(".best-list"))).toBe(false);
  });
});

test.describe("Popup đang mở khi bản đồ / bộ lọc thay đổi", () => {
  test("[review #1] tìm kiếm ẩn mất nơi đang mở → popup đóng; nơi vẫn hiện thì giữ nguyên", async ({ app }) => {
    await app.open("Hạ Long");
    await app.type("Huế");
    expect(await app.isOpen("Hạ Long")).toBe(false);
    await app.type("");
    await app.open("Hạ Long");
    await app.type("hạ long");
    expect(await app.isOpen("Hạ Long")).toBe(true);
  });
  test("[review #2] zoom / đổi tháng không dựng lại popup: giữ focus và chỗ đang đọc", async ({ app }) => {
    await app.open("Hạ Long");
    await app.page.evaluate(() => { const pn = document.querySelector(".leaflet-popup .ppanel:not([hidden])");
      pn.style.height = "50px"; pn.scrollTop = 40; pn.__mark = 1; });
    await app.page.focus(".leaflet-popup .place-title");
    for (const z of [1, -1]) { await app.page.evaluate(z => map.setZoom(map.getZoom() + z), z); await app.page.waitForTimeout(700); }
    await expect(app.page.locator(".leaflet-popup .place-title")).toBeFocused();
    await app.page.evaluate(() => setMonth(3));
    const pn = await app.page.evaluate(() => { const p = document.querySelector(".leaflet-popup .ppanel:not([hidden])"); return [p.__mark, p.scrollTop]; });
    expect(pn).toEqual([1, 40]);
  });
  test("thời tiết làm mới (15 phút) giữ tab đang xem và vị trí cuộn", async ({ app }) => {
    await app.open("Hạ Long");
    await app.page.click(".leaflet-popup .ptab[data-tab=info]");
    await app.page.evaluate(() => { const pn = document.querySelector(".leaflet-popup .ppanel:not([hidden])"); pn.style.height = "40px"; });
    await app.page.evaluate(() => loadWeather());
    await app.page.waitForTimeout(400);
    await expect(selectedTab(app)).toHaveAttribute("data-tab", "info");
  });
});
