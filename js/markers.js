// Tạo marker cho từng địa danh (ảnh tròn + huy hiệu icon + tên) và gắn popup.
// Cần: places.js, popup.js. Gán p.marker cho mỗi phần tử của PLACES.

// Tạo marker
PLACES.forEach((p, idx) => {
  const size = p.photo ? 44 : 36;
  const icon = L.divIcon({ className:"",
                           html: thumbHtml(p, "pin").replace("<span", `<span style="${catVars(p.cat)}"`) +
                                 `<div class="place-name">${p.name}</div>`,   // tên in nghiêng dưới ảnh
                           iconSize:[size, size], iconAnchor:[size / 2, size / 2], popupAnchor:[0, -size / 2] });
  // Nội dung popup là hàm → dựng lại mỗi lần mở (và khi thời tiết vừa tải xong)
  p.marker = L.marker([p.lat, p.lng], { icon, title:p.name }).bindPopup(() => popupHtml(p, idx), {
      maxWidth: 280,
      // chừa chỗ cho thanh chọn tháng ở đáy bản đồ để popup không bị che
      autoPanPaddingTopLeft: [10, 10],
      autoPanPaddingBottomRight: [10, matchMedia("(max-width:760px)").matches ? 10 : 140],
    });
  p.marker.on("click", () => p.li && focusPlace(p, p.li, false));
});
