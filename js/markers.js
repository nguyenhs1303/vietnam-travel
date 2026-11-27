// Tạo marker cho từng địa danh (ảnh tròn + huy hiệu icon + tên) và popup riêng của nó.
// Cần: places.js, popup.js. Gán p.marker, p.popup cho mỗi phần tử của PLACES.
// Popup không gắn kiểu bindPopup: bấm marker gọi focusPlace() → openPlace() (máy tính mở popup, màn hình nhỏ mở bảng trượt).

// Tạo marker
PLACES.forEach((p, idx) => {
  const size = p.photo ? 44 : 36;
  const icon = L.divIcon({ className:"",
                           html: `<i class="leader" aria-hidden="true"></i>` +   // nét chỉ về vị trí thật khi marker bị dời (declutter.js)
                                 thumbHtml(p, "pin").replace("<span", `<span style="${catVars(p.cat)}"`) +
                                 `<div class="place-name">${p.name}</div>`,   // tên in nghiêng dưới ảnh
                           iconSize:[size, size], iconAnchor:[size / 2, size / 2], popupAnchor:[0, -size / 2] });
  p.marker = L.marker([p.lat, p.lng], { icon, title:p.name });
  // Nội dung popup là hàm → dựng lại mỗi lần mở (và khi thời tiết vừa tải xong)
  p.popup = L.popup({
      maxWidth: 280,
      // chừa chỗ cho thanh chọn tháng ở đáy bản đồ để popup không bị che
      autoPanPaddingTopLeft: [10, 10],
      autoPanPaddingBottomRight: [10, 140],
    }, p.marker).setContent(() => popupHtml(p, idx));
  p.marker.on("click", () => focusPlace(p, p.li, false));
  // Marker focus được bằng Tab (Leaflet) → Enter / Space để mở
  p.marker.on("keypress", e => {
    if (e.originalEvent.key !== "Enter" && e.originalEvent.key !== " ") return;
    e.originalEvent.preventDefault();
    focusPlace(p, p.li, false);
  });
});
