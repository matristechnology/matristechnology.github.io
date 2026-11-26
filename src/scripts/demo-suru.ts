// "Kendin dene" benzetimi: yarışmanın iki görevi, takımın yaklaşımıyla ama sadeleştirilmiş olarak.
//   Görev 1: sürü yerdeki QR kodlarını sırayla bulur, her kod bir emir ve bir sonraki noktayı verir.
//   Görev 2: bütün sürü tek kumandayla, tek bir İHA gibi yönetilir.
// Yaklaşım: lider ve takipçiler. Her araç dizilimdeki yerini (yuvasını) liderin konumuna ve yönüne göre
// kendisi hesaplar. Lider düşerse en küçük numaralı araç liderliği alır ve sürüyü eve döndürür.
// Gerçek uçuş yazılımı değildir: ölçüler, süreler ve QR içerikleri temsilidir.
// Durum tek yerde durur, her karede baştan çizilir. Ekrandan çıkınca ve sekme gizlenince döngü durur.
// "Hareketi azalt" açıksa hiçbir şey oynamaz: her basışta benzetim bir sonraki durağa sarılır, tek kare çizilir.
const kok = document.querySelector<HTMLElement>('[data-suru-demo]');
const tuval = kok?.querySelector('canvas');
if (kok && tuval) {
  const ctx = tuval.getContext('2d')!;
  const azalt = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => kok.querySelector<T>(s)!;
  const $$ = <T extends HTMLElement = HTMLElement>(s: string) => [...kok.querySelectorAll<T>(s)];
  const dil = document.documentElement.lang || 'tr';
  const say = (n: number, k = 0) => n.toLocaleString(dil, { minimumFractionDigits: k, maximumFractionDigits: k });

  type Dizilim = 'cizgi' | 'v' | 'ok';
  type Asama = 'bekle' | 'kalkis' | 'git' | 'kuzey' | 'merkez' | 'oku' | 'uygula' | 'ev' | 'inis' | 'bitti' | 'kumanda';
  type Arac = { id: number; slot: number; x: number; y: number; vx: number; vy: number; z: number; ayrik: '' | 'git' | 'in' | 'bekle' | 'kalk'; t: number };
  type Komut = { yazi: string; frm?: Dizilim; alt?: number; yatis?: number; ayril?: number };

  const EN_AZ = 3, EN_COK = 6, UCUS = 8, ARALIK_M = 7, KUZEY = -Math.PI / 2;
  // Alan: konumlar tuvalin eni ve boyuna oranla. Ev, dört QR noktası, kırmızı ve mavi iniş alanı.
  const EV = [0.24, 0.8], QR = [[0.3, 0.3], [0.62, 0.2], [0.76, 0.5], [0.47, 0.76]];
  const ALAN = { k: [0.72, 0.84], m: [0.47, 0.46] }, RENK = { k: '#e2574c', m: '#4c8fe2' };
  // QR içerikleri: yarışmadaki kısa komut biçimine benzer örnekler.
  const GOREV: Komut[] = [
    { yazi: 'frm v', frm: 'v' },
    { yazi: 'alt 12 · mnv 0 10', alt: 12, yatis: 10 },
    { yazi: 'leav 2 r · frm ok', ayril: 2, frm: 'ok' },
    { yazi: 'alt 8 · mnv 0 0 · frm l', alt: UCUS, yatis: 0, frm: 'cizgi' },
  ];

  const durumYazi = $('[data-durum]'), komutYazi = $('[data-komut]'), baslatDugme = $<HTMLButtonElement>('[data-baslat]');
  const dizilimDugmeleri = $$<HTMLButtonElement>('[data-dizilim-sec]'), gorevDugmeleri = $$<HTMLButtonElement>('[data-gorev-sec]');
  const asamaOgeleri = $$('[data-a]'), pad = $('[data-pad]'), asamaListesi = $('[data-asamalar]');

  let en = 0, boy = 0, oran = 1, vurgu = '#e8c468', soluk = '#a5a39a', metin = '#ecebe6';
  let gorev: 1 | 2 = 1, asama: Asama = 'bekle', asamaT = 0, saat = 0;
  let dizilim: Dizilim = 'cizgi', araclar: Arac[] = [];
  let dusenler: { x: number; y: number; t: number }[] = [];
  let merkez = { x: 0, y: 0 }, hedef = { x: 0, y: 0 };
  let yon = KUZEY, hedefYon = KUZEY, irtifa = 0, hedefIrtifa = 0, yatis = 0;
  let qr = 0, okunan = 0, liderDustu = false, duraklat = false;

  const px = (p: number[]) => ({ x: p[0] * en, y: p[1] * boy });
  const yerde = () => asama === 'bekle' || asama === 'bitti';
  const lider = () => araclar.find((a) => a.slot === 0);

  const yaz = (anahtar: string, yerine: Record<string, string | number> = {}) => {
    let m = kok.dataset[anahtar] ?? '';
    for (const [k, v] of Object.entries(yerine)) m = m.replace(`{${k}}`, String(v));
    durumYazi.textContent = m;
  };
  // Deneme betiği ve ekran okuyucu için iz: benzetimin durumu kök öğede ve düğmelerde yazılı durur.
  const iz = () => {
    const d = kok.dataset;
    d.gorev = String(gorev); d.asama = asama; d.dizilim = dizilim; d.sayi = String(araclar.length);
    d.lider = String(lider()?.id ?? ''); d.qr = String(qr); d.okunan = String(okunan);
    $('[data-sayi-yaz]').textContent = String(araclar.length);
    $('[data-irtifa-yaz]').textContent = `${say(hedefIrtifa)} m`;
    $('[data-lider-yaz]').textContent = String(lider()?.id ?? '');
    $('[data-qr-yaz]').textContent = `${okunan}/${GOREV.length}`;
    dizilimDugmeleri.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dizilimSec === dizilim)));
    gorevDugmeleri.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gorevSec === String(gorev))));
    asamaOgeleri.forEach((o) => (o.dataset.a === asama ? o.setAttribute('aria-current', 'step') : o.removeAttribute('aria-current')));
    asamaListesi.hidden = gorev !== 1; pad.hidden = gorev !== 2;
    const suruyor = !yerde() && !duraklat && asama !== 'kumanda';
    baslatDugme.textContent = (suruyor ? d.adSuruyor : duraklat ? d.adSurdur : asama === 'kumanda' ? d.adEv : gorev === 2 ? d.adKalkis : d.adBaslat) ?? '';
    baslatDugme.setAttribute('aria-disabled', String(suruyor));
  };
  const gec = (a: Asama, anahtar?: string, yerine?: Record<string, string | number>) => {
    asama = a; asamaT = saat;
    if (anahtar) yaz(anahtar, yerine);
    iz();
  };

  // Yuva: aracın lidere göre (ileri, yan) yeri. Lider 0 numaralı yuvadadır, ötekiler sağlı sollu dizilir.
  // Çizgi: yan yana. V: kollar önde. Ok başı: kollar arkada.
  const aralik = () => Math.max(22, Math.min(48, Math.min(en, boy) * 0.13)) * (araclar.length > 4 ? 0.72 : 1);
  const yuva = (k: number): [number, number] => {
    if (!k) return [0, 0];
    const d = aralik(), kat = Math.ceil(k / 2);
    return [dizilim === 'v' ? kat * d : dizilim === 'ok' ? -kat * d : 0, (k % 2 ? 1 : -1) * kat * d];
  };
  const yuvaKonumu = (k: number): [number, number] => {
    const [ileri, yan] = yuva(k), c = Math.cos(yon), s = Math.sin(yon);
    return [merkez.x + ileri * c - yan * s, merkez.y + ileri * s + yan * c];
  };
  // Yatış manevrası: sürü tek bir düzlem gibi yana yatar. Bir kanattaki araç yükselir, öteki alçalır.
  const yuvaIrtifasi = (k: number) => {
    if (irtifa < 3) return irtifa;
    return Math.max(3, irtifa - (yuva(k)[1] / aralik()) * ARALIK_M * Math.tan((yatis * Math.PI) / 180) * 2);
  };
  const yerineKoy = () => araclar.forEach((a) => { [a.x, a.y] = yuvaKonumu(a.slot); a.vx = a.vy = 0; a.z = yuvaIrtifasi(a.slot); a.ayrik = ''; });
  const yeniArac = (id: number, slot: number): Arac => ({ id, slot, ...px(EV), vx: 0, vy: 0, z: 0, ayrik: '', t: 0 });

  const qrGit = (n: number) => {
    qr = n;
    // GPS birkaç metre şaşar: sürü önce yaklaşık noktaya varır, son düzeltmeyi kamerayla yapar.
    const p = px(QR[n - 1]), d = aralik();
    hedef = { x: p.x + d * 0.42, y: p.y + d * 0.3 };
    gec('git', 'dGit', { n });
  };
  const eveDon = (anahtar: string, yerine?: Record<string, string | number>) => { hedef = px(EV); yatis = 0; duraklat = false; gec('ev', anahtar, yerine); };
  const uygula = () => {
    const k = GOREV[qr - 1];
    if (k.frm) dizilim = k.frm;
    if (k.alt != null) hedefIrtifa = k.alt;
    if (k.yatis != null) yatis = k.yatis;
    const ayrilan = k.ayril != null ? araclar.find((a) => a.id === k.ayril && a.slot !== 0 && !a.ayrik) : undefined;
    if (ayrilan) ayrilan.ayrik = 'git';
    komutYazi.textContent = `QR ${qr}: ${k.yazi}`;
    gec('uygula', `dQ${qr}`);
  };

  function adim(dt: number) {
    if (duraklat) return;
    saat += dt;
    const dx = hedef.x - merkez.x, dy = hedef.y - merkez.y, uzak = Math.hypot(dx, dy);
    const ucuyor = !yerde() && asama !== 'kalkis' && asama !== 'inis';
    if (ucuyor && uzak > 0.3) {
      const hiz = Math.min(asama === 'merkez' ? 14 : en * 0.2, uzak * 1.6 + 10), g = Math.min(uzak, hiz * dt);
      merkez.x += (dx / uzak) * g; merkez.y += (dy / uzak) * g;
      if ((asama === 'git' || asama === 'ev') && uzak > 16) hedefYon = Math.atan2(dy, dx); // sürü gittiği yöne döner
    }
    let fark = hedefYon - yon;
    while (fark > Math.PI) fark -= 2 * Math.PI;
    while (fark < -Math.PI) fark += 2 * Math.PI;
    yon += Math.max(-1.7 * dt, Math.min(1.7 * dt, fark));
    irtifa += Math.max(-4 * dt, Math.min(4 * dt, hedefIrtifa - irtifa));

    const ayrik = aralik() * 0.6, tavan = en * 0.32, inis = px(ALAN.k);
    let sapma = 0, zSapma = 0;
    for (const a of araclar) {
      let [hx, hy] = yuvaKonumu(a.slot), hz = yuvaIrtifasi(a.slot);
      if (a.ayrik) { // sürüden ayrılan araç: alana git, in, bekle, kalk, yuvana dön
        hx = inis.x; hy = inis.y;
        const yakin = Math.hypot(hx - a.x, hy - a.y) < 4;
        if (a.ayrik === 'git' && yakin) a.ayrik = 'in';
        if (a.ayrik === 'in' && a.z < 0.05) { a.ayrik = 'bekle'; a.t = saat; }
        if (a.ayrik === 'bekle' && saat - a.t > 1.8) a.ayrik = 'kalk';
        if (a.ayrik === 'kalk' && a.z > hz - 0.4) a.ayrik = '';
        if (a.ayrik === 'in' || a.ayrik === 'bekle') hz = 0;
      }
      a.z += Math.max(-4 * dt, Math.min(4 * dt, hz - a.z));
      if (a.z > 0.3) { // yerdeki araç kaymaz
        let ax = (hx - a.x) * 11, ay = (hy - a.y) * 11;
        for (const o of araclar) { // çarpışmadan kaçınma: yaklaşan araçlar birbirini iter
          if (o === a || o.z < 0.3) continue;
          const ex = a.x - o.x, ey = a.y - o.y, m = Math.hypot(ex, ey);
          if (m > 0 && m < ayrik) { ax += (ex / m) * (ayrik - m) * 45; ay += (ey / m) * (ayrik - m) * 45; }
        }
        a.vx = (a.vx + ax * dt) * Math.pow(0.006, dt); a.vy = (a.vy + ay * dt) * Math.pow(0.006, dt);
        const v = Math.hypot(a.vx, a.vy);
        if (v > tavan) { a.vx *= tavan / v; a.vy *= tavan / v; }
        a.x += a.vx * dt; a.y += a.vy * dt;
      } else a.vx = a.vy = 0;
      if (!a.ayrik) { sapma = Math.max(sapma, a.z > 0.3 || hz > 0.3 ? Math.hypot(hx - a.x, hy - a.y) : 0); zSapma = Math.max(zSapma, Math.abs(hz - a.z)); }
    }
    const hepsi = araclar.every((a) => !a.ayrik);
    const oturdu = sapma < 5 && zSapma < 0.25 && Math.abs(fark) < 0.04;
    kok!.dataset.oturdu = oturdu && hepsi && (!ucuyor || uzak < 1.5) ? '1' : '0';

    // Liderin görev akışı
    const sure = saat - asamaT;
    if (asama === 'kalkis' && oturdu && irtifa > UCUS - 0.05 && sure > 0.8) gorev === 2 ? gec('kumanda', 'dKumanda') : qrGit(1);
    else if (asama === 'git' && uzak < 1 && sure > 0.3) { hedefYon = KUZEY; gec('kuzey', 'dKuzey', { n: qr }); }
    else if (asama === 'kuzey' && oturdu && sure > 0.5) { hedef = px(QR[qr - 1]); gec('merkez', 'dMerkez'); }
    else if (asama === 'merkez' && uzak < 0.6 && oturdu) gec('oku', 'dOku', { n: qr });
    else if (asama === 'oku' && sure > 1) uygula();
    else if (asama === 'uygula' && sure > 1.4 && oturdu && hepsi) {
      okunan = qr;
      if (qr >= GOREV.length) eveDon('dEv');
      else if (azalt.matches) { duraklat = true; iz(); }
      else qrGit(qr + 1);
    } else if (asama === 'ev' && uzak < 1 && sure > 0.3) { // önce kuzeye döner, sonra birlikte iner
      hedefYon = KUZEY;
      if (oturdu) { hedefIrtifa = 0; gec('inis', 'dInis'); }
    }
    else if (asama === 'inis' && irtifa < 0.01 && zSapma < 0.05 && hepsi) gec('bitti', liderDustu ? 'dBittilider' : 'dBitti');
    dusenler = dusenler.filter((d) => saat - d.t < 0.9);
  }

  function govde(x: number, y: number, aci: number, a: number, faz: number, olcek: number, renk: string, doner: boolean) {
    const kol = 5.2, pr = 3;
    ctx.save(); ctx.translate(x, y); ctx.rotate(aci); ctx.scale(olcek, olcek);
    ctx.globalAlpha = a; ctx.strokeStyle = renk; ctx.fillStyle = renk; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-kol, -kol); ctx.lineTo(kol, kol); ctx.moveTo(-kol, kol); ctx.lineTo(kol, -kol); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-2.6, -2, 5.2, 4, 1.2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2.6, -1.4); ctx.lineTo(5, 0); ctx.lineTo(2.6, 1.4); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 4; k++) {
      const ox = k < 2 ? kol : -kol, oy = k % 2 ? kol : -kol;
      ctx.globalAlpha = a * 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, oy, pr, 0, Math.PI * 2); ctx.stroke();
      const d = doner ? (k === 0 || k === 3 ? 1 : -1) * faz : 0.8;
      ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(ox - Math.cos(d) * pr, oy - Math.sin(d) * pr); ctx.lineTo(ox + Math.cos(d) * pr, oy + Math.sin(d) * pr); ctx.stroke();
    }
    ctx.restore();
  }

  function ciz() {
    const olcek = Math.max(1.05, Math.min(1.5, en / 420)), faz = azalt.matches ? 0.8 : saat * 22, d = kok!.dataset;
    const etiket = (m: string, x: number, y: number, renk = soluk, hiza: CanvasTextAlign = 'center') => {
      ctx.globalAlpha = 0.95; ctx.fillStyle = renk; ctx.textAlign = hiza; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(10 * olcek)}px ui-monospace, SFMono-Regular, Menlo, monospace`; ctx.fillText(m, x, y);
    };
    ctx.clearRect(0, 0, en, boy);

    // Alan: ev, iniş alanları, QR noktaları, kuzey oku
    const ev = px(EV);
    ctx.globalAlpha = 0.7; ctx.strokeStyle = soluk; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(ev.x, ev.y, 11 * olcek, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    etiket(d.adEvnokta ?? '', ev.x, ev.y + 21 * olcek);
    for (const r of ['k', 'm'] as const) {
      const p = px(ALAN[r]);
      ctx.globalAlpha = 0.18; ctx.fillStyle = RENK[r]; ctx.beginPath(); ctx.arc(p.x, p.y, 13 * olcek, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.95; ctx.strokeStyle = RENK[r]; ctx.lineWidth = 1.6; ctx.stroke();
      etiket((r === 'k' ? d.adKirmizi : d.adMavi) ?? '', p.x, p.y + 23 * olcek);
    }
    QR.forEach((q, i) => {
      const p = px(q), b = 8 * olcek, bitti = i < okunan;
      ctx.globalAlpha = bitti ? 0.4 : 0.9; ctx.strokeStyle = soluk; ctx.fillStyle = soluk; ctx.lineWidth = 1.2;
      ctx.strokeRect(p.x - b, p.y - b, b * 2, b * 2);
      for (const [kx, ky] of [[-1, -1], [1, -1], [-1, 1]]) ctx.fillRect(p.x + kx * b * 0.55 - b * 0.25, p.y + ky * b * 0.55 - b * 0.25, b * 0.5, b * 0.5);
      etiket(`QR ${i + 1}${bitti ? ' ✓' : ''}`, p.x, p.y + b + 9 * olcek);
    });
    etiket(d.adKuzey ?? 'K', en - 16, 30, soluk);
    ctx.globalAlpha = 0.9; ctx.strokeStyle = soluk; ctx.lineWidth = 1.3; ctx.beginPath();
    ctx.moveTo(en - 16, 21); ctx.lineTo(en - 16, 9); ctx.moveTo(en - 20, 13); ctx.lineTo(en - 16, 9); ctx.lineTo(en - 12, 13); ctx.stroke();

    const l = lider();
    if (!yerde() && Math.hypot(hedef.x - merkez.x, hedef.y - merkez.y) > 8) { // gidilecek yol
      ctx.globalAlpha = 0.4; ctx.strokeStyle = vurgu; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(merkez.x, merkez.y); ctx.lineTo(hedef.x, hedef.y); ctx.stroke(); ctx.setLineDash([]);
    }
    if (l && (asama === 'merkez' || asama === 'oku')) { // liderin aşağı bakan kamerası
      const b = aralik() * 0.62;
      ctx.globalAlpha = asama === 'oku' ? 0.9 : 0.5; ctx.strokeStyle = metin; ctx.lineWidth = 1.2; ctx.strokeRect(l.x - b, l.y - b * 0.62, b * 2, b * 1.24);
    }
    // Haberleşme bağları: lider durumunu yayınlar, her takipçi ona bakar
    if (l) {
      ctx.globalAlpha = 0.22; ctx.strokeStyle = vurgu; ctx.lineWidth = 1; ctx.beginPath();
      for (const a of araclar) if (a !== l && a.z > 0.3) { ctx.moveTo(l.x, l.y); ctx.lineTo(a.x, a.y); }
      ctx.stroke();
    }
    for (const a of araclar) { // gölge: araç yükseldikçe uzaklaşır
      if (a.z < 0.3) continue;
      ctx.globalAlpha = 0.16; ctx.fillStyle = soluk; ctx.beginPath(); ctx.ellipse(a.x + a.z * 0.9, a.y + a.z * 1.2, 6 * olcek, 4 * olcek, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const u of dusenler) { // düşen lider: yerinde halka açılır
      const o = (saat - u.t) / 0.9;
      ctx.globalAlpha = (1 - o) * 0.7; ctx.strokeStyle = soluk; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(u.x, u.y, 6 + o * 24, 0, Math.PI * 2); ctx.stroke();
    }
    for (const a of araclar) {
      const lid = a === l, o = olcek * (0.72 + 0.06 * a.z);
      const aci = a.ayrik && Math.hypot(a.vx, a.vy) > 14 ? Math.atan2(a.vy, a.vx) : yon;
      govde(a.x, a.y, aci, lid ? 1 : 0.92, faz + a.id, o, lid ? vurgu : metin, a.z > 0.2);
      const farkli = a.z > 0.3 && (yatis !== 0 || !!a.ayrik || Math.abs(a.z - irtifa) > 0.4);
      const sagda = a.x > en * 0.7; // sağ kenara yakınsa yazı sola açılır, taşmaz
      etiket(`${a.id}${lid ? ` ${d.adLider}` : ''}${farkli ? ` · ${say(a.z, 1)} m` : ''}`, a.x + (sagda ? -9 : 9) * o, a.y - 10 * o, lid ? vurgu : soluk, sagda ? 'right' : 'left');
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
    if (ilk) sifirla();
    return true;
  };

  // Hareket azaltılmışken: benzetim bir sonraki durağa kadar sarılır (yerde, kumandada bekliyor ya da QR emri bitti).
  const sakin = () => duraklat || (kok.dataset.oturdu === '1' && (yerde() || asama === 'kumanda'));
  const sar = () => { for (let i = 0; i < 9000 && !(i > 2 && sakin()); i++) adim(0.04); dusenler = []; ciz(); };

  let kare = 0, son = 0, gorunur = false;
  const dongu = (t: number) => {
    const dt = Math.min(0.05, (t - son) / 1000 || 0.016), kat = Math.max(1, Math.min(12, Number(kok.dataset.hiz) || 1)); son = t;
    for (let i = 0; i < kat; i++) adim(dt);
    ciz();
    kare = gorunur && !document.hidden && !azalt.matches ? requestAnimationFrame(dongu) : 0;
  };
  const baslat = () => {
    if (!en && !boyutla()) return;
    if (azalt.matches) return sar();
    if (!kare && gorunur && !document.hidden) { son = performance.now(); kare = requestAnimationFrame(dongu); }
  };
  const degisti = () => { iz(); kok.dataset.oturdu = '0'; baslat(); };

  function sifirla(yazi = true) {
    asama = 'bekle'; dizilim = 'cizgi'; qr = 0; okunan = 0; liderDustu = false; duraklat = false; dusenler = [];
    merkez = px(EV); hedef = px(EV); yon = hedefYon = KUZEY; irtifa = hedefIrtifa = 0; yatis = 0;
    araclar = Array.from({ length: EN_AZ }, (_, i) => yeniArac(i, i)); yerineKoy();
    komutYazi.textContent = '';
    if (yazi) yaz(gorev === 2 ? 'dGorev2' : 'dBasla');
    iz();
  }

  gorevDugmeleri.forEach((b) => b.addEventListener('click', () => { gorev = b.dataset.gorevSec === '2' ? 2 : 1; sifirla(); degisti(); }));
  baslatDugme.addEventListener('click', () => {
    if (duraklat) { duraklat = false; qrGit(qr + 1); }
    else if (asama === 'kumanda') eveDon('dEvkumanda');
    else if (yerde()) {
      const d = dizilim, n = araclar.length;
      sifirla(false); dizilim = d;
      for (let i = EN_AZ; i < n; i++) araclar.push(yeniArac(i, i));
      yerineKoy(); hedefIrtifa = UCUS; gec('kalkis', 'dKalkis');
    } else return yaz('dSuruyor');
    degisti();
  });
  dizilimDugmeleri.forEach((b) => b.addEventListener('click', () => {
    dizilim = b.dataset.dizilimSec as Dizilim;
    if (yerde()) yerineKoy();
    yaz('dDizilim', { ad: b.textContent ?? '' }); degisti();
  }));
  $('[data-azalt]').addEventListener('click', () => {
    if (araclar.length <= EN_AZ) return yaz('dSinir');
    const son = araclar.reduce((a, b) => (b.slot > a.slot ? b : a));
    araclar = araclar.filter((a) => a !== son); yaz('dSayi', { n: araclar.length }); degisti();
  });
  $('[data-artir]').addEventListener('click', () => {
    if (araclar.length >= EN_COK) return yaz('dSinir');
    // Yedek araç: evden kalkar, boş yuvaya yerleşir.
    araclar.push(yeniArac(Math.max(...araclar.map((a) => a.id)) + 1, Math.max(...araclar.map((a) => a.slot)) + 1));
    if (yerde()) yerineKoy();
    yaz('dSayi', { n: araclar.length }); degisti();
  });
  $('[data-lider-dusur]').addEventListener('click', () => {
    const l = lider();
    if (!l || yerde() || asama === 'kalkis' || asama === 'inis') return yaz('dYerde');
    if (araclar.length <= 2) return yaz('dDusmez');
    dusenler.push({ x: l.x, y: l.y, t: saat });
    araclar = araclar.filter((a) => a !== l).sort((a, b) => a.id - b.id);
    // Liderden haber kesilir. En küçük numaralı araç liderliği alır, dizilim kalanlara göre yeniden kurulur.
    const yeni = araclar.find((a) => !a.ayrik) ?? araclar[0];
    let k = 1;
    for (const a of araclar) a.slot = a === yeni ? 0 : k++;
    liderDustu = true;
    eveDon('dLider', { n: yeni.id, k: araclar.length }); degisti();
  });
  pad.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-pad-yon]');
    if (!b) return;
    if (asama !== 'kumanda') return yaz('dYerde');
    const y = b.dataset.padYon!, a = Math.min(en, boy) * 0.2, c = Math.cos(yon), s = Math.sin(yon);
    if (y === 'dsol' || y === 'dsag') { hedefYon += (y === 'dsag' ? 1 : -1) * (Math.PI / 4); yaz('dDon'); }
    else {
      const [ileri, yan] = y === 'ileri' ? [1, 0] : y === 'geri' ? [-1, 0] : y === 'sag' ? [0, 1] : [0, -1];
      hedef.x = Math.max(en * 0.14, Math.min(en * 0.86, hedef.x + (ileri * c - yan * s) * a));
      hedef.y = Math.max(boy * 0.16, Math.min(boy * 0.84, hedef.y + (ileri * s + yan * c) * a));
      yaz('dHareket');
    }
    degisti();
  });
  $('[data-sifirla]').addEventListener('click', () => { sifirla(); degisti(); });

  new IntersectionObserver((k) => { gorunur = k[0].isIntersecting; baslat(); }, { rootMargin: '80px' }).observe(kok);
  new ResizeObserver(() => { if (boyutla() && (azalt.matches || !kare)) baslat(); }).observe(tuval);
  document.addEventListener('visibilitychange', baslat);
  azalt.addEventListener('change', baslat);
  new MutationObserver(() => { if (en) { boyutla(); if (azalt.matches) ciz(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
