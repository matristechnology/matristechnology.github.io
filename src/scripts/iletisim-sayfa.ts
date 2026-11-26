// İletişim sayfası: adresi panoya kopyalama ve haritayı bölüm ekrana yaklaşınca yükleme.
// Betik kapalıyken adresler bağlantı olarak, harita yerine de "haritada aç" bağlantıları durur.
const kok = document.querySelector<HTMLElement>('[data-iletisim]');
if (kok) {
  const durum = kok.querySelector<HTMLElement>('[data-kopya-durum]');
  let sure = 0;
  for (const d of kok.querySelectorAll<HTMLButtonElement>('[data-kopyala]')) {
    d.addEventListener('click', async () => {
      const adres = d.dataset.kopyala ?? '';
      let oldu = false;
      try { await navigator.clipboard.writeText(adres); oldu = true; } catch { oldu = false; }
      if (!oldu) {
        // Pano izni yoksa adresi seçili bırak, ziyaretçi kendi kopyalar.
        const a = d.closest('[data-ulas]')?.querySelector('.ulas-adres');
        if (a) { const s = getSelection(), r = document.createRange(); r.selectNodeContents(a); s?.removeAllRanges(); s?.addRange(r); }
        return;
      }
      kok.dataset.kopyalanan = adres;
      d.textContent = kok.dataset.kopyalandi ?? ''; d.dataset.oldu = '';
      if (durum) durum.textContent = `${kok.dataset.kopyalandi}: ${adres}`;
      clearTimeout(sure);
      sure = window.setTimeout(() => {
        kok.querySelectorAll<HTMLButtonElement>('[data-kopyala][data-oldu]').forEach((x) => { x.textContent = x.dataset.yazi ?? ''; delete x.dataset.oldu; });
        if (durum) durum.textContent = '';
      }, 2500);
    });
  }

  const harita = kok.querySelector<HTMLElement>('[data-harita]'), cerceve = harita?.querySelector('iframe');
  if (harita && cerceve) {
    const yukle = () => { cerceve.addEventListener('load', () => { harita.dataset.hazir = '1'; }, { once: true }); cerceve.src = harita.dataset.src ?? ''; harita.dataset.istendi = '1'; };
    if ('IntersectionObserver' in window) {
      const g = new IntersectionObserver((k) => { if (k.some((x) => x.isIntersecting)) { g.disconnect(); yukle(); } }, { rootMargin: '300px 0px' });
      g.observe(harita);
    } else yukle();
  }
}
