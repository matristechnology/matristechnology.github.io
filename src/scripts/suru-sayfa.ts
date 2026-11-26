// Sürü İHA sayfasındaki eğik 3B benzetimler. Her biri kendi kök öğesini bulamazsa hiçbir şey yapmaz.
// Metinler kök öğenin data-m özniteliğinde JSON olarak gelir. Durum değişiklikleri role="status" satırına yazılır,
// denemeler için kök öğeye data-* izi bırakılır.
import { sahneKur, v3, enYakin, type Sahne, type V3, type Cizer } from './uc-boyut';
import { Suru, aracYap, aciFarki, ofset, dondur, egimOfseti, type Arac, type Dizilim } from './suru-model';

type Metin = Record<string, string>;
const metinler = (k: HTMLElement): Metin => { try { return JSON.parse(k.dataset.m ?? '{}'); } catch { return {}; } };
const doldur = (s: string | undefined, y: Record<string, string | number> = {}) => (s ?? '').replace(/\{(\w+)\}/g, (_, a) => String(y[a] ?? ''));
const $ = <T extends HTMLElement = HTMLElement>(k: ParentNode, s: string) => k.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(k: ParentNode, s: string) => [...k.querySelectorAll<T>(s)];
const yuvarla = (n: number, b = 1) => Number(n.toFixed(b));

/** Ortak çizim: İHA'ları kameraya uzaktan yakına sıralayıp çizer. */
function ihalariCiz(s: Sahne, araclar: Arac[], renk: (a: Arac) => string, ek: (a: Arac) => Partial<Parameters<Cizer['iha']>[0]> = () => ({})) {
  const sirali = [...araclar].sort((a, b) => s.kamera.derinlik(b.p) - s.kamera.derinlik(a.p));
  for (const a of sirali) s.cizer.iha({ p: a.p, yaw: a.yaw, egP: a.egP, egR: a.egR, renk: renk(a), motor: a.motor, dustu: a.dustu, ...ek(a) });
}
function qrCiz(c: Cizer, m: V3, no: number, durum: 'bos' | 'sirada' | 'okundu', yanip = 0) {
  const r = c.r;
  c.dortgen(m, 2.2, durum === 'okundu' ? r.vurgu : r.metin, durum === 'sirada' ? r.vurgu : null, durum === 'okundu' ? 0.55 : 0.82);
  // Köşe işaretleri: uzaktan da QR kodu gibi okunsun.
  for (const [a, b] of [[-1, 1], [1, 1], [-1, -1]] as const) c.dortgen(v3(m.x + a * 1.25, m.y + b * 1.25, 0.01), 0.6, r.zemin, null, 0.95);
  if (yanip > 0) c.dortgen(m, 2.2 + yanip * 2.5, null, r.vurgu, 1 - yanip);
  c.yazi(v3(m.x, m.y - 3.6, 0), `QR ${no}`, durum === 'bos' ? r.soluk : r.metin, 11);
}
function evCiz(c: Cizer, m: V3, boyut = 3.2) {
  c.dortgen(m, boyut, null, c.r.soluk, 0.9);
  c.yazi(m, 'H', c.r.soluk, 13);
}
function hedefDaire(c: Cizer, m: V3, renk: string) {
  c.zeminDaire(m, 2.6, renk, renk, 0.35);
  c.zeminDaire(m, 2.6, null, renk, 0.9, 2);
}

/* ── Ayrılma akışı: SEPARATE alan takipçi kendi bilgisayarında yürütür ─────────────────────── */
type AyrilmaAsama = 'GO_TO_MARKED' | 'SEARCH_CIRCLE' | 'CENTER_CIRCLE' | 'INIS' | 'BEKLE' | 'REJOIN_GROUND' | 'REJOIN_FLYING' | 'YERDE_KAL' | 'BITTI';
type Ayrilma = { a: Arac; daire: V3; asama: AyrilmaAsama; sayac: number; bekle: number };
function ayrilmaBaslat(a: Arac, daire: V3, bekle: number): Ayrilma {
  a.dizide = false; a.durum = 'ayrildi';
  a.hedef = v3(daire.x + 3, daire.y - 2.5, 6); a.hedefYaw = null;
  return { a, daire, asama: 'GO_TO_MARKED', sayac: 0, bekle };
}
/** Ayrılmayı bir adım ilerletir. Aşama değişince yeni aşamayı döndürür. */
function ayrilmaIlerle(y: Ayrilma, s: Suru, dt: number): AyrilmaAsama | null {
  const a = y.a, once = y.asama;
  y.sayac += dt;
  const yakin = (t = 0.5) => !!a.hedef && Math.hypot(a.hedef.x - a.p.x, a.hedef.y - a.p.y, a.hedef.z - a.p.z) < t;
  switch (y.asama) {
    case 'GO_TO_MARKED': if (yakin(0.8)) { y.asama = 'SEARCH_CIRCLE'; y.sayac = 0; } break;
    case 'SEARCH_CIRCLE': {
      // Küçük bir çember çizip daireyi kamerasında arar.
      const t = y.sayac * 2.2;
      a.hedef = v3(y.daire.x + Math.cos(t) * 3, y.daire.y + Math.sin(t) * 3, 6);
      if (y.sayac > 2.2) { y.asama = 'CENTER_CIRCLE'; y.sayac = 0; a.hedef = v3(y.daire.x, y.daire.y, 6); }
      break;
    }
    case 'CENTER_CIRCLE': if (yakin(0.4)) { y.asama = 'INIS'; a.hedef = v3(y.daire.x, y.daire.y, 0); } break;
    case 'INIS': if (a.p.z < 0.08) { a.motor = false; y.asama = 'BEKLE'; y.sayac = 0; } break;
    case 'BEKLE': if (y.sayac > y.bekle) { y.asama = 'REJOIN_GROUND'; y.sayac = 0; a.motor = true; a.hedef = v3(a.p.x, a.p.y, s.irtifa); } break;
    case 'REJOIN_GROUND': if (a.p.z > s.irtifa - 0.8) { y.asama = 'REJOIN_FLYING'; a.dizide = true; a.durum = 'katiliyor'; } break;
    case 'REJOIN_FLYING': if (s.yerinde(a, 0.8)) { y.asama = 'BITTI'; a.durum = 'dizide'; } break;
    default: break;
  }
  return y.asama !== once ? y.asama : null;
}

/* ════ 1. Alan tarama: solda tek İHA, sağda sürü, ikisi aynı anda başlar ══════════════════ */
{
  const kok = $(document, '[data-tarama]');
  const tekKok = kok && $(kok, '[data-panel="tek"]'), suruKok = kok && $(kok, '[data-panel="suru"]');
  if (kok && tekKok && suruKok) {
    const M = metinler(kok), durumYaz = $(kok, '[data-durum]')!, sayiYaz = $$(kok, '[data-sayi-yaz]');
    const basDugme = $<HTMLButtonElement>(kok, '[data-basla]')!, dusDugme = $<HTMLButtonElement>(kok, '[data-dusur]')!, dusTekDugme = $<HTMLButtonElement>(kok, '[data-dusur-tek]')!;
    const SX = 12, SY = 8, H = 4, X0 = -24, Y0 = -16, HIZ = 12, IRTIFA = 6;
    type Tarayici = { p: V3; yaw: number; sira: number[]; yol: V3[]; dustu: boolean; vz: number; eg: number };
    type Durum = 'hazir' | 'surer' | 'bitti' | 'yarim';
    const seritUclari = (j: number): [V3, V3] => [v3(X0 + H / 2, Y0 + H / 2 + j * H, IRTIFA), v3(X0 + SX * H - H / 2, Y0 + H / 2 + j * H, IRTIFA)];
    /** Bir tarama: kendi alanı, kendi İHA'ları, kendi süresi. Şeritler İHA'lara sırayla paylaştırılır. */
    const taramaYap = (adet: number) => {
      const t = {
        adet, taranan: new Uint8Array(SX * SY), sure: 0, durum: 'hazir' as Durum, dusen: 0,
        ihalar: Array.from({ length: adet }, (_, i): Tarayici => ({
          p: v3((i - (adet - 1) / 2) * 5, Y0 - 7, 0), yaw: Math.PI / 2,
          sira: Array.from({ length: SY }, (_, j) => j).filter((j) => Math.floor((j * adet) / SY) === i), yol: [], dustu: false, vz: 0, eg: 0,
        })),
        oran: () => Math.round((t.taranan.reduce((a, b) => a + b, 0) / t.taranan.length) * 100),
        canli: () => t.ihalar.filter((u) => !u.dustu),
        adim: (dt: number) => {
          for (const u of t.ihalar) if (u.dustu) { u.vz -= 9.8 * dt; u.p.z = Math.max(0, u.p.z + u.vz * dt); u.eg = Math.min(0.5, u.eg + dt); }
          if (t.durum !== 'surer') return;
          t.sure += dt;
          for (const u of t.ihalar) {
            if (u.dustu) continue;
            if (!u.yol.length) {
              const j = u.sira.shift();
              if (j === undefined) continue;
              const [a, b] = seritUclari(j);
              u.yol = Math.hypot(a.x - u.p.x, a.y - u.p.y) <= Math.hypot(b.x - u.p.x, b.y - u.p.y) ? [a, b] : [b, a];
            }
            const h = u.yol[0], dx = h.x - u.p.x, dy = h.y - u.p.y, d = Math.hypot(dx, dy), yol = HIZ * dt;
            if (d > 0.01) u.yaw = Math.atan2(dy, dx);
            if (d <= yol) { u.p.x = h.x; u.p.y = h.y; u.yol.shift(); } else { u.p.x += (dx / d) * yol; u.p.y += (dy / d) * yol; }
            u.p.z += (IRTIFA - u.p.z) * Math.min(1, dt * 4);
            const i = Math.floor((u.p.x - X0) / H), j = Math.floor((u.p.y - Y0) / H);
            if (u.p.z > IRTIFA * 0.7 && i >= 0 && i < SX && j >= 0 && j < SY) t.taranan[j * SX + i] = 1;
          }
          if (t.taranan.every((v) => v)) t.durum = 'bitti';
          else if (!t.canli().length) t.durum = 'yarim';
        },
        /** En çok işi kalan İHA düşer. Yarım şeridi ve başlamadığı şeritler, işi en az kalanlara verilir. */
        dusur: () => {
          const canli = t.canli();
          if (!canli.length) return;
          const is = (u: Tarayici) => u.sira.length + (u.yol.length ? 1 : 0);
          const kurban = canli.reduce((a, b) => (is(b) > is(a) ? b : a));
          kurban.dustu = true; kurban.vz = 0; t.dusen++;
          const kalan = [...(kurban.yol.length ? [Math.max(0, Math.min(SY - 1, Math.round((kurban.p.y - Y0 - H / 2) / H)))] : []), ...kurban.sira];
          kurban.sira = []; kurban.yol = [];
          const digerleri = t.canli();
          for (const j of kalan) { if (!digerleri.length) break; digerleri.reduce((a, b) => (b.sira.length < a.sira.length ? b : a)).sira.push(j); }
        },
      };
      return t;
    };
    let n = 3, tek = taramaYap(1), suru = taramaYap(n), basladi = false, sonYaz = 0, olay = '';
    const sn = (x: number) => x.toFixed(1);
    const tr = document.documentElement.lang === 'tr', goster = (x: number, b = 1) => (tr ? x.toFixed(b).replace('.', ',') : x.toFixed(b));
    const panelYaz = (p: HTMLElement, t: ReturnType<typeof taramaYap>) => {
      $(p, '[data-sure]')!.textContent = `${goster(t.sure)} s`;
      $(p, '[data-oran]')!.textContent = `%${t.oran()}`;
      p.toggleAttribute('data-bitti', t.durum === 'bitti'); p.toggleAttribute('data-yarim', t.durum === 'yarim');
    };
    const yaz = () => {
      sayiYaz.forEach((e) => (e.textContent = String(n)));
      panelYaz(tekKok, tek); panelYaz(suruKok, suru);
      kok.dataset.tek = tek.durum; kok.dataset.suru = suru.durum; kok.dataset.sayi = String(n); kok.dataset.dusen = String(suru.dusen);
      kok.dataset.tekOran = String(tek.oran()); kok.dataset.suruOran = String(suru.oran());
      kok.dataset.tekSure = sn(tek.sure); kok.dataset.suruSure = sn(suru.sure);
      const surer = tek.durum === 'surer' || suru.durum === 'surer';
      basDugme.textContent = basladi ? M.bastan : M.basla;
      dusDugme.disabled = suru.durum !== 'surer' || suru.canli().length < 2;
      dusTekDugme.disabled = tek.durum !== 'surer';
      const y = { n, s: goster(suru.sure), s1: goster(tek.sure), p: tek.oran(), k: goster(tek.sure / (suru.sure || 1)) };
      let m = '';
      if (!basladi) m = doldur(M.tHazir, y);
      else if (!surer) m = tek.durum === 'yarim' ? doldur(M.tTekYarim, y) : doldur(M.tBitti, y);
      else if (tek.durum === 'yarim') m = doldur(M.tTekDustu, y);
      else if (suru.durum === 'bitti') m = doldur(M.tSuruOnce, y);
      else m = olay || M.tIkisi;
      if (durumYaz.textContent !== m) durumYaz.textContent = m;
    };
    const kur = () => { tek = taramaYap(1); suru = taramaYap(n); basladi = false; olay = ''; yaz(); };
    const bitti = () => tek.durum !== 'surer' && suru.durum !== 'surer';
    const alanCiz = (s: Sahne, t: ReturnType<typeof taramaYap>) => {
      const c = s.cizer, r = c.r;
      s.kamera.hedef = v3(0, -4, 2);
      c.izgara(X0, X0 + SX * H, Y0, Y0 + SY * H, H);
      for (let j = 0; j < SY; j++) for (let i = 0; i < SX; i++) if (t.taranan[j * SX + i]) c.dortgen(v3(X0 + i * H + H / 2, Y0 + j * H + H / 2, 0), H / 2 - 0.15, r.vurgu, null, 0.32);
      c.dortgen(v3(0, 0, 0), (SX * H) / 2, null, r.soluk, 0.6);
      const sirali = [...t.ihalar].sort((a, b) => s.kamera.derinlik(b.p) - s.kamera.derinlik(a.p));
      for (const u of sirali) c.iha({ p: u.p, yaw: u.yaw, egP: u.dustu ? u.eg : t.durum === 'surer' ? 0.18 : 0, egR: u.dustu ? u.eg : 0, renk: r.vurgu, motor: !u.dustu && t.durum === 'surer', dustu: u.dustu, kol: 2 });
    };
    // İki panel tek saatle ilerler: adımı yalnızca soldaki sahne atar, sağdaki yalnızca çizer. İkisi de bölüm görünürken çalışır.
    const sol = sahneKur(tekKok, {
      uzak: 80, gozle: kok,
      adim: (dt) => {
        tek.adim(dt); suru.adim(dt);
        if (basladi && (bitti() || performance.now() - sonYaz > 100)) { sonYaz = performance.now(); yaz(); }
      },
      ciz: (s) => alanCiz(s, tek),
    });
    const sag = sahneKur(suruKok, { uzak: 80, gozle: kok, adim: () => {}, ciz: (s) => alanCiz(s, suru) });
    const yenile = () => {
      if (sol?.azalt) { sol.sar(bitti, 200); for (let i = 0; i < 60; i++) { tek.adim(1 / 30); suru.adim(1 / 30); } }
      yaz(); sol?.ciz(); sag?.ciz();
    };
    $(kok, '[data-azalt]')?.addEventListener('click', () => { if (n > 3) { n--; kur(); yenile(); } });
    $(kok, '[data-artir]')?.addEventListener('click', () => { if (n < 6) { n++; kur(); yenile(); } });
    basDugme.addEventListener('click', () => {
      if (basladi) kur();
      else { basladi = true; tek.durum = 'surer'; suru.durum = 'surer'; }
      yenile();
    });
    dusDugme.addEventListener('click', () => { if (suru.durum !== 'surer') return; suru.dusur(); olay = M.tDustu; yenile(); });
    dusTekDugme.addEventListener('click', () => { if (tek.durum !== 'surer') return; tek.dusur(); tek.durum = 'yarim'; yenile(); });
    kur();
  }
}

/* ════ 2. Roller: lider, takipçi, yedek ═══════════════════════════════════════════════════ */
{
  const kok = $(document, '[data-roller]');
  if (kok) {
    const M = metinler(kok), durumYaz = $(kok, '[data-durum]')!, panel = $(kok, '[data-rol-panel]')!;
    const roller: Record<string, { ad: string; metin: string; isler: string[] }> = JSON.parse(kok.dataset.rolMetin ?? '{}');
    const cagirDugme = $<HTMLButtonElement>(kok, '[data-cagir]')!;
    const secimler = $$<HTMLButtonElement>(kok, '[data-sec]');
    const suru = new Suru();
    suru.tip = 'OKBASI'; suru.aralik = 7; suru.yuvaSayisi = 3;
    const EV = v3(-2, -22, 0);
    suru.araclar = [aracYap(0, 'lider', 0, v3()), aracYap(1, 'takipci', 1, v3()), aracYap(2, 'takipci', 2, v3()), aracYap(3, 'yedek', 3, EV)];
    let t = 0, secili = 0;
    const yerlestir = () => {
      suru.merkez = v3(Math.cos(t * 0.16) * 9, Math.sin(t * 0.16) * 7 + 2, 0);
      suru.yon = Math.atan2(Math.cos(t * 0.16) * 7, -Math.sin(t * 0.16) * 9);
    };
    yerlestir();
    for (const a of suru.araclar.slice(0, 3)) { a.motor = true; a.p = suru.yuvaHedefi(a.yuva); a.yaw = suru.yon; }
    const yedek = suru.araclar[3];
    const sec = (id: number) => {
      secili = id;
      const a = suru.araclar[id], rol = roller[a.rol];
      secimler.forEach((d) => d.setAttribute('aria-pressed', String(Number(d.dataset.sec) === id)));
      panel.replaceChildren();
      if (rol) {
        const h = document.createElement('h4'); h.textContent = `${rol.ad} · ${a.id}`;
        const p = document.createElement('p'); p.textContent = rol.metin;
        const ul = document.createElement('ul'); ul.className = 'madde';
        for (const is of rol.isler) { const li = document.createElement('li'); li.textContent = is; ul.append(li); }
        panel.append(h, p, ul);
      }
      kok.dataset.secili = String(id); kok.dataset.rol = a.rol;
      durumYaz.textContent = doldur(M.rSecildi, { ad: rol?.ad ?? '', id });
    };
    const etiketler = () => secimler.forEach((d) => { const a = suru.araclar[Number(d.dataset.sec)]; d.textContent = `${roller[a.rol]?.ad ?? ''} · ${a.id}`; });
    const s = sahneKur(kok, {
      uzak: 62,
      adim: (dt) => {
        t += dt; yerlestir(); suru.adim(dt);
        if (yedek.durum === 'eve' && yedek.p.z < 0.08 && Math.hypot(yedek.p.x - EV.x, yedek.p.y - EV.y) < 0.6) { yedek.motor = false; yedek.durum = 'yerde'; yedek.rol = 'yedek'; etiketler(); if (secili === 3) sec(3); }
      },
      tikla: (x, y) => { if (!s) return; const a = enYakin(s.kamera, suru.araclar, x, y); if (a) { sec(a.id); s.ciz(); } },
      ciz: (s) => {
        const c = s.cizer, r = c.r;
        s.kamera.hedef = v3(0, -2, 3);
        c.izgara(-28, 28, -26, 22, 6);
        evCiz(c, v3(EV.x, EV.y, 0));
        const l = suru.lider();
        if (l) for (let k = 0; k < 2; k++) { const f = ((c.t * 1.2 + k / 2) % 1); c.dalga(l.p, 2 + f * 16, r.vurgu, (1 - f) * 0.7); }
        for (const a of suru.araclar) if (a.rol === 'takipci' && a.motor) { const f = (c.t * 0.9 + a.id * 0.33) % 1; c.dalga(a.p, 1.5 + f * 5, r.metin, (1 - f) * 0.45); }
        ihalariCiz(s, suru.araclar, (a) => (a.rol === 'lider' ? r.vurgu : a.rol === 'yedek' ? r.soluk : r.metin), (a) => ({ secili: a.id === secili, etiket: `${a.id}`, halka: a.rol === 'lider' && !a.dustu ? r.vurgu : undefined }));
      },
    });
    secimler.forEach((d) => d.addEventListener('click', () => { sec(Number(d.dataset.sec)); s?.ciz(); }));
    cagirDugme.addEventListener('click', () => {
      if (yedek.rol === 'yedek' && yedek.durum === 'yerde') {
        yedek.motor = true; yedek.dizide = true; yedek.rol = 'takipci'; yedek.durum = 'dizide'; suru.yuvaSayisi = 4;
        cagirDugme.textContent = M.rIndir; durumYaz.textContent = M.rCagirildi;
      } else if (yedek.dizide) {
        yedek.dizide = false; yedek.durum = 'eve'; yedek.hedef = v3(EV.x, EV.y, 0); yedek.hedefYaw = Math.PI / 2; suru.yuvaSayisi = 3;
        cagirDugme.textContent = M.rCagir; durumYaz.textContent = M.rIndi;
      }
      kok.dataset.yedek = yedek.durum;
      etiketler();
      if (secili === 3) { const once = durumYaz.textContent; sec(3); durumYaz.textContent = once; }
      if (s?.azalt) s.sar(() => yedek.durum !== 'eve' && (!yedek.motor || suru.yerinde(yedek)), 30);
    });
    etiketler();
    sec(0);
  }
}

/* ════ 3. Görev 1: QR noktaları arasında otonom görev ═════════════════════════════════════ */
type QrIs = { frm?: [Dizilim, number]; alt?: number; mnv?: [number, number]; leav?: [number, 'r' | 'b'] };
type QrPlan = { q: number; is: QrIs; sonraki: number; json: string };
const QR_YER: Record<number, V3> = { 1: v3(-22, -8), 2: v3(20, -12), 3: v3(-18, 16), 4: v3(6, 24), 5: v3(24, 10), 6: v3(0, 4) };
const KIRMIZI = v3(-34, 4), MAVI = v3(35, -1);
function planYap(): QrPlan[] {
  const kod = { CIZGI: 'l', V: 'v', OKBASI: 'ok' } as const;
  const p: Omit<QrPlan, 'json'>[] = [
    { q: 1, is: { frm: ['V', 8] }, sonraki: 3 },
    { q: 3, is: { alt: 12 }, sonraki: 4 },
    { q: 4, is: { mnv: [10, 0] }, sonraki: 5 },
    { q: 5, is: { leav: [2, 'b'] }, sonraki: 2 },
    { q: 2, is: { frm: ['OKBASI', 8], alt: 8 }, sonraki: 0 },
  ];
  // Yarışmadaki kısa biçim: {"qr", "w", "mis": [[komutlar]], "team": {"takım no": [görev sırası, sonraki QR]}}
  return p.map((x) => {
    const mis: (string | number)[][] = [];
    if (x.is.frm) mis.push(['frm', kod[x.is.frm[0]], x.is.frm[1]]);
    if (x.is.alt !== undefined) mis.push(['alt', x.is.alt]);
    if (x.is.mnv) mis.push(['mnv', ...x.is.mnv]);
    if (x.is.leav) mis.push(['leav', ...x.is.leav]);
    return { ...x, json: JSON.stringify({ qr: x.q, w: 3, mis: [mis], team: { '1': [1, x.sonraki] } }) };
  });
}
{
  const kok = $(document, '[data-gorev]');
  if (kok) {
    const M = metinler(kok), durumYaz = $(kok, '[data-durum]')!, jsonYaz = $(kok, '[data-qr-json]')!, okuYaz = $(kok, '[data-qr-oku]')!;
    const oynat = $<HTMLButtonElement>(kok, '[data-oynat]')!, sonraki = $<HTMLButtonElement>(kok, '[data-sonraki]')!, bastan = $<HTMLButtonElement>(kok, '[data-bastan]')!;
    const hizlar = $$<HTMLButtonElement>(kok, '[data-hiz]'), adimlar = $$(kok, '[data-adim]');
    const PLAN = planYap(), EV = v3(0, -28, 0);
    type Faz = 'hazir' | 'kalkis' | 'git' | 'kuzey' | 'ortala' | 'oku' | 'uygula' | 'ev-don' | 'ev' | 'inis' | 'bitti';
    let suru: Suru, faz: Faz = 'hazir', sira = 0, sayac = 0, oynuyor = false, hiz = 1, sar = false, ayrilma: Ayrilma | null = null;
    let hedef = v3(), okunan = new Set<number>(), yanip = 0, ortalamaAdim = 0;
    const kur = () => {
      suru = new Suru(); suru.tip = 'CIZGI'; suru.aralik = 8; suru.yuvaSayisi = 3; suru.irtifa = 0; suru.merkez = { ...EV }; suru.yon = Math.PI / 2;
      suru.araclar = [0, 1, 2].map((i) => aracYap(i, i ? 'takipci' : 'lider', i, v3()));
      for (const a of suru.araclar) { a.p = suru.yuvaHedefi(a.yuva); a.p.z = 0; a.vmax = 10; }
      faz = 'hazir'; sira = 0; sayac = 0; ayrilma = null; okunan = new Set(); oynuyor = false; sar = false;
      jsonYaz.textContent = ''; okuYaz.textContent = M.gQrYok;
      yaz(M.gHazir);
    };
    const adimNo = () => (faz === 'hazir' || faz === 'kalkis' ? 0 : faz === 'ev-don' || faz === 'ev' || faz === 'inis' || faz === 'bitti' ? PLAN.length + 1 : sira + 1);
    const izle = () => {
      kok.dataset.faz = faz; kok.dataset.adimNo = String(adimNo()); kok.dataset.tip = suru.tip; kok.dataset.irtifa = String(yuvarla(suru.irtifa));
      kok.dataset.okunan = [...okunan].join(',');
      const n = adimNo();
      adimlar.forEach((li, i) => { li.classList.toggle('bitti', i < n || faz === 'bitti'); if (i === n && faz !== 'bitti' && faz !== 'hazir') li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      oynat.textContent = oynuyor ? M.durdur : faz === 'hazir' ? M.basla : faz === 'bitti' ? M.bastan : M.devam;
      oynat.setAttribute('aria-pressed', String(oynuyor));
      sonraki.disabled = faz === 'bitti';
    };
    const yaz = (m: string) => { durumYaz.textContent = m; izle(); };
    const isMetni = (p: QrPlan) => {
      const parca: string[] = [];
      if (p.is.frm) parca.push(doldur(M.gFrm, { ad: M[p.is.frm[0]], a: p.is.frm[1] }));
      if (p.is.alt !== undefined) parca.push(doldur(M.gAlt, { a: p.is.alt }));
      if (p.is.mnv) parca.push(doldur(M.gMnv, { p: p.is.mnv[0], r: p.is.mnv[1] }));
      if (p.is.leav) parca.push(doldur(M.gLeav, { id: p.is.leav[0], renk: p.is.leav[1] === 'r' ? M.kirmizi : M.mavi }));
      parca.push(p.sonraki ? doldur(M.gSonraki, { q: p.sonraki }) : M.gSon);
      return parca.join(', ');
    };
    const fazaGec = (f: Faz) => {
      faz = f; sayac = 0;
      const p = PLAN[sira];
      if (f === 'kalkis') { suru.irtifa = 8; suru.araclar.forEach((a) => (a.motor = true)); yaz(M.gKalkis); }
      else if (f === 'git') { hedef = QR_YER[p.q]; yaz(doldur(M.gGit, { q: p.q }) + (ayrilma ? ` ${doldur(M.gAyrildi, { id: ayrilma.a.id })}` : '')); }
      else if (f === 'kuzey') yaz(M.gKuzey);
      else if (f === 'ortala') { ortalamaAdim = 0; yaz(M.gOrtala); }
      else if (f === 'oku') {
        okunan.add(p.q); yanip = 1;
        jsonYaz.textContent = p.json; okuYaz.textContent = isMetni(p);
        yaz(doldur(M.gOku, { q: p.q, is: isMetni(p) }));
      } else if (f === 'uygula') {
        // Yeni QR gelince önceki manevra sıfırlanır, manevra yalnızca kendi QR'ında geçerlidir.
        suru.pitch = p.is.mnv?.[0] ?? 0; suru.roll = p.is.mnv?.[1] ?? 0;
        if (p.is.frm) { suru.tip = p.is.frm[0]; suru.aralik = p.is.frm[1]; }
        if (p.is.alt !== undefined) suru.irtifa = p.is.alt;
        if (p.is.leav) {
          const a = suru.araclar.find((x) => x.id === p.is.leav![0]);
          if (a) { ayrilma = ayrilmaBaslat(a, p.is.leav[1] === 'r' ? KIRMIZI : MAVI, 5); yaz(doldur(M.gAyrildi, { id: a.id })); return; }
        }
        yaz(M.gUygula);
      } else if (f === 'ev-don') { hedef = EV; suru.pitch = suru.roll = 0; yaz(M.gEv); }
      else if (f === 'inis') { suru.irtifa = 0; yaz(M.gInis); }
      else if (f === 'bitti') { suru.araclar.forEach((a) => (a.motor = false)); oynuyor = false; yaz(M.gInis); }
      else izle();
    };
    /** Sürü merkezini hedefe sürer: önce döner, sonra ilerler. Vardığında true. */
    const merkezSur = (h: V3, dt: number, hizM = 6) => {
      const dx = h.x - suru.merkez.x, dy = h.y - suru.merkez.y, d = Math.hypot(dx, dy);
      if (d < 0.05) return true;
      const fark = aciFarki(Math.atan2(dy, dx) - suru.yon);
      if (d > 2 && Math.abs(fark) > 0.04) { suru.yon += Math.max(-1.1 * dt, Math.min(1.1 * dt, fark)); return false; }
      const yol = Math.min(d, hizM * dt);
      suru.merkez.x += (dx / d) * yol; suru.merkez.y += (dy / d) * yol;
      return false;
    };
    const ileri = (dt: number) => {
      sayac += dt; yanip = Math.max(0, yanip - dt * 1.2);
      if (ayrilma) {
        const yeni = ayrilmaIlerle(ayrilma, suru, dt);
        if (yeni === 'BITTI') { yaz(doldur(M.gKatildi, { id: ayrilma.a.id })); ayrilma = null; }
        else if (yeni) kok.dataset.ayrilma = yeni;
      }
      const p = PLAN[sira];
      switch (faz) {
        case 'kalkis': if (sayac > 1 && suru.hepsiYerinde()) fazaGec('git'); break;
        // Hedefe biraz kayık varılır: son düzeltmeyi liderin kamerası yapar (CENTER_QR).
        case 'git': if (merkezSur(v3(hedef.x + 1.6, hedef.y - 1.3), dt)) fazaGec('kuzey'); break;
        case 'kuzey': {
          const fark = aciFarki(Math.PI / 2 - suru.yon);
          suru.yon += Math.max(-1.1 * dt, Math.min(1.1 * dt, fark));
          if (Math.abs(fark) < 0.01 && sayac > 0.4) fazaGec('ortala');
          break;
        }
        case 'ortala': {
          // Kamera geri bildirimi: her adımda kalan kaymanın bir kısmı kapatılır, birkaç adımda yakınsar.
          if (sayac > 0.28) {
            sayac = 0; ortalamaAdim++;
            const q = QR_YER[p.q];
            suru.merkez.x += (q.x - suru.merkez.x) * 0.45; suru.merkez.y += (q.y - suru.merkez.y) * 0.45;
            if (Math.hypot(q.x - suru.merkez.x, q.y - suru.merkez.y) < 0.08) fazaGec('oku');
          }
          break;
        }
        case 'oku': if (sayac > 1.6) fazaGec('uygula'); break;
        case 'uygula': {
          const hazir = suru.hepsiYerinde(0.9);
          if ((sayac > 1.2 && hazir) || sayac > 5) {
            if (p.sonraki) { sira = PLAN.findIndex((x) => x.q === p.sonraki); fazaGec('git'); } else fazaGec('ev-don');
          }
          break;
        }
        case 'ev-don': if (ayrilma === null && merkezSur(EV, dt)) fazaGec('inis'); break;
        case 'inis': if (suru.araclar.every((a) => a.p.z < 0.1)) fazaGec('bitti'); break;
        default: break;
      }
      suru.adim(dt);
    };
    const s = sahneKur(kok, {
      uzak: 80,
      adim: (dt) => {
        if (!oynuyor) return;
        if (sar) {
          const bas = adimNo();
          for (let i = 0; i < 40 && adimNo() === bas && faz !== 'bitti'; i++) ileri(1 / 30);
          if (adimNo() !== bas || faz === 'bitti') sar = false;
        } else for (let i = 0; i < hiz; i++) ileri(dt);
      },
      ciz: (s) => {
        const c = s.cizer, r = c.r;
        const k = s.kamera;
        k.hedef.x += (suru.merkez.x * 0.6 - k.hedef.x) * 0.06; k.hedef.y += (suru.merkez.y * 0.6 - 2 - k.hedef.y) * 0.06; k.hedef.z = 3;
        c.izgara(-40, 40, -32, 32, 8);
        evCiz(c, EV, 3.4);
        hedefDaire(c, KIRMIZI, r.kirmizi); hedefDaire(c, MAVI, r.mavi);
        c.kuzey(v3(-36, -28, 0), 6);
        const p = PLAN[sira];
        for (const [no, yer] of Object.entries(QR_YER)) {
          const q = Number(no);
          qrCiz(c, yer, q, okunan.has(q) ? 'okundu' : p && q === p.q && faz !== 'hazir' ? 'sirada' : 'bos', p && q === p.q ? yanip : 0);
        }
        if (faz === 'git' || faz === 'ev-don') c.cizgi(v3(suru.merkez.x, suru.merkez.y, 0.05), v3(hedef.x, hedef.y, 0.05), r.vurgu, 1.5, 0.55, [6, 6]);
        const l = suru.lider();
        if (l && (faz === 'ortala' || faz === 'kuzey' || faz === 'oku')) {
          // Liderin aşağı bakan kamerasının gördüğü alan.
          const g = l.p.z * 0.42;
          for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) c.cizgi(l.p, v3(l.p.x + a * g, l.p.y + b * g, 0), r.vurgu, 1, 0.45);
          c.dortgen(v3(l.p.x, l.p.y, 0.02), g, r.vurgu, r.vurgu, 0.12);
        }
        ihalariCiz(s, suru.araclar, (a) => (a.rol === 'lider' ? r.vurgu : r.metin), (a) => ({ etiket: String(a.id), halka: a.rol === 'lider' && !a.dustu ? r.vurgu : undefined }));
      },
    });
    const calis = () => {
      if (!s) return;
      if (s.azalt) {
        // Hareket azaltılmış: oynat bütün görevi, sonraki adım tek adımı anında bitirir, tek kare çizilir.
        const bas = adimNo();
        const hedefAdim = sar ? bas + 1 : PLAN.length + 2;
        for (let i = 0; i < 20000 && faz !== 'bitti' && adimNo() < hedefAdim; i++) ileri(1 / 30);
        oynuyor = false; sar = false; izle(); s.ciz();
      }
    };
    oynat.addEventListener('click', () => {
      if (faz === 'bitti') { kur(); s?.ciz(); return; }
      if (faz === 'hazir') fazaGec('kalkis');
      oynuyor = !oynuyor; izle(); calis();
    });
    sonraki.addEventListener('click', () => {
      if (faz === 'bitti') return;
      if (faz === 'hazir') fazaGec('kalkis');
      oynuyor = true; sar = true; izle(); calis();
    });
    bastan.addEventListener('click', () => { kur(); s?.ciz(); });
    hizlar.forEach((d) => d.addEventListener('click', () => {
      hiz = Number(d.dataset.hiz) || 1;
      hizlar.forEach((x) => x.setAttribute('aria-pressed', String(x === d)));
    }));
    kur();
  }
}

/* ════ 4. Komut konsolu ═══════════════════════════════════════════════════════════════════ */
{
  const kok = $(document, '[data-konsol]');
  if (kok) {
    const M = metinler(kok), durumYaz = $(kok, '[data-durum]')!, paketYaz = $(kok, '[data-paket]')!;
    const EV = v3(0, -8, 0), YEDEK_EV = v3(14, -16, 0), KIR = v3(-20, 12), MAV = v3(20, 12);
    let suru: Suru, ayrilma: Ayrilma | null = null, yerdeKalan: Arac | null = null, bosYuva = -1, inis = false;
    const kur = () => {
      suru = new Suru(); suru.tip = 'CIZGI'; suru.aralik = 8; suru.yuvaSayisi = 3; suru.irtifa = 0; suru.merkez = { ...EV }; suru.yon = Math.PI / 2;
      suru.araclar = [aracYap(0, 'lider', 0, v3()), aracYap(1, 'takipci', 1, v3()), aracYap(2, 'takipci', 2, v3()), aracYap(3, 'yedek', 3, YEDEK_EV)];
      for (const a of suru.araclar.slice(0, 3)) { a.p = suru.yuvaHedefi(a.yuva); a.p.z = 0; }
      suru.araclar[3].dizide = false;
      ayrilma = null; yerdeKalan = null; bosYuva = -1; inis = false;
      paketYaz.textContent = M.kPaketYok; durumYaz.textContent = M.kHazir; izle();
    };
    const havada = () => suru.araclar.some((a) => a.motor && a.dizide);
    const izle = () => {
      kok.dataset.havada = havada() ? '1' : '0'; kok.dataset.tip = suru.tip; kok.dataset.irtifa = String(suru.irtifa);
      kok.dataset.pitch = String(suru.pitch); kok.dataset.roll = String(suru.roll);
      kok.dataset.ayrilma = ayrilma?.asama ?? ''; kok.dataset.bosYuva = String(bosYuva);
      kok.dataset.yedek = suru.araclar[3].dizide ? 'dizide' : 'yerde';
    };
    const gonder = (p: Record<string, unknown>, m: string) => { paketYaz.textContent = JSON.stringify(p); durumYaz.textContent = m; kok.dataset.son = String(p.cmd); izle(); };
    const red = (m: string) => { durumYaz.textContent = m; izle(); };
    const aktif = () => suru.araclar.filter((a) => a.dizide && !a.dustu).map((a) => a.id).sort();
    const komut = (k: string, arg?: string) => {
      const yerde = !havada();
      const ad = (t: Dizilim) => M[t];
      switch (k) {
        case 'TAKEOFF':
          if (!yerde) return red(M.kHavada);
          inis = false; suru.irtifa = 8;
          suru.araclar.filter((a) => a.dizide).forEach((a) => (a.motor = true));
          return gonder({ cmd: 'TAKEOFF', altitude: 8, spacing: suru.aralik, active: aktif() }, doldur(M.kTAKEOFF, { a: 8 }));
        case 'FORMATION': {
          if (yerde) return red(M.kYerde);
          suru.tip = arg as Dizilim;
          return gonder({ cmd: 'FORMATION', formation: suru.tip, spacing: suru.aralik, active: aktif(), heading: 90 }, doldur(M.kFORMATION, { ad: ad(suru.tip) }));
        }
        case 'ALTITUDE': {
          if (yerde) return red(M.kYerde);
          const yeni = suru.irtifa + Number(arg);
          if (yeni < 3 || yeni > 20) return red(M.kSinirAlt);
          suru.irtifa = yeni;
          return gonder({ cmd: 'ALTITUDE', altitude: yeni }, doldur(M.kALTITUDE, { a: yeni }));
        }
        case 'PITCH_ROLL': {
          if (yerde) return red(M.kYerde);
          const [p, r] = (arg ?? '0,0').split(',').map(Number);
          suru.pitch = p; suru.roll = r;
          return gonder({ cmd: 'PITCH_ROLL', pitch: p, roll: r }, M.kPITCH_ROLL);
        }
        case 'SEPARATE': {
          if (yerde) return red(M.kYerde);
          if (ayrilma || yerdeKalan) return red(M.kMesgul);
          const a = suru.araclar.filter((x) => x.dizide && x.rol === 'takipci').sort((x, y) => y.yuva - x.yuva)[0];
          if (!a) return red(M.kGerekYok);
          const renk = arg === 'r' ? 'KIRMIZI' : 'MAVI';
          ayrilma = ayrilmaBaslat(a, arg === 'r' ? KIR : MAV, 7);
          return gonder({ cmd: 'SEPARATE', drone_id: a.id, color: renk, wait_s: 10 }, doldur(M.kSEPARATE, { id: a.id, renk: arg === 'r' ? M.kirmizi : M.mavi }));
        }
        case 'STAY_GROUNDED': {
          if (!ayrilma || ayrilma.asama !== 'BEKLE') return red(M.kGerekYok);
          const a = ayrilma.a;
          ayrilma.asama = 'YERDE_KAL'; yerdeKalan = a; bosYuva = a.yuva; ayrilma = null;
          return gonder({ cmd: 'STAY_GROUNDED', drone_id: a.id }, doldur(M.kSTAY_GROUNDED, { id: a.id }));
        }
        case 'SUBSTITUTE': {
          const y = suru.araclar[3];
          if (bosYuva < 0 || y.dizide || yerde) return red(M.kGerekYok);
          y.rol = 'takipci'; y.yuva = bosYuva; y.dizide = true; y.motor = true;
          const p = { cmd: 'SUBSTITUTE', drone_id: y.id, slot: bosYuva, altitude: suru.irtifa };
          const m = doldur(M.kSUBSTITUTE, { id: y.id, y: bosYuva });
          bosYuva = -1;
          return gonder(p, m);
        }
        case 'REJOIN_APPROVED': {
          if (!yerdeKalan || bosYuva < 0 || yerde) return red(M.kGerekYok);
          const a = yerdeKalan;
          yerdeKalan = null;
          ayrilma = { a, daire: a.p, asama: 'BEKLE', sayac: 1e9, bekle: 0 };
          const p = { cmd: 'REJOIN_APPROVED', drone_id: a.id, slot: bosYuva, altitude: suru.irtifa };
          bosYuva = -1;
          return gonder(p, doldur(M.kREJOIN_APPROVED, { id: a.id }));
        }
        case 'RETURN_HOME':
          if (yerde) return red(M.kYerde);
          suru.merkez = { ...EV }; suru.pitch = suru.roll = 0;
          return gonder({ cmd: 'RETURN_HOME', heading: 90 }, M.kRETURN_HOME);
        case 'LAND':
          if (yerde) return red(M.kYerde);
          inis = true; suru.irtifa = 0; suru.pitch = suru.roll = 0;
          return gonder({ cmd: 'LAND' }, M.kLAND);
        case 'DISARM': {
          const ucan = suru.araclar.filter((a) => a.motor && a.dizide);
          if (!ucan.length) return red(M.kGerekYok);
          if (ucan.some((a) => a.p.z > 0.15)) return red(M.kDisarmHavada);
          ucan.forEach((a) => (a.motor = false));
          suru.irtifa = 8; inis = false;
          return gonder({ cmd: 'DISARM' }, M.kDISARM);
        }
      }
    };
    let gecikmeliYaz = '';
    const s = sahneKur(kok, {
      uzak: 64,
      adim: (dt) => {
        if (ayrilma) {
          const y = ayrilmaIlerle(ayrilma, suru, dt);
          if (y === 'BEKLE') { gecikmeliYaz = doldur(M.kBekliyor, { id: ayrilma.a.id }); }
          if (y === 'BITTI') { gecikmeliYaz = doldur(M.kDondu, { id: ayrilma.a.id }); ayrilma = null; }
          if (y) izle();
        }
        if (inis) for (const a of suru.araclar) if (a.dizide && a.p.z < 0.08) { a.p.z = 0; }
        suru.adim(dt);
        if (gecikmeliYaz) { durumYaz.textContent = gecikmeliYaz; gecikmeliYaz = ''; }
      },
      ciz: (s) => {
        const c = s.cizer, r = c.r;
        s.kamera.hedef = v3(0, 0, 4);
        c.izgara(-30, 30, -24, 24, 6);
        evCiz(c, EV, 6); evCiz(c, YEDEK_EV, 2.2);
        hedefDaire(c, KIR, r.kirmizi); hedefDaire(c, MAV, r.mavi);
        if (bosYuva >= 0 && havada()) { const h = suru.yuvaHedefi(bosYuva); c.zeminDaire(v3(h.x, h.y, 0.02), 1.8, null, r.soluk, 0.9); c.yazi(v3(h.x, h.y, 0), String(bosYuva), r.soluk, 11); }
        ihalariCiz(s, suru.araclar, (a) => (a.rol === 'lider' ? r.vurgu : a.rol === 'yedek' ? r.soluk : r.metin), (a) => ({ etiket: String(a.id), halka: a.rol === 'lider' && !a.dustu ? r.vurgu : undefined }));
      },
    });
    $$<HTMLButtonElement>(kok, '[data-k]').forEach((d) => d.addEventListener('click', () => {
      komut(d.dataset.k!, d.dataset.arg);
      if (s?.azalt) s.sar(() => suru.hepsiYerinde(0.6) && (!ayrilma || ayrilma.asama === 'BEKLE' || ayrilma.asama === 'BITTI'), 40);
    }));
    $(kok, '[data-bastan]')?.addEventListener('click', () => { kur(); s?.ciz(); });
    kur();
  }
}

/* ════ 5. Lider düşerse ═══════════════════════════════════════════════════════════════════ */
{
  const kok = $(document, '[data-lider-sahne]');
  if (kok) {
    const M = metinler(kok), durumYaz = $(kok, '[data-durum]')!, paketYaz = $(kok, '[data-paket]')!;
    const sayacYaz = $$(kok, '[data-sayac]'), cubuk = $$<HTMLElement>(kok, '[data-cubuk]');
    const arizaD = $<HTMLButtonElement>(kok, '[data-ariza]')!, devirD = $<HTMLButtonElement>(kok, '[data-devir]')!;
    const EV = v3(0, -22, 0), DAIRE = v3(-22, -12);
    type Faz = 'normal' | 'ariza' | 'rtl' | 'inis' | 'evde' | 'devir' | 'devir-ayril' | 'devir-son';
    let suru: Suru, faz: Faz = 'normal', t = 0, sayac = [0, 0, 0], ayrilma: Ayrilma | null = null, fazSure = 0;
    const sinir = (id: number) => 5 + id;
    const kur = () => {
      suru = new Suru(); suru.tip = 'CIZGI'; suru.aralik = 8; suru.yuvaSayisi = 3; suru.irtifa = 8;
      suru.araclar = [0, 1, 2].map((i) => aracYap(i, i ? 'takipci' : 'lider', i, v3()));
      t = 0; faz = 'normal'; sayac = [0, 0, 0]; ayrilma = null; fazSure = 0;
      yolu(0);
      for (const a of suru.araclar) { a.motor = true; a.p = suru.yuvaHedefi(a.yuva); a.yaw = suru.yon; }
      paketYaz.textContent = ''; durumYaz.textContent = M.lHazir; izle();
    };
    const yolu = (dt: number) => {
      t += dt * 0.14;
      suru.merkez = v3(Math.cos(t) * 12, Math.sin(t) * 7 + 3, 0);
      suru.yon = Math.atan2(Math.cos(t) * 7, -Math.sin(t) * 12);
    };
    const izle = () => {
      kok.dataset.faz = faz; kok.dataset.lider = String(suru.lider()?.id ?? '');
      kok.dataset.ayrilma = ayrilma?.asama ?? '';
      arizaD.disabled = devirD.disabled = faz !== 'normal';
      [1, 2].forEach((id, i) => {
        const v = Math.min(sayac[id], sinir(id));
        if (sayacYaz[i]) sayacYaz[i].textContent = `${v.toFixed(1)} s`;
        if (cubuk[i]) cubuk[i].style.setProperty('--d', String(v / sinir(id)));
      });
    };
    let sonIz = 0;
    const s = sahneKur(kok, {
      uzak: 66,
      adim: (dt) => {
        fazSure += dt;
        const l = suru.lider();
        if (faz === 'normal' || faz === 'devir' || faz === 'devir-ayril' || faz === 'devir-son') yolu(dt);
        // Lider yayın yaptıkça takipçilerin sayacı sıfırlanır.
        for (const a of suru.araclar) if (a.rol === 'takipci' && !a.dustu) sayac[a.id] = l ? 0 : sayac[a.id] + dt;
        if (faz === 'ariza') {
          const aday = suru.araclar.filter((a) => a.rol === 'takipci' && !a.dustu && sayac[a.id] >= sinir(a.id)).sort((a, b) => a.id - b.id)[0];
          if (aday) {
            aday.rol = 'lider'; aday.yuva = 0; faz = 'rtl'; fazSure = 0;
            paketYaz.textContent = JSON.stringify({ cmd: 'RETURN_HOME', heading: 90 });
            durumYaz.textContent = M.lYukseldi;
          }
        } else if (faz === 'rtl') {
          const dx = EV.x - suru.merkez.x, dy = EV.y - suru.merkez.y, d = Math.hypot(dx, dy);
          if (d > 0.1) { const fark = aciFarki(Math.atan2(dy, dx) - suru.yon); suru.yon += Math.max(-1.2 * dt, Math.min(1.2 * dt, fark)); if (Math.abs(fark) < 0.1) { const y = Math.min(d, 6 * dt); suru.merkez.x += (dx / d) * y; suru.merkez.y += (dy / d) * y; } }
          else { faz = 'inis'; suru.irtifa = 0; }
        } else if (faz === 'inis') {
          if (suru.araclar.filter((a) => !a.dustu).every((a) => a.p.z < 0.1)) { suru.araclar.forEach((a) => (a.motor = false)); faz = 'evde'; durumYaz.textContent = M.lEvde; }
        } else if (faz === 'devir' && fazSure > 3.5) {
          // Eski lider bir süre takipçi olarak uçar, sonra ayrılma akışına girer.
          const eski = suru.araclar[0];
          ayrilma = ayrilmaBaslat(eski, DAIRE, 1e9); faz = 'devir-ayril'; fazSure = 0;
        } else if (faz === 'devir-ayril' && ayrilma) {
          const y = ayrilmaIlerle(ayrilma, suru, dt);
          if (y === 'BEKLE') { faz = 'devir-son'; suru.yuvaSayisi = 3; durumYaz.textContent = M.lDevirSon; }
        }
        suru.adim(dt);
        if (fazSure - sonIz > 0.1 || fazSure < sonIz) { sonIz = fazSure; izle(); }
      },
      ciz: (s) => {
        const c = s.cizer, r = c.r;
        s.kamera.hedef = v3(0, -3, 3);
        c.izgara(-30, 30, -28, 22, 6);
        evCiz(c, EV, 5); hedefDaire(c, DAIRE, r.kirmizi);
        const l = suru.lider();
        if (l && l.motor) for (let k = 0; k < 2; k++) { const f = (c.t * 1.2 + k / 2) % 1; c.dalga(l.p, 2 + f * 14, r.vurgu, (1 - f) * 0.7); }
        ihalariCiz(s, suru.araclar, (a) => (a.rol === 'lider' ? r.vurgu : r.metin), (a) => ({
          etiket: a.rol === 'takipci' && !l && !a.dustu ? `${a.id} · ${sayac[a.id].toFixed(1)}/${sinir(a.id)} s` : String(a.id),
          halka: a.rol === 'lider' && !a.dustu ? r.vurgu : undefined,
        }));
      },
    });
    arizaD.addEventListener('click', () => {
      if (faz !== 'normal') return;
      const l = suru.lider()!;
      l.dustu = true; l.motor = false; l.v = v3(l.v.x, l.v.y, 0); faz = 'ariza'; fazSure = 0;
      paketYaz.textContent = '';
      durumYaz.textContent = M.lDustu; izle();
      if (s?.azalt) s.sar(() => faz === 'evde', 90);
    });
    devirD.addEventListener('click', () => {
      if (faz !== 'normal') return;
      const eski = suru.araclar[0], yeni = suru.araclar[1];
      paketYaz.textContent = JSON.stringify({ cmd: 'HANDOFF', new_leader_id: 1, current_qr: 3, next_qr: 4, center: [yuvarla(suru.merkez.x), yuvarla(suru.merkez.y)], heading: yuvarla((suru.yon * 180) / Math.PI, 0), altitude: suru.irtifa });
      yeni.rol = 'lider'; yeni.yuva = 0; eski.rol = 'takipci'; eski.yuva = 1;
      faz = 'devir'; fazSure = 0;
      durumYaz.textContent = `${M.lDevirBasla} ${M.lDevirTamam}`; izle();
      if (s?.azalt) s.sar(() => faz === 'devir-son', 90);
    });
    $(kok, '[data-bastan]')?.addEventListener('click', () => { kur(); s?.ciz(); });
    kur();
  }
}

/* ════ 6. Dizilim geometrisi ══════════════════════════════════════════════════════════════ */
{
  const kok = $(document, '[data-geometri]');
  if (kok) {
    const M = metinler(kok), tablo = $(kok, 'tbody')!, sayiYaz = $(kok, '[data-sayi-yaz]')!;
    const giris = (ad: string) => $<HTMLInputElement>(kok, `[data-g="${ad}"]`)!;
    const yon = giris('yon'), aralik = giris('aralik'), pitch = giris('pitch'), roll = giris('roll');
    const tipD = $$<HTMLButtonElement>(kok, '[data-tip]');
    const suru = new Suru();
    suru.irtifa = 8; suru.merkez = v3(); suru.tip = 'V';
    let n = 5;
    const kur = () => {
      suru.yuvaSayisi = n;
      const eski = suru.araclar;
      suru.araclar = Array.from({ length: n }, (_, i) => eski[i] ?? Object.assign(aracYap(i, i ? 'takipci' : 'lider', i, v3()), { motor: true }));
      for (const a of suru.araclar) { a.motor = true; if (!eski.includes(a)) a.p = suru.yuvaHedefi(a.yuva); }
    };
    const oku = () => {
      suru.yon = (Number(yon.value) * Math.PI) / 180; suru.aralik = Number(aralik.value); suru.pitch = Number(pitch.value); suru.roll = Number(roll.value);
      for (const [g, birim] of [[yon, '°'], [aralik, ' m'], [pitch, '°'], [roll, '°']] as const) {
        const o = kok.querySelector(`output[for="${g.id}"]`); if (o) o.textContent = `${g.value}${birim}`;
      }
      sayiYaz.textContent = String(n);
      tipD.forEach((d) => d.setAttribute('aria-pressed', String(d.dataset.tip === suru.tip)));
      kur();
      // Tablo: her yuvanın lidere göre yeri, döndürülmüş yeri ve manevradaki irtifa farkı.
      // Ondalık ayırıcı nokta: virgül, koordinat çiftinin ayırıcısıyla karışmasın.
      const f = (x: number) => (Math.abs(x) < 0.005 ? 0 : x).toFixed(1);
      tablo.replaceChildren(...suru.araclar.map((a) => {
        const [i, y] = ofset(suru.tip, a.yuva, suru.aralik), [x2, y2] = dondur(i, y, suru.yon), dz = egimOfseti(suru.tip, a.yuva, n, suru.aralik, suru.pitch, suru.roll);
        const tr = document.createElement('tr');
        for (const h of [a.yuva ? String(a.yuva) : `0 · ${M.lider}`, `(${f(i)}, ${f(y)})`, `(${f(x2)}, ${f(y2)})`, `${dz >= 0 ? '+' : ''}${f(dz)} m`]) { const td = document.createElement('td'); td.textContent = h; tr.append(td); }
        return tr;
      }));
      kok.dataset.tip = suru.tip; kok.dataset.sayi = String(n);
      s?.ciz();
      if (s?.azalt) s.sar(() => suru.hepsiYerinde(0.05), 20);
    };
    const s = sahneKur(kok, {
      uzak: 58,
      gorunum: 0,
      adim: (dt) => suru.adim(dt),
      ciz: (s) => {
        const c = s.cizer, r = c.r;
        s.kamera.hedef = v3(0, 0, 4);
        c.izgara(-28, 28, -28, 28, 4);
        // Eksenler: doğu ve kuzey
        c.cizgi(v3(-26, 0, 0), v3(26, 0, 0), r.soluk, 1, 0.7); c.cizgi(v3(0, -26, 0), v3(0, 26, 0), r.soluk, 1, 0.7);
        c.yazi(v3(27.5, 0, 0), 'x', r.soluk, 12); c.yazi(v3(0, 27.5, 0), 'y', r.soluk, 12);
        // Yön oku: θ
        const [ux, uy] = dondur(14, 0, suru.yon);
        c.cizgi(v3(0, 0, 0.05), v3(ux, uy, 0.05), r.vurgu, 2.5, 0.9);
        const [ox1, oy1] = dondur(11.5, 1.5, suru.yon), [ox2, oy2] = dondur(11.5, -1.5, suru.yon);
        c.yol([v3(ox1, oy1, 0.05), v3(ux, uy, 0.05), v3(ox2, oy2, 0.05)], false); c.ctx.strokeStyle = r.vurgu; c.ctx.lineWidth = 2.5; c.ctx.stroke();
        c.yazi(v3(ux * 1.15, uy * 1.15, 0), 'θ', r.vurgu, 14);
        for (const a of suru.araclar) {
          const h = suru.yuvaHedefi(a.yuva);
          c.zeminDaire(v3(h.x, h.y, 0.02), 1.1, null, r.soluk, 0.8);
          c.cizgi(v3(0, 0, 0.03), v3(h.x, h.y, 0.03), r.soluk, 1, 0.6, [4, 4]);
        }
        ihalariCiz(s, suru.araclar, (a) => (a.rol === 'lider' ? r.vurgu : r.metin), (a) => ({ etiket: String(a.yuva), halka: a.rol === 'lider' && !a.dustu ? r.vurgu : undefined }));
      },
    });
    for (const g of [yon, aralik, pitch, roll]) g.addEventListener('input', oku);
    tipD.forEach((d) => d.addEventListener('click', () => { suru.tip = d.dataset.tip as Dizilim; oku(); }));
    $(kok, '[data-azalt]')?.addEventListener('click', () => { if (n > 3) { n--; oku(); } });
    $(kok, '[data-artir]')?.addEventListener('click', () => { if (n < 7) { n++; oku(); } });
    oku();
  }
}
