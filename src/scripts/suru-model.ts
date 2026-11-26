// Sürü İHA sayfasındaki benzetimlerin ortak uçuş modeli.
// Takımın uçuş kodundaki kurallardan sadeleştirildi:
//   - Dizilim ofsetleri (ileri, yan): yuva 0 lider, tek numaralılar bir yanda, çiftler öbür yanda, her kat bir "aralık".
//     Çizgi: (0, ±k·a). V: (k·a, ±k·a), kollar önde. Ok başı: (−k·a, ±k·a), kollar arkada.
//   - Döndürme: x = cosθ·ileri − sinθ·yan, y = sinθ·ileri + cosθ·yan.
//   - Yatış manevrasında her takipçi, dizilim merkezine uzaklığına göre irtifa ofseti alır (tan(açı)·2 katsayısı).
//   - Her İHA görev boyunca kendi yuvasını korur. Ayrılan İHA'nın yuvası boş kalır, geri gelince aynı yuvaya döner.
// Hızlar görünür olsun diye gerçeğinden yüksek, süreler kısaltılmıştır.
import { v3, type V3 } from './uc-boyut';

export type Dizilim = 'CIZGI' | 'V' | 'OKBASI';
export type Rol = 'lider' | 'takipci' | 'yedek';

export function ofset(tip: Dizilim, yuva: number, aralik: number): [number, number] {
  if (yuva <= 0) return [0, 0];
  const kat = Math.ceil(yuva / 2), yan = (yuva % 2 ? 1 : -1) * kat * aralik;
  return [tip === 'V' ? kat * aralik : tip === 'OKBASI' ? -kat * aralik : 0, yan];
}
export function dondur(ileri: number, yan: number, yon: number): [number, number] {
  const c = Math.cos(yon), s = Math.sin(yon);
  return [c * ileri - s * yan, s * ileri + c * yan];
}
/** compute_pitch_roll_alt_offset karşılığı. yon radyan (x eksenine göre), açılar derece. */
export function egimOfseti(tip: Dizilim, yuva: number, yuvaSayisi: number, aralik: number, pitch: number, roll: number): number {
  if (Math.abs(pitch) < 0.01 && Math.abs(roll) < 0.01) return 0;
  let cx = 0, cy = 0;
  for (let k = 0; k < yuvaSayisi; k++) { const [a, b] = ofset(tip, k, aralik); cx += a; cy += b; }
  cx /= yuvaSayisi; cy /= yuvaSayisi;
  const [a, b] = ofset(tip, yuva, aralik);
  // Gövde ekseninde. Artı pitch öne eğilmek: öndekiler alçalır. Artı roll sağa yatmak: soldakiler (artı yan) yükselir.
  return -(a - cx) * Math.tan((pitch * Math.PI) / 180) * 2 + (b - cy) * Math.tan((roll * Math.PI) / 180) * 2;
}

export type Arac = {
  id: number; rol: Rol; yuva: number; p: V3; v: V3; yaw: number; egP: number; egR: number;
  motor: boolean; dustu: boolean; durum: string; hedef: V3 | null; hedefYaw: number | null; bekle: number;
  dizide: boolean; vmax: number;
};

export function aracYap(id: number, rol: Rol, yuva: number, p: V3): Arac {
  return { id, rol, yuva, p: { ...p }, v: v3(), yaw: Math.PI / 2, egP: 0, egR: 0, motor: false, dustu: false, durum: 'yerde', hedef: null, hedefYaw: null, bekle: 0, dizide: rol !== 'yedek', vmax: 9 };
}

export const aciFarki = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export class Suru {
  araclar: Arac[] = [];
  merkez = v3(0, 0, 0);
  yon = Math.PI / 2;
  irtifa = 8;
  tip: Dizilim = 'CIZGI';
  aralik = 8;
  yuvaSayisi = 3;
  pitch = 0;
  roll = 0;
  /** Dizideki (lider ve takipçi) İHA'lar için hedefi her karede yeniden hesapla. */
  diziyiIzle = true;

  lider() { return this.araclar.find((a) => a.rol === 'lider' && !a.dustu); }
  yuvaHedefi(yuva: number): V3 {
    const [i, y] = ofset(this.tip, yuva, this.aralik), [dx, dy] = dondur(i, y, this.yon);
    return v3(this.merkez.x + dx, this.merkez.y + dy, this.irtifa + egimOfseti(this.tip, yuva, this.yuvaSayisi, this.aralik, this.pitch, this.roll));
  }
  yerinde(a: Arac, tol = 0.6) {
    return !!a.hedef && Math.hypot(a.hedef.x - a.p.x, a.hedef.y - a.p.y, a.hedef.z - a.p.z) < tol && Math.hypot(a.v.x, a.v.y, a.v.z) < 1.2;
  }
  hepsiYerinde(tol = 0.8) { return this.araclar.filter((a) => a.dizide && a.motor && !a.dustu).every((a) => this.yerinde(a, tol)); }

  adim(dt: number) {
    for (const a of this.araclar) {
      if (a.dustu) {
        // Motoru duran araç düşer, yerde kalır.
        a.v.z -= 9.8 * dt; a.v.x *= 1 - dt; a.v.y *= 1 - dt;
        a.p.x += a.v.x * dt; a.p.y += a.v.y * dt; a.p.z = Math.max(0, a.p.z + a.v.z * dt);
        if (a.p.z === 0) { a.v = v3(); a.egR += (0.35 - a.egR) * Math.min(1, dt * 6); }
        else { a.egR += dt * 2.5; a.egP += dt * 1.2; }
        continue;
      }
      if (a.dizide && a.motor && this.diziyiIzle) { a.hedef = this.yuvaHedefi(a.yuva); a.hedefYaw = this.yon; }
      if (!a.motor || !a.hedef) { a.v = v3(); a.egP *= 0.9; a.egR *= 0.9; continue; }
      const dx = a.hedef.x - a.p.x, dy = a.hedef.y - a.p.y, dz = a.hedef.z - a.p.z;
      let ix = dx * 1.6, iy = dy * 1.6;
      const yat = Math.hypot(ix, iy);
      if (yat > a.vmax) { ix = (ix / yat) * a.vmax; iy = (iy / yat) * a.vmax; }
      const iz = Math.max(-3.5, Math.min(3.5, dz * 1.8));
      const k = Math.min(1, dt * 3.2);
      const ax = (ix - a.v.x) * k, ay = (iy - a.v.y) * k;
      a.v.x += ax; a.v.y += ay; a.v.z += (iz - a.v.z) * k;
      a.p.x += a.v.x * dt; a.p.y += a.v.y * dt; a.p.z = Math.max(0, a.p.z + a.v.z * dt);
      const hy = a.hedefYaw ?? a.yaw;
      a.yaw += Math.max(-1.8 * dt, Math.min(1.8 * dt, aciFarki(hy - a.yaw)));
      // Görsel eğim: gövde ekseninde hız ve dizinin manevra açısı.
      const c = Math.cos(a.yaw), s = Math.sin(a.yaw);
      const ileri = a.v.x * c + a.v.y * s, yan = -a.v.x * s + a.v.y * c;
      const mp = a.dizide ? (this.pitch * Math.PI) / 180 : 0, mr = a.dizide ? (this.roll * Math.PI) / 180 : 0;
      a.egP += (Math.max(-0.4, Math.min(0.4, ileri * 0.035)) + mp - a.egP) * Math.min(1, dt * 5);
      a.egR += (Math.max(-0.4, Math.min(0.4, -yan * 0.035)) + mr - a.egR) * Math.min(1, dt * 5);
    }
    // Çarpışmadan kaçınma (ORCA'nın yerine basit karşılıklı itme): yalnızca iki araç çok yaklaşınca devreye girer.
    const havada = this.araclar.filter((a) => a.motor && !a.dustu && a.p.z > 0.5);
    for (let i = 0; i < havada.length; i++)
      for (let j = i + 1; j < havada.length; j++) {
        const a = havada[i], b = havada[j], dx = b.p.x - a.p.x, dy = b.p.y - a.p.y, dz = b.p.z - a.p.z, d = Math.hypot(dx, dy, dz);
        if (d > 0.01 && d < 4) {
          const it = ((4 - d) / d) * 0.5 * Math.min(1, dt * 6);
          a.p.x -= dx * it; a.p.y -= dy * it; b.p.x += dx * it; b.p.y += dy * it;
        }
      }
  }
}
