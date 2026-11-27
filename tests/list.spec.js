// Thanh bên: tìm kiếm, lọc theo loại, sắp theo mùa, khung "Không tìm thấy", chọn địa danh
const { test, expect } = require("./fixtures");

const names = app => app.page.evaluate(() => [...document.querySelectorAll("#list .row b")].map(b => b.textContent));

test.describe("Tìm kiếm", () => {
  for (const [q, want] of [["da lat", "Đà Lạt"], ["dong van", "Cao nguyên đá Đồng Văn"], ["HUẾ", "Cố đô Huế"],
                           ["can tho", "Chợ nổi Cái Răng"], ["pho", "Hồ Hoàn Kiếm & Phố cổ"]]) {
    test(`gõ "${q}" (không dấu / hoa thường) tìm ra ${want}`, async ({ app }) => {
      await app.type(q);
      expect(await names(app)).toContain(want);
    });
  }
  test("tìm theo tên món ăn", async ({ app }) => {
    const dish = await app.page.evaluate(() => PLACES.find(p => p.foods?.length).foods[0][0]);
    await app.type(dish);
    expect((await names(app)).length).toBeGreaterThan(0);
  });
  test("marker của nơi không khớp bị gỡ khỏi bản đồ", async ({ app }) => {
    await app.type("hội an");
    const onMap = await app.page.evaluate(() => PLACES.filter(p => map.hasLayer(p.marker)).map(p => p.name));
    expect(onMap).toEqual(["Phố cổ Hội An"]);
  });
});

test.describe("Lọc theo loại", () => {
  test("chip lọc đúng loại, báo aria-pressed, có tên nhóm", async ({ app }) => {
    await app.page.click(".chip >> text=Biển đảo");
    const cats = await app.page.evaluate(() => [...new Set([...document.querySelectorAll("#list li")].map(li => PLACES.find(p => p.li === li).cat))]);
    expect(cats).toEqual(["beach"]);
    await expect(app.page.locator(".chip >> text=Biển đảo")).toHaveAttribute("aria-pressed", "true");
    await expect(app.page.locator(".chip >> text=Tất cả")).toHaveAttribute("aria-pressed", "false");
    await expect(app.page.locator("#filters")).toHaveAttribute("aria-label", "Lọc theo loại");
  });
  test("chip đang chọn giữ nền đậm khi rê chuột (chữ trắng không mất)", async ({ app }) => {
    const chip = app.page.locator(".chip >> text=Thiên nhiên");
    await chip.click();
    await chip.hover();
    const bg = await chip.evaluate(e => getComputedStyle(e).backgroundColor);
    expect(bg).not.toMatch(/rgb\(2[2-5]\d, 2[2-5]\d, 2[2-5]\d\)/);   // không phải nền nhạt
  });
});

test.describe("Không tìm thấy", () => {
  test("hiện thông báo + gợi ý, nút xoá đưa danh sách về đủ 16 nơi", async ({ app }) => {
    await app.page.click(".chip >> text=Đô thị");
    await app.type("xyz <b>");
    const box = app.page.locator("#list-empty");
    await expect(box).toBeVisible();
    await expect(box).toContainText("Không tìm thấy nơi nào khớp “xyz <b>” trong mục Đô thị");   // chữ người dùng gõ không bị hiểu thành HTML
    await box.getByRole("button", { name: "Xoá tìm kiếm & bộ lọc" }).click();
    await expect(app.page.locator("#list li")).toHaveCount(16);
    await expect(box).toBeHidden();
    await expect(app.page.locator("#search")).toBeFocused();
    await expect(app.page.locator(".chip >> text=Tất cả")).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Theo mùa", () => {
  test("tháng đang chọn: nơi đang mùa lên đầu, có nhãn ✨, nơi ngoài mùa vẫn đọc rõ", async ({ app }) => {
    const rows = await app.page.evaluate(() => [...document.querySelectorAll("#list li")].map(li => ({ hot: !!li.querySelector(".tag"), off: li.classList.contains("off") })));
    const firstOff = rows.findIndex(r => r.off);
    expect(rows.slice(0, firstOff).every(r => r.hot)).toBe(true);
    expect(rows.slice(firstOff).every(r => r.off)).toBe(true);
    expect(rows.filter(r => r.hot)).toHaveLength(6);                     // tháng 11
    const opacity = await app.page.locator("#list li.off b").first().evaluate(e => getComputedStyle(e.closest("li")).opacity);
    expect(opacity).toBe("1");                                           // chỉ làm nhạt ảnh, không làm nhạt chữ
  });
  test("chọn tháng 3 đổi tiêu đề, số nơi và thứ tự", async ({ app }) => {
    await app.page.click('.month[data-m="3"]');
    await expect(app.page.locator(".season-title")).toContainText("Tháng 3 đi đâu?");
    const n = await app.page.evaluate(() => PLACES.filter(p => p.months.has(3)).length);
    await expect(app.page.locator("#list .tag")).toHaveCount(n);
  });
});

test.describe("Chọn địa danh", () => {
  test("mỗi dòng là một nút: Tab tới được, Enter mở thông tin", async ({ app }) => {
    await app.page.focus("#list li:nth-child(1) .row");
    await app.page.keyboard.press("Tab");
    await expect(app.page.locator("#list li:nth-child(2) .row")).toBeFocused();
    await app.page.keyboard.press("Enter");
    await app.page.waitForTimeout(2500);
    const name = await app.page.locator("#list li:nth-child(2) .row b").textContent();
    expect(await app.isOpen(name)).toBe(true);
  });
  test("bấm một nơi: bay tới zoom 7 (vẫn là bản đồ giấy, không chuyển nền OSM)", async ({ app }) => {
    await app.page.click("#list li:last-child .row");
    await app.page.waitForTimeout(2500);
    expect(await app.page.evaluate(() => [map.getZoom(), map.hasLayer(osm)])).toEqual([7, false]);
  });
  test("chọn một nơi khi bản đồ đang trượt (quán tính sau khi kéo) → mở sau khi bay tới, không mở lúc vừa cất cánh", async ({ app }) => {
    const i = await app.idx("Cái Răng");
    await app.page.evaluate(i => { map.panBy([300, 0], { duration: 1 }); focusPlace(PLACES[i], PLACES[i].li, true); }, i);
    await app.page.waitForTimeout(150);
    expect(await app.isOpen("Cái Răng"), "chưa được mở khi vừa cất cánh").toBe(false);
    await app.page.waitForTimeout(2500);
    expect(await app.isOpen("Cái Răng")).toBe(true);
    expect(await app.page.evaluate(() => map.getZoom())).toBe(7);
  });
  test("[review #10] chọn A rồi chọn ngay B khi chưa bay xong → chỉ mở B", async ({ app }) => {
    await app.page.evaluate(() => { window.__opened = []; map.on("popupopen", e => __opened.push(PLACES.find(p => p.popup === e.popup).name)); });
    const [a, b] = [await app.idx("Đồng Văn"), await app.idx("Cái Răng")];
    await app.page.evaluate(i => focusPlace(PLACES[i], PLACES[i].li, true), a);
    await app.page.waitForTimeout(250);
    await app.page.evaluate(i => focusPlace(PLACES[i], PLACES[i].li, true), b);
    await app.page.waitForTimeout(3000);
    expect(await app.page.evaluate(() => __opened)).toEqual(["Chợ nổi Cái Răng"]);
  });
});
