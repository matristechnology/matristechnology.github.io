// Takım sayfası: tıklanan organizasyon şeması, üye kartlarında süzgeç ve arama, "Takıma katıl" e-posta taslağı.
// Betik kapalıyken şemanın anlatımı liste olarak, bütün kartlar süzgeçsiz, başvuru bağlantısı dalsız görünür.
const oku = <T,>(a: string | undefined, y: T): T => { try { return JSON.parse(a ?? '') as T; } catch { return y; } };
const azalt = matchMedia('(prefers-reduced-motion: reduce)').matches;
const el = <K extends keyof HTMLElementTagNameMap>(ad: K, sinif = '', yazi = ''): HTMLElementTagNameMap[K] => { const e = document.createElement(ad); if (sinif) e.className = sinif; if (yazi) e.textContent = yazi; return e; };

// ── Üye kartları ──
let suz: (ekip: string, dal: string) => void = () => {};
const kadro = document.querySelector<HTMLElement>('[data-kadro]');
if (kadro) {
  const M = oku<Record<string, string>>(kadro.dataset.m, {});
  const kartlar = [...kadro.querySelectorAll<HTMLElement>('[data-kart]')];
  const ekipD = [...kadro.querySelectorAll<HTMLButtonElement>('[data-kadro-ekip] button')];
  const dalS = kadro.querySelector<HTMLSelectElement>('[data-kadro-dal]'), ara = kadro.querySelector<HTMLInputElement>('[data-kadro-ara]');
  const durum = kadro.querySelector<HTMLElement>('[data-kadro-durum]'), bos = kadro.querySelector<HTMLElement>('[data-kadro-bos]');
  const st = { ekip: '', dal: '', ara: '' };
  const dalEkip = (dal: string) => dalS?.querySelector<HTMLOptionElement>(`option[value="${dal}"]`)?.dataset.ekip ?? '';
  const uygula = (ilk = false) => { // ilk çağrıda kartlar belirmeye bırakılır, kaydırdıkça sırayla gelirler
    const q = st.ara.trim().toLocaleLowerCase(document.documentElement.lang || 'tr');
    let n = 0;
    for (const k of kartlar) {
      const g = (!st.ekip || k.dataset.ekip === st.ekip) && (!st.dal || k.dataset.dal === st.dal) && (!q || (k.dataset.ara ?? '').includes(q));
      k.hidden = !g; if (g) { n++; if (!ilk) k.classList.add('gorundu'); }
    }
    // Boşalan dal bloğu ve ekip paneli de gizlenir, kalanlar görünür kalır.
    for (const d of kadro.querySelectorAll<HTMLElement>('.kadro-dal')) { const g = !!d.querySelector('[data-kart]:not([hidden])'); d.hidden = !g; if (g && !ilk) d.classList.add('gorundu'); }
    for (const e of kadro.querySelectorAll<HTMLElement>('.kadro-ekip')) { const g = !!e.querySelector('.kadro-dal:not([hidden])'); e.hidden = !g; if (g && !ilk) e.classList.add('gorundu'); }
    ekipD.forEach((d) => d.setAttribute('aria-pressed', String((d.dataset.ekip ?? '') === st.ekip)));
    if (dalS) dalS.value = st.dal;
    if (durum) durum.textContent = (M.sonuc ?? '').replace('{n}', String(n)).replace('{t}', String(kartlar.length));
    if (bos) bos.hidden = n > 0;
    kadro.dataset.gorunen = String(n); kadro.dataset.ekip = st.ekip; kadro.dataset.dal = st.dal;
  };
  ekipD.forEach((d) => d.addEventListener('click', () => { st.ekip = d.dataset.ekip ?? ''; if (st.dal && dalEkip(st.dal) !== st.ekip) st.dal = ''; uygula(); }));
  dalS?.addEventListener('change', () => { st.dal = dalS.value; if (st.dal) st.ekip = dalEkip(st.dal); uygula(); });
  ara?.addEventListener('input', () => { st.ara = ara.value; uygula(); });
  suz = (ekip, dal) => {
    st.ekip = ekip; st.dal = dal; st.ara = ''; if (ara) ara.value = '';
    uygula();
    kadro.closest('section')?.scrollIntoView({ behavior: azalt ? 'auto' : 'smooth', block: 'start' });
  };
  uygula(true);
}

// ── Organizasyon şeması ──
type Dugum = { tur: string; ad: string; metin: string; sayi: string; gorevler: string[]; ekip: string; dal: string };
const sema = document.querySelector<HTMLElement>('[data-sema]');
if (sema) {
  const M = oku<Record<string, string>>(sema.dataset.m, {}), D = oku<Record<string, Dugum>>(sema.dataset.dugumler, {});
  const dugmeler = [...sema.querySelectorAll<HTMLButtonElement>('[data-dugum]')], panel = sema.querySelector<HTMLElement>('[data-sema-panel]');
  const sec = (anahtar: string) => {
    const d = D[anahtar];
    if (!d) return;
    sema.dataset.secili = anahtar;
    for (const b of dugmeler) {
      const k = b.dataset.dugum ?? '', secili = k === anahtar;
      // Seçilen kutudan kaptana giden yol ve seçilen ekibin dalları da yanar.
      const yolda = !secili && (k === 'kaptan' || (d.dal && k === `ekip:${d.ekip}`) || (!d.dal && !!d.ekip && b.dataset.ust === d.ekip));
      b.setAttribute('aria-pressed', String(secili)); b.toggleAttribute('data-yolda', yolda);
    }
    if (!panel) return;
    panel.replaceChildren();
    if (d.tur) panel.append(el('p', 'parca-model', d.tur));
    panel.append(el('h3', '', d.ad));
    if (d.sayi) panel.append(el('p', 'sema-panel-sayi', d.sayi));
    panel.append(el('p', '', d.metin));
    if (d.gorevler.length) {
      panel.append(el('p', 'parca-bag-baslik', d.dal ? M.gorevler : M.dallar));
      const ul = el('ul', 'sema-gorevler'); d.gorevler.forEach((g) => ul.append(el('li', '', g))); panel.append(ul);
    }
    if (d.ekip) {
      const b = el('button', 'dugme kucuk', `${M.uyeleriGoster} ↓`); b.type = 'button'; b.dataset.goster = '';
      b.addEventListener('click', () => suz(d.ekip, d.dal));
      panel.append(b);
    }
  };
  dugmeler.forEach((b) => b.addEventListener('click', () => sec(b.dataset.dugum ?? '')));
  sec('kaptan');
}

// ── Takıma katıl ──
const katil = document.querySelector<HTMLElement>('[data-katil]');
if (katil) {
  const dallar = oku<Record<string, { ad: string; metin: string }>>(katil.dataset.dallar, {});
  const dugmeler = [...katil.querySelectorAll<HTMLButtonElement>('[data-dal]')], panel = katil.querySelector<HTMLElement>('[data-katil-panel]');
  const bag = katil.querySelector<HTMLAnchorElement>('[data-katil-dugme]');
  let secili = '';
  const yaz = () => {
    const d = dallar[secili];
    katil.dataset.secili = secili;
    dugmeler.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dal === secili)));
    if (panel) { panel.replaceChildren(); if (d) panel.append(el('h3', '', d.ad), el('p', '', d.metin)); }
    if (bag) bag.href = `mailto:${katil.dataset.eposta}?subject=${encodeURIComponent(katil.dataset.konu ?? '')}&body=${encodeURIComponent((katil.dataset.govde ?? '').replace('{dal}', d?.ad ?? ''))}`;
  };
  dugmeler.forEach((b) => b.addEventListener('click', () => { secili = secili === b.dataset.dal ? '' : (b.dataset.dal ?? ''); yaz(); }));
  yaz();
}
