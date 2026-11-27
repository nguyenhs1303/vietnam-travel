// Logic thuần (chạy trong trang vì mã dùng biến toàn cục): đọc tháng, chấm điểm, tìm kiếm, mặt trời, lời khuyên, thông báo
const { test, expect } = require("./fixtures");

test.describe("parseMonths — đọc tháng mùa đẹp từ chuỗi best", () => {
  const cases = [
    ["Tháng 2–4", [2, 3, 4]],
    ["Tháng 3–5, 9–11", [3, 4, 5, 9, 10, 11]],
    ["Tháng 11–3", [1, 2, 3, 11, 12]],                       // vắt qua năm mới
    ["Tháng 9–11 (lúa chín tháng 9–10)", [9, 10, 11]],       // bỏ ghi chú trong ngoặc
    ["Tháng 12", [12]],
    ["Tháng 13–14", []],                                       // số tháng sai thì bỏ qua
  ];
  for (const [input, want] of cases) {
    test(`"${input}"`, async ({ app }) => {
      const got = await app.page.evaluate(s => [...parseMonths(s)].sort((a, b) => a - b), input);
      expect(got).toEqual(want);
    });
  }
  test("mọi địa danh trong data.js đều đọc được ít nhất một tháng", async ({ app }) => {
    const empty = await app.page.evaluate(() => PLACES.filter(p => !p.months.size).map(p => p.name));
    expect(empty).toEqual([]);
  });
});

test.describe("scorePlace — chấm điểm Đẹp nhất lúc này", () => {
  const score = (app, place, daily) => app.page.evaluate(([n, d]) => {
    const p = PLACES.find(x => x.name.includes(n));
    return scorePlace({ ...p, weather: { daily: d } });
  }, [place, daily]);
  const dry = { weather_code: [0, 1, 0], precipitation_probability_max: [0, 5, 0], temperature_2m_max: [25, 26, 25], temperature_2m_min: [18, 18, 17] };

  test("đang mùa + khô ráo + dễ chịu → Rất nên đi", async ({ app }) => {
    const r = await score(app, "Đồng Văn", dry);                // Đồng Văn đẹp tháng 10–12 → tháng 11 đang mùa
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.verdict).toBe("Rất nên đi");
    expect(r.reasons).toContain("đang mùa đẹp");
  });
  test("có dông bị trừ điểm và ghi lý do", async ({ app }) => {
    const storm = { ...dry, weather_code: [95, 95, 1], precipitation_probability_max: [90, 80, 30] };
    const [a, b] = [await score(app, "Đồng Văn", dry), await score(app, "Đồng Văn", storm)];
    expect(b.score).toBeLessThan(a.score - 30);
    expect(b.reasons).toContain("có dông");
  });
  test("biển cần trời ấm hơn mới tắm được", async ({ app }) => {
    const cool = { ...dry, temperature_2m_max: [22, 22, 22] };
    const r = await score(app, "Phú Quốc", cool);
    expect(r.reasons.join(" ")).toMatch(/lạnh/);
  });
  test("điểm luôn nằm trong 0–100; chưa có thời tiết thì trả về null", async ({ app }) => {
    const worst = { weather_code: [99, 99, 99], precipitation_probability_max: [100, 100, 100], temperature_2m_max: [45, 45, 45], temperature_2m_min: [40, 40, 40] };
    expect((await score(app, "Huế", worst)).score).toBeGreaterThanOrEqual(0);
    expect(await app.page.evaluate(() => scorePlace({ ...PLACES[0], weather: null }))).toBeNull();
  });
});

test("norm — tìm kiếm không dấu, đ → d, không phân biệt hoa thường", async ({ app }) => {
  const r = await app.page.evaluate(() => [norm("Phở Đà Lạt"), norm("ĐỒNG VĂN"), norm("Huế")]);
  expect(r).toEqual(["pho da lat", "dong van", "hue"]);
});

test("sunTimes — mặt trời mọc / lặn ở Huế cuối tháng 11 khoảng 6h và 17h", async ({ app }) => {
  const { rise, set } = await app.page.evaluate(() => {
    const t = sunTimes(new Date("2026-11-27T05:00:00Z"), ...SUN_REF);
    return { rise: vnTime(t.rise), set: vnTime(t.set) };
  });
  expect(rise).toMatch(/^0[56]:\d\d$/);
  expect(set).toMatch(/^17:\d\d$/);
});

test("weatherTips — tối đa 2 lời khuyên, đúng theo nhiệt độ / mưa / gió", async ({ app }) => {
  const tips = await app.page.evaluate(() => {
    const p = PLACES.find(x => x.cat === "beach");
    return {
      cold: weatherTips(p, { temperature_2m: 10, weather_code: 61, wind_speed_10m: 35, is_day: 1 }),
      nice: weatherTips(p, { temperature_2m: 25, weather_code: 1, wind_speed_10m: 5, is_day: 1 }),
    };
  });
  expect(tips.cold).toHaveLength(2);
  expect(tips.cold[0]).toMatch(/lạnh/);
  expect(tips.cold[1]).toMatch(/mưa/);
  expect(tips.nice).toEqual(["👍 Thời tiết dễ chịu, hợp để tham quan"]);
});

test("[review #9] announce — câu mới huỷ câu cũ chưa kịp đọc, không bao giờ đọc câu cũ sau câu mới", async ({ app }) => {
  await app.page.evaluate(() => { announce("A", 30); setTimeout(() => announce("B"), 10); });
  await app.page.waitForTimeout(400);
  expect(await app.said()).toEqual(["B"]);
});
