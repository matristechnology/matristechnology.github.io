// Galeri sayfası: konu süzgeci, küçük resim şeritli büyük görüntüleyici (ok tuşları, kaydırma, Esc) ve
// tıklanınca yüklenen videolar. Betik kapalıyken bütün fotoğraflar görünür, tıklanan fotoğraf kendi adresinde açılır.
const kok = document.querySelector<HTMLElement>('[data-gsayfa]');
const azalt = matchMedia('(prefers-reduced-motion: reduce)');
if (kok) {
  const ogeler = [...kok.querySelectorAll<HTMLElement>('[data-gliste] > li')];
  const dugmeler = [...kok.querySelectorAll<HTMLButtonElement>('[data-gsuz] button')], durum = kok.querySelector<HTMLElement>('[data-gdurum]');
  let konu = '';
  const gorunenler = () => ogeler.filter((o) => !o.hidden).map((o) => o.querySelector<HTMLAnchorElement>('[data-gfoto]')).filter((a): a is HTMLAnchorElement => !!a);
  const uygula = () => {
    for (const o of ogeler) o.hidden = !!konu && o.dataset.konu !== konu;
    dugmeler.forEach((d) => d.setAttribute('aria-pressed', String((d.dataset.konu ?? '') === konu)));
    const n = gorunenler().length;
    kok.dataset.konu = konu; kok.dataset.gorunen = String(n); kok.dataset.sablon = String(ogeler.filter((o) => !o.hidden && 'sablon' in o.dataset).length);
    if (durum) durum.textContent = (kok.dataset.durumKalip ?? '').replace('{n}', String(n));
  };
  // Tarayıcı destekliyorsa süzme yumuşak bir geçişle olur, desteklemiyorsa ya da hareket azaltılmışsa anında.
  const gecis = (is: () => void) => {
    const d = document as Document & { startViewTransition?: (f: () => void) => unknown };
    if (d.startViewTransition && !azalt.matches) d.startViewTransition(is); else is();
  };
  dugmeler.forEach((d) => d.addEventListener('click', () => { konu = d.dataset.konu ?? ''; gecis(uygula); }));
  uygula();

  const gb = kok.querySelector<HTMLDialogElement>('[data-gb]');
  if (gb && typeof gb.showModal === 'function') {
    const resim = gb.querySelector<HTMLImageElement>('[data-buyuk]')!, aciklama = gb.querySelector<HTMLElement>('[data-aciklama]')!;
    const sayac = gb.querySelector<HTMLElement>('[data-sayac]')!, konuYaz = gb.querySelector<HTMLElement>('[data-gkonu]')!, serit = gb.querySelector<HTMLElement>('[data-serit]')!;
    let liste: HTMLAnchorElement[] = [], sira = 0, kucukler: HTMLButtonElement[] = [];
    const goster = (i: number) => {
      sira = (i + liste.length) % liste.length;
      const f = liste[sira];
      resim.src = f.href; resim.alt = f.dataset.alt ?? '';
      aciklama.textContent = f.dataset.alt ?? '';
      sayac.textContent = `${sira + 1} / ${liste.length}`; konuYaz.textContent = f.dataset.konuAd ?? '';
      gb.dataset.sira = String(sira + 1);
      kucukler.forEach((k, j) => { if (j === sira) k.setAttribute('aria-current', 'true'); else k.removeAttribute('aria-current'); });
      const k = kucukler[sira];
      if (k) serit.scrollTo({ left: k.offsetLeft - serit.clientWidth / 2 + k.clientWidth / 2, behavior: azalt.matches ? 'auto' : 'smooth' });
    };
    const ac = (a: HTMLAnchorElement) => {
      liste = gorunenler();
      serit.replaceChildren();
      kucukler = liste.map((f, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', f.dataset.alt ?? '');
        const im = document.createElement('img'); im.src = f.dataset.kucuk ?? ''; im.alt = ''; im.width = 160; im.height = 120; im.loading = 'lazy';
        b.append(im); b.addEventListener('click', () => goster(i)); serit.append(b);
        return b;
      });
      gb.showModal();
      goster(Math.max(0, liste.indexOf(a)));
    };
    for (const a of kok.querySelectorAll<HTMLAnchorElement>('[data-gfoto]')) {
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return; // yeni sekmede açmak isteyene karışma
        e.preventDefault(); ac(a);
      });
    }
    gb.querySelector('[data-onceki]')!.addEventListener('click', () => goster(sira - 1));
    gb.querySelector('[data-sonraki]')!.addEventListener('click', () => goster(sira + 1));
    gb.querySelector('[data-kapat]')!.addEventListener('click', () => gb.close());
    gb.addEventListener('click', (e) => { if (e.target === gb) gb.close(); });
    gb.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); e.stopPropagation();
      goster(sira + (e.key === 'ArrowRight' ? 1 : -1));
    });
    // Telefonda fotoğrafı yana kaydırınca öncekine ya da sonrakine geçilir.
    let basX = 0, basY = 0, izle = false;
    resim.addEventListener('pointerdown', (e) => { izle = true; basX = e.clientX; basY = e.clientY; });
    resim.addEventListener('pointerup', (e) => {
      if (!izle) return; izle = false;
      const dx = e.clientX - basX, dy = e.clientY - basY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) goster(sira + (dx < 0 ? 1 : -1));
    });
    resim.addEventListener('pointercancel', () => { izle = false; });
    gb.addEventListener('close', () => liste[sira]?.focus({ preventScroll: true }));
  }
}

// Videolar: kutuya basılana kadar YouTube'dan hiçbir şey yüklenmez.
for (const kutu of document.querySelectorAll<HTMLElement>('[data-video]')) {
  kutu.querySelector('a')?.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(kutu.dataset.video ?? '')}?autoplay=1`;
    f.title = kutu.dataset.baslik ?? ''; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
    kutu.replaceChildren(f);
  });
}
