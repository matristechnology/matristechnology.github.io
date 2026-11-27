// Sayfanın arkasında dolaşan İHA'lar. Süs amaçlıdır: tuval aria-hidden, tıklamaları yutmaz,
// "hareketi azalt" açıksa hiç çizilmez. Ziyaretçi üst menüdeki düğmeyle kapatabilir, seçim tarayıcıda hatırlanır.
//
// Davranış (Ali, 27.11.2026):
//   - Açılış: ana sayfa açılınca 30 İHA giriş ekranında "MATRİS" yazısını oluşturur ve durur. Kullanıcı sayfada
//     hareket edince (fare, kaydırma, dokunma, tuş) herkes kendi bölgesine uçar.
//   - Bölge: 30 İHA'nın her birinin sayfada bir bölgesi var, bölgeler sayfa boyunca eşit aralıkla dizilir.
//     Serbestken her İHA kendi bölgesinde dolaşır: bir noktaya gider, asılı kalır, yenisine geçer.
//   - Sürüler: arada bir, görüş alanındaki İHA'lar sürülere ayrılır (en az 8, en çok 12 İHA). Bir sürü beşli, ötekiler üçlü.
//     Beşli sürü halka, artı ya da beşgen düzenine girer. Üçlü sürüler yalnızca V, çizgi ya da ok başına girer.
//     Her sürünün kendi lideri, kendi formasyonu ve kendi planı var: bir yere gider, formasyon değiştirir ya da yerinde döner.
//   - Katılma: sürüler kuruluyken görüş alanına giren boşta bir İHA, boş yuvası olan en yakın sürüye katılır. Boş yuva
//     yoksa kendini lider ilan edip yeni bir sürü kurar ve yeni gelen İHA'yı bekler. Yuvalar sabittir, sürüdekiler
//     yerinden kıpırdamaz. Hiçbir İHA sürüsünden ayrılıp yerine başkası geçmez.
//   - Dağılma: bir sürünün planı bitince formasyon bozulur, o sürünün her İHA'sı kendi bölgesine uçar.
//   - Yabancı sürü: arada bir kenardan girer. Bizimkiler dağınıksa önce sürülere ayrılır, hepsi birlikte hücum eder,
//     yaklaşınca her İHA bir yabancıyı kovalayıp düşürür, sonra hepsi dağılır.
const tuval = document.querySelector<HTMLCanvasElement>('canvas[data-suru]');
if (tuval) {
  const ctx = tuval.getContext('2d')!;
  const azalt = matchMedia('(prefers-reduced-motion: reduce)');
  const veri = tuval.dataset;
  const adlar = (veri.formasyonlar ?? 'V,halka,çizgi,kol,ok başı').split(',');
  const N = 30, KUCUK = 3, BUYUK = 5, EN_AZ = 8, EN_COK = 12, EN_COK_SURU = 5, GECIS = 1700, BEKLEME = 6000; // BEKLEME: dağılan İHA bu kadar süre yeniden katılmaz
  let en = 0, boy = 0, oran = 1, belgeBoy = 0, vurgu = '#e8c468', soluk = '#a5a39a', yabanci = '#ff6b5e', metin = '#ecebe6';
  const boyutla = () => {
    oran = Math.min(devicePixelRatio || 1, 1.5);
    en = innerWidth; boy = innerHeight; belgeBoy = Math.max(boy, document.documentElement.scrollHeight);
    tuval.width = Math.round(en * oran); tuval.height = Math.round(boy * oran);
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    const s = getComputedStyle(tuval);
    vurgu = s.getPropertyValue('--vurgu').trim() || vurgu;
    soluk = s.getPropertyValue('--soluk').trim() || soluk;
    yabanci = s.getPropertyValue('--yabanci').trim() || yabanci;
    metin = s.getPropertyValue('--metin').trim() || metin;
  };
  const rastgele = (a: number, b: number) => a + Math.random() * (b - a);
  const sec = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
  const aciFarki = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const yumusat = (x: number) => x * x * (3 - 2 * x);

  type Adim = 'topla' | 'git' | 'degis' | 'yaw';
  type Faz = 'topla' | 'hucum' | 'kovala';
  type Mod = 'giris' | 'serbest' | 'toplan' | 'dizilim' | 'onleme';
  // Sürü: üyeleri, kendi merkezi (ekran koordinatı: sürü görüş alanında kalır), yönü, formasyonu ve planı.
  type Surusu = { id: number; sira: number; kap: number; uyeler: Iha[]; merkez: { x: number; y: number; vx: number; vy: number }; hedef: { x: number; y: number }; yon: number; hedefYon: number; bicim: number; adim: Adim; adimlar: Adim[]; adimT: number; gecisBas: number; sapma: number };
  // İHA: x, y sayfa koordinatı. ex, ey bölgenin merkezi (oran olarak). tx, ty serbestken gidilen nokta.
  // sr bağlı olduğu sürü (boştaysa null), s sürüdeki yuva (0 lider), bx, by yuvaya geçişin başladığı andaki yeri.
  type Iha = { i: number; x: number; y: number; vx: number; vy: number; aci: number; ex: number; ey: number; tx: number; ty: number; bekle: number; hiz: number; s: number; bx: number; by: number; ayrildi: number; katildi: number; sr: Surusu | null; gx: number; gy: number; gi: number; kalk: number };
  const ihalar: Iha[] = Array.from({ length: N }, (_, i) => ({
    i, x: 0, y: 0, vx: 0, vy: 0, aci: Math.random() * 6.28, ex: rastgele(0.12, 0.88), ey: (i + rastgele(0.2, 0.8)) / N,
    tx: 0, ty: 0, bekle: 0, hiz: rastgele(80, 125), s: 0, bx: 0, by: 0, ayrildi: -1e9, katildi: 0, sr: null, gx: 0, gy: 0, gi: -1, kalk: 0,
  }));
  const evX = (u: Iha) => u.ex * en, evY = (u: Iha) => 90 + u.ey * (belgeBoy - 130);
  const bolgeY = () => Math.max(160, (belgeBoy / N) * 0.9); // bölgenin dikey yarı boyu
  const ekranda = (u: Iha, pay = 0) => u.y - scrollY > -pay && u.y - scrollY < boy + pay && u.x > -pay && u.x < en + pay;

  const suruler: Surusu[] = [];
  // Açılış: giriş ekranında 30 İHA yazıyı oluşturur. noktalar yazının 0-1 aralığındaki nokta kümesi, kenar aynı harfte komşu noktalar.
  const giris = { aktif: false, bas: 0, bitis: -1e9, hazir: false, sapma: 0, oran: 0.3, noktalar: [] as { x: number; y: number; h: number }[], kenar: [] as [number, number][], sahip: [] as Iha[] };
  let mod: Mod = 'serbest', suruNo = 0, onleme = false, faz: Faz = 'topla';
  let sonrakiDizilim = performance.now() + 4000, rahatsiz = 0, basladi = false, sonUyeKontrol = 0, evKontrol = 0;
  let katilanSayac = 0, dagilanSayac = 0;
  const imlec = { x: -999, y: -999, var: false };
  const cagri = { x: 0, y: 0, t: -9999 };
  const birimHesap = () => Math.max(26, Math.min(40, en / 30));
  const modGuncelle = () => { mod = giris.aktif ? 'giris' : onleme ? 'onleme' : suruler.length ? (suruler.some((s) => s.adim !== 'topla') ? 'dizilim' : 'toplan') : 'serbest'; };
  let fazlar = '';
  const iz = () => {
    modGuncelle();
    if (onleme && !fazlar.endsWith(faz)) fazlar += (fazlar ? '>' : '') + faz;
    const uy = suruler.flatMap((s) => s.uyeler);
    veri.fazlar = fazlar; veri.mod = mod; veri.uye = String(uy.length); veri.suru = String(suruler.length);
    veri.suruler = suruler.map((s) => `${s.id}:${s.uyeler.map((u) => u.i).join('.')}`).join(';');
    veri.bicim = String(suruler[0]?.bicim ?? 0); veri.bicimler = suruler.map((s) => s.bicim).join(',');
    veri.adim = suruler.map((s) => s.adim).join(','); veri.kapasite = suruler.map((s) => s.kap).join(',');
    veri.faz = onleme ? faz : ''; veri.katilan = String(katilanSayac); veri.dagilan = String(dagilanSayac);
    veri.lider = suruler.map((s) => lider(s)?.i ?? '').join(',');
    veri.yuvalar = uy.map((u) => `${u.i}:${u.s}`).join(',');
  };
  const lider = (s: Surusu) => s.uyeler.find((u) => u.s === 0);

  // Yuvalar: lidere göre (ileri, yan) birim uzaklıkları. k yuva numarası (0 lider, hep sürünün merkezinde).
  // Yuvalar hep sürünün tam boyuna (3 ya da 5) göre hesaplanır, böylece boş yuva sabit bir yerde durur ve yeni gelen oraya oturur.
  // Formasyonlar: 0 V, 1 halka, 2 çizgi, 3 kol, 4 ok başı, 5 artı, 6 beşgen. Üçlü sürü yalnızca V, çizgi ve ok başına girer,
  // beşli sürü halka, artı ve beşgene.
  const FORMLAR: Record<number, number[]> = { [KUCUK]: [0, 2, 4], [BUYUK]: [1, 5, 6] };
  const yuva = (b: number, k: number, n: number, t: number): [number, number] => {
    if (b === 6) { const r = 1.45, a = (k * Math.PI * 2) / n; return [-r + r * Math.cos(a), r * Math.sin(a)]; } // beşgen: lider ön köşede
    if (!k) return [0, 0];
    if (b === 5) { const a = ((k - 1) * Math.PI) / 2; return [Math.cos(a) * 1.5, Math.sin(a) * 1.5]; } // artı: dört kol

    const kat = Math.ceil(k / 2), yan = k % 2 ? 1 : -1;
    if (b === 1) { const r = Math.max(1.4, (n - 1) * 0.24), a = ((k - 1) / Math.max(1, n - 1)) * Math.PI * 2 + t / 2600; return [Math.cos(a) * r, Math.sin(a) * r]; } // halka: liderin çevresinde ağır ağır döner
    if (b === 2) return [-kat * 0.12, yan * kat * 1.05]; // çizgi: hafif yay
    if (b === 3) return [-k * 0.95, Math.sin(k * 0.9 + t / 500) * 0.35]; // kol: tek sıra, hafif dalgalı
    if (b === 4) return k <= 4 ? [-kat * 0.9, yan * kat * 0.85] : [-(1.8 + (k - 4) * 0.9), 0]; // ok başı: iki kol ve gövde
    return [-kat, yan * kat * 0.9]; // V: kollar geriye açılır
  };
  const yerde = (s: Surusu, ileri: number, yan: number): [number, number] => {
    const birim = birimHesap(), c = Math.cos(s.yon), sn = Math.sin(s.yon);
    return [s.merkez.x + (ileri * c - yan * sn) * birim, s.merkez.y + (ileri * sn + yan * c) * birim];
  };
  // Yuvanın ekrandaki yeri. Son dağıtımdan bu yana GECIS süresince eski yerden yeni yuvaya düz çizgiyle geçilir.
  const yuvaEkranda = (u: Iha, t: number): [number, number] => {
    const s = u.sr!, e = yumusat(Math.max(0, Math.min(1, (t - s.gecisBas) / GECIS)));
    const [ileri, yan] = yuva(s.bicim, u.s, s.kap, t);
    return yerde(s, u.bx + (ileri - u.bx) * e, u.by + (yan - u.by) * e);
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
  // Bir sürünün yuvalarını yeniden dağıt (formasyon değişince): herkesin bugünkü yeri sürüye göre kaydedilir,
  // en kısa toplam yolla yuvalar verilir, sonra GECIS süresince düz çizgiyle geçilir.
  function yenidenYuvala(s: Surusu, t: number, varisT = t + GECIS) {
    const birim = birimHesap(), c = Math.cos(s.yon), sn = Math.sin(s.yon);
    for (const u of s.uyeler) { const dx = u.x - s.merkez.x, dy = u.y - scrollY - s.merkez.y; u.bx = (dx * c + dy * sn) / birim; u.by = (-dx * sn + dy * c) / birim; }
    const l = lider(s), digerleri = s.uyeler.filter((u) => u !== l); // lider yerinde kalır
    const yuvalar = digerleri.map((_, k) => yuva(s.bicim, k + 1, s.kap, varisT));
    const atama = eslestir(digerleri.map((u) => yuvalar.map(([a, b]) => Math.hypot(u.bx - a, u.by - b))));
    digerleri.forEach((u, j) => (u.s = atama[j] + 1));
    s.gecisBas = t;
  }

  // Serbest dolaşma: bir sonraki nokta İHA'nın kendi bölgesinden seçilir.
  const yeniHedef = (u: Iha) => {
    const ry = bolgeY();
    u.tx = Math.max(24, Math.min(en - 24, evX(u) + rastgele(-0.22, 0.22) * en));
    u.ty = Math.max(90, Math.min(belgeBoy - 40, evY(u) + rastgele(-ry, ry)));
    u.bekle = 0;
  };

  // Boştaki İHA'lar: görüş alanına en yakın olanlar önce gelir. En az 8 İHA çağrılır ki bir beşli ve bir üçlü sürü kurulabilsin.
  const zor = Number(new URLSearchParams(location.search).get('dizilim')) || 0; // deneme betiği: katılacak İHA sayısı
  const katilanlar = (t: number) => {
    const orta = { x: en / 2, y: scrollY + boy / 2 }, uzak = (u: Iha) => Math.hypot(u.x - orta.x, u.y - orta.y);
    const sirali = ihalar.filter((u) => !u.sr && (t - u.ayrildi > BEKLEME || ekranda(u))).sort((a, b) => uzak(a) - uzak(b));
    const gorunen = sirali.filter((u) => ekranda(u));
    veri.gorunen = String(gorunen.length);
    return sirali.slice(0, Math.min(zor || Math.max(EN_AZ, Math.min(EN_COK, gorunen.length)), EN_COK));
  };
  // Yakın olanları gruplara ayırır: ilk grup beşli (en az beş İHA varsa), ötekiler üçlü. Grubun ilk İHA'sı lider olur.
  const gruplaCek = (liste: Iha[]) => {
    const kalan = [...liste], gruplar: Iha[][] = [];
    while (kalan.length) {
      const l = kalan.shift()!, boyut = !gruplar.length && liste.length >= BUYUK ? BUYUK : KUCUK;
      kalan.sort((a, b) => Math.hypot(a.x - l.x, a.y - l.y) - Math.hypot(b.x - l.x, b.y - l.y));
      gruplar.push([l, ...kalan.splice(0, boyut - 1)]);
    }
    return gruplar;
  };
  const planYap = (): Adim[] => {
    const p: Adim[] = ['git', sec<Adim>(['degis', 'yaw'])];
    if (Math.random() < 0.55) p.push('git');
    if (Math.random() < 0.35) p.push(sec<Adim>(['degis', 'yaw']));
    return p;
  };
  // Bir sürü kurulur: lider olduğu yerde kalır (merkez onun yeri), ötekiler çevresindeki yuvalara uçar.
  function suruKur(t: number, uy: Iha[], kap: number, cx?: number, cy?: number) {
    const l = uy[0];
    const s: Surusu = {
      id: ++suruNo, sira: suruler.length, kap, uyeler: uy, merkez: { x: Math.max(en * 0.12, Math.min(en * 0.88, cx ?? l.x)), y: Math.max(boy * 0.18, Math.min(boy * 0.82, cy ?? l.y - scrollY)), vx: 0, vy: 0 },
      hedef: { x: 0, y: 0 }, yon: Math.random() * Math.PI * 2, hedefYon: 0, bicim: sec(FORMLAR[kap]), adim: 'topla', adimlar: planYap(), adimT: t, gecisBas: -1e9, sapma: 0,
    };
    s.hedef.x = s.merkez.x; s.hedef.y = s.merkez.y; s.hedefYon = s.yon;
    const digerleri = uy.slice(1);
    const yuvalar = digerleri.map((_, k) => { const [a, b] = yuva(s.bicim, k + 1, kap, t); return yerde(s, a, b); });
    const atama = eslestir(digerleri.map((u) => yuvalar.map(([a, b]) => Math.hypot(u.x - a, u.y - scrollY - b))));
    l.s = 0; digerleri.forEach((u, j) => (u.s = atama[j] + 1));
    for (const u of uy) { [u.bx, u.by] = yuva(s.bicim, u.s, kap, t); u.katildi = t; u.sr = s; }
    suruler.push(s);
    return s;
  }
  function dizilimKur(t: number, cx?: number, cy?: number) {
    const uy = katilanlar(t);
    gruplaCek(uy).forEach((g, k) => suruKur(t, g, k === 0 && uy.length >= BUYUK ? BUYUK : KUCUK, k ? undefined : cx, k ? undefined : cy));
    sonUyeKontrol = t + 1200; veri.ilk = String(uy.length); iz();
  }
  // Başka sürülerin hedefinden uzak bir yer seç: sürüler birbirine çarpmadan farklı yönlere gider.
  const hedefSec = (s: Surusu) => {
    for (let k = 0; k < 14; k++) {
      s.hedef.x = rastgele(en * 0.2, en * 0.8); s.hedef.y = rastgele(boy * 0.28, boy * 0.72);
      const uzak = Math.hypot(s.hedef.x - s.merkez.x, s.hedef.y - s.merkez.y) > Math.min(en, boy) * 0.28;
      if (uzak && suruler.every((o) => o === s || Math.hypot(s.hedef.x - o.hedef.x, s.hedef.y - o.hedef.y) > 190)) break;
    }
  };
  function siradakiAdim(s: Surusu, t: number) {
    const a = s.adimlar.shift();
    if (!a) return dagil(s, t);
    s.adim = a; s.adimT = t; iz();
    if (a === 'git') hedefSec(s);
    else if (a === 'yaw') s.hedefYon = s.yon + (Math.random() < 0.5 ? -1 : 1) * rastgele(Math.PI / 2, Math.PI);
    else { s.bicim = sec(FORMLAR[s.kap].filter((k) => k !== s.bicim)); yenidenYuvala(s, t); }
  }
  // Formasyon bozuldu: sürünün her İHA'sı kendi bölgesine uçar.
  function dagil(s: Surusu, t: number) {
    for (const u of s.uyeler) { yeniHedef(u); u.ayrildi = t; u.sr = null; }
    s.uyeler = []; suruler.splice(suruler.indexOf(s), 1); dagilanSayac++;
    if (!suruler.length) sonrakiDizilim = t + rastgele(8000, 14000);
    iz();
  }
  const hepsiniDagit = (t: number) => { for (const s of [...suruler]) dagil(s, t); };

  // ── Açılış yazısı: her harf elle tasarlanmış az sayıda noktadan ve onları birleştiren çizgilerden oluşur ──
  // Harf kutusu: x 0 ile genişlik arası, y 0 (üst) ile 1,6 (alt) arası. Noktalar harfin dönüm yerlerine konur,
  // çizgiler harfin iskeletini gösterir. Toplam nokta sayısı 30 (İHA sayısı).
  const HARFLER: Record<string, { g: number; p: [number, number][]; k: [number, number][] }> = {
    M: { g: 1.2, p: [[0, 1.6], [0, 0], [0.6, 0.9], [1.2, 0], [1.2, 1.6]], k: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    A: { g: 1, p: [[0, 1.6], [0.5, 0], [1, 1.6], [0.14, 1.15], [0.86, 1.15]], k: [[0, 3], [3, 1], [1, 4], [4, 2], [3, 4]] },
    T: { g: 1, p: [[0, 0], [0.5, 0], [1, 0], [0.5, 0.8], [0.5, 1.6]], k: [[0, 1], [1, 2], [1, 3], [3, 4]] },
    R: { g: 1, p: [[0, 1.6], [0, 0.8], [0, 0], [0.85, 0.2], [0.6, 0.8], [1, 1.6]], k: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1], [4, 5]] },
    'İ': { g: 0, p: [[0, -0.4], [0, 0.4], [0, 1.6]], k: [[1, 2]] },
    I: { g: 0, p: [[0, 0], [0, 0.8], [0, 1.6]], k: [[0, 1], [1, 2]] },
    S: { g: 1, p: [[0.95, 0.15], [0.4, 0], [0.05, 0.45], [0.55, 0.8], [0.95, 1.2], [0.1, 1.55]], k: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
  };
  function girisNoktalari(yazi: string) {
    const harfler = [...yazi];
    if (!harfler.length || harfler.some((h) => !HARFLER[h])) return false;
    const ara = 0.55, tum: { x: number; y: number; h: number }[] = [];
    giris.kenar = []; let x0 = 0;
    harfler.forEach((h, hi) => {
      const L = HARFLER[h], ilk = tum.length;
      for (const [px, py] of L.p) tum.push({ x: x0 + px, y: py, h: hi });
      for (const [a, b] of L.k) giris.kenar.push([ilk + a, ilk + b]);
      x0 += L.g + ara;
    });
    const gen = x0 - ara, ust = Math.min(...tum.map((p) => p.y)), alt = Math.max(...tum.map((p) => p.y));
    giris.oran = (alt - ust) / gen;
    giris.noktalar = tum.map((p) => ({ x: p.x / gen, y: (p.y - ust) / gen, h: p.h }));
    veri.girisNoktalar = JSON.stringify(giris.noktalar.map((p) => [Math.round(p.x * 1000), Math.round(p.y * 1000), p.h]));
    return giris.noktalar.length === N;
  }
  // Yazıyı ekrana yerleştir, İHA'ları en kısa toplam yolla noktalara dağıt.
  function girisHedefle() {
    const w = Math.min(en * 0.82, 1000), h = w * giris.oran, x0 = en / 2 - w / 2, y0 = boy * 0.5 - h / 2 + 24;
    const pts = giris.noktalar.map((p) => [x0 + p.x * w, y0 + p.y * w + scrollY]);
    const atama = eslestir(ihalar.map((u) => pts.map(([a, b]) => Math.hypot(u.x - a, u.y - b))));
    giris.sahip = [];
    ihalar.forEach((u, i) => { u.gi = atama[i]; [u.gx, u.gy] = pts[atama[i]]; giris.sahip[atama[i]] = u; });
    veri.girisKutu = `${Math.round(x0)},${Math.round(y0)},${Math.round(x0 + w)},${Math.round(y0 + h)}`; veri.girisNokta = String(pts.length);
  }
  function girisBaslat(t: number) {
    giris.aktif = true; giris.bas = t; giris.hazir = false;
    // Sayfa açılır açılmaz İHA'lar yazının içinde hazırdır, sonradan uçarak gelmezler.
    for (const u of ihalar) { u.vx = u.vy = 0; u.gi = -1; }
    if (girisNoktalari(veri.giris ?? '')) { girisHedefle(); for (const u of ihalar) if (u.gi >= 0) { u.x = u.gx; u.y = u.gy; u.aci = -Math.PI / 2; } } else girisBitir(performance.now());
    iz();
  }
  // Kullanıcı hareket etti (ya da süre doldu): yazı bozulur, her İHA kendi bölgesine uçar.
  function girisBitir(t: number) {
    if (!giris.aktif) return;
    giris.aktif = false; giris.bitis = t; giris.hazir = false;
    for (const u of ihalar) { yeniHedef(u); u.gi = -1; u.ayrildi = t; u.kalk = t + rastgele(0, 450); }
    sonrakiDizilim = t + rastgele(9000, 15000); sonrakiBaskin = t + rastgele(22000, 36000);
    veri.girisHazir = '0'; iz();
  }

  // Sürüler kuruluyken üyelik: görüş alanına giren boştaki İHA, boş yuvası olan en yakın sürüye katılır. Sürüdekiler
  // yerinden kıpırdamaz, kimse ayrılmaz: yeni gelen yuvasına kendisi uçar. Boş yuva yoksa İHA kendini lider ilan edip
  // üçlü yeni bir sürü kurar ve yeni gelen İHA'yı bekler.
  function uyelikGuncelle(t: number) {
    if (t < sonUyeKontrol) return;
    sonUyeKontrol = t + 350;
    let degisti = false;
    const orta = { x: en / 2, y: scrollY + boy / 2 };
    const adaylar = ihalar.filter((u) => !u.sr && ekranda(u, -12) && t - u.ayrildi > BEKLEME).sort((a, b) => Math.hypot(a.x - orta.x, a.y - orta.y) - Math.hypot(b.x - orta.x, b.y - orta.y));
    for (const u of adaylar) {
      const acik = suruler.filter((s) => s.uyeler.length < s.kap).sort((a, b) => Math.hypot(u.x - a.merkez.x, u.y - scrollY - a.merkez.y) - Math.hypot(u.x - b.merkez.x, u.y - scrollY - b.merkez.y))[0];
      if (acik) {
        u.s = acik.uyeler.length; [u.bx, u.by] = yuva(acik.bicim, u.s, acik.kap, t);
        u.katildi = t; u.sr = acik; acik.uyeler.push(u); katilanSayac++; degisti = true;
      } else if (!onleme && suruler.length < EN_COK_SURU) { suruKur(t, [u], KUCUK); katilanSayac++; degisti = true; }
      break; // her kontrolde tek İHA işlenir: gelenler tek tek katılır, kendini lider ilan eden bir sonrakini bekler
    }
    if (degisti) iz();
    // Deneme betiği için: görüş alanında olup hiçbir sürüde olmayan İHA sayısı.
    veri.disarida = String(ihalar.filter((u) => !u.sr && ekranda(u, -12) && t - u.ayrildi > BEKLEME).length);
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
    // Bizimkiler sürüde değilse önce sürülere ayrılır. Sürüdeyse sürüler olduğu gibi hücuma hazırlanır.
    if (!suruler.length) dizilimKur(t);
    for (const s of suruler) { s.adimlar = []; s.adim = 'topla'; s.adimT = t; }
    onleme = true; faz = 'topla'; fazlar = ''; onlemeBas = t; veri.onleme = '1'; sonUyeKontrol = t + 600; iz();
  }
  const yabanciOrtasi = () => ({ x: yabancilar.reduce((a, y) => a + y.x, 0) / yabancilar.length, y: yabancilar.reduce((a, y) => a + y.y - scrollY, 0) / yabancilar.length });
  function onlemeAdimi(t: number, dt: number) {
    for (const y of yabancilar) {
      // Yoluna devam etmeye çalışır, bizimkiler yaklaşınca kaçar. Ekrana girdikten sonra kenardan çıkamaz.
      const m = Math.hypot(y.gx - y.x, y.gy - y.y) || 1;
      let ax = ((y.gx - y.x) / m) * 110, ay = ((y.gy - y.y) / m) * 110;
      if (t - onlemeBas > FARK) for (const s of suruler) for (const u of s.uyeler) { const ex = y.x - u.x, ey = y.y - u.y, r = Math.hypot(ex, ey) || 1; if (r < 140) { ax += (ex / r) * (1 - r / 140) * 900; ay += (ey / r) * (1 - r / 140) * 900; } }
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
    // Fazlar: sürülere ayrıl, hepsi yabancılara doğru hücum et, yaklaşınca her İHA bir yabancıyı kovalasın.
    if (yabancilar.length) {
      const o = yabanciOrtasi();
      if (faz === 'topla') {
        for (const s of suruler) s.hedefYon = Math.atan2(o.y - s.merkez.y, o.x - s.merkez.x);
        if (t - onlemeBas > FARK && (veri.oturdu === '1' || t - onlemeBas > FARK + 3000)) { faz = 'hucum'; iz(); }
      } else if (faz === 'hucum') {
        const yakin = Math.min(...yabancilar.flatMap((y) => suruler.map((s) => Math.hypot(y.x - s.merkez.x, y.y - scrollY - s.merkez.y))));
        if (yakin < 130 || t - onlemeBas > FARK + 7000) { faz = 'kovala'; iz(); }
      }
    }
    if (t - onlemeBas > FARK && faz === 'kovala') for (let i = yabancilar.length - 1; i >= 0; i--) { // yakalanan düşer
      const y = yabancilar[i];
      if (suruler.some((s) => s.uyeler.some((u) => Math.hypot(u.x - y.x, u.y - y.y) < 16))) { patlamalar.push({ x: y.x, y: y.y, t }); yabancilar.splice(i, 1); }
    }
    if (t - onlemeBas > 22000) yabancilar.length = 0; // emniyet: takılırsa bırak
    if (!yabancilar.length) { veri.onleme = '0'; sonrakiBaskin = t + rastgele(40000, 70000); onleme = false; hepsiniDagit(t); }
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
    modGuncelle();
    if (giris.aktif && t - giris.bas > 40000) girisBitir(t); // kimse dokunmazsa yazı sonsuza kadar kalmaz
    modGuncelle();
    if (t > sonrakiBaskin && (mod === 'serbest' || mod === 'dizilim') && !document.hidden) baskin(t);
    else if (mod === 'serbest' && t > sonrakiDizilim) dizilimKur(t);
    if (onleme) onlemeAdimi(t, dt);
    if (suruler.length && (!onleme || faz === 'topla')) uyelikGuncelle(t);
    rahatsiz = Math.max(0, rahatsiz - dt * 0.35);
    if (rahatsiz > 4 && suruler.length && !onleme) { rahatsiz = 0; hepsiniDagit(t); }

    // Sürü merkezleri: önce gidilecek yöne döner, hizalandıkça hızlanır. Yaw'da yerinde döner. Hücumda yabancılara gider.
    const hucum = onleme && faz === 'hucum' && yabancilar.length > 0, yabO = hucum ? yabanciOrtasi() : null;
    for (const s of suruler) {
      const onceX = s.merkez.x, onceY = s.merkez.y;
      if (yabO) { s.hedef.x = yabO.x; s.hedef.y = yabO.y + (s.sira - (suruler.length - 1) / 2) * 70; } // sürüler yan yana, üst üste binmez
      if ((!onleme && s.adim === 'git') || hucum) {
        const dx = s.hedef.x - s.merkez.x, dy = s.hedef.y - s.merkez.y, uzak = Math.hypot(dx, dy), donme = hucum ? 2.6 : 1.3, azami = hucum ? 300 : 150;
        let fark = 0;
        if (uzak > 18) { fark = aciFarki(Math.atan2(dy, dx) - s.yon); s.yon += Math.max(-donme * dt, Math.min(donme * dt, fark)); }
        const g = Math.min(uzak, Math.min(azami, uzak * 1.3 + 10) * (uzak > 18 ? Math.max(0, Math.cos(fark)) ** 3 : 1) * dt);
        if (uzak > 0.5) { s.merkez.x += (dx / uzak) * g; s.merkez.y += (dy / uzak) * g; }
      }
      if ((!onleme && s.adim === 'yaw') || (onleme && faz === 'topla')) s.yon += Math.max(-1.1 * dt, Math.min(1.1 * dt, aciFarki(s.hedefYon - s.yon)));
      s.merkez.vx = (s.merkez.x - onceX) / dt; s.merkez.vy = (s.merkez.y - onceY) / dt;
      s.sapma = 0;
    }

    const birim = birimHesap();
    for (const u of ihalar) {
      const s = u.sr, kovalar = onleme && faz === 'kovala' && !!s && yabancilar.length > 0, uye = !!s && !kovalar, yazida = giris.aktif && u.gi >= 0;
      if (giris.aktif) {
        if (yazida) { // yazıdaki yerine uçar, yaklaşınca yavaşlar ve yerinde durur
          const uzak = Math.hypot(u.gx - u.x, u.gy - u.y); giris.sapma = Math.max(giris.sapma, uzak);
          if (uzak > 50) yonlendir(u, u.gx, u.gy, 2.2, 560, 4, dt); else yonlendir(u, u.gx, u.gy, 6, 700, 10, dt);
        } else { u.vx *= 0.9; u.vy *= 0.9; } // yazı hesaplanana kadar bekler
      } else if (uye) {
        const [sx, sy] = yuvaEkranda(u, t), ty = sy + scrollY, uzak = Math.hypot(sx - u.x, ty - u.y);
        s!.sapma = Math.max(s!.sapma, uzak);
        if (uzak > 50) yonlendir(u, sx, ty, 2.2, 560, 4, dt); // uzaktan gelir, yaklaşınca yavaşlar
        else yonlendir(u, sx, ty, 6, 700, 10, dt, s!.merkez.vx, s!.merkez.vy); // yuvasını sıkı tutar
      } else if (kovalar) { // her İHA bir yabancıyı kovalar, yaklaştıkça hız kesmez
        const y = yabancilar.reduce((a, b) => (Math.hypot(b.x - u.x, b.y - u.y) < Math.hypot(a.x - u.x, a.y - u.y) ? b : a)); // en yakındaki
        // Hedefin biraz ilerisine nişan alır, hızı o yöne çevrilir: çevresinde dönüp durmaz, üstüne gider.
        const on = Math.min(0.4, Math.hypot(y.x - u.x, y.y - u.y) / 600), nx = y.x + y.vx * on - u.x, ny = y.y + y.vy * on - u.y, m = Math.hypot(nx, ny) || 1;
        const o = Math.min(1, dt * 7);
        u.vx += ((nx / m) * 430 - u.vx) * o; u.vy += ((ny / m) * 430 - u.vy) * o;
      } else { // serbest: bölgesinde noktaya git, asılı kal, yenisini seç. Bölgesinden uzaktaysa hızlı döner.
        if (!u.tx && !u.ty) yeniHedef(u);
        const uzak = Math.hypot(u.tx - u.x, u.ty - u.y);
        if (uzak < 8 && !u.bekle) u.bekle = t + rastgele(1200, 4200);
        if (u.bekle && t > u.bekle) yeniHedef(u);
        if (t < u.kalk) { u.vx *= 0.92; u.vy *= 0.92; } // yazı bozulurken hepsi aynı anda kalkmaz
        else yonlendir(u, u.tx, u.ty, 1.2, uzak > 500 ? 520 : u.hiz, 2.2, dt);
      }
      if (imlec.var && !giris.aktif) { // imleç yaklaşınca kaçar: ne kadar yakınsa o kadar sert
        const ex = u.x - imlec.x, ey = u.y - scrollY - imlec.y, m = Math.hypot(ex, ey) || 1, alan = 110;
        if (m < alan) { const g = (1 - m / alan) ** 2 * 2600 * dt; u.vx += (ex / m) * g; u.vy += (ey / m) * g; if (uye) rahatsiz += dt * (1 - m / alan) * 0.9; }
      }
      for (const o of ihalar) { // ayrılma: birbirine fazla yaklaşan itilir
        if (o === u) continue;
        const ex = u.x - o.x, ey = u.y - o.y, m = Math.hypot(ex, ey), sinir = birim * 0.7;
        if (m > 0 && m < sinir) { u.vx += (ex / m) * (sinir - m) * 40 * dt; u.vy += (ey / m) * (sinir - m) * 40 * dt; }
      }
      u.x += u.vx * dt; u.y += u.vy * dt;
      // Burun: hızlıyken gittiği yöne, sürüdeyken sürünün yönüne döner. Asılıyken olduğu yere bakar.
      const h = Math.hypot(u.vx, u.vy), istenen = yazida && h < 60 ? -Math.PI / 2 : uye && h < 60 ? s!.yon : h > 18 ? Math.atan2(u.vy, u.vx) : u.aci;
      u.aci += Math.max(-6 * dt, Math.min(6 * dt, aciFarki(istenen - u.aci)));
    }
    if (giris.aktif) {
      const hazirMi = giris.noktalar.length > 0 && giris.sapma < 10 && ihalar.every((u) => u.gi >= 0);
      if (hazirMi !== giris.hazir) { giris.hazir = hazirMi; veri.girisHazir = hazirMi ? '1' : '0'; }
      veri.girisSapma = String(Math.round(giris.sapma)); giris.sapma = 0;
    }
    veri.oturdu = suruler.length && !(onleme && faz === 'kovala') && suruler.every((s) => s.sapma < 10) ? '1' : '0';
    // Deneme betiği için: sürüde olmayan ama kendi bölgesinden uzak İHA sayısı (dağılan herkes bölgesine dönmeli).
    if (t > evKontrol) { evKontrol = t + 400; veri.evdeDegil = String(ihalar.filter((u) => !u.sr && (Math.abs(u.x - evX(u)) > en * 0.34 || Math.abs(u.y - evY(u)) > bolgeY() * 1.7)).length); }

    // Planların adımları: her sürü kendi planını izler, planı bitince dağılır.
    if (!onleme) for (const s of [...suruler]) {
      const sure = t - s.adimT, oturdu = s.sapma < 10;
      if (s.uyeler.length < 2) { if (sure > 9000) dagil(s, t); } // tek başına lider yeni İHA'yı bekler, gelmezse bölgesine döner
      else if (s.adim === 'topla') { if ((oturdu && sure > 600) || sure > 7000) siradakiAdim(s, t); }
      else if (s.adim === 'git') { if ((Math.hypot(s.hedef.x - s.merkez.x, s.hedef.y - s.merkez.y) < 2 && oturdu) || sure > 9000) siradakiAdim(s, t); }
      else if (s.adim === 'degis') { if (t - s.gecisBas > GECIS + 900) siradakiAdim(s, t); }
      else if (s.adim === 'yaw') { if ((Math.abs(aciFarki(s.hedefYon - s.yon)) < 0.01 && oturdu && sure > 800) || sure > 6000) siradakiAdim(s, t); }
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
    const simdi = performance.now(), donus = simdi / 45, sy = scrollY, kovala = onleme && faz === 'kovala';
    ctx.clearRect(0, 0, en, boy);
    const kis = en < 600 ? 0.6 : 1; // dar ekranda metnin üstünden geçerken daha silik
    if (giris.aktif && giris.hazir) { // yazıdaki komşu İHA'lar arasında ince bağ
      ctx.lineWidth = 1.4; ctx.strokeStyle = vurgu; ctx.globalAlpha = 0.5 * kis; ctx.beginPath();
      for (const [a, b] of giris.kenar) { const u = giris.sahip[a], v = giris.sahip[b]; if (u && v) { ctx.moveTo(u.x, u.y - sy); ctx.lineTo(v.x, v.y - sy); } }
      ctx.stroke();
    }
    if (!kovala) for (const s of suruler) {
      if (simdi - s.adimT <= 600) continue;
      // haberleşme bağları: her üye bir öndeki yuvadakine bağlı
      const yuvada: Iha[] = [];
      for (const u of s.uyeler) yuvada[u.s] = u;
      ctx.lineWidth = 1; ctx.strokeStyle = vurgu; ctx.globalAlpha = 0.13; ctx.beginPath();
      for (const u of s.uyeler) {
        const o = yuvada[s.bicim === 1 ? 0 : s.bicim === 3 ? u.s - 1 : Math.max(0, u.s - 2)];
        if (!o || o === u) continue;
        ctx.moveTo(u.x, u.y - sy); ctx.lineTo(o.x, o.y - sy);
      }
      ctx.stroke();
    }
    for (const u of ihalar) {
      if (!ekranda(u, 30)) continue;
      const uye = !!u.sr || (giris.aktif && u.gi >= 0), salin = uye ? 0 : Math.sin(simdi / 420 + u.i * 1.7) * 1.4; // boştayken hafifçe salınır
      const lid = !!u.sr && u.s === 0;
      if (lid) { // lider: metin renginde, çevresinde ince bir halka
        ctx.globalAlpha = 0.5 * kis; ctx.strokeStyle = vurgu; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(u.x, u.y - sy, 12, 0, Math.PI * 2); ctx.stroke();
      }
      govde(u.x, u.y - sy + salin, u.aci, Math.hypot(u.vx, u.vy), lid ? metin : vurgu, (lid ? 0.95 : uye ? 0.6 : 0.42) * kis, donus + u.i);
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
    const uyeSayisi = suruler.reduce((a, s) => a + s.uyeler.length, 0);
    const ad = giris.aktif ? veri.giris ?? 'MATRİS' : onleme ? veri.onlemeAdi ?? 'önleme' : !suruler.length ? veri.serbest ?? 'serbest' : suruler.length > 1 ? `${suruler.length} ${veri.grup ?? 'grup'}` : suruler[0].adim === 'yaw' ? veri.donus ?? 'dönüş' : adlar[suruler[0].bicim];
    ctx.globalAlpha = 0.7; ctx.fillStyle = soluk; ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'right';
    ctx.fillText(`${(veri.etiket ?? 'sürü').toUpperCase()} · ${suruler.length && !giris.aktif ? uyeSayisi : N} · ${ad.toUpperCase()}`, en - 12, boy - 12);
    ctx.globalAlpha = 1;
  }

  function yerlestir() {
    // Her İHA kendi bölgesinde bir yerden başlar.
    for (const u of ihalar) { yeniHedef(u); u.x = u.tx; u.y = u.ty; yeniHedef(u); }
    veri.onleme = '0';
    // Açılış yazısı yalnızca ana sayfada, sayfa en üstteyken ve deneme parametresi yokken
    const ara_ = new URLSearchParams(location.search);
    if (veri.giris && scrollY < 100 && !ara_.has('dizilim') && !ara_.has('baskin')) girisBaslat(performance.now());
    iz();
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
  addEventListener('resize', () => { if (!basladi) return; boyutla(); if (giris.aktif && giris.noktalar.length) girisHedefle(); });
  document.addEventListener('visibilitychange', baslat);
  // Kullanıcı hareketi açılış yazısını bozar. Sayfa açılırken tarayıcının gönderdiği ilk fare olayı sayılmaz,
  // fare ilk görülen yerinden 24 pikselden fazla oynayınca hareket sayılır. Dokunma, tuş, tekerlek ve kaydırma hemen sayılır.
  let ilkImlec: { x: number; y: number } | null = null;
  const hareket = () => giris.aktif && girisBitir(performance.now());
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') { imlec.x = e.clientX; imlec.y = e.clientY; imlec.var = true; }
    if (!giris.aktif || performance.now() - giris.bas < 800) return;
    if (!ilkImlec) ilkImlec = { x: e.clientX, y: e.clientY };
    else if (Math.hypot(e.clientX - ilkImlec.x, e.clientY - ilkImlec.y) > 24) hareket();
  }, { passive: true });
  addEventListener('pointerdown', hareket, { passive: true }); addEventListener('keydown', hareket);
  addEventListener('wheel', hareket, { passive: true }); addEventListener('touchstart', hareket, { passive: true });
  addEventListener('scroll', () => { if (scrollY > 20) hareket(); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => (imlec.var = false));
  // Boş bir yere tıklamak: serbestken görünenleri oraya toplar, sürü varken en yakın sürüyü oraya götürür.
  // Bağlantı, düğme ve benzetimin üstündeki tıklamalara karışmaz.
  addEventListener('click', (e) => {
    if (!kare || (e.target as HTMLElement).closest('a, button, input, textarea, select, label, video, canvas, summary, dialog, .uye, [role="button"]')) return;
    if (getSelection()?.toString()) return;
    const t = performance.now();
    if (giris.aktif || t - giris.bitis < 700) return; // yazıyı bozan tıklama yeni sürü başlatmaz
    cagri.x = e.clientX; cagri.y = e.clientY; cagri.t = t;
    if (mod === 'serbest') dizilimKur(t, e.clientX, e.clientY);
    else if (mod === 'dizilim') {
      const s = [...suruler].sort((a, b) => Math.hypot(a.merkez.x - e.clientX, a.merkez.y - e.clientY) - Math.hypot(b.merkez.x - e.clientX, b.merkez.y - e.clientY))[0];
      s.adimlar.unshift('git'); siradakiAdim(s, t);
      s.hedef.x = Math.max(en * 0.15, Math.min(en * 0.85, e.clientX)); s.hedef.y = Math.max(boy * 0.2, Math.min(boy * 0.8, e.clientY)); rahatsiz += 1.1;
    }
  });
  azalt.addEventListener('change', baslat);
  // Tema değişince renkler yeniden okunur.
  new MutationObserver(() => basladi && boyutla()).observe(kok, { attributes: true, attributeFilter: ['data-theme'] });
  // Deneme betiği için: ?baskin yabancı sürüyü, ?dizilim ilk dizilimi beklemeden çağırır (?dizilim=5 katılacak İHA sayısını da verir).
  const ara = new URLSearchParams(location.search);
  if (ara.has('baskin')) sonrakiBaskin = performance.now() + 1500;
  if (ara.has('dizilim')) sonrakiDizilim = performance.now() + 1200;
  baslat();
}
