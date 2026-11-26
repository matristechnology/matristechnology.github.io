// Küçük eğik 3B çizer: kütüphane yok, 2B tuval üstünde perspektif izdüşüm.
// Dünya: x doğu (sağ), y kuzey (ileri), z yukarı, birim metre.
// Kamera hedefin çevresinde döner (azimut ve eğim). Ziyaretçi sürükleyerek ya da "Görünüm" düğmesiyle açıyı değiştirir.
// Ölçüler temsilîdir: İHA'lar görünsün diye gerçeğinden büyük çizilir.

export type V3 = { x: number; y: number; z: number };
export const v3 = (x = 0, y = 0, z = 0): V3 => ({ x, y, z });
export type Nokta = { x: number; y: number; o: number; d: number };

export class Kamera {
  aci = -0.55;
  egim = 0.62;
  uzak = 78;
  hedef = v3(0, 0, 4);
  private c = v3();
  private r = v3();
  private u = v3();
  private f = v3();
  odak = 1;
  cx = 0;
  cy = 0;

  guncelle(en: number, boy: number) {
    this.cx = en / 2;
    this.cy = boy / 2;
    this.odak = Math.min(en * 0.95, boy * 1.35);
    const ce = Math.cos(this.egim), se = Math.sin(this.egim);
    const yx = ce * Math.sin(this.aci), yy = -ce * Math.cos(this.aci), yz = se;
    this.c = v3(this.hedef.x + this.uzak * yx, this.hedef.y + this.uzak * yy, this.hedef.z + this.uzak * yz);
    this.f = v3(-yx, -yy, -yz);
    const rl = Math.hypot(this.f.y, this.f.x) || 1;
    this.r = v3(this.f.y / rl, -this.f.x / rl, 0);
    const f = this.f, r = this.r;
    this.u = v3(r.y * f.z - r.z * f.y, r.z * f.x - r.x * f.z, r.x * f.y - r.y * f.x);
  }

  izdus(p: V3): Nokta | null {
    const dx = p.x - this.c.x, dy = p.y - this.c.y, dz = p.z - this.c.z;
    const z = dx * this.f.x + dy * this.f.y + dz * this.f.z;
    if (z < 1) return null;
    const o = this.odak / z;
    return { x: this.cx + (dx * this.r.x + dy * this.r.y) * o, y: this.cy - (dx * this.u.x + dy * this.u.y + dz * this.u.z) * o, o, d: z };
  }
  derinlik(p: V3) {
    return (p.x - this.c.x) * this.f.x + (p.y - this.c.y) * this.f.y + (p.z - this.c.z) * this.f.z;
  }
}

export type Renkler = { vurgu: string; metin: string; soluk: string; cizgi: string; yuzey: string; zemin: string; kirmizi: string; mavi: string; yesil: string };
export function renkOku(e: Element): Renkler {
  const s = getComputedStyle(e);
  const g = (a: string, y: string) => s.getPropertyValue(a).trim() || y;
  return {
    vurgu: g('--vurgu', '#e8c468'), metin: g('--metin', '#ecebe6'), soluk: g('--soluk', '#a5a39a'), cizgi: g('--cizgi', '#2b2b31'),
    yuzey: g('--yuzey', '#131315'), zemin: g('--zemin', '#0a0a0b'), kirmizi: g('--s-kirmizi', '#ff6b5e'), mavi: g('--s-mavi', '#5ea8ff'), yesil: g('--s-yesil', '#6fd39a'),
  };
}

export type IhaCizim = {
  p: V3; yaw: number; egP?: number; egR?: number; renk: string; alfa?: number; motor?: boolean; secili?: boolean;
  etiket?: string; halka?: string; dustu?: boolean; kol?: number;
};

export class Cizer {
  t = 0;
  constructor(public ctx: CanvasRenderingContext2D, public k: Kamera, public r: Renkler) {}

  yol(ns: V3[], kapat = true): boolean {
    const c = this.ctx;
    c.beginPath();
    for (let i = 0; i < ns.length; i++) {
      const n = this.k.izdus(ns[i]);
      if (!n) return false;
      if (i) c.lineTo(n.x, n.y);
      else c.moveTo(n.x, n.y);
    }
    if (kapat) c.closePath();
    return true;
  }
  cizgi(a: V3, b: V3, renk: string, kalin = 1, alfa = 1, kesik?: number[]) {
    const c = this.ctx;
    if (!this.yol([a, b], false)) return;
    c.globalAlpha = alfa; c.strokeStyle = renk; c.lineWidth = kalin; c.setLineDash(kesik ?? []);
    c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
  }
  daireNoktalari(m: V3, r: number, n = 32): V3[] {
    const ns: V3[] = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ns.push(v3(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, m.z)); }
    return ns;
  }
  zeminDaire(m: V3, r: number, dolgu: string | null, cizgi: string | null, alfa = 1, kalin = 1.5) {
    const c = this.ctx;
    if (!this.yol(this.daireNoktalari(m, r))) return;
    c.globalAlpha = alfa;
    if (dolgu) { c.fillStyle = dolgu; c.fill(); }
    if (cizgi) { c.strokeStyle = cizgi; c.lineWidth = kalin; c.stroke(); }
    c.globalAlpha = 1;
  }
  dortgen(m: V3, yarim: number, dolgu: string | null, cizgi: string | null, alfa = 1, aci = 0) {
    const c = this.ctx, ca = Math.cos(aci), sa = Math.sin(aci);
    const k = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => v3(m.x + (a * ca - b * sa) * yarim, m.y + (a * sa + b * ca) * yarim, m.z));
    if (!this.yol(k)) return;
    c.globalAlpha = alfa;
    if (dolgu) { c.fillStyle = dolgu; c.fill(); }
    if (cizgi) { c.strokeStyle = cizgi; c.lineWidth = 1.5; c.stroke(); }
    c.globalAlpha = 1;
  }
  /** Zemin ızgarası: sahaya derinlik hissi verir. */
  izgara(x0: number, x1: number, y0: number, y1: number, adim: number) {
    const c = this.ctx;
    c.lineWidth = 1;
    c.strokeStyle = this.r.cizgi;
    c.globalAlpha = 0.9;
    for (let x = x0; x <= x1 + 1e-6; x += adim) { if (this.yol([v3(x, y0), v3(x, y1)], false)) c.stroke(); }
    for (let y = y0; y <= y1 + 1e-6; y += adim) { if (this.yol([v3(x0, y), v3(x1, y)], false)) c.stroke(); }
    c.globalAlpha = 1;
  }
  yazi(p: V3, metin: string, renk: string, boyut = 11, hiza: CanvasTextAlign = 'center', dy = 0) {
    const n = this.k.izdus(p);
    if (!n) return;
    const c = this.ctx;
    c.font = `600 ${boyut}px 'JetBrains Mono Variable', ui-monospace, monospace`;
    c.textAlign = hiza; c.textBaseline = 'middle';
    c.fillStyle = renk;
    c.fillText(metin, n.x, n.y + dy);
  }
  /** Kuzey oku ve harfi. */
  kuzey(m: V3, boy: number) {
    this.cizgi(m, v3(m.x, m.y + boy, m.z), this.r.soluk, 1.5, 0.8);
    this.yol([v3(m.x - boy * 0.18, m.y + boy * 0.72, m.z), v3(m.x, m.y + boy, m.z), v3(m.x + boy * 0.18, m.y + boy * 0.72, m.z)], false);
    this.ctx.strokeStyle = this.r.soluk; this.ctx.lineWidth = 1.5; this.ctx.stroke();
    this.yazi(v3(m.x, m.y + boy * 1.3, m.z), 'N', this.r.soluk, 11);
  }

  /** Gövde koordinatından dünyaya: önce yatış (x ekseni), sonra eğilme (burun aşağı artı), sonra yön. */
  private govde(p: V3, yaw: number, eP: number, eR: number, bx: number, by: number, bz = 0): V3 {
    const cr = Math.cos(eR), sr = Math.sin(eR);
    let y = by * cr - bz * sr, z = by * sr + bz * cr, x = bx;
    const cp = Math.cos(eP), sp = Math.sin(eP);
    const x2 = x * cp + z * sp; z = z * cp - x * sp; x = x2;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    return v3(p.x + x * cy - y * sy, p.y + x * sy + y * cy, p.z + z);
  }

  iha(o: IhaCizim) {
    const c = this.ctx, L = o.kol ?? 1.7, alfa = o.alfa ?? 1, eP = o.egP ?? 0, eR = o.egR ?? 0;
    // Gölge ve irtifa çizgisi: yerden ne kadar yüksekte olduğu hemen okunur.
    if (o.p.z > 0.15) {
      this.zeminDaire(v3(o.p.x, o.p.y, 0), L * 0.9, '#000', null, 0.22 * alfa);
      this.cizgi(o.p, v3(o.p.x, o.p.y, 0), o.renk, 1, 0.28 * alfa, [3, 4]);
    }
    if (o.secili) { this.zeminDaire(v3(o.p.x, o.p.y, 0.02), L * 1.2, o.renk, null, 0.18); this.zeminDaire(o.p, L * 2.1, null, o.renk, 0.95, 2); }
    const kollar = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => this.govde(o.p, o.yaw, eP, eR, (a * L) / Math.SQRT2, (b * L) / Math.SQRT2));
    const merkez = this.k.izdus(o.p);
    if (!merkez) return;
    c.globalAlpha = alfa;
    c.strokeStyle = o.dustu ? this.r.soluk : o.renk;
    c.lineWidth = Math.max(1.5, merkez.o * 0.22);
    for (const k of kollar) { if (this.yol([o.p, k], false)) c.stroke(); }
    // Pervaneler: motor çalışırken dolu ve hafif titrek, dururken boş halka.
    kollar.forEach((k, i) => {
      const ns: V3[] = [];
      const r = L * 0.42;
      for (let j = 0; j < 14; j++) {
        const a = (j / 14) * Math.PI * 2;
        const bx = ((i < 2 ? 1 : -1) * L) / Math.SQRT2 + Math.cos(a) * r, by = ((i % 2 ? -1 : 1) * L) / Math.SQRT2 + Math.sin(a) * r;
        ns.push(this.govde(o.p, o.yaw, eP, eR, bx, by, 0.05));
      }
      if (!this.yol(ns)) return;
      if (o.motor) { c.fillStyle = o.renk; c.globalAlpha = alfa * (0.22 + 0.06 * Math.sin(this.t * 40 + i)); c.fill(); }
      c.globalAlpha = alfa * (o.motor ? 0.9 : 0.55);
      c.lineWidth = 1.2; c.strokeStyle = i < 2 && !o.dustu ? o.renk : this.r.soluk; c.stroke();
    });
    // Gövde ve burun
    const burun = this.govde(o.p, o.yaw, eP, eR, L * 0.75, 0, 0.1);
    c.globalAlpha = alfa;
    this.yol([o.p, burun], false); c.strokeStyle = o.dustu ? this.r.soluk : o.renk; c.lineWidth = Math.max(2, merkez.o * 0.3); c.stroke();
    const b = Math.max(3, merkez.o * 0.55);
    c.fillStyle = o.dustu ? this.r.soluk : o.renk;
    c.fillRect(merkez.x - b / 2, merkez.y - b / 2, b, b);
    if (o.halka) { c.beginPath(); c.arc(merkez.x, merkez.y, Math.max(9, merkez.o * L * 1.25), 0, Math.PI * 2); c.strokeStyle = o.halka; c.lineWidth = 1.5; c.globalAlpha = alfa * 0.85; c.stroke(); }
    if (o.dustu) {
      c.strokeStyle = this.r.kirmizi; c.lineWidth = 2; c.globalAlpha = 1;
      const s = Math.max(6, merkez.o * L * 0.8);
      c.beginPath(); c.moveTo(merkez.x - s, merkez.y - s * 0.6); c.lineTo(merkez.x + s, merkez.y + s * 0.6); c.moveTo(merkez.x + s, merkez.y - s * 0.6); c.lineTo(merkez.x - s, merkez.y + s * 0.6); c.stroke();
    }
    c.globalAlpha = 1;
    if (o.etiket) {
      c.font = `600 11px 'JetBrains Mono Variable', ui-monospace, monospace`;
      c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillStyle = o.dustu ? this.r.soluk : this.r.metin;
      c.fillText(o.etiket, merkez.x, merkez.y - Math.max(12, merkez.o * L * 1.35));
    }
  }

  /** Yayılan halka: liderin yayını ya da kalp atışı. */
  dalga(m: V3, r: number, renk: string, alfa: number) {
    if (!this.yol(this.daireNoktalari(m, r, 40))) return;
    this.ctx.globalAlpha = alfa; this.ctx.strokeStyle = renk; this.ctx.lineWidth = 1.5; this.ctx.stroke(); this.ctx.globalAlpha = 1;
  }
}

/** Ekrandaki bir noktaya en yakın İHA'yı bulur (tıklayarak seçmek için). */
export function enYakin<T extends { p: V3 }>(k: Kamera, liste: T[], x: number, y: number, esik = 34): T | null {
  let en: T | null = null, d = esik;
  for (const a of liste) {
    const n = k.izdus(a.p);
    if (!n) continue;
    const m = Math.hypot(n.x - x, n.y - y);
    if (m < d) { d = m; en = a; }
  }
  return en;
}

export const GORUNUMLER = [
  { aci: -0.55, egim: 0.62 },
  { aci: 0.35, egim: 0.3 },
  { aci: 0, egim: 1.45 },
] as const;

/**
 * Bir sahnenin ortak işleri: tuval boyutu, renkler, sürükleyerek döndürme, görünüm düğmesi,
 * görünürken çalışan döngü, "hareketi azalt" durumunda tek kare.
 */
export type Sahne = {
  kok: HTMLElement;
  tuval: HTMLCanvasElement;
  kamera: Kamera;
  cizer: Cizer;
  en: number;
  boy: number;
  azalt: boolean;
  /** Hareketi azaltılmışken: benzetimi verilen koşul sağlanana kadar ileri sar, sonra tek kare çiz. */
  sar: (bitti: () => boolean, enCok?: number) => void;
  ciz: () => void;
};

export function sahneKur(
  kok: HTMLElement,
  o: { adim: (dt: number) => void; ciz: (s: Sahne) => void; tikla?: (x: number, y: number) => void; gorunum?: number; uzak?: number },
): Sahne | null {
  const tuval = kok.querySelector<HTMLCanvasElement>('canvas');
  if (!tuval) return null;
  const ctx = tuval.getContext('2d');
  if (!ctx) return null;
  const azaltSorgu = matchMedia('(prefers-reduced-motion: reduce)');
  const kamera = new Kamera();
  const g = GORUNUMLER[o.gorunum ?? 0];
  kamera.aci = g.aci; kamera.egim = g.egim;
  if (o.uzak) kamera.uzak = o.uzak;
  const cizer = new Cizer(ctx, kamera, renkOku(kok));
  let oran = 1, gorunur = false, calisiyor = false, son = 0;

  const s: Sahne = {
    kok, tuval, kamera, cizer, en: 0, boy: 0, azalt: azaltSorgu.matches,
    sar: (bitti, enCok = 60) => {
      for (let t = 0; t < enCok && !bitti(); t += 1 / 30) o.adim(1 / 30);
      s.ciz();
    },
    ciz: () => {
      ctx.setTransform(oran, 0, 0, oran, 0, 0);
      ctx.clearRect(0, 0, s.en, s.boy);
      kamera.guncelle(s.en, s.boy);
      o.ciz(s);
    },
  };

  const boyutla = () => {
    const r = tuval.getBoundingClientRect();
    oran = Math.min(1.5, devicePixelRatio || 1);
    s.en = Math.max(1, r.width); s.boy = Math.max(1, r.height);
    tuval.width = Math.round(s.en * oran); tuval.height = Math.round(s.boy * oran);
    s.ciz();
  };
  new ResizeObserver(boyutla).observe(tuval);
  new MutationObserver(() => { cizer.r = renkOku(kok); s.ciz(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  azaltSorgu.addEventListener('change', () => { s.azalt = azaltSorgu.matches; baslat(); });

  const kare = (zaman: number) => {
    if (!gorunur || document.hidden || s.azalt) { calisiyor = false; return; }
    const dt = Math.min(0.05, (zaman - son) / 1000 || 0.016);
    son = zaman;
    cizer.t += dt;
    o.adim(dt);
    s.ciz();
    requestAnimationFrame(kare);
  };
  const baslat = () => {
    if (calisiyor || !gorunur || document.hidden || s.azalt) return;
    calisiyor = true; son = performance.now();
    requestAnimationFrame(kare);
  };
  new IntersectionObserver((k) => { gorunur = k[0].isIntersecting; kok.dataset.calisiyor = gorunur ? '1' : '0'; baslat(); }).observe(tuval);
  document.addEventListener('visibilitychange', baslat);

  // Sürükleyince döner. Az kıpırdayan dokunuş tıklama sayılır. Dokunmatikte dikey sürükleme sayfayı kaydırır.
  let basX = 0, basY = 0, aci0 = 0, egim0 = 0, basili = false, kaydi = false;
  tuval.addEventListener('pointerdown', (e) => {
    basili = true; kaydi = false; basX = e.clientX; basY = e.clientY; aci0 = kamera.aci; egim0 = kamera.egim;
    tuval.setPointerCapture(e.pointerId);
  });
  tuval.addEventListener('pointermove', (e) => {
    if (!basili) return;
    const dx = e.clientX - basX, dy = e.clientY - basY;
    if (Math.hypot(dx, dy) > 5) kaydi = true;
    if (!kaydi) return;
    kamera.aci = aci0 - dx * 0.008;
    if (e.pointerType === 'mouse') kamera.egim = Math.max(0.18, Math.min(1.5, egim0 + dy * 0.006));
    if (s.azalt || !calisiyor) s.ciz();
  });
  const birak = (e: PointerEvent) => {
    if (!basili) return;
    basili = false;
    if (!kaydi && o.tikla) { const r = tuval.getBoundingClientRect(); o.tikla(e.clientX - r.left, e.clientY - r.top); }
  };
  tuval.addEventListener('pointerup', birak);
  tuval.addEventListener('pointercancel', () => (basili = false));

  let gorunumNo = o.gorunum ?? 0;
  kok.querySelector<HTMLButtonElement>('[data-gorunum]')?.addEventListener('click', (e) => {
    gorunumNo = (gorunumNo + 1) % GORUNUMLER.length;
    kamera.aci = GORUNUMLER[gorunumNo].aci; kamera.egim = GORUNUMLER[gorunumNo].egim;
    (e.currentTarget as HTMLElement).dataset.no = String(gorunumNo);
    s.ciz();
  });

  return s;
}
