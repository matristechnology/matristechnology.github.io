// "İHA'nın içi": düğmeler, bilgi paneli ve durum burada, üç boyutlu model ayrı dosyada (iha-uc.ts).
// Model (three.js) ancak bölüm ekrana yaklaşınca indirilir, böylece sayfanın ilk açılışı ağırlaşmaz.
// Düğmeler model gelmeden de çalışır. WebGL açılamazsa çizim alanı gizlenir, parçalar yine düğmelerle okunur.
import type { Durum, Gorsel } from './iha-uc';

type Bilgi = { ad: string; model: string; metin: string };

for (const kok of document.querySelectorAll<HTMLElement>('[data-iha-ici]')) {
  const oku = <T,>(a: string | undefined, y: T): T => { try { return JSON.parse(a ?? '') as T; } catch { return y; } };
  const M = oku<Record<string, string>>(kok.dataset.m, {});
  const bilgi = oku<Record<string, Bilgi>>(kok.dataset.parcalar, {});
  const hatBilgi = oku<Record<string, Bilgi>>(kok.dataset.hatlar, {});
  const panel = kok.querySelector<HTMLElement>('[data-parca-panel]'), durumYaz = kok.querySelector<HTMLElement>('[data-durum]');
  const acDugme = kok.querySelector<HTMLButtonElement>('[data-ac]');
  const parcaDugmeleri = [...kok.querySelectorAll<HTMLButtonElement>('[data-parca]')], hatDugmeleri = [...kok.querySelectorAll<HTMLButtonElement>('[data-hat]')];
  const durum: Durum = { secili: '', ustunde: '', hat: '', acik: false };
  let gorsel: Gorsel | null = null;

  const yaz = () => {
    kok.dataset.secili = durum.secili; kok.dataset.acik = durum.acik ? '1' : '0'; kok.dataset.hat = durum.hat;
    parcaDugmeleri.forEach((d) => d.setAttribute('aria-pressed', String(d.dataset.parca === durum.secili)));
    hatDugmeleri.forEach((d) => d.setAttribute('aria-pressed', String(d.dataset.hat === durum.hat)));
    if (acDugme) { acDugme.setAttribute('aria-pressed', String(durum.acik)); acDugme.textContent = durum.acik ? M.topla : M.ayir; }
    const b = bilgi[durum.secili];
    if (panel) {
      panel.replaceChildren();
      if (b) {
        const h = document.createElement('h4'); h.textContent = b.ad; panel.append(h);
        if (b.model) { const m = document.createElement('p'); m.className = 'parca-model'; m.textContent = b.model; panel.append(m); }
        const p = document.createElement('p'); p.textContent = b.metin; panel.append(p);
      }
    }
    const m = durum.hat && hatBilgi[durum.hat] ? hatBilgi[durum.hat].metin : b ? '' : M.ipucu;
    if (durumYaz && durumYaz.textContent !== m) durumYaz.textContent = m;
    gorsel?.guncelle();
  };
  const sec = (ad: string) => { durum.secili = ad === durum.secili ? '' : ad; if (durum.secili) durum.hat = ''; yaz(); };

  parcaDugmeleri.forEach((d) => d.addEventListener('click', () => sec(d.dataset.parca ?? '')));
  hatDugmeleri.forEach((d) => d.addEventListener('click', () => { durum.hat = durum.hat === d.dataset.hat ? '' : (d.dataset.hat ?? ''); if (durum.hat) durum.secili = ''; yaz(); }));
  acDugme?.addEventListener('click', () => { durum.acik = !durum.acik; yaz(); });
  kok.querySelector('[data-gorunum]')?.addEventListener('click', () => gorsel?.gorunum());
  yaz();

  const adlar = Object.fromEntries(Object.entries(bilgi).map(([k, v]) => [k, v.ad]));
  const yukle = async () => {
    try {
      const { kur } = await import('./iha-uc');
      gorsel = kur(kok, durum, adlar, sec, (ad) => { durum.ustunde = ad; gorsel?.guncelle(); });
    } catch (e) { console.error(e); gorsel = null; }
    if (!gorsel) kok.classList.add('webgl-yok');
  };
  if ('IntersectionObserver' in window) {
    const g = new IntersectionObserver((k) => { if (k.some((x) => x.isIntersecting)) { g.disconnect(); void yukle(); } }, { rootMargin: '700px 0px' });
    g.observe(kok);
  } else void yukle();
}
