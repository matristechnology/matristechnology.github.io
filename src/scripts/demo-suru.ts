// "Kendin dene" benzetimi: serbest uçan bir sürü. Yarışma alanı değildir, sürünün nasıl davrandığını gösterir.
// Uçuş mantığı takımın yaklaşımından sadeleştirilmiştir:
//   - Lider ve takipçiler. Lider 0 numaralı yuvadadır, ötekiler sağlı sollu dizilir.
//   - Her araç yuvasını liderin konumuna ve sürünün yönüne göre kendisi hesaplar. Yuvalar taraf değiştirmez,
//     bu yüzden dizilim değişirken araçların yolu kesişmez.
//   - Sürü önce gideceği yöne döner, sonra ilerler. Bütün araçlar aynı yöne bakar.
//   - Bir araç düşünce kalanlar kendi tarafında içeri kayar. Lider düşerse en küçük numaralı araç lider olur.
// Gerçek uçuş yazılımı değildir, ölçüler ve hızlar temsilidir.
// Durum tek yerde durur, her karede baştan çizilir. Ekrandan çıkınca ve sekme gizlenince döngü durur.
// "Hareketi azalt" açıksa hiçbir şey oynamaz: her değişiklikte benzetim sonuna sarılır ve tek kare çizilir.
const kok = document.querySelector<HTMLElement>('[data-suru-demo]');
const tuval = kok?.querySelector('canvas');
if (kok && tuval) {
  const ctx = tuval.getContext('2d')!;
  const azalt = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => kok.querySelector<T>(s)!;
  const durumYazi = $('[data-durum]'), sayiYazi = $('[data-sayi-yaz]'), engelDugme = $<HTMLButtonElement>('[data-engel-dugme]');
  const dizilimDugmeleri = [...kok.querySelectorAll<HTMLButtonElement>('[data-dizilim-sec]')];
  const EN_AZ = 3, EN_COK = 7, BASLANGIC = 5, KUZEY = -Math.PI / 2;

  type Dizilim = 'cizgi' | 'v' | 'ok';
  type Arac = { id: number; slot: number; x: number; y: number; vx: number; vy: number };
  let en = 0, boy = 0, oran = 1, vurgu = '#e8c468', soluk = '#a5a39a', metin = '#ecebe6';
  let dizilim: Dizilim = 'cizgi', araclar: Arac[] = [], siradakiId = 0;
  let dusenler: { x: number; y: number; t: number }[] = [];
  let merkez = { x: 0, y: 0 }, hedef = { x: 0, y: 0 };
  let yon = KUZEY, engel: { x: number; y: number; r: number } | null = null;
  let saat = 0, kullaniciT = -1e9, hedefT = -1e9, devriye = 0;

  const lider = () => araclar.find((a) => a.slot === 0);
  const yaz = (anahtar: string, yerine: Record<string, string | number> = {}) => {
    let m = kok.dataset[anahtar] ?? '';
    for (const [k, v] of Object.entries(yerine)) m = m.replace(`{${k}}`, String(v));
    durumYazi.textContent = m;
  };
  const izBirak = () => {
    kok.dataset.dizilim = dizilim; kok.dataset.sayi = String(araclar.length); kok.dataset.engel = engel ? '1' : '0'; kok.dataset.lider = String(lider()?.id ?? '');
    sayiYazi.textContent = String(araclar.length);
    dizilimDugmeleri.forEach((d) => d.setAttribute('aria-pressed', String(d.dataset.dizilimSec === dizilim)));
    engelDugme.setAttribute('aria-pressed', String(!!engel));
    engelDugme.textContent = (engel ? kok.dataset.engelKaldir : kok.dataset.engelKoy) ?? '';
  };

  // Yuva: aracın lidere göre (ileri, yan) yeri. Tek numaralı yuvalar sağda, çift numaralılar solda.
  // Çizgi: yan yana. V: kollar önde açılır. Ok başı: kollar arkaya açılır, lider uçtadır.
  const aralik = () => Math.max(20, Math.min(42, Math.min(en / 12, boy / 7.5))) * (araclar.length > 5 ? 0.82 : 1);
  const yuva = (k: number): [number, number] => {
    if (!k) return [0, 0];
    const d = aralik(), kat = Math.ceil(k / 2);
    return [dizilim === 'v' ? kat * d * 0.85 : dizilim === 'ok' ? -kat * d * 0.85 : 0, (k % 2 ? 1 : -1) * kat * d];
  };
  const yuvaKonumu = (k: number): [number, number] => {
    const [ileri, yan] = yuva(k), c = Math.cos(yon), s = Math.sin(yon);
    return [merkez.x + ileri * c - yan * s, merkez.y + ileri * s + yan * c];
  };
  // Takipçileri yeniden yuvala: herkes kendi tarafında içeri kayar. İki taraf arasındaki fark birden çoksa
  // kalabalık tarafın en dıştaki aracı öbür tarafın en dışına geçer.
  const yenidenDiz = () => {
    const t = araclar.filter((a) => a.slot !== 0).sort((a, b) => a.slot - b.slot);
    const sag = t.filter((a) => a.slot % 2 === 1), sol = t.filter((a) => a.slot % 2 === 0);
    while (sag.length - sol.length > 1) sol.push(sag.pop()!);
    while (sol.length - sag.length > 1) sag.push(sol.pop()!);
    sag.forEach((a, i) => (a.slot = 2 * i + 1)); sol.forEach((a, i) => (a.slot = 2 * i + 2));
  };
  const sinirla = (p: { x: number; y: number }) => { p.x = Math.max(en * 0.22, Math.min(en * 0.78, p.x)); p.y = Math.max(boy * 0.32, Math.min(boy * 0.68, p.y)); };
  const yerineKoy = () => araclar.forEach((a) => { [a.x, a.y] = yuvaKonumu(a.slot); a.vx = a.vy = 0; });
  const aciFarki = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  function adim(dt: number) {
    saat += dt;
    // Kimse yönetmiyorken sürü alanda ağır ağır dolaşır.
    if (saat - kullaniciT > 9 && saat > devriye && !engel) {
      devriye = saat + 7;
      hedef.x = en * (0.28 + Math.random() * 0.44); hedef.y = boy * (0.36 + Math.random() * 0.28);
    }
    // Sürünün merkezi (liderin yuvası): önce gidilecek yöne döner, hizalandıkça hızlanır.
    const dx = hedef.x - merkez.x, dy = hedef.y - merkez.y, uzak = Math.hypot(dx, dy);
    let fark = 0;
    if (uzak > 1) {
      if (uzak > 18) { fark = aciFarki(Math.atan2(dy, dx) - yon); yon += Math.max(-1.25 * dt, Math.min(1.25 * dt, fark)); }
      const hizalama = uzak > 18 ? Math.max(0, Math.cos(fark)) ** 3 : 1;
      const g = Math.min(uzak, Math.min(en * 0.2, uzak * 1.4 + 8) * hizalama * dt);
      merkez.x += (dx / uzak) * g; merkez.y += (dy / uzak) * g;
    }
    // Araçlar: yuvasına sönümlü yay ile gider, taşma yapmaz. Yaklaşan araçlar birbirini iter.
    const ayrik = aralik() * 0.62, tavan = en * 0.36;
    let sapma = 0;
    for (const a of araclar) {
      const [hx, hy] = yuvaKonumu(a.slot);
      let ax = (hx - a.x) * 26 - a.vx * 10.5, ay = (hy - a.y) * 26 - a.vy * 10.5;
      if (engel) { // engele yaklaşınca dışarı itilir ve çevresinden dolanır
        const ex = a.x - engel.x, ey = a.y - engel.y, m = Math.hypot(ex, ey) || 1, alan = engel.r + 30;
        if (m < alan) {
          const g = ((alan - m) / alan) * 5200, yan = Math.sign(ex * (hy - a.y) - ey * (hx - a.x)) || 1;
          ax += (ex / m) * g + (-ey / m) * yan * g * 0.55; ay += (ey / m) * g + (ex / m) * yan * g * 0.55;
        }
      }
      for (const o of araclar) {
        if (o === a) continue;
        const ex = a.x - o.x, ey = a.y - o.y, m = Math.hypot(ex, ey);
        if (m > 0 && m < ayrik) { ax += (ex / m) * (ayrik - m) * 90; ay += (ey / m) * (ayrik - m) * 90; }
      }
      a.vx += ax * dt; a.vy += ay * dt;
      const v = Math.hypot(a.vx, a.vy);
      if (v > tavan) { a.vx *= tavan / v; a.vy *= tavan / v; }
      a.x += a.vx * dt; a.y += a.vy * dt;
      sapma = Math.max(sapma, Math.hypot(hx - a.x, hy - a.y));
    }
    // Deneme betiği doğru anı bununla bekler: sürü hedefte ve bütün araçlar yuvasında mı?
    kok!.dataset.oturdu = sapma < 5 && uzak < 3 ? '1' : '0';
    dusenler = dusenler.filter((d) => saat - d.t < 0.9);
  }

  function govde(x: number, y: number, aci: number, a: number, faz: number, olcek: number, renk: string) {
    const kol = 5.2, pr = 3;
    ctx.save(); ctx.translate(x, y); ctx.rotate(aci); ctx.scale(olcek, olcek);
    ctx.globalAlpha = a; ctx.strokeStyle = renk; ctx.fillStyle = renk; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-kol, -kol); ctx.lineTo(kol, kol); ctx.moveTo(-kol, kol); ctx.lineTo(kol, -kol); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-2.6, -2, 5.2, 4, 1.2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2.6, -1.4); ctx.lineTo(5, 0); ctx.lineTo(2.6, 1.4); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 4; k++) {
      const ox = k < 2 ? kol : -kol, oy = k % 2 ? kol : -kol;
      ctx.globalAlpha = a * 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, oy, pr, 0, Math.PI * 2); ctx.stroke();
      const d = (k === 0 || k === 3 ? 1 : -1) * faz;
      ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(ox - Math.cos(d) * pr, oy - Math.sin(d) * pr); ctx.lineTo(ox + Math.cos(d) * pr, oy + Math.sin(d) * pr); ctx.stroke();
    }
    ctx.restore();
  }

  function ciz() {
    const olcek = Math.max(1.15, Math.min(1.7, en / 420)), faz = azalt.matches ? 0.8 : saat * 22, l = lider();
    ctx.clearRect(0, 0, en, boy);
    if (engel) { // engel: içi taralı daire
      ctx.save(); ctx.beginPath(); ctx.arc(engel.x, engel.y, engel.r, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = soluk; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = -engel.r * 2; k < engel.r * 2; k += 7) { ctx.moveTo(engel.x + k, engel.y - engel.r); ctx.lineTo(engel.x + k + engel.r * 2, engel.y + engel.r); }
      ctx.stroke(); ctx.restore();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = soluk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(engel.x, engel.y, engel.r, 0, Math.PI * 2); ctx.stroke();
    }
    if (saat - hedefT < 6 || (azalt.matches && hedefT > 0)) { // gösterilen hedef: halka ve artı
      ctx.globalAlpha = 0.6; ctx.strokeStyle = soluk; ctx.lineWidth = 1.3; ctx.beginPath();
      ctx.arc(hedef.x, hedef.y, 9, 0, Math.PI * 2);
      ctx.moveTo(hedef.x - 14, hedef.y); ctx.lineTo(hedef.x - 5, hedef.y); ctx.moveTo(hedef.x + 5, hedef.y); ctx.lineTo(hedef.x + 14, hedef.y);
      ctx.moveTo(hedef.x, hedef.y - 14); ctx.lineTo(hedef.x, hedef.y - 5); ctx.moveTo(hedef.x, hedef.y + 5); ctx.lineTo(hedef.x, hedef.y + 14);
      ctx.stroke();
    }
    // Haberleşme bağları: lider durumunu yayınlar, her takipçi ona bakar
    if (l) {
      ctx.globalAlpha = 0.2; ctx.strokeStyle = vurgu; ctx.lineWidth = 1; ctx.beginPath();
      for (const a of araclar) if (a !== l) { ctx.moveTo(l.x, l.y); ctx.lineTo(a.x, a.y); }
      ctx.stroke();
    }
    for (const u of dusenler) { // düşen araç: yerinde halka açılır
      const o = (saat - u.t) / 0.9;
      ctx.globalAlpha = (1 - o) * 0.6; ctx.strokeStyle = soluk; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(u.x, u.y, 6 + o * 22, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.font = `${Math.round(9 * olcek)}px ui-monospace, SFMono-Regular, Menlo, monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (const a of araclar) { // lider vurgu renginde, takipçiler metin renginde. Hepsi sürünün yönüne bakar.
      govde(a.x, a.y, yon, a === l ? 1 : 0.92, faz + a.id, olcek, a === l ? vurgu : metin);
      ctx.globalAlpha = 0.75; ctx.fillStyle = soluk; ctx.fillText(String(a.id), a.x + 9 * olcek, a.y - 9 * olcek);
    }
    ctx.globalAlpha = 1;
  }

  const boyutla = () => {
    const r = tuval.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const ilk = !en, kx = en ? r.width / en : 1, ky = boy ? r.height / boy : 1;
    oran = Math.min(devicePixelRatio || 1, 2); en = r.width; boy = r.height;
    tuval.width = Math.round(en * oran); tuval.height = Math.round(boy * oran);
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    const s = getComputedStyle(kok);
    vurgu = s.getPropertyValue('--vurgu').trim() || vurgu; soluk = s.getPropertyValue('--soluk').trim() || soluk; metin = s.getPropertyValue('--metin').trim() || metin;
    for (const p of [merkez, hedef, ...araclar]) { p.x *= kx; p.y *= ky; }
    if (engel) { engel.x = en / 2; engel.y = boy / 2; engel.r = Math.max(18, Math.min(30, en / 15)); }
    if (ilk) sifirla();
    return true;
  };

  function sifirla() {
    dizilim = 'cizgi'; engel = null; dusenler = []; yon = KUZEY; hedefT = -1e9; siradakiId = BASLANGIC;
    merkez = { x: en / 2, y: boy / 2 }; hedef = { ...merkez };
    araclar = Array.from({ length: BASLANGIC }, (_, i) => ({ id: i, slot: i, x: 0, y: 0, vx: 0, vy: 0 })); yerineKoy();
    izBirak();
  }

  let kare = 0, son = 0, gorunur = false;
  const dongu = (t: number) => {
    const dt = Math.min(0.05, (t - son) / 1000 || 0.016); son = t;
    adim(dt); ciz();
    kare = gorunur && !document.hidden && !azalt.matches ? requestAnimationFrame(dongu) : 0;
  };
  const baslat = () => {
    if (!en && !boyutla()) return;
    if (azalt.matches) { // oynatmadan sonuna sar, tek kare çiz
      kullaniciT = saat + 1e6;
      for (let i = 0; i < 4000 && !(i > 2 && kok.dataset.oturdu === '1'); i++) adim(0.04);
      dusenler = []; return ciz();
    }
    if (!kare && gorunur && !document.hidden) { son = performance.now(); kare = requestAnimationFrame(dongu); }
  };
  // Her değişiklikten sonra: izi güncelle, hareket azaltılmışsa tek kare çiz.
  const degisti = () => { kullaniciT = saat; izBirak(); kok.dataset.oturdu = '0'; baslat(); };
  const hedefKoy = (x: number, y: number) => { hedef.x = x; hedef.y = y; sinirla(hedef); hedefT = saat; };
  const dusur = (a: Arac) => { dusenler.push({ x: a.x, y: a.y, t: saat }); araclar = araclar.filter((o) => o !== a); };

  dizilimDugmeleri.forEach((d) => d.addEventListener('click', () => {
    dizilim = d.dataset.dizilimSec as Dizilim;
    yaz('dDizilim', { ad: d.textContent ?? '' }); degisti();
  }));
  $('[data-azalt]').addEventListener('click', () => {
    if (araclar.length <= EN_AZ) return yaz('dSinir');
    const dis = araclar.reduce((a, b) => (b.slot > a.slot ? b : a));
    araclar = araclar.filter((a) => a !== dis); yaz('dSayi', { n: araclar.length }); degisti();
  });
  $('[data-artir]').addEventListener('click', () => {
    if (araclar.length >= EN_COK) return yaz('dSinir');
    // Yeni araç sürünün arkasından gelir, az kalabalık tarafın en dışına yerleşir.
    const sagda = araclar.filter((a) => a.slot % 2 === 1).length, solda = araclar.filter((a) => a.slot && a.slot % 2 === 0).length;
    araclar.push({ id: siradakiId++, slot: sagda <= solda ? 99 : 100, x: merkez.x - Math.cos(yon) * aralik() * 3.5, y: merkez.y - Math.sin(yon) * aralik() * 3.5, vx: 0, vy: 0 });
    yenidenDiz(); yaz('dSayi', { n: araclar.length }); degisti();
  });
  $('[data-dusur]').addEventListener('click', () => {
    if (araclar.length <= EN_AZ) return yaz('dDusmez');
    // İçteki takipçilerden biri düşer: dıştakilerin içeri kayması en iyi orada görünür.
    const yuvaNo = Math.random() < 0.5 ? 1 : 2; // zar bir kez atılır
    dusur(araclar.find((a) => a.slot === yuvaNo) ?? araclar.find((a) => a.slot !== 0)!);
    yenidenDiz(); yaz('dDusur', { n: araclar.length }); degisti();
  });
  $('[data-lider-dusur]').addEventListener('click', () => {
    if (araclar.length <= EN_AZ) return yaz('dDusmez');
    dusur(lider()!);
    const yeni = araclar.reduce((a, b) => (b.id < a.id ? b : a)); // en küçük numaralı araç liderliği alır
    const yerinde = Math.hypot(hedef.x - merkez.x, hedef.y - merkez.y) < 3;
    yeni.slot = 0; yenidenDiz();
    merkez = { x: yeni.x, y: yeni.y }; // sürü yeni liderin çevresinde toplanır
    if (yerinde) { hedef = { ...merkez }; sinirla(hedef); }
    yaz('dLider', { n: yeni.id }); degisti();
  });
  engelDugme.addEventListener('click', () => {
    if (engel) { engel = null; yaz('dEngelyok'); return degisti(); }
    engel = { x: en / 2, y: boy / 2, r: Math.max(18, Math.min(30, en / 15)) };
    // Sürü engelin bir yanına alınır, hedef öbür yanına konur: yolu engelin üstünden geçer.
    const sol = merkez.x <= en / 2;
    if (Math.abs(merkez.x - en / 2) < en * 0.2) { merkez.x = sol ? en * 0.24 : en * 0.76; merkez.y = boy / 2; yon = sol ? 0 : Math.PI; yerineKoy(); }
    hedefKoy(sol ? en * 0.78 : en * 0.22, boy / 2);
    yaz('dEngel'); degisti();
  });
  $('[data-hedef]').addEventListener('click', () => {
    let x = 0, y = 0;
    for (let k = 0; k < 8; k++) { x = en * (0.22 + Math.random() * 0.56); y = boy * (0.32 + Math.random() * 0.36); if (Math.hypot(x - merkez.x, y - merkez.y) > en * 0.25) break; }
    hedefKoy(x, y); yaz('dHedef'); degisti();
  });
  $('[data-sifirla]').addEventListener('click', () => { sifirla(); yaz('dBasla'); degisti(); });
  tuval.addEventListener('click', (e) => {
    const r = tuval.getBoundingClientRect();
    hedefKoy(e.clientX - r.left, e.clientY - r.top); yaz('dHedef'); degisti();
  });

  new IntersectionObserver((k) => { gorunur = k[0].isIntersecting; baslat(); }, { rootMargin: '80px' }).observe(kok);
  new ResizeObserver(() => { if (boyutla() && (azalt.matches || !kare)) baslat(); }).observe(tuval);
  document.addEventListener('visibilitychange', baslat);
  azalt.addEventListener('change', baslat);
  new MutationObserver(() => { if (en) { boyutla(); if (azalt.matches) ciz(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
