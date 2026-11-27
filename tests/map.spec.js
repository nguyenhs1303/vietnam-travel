// Bản đồ: xếp marker chồng nhau, đặt tên địa danh không đè nhau, trạng thái mùa, dòng thời gian lịch sử
const { test, expect } = require("./fixtures");

// Khoảng cách nhỏ nhất giữa tâm 2 ảnh marker + số tên đang hiện + số cặp tên đè nhau
const layout = app => app.page.evaluate(() => {
  const icons = [...document.querySelectorAll(".leaflet-marker-pane .leaflet-marker-icon")];
  const c = icons.map(i => { const r = i.querySelector(".pin").getBoundingClientRect(); return [(r.left + r.right) / 2, (r.top + r.bottom) / 2]; });
  let minD = Infinity;
  for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) minD = Math.min(minD, Math.hypot(c[i][0] - c[j][0], c[i][1] - c[j][1]));
  const rs = icons.map(i => i.querySelector(".place-name")).filter(n => !n.classList.contains("name-hidden")).map(n => n.getBoundingClientRect());
  let overlaps = 0;
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++)
    if (rs[i].left < rs[j].right && rs[j].left < rs[i].right && rs[i].top < rs[j].bottom && rs[j].top < rs[i].bottom) overlaps++;
  return { minD: Math.round(minD), names: rs.length, overlaps };
});

test.describe("Xếp marker & tên", () => {
  for (const zoom of [6, 7]) {
    test(`zoom ${zoom}: ảnh marker không chồng nhau, tên không đè nhau, hiện ≥ 10/16 tên`, async ({ app }) => {
      await app.page.evaluate(z => map.setZoom(z, { animate: false }), zoom);
      await app.page.waitForTimeout(500);
      const s = await layout(app);
      expect(s.minD).toBeGreaterThanOrEqual(zoom < 7 ? 36 : 44);
      expect(s.overlaps).toBe(0);
      expect(s.names).toBeGreaterThanOrEqual(10);
    });
  }
  test("marker bị dời có nét chỉ về vị trí thật", async ({ app }) => {
    const r = await app.page.evaluate(() => [...document.querySelectorAll(".leaflet-marker-icon")].filter(i => i.style.translate)
      .map(i => i.querySelector(".leader").style.width));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every(w => parseFloat(w) > 0)).toBe(true);
  });
  test("[review #6] chỗ đặt tên bên trái cách ảnh đủ xa để không tự va chạm", async ({ app }) => {
    await app.page.evaluate(() => map.setZoom(7, { animate: false }));
    const gap = await app.page.evaluate(() => {
      const el = PLACES[0].marker.getElement(), n = el.querySelector(".place-name");
      n.classList.remove("at-r", "at-t"); n.classList.add("at-l");
      return el.querySelector(".pin").getBoundingClientRect().left - n.getBoundingClientRect().right;
    });
    expect(gap).toBeGreaterThan(6);                                   // 3px + 3px lề va chạm trong declutter.js
  });
  test("tên bị ẩn vẫn hiện khi rê chuột vào marker", async ({ app }) => {
    const hidden = app.page.locator(".leaflet-marker-icon:has(.name-hidden)").first();
    test.skip(await hidden.count() === 0, "không có tên nào bị ẩn ở bố cục này");
    await hidden.hover();
    await expect(hidden.locator(".place-name")).toHaveCSS("opacity", "1");
  });
});

test.describe("Trạng thái mùa trên marker", () => {
  test("nơi ngoài mùa chỉ nhạt bớt; tên marker đọc kèm trạng thái mùa", async ({ app }) => {
    const off = app.page.locator(".leaflet-marker-icon.off-season .pin").first();
    expect(+(await off.evaluate(e => getComputedStyle(e).opacity))).toBeGreaterThanOrEqual(0.75);
    const labels = await app.page.evaluate(() => PLACES.map(p => p.marker.getElement().getAttribute("aria-label")));
    expect(labels.filter(l => l.endsWith(", đang mùa đẹp"))).toHaveLength(6);
    expect(labels.filter(l => l.endsWith(", ngoài mùa đẹp"))).toHaveLength(10);
  });
});

test.describe("Dòng thời gian lịch sử", () => {
  test("chuyển chế độ, nút trước / chạy / sau khác nhau, chạy ↔ dừng đổi nhãn", async ({ app }) => {
    await app.page.click(".season-bar .mode-btn");
    await expect(app.page.locator(".timeline-bar")).toBeVisible();
    await expect(app.page.locator(".season-bar")).toBeHidden();
    const icons = await app.page.evaluate(() => [".tl-prev", ".tl-play", ".tl-next"].map(s => document.querySelector(s).innerHTML));
    expect(new Set(icons).size).toBe(3);
    await app.page.click(".tl-play");
    await expect(app.page.locator(".tl-play")).toHaveAttribute("aria-label", "Dừng");
    await app.page.click(".tl-play");
    await expect(app.page.locator(".tl-play")).toHaveAttribute("aria-label", "Tự chạy");
  });
  test("thanh kéo đọc tên mốc; tên nơi của mốc luôn hiện; nút Mốc trước tắt ở mốc đầu", async ({ app }) => {
    await app.page.click(".season-bar .mode-btn");
    await app.page.waitForTimeout(1500);
    await expect(app.page.locator(".tl-range")).toHaveAttribute("aria-valuetext", /^TK IV: .+ \(mốc 1 trên \d+\)$/);
    await expect(app.page.locator(".tl-prev")).toBeDisabled();
    expect(await app.page.evaluate(() => !document.querySelector(".history-hot .place-name").classList.contains("name-hidden"))).toBe(true);
    await app.page.click(".tl-next");
    await app.page.waitForTimeout(1500);
    await expect(app.page.locator(".tl-range")).toHaveAttribute("aria-valuetext", /\(mốc 2 trên/);
  });
  test("popup mở từ dòng thời gian không bị thanh dòng thời gian che", async ({ app }) => {
    await app.page.click(".season-bar .mode-btn");
    await app.page.waitForTimeout(1500);
    await app.page.click(".tl-place");
    await app.page.waitForTimeout(1200);
    const hit = await app.page.evaluate(() => {
      const a = document.querySelector(".leaflet-popup-content-wrapper").getBoundingClientRect(), b = document.querySelector(".timeline-bar").getBoundingClientRect();
      return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    });
    expect(hit).toBe(false);
  });
});
