// Sayfanın arkasında dolaşan İHA'lar. Süs amaçlıdır: tuval aria-hidden, tıklamaları yutmaz,
// "hareketi azalt" açıksa hiç çizilmez. Ziyaretçi üst menüdeki düğmeyle kapatabilir, seçim tarayıcıda hatırlanır.
//
// Davranış:
//   - Bölge: 30 İHA'nın her birinin sayfada bir bölgesi var, bölgeler sayfa boyunca eşit aralıkla dizilir.
//     Serbestken her İHA kendi bölgesinde dolaşır: bir noktaya gider, asılı kalır, yenisine geçer.
//   - Dizilim: arada bir, görüş alanındaki İHA'lar dizilim kurar (en az 5, en çok 12). Az varsa en yakındakiler gelir.
//     Her İHA'ya toplam yolu en kısa yapan yuva verilir (Macar yöntemi), böyle seçilen yollar birbirini kesmez.
//     Dizilim görüş alanında durur. Sürü kuruluyken görüş alanına giren İHA gelip katılır. Yer kalmadıysa
//     bölgesi görüş alanından en uzak üye ayrılıp kendi bölgesine döner. Bölgesi çok uzakta kalan üye de ayrılır.
//     Sürü bir iki yere gider, dizilim değiştirir ya da yerinde döner (yaw), sonra herkes bölgesine dağılır.
//   - Yabancı sürü: arada bir kenardan girer. Bizimkiler dağınıksa önce dizilime girer, dizilimle hücum eder,
//     yaklaşınca her İHA bir yabancıyı kovalayıp düşürür, sonra dağılır.
const tuval = document.querySelector<HTMLCanvasElement>('canvas[data-suru]');
if (tuval) {
  const ctx = tuval.getContext('2d')!;
  const azalt = matchMedia('(prefers-reduced-motion: reduce)');
  const veri = tuval.dataset;
  const adlar = (veri.formasyonlar ?? 'V,halka,çizgi,kol,ok başı').split(',');
  const N = 30, EN_AZ = 5, EN_COK = 12, GECIS = 1700, BEKLEME = 6000; // BEKLEME: ayrılan İHA bu kadar süre yeniden katılmaz
  let en = 0, boy = 0, oran = 1, belgeBoy = 0, vurgu = '#e8c468', soluk = '#a5a39a', yabanci = '#ff6b5e';
  const boyutla = () => {
    oran = Math.min(devicePixelRatio || 1, 1.5);
    en = innerWidth; boy = innerHeight; belgeBoy = Math.max(boy, document.documentElement.scrollHeight);
    tuval.width = Math.round(en * oran); tuval.height = Math.round(boy * oran);
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    const s = getComputedStyle(tuval);
    vurgu = s.getPropertyValue('--vurgu').trim() || vurgu;
    soluk = s.getPropertyValue('--soluk').trim() || soluk;
    yabanci = s.getPropertyValue('--yabanci').trim() || yabanci;
  };
  const rastgele = (a: number, b: number) => a + Math.random() * (b - a);
  const sec = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
  const aciFarki = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const yumusat = (x: number) => x * x * (3 - 2 * x);

  // İHA: x, y sayfa koordinatı. ex, ey bölgenin merkezi (oran olarak). tx, ty serbestken gidilen nokta.
  // s dizilimdeki yuva, bx, by son yuva dağıtımı anında sürüye göre yeri (birim cinsinden).
  type Iha = { i: number; x: number; y: number; vx: number; vy: number; aci: number; ex: number; ey: number; tx: number; ty: number; bekle: number; hiz: number; s: number; bx: number; by: number; ayrildi: number };
  const ihalar: Iha[] = Array.from({ length: N }, (_, i) => ({
    i, x: 0, y: 0, vx: 0, vy: 0, aci: Math.random() * 6.28, ex: rastgele(0.12, 0.88), ey: (i + rastgele(0.2, 0.8)) / N,
    tx: 0, ty: 0, bekle: 0, hiz: rastgele(80, 125), s: 0, bx: 0, by: 0, ayrildi: -1e9,
  }));
  const evX = (u: Iha) => u.ex * en, evY = (u: Iha) => 90 + u.ey * (belgeBoy - 130);
  const bolgeY = () => Math.max(160, (belgeBoy / N) * 0.9); // bölgenin dikey yarı boyu
  const evUzak = (u: Iha) => Math.abs(evY(u) - (scrollY + boy / 2)); // bölgenin görüş alanının ortasına uzaklığı
  const ekranda = (u: Iha, pay = 0) => u.y - scrollY > -pay && u.y - scrollY < boy + pay && u.x > -pay && u.x < en + pay;

  type Mod = 'serbest' | 'toplan' | 'dizilim' | 'onleme';
  type Adim = 'topla' | 'git' | 'degis' | 'yaw';
  type Faz = 'topla' | 'hucum' | 'kovala';
  let mod: Mod = 'serbest', uyeler: Iha[] = [], adim: Adim = 'topla', adimlar: Adim[] = [], adimT = 0, gecisBas = -1e9, faz: Faz = 'topla';
  let bicim = 0, yon = 0, hedefYon = 0, sonrakiDizilim = performance.now() + 4000, rahatsiz = 0, basladi = false, sonUyeKontrol = 0;
  let katilanSayac = 0, ayrilanSayac = 0;
  const merkez = { x: 0, y: 0, vx: 0, vy: 0 }, hedef = { x: 0, y: 0 }; // ekran koordinatı: dizilim görüş alanında kalır
  const imlec = { x: -999, y: -999, var: false };
  const cagri = { x: 0, y: 0, t: -9999 };
  const birimHesap = () => Math.max(26, Math.min(40, en / 30));
  const surude = () => mod === 'toplan' || mod === 'dizilim' || (mod === 'onleme' && faz !== 'kovala');
  const iz = () => { veri.mod = mod; veri.uye = String(uyeler.length); veri.bicim = String(bicim); veri.faz = mod === 'onleme' ? faz : ''; veri.katilan = String(katilanSayac); veri.ayrilan = String(ayrilanSayac); };

  // Yuvalar: lidere göre (ileri, yan) birim uzaklıkları. k yuva numarası (0 lider), n üye sayısı.
  const yuva = (b: number, k: number, n: number, t: number): [number, number] => {
    const kat = Math.ceil(k / 2), yan = k % 2 ? 1 : -1;
    if (b === 1) { const r = Math.max(1.3, n * 0.2), a = (k / n) * Math.PI * 2 + t / 2600; return [Math.cos(a) * r, Math.sin(a) * r]; } // halka: ağır ağır döner
    if (b === 2) return [-kat * 0.12, yan * kat * 1.05]; // çizgi: hafif yay
    if (b === 3) return [-k * 0.95, Math.sin(k * 0.9 + t / 500) * 0.35]; // kol: tek sıra, hafif dalgalı
    if (b === 4) return k <= 4 ? [-kat * 0.9, yan * kat * 0.85] : [-(1.8 + (k - 4) * 0.9), 0]; // ok başı: iki kol ve gövde
    return [-kat, yan * kat * 0.9]; // V: kollar geriye açılır
  };
  // Yuvanın ekrandaki yeri. Son dağıtımdan bu yana GECIS süresince eski yerden yeni yuvaya düz çizgiyle geçilir.
  const yuvaEkranda = (u: Iha, t: number): [number, number] => {
    const e = yumusat(Math.max(0, Math.min(1, (t - gecisBas) / GECIS)));
    const [ileri, yan] = yuva(bicim, u.s, uyeler.length, t), birim = birimHesap(), c = Math.cos(yon), s = Math.sin(yon);
    const oi = u.bx + (ileri - u.bx) * e, oy = u.by + (yan - u.by) * e;
    return [merkez.x + (oi * c - oy * s) * birim, merkez.y + (oi * s + oy * c) * birim];
  };

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
  // Yuvaları yeniden dağıt: herkesin bugünkü yeri sürüye göre kaydedilir, en kısa toplam yolla yuvalar verilir,
  // sonra GECIS süresince düz çizgiyle geçilir. Dizilim değişince, üye katılınca ya da ayrılınca çağrılır.
  function yenidenYuvala(t: number, varisT = t + GECIS) {
    const birim = birimHesap(), c = Math.cos(yon), s = Math.sin(yon), n = uyeler.length;
    for (const u of uyeler) { const dx = u.x - merkez.x, dy = u.y - scrollY - merkez.y; u.bx = (dx * c + dy * s) / birim; u.by = (-dx * s + dy * c) / birim; }
    const yuvalar = uyeler.map((_, k) => yuva(bicim, k, n, varisT));
    const atama = eslestir(uyeler.map((u) => yuvalar.map(([a, b]) => Math.hypot(u.bx - a, u.by - b))));
    uyeler.forEach((u, j) => (u.s = atama[j]));
    gecisBas = t;
  }

  // Serbest dolaşma: bir sonraki nokta İHA'nın kendi bölgesinden seçilir.
  const yeniHedef = (u: Iha) => {
    const ry = bolgeY();
    u.tx = Math.max(24, Math.min(en - 24, evX(u) + rastgele(-0.22, 0.22) * en));
    u.ty = Math.max(90, Math.min(belgeBoy - 40, evY(u) + rastgele(-ry, ry)));
    u.bekle = 0;
  };
  const ayril = (u: Iha, t: number) => { uyeler = uyeler.filter((o) => o !== u); u.ayrildi = t; yeniHedef(u); ayrilanSayac++; };

  // Görüş alanındaki İHA'lar katılır. Az kalırsa ekrana en yakın olanlar çağrılır, çok olursa en yakındakiler kalır.
  const katilanlar = (t: number) => {
    const orta = { x: en / 2, y: scrollY + boy / 2 }, uzak = (u: Iha) => Math.hypot(u.x - orta.x, u.y - orta.y);
    const sirali = ihalar.filter((u) => t - u.ayrildi > BEKLEME || ekranda(u)).sort((a, b) => uzak(a) - uzak(b));
    const gorunen = sirali.filter((u) => ekranda(u));
    veri.gorunen = String(gorunen.length);
    return sirali.slice(0, Math.max(EN_AZ, Math.min(EN_COK, gorunen.length)));
  };
  // Sürünün merkezi ve yönü: üyelerin ortası, görüş alanının içine çekilmiş.
  const surunuKur = (t: number, cx?: number, cy?: number) => {
    uyeler = katilanlar(t);
    const kx = uyeler.reduce((a, u) => a + u.x, 0) / uyeler.length, ky = uyeler.reduce((a, u) => a + u.y - scrollY, 0) / uyeler.length;
    merkez.x = Math.max(en * 0.22, Math.min(en * 0.78, cx ?? kx)); merkez.y = Math.max(boy * 0.28, Math.min(boy * 0.72, cy ?? ky));
    merkez.vx = merkez.vy = 0; hedef.x = merkez.x; hedef.y = merkez.y;
    yon = hedefYon = Math.random() * Math.PI * 2; bicim = Math.floor(Math.random() * adlar.length);
    // İlk dağıtım doğrudan yuvalara: uzaktan gelenler yuvalarına kendileri uçar.
    const n = uyeler.length, birim = birimHesap(), c = Math.cos(yon), s = Math.sin(yon);
    const yuvalar = uyeler.map((_, k) => { const [a, b] = yuva(bicim, k, n, t); return [merkez.x + (a * c - b * s) * birim, merkez.y + (a * s + b * c) * birim]; });
    const atama = eslestir(uyeler.map((u) => yuvalar.map(([a, b]) => Math.hypot(u.x - a, u.y - scrollY - b))));
    uyeler.forEach((u, j) => { u.s = atama[j]; [u.bx, u.by] = yuva(bicim, u.s, n, t); });
    gecisBas = -1e9;
  };

  function dizilimKur(t: number, cx?: number, cy?: number) {
    surunuKur(t, cx, cy);
    // Plan: bir yere git, dizilim değiştir ya da dön, belki bir yere daha git, belki bir değişiklik daha.
    adimlar = ['git', sec<Adim>(['degis', 'yaw'])];
    if (Math.random() < 0.55) adimlar.push('git');
    if (Math.random() < 0.35) adimlar.push(sec<Adim>(['degis', 'yaw']));
    mod = 'toplan'; adim = 'topla'; adimT = t; sonUyeKontrol = t + 1200; iz();
  }
  function siradakiAdim(t: number) {
    const a = adimlar.shift();
    if (!a) return dagil(t);
    mod = 'dizilim'; adim = a; adimT = t; veri.adim = a; iz();
    if (a === 'git') {
      for (let k = 0; k < 8; k++) {
        hedef.x = rastgele(en * 0.2, en * 0.8); hedef.y = rastgele(boy * 0.28, boy * 0.72);
        if (Math.hypot(hedef.x - merkez.x, hedef.y - merkez.y) > Math.min(en, boy) * 0.28) break;
      }
    } else if (a === 'yaw') {
      hedefYon = yon + (Math.random() < 0.5 ? -1 : 1) * rastgele(Math.PI / 2, Math.PI);
    } else {
      bicim = sec(adlar.map((_, k) => k).filter((k) => k !== bicim));
      yenidenYuvala(t);
    }
  }
  function dagil(t: number) {
    for (const u of uyeler) { yeniHedef(u); u.ayrildi = t; }
    uyeler = []; mod = 'serbest'; veri.adim = ''; iz();
    sonrakiDizilim = t + rastgele(8000, 14000);
  }

  // Sürü kuruluyken üyelik: görüş alanına giren katılır, yer yoksa bölgesi en uzak üye yerini bırakır.
  // Bölgesi görüş alanından çok uzakta kalan üye de ayrılır (sürüde en az 5 üye kaldıkça).
  function uyelikGuncelle(t: number) {
    if (t < sonUyeKontrol) return;
    sonUyeKontrol = t + 350;
    let degisti = false;
    const adaylar = ihalar.filter((u) => !uyeler.includes(u) && ekranda(u, -12) && t - u.ayrildi > BEKLEME).sort((a, b) => evUzak(a) - evUzak(b));
    for (const u of adaylar) {
      if (uyeler.length < EN_COK) { uyeler.push(u); katilanSayac++; degisti = true; continue; }
      const enUzak = uyeler.reduce((a, b) => (evUzak(b) > evUzak(a) ? b : a));
      if (evUzak(enUzak) > evUzak(u) + 150) { ayril(enUzak, t); uyeler.push(u); katilanSayac++; degisti = true; }
    }
    const uzaklar = uyeler.filter((u) => evUzak(u) > boy * 1.6).sort((a, b) => evUzak(b) - evUzak(a));
    for (const u of uzaklar) { if (uyeler.length <= EN_AZ) break; ayril(u, t); degisti = true; }
    if (degisti) { yenidenYuvala(t); iz(); }
    // Deneme betiği için: görüş alanında olup katılabilecekken sürüde olmayan İHA sayısı.
    veri.disarida = String(uyeler.length >= EN_COK ? 0 : ihalar.filter((u) => !uyeler.includes(u) && ekranda(u, -12) && t - u.ayrildi > BEKLEME).length);
  }

  // Yabancı sürü: kenarlardan birinden V düzeninde girer, ekranın içinden geçip karşı tarafa doğru uçar.
  type Yabanci = { x: number; y: number; vx: number; vy: number; aci: number; gx: number; gy: number };
  const yabancilar: Yabanci[] = [];
  const patlamalar: { x: number; y: number; t: number }[] = [];
  const FARK = 2400; // yabancılar ekrana girdikten bu kadar sonra fark edilir
  let onlemeBas = 0, sonrakiBaskin = performance.now() + rastgele(15000, 27000);
  function baskin(t: number) {
    const aci = Math.random() * Math.PI * 2, yari = Math.hypot(en, boy) / 2 + 80;
    const bx = Math.max(-70, Math.min(en + 70, en / 2 + Math.cos(aci) * yari)), by = Math.max(-70, Math.min(boy + 70, boy / 2 + Math.sin(aci) * yari));
    const karsi = aci + Math.PI + (Math.random() - 0.5) * 1.2; // tam karşısı değil, biraz sapmış
    const gx = en / 2 + Math.cos(karsi) * yari * 1.3, gy = boy / 2 + Math.sin(karsi) * yari * 1.3;
    const a = Math.atan2(gy - by, gx - bx), sayi = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < sayi; i++) {
      const k = Math.ceil(i / 2), yan = i % 2 ? 1 : -1;
      const x = bx + (-k * Math.cos(a) + yan * k * 0.9 * Math.sin(a)) * 30, y = by + (-k * Math.sin(a) - yan * k * 0.9 * Math.cos(a)) * 30;
      yabancilar.push({ x, y: y + scrollY, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, aci: a, gx, gy: gy + scrollY });
    }
    // Bizimkiler dizilimde değilse önce dizilime girer. Dizilimdeyse sürü olduğu gibi hücuma hazırlanır.
    if (mod === 'serbest') surunuKur(t);
    adimlar = []; mod = 'onleme'; faz = 'topla'; onlemeBas = t; adimT = t; veri.onleme = '1'; sonUyeKontrol = t + 600; iz();
  }
  const yabanciOrtasi = () => ({ x: yabancilar.reduce((a, y) => a + y.x, 0) / yabancilar.length, y: yabancilar.reduce((a, y) => a + y.y - scrollY, 0) / yabancilar.length });
  function onlemeAdimi(t: number, dt: number) {
    for (const y of yabancilar) {
      // Yoluna devam etmeye çalışır, bizimkiler yaklaşınca kaçar. Ekrana girdikten sonra kenardan çıkamaz.
      const m = Math.hypot(y.gx - y.x, y.gy - y.y) || 1;
      let ax = ((y.gx - y.x) / m) * 110, ay = ((y.gy - y.y) / m) * 110;
      if (t - onlemeBas > FARK) for (const u of uyeler) { const ex = y.x - u.x, ey = y.y - u.y, r = Math.hypot(ex, ey) || 1; if (r < 140) { ax += (ex / r) * (1 - r / 140) * 900; ay += (ey / r) * (1 - r / 140) * 900; } }
      if (t - onlemeBas > 2200) {
        const sy = y.y - scrollY;
        if (y.x < 30) ax += 700;
        if (y.x > en - 30) ax -= 700;
        if (sy < 80) ay += 700;
        if (sy > boy - 30) ay -= 700;
      }
      y.vx += ax * dt; y.vy += ay * dt;
      const h = Math.hypot(y.vx, y.vy), sinir = 170;
      if (h > sinir) { y.vx *= sinir / h; y.vy *= sinir / h; }
      y.x += y.vx * dt; y.y += y.vy * dt; y.aci = Math.atan2(y.vy, y.vx);
    }
    // Fazlar: dizilime gir, dizilimle yabancılara doğru hücum et, yaklaşınca her İHA bir yabancıyı kovalasın.
    if (yabancilar.length) {
      const o = yabanciOrtasi();
      if (faz === 'topla') {
        hedefYon = Math.atan2(o.y - merkez.y, o.x - merkez.x);
        if (t - onlemeBas > FARK && (veri.oturdu === '1' || t - onlemeBas > FARK + 3000)) { faz = 'hucum'; iz(); }
      } else if (faz === 'hucum') {
        const yakin = Math.min(...yabancilar.map((y) => Math.hypot(y.x - merkez.x, y.y - scrollY - merkez.y)));
        if (yakin < 130 || t - onlemeBas > FARK + 7000) { faz = 'kovala'; iz(); }
      }
    }
    if (t - onlemeBas > FARK && faz === 'kovala') for (let i = yabancilar.length - 1; i >= 0; i--) { // yakalanan düşer
      const y = yabancilar[i];
      if (uyeler.some((u) => Math.hypot(u.x - y.x, u.y - y.y) < 15)) { patlamalar.push({ x: y.x, y: y.y, t }); yabancilar.splice(i, 1); }
    }
    if (t - onlemeBas > 22000) yabancilar.length = 0; // emniyet: takılırsa bırak
    if (!yabancilar.length) { veri.onleme = '0'; sonrakiBaskin = t + rastgele(40000, 70000); dagil(t); }
  }

  // Yönlendirme: istenen hız hedefe olan uzaklıkla artar ama sınırı aşmaz, gerçek hız ona yavaşça yetişir.
  // Böylece İHA hızlanarak kalkar, yaklaşınca yavaşlar ve hedefte taşmadan durur.
  const yonlendir = (u: Iha, tx: number, ty: number, k: number, sinir: number, ceviklik: number, dt: number, ekX = 0, ekY = 0) => {
    let ix = (tx - u.x) * k + ekX, iy = (ty - u.y) * k + ekY;
    const h = Math.hypot(ix, iy);
    if (h > sinir) { ix *= sinir / h; iy *= sinir / h; }
    const o = Math.min(1, dt * ceviklik);
    u.vx += (ix - u.vx) * o; u.vy += (iy - u.vy) * o;
  };

  function adim_(t: number, dt: number) {
    if (t > sonrakiBaskin && (mod === 'serbest' || mod === 'dizilim') && !document.hidden) baskin(t);
    else if (mod === 'serbest' && t > sonrakiDizilim) dizilimKur(t);
    if (mod === 'onleme') onlemeAdimi(t, dt);
    if (mod === 'toplan' || mod === 'dizilim' || (mod === 'onleme' && faz === 'topla')) uyelikGuncelle(t);
    rahatsiz = Math.max(0, rahatsiz - dt * 0.35);
    if (rahatsiz > 4 && (mod === 'dizilim' || mod === 'toplan')) { rahatsiz = 0; adimlar = []; dagil(t); }

    // Dizilim merkezi: önce gidilecek yöne döner, hizalandıkça hızlanır. Yaw'da yerinde döner. Hücumda yabancılara gider.
    const onceX = merkez.x, onceY = merkez.y;
    const gidiyor = mod === 'dizilim' && adim === 'git', hucum = mod === 'onleme' && faz === 'hucum' && yabancilar.length;
    if (hucum) { const o = yabanciOrtasi(); hedef.x = o.x; hedef.y = o.y; }
    if (gidiyor || hucum) {
      const dx = hedef.x - merkez.x, dy = hedef.y - merkez.y, uzak = Math.hypot(dx, dy), donme = hucum ? 2.6 : 1.3, azami = hucum ? 300 : 150;
      let fark = 0;
      if (uzak > 18) { fark = aciFarki(Math.atan2(dy, dx) - yon); yon += Math.max(-donme * dt, Math.min(donme * dt, fark)); }
      const g = Math.min(uzak, Math.min(azami, uzak * 1.3 + 10) * (uzak > 18 ? Math.max(0, Math.cos(fark)) ** 3 : 1) * dt);
      if (uzak > 0.5) { merkez.x += (dx / uzak) * g; merkez.y += (dy / uzak) * g; }
    }
    if ((mod === 'dizilim' && adim === 'yaw') || (mod === 'onleme' && faz === 'topla')) yon += Math.max(-1.1 * dt, Math.min(1.1 * dt, aciFarki(hedefYon - yon)));
    merkez.vx = (merkez.x - onceX) / dt; merkez.vy = (merkez.y - onceY) / dt;

    const birim = birimHesap(), surude_ = surude();
    let sapma = 0;
    for (const u of ihalar) {
      const uye = surude_ && uyeler.includes(u), kovalar = mod === 'onleme' && faz === 'kovala' && uyeler.includes(u) && yabancilar.length;
      if (uye) {
        const [sx, sy] = yuvaEkranda(u, t), ty = sy + scrollY, uzak = Math.hypot(sx - u.x, ty - u.y);
        sapma = Math.max(sapma, uzak);
        if (uzak > 50) yonlendir(u, sx, ty, 2.2, 560, 4, dt); // uzaktan gelir, yaklaşınca yavaşlar
        else yonlendir(u, sx, ty, 6, 700, 10, dt, merkez.vx, merkez.vy); // yuvasını sıkı tutar
      } else if (kovalar) { // her İHA bir yabancıyı kovalar, yaklaştıkça hız kesmez
        const y = yabancilar[u.i % yabancilar.length], ex = y.x - u.x, ey = y.y - u.y, m = Math.hypot(ex, ey) || 1;
        u.vx += (ex / m) * (1050 + m * 2) * dt; u.vy += (ey / m) * (1050 + m * 2) * dt;
        const h = Math.hypot(u.vx, u.vy);
        if (h > 420) { u.vx *= 420 / h; u.vy *= 420 / h; }
      } else { // serbest: bölgesinde noktaya git, asılı kal, yenisini seç. Bölgesinden uzaktaysa hızlı döner.
        if (!u.tx && !u.ty) yeniHedef(u);
        const uzak = Math.hypot(u.tx - u.x, u.ty - u.y);
        if (uzak < 8 && !u.bekle) u.bekle = t + rastgele(1200, 4200);
        if (u.bekle && t > u.bekle) yeniHedef(u);
        yonlendir(u, u.tx, u.ty, 1.2, uzak > 500 ? 320 : u.hiz, 2.2, dt);
      }
      if (imlec.var) { // imleç yaklaşınca kaçar: ne kadar yakınsa o kadar sert
        const ex = u.x - imlec.x, ey = u.y - scrollY - imlec.y, m = Math.hypot(ex, ey) || 1, alan = 110;
        if (m < alan) { const g = (1 - m / alan) ** 2 * 2600 * dt; u.vx += (ex / m) * g; u.vy += (ey / m) * g; if (uye) rahatsiz += dt * (1 - m / alan) * 0.9; }
      }
      for (const o of ihalar) { // ayrılma: birbirine fazla yaklaşan itilir
        if (o === u) continue;
        const ex = u.x - o.x, ey = u.y - o.y, m = Math.hypot(ex, ey), sinir = birim * 0.7;
        if (m > 0 && m < sinir) { u.vx += (ex / m) * (sinir - m) * 40 * dt; u.vy += (ey / m) * (sinir - m) * 40 * dt; }
      }
      u.x += u.vx * dt; u.y += u.vy * dt;
      // Burun: hızlıyken gittiği yöne, dizilimde sürünün yönüne döner. Asılıyken olduğu yere bakar.
      const h = Math.hypot(u.vx, u.vy), istenen = uye && h < 60 ? yon : h > 18 ? Math.atan2(u.vy, u.vx) : u.aci;
      u.aci += Math.max(-6 * dt, Math.min(6 * dt, aciFarki(istenen - u.aci)));
    }
    veri.oturdu = surude_ && sapma < 10 ? '1' : '0';

    // Adımların bitişi
    const sure = t - adimT, oturdu = sapma < 10;
    if (mod === 'toplan' && ((oturdu && sure > 600) || sure > 7000)) siradakiAdim(t);
    else if (mod === 'dizilim') {
      if (adim === 'git' && ((Math.hypot(hedef.x - merkez.x, hedef.y - merkez.y) < 2 && oturdu) || sure > 9000)) siradakiAdim(t);
      else if (adim === 'degis' && t - gecisBas > GECIS + 900) siradakiAdim(t);
      else if (adim === 'yaw' && ((Math.abs(aciFarki(hedefYon - yon)) < 0.01 && oturdu && sure > 800) || sure > 6000)) siradakiAdim(t);
    }
  }

  // Dört pervaneli gövde, üstten görünüş: çapraz kollar, uçlarda dönen pervaneler, önde burun işareti.
  function govde(x: number, y: number, aci: number, h: number, renk: string, a: number, faz_: number) {
    const kol = 5.2, pr = 3;
    ctx.save(); ctx.translate(x, y); ctx.rotate(aci);
    if (h > 30) { // hız izi
      const uz = Math.min(26, h * 0.07), iz_ = ctx.createLinearGradient(-8 - uz, 0, -8, 0);
      iz_.addColorStop(0, 'transparent'); iz_.addColorStop(1, renk);
      ctx.globalAlpha = a * 0.5; ctx.strokeStyle = iz_; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8 - uz, 0); ctx.lineTo(-8, 0); ctx.stroke();
    }
    ctx.globalAlpha = a; ctx.strokeStyle = renk; ctx.fillStyle = renk; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-kol, -kol); ctx.lineTo(kol, kol); ctx.moveTo(-kol, kol); ctx.lineTo(kol, -kol); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-2.6, -2, 5.2, 4, 1.2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2.6, -1.4); ctx.lineTo(5, 0); ctx.lineTo(2.6, 1.4); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 4; k++) {
      const px = k < 2 ? kol : -kol, py = k % 2 ? kol : -kol;
      ctx.globalAlpha = a * 0.45; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.stroke();
      const d = (k === 0 || k === 3 ? 1 : -1) * faz_; // komşu pervaneler ters yöne döner
      ctx.globalAlpha = a; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px - Math.cos(d) * pr, py - Math.sin(d) * pr); ctx.lineTo(px + Math.cos(d) * pr, py + Math.sin(d) * pr); ctx.stroke();
    }
    ctx.restore();
  }

  function ciz() {
    const simdi = performance.now(), donus = simdi / 45, sy = scrollY, surude_ = surude();
    ctx.clearRect(0, 0, en, boy);
    if (surude_ && simdi - adimT > 600) { // haberleşme bağları: her üye bir öndeki yuvadakine bağlı
      const yuvada: Iha[] = [];
      for (const u of uyeler) yuvada[u.s] = u;
      ctx.lineWidth = 1; ctx.strokeStyle = vurgu; ctx.globalAlpha = 0.13; ctx.beginPath();
      for (const u of uyeler) {
        const o = yuvada[bicim === 1 || bicim === 3 ? (u.s + uyeler.length - 1) % uyeler.length : Math.max(0, u.s - 2)];
        if (!o || o === u || (bicim === 3 && !u.s)) continue;
        ctx.moveTo(u.x, u.y - sy); ctx.lineTo(o.x, o.y - sy);
      }
      ctx.stroke();
    }
    const kis = en < 600 ? 0.6 : 1; // dar ekranda metnin üstünden geçerken daha silik
    for (const u of ihalar) {
      if (!ekranda(u, 30)) continue;
      const uye = mod !== 'serbest' && uyeler.includes(u), salin = uye ? 0 : Math.sin(simdi / 420 + u.i * 1.7) * 1.4; // serbestken hafifçe salınır
      govde(u.x, u.y - sy + salin, u.aci, Math.hypot(u.vx, u.vy), vurgu, (uye ? (u.s ? 0.55 : 0.85) : 0.42) * kis, donus + u.i);
    }
    for (const y of yabancilar) govde(y.x, y.y - sy, y.aci, 0, yabanci, 0.8 * kis, -donus);
    for (let i = patlamalar.length - 1; i >= 0; i--) { // düşen yabancının yerinde kısa bir parlama
      const p = patlamalar[i], o = (simdi - p.t) / 600, py = p.y - sy;
      if (o >= 1) { patlamalar.splice(i, 1); continue; }
      ctx.strokeStyle = yabanci; ctx.lineWidth = 1.5; ctx.globalAlpha = (1 - o) * 0.9;
      ctx.beginPath(); ctx.arc(p.x, py, 4 + o * 20, 0, Math.PI * 2);
      for (let k = 0; k < 6; k++) { const a = k * 1.047 + p.x; ctx.moveTo(p.x + Math.cos(a) * (6 + o * 14), py + Math.sin(a) * (6 + o * 14)); ctx.lineTo(p.x + Math.cos(a) * (10 + o * 30), py + Math.sin(a) * (10 + o * 30)); }
      ctx.stroke();
    }
    const gecen = simdi - cagri.t;
    if (gecen < 900) { // çağrı işareti: tıklanan yerde açılan halka
      const o = gecen / 900;
      ctx.strokeStyle = vurgu; ctx.lineWidth = 1.5; ctx.globalAlpha = (1 - o) * 0.8;
      ctx.beginPath(); ctx.arc(cagri.x, cagri.y, 6 + o * 34, 0, Math.PI * 2);
      ctx.moveTo(cagri.x - 5, cagri.y); ctx.lineTo(cagri.x + 5, cagri.y); ctx.moveTo(cagri.x, cagri.y - 5); ctx.lineTo(cagri.x, cagri.y + 5); ctx.stroke();
    }
    const ad = mod === 'onleme' ? veri.onlemeAdi ?? 'önleme' : mod === 'serbest' ? veri.serbest ?? 'serbest' : adim === 'yaw' ? veri.donus ?? 'dönüş' : adlar[bicim];
    ctx.globalAlpha = 0.7; ctx.fillStyle = soluk; ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'right';
    ctx.fillText(`${(veri.etiket ?? 'sürü').toUpperCase()} · ${mod === 'serbest' ? N : uyeler.length} · ${ad.toUpperCase()}`, en - 12, boy - 12);
    ctx.globalAlpha = 1;
  }

  function yerlestir() {
    // Her İHA kendi bölgesinde bir yerden başlar.
    for (const u of ihalar) { yeniHedef(u); u.x = u.tx; u.y = u.ty; yeniHedef(u); }
    veri.onleme = '0'; iz();
  }

  let kare = 0, son = 0, boyOlcum = 0;
  const kok = document.documentElement;
  const kapali = () => kok.dataset.suru === 'kapali';
  const dongu = (t: number) => {
    const dt = Math.min(0.05, (t - son) / 1000 || 0.016); son = t;
    if (t > boyOlcum) { belgeBoy = Math.max(boy, kok.scrollHeight); boyOlcum = t + 2000; } // geç yüklenen görseller sayfayı uzatır
    adim_(t, dt); ciz();
    kare = !document.hidden && !azalt.matches && !kapali() ? requestAnimationFrame(dongu) : 0;
  };
  const baslat = () => {
    if (azalt.matches || kapali()) { ctx.clearRect(0, 0, en, boy); return; }
    if (!basladi) { boyutla(); yerlestir(); basladi = true; }
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
  // Boş bir yere tıklamak: serbestken görünenleri oraya toplar, dizilimdeyken sürüyü oraya götürür.
  // Bağlantı, düğme ve benzetimin üstündeki tıklamalara karışmaz.
  addEventListener('click', (e) => {
    if (!kare || (e.target as HTMLElement).closest('a, button, input, textarea, select, label, video, canvas, summary, dialog, .uye, [role="button"]')) return;
    if (getSelection()?.toString()) return;
    const t = performance.now();
    cagri.x = e.clientX; cagri.y = e.clientY; cagri.t = t;
    if (mod === 'serbest') dizilimKur(t, e.clientX, e.clientY);
    else if (mod === 'dizilim') { adimlar.unshift('git'); siradakiAdim(t); hedef.x = Math.max(en * 0.15, Math.min(en * 0.85, e.clientX)); hedef.y = Math.max(boy * 0.2, Math.min(boy * 0.8, e.clientY)); rahatsiz += 1.1; }
  });
  azalt.addEventListener('change', baslat);
  // Tema değişince renkler yeniden okunur.
  new MutationObserver(() => basladi && boyutla()).observe(kok, { attributes: true, attributeFilter: ['data-theme'] });
  // Deneme betiği için: ?baskin yabancı sürüyü, ?dizilim ilk dizilimi beklemeden çağırır.
  const ara = new URLSearchParams(location.search);
  if (ara.has('baskin')) sonrakiBaskin = performance.now() + 1500;
  if (ara.has('dizilim')) sonrakiDizilim = performance.now() + 1200;
  baslat();
}
