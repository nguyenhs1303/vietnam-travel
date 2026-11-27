// Khởi tạo bản đồ Leaflet + vẽ bản đồ giấy (sóng ven bờ, đất liền, láng giềng, lãnh hải, sông, lưới, chữ, núi)
// và chuyển sang nền OSM nhuộm sepia khi phóng to sâu / thu nhỏ ra ngoài vùng giấy.
// Cần: Leaflet, PAPER_DATA (data/paper-data.js), VN_BORDER (data/vietnam-border.js).
// Tạo ra: map, paperLayers, toLatLng, osm, updatePaperDetail()

// ===== Bản đồ giấy kiểu atlas cổ màu sepia =====
// Zoom 5–8: tự vẽ từ PAPER_DATA (data/paper-data.js). Zoom ≥ 9 hoặc ≤ 4: nền OpenStreetMap nhuộm sepia.
// Màu bản đồ do CSS quyết định (biến --ink, --land, --sea… trong css/base.css, css/theme.css, css/night.css) để đổi được giữa ngày và đêm.
// Màu truyền cho Leaflet dưới đây chỉ là giá trị mặc định; className của từng lớp mới là thứ CSS bám vào.
const SEA = "#f1e5c8";
const toLatLng = ring => ring.map(([lng, lat]) => [lat, lng]);

const map = L.map("map", { zoomControl:true }).setView([16.3, 106.5], 6);
map.attributionControl.setPrefix("").addAttribution(
  'Dữ liệu: Natural Earth · © OpenStreetMap contributors · Thời tiết: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>');

// Các lớp giấy xếp chồng (dưới → trên); popup/marker của Leaflet vẫn nằm trên cùng
[["ripple", 300], ["osm", 305], ["land", 310], ["neighbors", 325], ["water", 330], ["grid", 335], ["labels", 450]]
  .forEach(([name, z]) => { map.createPane(name).style.zIndex = z; });
map.getPane("labels").style.pointerEvents = "none";
const paperSvg = pane => L.svg({ pane, padding: 0.5 });
// Riêng lớp sóng ven bờ vẽ bằng Canvas: nét rất dày chạy dọc mọi bờ biển, vẽ bằng SVG làm lần kéo bản đồ đầu tiên bị giật;
// Canvas vẽ một lần thành ảnh, kéo bản đồ chỉ dịch ảnh đó đi.
const R = { ripple: L.canvas({ pane: "ripple", padding: 0.5 }), land: paperSvg("land"), nb: paperSvg("neighbors"),
            water: paperSvg("water"), grid: paperSvg("grid") };
const paperLayers = L.layerGroup().addTo(map);

const vnRings = PAPER_DATA.vn.map(toLatLng);
const nbRings = PAPER_DATA.neighbors.map(toLatLng);

// Sóng ven bờ: viền đất vẽ nhiều lần dày → mỏng, xen kẽ màu sóng / màu giấy → các đường sóng song song
// (5 lớp → 3 đường sóng; trước là 7 lớp/4 đường — bớt 2 lớp nét dày phủ khắp bản đồ cho nhẹ)
// Chỉ vẽ sóng cho bờ biển quanh Việt Nam (bỏ các đảo xa như Indonesia, Philippines phía nam/đông) → ít điểm hơn, vẽ lại nhanh hơn
const RIPPLE_BOX = L.latLngBounds([4, 97], [27, 122]);
const rippleRings = [...vnRings, ...nbRings].filter(r => RIPPLE_BOX.intersects(L.latLngBounds(r)));
const rippleLayers = [[30, "#9aa59a", .5], [26, SEA, 1], [17, "#8c9a8f", .6], [13, SEA, 1], [6, "#7f8f86", .55]]
  .map(([w, color, opacity]) => {
    const layer = L.polygon(rippleRings, { renderer: R.ripple, pane: "ripple", weight: w, color, opacity,
      fill: false, interactive: false, lineJoin: "round" });
    layer.isGap = color === SEA;                  // lớp "giấy" che bớt, tạo khoảng hở giữa các đường sóng
    paperLayers.addLayer(layer);
    return layer;
  });
// Canvas không theo CSS → lấy màu từ biến CSS (--ripple, --sea) mỗi khi đổi ngày/đêm (gọi từ applyTheme trong theme.js)
function paintRipples() {
  const cs = getComputedStyle(document.body);
  const line = cs.getPropertyValue("--ripple").trim(), sea = cs.getPropertyValue("--sea").trim();
  rippleLayers.forEach(l => l.setStyle({ color: l.isGap ? sea : line }));
}

// Nước láng giềng: giấy gạch chéo, nét mảnh, không ghi tên
paperLayers.addLayer(L.polygon(nbRings, { renderer: R.nb, pane: "neighbors", fillColor: "url(#hatch)", fillOpacity: 1,
  color: "#a08a62", weight: 0.8, interactive: false, className: "nb-land" }));

// Đất liền Việt Nam (gồm Hoàng Sa, Trường Sa): màu son vàng, viền mực run tay
paperLayers.addLayer(L.polygon(vnRings, { renderer: R.land, pane: "land", fillColor: "#e7c98f", fillOpacity: 0.8,
  color: "#4a2f17", weight: 1.4, interactive: false, className: "vn-land" }));

// Đường lãnh hải (ranh giới OSM, data/vietnam-border.js) — nét chấm mảnh ngoài khơi
if (typeof VN_BORDER !== "undefined") {
  const territorial = VN_BORDER.map(p => toLatLng(p[0])).filter(r => !r.every(([, lng]) => lng > 110));
  paperLayers.addLayer(L.polygon(territorial, { renderer: R.grid, pane: "grid", fill: false, color: "#7a5a35",
    weight: 0.8, dashArray: "1 4", opacity: 0.7, interactive: false, className: "territorial" }));
}

// Sông: nét mực xanh, sông lớn đậm hơn
PAPER_DATA.rivers.forEach(r => paperLayers.addLayer(
  L.polyline(toLatLng(r.line), { renderer: R.water, pane: "water", color: "#4d6b78", opacity: 0.85, lineCap: "round",
    weight: r.rank <= 2 ? 1.9 : r.rank <= 6 ? 1.5 : 1.1, interactive: false, className: "river" })));

// Lưới kinh – vĩ tuyến 2°
const gridLine = pts => paperLayers.addLayer(L.polyline(pts, { renderer: R.grid, pane: "grid", color: "#8b6b43",
  weight: 0.6, opacity: 0.35, dashArray: "2 5", interactive: false, className: "grid-line" }));
for (let lat = -6; lat <= 34; lat += 2) gridLine([[lat, 86], [lat, 134]]);
for (let lng = 86; lng <= 134; lng += 2) gridLine([[-8, lng], [36, lng]]);

// Nhãn chữ trên giấy
const paperLabel = (latlng, html, cls, rotate = 0) => paperLayers.addLayer(
  L.marker(latlng, { pane: "labels", interactive: false, keyboard: false,
    icon: L.divIcon({ className: "", iconSize: [0, 0],
      html: `<div class="lbl ${cls}" style="transform:translate(-50%,-50%) rotate(${rotate}deg)">${html}</div>` }) }));

for (let lat = 8; lat <= 24; lat += 4) paperLabel([lat, 100.6], `${lat}°B`, "deg");
for (let lng = 102; lng <= 118; lng += 4) paperLabel([25.0, lng], `${lng}°Đ`, "deg");
paperLabel([14.1, 113.6], "B I Ể N &nbsp; Đ Ô N G", "sea-big", -8);
paperLabel([19.9, 107.75], "Vịnh<br>Bắc Bộ", "sea-small");
paperLabel([9.6, 102.9], "Vịnh<br>Thái Lan", "sea-small");
// Quần đảo Hoàng Sa / Trường Sa: tên in nghiêng cạnh cụm đảo
paperLabel([17.25, 111.95], "Quần đảo Hoàng Sa", "isl");
paperLabel([11.7, 114.4], "Quần đảo Trường Sa", "isl");
paperLabel([21.35, 105.0], "Sông Hồng", "river-lbl", -35);
paperLabel([21.0, 103.75], "Sông Đà", "river-lbl", -30);
paperLabel([10.35, 105.55], "Sông Cửu Long", "river-lbl", -35);

// Ký hiệu núi vẽ tay theo các dãy chính
const MOUNTAIN_SVG = `<svg viewBox="0 0 30 20" width="26" height="17"><path d="M1 19 L10 4 L15 11 L19 6 L29 19" class="m-body" stroke-width="1.3" stroke-linejoin="round"/><path d="M10 4 L12 19 M10 4 L8 9 M19 6 L21 19 M10 8 L13 19 M19 9 L23 19" class="m-hatch" stroke-width=".6" opacity=".55"/></svg>`;
[
  [22.4, 103.7], [22.15, 104.0], [22.62, 103.45], [21.9, 104.25],            // Hoàng Liên Sơn
  [21.45, 103.55], [21.15, 103.95], [21.8, 103.15],                          // Tây Bắc
  [22.95, 105.45], [22.65, 106.05], [23.15, 105.05],                         // Đông Bắc
  [19.55, 104.65], [18.75, 105.35], [17.95, 105.95], [17.2, 106.45],         // Trường Sơn Bắc
  [16.35, 107.35], [15.15, 107.85], [14.45, 108.15], [13.55, 108.25],        // Trường Sơn Nam
  [12.6, 108.35], [12.05, 108.45], [11.6, 107.75],                           // Tây Nguyên
].forEach(ll => paperLabel(ll, MOUNTAIN_SVG, "mtn"));
paperLabel([22.33, 103.6], "Dãy Hoàng Liên Sơn", "range", -38);
paperLabel([16.9, 106.0], "Dãy Trường Sơn", "range", -55);


// Phương án B: zoom ≥ 9 (hoặc thu nhỏ ra ngoài vùng giấy, ≤ 4) dùng nền OSM nhuộm sepia
const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { pane: "osm", maxZoom: 19, className: "osm-sepia" });
function updatePaperDetail() {
  const z = map.getZoom(), el = map.getContainer();
  const t = z <= 4 ? 1 : Math.max(0, Math.min(1, (z - 7) / 2));    // z 5–7: 0 · z 8: 0.5 · z ≥ 9: 1
  if (t > 0 && !map.hasLayer(osm)) osm.addTo(map);                   // chỉ tải ô bản đồ khi cần
  if (t === 0 && map.hasLayer(osm)) map.removeLayer(osm);
  osm.setOpacity(t);
  el.classList.toggle("detail", z >= 9);          // đất vẽ tay trong suốt để thấy đường phố
  el.classList.toggle("world", z <= 4);           // ngoài vùng giấy: ẩn lớp giấy, chỉ còn nền OSM sepia
  el.classList.toggle("far", z < 7);              // xa: ảnh nhỏ lại, ẩn tên địa danh
}
map.on("zoomend", updatePaperDetail);
updatePaperDetail();
