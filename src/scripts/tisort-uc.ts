// Takım tişörtünün üç boyutlu modeli (three.js): sponsor logolarının duracağı yerleri gösterir.
// Model kodla kurulur, dışarıdan dosya yüklenmez. Dört paket, dört yer:
//   0 ana sponsor: göğüs (tek panel)      1 altın: iki kol
//   2 gümüş: sırtın üstü (iki büyük panel)  3 destekçi: sırtın altı (dört küçük panel)
// Sürükleyince döner, bir panele tıklayınca o paket seçilir, paket seçilince tişört o yüzünü çevirir.
// Birim yaklaşık yarım metre, y yukarı, +z tişörtün önü.
import * as T from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type Tisort = { sec: (no: number) => void };

/* ── Gövdenin kesiti: yükseklik boyunca yarı genişlik (x) ve yarı derinlik (z) ── */
const PROFIL = new T.CatmullRomCurve3([
  new T.Vector3(0.88, 0, 0.5), new T.Vector3(0.87, 0.45, 0.51), new T.Vector3(0.89, 1.0, 0.52), new T.Vector3(0.94, 1.45, 0.5),
  new T.Vector3(0.93, 1.68, 0.44), new T.Vector3(0.78, 1.87, 0.36), new T.Vector3(0.52, 1.99, 0.29), new T.Vector3(0.33, 2.04, 0.25),
], false, 'catmullrom', 0.5).getPoints(72);
/** Verilen yükseklikte kesitin yarı genişliği ve yarı derinliği. */
const kesit = (y: number): [number, number] => {
  for (let i = 1; i < PROFIL.length; i++) {
    const a = PROFIL[i - 1], b = PROFIL[i];
    if (y <= b.y || i === PROFIL.length - 1) { const k = Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y || 1))); return [a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k]; }
  }
  return [0.88, 0.5];
};
/** Gövde yüzeyinin (x, y) noktasındaki derinliği. */
const yuzey = (x: number, y: number) => { const [rx, rz] = kesit(y); return rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)); };

const govdeGeo = () => {
  const N = 64, yer: number[] = [], uv: number[] = [], sira: number[] = [];
  PROFIL.forEach((p, i) => {
    for (let j = 0; j <= N; j++) { const a = (j / N) * Math.PI * 2; yer.push(p.x * Math.sin(a), p.y, p.z * Math.cos(a)); uv.push(j / N, i / (PROFIL.length - 1)); }
  });
  for (let i = 0; i < PROFIL.length - 1; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + N + 1; sira.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(yer, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(sira); g.computeVertexNormals();
  return g;
};

/* ── Logo panelinin dokusu: kesikli altın çerçeve, içinde paketin adı ── */
const panelDoku = (yazi: string, oran: number) => {
  const t = document.createElement('canvas'); t.width = 512; t.height = Math.round(512 / oran);
  const c = t.getContext('2d')!, w = t.width, h = t.height, p = 14;
  c.fillStyle = 'rgba(232,196,104,0.30)'; c.strokeStyle = '#f1cf73'; c.lineWidth = 12; c.setLineDash([34, 20]);
  c.beginPath(); c.roundRect(p, p, w - 2 * p, h - 2 * p, 26); c.fill(); c.stroke();
  c.fillStyle = '#fff3cf'; c.textAlign = 'center'; c.textBaseline = 'middle';
  let boy = Math.min(h * 0.42, 96); c.font = `700 ${boy}px "Inter Tight", system-ui, sans-serif`;
  while (c.measureText(yazi).width > w - 80 && boy > 20) { boy -= 4; c.font = `700 ${boy}px "Inter Tight", system-ui, sans-serif`; }
  c.fillText(yazi, w / 2, h / 2 + 2);
  const d = new T.CanvasTexture(t); d.colorSpace = T.SRGBColorSpace; d.anisotropy = 4;
  return d;
};

export function kur(kok: HTMLElement, adlar: string[], secildi: (no: number) => void): Tisort | null {
  const tuval = kok.querySelector<HTMLCanvasElement>('canvas');
  if (!tuval) return null;
  let cizer: T.WebGLRenderer;
  try { cizer = new T.WebGLRenderer({ canvas: tuval, antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return null; }
  cizer.outputColorSpace = T.SRGBColorSpace; cizer.toneMapping = T.ACESFilmicToneMapping; cizer.toneMappingExposure = 1.05;
  const sahne = new T.Scene();
  sahne.environment = new T.PMREMGenerator(cizer).fromScene(new RoomEnvironment(), 0.04).texture; sahne.environmentIntensity = 0.45;
  const kamera = new T.PerspectiveCamera(28, 1, 0.5, 40);
  const isik = new T.DirectionalLight(0xffffff, 1.7); isik.position.set(2.5, 4, 5);
  const arkaIsik = new T.DirectionalLight(0xfff0d0, 1.4); arkaIsik.position.set(-3, 3, -5);
  sahne.add(isik, arkaIsik, new T.HemisphereLight(0xffffff, 0x2a2c33, 0.6));

  /* ── Tişört ── */
  const kumas = new T.MeshStandardMaterial({ color: 0x9a1820, roughness: 0.94, metalness: 0 });
  const ic = new T.MeshStandardMaterial({ color: 0x4a0c12, roughness: 1, side: T.BackSide });
  const ribana = new T.MeshStandardMaterial({ color: 0x7a1219, roughness: 0.95 });
  const tisort = new T.Group();
  const gg = govdeGeo();
  tisort.add(new T.Mesh(gg, kumas), new T.Mesh(gg, ic));
  const yaka = new T.Mesh(new T.TorusGeometry(0.31, 0.035, 12, 48), ribana);
  yaka.rotation.x = Math.PI / 2 - 0.16; yaka.scale.set(1.08, 0.82, 1); yaka.position.set(0, 2.03, 0.015);
  const etek = new T.Mesh(new T.TorusGeometry(1, 0.012, 8, 64), ribana);
  etek.rotation.x = Math.PI / 2; etek.scale.set(0.88, 0.5, 1); etek.position.y = 0.012;
  tisort.add(yaka, etek);

  const KOL_R = 0.3, KOL_UC = 0.27, KOL_BOY = 0.8, KOL_ACI = 0.62, KOL_Z = 0.85;
  const paneller: { ag: T.Mesh; no: number }[] = [];
  const panelMalz = (no: number, oran: number) => new T.MeshBasicMaterial({ map: panelDoku(adlar[no] ?? '', oran), transparent: true, side: T.DoubleSide, toneMapped: false, depthWrite: false });
  for (const s of [1, -1]) {
    const kol = new T.Group(); kol.position.set(s * 0.68, 1.5, 0); kol.rotation.z = s * KOL_ACI; kol.scale.z = KOL_Z;
    const kg = new T.CylinderGeometry(KOL_R, KOL_UC, KOL_BOY, 32, 1, true); kg.translate(0, -KOL_BOY / 2 + 0.2, 0);
    const manset = new T.Mesh(new T.TorusGeometry(KOL_UC, 0.013, 8, 40), ribana); manset.rotation.x = Math.PI / 2; manset.position.y = -KOL_BOY + 0.21;
    kol.add(new T.Mesh(kg, kumas), new T.Mesh(kg, ic), manset);
    // Altın sponsor: kolun dış yüzüne sarılan panel
    const en = 0.44, boy = 0.24, pg = new T.PlaneGeometry(en, boy, 14, 2), k = pg.attributes.position, r = (KOL_R + KOL_UC) / 2 + 0.008;
    for (let i = 0; i < k.count; i++) { const a = k.getX(i) / r; k.setXYZ(i, s * r * Math.cos(a), -KOL_BOY * 0.42 + k.getY(i), -s * r * Math.sin(a)); }
    const p = new T.Mesh(pg, panelMalz(1, en / boy)); kol.add(p); paneller.push({ ag: p, no: 1 });
    tisort.add(kol);
  }
  /** Gövdeye oturan panel. yon: 1 ön, -1 sırt. */
  const govdePanel = (no: number, cx: number, cy: number, en: number, boy: number, yon: number) => {
    const pg = new T.PlaneGeometry(en, boy, 16, 6), k = pg.attributes.position;
    for (let i = 0; i < k.count; i++) { const x = cx + yon * k.getX(i), y = cy + k.getY(i); k.setXYZ(i, x, y, yon * (yuzey(x, y) + 0.012)); }
    const p = new T.Mesh(pg, panelMalz(no, en / boy)); tisort.add(p); paneller.push({ ag: p, no });
  };
  govdePanel(0, 0, 1.32, 0.86, 0.4, 1);                                   // ana sponsor: göğüs
  for (const x of [-0.36, 0.36]) govdePanel(2, x, 1.36, 0.62, 0.34, -1);  // gümüş: sırtın üstü, iki büyük panel
  for (const x of [-0.555, -0.185, 0.185, 0.555]) govdePanel(3, x, 0.62, 0.33, 0.2, -1); // destekçi: sırtın altı, dört panel
  tisort.position.y = -1.02;
  sahne.add(tisort);

  // Yerdeki yumuşak gölge
  const gt = document.createElement('canvas'); gt.width = gt.height = 128;
  const gc = gt.getContext('2d')!, gr = gc.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); gc.fillStyle = gr; gc.fillRect(0, 0, 128, 128);
  const golge = new T.Mesh(new T.PlaneGeometry(3.4, 1.9), new T.MeshBasicMaterial({ map: new T.CanvasTexture(gt), transparent: true, depthWrite: false }));
  golge.rotation.x = -Math.PI / 2; golge.position.y = -1.08; sahne.add(golge);

  /* ── Durum ── */
  // Her paketin en iyi göründüğü açı: göğüs karşıdan, kol yandan, sırt arkadan.
  const ACILAR = [0, -1.4, Math.PI, Math.PI];
  const azalt = matchMedia('(prefers-reduced-motion: reduce)');
  let secili = -1, aci = -0.45, egim = 0.08, hedef: number | null = null, basili = false, ustte = false, kaydi = false, bekle = 0;
  let basX = 0, basY = 0, aci0 = 0, egim0 = 0, gorunur = false, kare = 0, son = 0;
  const iz = () => { kok.dataset.paketNo = String(secili); kok.dataset.aci = (((aci % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).toFixed(2); };

  const boyutla = () => {
    const r = tuval.getBoundingClientRect(); if (!r.width || !r.height) return;
    cizer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); cizer.setSize(r.width, r.height, false);
    kamera.aspect = r.width / r.height; kamera.updateProjectionMatrix();
    const uzak = kamera.aspect < 1.1 ? 8.2 : 6.6;
    kamera.position.set(0, 0.3, uzak); kamera.lookAt(0, 0, 0);
  };
  const ciz = (t: number) => {
    const dt = Math.min(0.05, (t - son) / 1000 || 0.016); son = t;
    if (hedef !== null && !basili) {
      // En kısa yoldan hedef açıya dön
      let fark = (hedef - aci) % (2 * Math.PI); if (fark > Math.PI) fark -= 2 * Math.PI; if (fark < -Math.PI) fark += 2 * Math.PI;
      if (azalt.matches || Math.abs(fark) < 0.004) { aci += fark; hedef = null; } else aci += fark * Math.min(1, dt * 5);
      egim += (0.08 - egim) * Math.min(1, dt * 5);
    } else if (!basili && !ustte && secili < 0 && !azalt.matches && t > bekle) aci += dt * 0.35;
    tisort.rotation.y = aci; tisort.rotation.x = egim;
    const nabiz = azalt.matches ? 1 : 0.82 + 0.18 * Math.sin(t / 380);
    for (const p of paneller) (p.ag.material as T.MeshBasicMaterial).opacity = secili < 0 ? 0.92 : p.no === secili ? nabiz : 0.22;
    cizer.render(sahne, kamera); iz();
  };
  const dongu = (t: number) => { ciz(t); kare = gorunur && !document.hidden ? requestAnimationFrame(dongu) : 0; };
  const baslat = () => { if (!kare && gorunur && !document.hidden) { son = performance.now(); kare = requestAnimationFrame(dongu); } };

  const sec = (no: number) => { secili = no; if (no >= 0 && ACILAR[no] !== undefined) hedef = ACILAR[no]; iz(); baslat(); };

  /* ── Etkileşim ── */
  const isin = new T.Raycaster(), nokta = new T.Vector2();
  const vur = (e: PointerEvent) => {
    const r = tuval.getBoundingClientRect();
    nokta.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    isin.setFromCamera(nokta, kamera);
    // Tişörtün arkasında kalan panel sayılmasın: önce kumaşa çarpan ışın paneli seçmez
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
  const birak = (e: PointerEvent) => {
    if (!basili) return; basili = false; bekle = performance.now() + 2500;
    if (!kaydi) { const no = vur(e); if (no >= 0) secildi(no === secili ? -1 : no); }
  };
  tuval.addEventListener('pointerup', birak); tuval.addEventListener('pointercancel', () => { basili = false; });
  tuval.addEventListener('pointerenter', () => { ustte = true; }); tuval.addEventListener('pointerleave', () => { ustte = false; bekle = performance.now() + 1500; });

  new ResizeObserver(() => { boyutla(); if (!kare) ciz(performance.now()); }).observe(tuval);
  new IntersectionObserver((k) => { gorunur = k[0].isIntersecting; baslat(); }).observe(tuval);
  document.addEventListener('visibilitychange', baslat);
  boyutla(); ciz(performance.now());
  kok.dataset.hazir = '1';
  return { sec };
}
