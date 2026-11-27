// Takım polo tişörtünün üç boyutlu modeli (three.js): siyah polo yaka, göğüste Matris logosu ve sponsor yerleri.
// Model kodla kurulur, yalnızca Matris logosu dosyadan (tisort-logo.png) gelir. Dört paket, dört yer:
//   0 ana sponsor: göğüs (sağ göğüs, sol göğüste Matris logosu var)   1 altın: iki kol
//   2 gümüş: sırtın üstü (iki büyük panel)   3 destekçi: sırtın altı (dört küçük panel)
// Sırtın en üstünde okulun adı yazar. Ön yüzde yaka, düğmeli pat ve logo, arka yüzde yalnızca baskı vardır.
// Sürükleyince döner, panele tıklayınca paket seçilir, paket seçilince tişört o yüzünü çevirir.
// Birim yaklaşık yarım metre, y yukarı, +z tişörtün önü.
import * as T from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type Tisort = { sec: (no: number) => void; don: (aci: number) => void };

/* ── Gövde: yükseklik boyunca yarı genişlik (x) ve yarı derinlik (z) ── */
const PROFIL = new T.CatmullRomCurve3([
  new T.Vector3(0.88, 0, 0.5), new T.Vector3(0.86, 0.5, 0.5), new T.Vector3(0.89, 1.1, 0.52), new T.Vector3(0.94, 1.55, 0.5),
  new T.Vector3(0.95, 1.76, 0.43), new T.Vector3(0.76, 1.93, 0.33), new T.Vector3(0.48, 2.04, 0.27), new T.Vector3(0.33, 2.08, 0.24),
], false, 'catmullrom', 0.5).getPoints(80);
const kesit = (y: number): [number, number] => {
  for (let i = 1; i < PROFIL.length; i++) {
    const a = PROFIL[i - 1], b = PROFIL[i];
    if (y <= b.y || i === PROFIL.length - 1) { const k = Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y || 1))); return [a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k]; }
  }
  return [0.88, 0.5];
};
/** Kumaşın kıvrımları: eteğe doğru artar. Gövde ve üstüne oturan baskılar aynı işlevi kullanır. */
const kirisik = (a: number, y: number) => {
  const agirlik = 0.005 + 0.012 * Math.max(0, 1 - y / 1.1);
  return agirlik * (0.6 * Math.sin(6 * y + 2.2 * Math.sin(2 * a + 0.7)) + 0.4 * Math.sin(13 * y - 3 * a + 1.3));
};
/** Gövde yüzeyinin (x, y) noktasındaki derinliği. yon: 1 ön, -1 sırt. */
const yuzey = (x: number, y: number, yon: number) => {
  const [rx, rz] = kesit(y), s = Math.max(-1, Math.min(1, x / rx)), a = yon > 0 ? Math.asin(s) : Math.PI - Math.asin(s);
  return rz * Math.sqrt(1 - s * s) * (1 + kirisik(a, y));
};
const govdeGeo = () => {
  const N = 72, yer: number[] = [], uv: number[] = [], sira: number[] = [];
  PROFIL.forEach((p, i) => {
    for (let j = 0; j <= N; j++) { const a = (j / N) * Math.PI * 2, f = 1 + kirisik(a, p.y); yer.push(p.x * Math.sin(a) * f, p.y, p.z * Math.cos(a) * f); uv.push(j / N, i / (PROFIL.length - 1)); }
  });
  for (let i = 0; i < PROFIL.length - 1; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + N + 1; sira.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(yer, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(sira); g.computeVertexNormals();
  return g;
};

/* ── Dokular ── */
const doku = (t: HTMLCanvasElement) => { const d = new T.CanvasTexture(t); d.colorSpace = T.SRGBColorSpace; d.anisotropy = 8; return d; };
const tuvalYap = (w: number, h: number) => { const t = document.createElement('canvas'); t.width = w; t.height = h; return [t, t.getContext('2d')!] as const; };
/** Polo kumaşının piké örgüsü: küçük petek desen, kabartma olarak kullanılır. */
const orguDoku = (tekrar: [number, number]) => {
  const [t, c] = tuvalYap(64, 64);
  c.fillStyle = '#808080'; c.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const ox = (y % 2) * 4; c.fillStyle = '#d8d8d8'; c.beginPath(); c.ellipse(x * 8 + 4 + ox, y * 8 + 4, 2.6, 3.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a3a3a'; c.fillRect(x * 8 + ox, y * 8 + 7, 8, 1);
  }
  const d = new T.CanvasTexture(t); d.wrapS = d.wrapT = T.RepeatWrapping; d.repeat.set(...tekrar); d.anisotropy = 8;
  return d;
};
/** Sponsor yeri: ince kesikli altın çerçeve ve paket adı. Logo geldiğinde yerine konur. */
const panelDoku = (yazi: string, oran: number) => {
  const [t, c] = tuvalYap(512, Math.round(512 / oran)), w = t.width, h = t.height, p = 12;
  c.fillStyle = 'rgba(232,196,104,0.16)'; c.strokeStyle = '#e8c468'; c.lineWidth = 7; c.setLineDash([26, 18]);
  c.beginPath(); c.roundRect(p, p, w - 2 * p, h - 2 * p, 22); c.fill(); c.stroke();
  c.fillStyle = '#f6dd9a'; c.textAlign = 'center'; c.textBaseline = 'middle';
  let boy = Math.min(h * 0.4, 92); c.font = `700 ${boy}px "Inter Tight", system-ui, sans-serif`;
  while (c.measureText(yazi).width > w - 80 && boy > 18) { boy -= 4; c.font = `700 ${boy}px "Inter Tight", system-ui, sans-serif`; }
  c.fillText(yazi, w / 2, h / 2 + 2);
  return doku(t);
};
/** Sırtın üstündeki okul adı: beyaz baskı, iki satır. */
const baskiDoku = (yazi: string, oran: number) => {
  const [t, c] = tuvalYap(1024, Math.round(1024 / oran)), w = t.width, h = t.height;
  const kelimeler = yazi.split(' '), a = Math.ceil(kelimeler.length / 2), satirlar = [kelimeler.slice(0, a).join(' '), kelimeler.slice(a).join(' ')].filter(Boolean);
  c.fillStyle = '#ecebe6'; c.textAlign = 'center'; c.textBaseline = 'middle';
  let boy = h / (satirlar.length + 0.5); c.font = `700 ${boy}px "Inter Tight", system-ui, sans-serif`;
  while (Math.max(...satirlar.map((s) => c.measureText(s).width)) > w - 40 && boy > 20) { boy -= 4; c.font = `700 ${boy}px "Inter Tight", system-ui, sans-serif`; }
  satirlar.forEach((s, i) => c.fillText(s, w / 2, h / 2 + (i - (satirlar.length - 1) / 2) * boy * 1.08));
  return doku(t);
};
/** Kol arması: Türk bayrağı. */
const bayrakDoku = () => {
  const [t, c] = tuvalYap(300, 200);
  c.fillStyle = '#e30a17'; c.fillRect(0, 0, 300, 200);
  c.fillStyle = '#fff'; c.beginPath(); c.arc(112, 100, 50, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e30a17'; c.beginPath(); c.arc(126, 100, 40, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 24, a = -Math.PI / 2 + (i * Math.PI) / 5; c.lineTo(168 + r * Math.cos(a), 100 + r * Math.sin(a)); }
  c.closePath(); c.fill();
  return doku(t);
};

export function kur(kok: HTMLElement, adlar: string[], secildi: (no: number) => void): Tisort | null {
  const tuval = kok.querySelector<HTMLCanvasElement>('canvas');
  if (!tuval) return null;
  let cizer: T.WebGLRenderer;
  try { cizer = new T.WebGLRenderer({ canvas: tuval, antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return null; }
  cizer.outputColorSpace = T.SRGBColorSpace; cizer.toneMapping = T.ACESFilmicToneMapping; cizer.toneMappingExposure = 1.05;
  const sahne = new T.Scene();
  sahne.environment = new T.PMREMGenerator(cizer).fromScene(new RoomEnvironment(), 0.04).texture; sahne.environmentIntensity = 0.5;
  const kamera = new T.PerspectiveCamera(28, 1, 0.5, 40);
  const anahtar = new T.DirectionalLight(0xffffff, 2.0); anahtar.position.set(2.5, 4, 5);
  const arka = new T.DirectionalLight(0xffffff, 1.8); arka.position.set(-2.5, 3.5, -5);
  const yanSag = new T.DirectionalLight(0xdde6ff, 1.7); yanSag.position.set(6, 2, 0.5);
  const yanSol = new T.DirectionalLight(0xfff0d6, 1.7); yanSol.position.set(-6, 2, -0.5);
  sahne.add(anahtar, arka, yanSag, yanSol, new T.HemisphereLight(0xffffff, 0x2a2c33, 0.7));

  const etiket = (() => { try { return JSON.parse(kok.dataset.etiketler ?? '') as string[]; } catch { return ['Ön', 'Arka', 'Yan']; } })();
  const okulAdi = kok.dataset.baski ?? 'BURSA TEKNİK ÜNİVERSİTESİ';

  /* ── Malzemeler: siyah piké polo kumaşı, kenarlarda hafif parlama (sheen) ── */
  const orgu = orguDoku([30, 24]), orguKol = orguDoku([14, 5]);
  const kumasYap = (b: T.Texture) => new T.MeshPhysicalMaterial({ color: 0x0c0d0f, roughness: 0.92, metalness: 0, bumpMap: b, bumpScale: 0.45, sheen: 0.8, sheenColor: new T.Color(0x3a3e47), sheenRoughness: 0.6 });
  const kumas = kumasYap(orgu), kumasKol = kumasYap(orguKol);
  const ic = new T.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 1, side: T.BackSide });
  const yaka = new T.MeshPhysicalMaterial({ color: 0x121316, roughness: 0.85, sheen: 0.8, sheenColor: new T.Color(0x454a54), sheenRoughness: 0.5, side: T.DoubleSide });
  const dugme = new T.MeshStandardMaterial({ color: 0x35373d, roughness: 0.3, metalness: 0.4 });

  const tisort = new T.Group();
  const gg = govdeGeo();
  tisort.add(new T.Mesh(gg, kumas), new T.Mesh(gg, ic));

  /* ── Polo yaka: önü açık bir bant ve iki yaka ucu ── */
  const yakaBant = new T.Mesh(new T.CylinderGeometry(1, 1.04, 0.13, 56, 1, true, 0.42, Math.PI * 2 - 0.84), yaka);
  yakaBant.scale.set(0.37, 1, 0.285); yakaBant.position.set(0, 2.13, -0.012); yakaBant.rotation.x = -0.1;
  tisort.add(yakaBant);
  for (const s of [1, -1]) {
    const v = new Float32Array([s * 0.1, 2.2, 0.29, s * 0.3, 2.18, 0.2, s * 0.09, 1.94, 0.36, s * 0.3, 2.18, 0.2, s * 0.22, 1.96, 0.325, s * 0.09, 1.94, 0.36]);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(v, 3)); g.computeVertexNormals();
    tisort.add(new T.Mesh(g, yaka));
  }
  // Düğmeli pat: önde, boyundan göğse kadar
  const pat = new T.PlaneGeometry(0.11, 0.5, 2, 12), pk = pat.attributes.position;
  for (let i = 0; i < pk.count; i++) { const x = pk.getX(i), y = 1.74 + pk.getY(i); pk.setXYZ(i, x, y, yuzey(x, y, 1) + 0.012); }
  tisort.add(new T.Mesh(pat, yaka));
  for (const y of [1.92, 1.78, 1.64]) {
    const d = new T.Mesh(new T.CylinderGeometry(0.028, 0.028, 0.014, 20), dugme); d.rotation.x = Math.PI / 2; d.position.set(0, y, yuzey(0, y, 1) + 0.024); tisort.add(d);
  }
  // Etek bandı
  const etek = new T.Mesh(new T.TorusGeometry(1, 0.011, 8, 72), yaka);
  etek.rotation.x = Math.PI / 2; etek.scale.set(0.88, 0.5, 1); etek.position.y = 0.01; tisort.add(etek);

  /* ── Paneller ── */
  const paneller: { ag: T.Mesh; no: number }[] = [];
  const panelMalz = (no: number, oran: number) => new T.MeshBasicMaterial({ map: panelDoku(adlar[no] ?? '', oran), transparent: true, side: T.DoubleSide, toneMapped: false, depthWrite: false });
  const baskiMalz = (map: T.Texture | null) => new T.MeshBasicMaterial({ map, transparent: true, side: T.DoubleSide, toneMapped: false, depthWrite: false });
  /** Gövdeye oturan düz baskı. yon: 1 ön, -1 sırt. */
  const govdeyeKoy = (m: T.Material, cx: number, cy: number, en: number, boy: number, yon: number) => {
    const pg = new T.PlaneGeometry(en, boy, 18, 8), k = pg.attributes.position;
    for (let i = 0; i < k.count; i++) { const x = cx + yon * k.getX(i), y = cy + k.getY(i); k.setXYZ(i, x, y, yon * (yuzey(x, y, yon) + 0.02)); }
    const p = new T.Mesh(pg, m); p.renderOrder = 2; tisort.add(p); return p;
  };
  const govdePanel = (no: number, cx: number, cy: number, en: number, boy: number, yon: number) => { const p = govdeyeKoy(panelMalz(no, en / boy), cx, cy, en, boy, yon); paneller.push({ ag: p, no }); };

  let kare = 0, son = 0;
  // Ön: sağ göğüste ana sponsor, sol göğüste Matris logosu (tişörtü giyenin sağ ve solu)
  govdePanel(0, -0.43, 1.5, 0.5, 0.24, 1);
  const logoMalz = baskiMalz(null);
  new T.TextureLoader().load('/tisort-logo.png', (d) => { d.colorSpace = T.SRGBColorSpace; d.anisotropy = 8; logoMalz.map = d; logoMalz.needsUpdate = true; if (!kare) ciz(performance.now()); });
  govdeyeKoy(logoMalz, 0.43, 1.5, 0.4, 0.4 * (177 / 520) * 1.1, 1);
  // Arka: en üstte okul adı, altında gümüş (iki büyük panel), onun altında destekçi (dört panel)
  govdeyeKoy(baskiMalz(baskiDoku(okulAdi, 3.4)), 0, 1.7, 0.96, 0.96 / 3.4, -1);
  for (const x of [-0.34, 0.34]) govdePanel(2, x, 1.26, 0.56, 0.27, -1);
  for (const x of [-0.585, -0.195, 0.195, 0.585]) govdePanel(3, x, 0.76, 0.34, 0.18, -1);

  /* ── Kollar: kısa, hafif sarkık, ağzı bantlı ── */
  const KOL_R = 0.3, KOL_UC = 0.255, KOL_BOY = 0.78, KOL_ACI = 0.66, KOL_Z = 0.86;
  const kolR = (KOL_R + KOL_UC) / 2;
  /** Kola sarılan baskı. faz: ön tarafa kaydırma (radyan), y0: kol ekseninde yer. */
  const kolaSar = (kol: T.Group, s: number, m: T.Material, en: number, boy: number, faz: number, y0: number) => {
    const pg = new T.PlaneGeometry(en, boy, 14, 2), k = pg.attributes.position, r = kolR + 0.006;
    for (let i = 0; i < k.count; i++) { const a = k.getX(i) / r - s * faz; k.setXYZ(i, s * r * Math.cos(a), y0 + k.getY(i), -s * r * Math.sin(a)); }
    const p = new T.Mesh(pg, m); p.renderOrder = 2; kol.add(p); return p;
  };
  const bayrak = baskiMalz(bayrakDoku());
  for (const s of [1, -1]) {
    const kol = new T.Group(); kol.position.set(s * 0.73, 1.53, 0); kol.rotation.z = s * KOL_ACI; kol.scale.z = KOL_Z;
    const kg = new T.CylinderGeometry(KOL_R, KOL_UC, KOL_BOY, 36, 1, true); kg.translate(0, -KOL_BOY / 2 + 0.22, 0);
    const manset = new T.Mesh(new T.TorusGeometry(KOL_UC, 0.014, 8, 44), yaka); manset.rotation.x = Math.PI / 2; manset.position.y = -KOL_BOY + 0.23;
    kol.add(new T.Mesh(kg, kumasKol), new T.Mesh(kg, ic), manset);
    // Altın sponsor kolun dışında. Sol kolda bayrak armasının altında durur.
    const alt = kolaSar(kol, s, panelMalz(1, 0.46 / 0.25), 0.46, 0.25, 0, s > 0 ? -0.34 : -0.28); paneller.push({ ag: alt, no: 1 });
    if (s > 0) kolaSar(kol, s, bayrak, 0.15, 0.1, 0.1, -0.1);
    tisort.add(kol);
  }
  tisort.position.y = -1.1;
  sahne.add(tisort);

  // Yerdeki yumuşak gölge
  const [gt, gc] = tuvalYap(128, 128), gr = gc.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); gc.fillStyle = gr; gc.fillRect(0, 0, 128, 128);
  const golge = new T.Mesh(new T.PlaneGeometry(3.4, 1.9), new T.MeshBasicMaterial({ map: new T.CanvasTexture(gt), transparent: true, depthWrite: false }));
  golge.rotation.x = -Math.PI / 2; golge.position.y = -1.16; sahne.add(golge);

  /* ── Durum ── */
  // Her paketin en iyi göründüğü açı: ana sponsor önden, altın yandan (temiz kol), gümüş ve destekçi arkadan.
  const ACILAR = [0, 1.45, Math.PI, Math.PI];
  const azalt = matchMedia('(prefers-reduced-motion: reduce)');
  const yuzEl = kok.querySelector<HTMLElement>('[data-tisort-yuz]');
  let secili = -1, aci = -0.5, egim = 0.07, hedef: number | null = null, basili = false, ustte = false, kaydi = false, bekle = 0;
  let basX = 0, basY = 0, aci0 = 0, egim0 = 0, gorunur = false, yuzSon = '';
  const iz = () => {
    const a = ((aci % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), k = Math.cos(a);
    kok.dataset.paketNo = String(secili); kok.dataset.aci = a.toFixed(2);
    const yuz = k > 0.6 ? 'on' : k < -0.6 ? 'arka' : 'yan';
    if (yuz !== yuzSon) { yuzSon = yuz; kok.dataset.yuz = yuz; if (yuzEl) yuzEl.textContent = etiket[yuz === 'on' ? 0 : yuz === 'arka' ? 1 : 2] ?? ''; }
  };

  const boyutla = () => {
    const r = tuval.getBoundingClientRect(); if (!r.width || !r.height) return;
    cizer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); cizer.setSize(r.width, r.height, false);
    kamera.aspect = r.width / r.height; kamera.updateProjectionMatrix();
    const uzak = kamera.aspect < 1.1 ? 8.8 : 7;
    kamera.position.set(0, 0.35, uzak); kamera.lookAt(0, 0.02, 0);
  };
  function ciz(t: number) {
    const dt = Math.min(0.05, (t - son) / 1000 || 0.016); son = t;
    if (hedef !== null && !basili) {
      let fark = (hedef - aci) % (2 * Math.PI); if (fark > Math.PI) fark -= 2 * Math.PI; if (fark < -Math.PI) fark += 2 * Math.PI;
      if (azalt.matches || Math.abs(fark) < 0.004) { aci += fark; hedef = null; } else aci += fark * Math.min(1, dt * 5);
      egim += (0.07 - egim) * Math.min(1, dt * 5);
    } else if (!basili && !ustte && secili < 0 && !azalt.matches && t > bekle) aci += dt * 0.35;
    tisort.rotation.y = aci; tisort.rotation.x = egim + (azalt.matches ? 0 : Math.sin(t / 1300) * 0.012);
    const nabiz = azalt.matches ? 1 : 0.82 + 0.18 * Math.sin(t / 380);
    for (const p of paneller) (p.ag.material as T.MeshBasicMaterial).opacity = secili < 0 ? 0.95 : p.no === secili ? nabiz : 0.2;
    cizer.render(sahne, kamera); iz();
  }
  const dongu = (t: number) => { ciz(t); kare = gorunur && !document.hidden ? requestAnimationFrame(dongu) : 0; };
  const baslat = () => { if (!kare && gorunur && !document.hidden) { son = performance.now(); kare = requestAnimationFrame(dongu); } };

  const sec = (no: number) => { secili = no; if (no >= 0 && ACILAR[no] !== undefined) hedef = ACILAR[no]; iz(); baslat(); if (!kare) ciz(performance.now()); };
  const don = (a: number) => { hedef = a; bekle = performance.now() + 3000; baslat(); if (!kare) ciz(performance.now()); };

  /* ── Etkileşim ── */
  const isin = new T.Raycaster(), nokta = new T.Vector2();
  const vur = (e: PointerEvent) => {
    const r = tuval.getBoundingClientRect();
    nokta.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    isin.setFromCamera(nokta, kamera);
    const v = isin.intersectObjects(tisort.children, true)[0];
    return v ? (paneller.find((p) => p.ag === v.object)?.no ?? -1) : -1;
  };
  tuval.addEventListener('pointerdown', (e) => { basili = true; kaydi = false; basX = e.clientX; basY = e.clientY; aci0 = aci; egim0 = egim; hedef = null; tuval.setPointerCapture(e.pointerId); });
  tuval.addEventListener('pointermove', (e) => {
    if (!basili) { tuval.style.cursor = vur(e) >= 0 ? 'pointer' : 'grab'; return; }
    const dx = e.clientX - basX, dy = e.clientY - basY;
    if (Math.abs(dx) + Math.abs(dy) > 5) kaydi = true;
    aci = aci0 + dx * 0.011; egim = Math.max(-0.4, Math.min(0.45, egim0 + dy * 0.005));
  });
  tuval.addEventListener('pointerup', (e) => {
    if (!basili) return; basili = false; bekle = performance.now() + 2500;
    if (!kaydi) { const no = vur(e); if (no >= 0) secildi(no === secili ? -1 : no); }
  });
  tuval.addEventListener('pointercancel', () => { basili = false; });
  tuval.addEventListener('pointerenter', () => { ustte = true; }); tuval.addEventListener('pointerleave', () => { ustte = false; bekle = performance.now() + 1500; });

  new ResizeObserver(() => { boyutla(); if (!kare) ciz(performance.now()); }).observe(tuval);
  new IntersectionObserver((k) => { gorunur = k[0].isIntersecting; baslat(); }).observe(tuval);
  document.addEventListener('visibilitychange', baslat);
  boyutla(); ciz(performance.now());
  kok.dataset.hazir = '1';
  return { sec, don };
}
