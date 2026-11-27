// Chữ: cỡ tối thiểu theo từng font, Playfair chỉ dùng ở cỡ lớn, chữ số dữ liệu đều chiều cao, số không tách khỏi đơn vị
const { test, expect, iPhone13 } = require("./fixtures");

// Quy tắc (EB Garamond có chữ thường thấp — x-height 0,41 — nên cần cỡ lớn hơn font thường để đọc được):
//   EB Garamond thẳng ≥ 13px · EB Garamond nghiêng ≥ 14px · Playfair Display ≥ 18px (nét thanh rất mảnh khi nhỏ)
// Bỏ qua chữ trang trí trên bản đồ (lớp nhãn, la bàn — aria-hidden) và chữ chỉ cho trình đọc màn hình.
const typeViolations = app => app.page.evaluate(() => {
  const bad = [];
  document.querySelectorAll("body *").forEach(e => {
    if (![...e.childNodes].some(n => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent))) return;
    const r = e.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
    if (e.closest('[hidden], [aria-hidden="true"], .sr-only, .skip-links, svg')) return;
    const cs = getComputedStyle(e);
    if (cs.visibility === "hidden" || +cs.opacity === 0) return;
    const fam = cs.fontFamily.split(",")[0].replace(/"/g, "").trim(), size = parseFloat(cs.fontSize);
    const min = e.closest(".leaflet-control-attribution, .credit") ? 12          // dòng ghi nguồn (chữ ghi chú pháp lý)
              : fam === "Playfair Display" ? 18 : cs.fontStyle === "italic" ? 14 : 13;
    if (size < min) bad.push(`${(e.className || e.tagName).toString().split(" ")[0]} "${e.textContent.trim().slice(0, 16)}" ${fam}${cs.fontStyle === "italic" ? " nghiêng" : ""} ${size}px < ${min}`);
  });
  return [...new Set(bad)];
});
// Chữ số trong Playfair phải là kiểu đều chiều cao (lining) — mặc định của Playfair là oldstyle (cao thấp như chữ thường)
const oldstyleDigits = app => app.page.evaluate(() => [...document.querySelectorAll("body *")].filter(e => {
  if (![...e.childNodes].some(n => n.nodeType === 3 && /\d/.test(n.textContent))) return false;
  const cs = getComputedStyle(e);
  return cs.fontFamily.startsWith('"Playfair Display"') && !cs.fontVariantNumeric.includes("lining-nums") && e.getBoundingClientRect().width;
}).map(e => `${(e.className || e.tagName).toString().split(" ")[0]} "${e.textContent.trim().slice(0, 12)}"`));

const states = {
  "trang đầu": async () => {},
  "popup mở": async app => app.open("Hội An"),
  "chế độ lịch sử": async app => { await app.page.click(".season-bar .mode-btn"); await app.page.waitForTimeout(1500); },
};

test.describe("[font #1 #3] cỡ chữ tối thiểu — máy tính", () => {
  for (const [name, go] of Object.entries(states)) {
    test(name, async ({ app }) => {
      await go(app);
      expect(await typeViolations(app)).toEqual([]);
    });
  }
});
test.describe("[font #1 #3] cỡ chữ tối thiểu — iPhone 13", () => {
  test.use({ ...iPhone13 });
  test("trang đầu (mở hàng tháng)", async ({ app }) => {
    await app.page.getByRole("button", { name: "Chọn tháng" }).tap();
    expect(await typeViolations(app)).toEqual([]);
  });
  test("bảng trượt", async ({ app }) => {
    await app.open("Hội An");
    expect(await typeViolations(app)).toEqual([]);
  });
  test("chế độ lịch sử, mở đoạn mô tả", async ({ app }) => {
    await app.page.tap(".season-bar .mode-btn"); await app.page.waitForTimeout(1500);
    await app.page.getByRole("button", { name: "Đọc thêm" }).tap();
    expect(await typeViolations(app)).toEqual([]);
  });
});
test.describe("[font #1 #3] cỡ chữ tối thiểu — iPad dọc, 320px", () => {
  for (const viewport of [{ width: 768, height: 1024 }, { width: 320, height: 568 }]) {
    test.describe(`${viewport.width}×${viewport.height}`, () => {
      test.use({ viewport, isMobile: true, hasTouch: true });
      test("trang đầu + chế độ lịch sử", async ({ app }) => {
        expect(await typeViolations(app)).toEqual([]);
        await app.page.tap(".season-bar .mode-btn"); await app.page.waitForTimeout(1500);
        expect(await typeViolations(app)).toEqual([]);
      });
    });
  }
});

test("[font #2] chữ số trong Playfair (điểm, nhiệt độ, đồng hồ, năm) đều chiều cao", async ({ app }) => {
  await app.open("Hội An");
  expect(await oldstyleDigits(app)).toEqual([]);
  await app.page.evaluate(() => closePlace());
  await app.page.click(".season-bar .mode-btn"); await app.page.waitForTimeout(1500);
  expect(await oldstyleDigits(app)).toEqual([]);
  // đồng hồ vẫn giữ chữ số đều bề rộng (không nhảy khi đổi phút)
  expect(await app.page.locator(".clock-time").evaluate(e => getComputedStyle(e).fontVariantNumeric)).toMatch(/tabular-nums/);
});

test("[font #5] số không bị ngắt dòng khỏi đơn vị (12 km/h, 70%, 23°)", async ({ app }) => {
  await app.open("Hội An");
  const t = await app.page.locator(".leaflet-popup .wx-desc small").textContent();
  expect(t).toMatch(/Gió \d+ km\/h/);
  expect(t).toMatch(/Ẩm \d+%/);
  expect(t).toMatch(/Cảm giác \d+°/);
});
