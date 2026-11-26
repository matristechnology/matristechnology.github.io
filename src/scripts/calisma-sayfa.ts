// Çalışmalar sayfası: aşamalar alt alta durur. Sayfa kaydırıldıkça yandaki çizgi dolar ve çizginin ulaştığı aşamanın
// numarası yanar. Kartların belirmesi site.ts içindeki data-belir düzeniyle olur.
// Betik kapalıyken ya da "hareketi azalt" açıkken çizgi dolu, bütün aşamalar görünür durur.
const akis = document.querySelector<HTMLElement>('[data-akis]');
if (akis) {
  const adimlar = [...akis.querySelectorAll<HTMLElement>('[data-adim]')];
  const azalt = matchMedia('(prefers-reduced-motion: reduce)');
  let bekliyor = false;
  const olc = () => {
    bekliyor = false;
    // Ölçü çizgisi ekranın yüzde 62'sinde: bir aşama oraya ulaşınca "geçildi" sayılır.
    const esik = innerHeight * 0.62, r = akis.getBoundingClientRect();
    const oran = azalt.matches ? 1 : Math.max(0, Math.min(1, (esik - r.top) / Math.max(1, r.height)));
    akis.style.setProperty('--ilerleme', oran.toFixed(4));
    let gecen = 0;
    for (const a of adimlar) { const g = azalt.matches || a.getBoundingClientRect().top + 30 < esik; a.toggleAttribute('data-gecti', g); if (g) gecen++; }
    akis.dataset.gecen = String(gecen);
  };
  const iste = () => { if (!bekliyor) { bekliyor = true; requestAnimationFrame(olc); } };
  addEventListener('scroll', iste, { passive: true });
  addEventListener('resize', iste);
  azalt.addEventListener('change', iste);
  olc();
}
