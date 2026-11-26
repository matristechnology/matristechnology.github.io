// Sayfanın arkasında süzülen sürü: küçük İHA'lar ekranda dolaşır, birkaç saniyede bir sıradaki dizilime geçer.
// Arada bir yabancı bir sürü ekrana girer. Bizim sürü onu fark eder, önler ve yeniden dizilime döner.
// Süs amaçlıdır: tuval aria-hidden, tıklamaları yutmaz, "hareketi azalt" açıksa hiç çizilmez.
// Ziyaretçi üst menüdeki düğmeyle kapatabilir, seçim tarayıcıda hatırlanır.
//
// Dizilime giriş: dizilim değişince her İHA'ya en yakın yuva verilir (toplam yol en kısa olacak biçimde).
// Böyle seçilen yollar birbirini kesmez. Sonra her İHA bulunduğu yerden yuvasına düz bir çizgiyle, yavaşlayarak
// ve ötekilerle aynı anda varacak hızda gider.
const tuval = document.querySelector<HTMLCanvasElement>('canvas[data-suru]');
if (tuval) {
  const ctx = tuval.getContext('2d')!;
  const azalt = matchMedia('(prefers-reduced-motion: reduce)');
  const adlar = (tuval.dataset.formasyonlar ?? 'V,halka,çizgi,kol,ok başı,ikili,dağıl').split(',');
  const N = 11, IKILI = 5, DAGIL_BICIM = 6;
  let en = 0, boy = 0, oran = 1, vurgu = '#e8c468', soluk = '#a5a39a', yabanci = '#ff6b5e';
  const boyutla = () => {
    oran = Math.min(devicePixelRatio || 1, 1.5);
    en = innerWidth; boy = innerHeight;
    tuval.width = Math.round(en * oran); tuval.height = Math.round(boy * oran);
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    const s = getComputedStyle(tuval);
    vurgu = s.getPropertyValue('--vurgu').trim() || vurgu;
    soluk = s.getPropertyValue('--soluk').trim() || soluk;
    yabanci = s.getPropertyValue('--yabanci').trim() || yabanci;
  };

  const SURE = 7000;   // bir dizilimde kalma süresi
  const DAGIL = 8000;  // tek tek dolaşma süresi, ardından toplanma gelir
  const GECIS = 1700;  // dizilimden dizilime geçiş süresi
  const TOPLAN = 2800; // dağılmışken toplanma süresi
  let bicim = 0, yon = 0, hiz = 120, basladi = false, sonDegisim = 0, gecisSure = GECIS, sonKayma = scrollY, rahatsiz = 0;

  // Dizilim yuvaları: lidere göre (ileri, yan) birim uzaklıkları. k yuva numarasıdır, 0 lider.
  const yuva = (b: number, k: number, t: number): [number, number] => {
    const kat = Math.ceil(k / 2), yan = k % 2 ? 1 : -1;
    if (b === 1) { const a = (k / N) * Math.PI * 2 + t / 2600; return [Math.cos(a) * 2.4, Math.sin(a) * 2.4]; } // halka: ağır ağır döner
    if (b === 2) return [-kat * 0.12, yan * kat * 1.05]; // çizgi: hafif yay
    if (b === 3) return [-k * 0.95, Math.sin(k * 0.9 + t / 500) * 0.35]; // kol: tek sıra, hafif dalgalı
    if (b === 4) return k <= 6 ? [-kat * 0.9, yan * kat * 0.85] : [-(k - 6) * 0.95, 0]; // ok başı
    if (b === IKILI) { // sürü iki küçük V'ye ayrılır, açılır, sonra yeniden birleşir
      const g = Math.floor(k / 2), gk = Math.ceil(g / 2), gy = g % 2 ? 1 : -1;
      const aralik = 0.7 + Math.sin(Math.PI * Math.min(1, (t - sonDegisim) / SURE)) * 5;
      return [-gk * 1.05, yan * aralik + (g ? gy * gk * 0.8 : 0)];
    }
    return [-kat, yan * kat * 0.9]; // V
  };

  // s: İHA'nın yuvası. bx, by: dizilim değiştiği anda İHA'nın sürüye göre yeri (birim cinsinden).
  const ihalar = Array.from({ length: N }, (_, i) => ({ x: 0, y: 0, vx: 0, vy: 0, aci: 0, s: i, bx: 0, by: 0, sx: 0, sy: 0, st: 0, i, yelken: 0.35 + Math.random() * 0.5 }));
  type Iha = (typeof ihalar)[number];
  const hedef = { x: 0, y: 0 };
  const nokta = { x: 0, y: 0, son: 0 };
  const imlec = { x: -999, y: -999, var: false };
  const cagri = { x: 0, y: 0, t: -9999 };
  const birimHesap = () => Math.max(24, Math.min(38, en / 28));

  // Macar yöntemi: n İHA'yı n yuvaya toplam maliyet en az olacak biçimde eşler. Dönen dizi: İHA sırası → yuva.
  function eslestir(m: number[][]): number[] {
    const n = m.length, u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), yol = new Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) {
      p[0] = i; let j0 = 0;
      const enAz = new Array(n + 1).fill(Infinity), kullanildi = new Array(n + 1).fill(false);
      do {
        kullanildi[j0] = true;
        const i0 = p[j0]; let fark = Infinity, j1 = 0;
        for (let j = 1; j <= n; j++) {
          if (kullanildi[j]) continue;
          const c = m[i0 - 1][j - 1] - u[i0] - v[j];
          if (c < enAz[j]) { enAz[j] = c; yol[j] = j0; }
          if (enAz[j] < fark) { fark = enAz[j]; j1 = j; }
        }
        for (let j = 0; j <= n; j++) { if (kullanildi[j]) { u[p[j]] += fark; v[j] -= fark; } else enAz[j] -= fark; }
        j0 = j1;
      } while (p[j0] !== 0);
      do { const j1 = yol[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    }
    const sonuc = new Array(n).fill(0);
    for (let j = 1; j <= n; j++) sonuc[p[j] - 1] = j - 1;
    return sonuc;
  }

  // Dağılmışken her İHA kendi noktasına gider, varınca yenisini seçer. Üçte biri görüş alanının dışına çıkar.
  const yeniNokta = (u: Iha, t: number) => {
    if (Math.random() < 0.34) {
      const z = Math.random();
      if (z < 0.5) { u.sx = en * Math.random(); u.sy = boy * (1.08 + Math.random() * 0.25); }
      else if (z < 0.75) { u.sx = -en * (0.05 + Math.random() * 0.12); u.sy = boy * Math.random(); }
      else { u.sx = en * (1.05 + Math.random() * 0.12); u.sy = boy * Math.random(); }
    } else {
      do { u.sx = en * (0.03 + Math.random() * 0.94); u.sy = boy * (0.1 + Math.random() * 0.86); }
      while (Math.abs(u.sx / en - 0.5) < 0.27 && Math.abs(u.sy / boy - 0.5) < 0.27);
    }
    u.st = t + 2600 + Math.random() * 2400;
  };

  // Yeni dizilime geç: önce herkesin bugünkü yerini sürüye göre kaydet, sonra yuvaları en kısa toplam yolla dağıt.
  function degistir(yeni: number, t: number, sure = GECIS) {
    bicim = yeni; sonDegisim = t; gecisSure = sure; tuval!.dataset.bicim = String(bicim);
    if (bicim === DAGIL_BICIM) { for (const u of ihalar) yeniNokta(u, t); return; }
    const birim = birimHesap(), c = Math.cos(yon), s = Math.sin(yon);
    for (const u of ihalar) {
      const dx = u.x - hedef.x, dy = u.y - hedef.y;
      u.bx = (dx * c + dy * s) / birim; u.by = (-dx * s + dy * c) / birim;
    }
    const varis = Array.from({ length: N }, (_, k) => yuva(bicim, k, t + sure));
    const atama = eslestir(ihalar.map((u) => varis.map(([a, b]) => Math.hypot(u.bx - a, u.by - b))));
    ihalar.forEach((u, j) => (u.s = atama[j]));
  }
  const dagiliyor = (t: number) => bicim === DAGIL_BICIM && t - sonDegisim < DAGIL;
  const yumusat = (x: number) => x * x * (3 - 2 * x);

  // Yabancı sürü: arada bir ekrana girer. Bizim sürü fark eder, her İHA bir yabancıyı kovalar, yakalayınca düşürür.
  type Yabanci = { x: number; y: number; vx: number; vy: number; aci: number; gx: number; gy: number };
  const yabancilar: Yabanci[] = [];
  const patlamalar: { x: number; y: number; t: number }[] = [];
  const FARK = 2400; // yabancılar ekrana girdikten bu kadar sonra fark edilir
  let onleme = false, onlemeBas = 0, sonrakiBaskin = performance.now() + 15000 + Math.random() * 12000;
  function baskin(t: number) {
    // Kenarlardan birinden V düzeninde girer, ekranın içinden geçip karşı tarafa doğru uçar.
    const aci = Math.random() * Math.PI * 2, yari = Math.hypot(en, boy) / 2 + 80;
    const bx = Math.max(-70, Math.min(en + 70, en / 2 + Math.cos(aci) * yari)), by = Math.max(-70, Math.min(boy + 70, boy / 2 + Math.sin(aci) * yari));
    const karsi = aci + Math.PI + (Math.random() - 0.5) * 1.2; // tam karşısı değil, biraz sapmış
    const gx = en / 2 + Math.cos(karsi) * yari * 1.3, gy = boy / 2 + Math.sin(karsi) * yari * 1.3;
    const a = Math.atan2(gy - by, gx - bx), sayi = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < sayi; i++) {
      const k = Math.ceil(i / 2), yan = i % 2 ? 1 : -1;
      const x = bx + (-k * Math.cos(a) + yan * k * 0.9 * Math.sin(a)) * 30, y = by + (-k * Math.sin(a) - yan * k * 0.9 * Math.cos(a)) * 30;
      yabancilar.push({ x, y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, aci: a, gx, gy });
    }
    onleme = true; onlemeBas = t; tuval!.dataset.onleme = '1';
  }
  function onlemeAdimi(t: number, dt: number) {
    for (const y of yabancilar) {
      // Yoluna devam etmeye çalışır, bizimkiler yaklaşınca kaçar.
      const m = Math.hypot(y.gx - y.x, y.gy - y.y) || 1;
      let ax = ((y.gx - y.x) / m) * 110, ay = ((y.gy - y.y) / m) * 110;
      if (t - onlemeBas > FARK) for (const u of ihalar) { const ex = y.x - u.x, ey = y.y - u.y, r = Math.hypot(ex, ey) || 1; if (r < 140) { ax += (ex / r) * (1 - r / 140) * 900; ay += (ey / r) * (1 - r / 140) * 900; } }
      if (t - onlemeBas > 2200) { // ekrana girdikten sonra kenardan kaçamaz
        if (y.x < 30) ax += 700;
        if (y.x > en - 30) ax -= 700;
        if (y.y < 80) ay += 700;
        if (y.y > boy - 30) ay -= 700;
      }
      y.vx += ax * dt; y.vy += ay * dt;
      const h = Math.hypot(y.vx, y.vy), sinir = 170;
      if (h > sinir) { y.vx *= sinir / h; y.vy *= sinir / h; }
      y.x += y.vx * dt; y.y += y.vy * dt; y.aci = Math.atan2(y.vy, y.vx);
    }
    if (t - onlemeBas > FARK) for (let i = yabancilar.length - 1; i >= 0; i--) { // yakalanan düşer
      const y = yabancilar[i];
      if (ihalar.some((u) => Math.hypot(u.x - y.x, u.y - y.y) < 15)) { patlamalar.push({ x: y.x, y: y.y, t }); yabancilar.splice(i, 1); }
    }
    if (t - onlemeBas > 16000) yabancilar.length = 0; // emniyet: takılırsa bırak
    if (!yabancilar.length) { // iş bitti: sürü yeniden dizilime girer
      onleme = false; tuval!.dataset.onleme = '0';
      sonrakiBaskin = t + 40000 + Math.random() * 30000;
      degistir(bicim === DAGIL_BICIM ? 0 : bicim, t, TOPLAN);
    }
  }

  function adim(t: number, dt: number) {
    // Lider rastgele seçilen noktalara uçar. Dönüş hızı sınırlı olduğu için rota yumuşak kavisler çizer.
    const uzaklik = Math.hypot(nokta.x - hedef.x, nokta.y - hedef.y);
    if (uzaklik < 70 || t > nokta.son) {
      const atilis = Math.random() < 0.35; // çoğu zaman yakına, arada bir ekranın öbür ucuna
      let x = 0, y = 0;
      for (let k = 0; k < 6; k++) {
        x = en * (0.08 + Math.random() * 0.84); y = boy * (0.14 + Math.random() * 0.74);
        const m = Math.hypot(x - hedef.x, y - hedef.y);
        if (atilis ? m > Math.min(en, boy) * 0.55 : m > 160 && m < 520) break;
      }
      nokta.x = x; nokta.y = y; nokta.son = t + 8000;
    }
    let fark = Math.atan2(nokta.y - hedef.y, nokta.x - hedef.x) - yon;
    while (fark > Math.PI) fark -= 2 * Math.PI;
    while (fark < -Math.PI) fark += 2 * Math.PI;
    // Dizilime girerken sürü sert dönmez, yoksa yuvalar savrulur.
    const gecisteki = bicim !== DAGIL_BICIM && t - sonDegisim < gecisSure;
    yon += Math.max(-1.7 * dt, Math.min(1.7 * dt, fark)) * (gecisteki ? 0.45 : 1);
    const istenen = Math.max(60, Math.min(300, uzaklik * 0.7)) * (Math.abs(fark) > 0.7 ? 0.5 : 1) * (gecisteki ? 0.6 : 1);
    hiz += (istenen - hiz) * Math.min(1, dt * (istenen > hiz ? 1.4 : 2.6));
    hedef.x += Math.cos(yon) * hiz * dt; hedef.y += Math.sin(yon) * hiz * dt;
    // Sayfa kayınca rüzgâr: sürü kaydırmanın tersine savrulur, her İHA başka kadar. Sonra yerine toplanır.
    const kayma = Math.max(-140, Math.min(140, scrollY - sonKayma)); sonKayma = scrollY;
    if (kayma) {
      hedef.y -= kayma * 0.3;
      for (const u of ihalar) { u.y -= kayma * u.yelken; u.vx += (Math.random() - 0.5) * Math.abs(kayma) * 9; u.vy -= kayma * 3 * u.yelken; }
    }
    hedef.x = Math.max(30, Math.min(en - 30, hedef.x)); hedef.y = Math.max(70, Math.min(boy - 30, hedef.y));

    if (!onleme && t > sonrakiBaskin && !dagiliyor(t) && !document.hidden) baskin(t);
    if (onleme) onlemeAdimi(t, dt);
    // Çok kurcalanınca (imleçle üstüne gitmek, art arda çağırmak) sürü tek tek dağılır.
    rahatsiz = Math.max(0, rahatsiz - dt * 0.35);
    if (rahatsiz > 4 && !onleme && !dagiliyor(t)) { rahatsiz = 0; degistir(DAGIL_BICIM, t); }
    if (!onleme) {
      if (bicim === DAGIL_BICIM && t - sonDegisim > DAGIL) degistir(0, t, TOPLAN); // dağılma bitti: V'de toplan
      else if (t - sonDegisim > SURE + gecisSure) {
        // Sıradaki dizilim ağırlıklı rastgele seçilir, aynısı üst üste gelmez.
        const agirlik = adlar.map((_, k) => (k === bicim ? 0 : k === DAGIL_BICIM ? 2.5 : k === IKILI ? 2 : 1.5));
        let zar = Math.random() * agirlik.reduce((x, y) => x + y, 0);
        degistir(agirlik.findIndex((g) => (zar -= g) < 0), t);
      }
    }

    const dagil = dagiliyor(t), kovala = onleme && yabancilar.length && t - onlemeBas > FARK;
    const birim = birimHesap(), c = Math.cos(yon), s = Math.sin(yon);
    const e = yumusat(Math.min(1, (t - sonDegisim) / gecisSure));
    for (const u of ihalar) {
      if (dagil && (t > u.st || Math.hypot(u.sx - u.x, u.sy - u.y) < 40)) yeniNokta(u, t);
      // Yuvaya giden yol: dizilim değiştiği andaki yerden yuvaya düz çizgi, başta ve sonda yavaş.
      const [ileri, yan] = yuva(bicim, u.s, t);
      const oi = u.bx + (ileri - u.bx) * e, oy = u.by + (yan - u.by) * e;
      const hx = dagil ? u.sx : hedef.x + (oi * c - oy * s) * birim, hy = dagil ? u.sy : hedef.y + (oi * s + oy * c) * birim;
      // Dağılırken yay yumuşaktır. Dizilimde sıkı tutar, arkadakiler biraz daha gevşektir.
      const sertlik = dagil ? 2.8 : 16 - Math.min(5, u.s * 0.45);
      let ax = (hx - u.x) * sertlik, ay = (hy - u.y) * sertlik;
      if (kovala) { // önleme: her İHA bir yabancıyı kovalar, yaklaştıkça hız kesmez
        const y = yabancilar[u.i % yabancilar.length], ex = y.x - u.x, ey = y.y - u.y, m = Math.hypot(ex, ey) || 1;
        ax = (ex / m) * (1050 + m * 2); ay = (ey / m) * (1050 + m * 2);
      }
      if (imlec.var) { // imleç yaklaşınca kaçar: ne kadar yakınsa o kadar sert
        const ex = u.x - imlec.x, ey = u.y - imlec.y, m = Math.hypot(ex, ey) || 1, alan = 120;
        if (m < alan) { const g = (1 - m / alan) ** 2 * 5200; ax += (ex / m) * g; ay += (ey / m) * g; rahatsiz += dt * (1 - m / alan) * 0.9; }
      }
      for (const o of ihalar) { // ayrılma: birbirine fazla yaklaşan itilir
        if (o === u) continue;
        const ex = u.x - o.x, ey = u.y - o.y, m = Math.hypot(ex, ey);
        if (m > 0 && m < birim * 0.7) { ax += (ex / m) * (birim * 0.7 - m) * 40; ay += (ey / m) * (birim * 0.7 - m) * 40; }
      }
      u.vx = (u.vx + ax * dt) * Math.pow(0.012, dt); u.vy = (u.vy + ay * dt) * Math.pow(0.012, dt);
      u.x += u.vx * dt; u.y += u.vy * dt;
      // Burun: hızlıyken gittiği yöne, dizilimde sürünün yönüne döner. Ani dönmez.
      const h = Math.hypot(u.vx, u.vy), istenenAci = h > 55 || dagil || kovala ? Math.atan2(u.vy, u.vx) : yon;
      let d = istenenAci - u.aci;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      u.aci += Math.max(-7 * dt, Math.min(7 * dt, d));
    }
  }

  // Dört pervaneli gövde, üstten görünüş: çapraz kollar, uçlarda dönen pervaneler, önde burun işareti.
  function govde(x: number, y: number, aci: number, h: number, renk: string, a: number, faz: number) {
    const kol = 5.2, pr = 3;
    ctx.save(); ctx.translate(x, y); ctx.rotate(aci);
    if (h > 30) { // hız izi
      const uz = Math.min(26, h * 0.07), iz = ctx.createLinearGradient(-8 - uz, 0, -8, 0);
      iz.addColorStop(0, 'transparent'); iz.addColorStop(1, renk);
      ctx.globalAlpha = a * 0.5; ctx.strokeStyle = iz; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8 - uz, 0); ctx.lineTo(-8, 0); ctx.stroke();
    }
    ctx.globalAlpha = a; ctx.strokeStyle = renk; ctx.fillStyle = renk; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-kol, -kol); ctx.lineTo(kol, kol); ctx.moveTo(-kol, kol); ctx.lineTo(kol, -kol); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-2.6, -2, 5.2, 4, 1.2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2.6, -1.4); ctx.lineTo(5, 0); ctx.lineTo(2.6, 1.4); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 4; k++) {
      const px = k < 2 ? kol : -kol, py = k % 2 ? kol : -kol;
      ctx.globalAlpha = a * 0.45; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.stroke();
      const d = (k === 0 || k === 3 ? 1 : -1) * faz; // komşu pervaneler ters yöne döner
      ctx.globalAlpha = a; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px - Math.cos(d) * pr, py - Math.sin(d) * pr); ctx.lineTo(px + Math.cos(d) * pr, py + Math.sin(d) * pr); ctx.stroke();
    }
    ctx.restore();
  }

  function ciz() {
    const simdi = performance.now(), faz = simdi / 45;
    ctx.clearRect(0, 0, en, boy);
    const kovaliyor = onleme && simdi - onlemeBas > FARK;
    if (!dagiliyor(simdi) && !kovaliyor) { // haberleşme bağları: her İHA bir öndeki yuvadakine bağlı
      const yuvada: Iha[] = [];
      for (const u of ihalar) yuvada[u.s] = u;
      ctx.lineWidth = 1; ctx.strokeStyle = vurgu; ctx.globalAlpha = 0.13; ctx.beginPath();
      for (const u of ihalar) {
        const o = yuvada[bicim === 1 || bicim === 3 ? (u.s + N - 1) % N : Math.max(0, u.s - 2)];
        if (!o || o === u || (bicim === 3 && !u.s) || (bicim === IKILI && u.s === 1)) continue;
        ctx.moveTo(u.x, u.y); ctx.lineTo(o.x, o.y);
      }
      ctx.stroke();
    }
    const kis = en < 600 ? 0.6 : 1; // dar ekranda metnin üstünden geçerken daha silik
    for (const u of ihalar) govde(u.x, u.y, u.aci, Math.hypot(u.vx, u.vy), vurgu, (u.s ? 0.5 : 0.85) * kis, faz + u.i);
    for (const y of yabancilar) govde(y.x, y.y, y.aci, 0, yabanci, 0.8 * kis, -faz);
    for (let i = patlamalar.length - 1; i >= 0; i--) { // düşen yabancının yerinde kısa bir parlama
      const p = patlamalar[i], o = (simdi - p.t) / 600;
      if (o >= 1) { patlamalar.splice(i, 1); continue; }
      ctx.strokeStyle = yabanci; ctx.lineWidth = 1.5; ctx.globalAlpha = (1 - o) * 0.9;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4 + o * 20, 0, Math.PI * 2);
      for (let k = 0; k < 6; k++) { const a = k * 1.047 + p.x; ctx.moveTo(p.x + Math.cos(a) * (6 + o * 14), p.y + Math.sin(a) * (6 + o * 14)); ctx.lineTo(p.x + Math.cos(a) * (10 + o * 30), p.y + Math.sin(a) * (10 + o * 30)); }
      ctx.stroke();
    }
    const gecen = simdi - cagri.t;
    if (gecen < 900) { // çağrı işareti: tıklanan yerde açılan halka
      const o = gecen / 900;
      ctx.strokeStyle = vurgu; ctx.lineWidth = 1.5; ctx.globalAlpha = (1 - o) * 0.8;
      ctx.beginPath(); ctx.arc(cagri.x, cagri.y, 6 + o * 34, 0, Math.PI * 2);
      ctx.moveTo(cagri.x - 5, cagri.y); ctx.lineTo(cagri.x + 5, cagri.y); ctx.moveTo(cagri.x, cagri.y - 5); ctx.lineTo(cagri.x, cagri.y + 5); ctx.stroke();
    }
    const ad = kovaliyor ? tuval!.dataset.onlemeAdi ?? 'önleme' : adlar[bicim];
    ctx.globalAlpha = 0.7; ctx.fillStyle = soluk; ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'right';
    ctx.fillText(`${(tuval!.dataset.etiket ?? 'sürü').toUpperCase()} · ${N} · ${ad.toUpperCase()}`, en - 12, boy - 12);
    ctx.globalAlpha = 1;
  }

  function yerlestir() { // ilk kare: sürü ekranın sağ altında hazır dursun, giriş yazısının üstünde değil
    hedef.x = en * 0.8; hedef.y = boy * 0.78; yon = Math.PI; nokta.x = en * 0.35; nokta.y = boy * 0.45; nokta.son = 9000;
    const birim = birimHesap();
    for (const u of ihalar) {
      const [ileri, yan] = yuva(0, u.i, 0);
      u.s = u.i; u.bx = ileri; u.by = yan;
      u.x = hedef.x - ileri * birim; u.y = hedef.y - yan * birim; u.aci = Math.PI; u.vx = u.vy = 0;
    }
  }

  let kare = 0, son = 0;
  const kok = document.documentElement;
  const kapali = () => kok.dataset.suru === 'kapali';
  const dongu = (t: number) => {
    const dt = Math.min(0.05, (t - son) / 1000 || 0.016); son = t;
    adim(t, dt); ciz();
    kare = !document.hidden && !azalt.matches && !kapali() ? requestAnimationFrame(dongu) : 0;
  };
  const baslat = () => {
    if (azalt.matches || kapali()) { ctx.clearRect(0, 0, en, boy); return; }
    if (!basladi) { boyutla(); yerlestir(); basladi = true; tuval.dataset.bicim = '0'; tuval.dataset.onleme = '0'; }
    if (!kare && !document.hidden) { son = performance.now(); kare = requestAnimationFrame(dongu); }
  };
  const dugme = document.querySelector<HTMLButtonElement>('[data-suru-dugme]');
  dugme?.setAttribute('aria-pressed', String(!kapali()));
  dugme?.addEventListener('click', () => {
    if (kapali()) delete kok.dataset.suru; else kok.dataset.suru = 'kapali';
    try { localStorage.setItem('suru', kapali() ? 'kapali' : 'acik'); } catch {}
    dugme.setAttribute('aria-pressed', String(!kapali()));
    baslat();
  });
  addEventListener('resize', () => basladi && boyutla());
  document.addEventListener('visibilitychange', baslat);
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') { imlec.x = e.clientX; imlec.y = e.clientY; imlec.var = true; } }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => (imlec.var = false));
  // Boş bir yere tıklamak sürüyü oraya çağırır. Bağlantı, düğme ve benzetimin üstündeki tıklamalara karışmaz.
  addEventListener('click', (e) => {
    if (!kare || (e.target as HTMLElement).closest('a, button, input, textarea, select, label, video, canvas, summary, dialog, .uye, [role="button"]')) return;
    if (getSelection()?.toString()) return;
    nokta.x = cagri.x = e.clientX; nokta.y = cagri.y = e.clientY; nokta.son = performance.now() + 6000; cagri.t = performance.now();
    rahatsiz += 1.1;
  });
  azalt.addEventListener('change', baslat);
  // Tema değişince renkler yeniden okunur.
  new MutationObserver(() => basladi && boyutla()).observe(kok, { attributes: true, attributeFilter: ['data-theme'] });
  // Deneme betiği için: yabancı sürüyü beklemeden çağırmak (?baskin adresiyle).
  if (new URLSearchParams(location.search).has('baskin')) sonrakiBaskin = performance.now() + 1500;
  baslat();
}
