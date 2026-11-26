// Takımın İHA'sının üç boyutlu modeli (three.js). Model kodla kurulur, dışarıdan dosya yüklenmez.
// Örnek alınan şey takımın atölye fotoğrafı (src/assets/galeri/arac-tezgah.jpg): kırmızı ve beyaz F450 kolları,
// gümüş Emax motorlar, beyaz 3B baskı taşıyıcıda Raspberry Pi ve üstünde Pixhawk, iki beyaz direk.
// Birim santimetre, z yukarı, x aracın önü. Yerleşim fotoğrafa yakın ama ölçüler yaklaşık.
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type Durum = { secili: string; ustunde: string; hat: string; acik: boolean };
export type Gorsel = { guncelle: () => void; gorunum: () => void };

const KOSE = [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const;
const R45 = Math.SQRT1_2;
const KOK = 4.7, UC = 17.8; // kolun gövdeden başladığı yarıçap ve motor ekseninin kol köküne uzaklığı

/* ── Malzemeler ─────────────────────────────────────────────────────────────── */
const plastik = (renk: number, puruz = 0.55) => new T.MeshStandardMaterial({ color: renk, roughness: puruz, metalness: 0 });
const metal = (renk: number, puruz = 0.28) => new T.MeshStandardMaterial({ color: renk, roughness: puruz, metalness: 1 });
const mat = { kirmizi: 0xb3131b, beyaz: 0xe9e7e1, siyah: 0x141416, pcbYesil: 0x1f6b3a, altin: 0xc9a13a, gumus: 0xc9ccd1, bakir: 0xb86a2e, baski: 0xf0eee8 };

/* ── Küçük yardımcılar ──────────────────────────────────────────────────────── */
const ag = (g: T.BufferGeometry, m: T.Material, x = 0, y = 0, z = 0) => {
  const a = new T.Mesh(g, m);
  a.position.set(x, y, z); a.castShadow = true; a.receiveShadow = true;
  return a;
};
const kutu = (x: number, y: number, z: number, r = 0.12) => new RoundedBoxGeometry(x, y, z, 3, Math.min(r, x / 2.2, y / 2.2, z / 2.2));
/** z eksenli silindir. */
const sil = (r1: number, r2: number, h: number, n = 40) => { const g = new T.CylinderGeometry(r2, r1, h, n); g.rotateX(Math.PI / 2); return g; };
const kablo = (ns: [number, number, number][], renk: number, r = 0.09) => {
  const e = new T.CatmullRomCurve3(ns.map((n) => new T.Vector3(...n)));
  return ag(new T.TubeGeometry(e, Math.max(8, ns.length * 8), r, 6), plastik(renk, 0.6));
};
/** Üstüne yazı ve çizgi çizilmiş etiket: kutuların üst yüzüne yapıştırılır. */
const etiket = (en: number, boy: number, ciz: (c: CanvasRenderingContext2D, w: number, h: number) => void, puruz = 0.5) => {
  const t = document.createElement('canvas');
  t.width = 512; t.height = Math.max(64, Math.round((512 * boy) / en));
  const c = t.getContext('2d')!;
  ciz(c, t.width, t.height);
  const doku = new T.CanvasTexture(t);
  doku.colorSpace = T.SRGBColorSpace; doku.anisotropy = 8;
  const a = new T.Mesh(new T.PlaneGeometry(en, boy), new T.MeshStandardMaterial({ map: doku, roughness: puruz, metalness: 0 }));
  a.receiveShadow = true;
  return a;
};
const yazi = (c: CanvasRenderingContext2D, m: string, x: number, y: number, boyut: number, renk: string, hiza: CanvasTextAlign = 'center') => {
  c.font = `700 ${boyut}px 'Helvetica Neue', Arial, sans-serif`; c.fillStyle = renk; c.textAlign = hiza; c.textBaseline = 'middle'; c.fillText(m, x, y);
};
const sekil = (ns: [number, number][]) => { const s = new T.Shape(); ns.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
const delik = (ns: [number, number][]) => { const p = new T.Path(); ns.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; };
const don = (a: number, x: number, y: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/* ── Parçalar ───────────────────────────────────────────────────────────────── */
/** F450 kolu: üstü üçgen boşluklu tabla, iki yanında kafes duvar, ucunda yuvarlak motor yatağı. Yerel x dışarı doğru. */
function kol(renk: number): T.Group {
  const g = new T.Group(), m = plastik(renk, 0.42);
  const yari = (x: number) => 2.3 - (0.6 * x) / 16.6;
  const dis: [number, number][] = [[0, -2.3], [16.6, -1.7]];
  for (let i = 0; i <= 16; i++) { const a = (-115 + (230 * i) / 16) * (Math.PI / 180); dis.push([UC + 2.1 * Math.cos(a), 2.1 * Math.sin(a)]); }
  dis.push([16.6, 1.7], [0, 2.3]);
  const tabla = sekil(dis);
  for (let i = 0; i < 6; i++) {
    const x0 = 1.3 + i * 2.45, w = yari(x0 + 1) - 0.5, s = i % 2 ? 1 : -1;
    tabla.holes.push(delik([[x0, -w * s], [x0 + 2.05, -w * s], [x0 + 1.02, w * s * 0.75]]));
  }
  const dTabla = new T.Path(); dTabla.absarc(UC, 0, 0.45, 0, Math.PI * 2, true); tabla.holes.push(dTabla);
  g.add(ag(new T.ExtrudeGeometry(tabla, { depth: 0.45, bevelEnabled: false, curveSegments: 20 }), m, 0, 0, -0.45));
  const duvar = sekil([[0, -0.45], [0, -3.1], [2.6, -3.1], [16.6, -1.3], [16.6, -0.45]]);
  for (let i = 0; i < 5; i++) {
    const x0 = 1.1 + i * 2.9, alt = (x: number) => (x < 2.6 ? -3.1 : -3.1 + ((x - 2.6) * 1.8) / 14) + 0.42, s = i % 2;
    duvar.holes.push(delik(s ? [[x0, -0.85], [x0 + 2.4, -0.85], [x0 + 1.2, alt(x0 + 1.2)]] : [[x0, alt(x0)], [x0 + 2.4, alt(x0 + 2.4)], [x0 + 1.2, -0.85]]));
  }
  const dg = new T.ExtrudeGeometry(duvar, { depth: 0.28, bevelEnabled: false });
  dg.rotateX(Math.PI / 2);
  const egim = Math.atan(0.6 / 16.6);
  const sol = ag(dg, m, 0, 2.3, 0); sol.rotation.z = -egim;
  const sag = ag(dg, m, 0, -2.3 + 0.28, 0); sag.rotation.z = egim;
  g.add(sol, sag);
  g.add(ag(kutu(3, 4.5, 0.3, 0.05), m, 1.5, 0, -2.95));
  g.add(ag(sil(1.9, 2.1, 0.9), m, UC, 0, -0.9));
  // Kolu saran iki kablo bağı: fotoğraftaki gibi.
  for (const x of [6.2, 11.4]) { const b = ag(kutu(0.35, yari(x) * 2 + 0.5, 0.12, 0.03), plastik(mat.siyah, 0.7), x, 0, 0.07); g.add(b); }
  return g;
}
/** Plaka: kollara uzanan dört kulak, aralarında içe girinti. dil verilirse x ekseninde kayış yuvalı uzantı eklenir. */
function plaka(kulak: number, genislik: number, girinti: number, dil = 0): T.Group {
  const ns: [number, number][] = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    ns.push(don(a, kulak, -genislik / 2), don(a, kulak, genislik / 2));
    const b = a + Math.PI / 4, eksen = Math.abs(Math.sin(b)) < 0.01;
    if (dil && eksen) ns.push(don(b, girinti + 0.4, -3), don(b, dil, -3), don(b, dil, 3), don(b, girinti + 0.4, 3));
    else ns.push(don(b, girinti, 0));
  }
  const s = sekil(ns);
  if (dil) for (const yon of [1, -1]) for (const x of [dil - 1.6, dil - 3.4]) s.holes.push(delik([[yon * x, -2], [yon * (x + 0.7), -2], [yon * (x + 0.7), 2], [yon * x, 2]]));
  else for (const yon of [1, -1]) s.holes.push(delik([[yon * 3.3, -1.6], [yon * 3.9, -1.6], [yon * 3.9, 1.6], [yon * 3.3, 1.6]]));
  const g = new T.Group();
  g.add(ag(new T.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false }), new T.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.35, metalness: 0.1 })));
  // Kenardaki altın kaplama: biraz büyük ve ince ikinci bir plaka.
  const kenar = ag(new T.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }), metal(mat.altin, 0.35), 0, 0, 0.03);
  kenar.scale.set(1.018, 1.018, 1);
  g.add(kenar);
  return g;
}
function motor(): T.Group {
  const g = new T.Group();
  g.add(ag(sil(1.45, 1.45, 0.3), metal(mat.gumus, 0.3), 0, 0, 0.15));
  g.add(ag(sil(1.16, 1.16, 1.0, 24), metal(mat.bakir, 0.45), 0, 0, 0.8));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.add(ag(new T.BoxGeometry(0.1, 0.34, 1.02), plastik(0x2a2a2c, 0.8), Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0.8)).children.at(-1)!.rotation.z = a; }
  g.add(ag(sil(1.42, 1.42, 1.25), metal(mat.gumus, 0.22), 0, 0, 1.72));
  const bant = etiket(8.9, 0.62, (c, w, h) => { c.fillStyle = '#17171a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) yazi(c, 'EMAX  XA2212  820KV', w * (0.125 + i * 0.25), h / 2, h * 0.55, '#d9d9d9'); });
  const bg = new T.CylinderGeometry(1.43, 1.43, 0.62, 40, 1, true); bg.rotateX(Math.PI / 2);
  const doku = (bant.material as T.MeshStandardMaterial).map!; doku.wrapS = T.RepeatWrapping; doku.repeat.x = -1;
  const b = new T.Mesh(bg, bant.material); b.position.z = 1.75; b.castShadow = true; g.add(b);
  g.add(ag(sil(1.42, 0.95, 0.28), metal(mat.gumus, 0.22), 0, 0, 2.48));
  g.add(ag(sil(0.28, 0.28, 1.2, 16), metal(0x8d9096, 0.3), 0, 0, 3.0));
  return g;
}
/** İki kanatlı pervane ve gümüş burun. ters verilirse ayna görüntüsü (ters dönen pervane). */
function pervane(ters: boolean): T.Group {
  const g = new T.Group(), N = 18, v: number[] = [], ix: number[] = [];
  for (let k = 0; k < 2; k++) for (const yuz of [1, -1]) {
    const bas = v.length / 3;
    for (let i = 0; i <= N; i++) {
      const t = i / N, r = 0.9 + t * 11.8, kiris = 0.55 + 2.5 * Math.pow(Math.sin(Math.PI * (0.1 + 0.86 * t)), 0.9) * (1 - 0.35 * t);
      const a = ((30 - 21 * t) * Math.PI) / 180 * (ters ? -1 : 1), kal = (0.09 * (1 - 0.6 * t)) * yuz;
      for (const u of [-0.5, 0.5]) {
        const y = u * kiris * Math.cos(a) - kal * Math.sin(a), z = u * kiris * Math.sin(a) + kal * Math.cos(a) * (1 - Math.abs(u) * 1.6);
        const [X, Y] = don(k * Math.PI, r, y);
        v.push(X, Y, z);
      }
    }
    for (let i = 0; i < N; i++) { const a = bas + i * 2; if (yuz > 0) ix.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(v, 3)); geo.setIndex(ix); geo.computeVertexNormals();
  g.add(ag(geo, new T.MeshStandardMaterial({ color: 0x18181a, roughness: 0.38, metalness: 0.05, side: T.DoubleSide })));
  g.add(ag(sil(0.95, 0.95, 0.75, 24), plastik(0x18181a, 0.4), 0, 0, 0));
  const burun = new T.LatheGeometry([[0, 2.2], [0.25, 2.1], [0.55, 1.6], [0.78, 0.9], [0.85, 0.2], [0.85, 0]].map(([x, y]) => new T.Vector2(x, y)), 28);
  burun.rotateX(Math.PI / 2);
  g.add(ag(burun, metal(0xd7dade, 0.16), 0, 0, 0.38));
  return g;
}
function hizKontrolcu(): T.Group {
  const g = new T.Group();
  g.add(ag(kutu(5.2, 2.5, 0.85, 0.3), plastik(0x1b3f8f, 0.35)));
  const e = etiket(3.6, 1.9, (c, w, h) => { c.fillStyle = '#f2c62e'; c.fillRect(0, 0, w, h); yazi(c, '30A', w * 0.3, h * 0.5, h * 0.6, '#16161a'); yazi(c, 'BRUSHLESS ESC', w * 0.72, h * 0.34, h * 0.16, '#16161a'); yazi(c, '2-4S LiPo', w * 0.72, h * 0.66, h * 0.16, '#16161a'); });
  e.position.z = -0.435; e.rotation.x = Math.PI; g.add(e);
  [0x141416, 0x141416, 0x141416].forEach((r, i) => g.add(kablo([[2.6, (i - 1) * 0.5, 0], [4.2, (i - 1) * 0.55, 0.15], [6.4, (i - 1) * 0.35, 0.5]], r, 0.13)));
  g.add(kablo([[-2.6, 0.35, 0], [-4, 0.4, 0.1], [-5.3, 0.3, -0.5]], 0xc2181f, 0.15), kablo([[-2.6, -0.35, 0], [-4, -0.4, 0.1], [-5.3, -0.3, -0.5]], 0x141416, 0.15));
  return g;
}
function batarya(): T.Group {
  const g = new T.Group();
  g.add(ag(kutu(10.6, 3.5, 2.6, 0.45), plastik(0x15306b, 0.3)));
  const ciz = (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#f1c40f'; c.fillRect(0, 0, w, h); c.fillStyle = '#12161f'; c.fillRect(0, h * 0.72, w, h * 0.28);
    yazi(c, 'Li-Po 3S', w * 0.05, h * 0.3, h * 0.34, '#12161f', 'left'); yazi(c, '11.1V', w * 0.95, h * 0.3, h * 0.34, '#12161f', 'right');
    yazi(c, 'LITHIUM POLYMER BATTERY', w * 0.5, h * 0.86, h * 0.14, '#f1c40f');
  };
  for (const s of [1, -1]) { const e = etiket(8.4, 2.0, ciz, 0.35); e.position.set(0, s * 1.76, 0); e.rotation.x = (s * -Math.PI) / 2; if (s < 0) e.rotation.z = 0; else e.rotation.y = Math.PI; g.add(e); }
  g.add(ag(kutu(1.2, 3.75, 2.85, 0.1), plastik(0x101012, 0.9), 2.4, 0, 0));
  g.add(kablo([[-5.3, 0.5, 0.5], [-6.6, 0.6, 0.7], [-7.8, 0.4, 0.2]], 0xc2181f, 0.2), kablo([[-5.3, -0.5, 0.5], [-6.6, -0.6, 0.7], [-7.8, -0.4, 0.2]], 0x141416, 0.2));
  g.add(ag(kutu(1.6, 1.6, 0.8, 0.12), plastik(0xf0b90b, 0.4), -8.5, 0, 0.15));
  return g;
}
function gucParcalari(): T.Group {
  const g = new T.Group();
  // Otopilotun güç modülü: batarya hattına giren küçük kart.
  const modul = new T.Group();
  modul.add(ag(kutu(2.6, 1.9, 0.16, 0.04), plastik(0x10203a, 0.5)), ag(kutu(1.1, 1.1, 0.45, 0.08), plastik(0x1a1a1c, 0.5), 0.2, 0, 0.3), ag(kutu(0.9, 1.3, 0.5, 0.06), plastik(mat.beyaz, 0.5), -0.9, 0, 0.3));
  modul.position.set(-8.6, 1.9, 0.3); g.add(modul);
  // UBEC: ısıyla daralan kılıf içinde, ucunda bobin.
  const ubec = new T.Group();
  ubec.add(ag(kutu(4.2, 1.7, 0.9, 0.3), plastik(0x1a1a1c, 0.45)));
  const e = etiket(3, 1.2, (c, w, h) => { c.fillStyle = '#e4e4e4'; c.fillRect(0, 0, w, h); yazi(c, 'UBEC 5V 3A', w / 2, h / 2, h * 0.42, '#16161a'); });
  e.position.z = 0.46; ubec.add(e);
  const bobin = ag(new T.TorusGeometry(0.42, 0.2, 10, 20), metal(mat.bakir, 0.5), 2.5, 0, 0); ubec.add(bobin);
  ubec.position.set(-8.4, -1.6, 0.62); g.add(ubec);
  g.add(kablo([[-6.3, -1.6, 0.6], [-4.5, -2.6, 1.6], [-3.4, -3.2, 3.6], [-3.2, -3, 5.6]], 0xc2181f, 0.1), kablo([[-6.3, -1.4, 0.6], [-4.3, -2.4, 1.6], [-3.2, -3, 3.6], [-3, -2.8, 5.6]], 0x141416, 0.1));
  return g;
}
/** Beyaz 3B baskı taşıyıcı katı: çerçeve ve dört ayak. */
function tasiyici(en: number, boy: number, ayak: number): T.Group {
  const g = new T.Group(), m = plastik(mat.baski, 0.75);
  const s = sekil([[-en / 2, -boy / 2], [en / 2, -boy / 2], [en / 2, boy / 2], [-en / 2, boy / 2]]);
  s.holes.push(delik([[-en / 2 + 0.7, -boy / 2 + 0.7], [-en / 2 + 0.7, boy / 2 - 0.7], [en / 2 - 0.7, boy / 2 - 0.7], [en / 2 - 0.7, -boy / 2 + 0.7]]));
  g.add(ag(new T.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false }), m));
  for (const [a, b] of KOSE) g.add(ag(kutu(0.7, 0.7, ayak, 0.08), m, a * (en / 2 - 0.35), b * (boy / 2 - 0.35), -ayak / 2));
  return g;
}
function gorevBilgisayari(): T.Group {
  const g = new T.Group();
  g.add(tasiyici(9.6, 6.6, 1.8));
  const kart = new T.Group();
  kart.add(ag(kutu(8.5, 5.6, 0.15, 0.05), new T.MeshStandardMaterial({ color: mat.pcbYesil, roughness: 0.45, metalness: 0.1 })));
  const ust = etiket(8.4, 5.5, (c, w, h) => {
    c.fillStyle = '#1f6b3a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#2f8a4f'; c.lineWidth = 2;
    for (let i = 0; i < 26; i++) { c.beginPath(); c.moveTo(w * 0.05 + i * 14, h * 0.3); c.lineTo(w * 0.05 + i * 14 + 60, h * 0.78); c.stroke(); }
    yazi(c, 'Raspberry Pi 4 Model B', w * 0.36, h * 0.9, h * 0.07, '#e8f3ea');
    c.fillStyle = '#c9a13a'; for (const [x, y] of [[0.04, 0.07], [0.72, 0.07], [0.04, 0.93], [0.72, 0.93]]) { c.beginPath(); c.arc(w * x, h * y, h * 0.045, 0, 7); c.fill(); }
  });
  ust.position.z = 0.08; kart.add(ust);
  const g_ = (x: number, y: number, z: number, m: T.Material, px: number, py: number) => kart.add(ag(kutu(x, y, z, 0.06), m, px, py, 0.075 + z / 2));
  const celik = () => metal(0xbfc3c8, 0.3);
  g_(1.75, 1.3, 1.6, celik(), 3.45, 1.85); g_(1.75, 1.3, 1.6, celik(), 3.45, 0.05); g_(2.1, 1.6, 1.35, celik(), 3.3, -1.85);
  g_(1.5, 1.5, 0.24, celik(), -1.3, 0.4); g_(1.2, 1.5, 0.12, plastik(0x101012, 0.4), 0.5, 0.4); g_(1.1, 1.2, 0.2, celik(), -3.2, 1.0);
  g_(5.1, 0.5, 0.25, plastik(0x101012, 0.5), -0.75, 2.45);
  for (let i = 0; i < 20; i++) for (const s of [-1, 1]) kart.add(ag(new T.BoxGeometry(0.07, 0.07, 0.6), metal(mat.altin, 0.3), -3.17 + i * 0.254, 2.45 + s * 0.127, 0.62));
  g_(0.9, 0.75, 0.32, celik(), -3.1, -2.45); g_(0.7, 0.75, 0.3, celik(), -1.5, -2.45); g_(0.7, 0.75, 0.3, celik(), -0.2, -2.45);
  g_(0.3, 2.2, 0.55, plastik(0xe8e8e8, 0.5), 0.9, -1.4);
  kart.position.set(0, 0, 0.6);
  g.add(kart);
  return g;
}
function otopilot(): T.Group {
  const g = new T.Group();
  g.add(tasiyici(9.6, 6.6, 2.2));
  const kasa = new T.Group();
  kasa.add(ag(kutu(8.15, 5.0, 1.55, 0.28), plastik(0x151517, 0.33)));
  const ust = etiket(7.5, 4.4, (c, w, h) => {
    c.fillStyle = '#151517'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e9e9e9';
    for (const y of [0.1, 0.9]) for (let i = 0; i < 6; i++) c.fillRect(w * (0.07 + i * 0.148), h * (y - 0.045), w * 0.105, h * 0.09);
    c.save(); c.translate(w * 0.5, h * 0.5); c.scale(-1, 1);
    c.beginPath(); c.moveTo(-w * 0.34, 0); c.lineTo(-w * 0.2, -h * 0.17); c.lineTo(-w * 0.2, -h * 0.06); c.lineTo(-w * 0.06, -h * 0.06); c.lineTo(-w * 0.06, h * 0.06); c.lineTo(-w * 0.2, h * 0.06); c.lineTo(-w * 0.2, h * 0.17); c.closePath(); c.fill(); c.restore();
    yazi(c, 'PIXHAWK', w * 0.33, h * 0.44, h * 0.19, '#f4f4f4'); yazi(c, '2.4.8', w * 0.33, h * 0.64, h * 0.1, '#bdbdbd');
    c.fillStyle = '#2bd66a'; c.beginPath(); c.arc(w * 0.5, h * 0.74, h * 0.035, 0, 7); c.fill();
  }, 0.4);
  ust.position.z = 0.78; kasa.add(ust);
  kasa.position.z = 0.4 + 0.775;
  g.add(kasa);
  // Hız kontrolcülerine giden sinyal kabloları ve görev bilgisayarına giden seri hat.
  const renkler = [0xf2c62e, 0xc2181f, 0x141416];
  renkler.forEach((r, i) => g.add(kablo([[-4.1, 1.2 - i * 0.22, 1.2], [-5.6, 1.4 - i * 0.2, 0.2], [-5.8, 1.5 - i * 0.2, -2.2], [-5.2, 1.8, -4.6]], r, 0.08)));
  renkler.forEach((r, i) => g.add(kablo([[4.1, -1.2 + i * 0.22, 1.2], [5.6, -1.6 + i * 0.2, 0.4], [5.7, -2 + i * 0.2, -1.2], [4.6, -2.6, -1.9]], r, 0.07)));
  return g;
}
function kamera(): T.Group {
  const g = new T.Group();
  g.add(ag(kutu(4.4, 4.4, 0.4, 0.1), plastik(mat.baski, 0.75), 0, 0, -0.2));
  g.add(ag(kutu(3.8, 3.8, 0.16, 0.05), new T.MeshStandardMaterial({ color: mat.pcbYesil, roughness: 0.45 }), 0, 0, -0.5));
  g.add(ag(sil(1.55, 1.55, 0.9, 40), metal(0x26262a, 0.4), 0, 0, -1.05));
  g.add(ag(sil(1.25, 1.4, 1.5, 40), plastik(0x121214, 0.35), 0, 0, -2.25));
  g.add(ag(sil(1.35, 1.35, 0.25, 40), metal(0x3a3a40, 0.3), 0, 0, -3.1));
  g.add(ag(sil(0.95, 0.95, 0.06, 40), new T.MeshPhysicalMaterial({ color: 0x0a1020, roughness: 0.05, metalness: 0.4, clearcoat: 1 }), 0, 0, -3.24));
  // Görev bilgisayarına giden yassı şerit kablo.
  const yol = new T.CatmullRomCurve3([[-1.6, 0, -0.5], [-3.2, 0, -0.3], [-4.6, 0, 1.6], [-4.9, 0, 4.4], [-4.2, 0, 6.0]].map((n) => new T.Vector3(...(n as [number, number, number]))));
  const v: number[] = [], ix: number[] = [], N = 28;
  for (let i = 0; i <= N; i++) { const p = yol.getPoint(i / N); v.push(p.x, -0.8, p.z, p.x, 0.8, p.z); if (i < N) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(v, 3)); geo.setIndex(ix); geo.computeVertexNormals();
  g.add(ag(geo, new T.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.6, side: T.DoubleSide })));
  return g;
}
/** Beyaz 3B baskı direk: fotoğraftaki gibi ince gövde ve üstünde yuvarlak tabla. */
function direk(boy: number): T.Group {
  const g = new T.Group(), m = plastik(mat.baski, 0.75);
  g.add(ag(kutu(2.6, 2.2, 0.5, 0.1), m, 0, 0, 0.25), ag(sil(0.55, 0.42, boy, 20), m, 0, 0, boy / 2 + 0.4), ag(sil(2.9, 2.9, 0.3, 48), m, 0, 0, boy + 0.5));
  return g;
}
function gps(): T.Group {
  const g = direk(13.5);
  g.add(ag(sil(2.7, 2.6, 1.3, 48), plastik(0x151517, 0.35), 0, 0, 14.75));
  const e = etiket(3.6, 3.6, (c, w, h) => { c.fillStyle = '#151517'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e9e9e9'; c.lineWidth = 8; c.beginPath(); c.arc(w / 2, h / 2, w * 0.36, 0, 7); c.stroke(); yazi(c, 'GPS', w / 2, h * 0.44, h * 0.2, '#f4f4f4'); yazi(c, 'M8N', w / 2, h * 0.64, h * 0.12, '#bdbdbd'); c.fillStyle = '#f4f4f4'; c.beginPath(); c.moveTo(w * 0.86, h * 0.5); c.lineTo(w * 0.78, h * 0.45); c.lineTo(w * 0.78, h * 0.55); c.fill(); }, 0.35);
  e.position.z = 15.41; g.add(e);
  g.add(kablo([[-2.5, 0, 14.6], [-2.2, 0, 12], [-1, 0, 6], [-0.9, -1.2, 1]], 0x141416, 0.11));
  return g;
}
function uwb(): T.Group {
  const g = direk(9);
  const kart = new T.Group();
  kart.add(ag(kutu(3.6, 2.4, 0.14, 0.04), new T.MeshStandardMaterial({ color: 0x14345e, roughness: 0.45 })));
  kart.add(ag(kutu(1.9, 1.3, 0.3, 0.05), metal(0xbfc3c8, 0.3), -0.5, 0, 0.2));
  const anten = etiket(1.1, 2.1, (c, w, h) => { c.fillStyle = '#14345e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9a13a'; c.lineWidth = 26; c.beginPath(); for (let i = 0; i < 5; i++) { c.lineTo(w * 0.2, h * (0.1 + i * 0.2)); c.lineTo(w * 0.8, h * (0.1 + i * 0.2)); c.lineTo(w * 0.8, h * (0.2 + i * 0.2)); c.lineTo(w * 0.2, h * (0.2 + i * 0.2)); } c.stroke(); });
  anten.position.set(1.2, 0, 0.08); kart.add(anten);
  kart.position.z = 9.75; g.add(kart);
  return g;
}
function wifi(): T.Group {
  const g = new T.Group();
  g.add(ag(kutu(1.3, 1.9, 0.75, 0.12), plastik(0x151517, 0.4), 0.65, 0, 0), ag(kutu(1.0, 1.2, 0.45, 0.03), metal(0xbfc3c8, 0.3), -0.4, 0, 0));
  g.add(ag(sil(0.42, 0.42, 1.1, 20), plastik(0x151517, 0.4), 1.2, 0, 0.6), ag(sil(0.4, 0.3, 10.5, 20), plastik(0x151517, 0.45), 1.2, 0, 6.3));
  return g;
}
function alici(): T.Group {
  const g = new T.Group();
  g.add(ag(kutu(4.7, 3.3, 1.5, 0.2), plastik(0x151517, 0.35)));
  const e = etiket(3.4, 1.5, (c, w, h) => { c.fillStyle = '#1e8f4a'; c.fillRect(0, 0, w, h); yazi(c, 'FS-iA10B', w * 0.5, h * 0.36, h * 0.36, '#f4f4f4'); yazi(c, '2.4GHz 10CH RECEIVER', w * 0.5, h * 0.74, h * 0.16, '#f4f4f4'); }, 0.4);
  e.position.set(-0.3, 0, 0.76); g.add(e);
  g.add(ag(kutu(0.6, 2.9, 0.95, 0.04), plastik(0x101012, 0.5), 2.1, 0, 0.1));
  for (const s of [1, -1]) { g.add(kablo([[-2.3, s * 0.9, 0.3], [-1, s * 3.4, 1.4], [1.5, s * 5.6, 4.2], [2.6, s * 6.2, 7.4]], 0x1c1c1f, 0.07)); g.add(ag(sil(0.1, 0.1, 2.2, 8), metal(0xbfc3c8, 0.3), 2.75, s * 6.28, 8.4)); }
  return g;
}

const koy = (g: T.Group, x: number, y: number, z: number) => { g.position.set(x, y, z); return g; };

/* ── Araç: parçalar, patlatma yönleri, bağlantı noktaları ───────────────────── */
type Parca = { g: T.Group; ac: T.Vector3; bag: T.Vector3[]; etiket: T.Vector3 };
function aracKur(): Record<string, Parca> {
  const P: Record<string, Parca> = {};
  const ekle = (ad: string, ac: [number, number, number], et: [number, number, number], bag: [number, number, number][]) => {
    const g = new T.Group(); g.name = ad;
    P[ad] = { g, ac: new T.Vector3(...ac), bag: bag.map((b) => new T.Vector3(...b)), etiket: new T.Vector3(...et) };
    return g;
  };
  const uc = (a: number, b: number, r: number): [number, number] => [a * r * R45, b * r * R45];

  const govde = ekle('govde', [0, 0, 0], [0, 0, 3.7], [[0, 0, 0.3]]);
  govde.add(plaka(8.0, 4.9, 5.7, 10.4));
  const ustPlaka = plaka(7.3, 4.7, 5.0); ustPlaka.position.z = 3.34; govde.add(ustPlaka);
  KOSE.forEach(([a, b]) => {
    const k = kol(a > 0 ? mat.kirmizi : mat.beyaz);
    k.position.set(...uc(a, b, KOK), 3.34); k.rotation.z = Math.atan2(b, a); govde.add(k);
    // Uzun beyaz iniş ayağı: kameranın yere değmemesi için.
    const ayak = new T.Group();
    ayak.add(ag(sil(0.55, 0.9, 9.5, 16), plastik(mat.baski, 0.75), 0, 0, -4.75), ag(sil(1.5, 1.5, 0.45, 24), plastik(mat.baski, 0.75), 0, 0, -9.6));
    ayak.position.set(...uc(a, b, KOK + UC - 2.6), 1.6); govde.add(ayak);
  });

  ekle('batarya', [0, -24, 0], [0, 0, 3.6], [[0, 0, 1.7]]).add(koy(batarya(), 0.6, 0, 1.6));
  ekle('guc', [-13, 0, 0], [-8.5, 0, 1.9], [[-8.5, 0, 0.7]]).add(gucParcalari());

  const esc = ekle('esc', [0, 0, -7], [...uc(1, 1, KOK + 8.5), 0.4] as [number, number, number], KOSE.map(([a, b]) => [...uc(a, b, KOK + 8.5), 1.6] as [number, number, number]));
  const mot = ekle('motor', [0, 0, 7], [...uc(1, 1, KOK + UC), 7.6] as [number, number, number], KOSE.map(([a, b]) => [...uc(a, b, KOK + UC), 4.8] as [number, number, number]));
  const per = ekle('pervane', [0, 0, 15], [...uc(1, -1, KOK + UC), 9.2] as [number, number, number], [[...uc(1, 1, KOK + UC), 6.9] as [number, number, number]]);
  KOSE.forEach(([a, b], i) => {
    const e = hizKontrolcu(); e.position.set(...uc(a, b, KOK + 8.5), 1.75); e.rotation.z = Math.atan2(b, a); esc.add(e);
    const m = motor(); m.position.set(...uc(a, b, KOK + UC), 3.34); mot.add(m);
    const p = pervane(i % 2 === 1); p.position.set(...uc(a, b, KOK + UC), 6.75); p.rotation.z = 0.5 + i * 1.1; per.add(p);
  });

  ekle('alici', [13, 0, 1], [3.6, 0, 5.4], [[3.6, 0, 4.2]]).add(koy(alici(), 3.6, 0, 4.26));
  ekle('bilgisayar', [0, 0, 6], [0, 0, 8.4], [[0, 0, 6.6]]).add(koy(gorevBilgisayari(), 0, 0, 5.3));
  ekle('otopilot', [0, 0, 15], [0, 0, 11.2], [[0, 0, 9.2]]).add(koy(otopilot(), 0, 0, 7.9));
  ekle('wifi', [0, -11, 8], [5.7, -1.9, 17.4], [[4.6, -1.9, 6.6]]).add(koy(wifi(), 4.5, -1.85, 6.6));
  ekle('gps', [5, 12, 9], [2.4, 6.6, 19.6], [[2.4, 6.6, 18.2]]).add(koy(gps(), 2.4, 6.6, 3.5));
  ekle('uwb', [-7, 13, 3], [-3.4, 6.6, 14.6], [[-3.4, 6.6, 13.2]]).add(koy(uwb(), -3.4, 6.6, 3.5));
  ekle('kamera', [9, 0, -3], [6.4, 0, -4.6], [[6.4, 0, -0.6]]).add(koy(kamera(), 6.4, 0, 0));
  return P;
}

const HATLAR: Record<string, [string, string][]> = {
  guc: [['batarya', 'govde'], ['govde', 'esc'], ['esc', 'motor'], ['batarya', 'guc'], ['guc', 'bilgisayar'], ['guc', 'otopilot']],
  veri: [['gps', 'otopilot'], ['uwb', 'otopilot'], ['kamera', 'bilgisayar'], ['bilgisayar', 'otopilot'], ['bilgisayar', 'wifi']],
  sinyal: [['alici', 'otopilot'], ['otopilot', 'esc']],
};
const HAT_RENK: Record<string, number> = { guc: 0xff5a4d, veri: 0x4fa3ff, sinyal: 0x5fd08f };
const GORUNUM = [[0.72, 0.42], [-0.6, 0.12], [1.57, 1.35]] as const;

/** Sahneyi kurar. WebGL açılamazsa null döner. */
export function kur(kok: HTMLElement, durum: Durum, adlar: Record<string, string>, sec: (ad: string) => void, ustune: (ad: string) => void): Gorsel | null {
  const tuval = kok.querySelector<HTMLCanvasElement>('canvas'), etiketYaz = kok.querySelector<HTMLElement>('[data-etiket]');
  if (!tuval) return null;
  let cizer: T.WebGLRenderer;
  try { cizer = new T.WebGLRenderer({ canvas: tuval, antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return null; }
  cizer.outputColorSpace = T.SRGBColorSpace; cizer.toneMapping = T.ACESFilmicToneMapping; cizer.toneMappingExposure = 1.05;
  cizer.shadowMap.enabled = true; cizer.shadowMap.type = T.PCFSoftShadowMap;
  const sahne = new T.Scene();
  const pmrem = new T.PMREMGenerator(cizer);
  sahne.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; sahne.environmentIntensity = 0.75;
  const kamera = new T.PerspectiveCamera(30, 1, 5, 800); kamera.up.set(0, 0, 1);
  const gunes = new T.DirectionalLight(0xffffff, 2.4);
  gunes.position.set(28, -34, 70); gunes.castShadow = true; gunes.shadow.mapSize.set(2048, 2048); gunes.shadow.bias = -0.0004; gunes.shadow.normalBias = 0.05;
  Object.assign(gunes.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 10, far: 160 });
  sahne.add(gunes, new T.HemisphereLight(0xffffff, 0x30343c, 0.5));
  const zemin = new T.Mesh(new T.CircleGeometry(70, 64), new T.ShadowMaterial({ opacity: 0.32 }));
  zemin.position.z = -8.25; zemin.receiveShadow = true; sahne.add(zemin);

  const P = aracKur(), kokGrup = new T.Group();
  for (const p of Object.values(P)) kokGrup.add(p.g);
  sahne.add(kokGrup);
  // Her parçanın malzemeleri kendine ait: seçilince yalnızca o parça parlar.
  const malzemeler: Record<string, T.MeshStandardMaterial[]> = {};
  for (const [ad, p] of Object.entries(P)) {
    const l = new Set<T.MeshStandardMaterial>();
    p.g.traverse((o) => { if (o instanceof T.Mesh) { o.userData.parca = ad; if ((o.material as T.MeshStandardMaterial).emissive) l.add(o.material as T.MeshStandardMaterial); } });
    malzemeler[ad] = [...l];
  }
  const hatGrup = new T.Group(); sahne.add(hatGrup);
  let toplar: { a: T.Vector3; b: T.Vector3; m: T.Mesh }[] = [], cizilenHat = '', cizilenA = -1;

  const azaltSorgu = matchMedia('(prefers-reduced-motion: reduce)');
  let aci = GORUNUM[0][0], egim = GORUNUM[0][1], a = 0, gorunumNo = 0, dokundu = false, gorunur = false, calisiyor = false, kirli = true, son = 0, saat = 0;
  const vurgu = new T.Color(0xe8c468), siyah = new T.Color(0x000000);

  const boyutla = () => {
    const r = tuval.getBoundingClientRect();
    if (r.width < 2) return;
    cizer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); cizer.setSize(r.width, r.height, false);
    kamera.aspect = r.width / r.height; kamera.updateProjectionMatrix(); kirli = true; kare(performance.now(), true);
  };
  const yer = (ad: string, p: T.Vector3) => p.clone().addScaledVector(P[ad].ac, a);
  const hatCiz = () => {
    hatGrup.clear(); toplar = []; cizilenHat = durum.hat; cizilenA = a;
    if (!durum.hat) return;
    const m = new T.MeshBasicMaterial({ color: HAT_RENK[durum.hat], depthTest: false, transparent: true, opacity: 0.95 });
    for (const [p, q] of HATLAR[durum.hat]) {
      const A = P[p].bag, B = P[q].bag;
      const cift = A.length === B.length ? A.map((x, i) => [x, B[i]] as const) : A.length === 1 ? B.map((x) => [A[0], x] as const) : A.map((x) => [x, B[0]] as const);
      for (const [u, v] of cift) {
        const u2 = yer(p, u), v2 = yer(q, v), tup = new T.Mesh(new T.TubeGeometry(new T.LineCurve3(u2, v2), 1, 0.16, 8), m);
        tup.renderOrder = 10; hatGrup.add(tup);
        const top = new T.Mesh(new T.SphereGeometry(0.42, 12, 12), m); top.renderOrder = 11; hatGrup.add(top);
        toplar.push({ a: u2, b: v2, m: top });
      }
    }
  };
  const ciz = () => {
    for (const [ad, p] of Object.entries(P)) {
      p.g.position.copy(p.ac).multiplyScalar(a);
      const sec_ = ad === durum.secili, ust = ad === durum.ustunde, hatta = !!durum.hat && HATLAR[durum.hat].some((c) => c.includes(ad));
      for (const m of malzemeler[ad]) { m.emissive.copy(sec_ || ust || hatta ? vurgu : siyah); m.emissiveIntensity = sec_ ? 0.42 : ust ? 0.2 : hatta ? 0.07 : 0; }
    }
    if (durum.hat !== cizilenHat || (durum.hat && Math.abs(a - cizilenA) > 1e-4)) hatCiz();
    for (const [i, t] of toplar.entries()) t.m.position.lerpVectors(t.a, t.b, azaltSorgu.matches ? 0.5 : (saat * 0.7 + i * 0.13) % 1);
    const uzak = 92 + a * 30, hz = 3.5 + a * 4.5, ce = Math.cos(egim);
    kamera.position.set(uzak * ce * Math.sin(aci), -uzak * ce * Math.cos(aci), hz + uzak * Math.sin(egim));
    kamera.lookAt(0, 0, hz);
    cizer.render(sahne, kamera);
    kok.dataset.ucgen = String(cizer.info.render.triangles);
    const e = durum.secili || durum.ustunde;
    if (etiketYaz) {
      if (e && P[e] && adlar[e]) {
        const n = yer(e, P[e].etiket).project(kamera), r = tuval.getBoundingClientRect();
        etiketYaz.textContent = adlar[e]; etiketYaz.hidden = false;
        etiketYaz.style.left = `${Math.max(8, Math.min(92, (n.x * 0.5 + 0.5) * 100))}%`; etiketYaz.style.top = `${Math.max(24, (-n.y * 0.5 + 0.5) * r.height)}px`;
      } else etiketYaz.hidden = true;
    }
  };
  function kare(z: number, tek = false) {
    const dt = Math.min(0.05, (z - son) / 1000 || 0.016); son = z;
    if (!tek) {
      saat += dt;
      const hedef = durum.acik ? 1 : 0;
      if (a !== hedef) { a += (hedef - a) * Math.min(1, dt * 5); if (Math.abs(hedef - a) < 0.002) a = hedef; kirli = true; }
      if (!dokundu) { aci += dt * 0.14; kirli = true; }
      if (durum.hat) kirli = true;
    }
    if (kirli) { kirli = false; ciz(); }
    if (tek) return;
    if (!gorunur || document.hidden || azaltSorgu.matches) { calisiyor = false; return; }
    requestAnimationFrame((t) => kare(t));
  }
  const baslat = () => { if (calisiyor || !gorunur || document.hidden || azaltSorgu.matches) return; calisiyor = true; son = performance.now(); requestAnimationFrame((t) => kare(t)); };
  new ResizeObserver(boyutla).observe(tuval);
  new IntersectionObserver((k) => { gorunur = k[0].isIntersecting; baslat(); }).observe(tuval);
  document.addEventListener('visibilitychange', baslat);
  azaltSorgu.addEventListener('change', baslat);

  // Sürükleyince döner (dokunmatikte yalnız yatay, dikey sürükleme sayfayı kaydırır). Kıpırdamayan dokunuş tıklamadır.
  const isin = new T.Raycaster();
  const bul = (e: PointerEvent): string => {
    const r = tuval.getBoundingClientRect();
    isin.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), kamera);
    return (isin.intersectObject(kokGrup, true)[0]?.object.userData.parca as string) ?? '';
  };
  let basX = 0, basY = 0, aci0 = 0, egim0 = 0, basili = false, kaydi = false;
  tuval.addEventListener('pointerdown', (e) => { basili = true; kaydi = false; dokundu = true; basX = e.clientX; basY = e.clientY; aci0 = aci; egim0 = egim; tuval.setPointerCapture(e.pointerId); });
  tuval.addEventListener('pointermove', (e) => {
    if (!basili) { if (e.pointerType === 'mouse') { const y = bul(e); if (y !== durum.ustunde) { ustune(y); tuval.style.cursor = y ? 'pointer' : ''; } } return; }
    const dx = e.clientX - basX, dy = e.clientY - basY;
    if (Math.hypot(dx, dy) > 5) kaydi = true;
    if (!kaydi) return;
    aci = aci0 - dx * 0.008;
    if (e.pointerType === 'mouse') egim = Math.max(-0.35, Math.min(1.45, egim0 + dy * 0.006));
    kirli = true; if (!calisiyor) kare(performance.now(), true);
  });
  tuval.addEventListener('pointerup', (e) => { if (!basili) return; basili = false; if (!kaydi) sec(bul(e)); });
  tuval.addEventListener('pointercancel', () => (basili = false));
  tuval.addEventListener('pointerleave', () => { if (durum.ustunde) ustune(''); });

  boyutla();
  kok.dataset.hazir = '1';
  return {
    guncelle: () => { dokundu = true; if (azaltSorgu.matches) a = durum.acik ? 1 : 0; kirli = true; if (!calisiyor) kare(performance.now(), true); },
    gorunum: () => { gorunumNo = (gorunumNo + 1) % GORUNUM.length; [aci, egim] = GORUNUM[gorunumNo]; dokundu = true; kirli = true; if (!calisiyor) kare(performance.now(), true); },
  };
}
