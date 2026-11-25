// "Sürü İHA nedir" bölümündeki oynanabilir benzetim. Bir kavram anlatımıdır, takımın uçuş yazılımı değildir.
// Durum tek yerde durur, her karede baştan çizilir. Ekrandan çıkınca ve sekme gizlenince döngü durur.
// "Hareketi azalt" açıksa hiçbir şey oynamaz: her değişiklikte araçlar yerine konur ve tek kare çizilir.
const kok = document.querySelector<HTMLElement>('[data-suru-demo]');
const tuval = kok?.querySelector('canvas');
if (kok && tuval) {
  const ctx = tuval.getContext('2d')!;
  const azalt = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => kok.querySelector<T>(s)!;
  const durumYazi = $('[data-durum]'), sayiYazi = $('[data-sayi-yaz]'), engelDugme = $<HTMLButtonElement>('[data-engel-dugme]');
  const dizilimDugmeleri = [...kok.querySelectorAll<HTMLButtonElement>('[data-dizilim-sec]')];
  const EN_AZ = 3, EN_COK = 12, BASLANGIC = 7;

  type Dizilim = 'cizgi' | 'v' | 'halka';
  type Arac = { x: number; y: number; vx: number; vy: number; aci: number };
  type Dusen = { x: number; y: number; aci: number; t: number };
  let en = 0, boy = 0, oran = 1, vurgu = '#e8c468', soluk = '#a5a39a', metin = '#ecebe6';
  let dizilim: Dizilim = 'cizgi';
  let araclar: Arac[] = [];
  let dusenler: Dusen[] = [];
  const merkez = { x: 0, y: 0 }, hedef = { x: 0, y: 0 };
  let yon = 0, engel: { x: number; y: number; r: number } | null = null;
  let kullaniciT = -1e9, hedefT = -1e9, devriye = 0;

  const yaz = (anahtar: string, yerine: Record<string, string | number> = {}) => {
    let m = kok.dataset[anahtar] ?? '';
    for (const [k, v] of Object.entries(yerine)) m = m.replace(`{${k}}`, String(v));
    durumYazi.textContent = m;
  };
  const izBirak = () => {
    kok.dataset.dizilim = dizilim; kok.dataset.sayi = String(araclar.length); kok.dataset.engel = engel ? '1' : '0';
    sayiYazi.textContent = String(araclar.length);
    dizilimDugmeleri.forEach((d) => d.setAttribute('aria-pressed', String(d.dataset.dizilimSec === dizilim)));
    engelDugme.setAttribute('aria-pressed', String(!!engel));
    engelDugme.textContent = (engel ? kok.dataset.engelKaldir : kok.dataset.engelKoy) ?? '';
  };

  // Yuva: aracın sürü merkezine göre (ileri, yan) konumu. Dizilim ve araç sayısına göre hesaplanır.
  const aralik = () => {
    const n = araclar.length, taban = Math.max(22, Math.min(44, en / 13));
    return dizilim === 'cizgi' ? Math.min(taban, (en * 0.74) / Math.max(1, n - 1)) : taban;
  };
  const yuva = (i: number): [number, number] => {
    const n = araclar.length, d = aralik();
    if (dizilim === 'cizgi') return [0, (i - (n - 1) / 2) * d];
    if (dizilim === 'halka') { const r = Math.max(d * 1.1, Math.min((d * n) / (2 * Math.PI) * 1.15, boy * 0.3)), a = (i / n) * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r]; }
    const derinlik = Math.ceil((n - 1) / 2), adim = Math.min(d * 0.8, (boy * 0.3) / Math.max(1, derinlik)), k = Math.ceil(i / 2);
    return [(derinlik / 2 - k) * adim, (i % 2 ? 1 : -1) * k * adim]; // V: uç önde, kollar arkaya açılır
  };
  const yuvaKonumu = (i: number): [number, number] => {
    const [ileri, yan] = yuva(i), c = Math.cos(yon), s = Math.sin(yon);
    return [merkez.x + ileri * c - yan * s, merkez.y + ileri * s + yan * c];
  };
  const sinirla = (p: { x: number; y: number }) => { p.x = Math.max(en * 0.14, Math.min(en * 0.86, p.x)); p.y = Math.max(boy * 0.2, Math.min(boy * 0.8, p.y)); };
  const yerineKoy = () => araclar.forEach((a, i) => { [a.x, a.y] = yuvaKonumu(i); a.vx = a.vy = 0; a.aci = yon; });
  const yeniArac = (): Arac => ({ x: merkez.x - Math.cos(yon) * 60, y: merkez.y - Math.sin(yon) * 60, vx: 0, vy: 0, aci: yon });

  function adim(t: number, dt: number) {
    // Kimse yönetmiyorken sürü alanda ağır ağır devriye gezer.
    if (t - kullaniciT > 9000 && t > devriye) {
      devriye = t + 4200;
      hedef.x = en * (0.25 + Math.random() * 0.5); hedef.y = boy * (0.3 + Math.random() * 0.4);
    }
    const dx = hedef.x - merkez.x, dy = hedef.y - merkez.y, uzak = Math.hypot(dx, dy);
    if (uzak > 2) {
      const hiz = Math.min(en * 0.32, uzak * 1.6 + 12);
      merkez.x += (dx / uzak) * Math.min(uzak, hiz * dt); merkez.y += (dy / uzak) * Math.min(uzak, hiz * dt);
      if (uzak > 14) { // sürü gittiği yöne döner, dönüş hızı sınırlı
        let fark = Math.atan2(dy, dx) - yon;
        while (fark > Math.PI) fark -= 2 * Math.PI;
        while (fark < -Math.PI) fark += 2 * Math.PI;
        yon += Math.max(-2.2 * dt, Math.min(2.2 * dt, fark));
      }
    }
    const ayrik = aralik() * 0.72;
    let enBuyukSapma = 0;
    araclar.forEach((a, i) => {
      const [hx, hy] = yuvaKonumu(i);
      let ax = (hx - a.x) * 11, ay = (hy - a.y) * 11;
      if (engel) { // çarpışmadan kaçınma: engele yaklaşınca dışarı itilir ve çevresinden dolanır
        const ex = a.x - engel.x, ey = a.y - engel.y, m = Math.hypot(ex, ey) || 1, alan = engel.r + 34;
        if (m < alan) {
          const g = ((alan - m) / alan) * 3200, yan = Math.sign(ex * (hy - a.y) - ey * (hx - a.x)) || 1;
          ax += (ex / m) * g + (-ey / m) * yan * g * 0.55; ay += (ey / m) * g + (ex / m) * yan * g * 0.55;
        }
      }
      for (const o of araclar) { // ayrılma: araçlar birbirine girmez
        if (o === a) continue;
        const ex = a.x - o.x, ey = a.y - o.y, m = Math.hypot(ex, ey);
        if (m > 0 && m < ayrik) { ax += (ex / m) * (ayrik - m) * 45; ay += (ey / m) * (ayrik - m) * 45; }
      }
      a.vx = (a.vx + ax * dt) * Math.pow(0.006, dt); a.vy = (a.vy + ay * dt) * Math.pow(0.006, dt);
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (Math.hypot(a.vx, a.vy) > 14) a.aci = Math.atan2(a.vy, a.vx);
      enBuyukSapma = Math.max(enBuyukSapma, Math.hypot(hx - a.x, hy - a.y));
    });
    // Deneme betiği doğru anı bununla bekler: bütün araçlar yuvasına oturdu mu?
    kok!.dataset.oturdu = enBuyukSapma < 6 && uzak < 4 ? '1' : '0';
    dusenler = dusenler.filter((d) => t - d.t < 900);
  }

  function govde(x: number, y: number, aci: number, a: number, faz: number, olcek: number) {
    const kol = 5.2, pr = 3;
    ctx.save(); ctx.translate(x, y); ctx.rotate(aci); ctx.scale(olcek, olcek);
    ctx.globalAlpha = a; ctx.strokeStyle = vurgu; ctx.fillStyle = vurgu; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-kol, -kol); ctx.lineTo(kol, kol); ctx.moveTo(-kol, kol); ctx.lineTo(kol, -kol); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-2.6, -2, 5.2, 4, 1.2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2.6, -1.4); ctx.lineTo(5, 0); ctx.lineTo(2.6, 1.4); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 4; k++) {
      const px = k < 2 ? kol : -kol, py = k % 2 ? kol : -kol;
      ctx.globalAlpha = a * 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.stroke();
      const d = (k === 0 || k === 3 ? 1 : -1) * faz;
      ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(px - Math.cos(d) * pr, py - Math.sin(d) * pr); ctx.lineTo(px + Math.cos(d) * pr, py + Math.sin(d) * pr); ctx.stroke();
    }
    ctx.restore();
  }

  function ciz(t: number) {
    const olcek = Math.max(1.15, Math.min(1.7, en / 420)), faz = azalt.matches ? 0.8 : t / 45;
    ctx.clearRect(0, 0, en, boy);
    if (engel) { // engel: içi taralı daire
      ctx.save(); ctx.beginPath(); ctx.arc(engel.x, engel.y, engel.r, 0, Math.PI * 2); ctx.clip();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = soluk; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = -engel.r * 2; k < engel.r * 2; k += 7) { ctx.moveTo(engel.x + k, engel.y - engel.r); ctx.lineTo(engel.x + k + engel.r * 2, engel.y + engel.r); }
      ctx.stroke(); ctx.restore();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = soluk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(engel.x, engel.y, engel.r, 0, Math.PI * 2); ctx.stroke();
    }
    if (t - hedefT < 6000 || azalt.matches) { // gösterilen hedef: halka ve artı
      ctx.globalAlpha = 0.85; ctx.strokeStyle = metin; ctx.lineWidth = 1.3; ctx.beginPath();
      ctx.arc(hedef.x, hedef.y, 9, 0, Math.PI * 2);
      ctx.moveTo(hedef.x - 14, hedef.y); ctx.lineTo(hedef.x - 5, hedef.y); ctx.moveTo(hedef.x + 5, hedef.y); ctx.lineTo(hedef.x + 14, hedef.y);
      ctx.moveTo(hedef.x, hedef.y - 14); ctx.lineTo(hedef.x, hedef.y - 5); ctx.moveTo(hedef.x, hedef.y + 5); ctx.lineTo(hedef.x, hedef.y + 14);
      ctx.stroke();
    }
    // Haberleşme bağları: her araç komşusuna bağlı
    ctx.globalAlpha = 0.22; ctx.strokeStyle = vurgu; ctx.lineWidth = 1; ctx.beginPath();
    araclar.forEach((a, i) => {
      const o = dizilim === 'v' ? araclar[Math.max(0, i - 2)] : araclar[i - 1] ?? (dizilim === 'halka' ? araclar[araclar.length - 1] : a);
      if (o !== a) { ctx.moveTo(a.x, a.y); ctx.lineTo(o.x, o.y); }
    });
    ctx.stroke();
    for (const d of dusenler) { // düşen araç: küçülerek solar, yerinde halka açılır
      const o = (t - d.t) / 900;
      govde(d.x, d.y + o * 14, d.aci + o * 2.4, (1 - o) * 0.7, 0, olcek * (1 - o * 0.5));
      ctx.globalAlpha = (1 - o) * 0.6; ctx.strokeStyle = soluk; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(d.x, d.y, 6 + o * 22, 0, Math.PI * 2); ctx.stroke();
    }
    araclar.forEach((a, i) => govde(a.x, a.y, a.aci, 0.95, faz + i, olcek));
    ctx.globalAlpha = 1;
  }

  const boyutla = () => {
    const r = tuval.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const ilk = !en, ox = en ? merkez.x / en : 0.5, oy = boy ? merkez.y / boy : 0.5, hx = en ? hedef.x / en : 0.5, hy = boy ? hedef.y / boy : 0.5;
    oran = Math.min(devicePixelRatio || 1, 2); en = r.width; boy = r.height;
    tuval.width = Math.round(en * oran); tuval.height = Math.round(boy * oran);
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    const s = getComputedStyle(kok);
    vurgu = s.getPropertyValue('--vurgu').trim() || vurgu; soluk = s.getPropertyValue('--soluk').trim() || soluk; metin = s.getPropertyValue('--metin').trim() || metin;
    merkez.x = ox * en; merkez.y = oy * boy; hedef.x = hx * en; hedef.y = hy * boy;
    if (engel) { engel.x = en / 2; engel.y = boy / 2; engel.r = Math.max(20, Math.min(34, en / 13)); }
    if (ilk) { araclar = Array.from({ length: BASLANGIC }, yeniArac); yerineKoy(); izBirak(); }
    return true;
  };

  let kare = 0, son = 0, gorunur = false;
  const dongu = (t: number) => {
    const dt = Math.min(0.05, (t - son) / 1000 || 0.016); son = t;
    adim(t, dt); ciz(t);
    kare = gorunur && !document.hidden && !azalt.matches ? requestAnimationFrame(dongu) : 0;
  };
  const baslat = () => {
    if (!en && !boyutla()) return;
    if (azalt.matches) { merkez.x = hedef.x; merkez.y = hedef.y; yerineKoy(); kok.dataset.oturdu = '1'; ciz(performance.now()); return; }
    if (!kare && gorunur && !document.hidden) { son = performance.now(); kare = requestAnimationFrame(dongu); }
  };
  // Her değişiklikten sonra: izi ve yazıyı güncelle, hareket azaltılmışsa tek kare çiz.
  const degisti = () => { kullaniciT = performance.now(); izBirak(); kok.dataset.oturdu = '0'; baslat(); };
  const hedefKoy = (x: number, y: number) => { hedef.x = x; hedef.y = y; sinirla(hedef); hedefT = performance.now(); };

  dizilimDugmeleri.forEach((d) => d.addEventListener('click', () => {
    dizilim = d.dataset.dizilimSec as Dizilim;
    yaz('dDizilim', { ad: kok.dataset[`ad${dizilim[0].toUpperCase()}${dizilim.slice(1)}`] ?? dizilim });
    degisti();
  }));
  $('[data-azalt]').addEventListener('click', () => {
    if (araclar.length <= EN_AZ) return yaz('dSinir');
    araclar.pop(); yaz('dSayi', { n: araclar.length }); degisti();
  });
  $('[data-artir]').addEventListener('click', () => {
    if (araclar.length >= EN_COK) return yaz('dSinir');
    araclar.push(yeniArac()); yaz('dSayi', { n: araclar.length }); degisti();
  });
  $('[data-dusur]').addEventListener('click', () => {
    if (araclar.length <= EN_AZ) return yaz('dDusmez');
    // Ortalardan bir araç düşer: boşluğun kapanması en iyi orada görünür.
    const i = Math.min(araclar.length - 1, Math.floor(araclar.length / 2) + (Math.random() < 0.5 ? 0 : -1));
    const [d] = araclar.splice(i, 1);
    dusenler.push({ x: d.x, y: d.y, aci: d.aci, t: performance.now() });
    yaz('dDusur', { n: araclar.length }); degisti();
  });
  engelDugme.addEventListener('click', () => {
    if (engel) { engel = null; yaz('dEngelyok'); return degisti(); }
    engel = { x: en / 2, y: boy / 2, r: Math.max(20, Math.min(34, en / 13)) };
    // Sürü engelin bir yanına alınır, hedef öbür yanına konur: yolu engelin üstünden geçer.
    const sol = merkez.x <= en / 2;
    if (Math.abs(merkez.x - en / 2) < en * 0.2) { merkez.x = sol ? en * 0.2 : en * 0.8; merkez.y = boy / 2; if (azalt.matches) yerineKoy(); }
    hedefKoy(sol ? en * 0.82 : en * 0.18, boy / 2);
    yaz('dEngel'); degisti();
  });
  $('[data-hedef]').addEventListener('click', () => {
    let x = 0, y = 0;
    for (let k = 0; k < 8; k++) { x = en * (0.16 + Math.random() * 0.68); y = boy * (0.22 + Math.random() * 0.56); if (Math.hypot(x - merkez.x, y - merkez.y) > en * 0.25) break; }
    hedefKoy(x, y); yaz('dHedef'); degisti();
  });
  $('[data-sifirla]').addEventListener('click', () => {
    dizilim = 'cizgi'; engel = null; dusenler = []; yon = 0; merkez.x = hedef.x = en / 2; merkez.y = hedef.y = boy / 2; hedefT = -1e9;
    araclar = Array.from({ length: BASLANGIC }, yeniArac); yerineKoy();
    yaz('dDizilim', { ad: kok.dataset.adCizgi ?? '' }); degisti();
  });
  tuval.addEventListener('click', (e) => {
    const r = tuval.getBoundingClientRect();
    hedefKoy(e.clientX - r.left, e.clientY - r.top); yaz('dHedef'); degisti();
  });

  new IntersectionObserver((k) => { gorunur = k[0].isIntersecting; baslat(); }, { rootMargin: '80px' }).observe(kok);
  new ResizeObserver(() => { if (boyutla() && (azalt.matches || !kare)) baslat(); }).observe(tuval);
  document.addEventListener('visibilitychange', baslat);
  azalt.addEventListener('change', baslat);
  new MutationObserver(() => { if (en) { boyutla(); if (azalt.matches) ciz(performance.now()); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
