// Matris sayfası: hikâye durakları (sekme düzeni, ok tuşlarıyla gezilir) ve ekrana gelince sayarak dolan sayılar.
// Betik kapalıyken bütün duraklar alt alta, sayılar son değeriyle görünür.
const azalt = matchMedia('(prefers-reduced-motion: reduce)').matches;

for (const kok of document.querySelectorAll<HTMLElement>('[data-hikaye]')) {
  const sekmeler = [...kok.querySelectorAll<HTMLButtonElement>('[role="tab"]')], paneller = [...kok.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  const sira = kok.querySelector<HTMLElement>('[data-sira]');
  let no = 0;
  const sec = (i: number, odak = false) => {
    no = (i + sekmeler.length) % sekmeler.length;
    sekmeler.forEach((s, j) => { s.setAttribute('aria-selected', String(j === no)); s.tabIndex = j === no ? 0 : -1; });
    paneller.forEach((p, j) => p.toggleAttribute('data-secili', j === no));
    kok.dataset.no = String(no);
    if (sira) sira.textContent = `${no + 1} / ${sekmeler.length}`;
    if (odak) sekmeler[no].focus();
    // Şerit yana kayıyorsa seçili durak görünür kalsın. Sayfanın kendisi kaymasın diye yalnızca şerit kaydırılır.
    const s = sekmeler[no], serit = s.parentElement!;
    serit.scrollTo({ left: s.offsetLeft - serit.clientWidth / 2 + s.clientWidth / 2, behavior: azalt ? 'auto' : 'smooth' });
  };
  sekmeler.forEach((s, i) => {
    s.addEventListener('click', () => sec(i));
    s.addEventListener('keydown', (e) => {
      const yon = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (yon) { e.preventDefault(); e.stopPropagation(); sec(no + yon, true); }
      else if (e.key === 'Home') { e.preventDefault(); sec(0, true); }
      else if (e.key === 'End') { e.preventDefault(); sec(sekmeler.length - 1, true); }
    });
  });
  kok.querySelector('[data-onceki]')?.addEventListener('click', () => sec(no - 1));
  kok.querySelector('[data-sonraki]')?.addEventListener('click', () => sec(no + 1));
  kok.dataset.no = '0';
}

const sayilar = [...document.querySelectorAll<HTMLElement>('[data-say]')];
if (sayilar.length && !azalt && 'IntersectionObserver' in window) {
  const g = new IntersectionObserver((kayitlar) => {
    for (const k of kayitlar) {
      if (!k.isIntersecting) continue;
      g.unobserve(k.target);
      const e = k.target as HTMLElement, hedef = Number(e.dataset.say), bas = performance.now(), sure = 900;
      const kare = (z: number) => {
        const t = Math.min(1, (z - bas) / sure);
        e.textContent = String(Math.round(hedef * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(kare);
      };
      requestAnimationFrame(kare);
    }
  }, { threshold: 0.6 });
  sayilar.forEach((e) => g.observe(e));
}
