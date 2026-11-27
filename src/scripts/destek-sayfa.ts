// Destek sayfası: destek türü ve paket seçimi (e-posta taslağına yazılır), logonun yerini gösteren çizimler,
// 3B model üzerinde ihtiyaç grupları. Betik kapalıyken bütün anlatım düz yazı olarak görünür, düğme boş taslak açar.
import type { Durum, Gorsel } from './iha-uc';
import type { Tisort } from './tisort-uc';

// Paket tablosunda seçilen paket tişörtte de işaretlenir (logo bölümü kurulunca dolar).
let tisortSec: (no: number) => void = () => {};

const oku = <T,>(a: string | undefined, y: T): T => { try { return JSON.parse(a ?? '') as T; } catch { return y; } };
const kok = document.querySelector<HTMLElement>('[data-destek]');
if (kok) {
  // ── Tür ve paket seçimi ──
  const turD = [...kok.querySelectorAll<HTMLButtonElement>('[data-tur]')], paketD = [...kok.querySelectorAll<HTMLButtonElement>('[data-paket]')];
  const tablo = kok.querySelector<HTMLElement>('[data-paketler]'), bag = kok.querySelector<HTMLAnchorElement>('[data-destek-dugme]'), secim = kok.querySelector<HTMLElement>('[data-secim]');
  let tur = '', paket = '', sutun = '';
  const yaz = () => {
    turD.forEach((d) => d.setAttribute('aria-pressed', String(d.dataset.tur === tur)));
    paketD.forEach((d) => d.setAttribute('aria-pressed', String(d.dataset.paket === paket)));
    tablo?.querySelectorAll<HTMLElement>('[data-sutun]').forEach((h) => h.toggleAttribute('data-secili', !!paket && h.dataset.sutun === sutun));
    kok.dataset.seciliTur = tur; kok.dataset.seciliPaket = paket;
    if (secim) secim.textContent = [tur, paket].filter(Boolean).join(' · ');
    if (bag) bag.href = `mailto:${kok.dataset.eposta}?subject=${encodeURIComponent(kok.dataset.konu ?? '')}&body=${encodeURIComponent((kok.dataset.govde ?? '').replace('{tur}', tur).replace('{paket}', paket))}`;
  };
  turD.forEach((d) => d.addEventListener('click', () => { tur = tur === d.dataset.tur ? '' : (d.dataset.tur ?? ''); yaz(); }));
  paketD.forEach((d) => d.addEventListener('click', () => { const ayni = paket === d.dataset.paket; paket = ayni ? '' : (d.dataset.paket ?? ''); sutun = ayni ? '' : (d.dataset.sutunNo ?? ''); yaz(); tisortSec(ayni ? -1 : Number(sutun)); }));
  yaz();

  // ── Logonun yeri ──
  const logo = kok.querySelector<HTMLElement>('[data-logo]');
  if (logo) {
    const yerD = [...logo.querySelectorAll<HTMLButtonElement>('[data-yer]')];
    const sec = (yer: string) => {
      logo.dataset.yer = yer;
      yerD.forEach((d) => d.setAttribute('aria-pressed', String(d.dataset.yer === yer)));
      logo.querySelectorAll<HTMLElement>('[data-yer-panel]').forEach((p) => p.toggleAttribute('data-secili', p.dataset.yerPanel === yer));
      logo.querySelectorAll<SVGElement>('[data-yer-cizim]').forEach((p) => p.toggleAttribute('data-secili', p.dataset.yerCizim === yer));
    };
    // Tişört: paket seçilince 3B tişört o yüzünü çevirir. Model ancak tişört sekmesi açılınca indirilir.
    const sahne = logo.querySelector<HTMLElement>('[data-tisort]'), tD = [...logo.querySelectorAll<HTMLButtonElement>('[data-tisort-paket]')];
    let tisort: Tisort | null = null, istendi = false, tNo = -1;
    const tSec = (no: number) => {
      tNo = no;
      tD.forEach((d) => { const s = Number(d.dataset.tisortPaket) === no; d.setAttribute('aria-pressed', String(s)); d.closest('li')?.toggleAttribute('data-secili', s); });
      logo.dataset.tisortPaket = String(no);
      tisort?.sec(no);
    };
    tisortSec = (no) => { if (no !== tNo) tSec(no); };
    tD.forEach((d) => d.addEventListener('click', () => { const no = Number(d.dataset.tisortPaket); tSec(no === tNo ? -1 : no); }));
    const tYukle = async () => {
      if (istendi || !sahne) return; istendi = true;
      try { const { kur } = await import('./tisort-uc'); tisort = kur(sahne, oku<string[]>(sahne.dataset.adlar, []), (no) => tSec(no)); } catch (e) { console.error(e); tisort = null; }
      if (!tisort) sahne.classList.add('webgl-yok'); else tisort.sec(tNo);
    };
    yerD.forEach((d) => d.addEventListener('click', () => { sec(d.dataset.yer ?? ''); if (d.dataset.yer === 'tisort') void tYukle(); }));
    sec(yerD[0]?.dataset.yer ?? '');
  }

  // ── İhtiyaç grupları, 3B model üzerinde ──
  const ih = kok.querySelector<HTMLElement>('[data-ihtiyac]');
  if (ih) {
    const gruplar = oku<string[][]>(ih.dataset.gruplar, []), adlar = oku<Record<string, string>>(ih.dataset.adlar, {});
    const dugmeler = [...ih.querySelectorAll<HTMLButtonElement>('[data-grup]')], paneller = [...ih.querySelectorAll<HTMLElement>('[data-grup-panel]')];
    const durumYaz = ih.querySelector<HTMLElement>('[data-ihtiyac-durum]');
    const durum: Durum = { secili: '', ustunde: '', hat: '', acik: false, vurgu: [] };
    let gorsel: Gorsel | null = null, no = -1;
    const sec = (i: number) => {
      no = i === no ? -1 : i;
      durum.vurgu = no >= 0 ? (gruplar[no] ?? []) : [];
      ih.dataset.grup = String(no);
      dugmeler.forEach((d, j) => d.setAttribute('aria-pressed', String(j === no)));
      paneller.forEach((p, j) => (p.hidden = j !== no));
      if (durumYaz) durumYaz.hidden = no >= 0;
      gorsel?.guncelle();
    };
    dugmeler.forEach((d, i) => d.addEventListener('click', () => sec(i)));
    ih.querySelector('[data-gorunum]')?.addEventListener('click', () => gorsel?.gorunum());
    ih.dataset.grup = '-1';
    const yukle = async () => {
      try {
        const { kur } = await import('./iha-uc');
        // Modelde bir parçaya tıklanınca o parçanın içinde olduğu grup seçilir.
        gorsel = kur(ih, durum, adlar, (ad) => { const g = gruplar.findIndex((l) => l.includes(ad)); if (g >= 0 && g !== no) sec(g); }, (ad) => { durum.ustunde = ad; gorsel?.guncelle(); });
      } catch (e) { console.error(e); gorsel = null; }
      if (!gorsel) ih.classList.add('webgl-yok');
    };
    if ('IntersectionObserver' in window) {
      const g = new IntersectionObserver((k) => { if (k.some((x) => x.isIntersecting)) { g.disconnect(); void yukle(); } }, { rootMargin: '700px 0px' });
      g.observe(ih);
    } else void yukle();
  }
}
