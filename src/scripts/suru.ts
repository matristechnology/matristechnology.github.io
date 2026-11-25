// Sayfanın arkasında süzülen sürü: küçük İHA'lar ekranda dolaşır, birkaç saniyede bir sıradaki dizilime geçer.
// Süs amaçlıdır: tuval aria-hidden, tıklamaları yutmaz, "hareketi azalt" açıksa hiç çizilmez.
// Ziyaretçi üst menüdeki düğmeyle kapatabilir, seçim tarayıcıda hatırlanır.
const tuval = document.querySelector<HTMLCanvasElement>('canvas[data-suru]');
if (tuval) {
  const ctx = tuval.getContext('2d')!;
  const azalt = matchMedia('(prefers-reduced-motion: reduce)');
  const adlar = (tuval.dataset.formasyonlar ?? 'V,halka,çizgi,kol,ok başı,ikili,dağıl').split(',');
  const N = 11, DAGIL_BICIM = 6, IKILI = 5;
  let en = 0, boy = 0, oran = 1, vurgu = '#e8c468', soluk = '#a5a39a';
  const boyutla = () => {
    oran = Math.min(devicePixelRatio || 1, 1.5);
    en = innerWidth; boy = innerHeight;
    tuval.width = Math.round(en * oran); tuval.height = Math.round(boy * oran);
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    const s = getComputedStyle(tuval);
    vurgu = s.getPropertyValue('--vurgu').trim() || vurgu;
    soluk = s.getPropertyValue('--soluk').trim() || soluk;
  };

  const SURE = 7000;   // bir dizilimde kalma süresi
  const DAGIL = 8000;  // tek tek dolaşma süresi, ardından toplanma gelir
  let bicim = 0, yon = 0, hiz = 120, basladi = false, sonDegisim = 0, sonKayma = scrollY, rahatsiz = 0;

  // Dizilim yuvaları: lidere göre (ileri, yan) birim uzaklıkları.
  const yuva = (i: number, t: number): [number, number] => {
    const k = Math.ceil(i / 2), yan = i % 2 ? 1 : -1;
    if (bicim === 1) { const a = (i / N) * Math.PI * 2 + t / 2600; return [Math.cos(a) * 2.4, Math.sin(a) * 2.4]; } // halka: ağır ağır döner
    if (bicim === 2) return [-k * 0.12, yan * k * 1.05]; // çizgi: hafif yay
    if (bicim === 3) return [-i * 0.95, Math.sin(i * 0.9 + t / 500) * 0.35]; // kol: tek sıra, hafif dalgalı
    if (bicim === 4) return i <= 6 ? [-k * 0.9, yan * k * 0.85] : [-(i - 6) * 0.95, 0]; // ok başı
    if (bicim === IKILI) { // sürü iki küçük V'ye ayrılır, açılır, sonra yeniden birleşir
      const g = Math.floor(i / 2), gk = Math.ceil(g / 2), gy = g % 2 ? 1 : -1;
      const aralik = 0.7 + Math.sin(Math.PI * Math.min(1, (t - sonDegisim) / SURE)) * 5;
      return [-gk * 1.05, yan * aralik + (g ? gy * gk * 0.8 : 0)];
    }
    return [-k, yan * k * 0.9]; // V (dağılma sonrası toplanırken de)
  };

  const ihalar = Array.from({ length: N }, (_, i) => ({ x: 0, y: 0, vx: 0, vy: 0, aci: 0, sx: 0, sy: 0, st: 0, i, yelken: 0.35 + Math.random() * 0.5 }));
  type Iha = (typeof ihalar)[number];
  const hedef = { x: 0, y: 0 };
  const nokta = { x: 0, y: 0, son: 0 };
  const imlec = { x: -999, y: -999, var: false };
  const cagri = { x: 0, y: 0, t: -9999 };

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
  const dagit = (t: number) => {
    bicim = DAGIL_BICIM; sonDegisim = t; tuval.dataset.bicim = String(bicim);
    for (const u of ihalar) yeniNokta(u, t);
  };
  const dagiliyor = (t: number) => bicim === DAGIL_BICIM && t - sonDegisim < DAGIL;

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
    yon += Math.max(-1.7 * dt, Math.min(1.7 * dt, fark));
    const istenen = Math.max(60, Math.min(300, uzaklik * 0.7)) * (Math.abs(fark) > 0.7 ? 0.5 : 1);
    hiz += (istenen - hiz) * Math.min(1, dt * (istenen > hiz ? 1.4 : 2.6));
    hedef.x += Math.cos(yon) * hiz * dt; hedef.y += Math.sin(yon) * hiz * dt;
    // Sayfa kayınca rüzgâr: sürü kaydırmanın tersine savrulur, her İHA başka kadar. Sonra yerine toplanır.
    const kayma = Math.max(-140, Math.min(140, scrollY - sonKayma)); sonKayma = scrollY;
    if (kayma) {
      hedef.y -= kayma * 0.3;
      for (const u of ihalar) { u.y -= kayma * u.yelken; u.vx += (Math.random() - 0.5) * Math.abs(kayma) * 9; u.vy -= kayma * 3 * u.yelken; }
    }
    hedef.x = Math.max(30, Math.min(en - 30, hedef.x)); hedef.y = Math.max(70, Math.min(boy - 30, hedef.y));
    // Çok kurcalanınca (imleçle üstüne gitmek, art arda çağırmak) sürü tek tek dağılır.
    rahatsiz = Math.max(0, rahatsiz - dt * 0.35);
    if (rahatsiz > 4 && !dagiliyor(t)) { rahatsiz = 0; dagit(t); }
    if (t - sonDegisim > (bicim === DAGIL_BICIM ? DAGIL + 3500 : SURE)) {
      // Sıradaki dizilim ağırlıklı rastgele seçilir, aynısı üst üste gelmez.
      const agirlik = adlar.map((_, k) => (k === bicim ? 0 : k === DAGIL_BICIM ? 3 : k === IKILI ? 2 : 1.5));
      let zar = Math.random() * agirlik.reduce((x, y) => x + y, 0);
      bicim = agirlik.findIndex((g) => (zar -= g) < 0); sonDegisim = t;
      tuval.dataset.bicim = String(bicim);
      if (bicim === DAGIL_BICIM) dagit(t);
    }
    const dagil = dagiliyor(t);
    const birim = Math.max(24, Math.min(38, en / 28));
    const c = Math.cos(yon), s = Math.sin(yon);
    for (const u of ihalar) {
      if (dagil && (t > u.st || Math.hypot(u.sx - u.x, u.sy - u.y) < 40)) yeniNokta(u, t);
      const [ileri, yan] = yuva(u.i, t);
      const hx = dagil ? u.sx : hedef.x + (ileri * c - yan * s) * birim, hy = dagil ? u.sy : hedef.y + (ileri * s + yan * c) * birim;
      // Arkadakiler daha gevşek izler: dönüşlerde sürü açılır, sonra toplanır. Dağılırken yay yumuşaktır.
      const sertlik = bicim === DAGIL_BICIM ? (dagil ? 2.8 : 4.5) : 15 - Math.min(6, u.i * 0.5);
      let ax = (hx - u.x) * sertlik, ay = (hy - u.y) * sertlik;
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
      if (Math.hypot(u.vx, u.vy) > 12) u.aci = Math.atan2(u.vy, u.vx);
    }
  }

  // Dört pervaneli gövde, üstten görünüş: çapraz kollar, uçlarda dönen pervaneler, önde burun işareti.
  function govde(u: Iha, a: number, faz: number) {
    const kol = 5.2, pr = 3, h = Math.hypot(u.vx, u.vy);
    ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.aci);
    if (h > 30) { // hız izi
      const uz = Math.min(26, h * 0.07), iz = ctx.createLinearGradient(-8 - uz, 0, -8, 0);
      iz.addColorStop(0, 'transparent'); iz.addColorStop(1, vurgu);
      ctx.globalAlpha = a * 0.5; ctx.strokeStyle = iz; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8 - uz, 0); ctx.lineTo(-8, 0); ctx.stroke();
    }
    ctx.globalAlpha = a; ctx.strokeStyle = vurgu; ctx.fillStyle = vurgu; ctx.lineWidth = 1.3;
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
    if (!dagiliyor(simdi)) { // haberleşme bağları: her İHA bir öndekine bağlı
      ctx.lineWidth = 1; ctx.strokeStyle = vurgu; ctx.globalAlpha = 0.13; ctx.beginPath();
      for (const u of ihalar) {
        const o = ihalar[bicim === 1 || bicim === 3 ? (u.i + N - 1) % N : Math.max(0, u.i - 2)];
        if (o === u || (bicim === 3 && !u.i) || (bicim === IKILI && u.i === 1)) continue;
        ctx.moveTo(u.x, u.y); ctx.lineTo(o.x, o.y);
      }
      ctx.stroke();
    }
    const kis = en < 600 ? 0.6 : 1; // dar ekranda metnin üstünden geçerken daha silik
    for (const u of ihalar) govde(u, (u.i ? 0.5 : 0.85) * kis, faz + u.i);
    const gecen = simdi - cagri.t;
    if (gecen < 900) { // çağrı işareti: tıklanan yerde açılan halka
      const o = gecen / 900;
      ctx.strokeStyle = vurgu; ctx.lineWidth = 1.5; ctx.globalAlpha = (1 - o) * 0.8;
      ctx.beginPath(); ctx.arc(cagri.x, cagri.y, 6 + o * 34, 0, Math.PI * 2);
      ctx.moveTo(cagri.x - 5, cagri.y); ctx.lineTo(cagri.x + 5, cagri.y); ctx.moveTo(cagri.x, cagri.y - 5); ctx.lineTo(cagri.x, cagri.y + 5); ctx.stroke();
    }
    ctx.globalAlpha = 0.7; ctx.fillStyle = soluk; ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'right';
    ctx.fillText(`${(tuval!.dataset.etiket ?? 'sürü').toUpperCase()} · ${N} · ${adlar[bicim].toUpperCase()}`, en - 12, boy - 12);
    ctx.globalAlpha = 1;
  }

  function yerlestir() { // ilk kare: sürü ekranın sağ altında hazır dursun, giriş yazısının üstünde değil
    hedef.x = en * 0.8; hedef.y = boy * 0.78; yon = Math.PI; nokta.x = en * 0.35; nokta.y = boy * 0.45; nokta.son = 9000;
    const birim = Math.max(20, Math.min(34, en / 30));
    for (const u of ihalar) { const [ileri, yan] = yuva(u.i, 0); u.x = hedef.x - ileri * birim; u.y = hedef.y + yan * birim; u.aci = Math.PI; u.vx = u.vy = 0; }
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
    if (!basladi) { boyutla(); yerlestir(); basladi = true; tuval.dataset.bicim = '0'; }
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
  baslat();
}
