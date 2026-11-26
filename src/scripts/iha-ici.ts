// "İHA'nın içi": takımın kullandığı aracın (F450 gövde ve üstündeki parçalar) döndürülebilen 3B çizimi.
// Parçaya tıklanınca ne işe yaradığı yazar, "Parçalara ayır" hepsini birbirinden uzaklaştırır,
// hat düğmeleri güç, veri ve kumanda bağlantılarını gösterir.
// Ölçü birimi santimetre. Yerleşim ve ölçüler temsilîdir, parça adları ve görevleri icerik.yaml içinden gelir.
import { sahneKur, v3, type V3, type Sahne } from './uc-boyut';

type Sekil =
  | { tur: 'kutu'; m: V3; b: V3; yaw?: number }
  | { tur: 'silindir'; m: V3; r: number; h: number }
  | { tur: 'disk'; m: V3; r: number }
  | { tur: 'cubuk'; a: V3; b: V3 };
type Parca = { sekiller: Sekil[]; ac: V3; baglar: V3[]; etiket: V3 };
type Yuz = { ns: V3[]; d: number; parca: string; ton: number; tur: 'yuz' | 'disk' | 'cubuk' };
type Bilgi = { ad: string; model: string; metin: string };

const C = Math.SQRT1_2;
const kose = [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const;
const kutu = (x: number, y: number, z: number, bx: number, by: number, bz: number, yaw = 0): Sekil => ({ tur: 'kutu', m: v3(x, y, z), b: v3(bx, by, bz), yaw });
const cubuk = (a: V3, b: V3): Sekil => ({ tur: 'cubuk', a, b });

const PARCALAR: Record<string, Parca> = {
  govde: {
    sekiller: [
      kutu(0, 0, 0.15, 6.5, 6.5, 0.15), kutu(0, 0, 3.85, 5.5, 5.5, 0.15),
      ...kose.map(([a, b]) => kutu(a * 13.5 * C, b * 13.5 * C, 2, 9, 1.5, 1.7, Math.atan2(b, a))),
      ...kose.map(([a, b]) => cubuk(v3(a * 8, b * 8, 0.3), v3(a * 11, b * 11, -8))),
    ],
    ac: v3(), baglar: [v3(0, 0, 0.3)], etiket: v3(0, 0, 0.3),
  },
  batarya: { sekiller: [kutu(0, 0, 1.75, 5.2, 1.7, 1.3)], ac: v3(0, -22, 0), baglar: [v3(0, 0, 1.75)], etiket: v3(0, 0, 3.2) },
  guc: { sekiller: [kutu(2.2, 4.6, 0.75, 2, 0.9, 0.45), kutu(-3, 4.6, 0.75, 1.2, 0.9, 0.45)], ac: v3(0, 16, 0), baglar: [v3(0, 4.6, 0.75)], etiket: v3(0, 4.6, 1.4) },
  esc: { sekiller: kose.map(([a, b]) => kutu(a * 13 * C, b * 13 * C, 4.1, 2.4, 1.2, 0.4, Math.atan2(b, a))), ac: v3(0, 0, 4), baglar: kose.map(([a, b]) => v3(a * 13 * C, b * 13 * C, 4.1)), etiket: v3(13 * C, 13 * C, 4.8) },
  motor: { sekiller: kose.map(([a, b]): Sekil => ({ tur: 'silindir', m: v3(a * 22.5 * C, b * 22.5 * C, 3.7), r: 1.5, h: 2.6 })), ac: v3(0, 0, 8), baglar: kose.map(([a, b]) => v3(a * 22.5 * C, b * 22.5 * C, 5)), etiket: v3(22.5 * C, 22.5 * C, 6.6) },
  pervane: { sekiller: kose.map(([a, b]): Sekil => ({ tur: 'disk', m: v3(a * 22.5 * C, b * 22.5 * C, 6.9), r: 11.5 })), ac: v3(0, 0, 14), baglar: [v3(22.5 * C, 22.5 * C, 6.9)], etiket: v3(22.5 * C, -22.5 * C, 7.6) },
  otopilot: { sekiller: [kutu(0, 0, 4.75, 4.1, 2.5, 0.75)], ac: v3(0, 0, 6), baglar: [v3(0, 0, 4.75)], etiket: v3(0, 0, 5.6) },
  bilgisayar: {
    sekiller: [kutu(0, 0, 8.3, 4.25, 2.8, 0.3), kutu(3, -1.2, 9.2, 1.1, 1.4, 0.6), ...kose.map(([a, b]) => cubuk(v3(a * 3.8, b * 2.4, 5.5), v3(a * 3.8, b * 2.4, 8)))],
    ac: v3(0, 0, 13), baglar: [v3(0, 0, 8.6)], etiket: v3(0, 0, 9.9),
  },
  wifi: { sekiller: [kutu(-3.4, 2, 9.1, 0.9, 0.5, 0.5), cubuk(v3(-3.4, 2, 9.6), v3(-3.4, 2, 16))], ac: v3(-4, 9, 15), baglar: [v3(-3.4, 2, 9.1)], etiket: v3(-3.4, 2, 16.6) },
  gps: { sekiller: [cubuk(v3(-5.2, 0, 4), v3(-5.2, 0, 13)), { tur: 'silindir', m: v3(-5.2, 0, 13), r: 2.6, h: 1.1 }], ac: v3(-12, 0, 12), baglar: [v3(-5.2, 0, 13.5)], etiket: v3(-5.2, 0, 14.8) },
  uwb: { sekiller: [kutu(0, 4.3, 4.3, 1.5, 0.9, 0.3), cubuk(v3(0, 4.3, 4.6), v3(0, 4.3, 7.4))], ac: v3(0, 12, 6), baglar: [v3(0, 4.3, 4.3)], etiket: v3(0, 4.3, 8) },
  alici: { sekiller: [kutu(0, -4.3, 4.6, 2.3, 1, 0.6), cubuk(v3(-1.5, -4.3, 5.2), v3(-4.5, -6.5, 9)), cubuk(v3(1.5, -4.3, 5.2), v3(4.5, -6.5, 9))], ac: v3(0, -12, 8), baglar: [v3(0, -4.3, 4.6)], etiket: v3(0, -4.3, 6) },
  kamera: { sekiller: [kutu(4, 0, -1.3, 1.9, 1.9, 1), { tur: 'silindir', m: v3(4, 0, -3.6), r: 1, h: 1.3 }], ac: v3(0, 0, -11), baglar: [v3(4, 0, -1.3)], etiket: v3(4, 0, -4.6) },
};
/** Hatlar: [nereden, nereye]. Kaynak: takımın Ön Tasarım Raporu'ndaki sistem mimarisi. */
const HATLAR: Record<string, [string, string][]> = {
  guc: [['batarya', 'govde'], ['govde', 'esc'], ['esc', 'motor'], ['batarya', 'guc'], ['guc', 'bilgisayar'], ['guc', 'otopilot']],
  veri: [['gps', 'otopilot'], ['uwb', 'otopilot'], ['kamera', 'bilgisayar'], ['bilgisayar', 'otopilot'], ['bilgisayar', 'wifi']],
  sinyal: [['alici', 'otopilot'], ['otopilot', 'esc']],
};
const ISIK = (() => { const l = Math.hypot(0.35, -0.5, 0.8); return v3(0.35 / l, -0.5 / l, 0.8 / l); })();
const topla = (a: V3, b: V3, k = 1) => v3(a.x + b.x * k, a.y + b.y * k, a.z + b.z * k);

for (const kok of document.querySelectorAll<HTMLElement>('[data-iha-ici]')) {
  const oku = <T,>(a: string | undefined, y: T): T => { try { return JSON.parse(a ?? '') as T; } catch { return y; } };
  const M = oku<Record<string, string>>(kok.dataset.m, {});
  const bilgi = oku<Record<string, Bilgi>>(kok.dataset.parcalar, {});
  const hatBilgi = oku<Record<string, Bilgi>>(kok.dataset.hatlar, {});
  const panel = kok.querySelector<HTMLElement>('[data-parca-panel]'), durumYaz = kok.querySelector<HTMLElement>('[data-durum]');
  const acDugme = kok.querySelector<HTMLButtonElement>('[data-ac]');
  const parcaDugmeleri = [...kok.querySelectorAll<HTMLButtonElement>('[data-parca]')], hatDugmeleri = [...kok.querySelectorAll<HTMLButtonElement>('[data-hat]')];
  let secili = '', ustunde = '', hat = '', acik = false, a = 0, dokundu = false, sonYuzler: (Yuz & { ek: { x: number; y: number }[] })[] = [];

  const yer = (ad: string, p: V3) => topla(p, PARCALAR[ad].ac, a);
  /** Bir parçanın yüzlerini üretir: kameraya dönük olmayanlar ayıklanır. */
  const yuzler = (s: Sahne, ad: string, liste: Yuz[]) => {
    const kam = s.kamera.konum, o = topla(v3(), PARCALAR[ad].ac, a);
    const ekle = (ns: V3[], n: V3 | null, tur: Yuz['tur'] = 'yuz') => {
      const m = ns.reduce((t, p) => v3(t.x + p.x / ns.length, t.y + p.y / ns.length, t.z + p.z / ns.length), v3());
      if (n && (m.x - kam.x) * n.x + (m.y - kam.y) * n.y + (m.z - kam.z) * n.z >= 0) return;
      const ton = n ? 0.35 + 0.65 * Math.max(0, n.x * ISIK.x + n.y * ISIK.y + n.z * ISIK.z) : 1;
      liste.push({ ns, d: s.kamera.derinlik(m), parca: ad, ton, tur });
    };
    for (const k of PARCALAR[ad].sekiller) {
      if (k.tur === 'cubuk') ekle([topla(k.a, o), topla(k.b, o)], null, 'cubuk');
      else if (k.tur === 'disk') ekle(Array.from({ length: 20 }, (_, i) => v3(k.m.x + o.x + Math.cos((i / 20) * 6.2832) * k.r, k.m.y + o.y + Math.sin((i / 20) * 6.2832) * k.r, k.m.z + o.z)), null, 'disk');
      else if (k.tur === 'silindir') {
        const N = 12, alt: V3[] = [], ust: V3[] = [];
        for (let i = 0; i < N; i++) { const t = (i / N) * 6.2832, x = k.m.x + o.x + Math.cos(t) * k.r, y = k.m.y + o.y + Math.sin(t) * k.r; alt.push(v3(x, y, k.m.z + o.z)); ust.push(v3(x, y, k.m.z + o.z + k.h)); }
        ekle(ust, v3(0, 0, 1)); ekle([...alt].reverse(), v3(0, 0, -1));
        for (let i = 0; i < N; i++) { const j = (i + 1) % N, t = ((i + 0.5) / N) * 6.2832; ekle([alt[i], alt[j], ust[j], ust[i]], v3(Math.cos(t), Math.sin(t), 0)); }
      } else {
        const cy = Math.cos(k.yaw ?? 0), sy = Math.sin(k.yaw ?? 0);
        const n = (x: number, y: number, z: number) => v3(k.m.x + o.x + x * cy - y * sy, k.m.y + o.y + x * sy + y * cy, k.m.z + o.z + z);
        const yon = (x: number, y: number, z: number) => v3(x * cy - y * sy, x * sy + y * cy, z);
        const { x: X, y: Y, z: Z } = k.b;
        ekle([n(-X, -Y, Z), n(X, -Y, Z), n(X, Y, Z), n(-X, Y, Z)], yon(0, 0, 1));
        ekle([n(-X, -Y, -Z), n(-X, Y, -Z), n(X, Y, -Z), n(X, -Y, -Z)], yon(0, 0, -1));
        ekle([n(X, -Y, -Z), n(X, Y, -Z), n(X, Y, Z), n(X, -Y, Z)], yon(1, 0, 0));
        ekle([n(-X, -Y, -Z), n(-X, -Y, Z), n(-X, Y, Z), n(-X, Y, -Z)], yon(-1, 0, 0));
        ekle([n(-X, Y, -Z), n(-X, Y, Z), n(X, Y, Z), n(X, Y, -Z)], yon(0, 1, 0));
        ekle([n(-X, -Y, -Z), n(X, -Y, -Z), n(X, -Y, Z), n(-X, -Y, Z)], yon(0, -1, 0));
      }
    }
  };

  const yaz = () => {
    kok.dataset.secili = secili; kok.dataset.acik = acik ? '1' : '0'; kok.dataset.hat = hat;
    parcaDugmeleri.forEach((d) => d.setAttribute('aria-pressed', String(d.dataset.parca === secili)));
    hatDugmeleri.forEach((d) => d.setAttribute('aria-pressed', String(d.dataset.hat === hat)));
    if (acDugme) { acDugme.setAttribute('aria-pressed', String(acik)); acDugme.textContent = acik ? M.topla : M.ayir; }
    const b = bilgi[secili];
    if (panel) {
      panel.replaceChildren();
      if (b) {
        const h = document.createElement('h4'); h.textContent = b.ad; panel.append(h);
        if (b.model) { const m = document.createElement('p'); m.className = 'parca-model'; m.textContent = b.model; panel.append(m); }
        const p = document.createElement('p'); p.textContent = b.metin; panel.append(p);
      }
    }
    const m = hat && hatBilgi[hat] ? hatBilgi[hat].metin : b ? '' : M.ipucu;
    if (durumYaz && durumYaz.textContent !== m) durumYaz.textContent = m;
  };

  const sahne = sahneKur(kok, {
    uzak: 86,
    adim: (dt) => {
      const hedef = acik ? 1 : 0;
      a += (hedef - a) * Math.min(1, dt * 5);
      if (Math.abs(hedef - a) < 0.002) a = hedef;
      if (!dokundu && sahne) sahne.kamera.aci += dt * 0.12;
    },
    tikla: (x, y) => { dokundu = true; sec(bul(x, y)); },
    ciz: (s) => {
      const c = s.cizer, ctx = c.ctx, r = c.r;
      s.kamera.hedef = v3(0, 0, 3 + a * 6);
      s.kamera.uzak = 86 + a * 24;
      s.kamera.guncelle(s.en, s.boy);
      c.zeminDaire(v3(0, 0, -8.2 - a * 11), 24, '#000', null, 0.1);
      const liste: Yuz[] = [];
      for (const ad of Object.keys(PARCALAR)) yuzler(s, ad, liste);
      liste.sort((p, q) => q.d - p.d);
      const hatta = new Set(hat ? HATLAR[hat].flat() : []);
      sonYuzler = [];
      for (const y of liste) {
        const ek = y.ns.map((n) => s.kamera.izdus(n));
        if (ek.some((n) => !n)) continue;
        const sec_ = y.parca === secili, ust = y.parca === ustunde, vurgulu = sec_ || ust || hatta.has(y.parca);
        const soluk = (secili || hat) && !vurgulu;
        ctx.beginPath();
        ek.forEach((n, i) => (i ? ctx.lineTo(n!.x, n!.y) : ctx.moveTo(n!.x, n!.y)));
        if (y.tur === 'cubuk') {
          ctx.globalAlpha = soluk ? 0.6 : 0.95; ctx.strokeStyle = sec_ ? r.vurgu : r.soluk; ctx.lineWidth = sec_ ? 2.5 : 1.8; ctx.stroke();
        } else {
          ctx.closePath();
          if (y.tur === 'disk') {
            ctx.globalAlpha = sec_ ? 0.28 : soluk ? 0.06 : 0.1; ctx.fillStyle = sec_ ? r.vurgu : r.metin; ctx.fill();
            ctx.globalAlpha = soluk ? 0.4 : 0.75; ctx.strokeStyle = sec_ ? r.vurgu : r.soluk; ctx.lineWidth = 1; ctx.stroke();
          } else {
            ctx.globalAlpha = 1; ctx.fillStyle = r.zemin; ctx.fill();
            ctx.globalAlpha = sec_ ? 0.4 + 0.5 * y.ton : (soluk ? 0.1 : 0.16) + (soluk ? 0.18 : 0.36) * y.ton + (ust ? 0.12 : 0);
            ctx.fillStyle = sec_ ? r.vurgu : r.metin; ctx.fill();
            ctx.globalAlpha = soluk ? 0.55 : 0.95; ctx.strokeStyle = sec_ || ust ? r.vurgu : r.soluk; ctx.lineWidth = 1; ctx.stroke();
          }
        }
        sonYuzler.push({ ...y, ek: ek as { x: number; y: number }[] });
      }
      ctx.globalAlpha = 1;
      // Hatlar: iki uçta aynı sayıda bağlantı noktası varsa birebir, yoksa tek noktadan hepsine.
      if (hat) {
        const renk = hat === 'guc' ? r.kirmizi : hat === 'veri' ? r.mavi : r.yesil;
        for (const [p, q] of HATLAR[hat]) {
          const A = PARCALAR[p].baglar, B = PARCALAR[q].baglar;
          const cift = A.length === B.length ? A.map((x, i) => [x, B[i]] as const) : A.length === 1 ? B.map((x) => [A[0], x] as const) : A.map((x) => [x, B[0]] as const);
          for (const [u, v] of cift) {
            const u2 = yer(p, u), v2 = yer(q, v);
            c.cizgi(u2, v2, renk, 2, 0.9);
            const t = (c.t * 0.8) % 1, n = s.kamera.izdus(v3(u2.x + (v2.x - u2.x) * t, u2.y + (v2.y - u2.y) * t, u2.z + (v2.z - u2.z) * t));
            if (n && !s.azalt) { ctx.beginPath(); ctx.arc(n.x, n.y, 3.2, 0, 6.2832); ctx.fillStyle = renk; ctx.fill(); }
          }
        }
      }
      const e = secili || ustunde;
      if (e && bilgi[e]) {
        const n = s.kamera.izdus(yer(e, PARCALAR[e].etiket));
        if (n) {
          ctx.font = `600 12px 'JetBrains Mono Variable', ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          const en = ctx.measureText(bilgi[e].ad).width + 12, x = Math.max(en / 2 + 4, Math.min(s.en - en / 2 - 4, n.x)), yy = Math.max(22, n.y - 8);
          ctx.fillStyle = r.zemin; ctx.globalAlpha = 0.85; ctx.fillRect(x - en / 2, yy - 17, en, 20); ctx.globalAlpha = 1;
          ctx.fillStyle = r.vurgu; ctx.fillText(bilgi[e].ad, x, yy);
        }
      }
    },
  });

  /** Ekrandaki noktanın altındaki parça: önce en öndeki yüz, olmazsa en yakın etiket noktası. */
  const bul = (x: number, y: number): string => {
    const icinde = (ek: { x: number; y: number }[]) => {
      let ic = false;
      for (let i = 0, j = ek.length - 1; i < ek.length; j = i++) if (ek[i].y > y !== ek[j].y > y && x < ((ek[j].x - ek[i].x) * (y - ek[i].y)) / (ek[j].y - ek[i].y) + ek[i].x) ic = !ic;
      return ic;
    };
    for (let i = sonYuzler.length - 1; i >= 0; i--) if (sonYuzler[i].tur !== 'cubuk' && icinde(sonYuzler[i].ek)) return sonYuzler[i].parca;
    let en = '', d = 26;
    if (sahne) for (const ad of Object.keys(PARCALAR)) { const n = sahne.kamera.izdus(yer(ad, PARCALAR[ad].etiket)); if (n && Math.hypot(n.x - x, n.y - y) < d) { d = Math.hypot(n.x - x, n.y - y); en = ad; } }
    return en;
  };
  const yenile = () => { if (sahne?.azalt) { a = acik ? 1 : 0; } yaz(); sahne?.ciz(); };
  const sec = (ad: string) => { secili = ad === secili ? '' : ad; if (secili) hat = ''; yenile(); };

  sahne?.tuval.addEventListener('pointerdown', () => (dokundu = true));
  sahne?.tuval.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    const r = sahne.tuval.getBoundingClientRect(), yeni = bul(e.clientX - r.left, e.clientY - r.top);
    if (yeni !== ustunde) { ustunde = yeni; sahne.tuval.style.cursor = yeni ? 'pointer' : ''; if (sahne.azalt) sahne.ciz(); }
  });
  sahne?.tuval.addEventListener('pointerleave', () => { ustunde = ''; });
  parcaDugmeleri.forEach((d) => d.addEventListener('click', () => { dokundu = true; sec(d.dataset.parca ?? ''); }));
  hatDugmeleri.forEach((d) => d.addEventListener('click', () => { dokundu = true; hat = hat === d.dataset.hat ? '' : (d.dataset.hat ?? ''); if (hat) secili = ''; yenile(); }));
  acDugme?.addEventListener('click', () => { dokundu = true; acik = !acik; yenile(); });
  yaz();
}
