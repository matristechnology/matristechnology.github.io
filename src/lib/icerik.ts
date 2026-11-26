// icerik.yaml dosyasını okur, biçimini denetler ve sayfalara verir.
// Biçim hatası olursa derleme, hangi alanın yanlış olduğunu söyleyerek durur.
import { parse } from 'yaml';
import { z } from 'astro/zod';
import type { ImageMetadata } from 'astro';
import ham from '../../icerik.yaml?raw';

export type Dil = 'tr' | 'en';

const ikiDil = z.union([z.string(), z.object({ tr: z.string(), en: z.string() })]);
const ikiDilBos = ikiDil.optional().default('');
const metin = z.string().nullish().transform((v) => v ?? '');
const liste = <T extends z.ZodTypeAny>(oge: T) => z.array(oge).nullish().transform((v) => v ?? []);

const bolum = z.object({ baslik: ikiDil, giris: ikiDilBos, teknik: liste(ikiDil) });
const rol = z.object({ ad: ikiDil, metin: ikiDil, isler: liste(ikiDil) });

const sema = z.object({
  site: z.object({ adres: z.string(), baslik: ikiDil, aciklama: ikiDil }),
  takim: z.object({
    ad: z.string(),
    ustluk: ikiDil,
    tanitim: ikiDil,
    fotograf: metin,
    fotograf_alt: ikiDilBos,
    hikaye: z.object({ tr: z.array(z.string()), en: z.array(z.string()) }),
    odak: liste(ikiDil),
  }),
  basarilar: liste(
    z.object({ yil: z.union([z.string(), z.number()]).transform(String), tur: z.enum(['finalist', 'derece', 'odul']), baslik: ikiDil, ayrinti: ikiDilBos }),
  ),
  suru: z.object({ anlatim: z.object({ tr: z.array(z.string()), en: z.array(z.string()) }), yarisma: ikiDilBos }),
  ekipler: z.record(z.string(), z.object({ ad: ikiDil, ozet: ikiDilBos, dallar: z.record(z.string(), ikiDil).optional().default({}) })),
  ekip_yazisi: ikiDilBos,
  uyeler: liste(
    z.object({
      ad: metin,
      gorev: ikiDilBos,
      ekip: metin,
      dal: metin,
      sorumlu: z.boolean().optional().default(false),
      bolum: ikiDilBos,
      fotograf: metin,
      baglanti: metin,
      izin: z.boolean().optional().default(false),
    }),
  ),
  danismanlar: liste(z.object({ ad: metin, unvan: ikiDil, izin: z.boolean().optional().default(false) })),
  surec: liste(z.object({ baslik: ikiDil, ayrinti: ikiDilBos })),
  galeri: liste(z.object({ dosya: z.string(), alt: ikiDil })),
  destek: z.object({
    metin: ikiDilBos,
    alanlar: liste(ikiDil),
    haklar: liste(ikiDil),
    ihtiyac_yazisi: ikiDilBos,
    ihtiyaclar: liste(z.object({ grup: ikiDil, ogeler: z.array(z.string()) })),
    dosya: metin,
    sponsorlar: liste(z.object({ ad: z.string(), logo: metin, baglanti: metin })),
  }),
  suru_sayfa: z.object({
    baslik: ikiDil,
    ozet: ikiDilBos,
    neden: liste(z.object({ baslik: ikiDil, metin: ikiDil })),
    cevaplar: liste(z.object({ soru: ikiDil, cevap: ikiDil })),
    tarama: bolum,
    yarisma: bolum.extend({ gorevler: liste(z.object({ baslik: ikiDil, maddeler: liste(ikiDil) })) }),
    roller: bolum.extend({ lider: rol, takipci: rol, yedek: rol }),
    gorev: bolum,
    konsol: bolum,
    lider: bolum,
    mesh: bolum,
    geometri: bolum,
    not: ikiDilBos,
  }),
  iha: z.object({
    baslik: ikiDil,
    giris: ikiDilBos,
    parcalar: liste(z.object({ anahtar: z.string(), ad: ikiDil, model: ikiDilBos, metin: ikiDil })),
    hatlar: z.object({ guc: z.object({ ad: ikiDil, metin: ikiDil }), veri: z.object({ ad: ikiDil, metin: ikiDil }), sinyal: z.object({ ad: ikiDil, metin: ikiDil }) }),
    teknik: liste(ikiDil),
    not: ikiDilBos,
  }),
  matris_sayfa: z.object({
    baslik: ikiDil,
    ozet: ikiDilBos,
    neden: z.object({ baslik: ikiDil, paragraflar: liste(ikiDil) }),
    hikaye: z.object({ baslik: ikiDil, giris: ikiDilBos, duraklar: liste(z.object({ yil: ikiDil, baslik: ikiDil, metin: ikiDil })) }),
    sayilar: z.object({ baslik: ikiDil, ek: liste(z.object({ sayi: z.number(), son: z.string().default(''), etiket: ikiDil })) }),
  }),
  iletisim: z.object({
    eposta: metin,
    eposta_etiket: ikiDilBos,
    instagram: metin,
    instagram_ad: metin,
    linkedin: metin,
    katil: ikiDilBos,
    basvuru: metin,
  }),
});

const veri = parse(ham);
// { tr: ..., en: ... } içinde tırnaksız yazılan metin ilk virgülde kesilir, kalan parça boş bir anahtar olur
// ve şema onu sessizce atar. Bu yüzden boşluk içeren boş anahtar bulunca derleme durur.
const kesik: string[] = [];
const gez = (o: unknown, yol: string): void => {
  if (Array.isArray(o)) o.forEach((x, i) => gez(x, `${yol}[${i}]`));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (v === null && /\s/.test(k)) kesik.push(`${yol}: "${k.slice(0, 40)}..."`); gez(v, `${yol}.${k}`); }
};
gez(veri, '');
if (kesik.length) throw new Error(`icerik.yaml: bu metinler virgülde kesilmiş, tırnak içine al ya da ayrı satıra yaz:\n  ${kesik.join('\n  ')}`);
const sonuc = sema.safeParse(veri);
if (!sonuc.success) {
  const satirlar = sonuc.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`icerik.yaml biçim hatası:\n${satirlar}`);
}

export const icerik = sonuc.data;

for (const [i, u] of icerik.uyeler.entries()) {
  if (u.ekip && !(u.ekip in icerik.ekipler)) throw new Error(`icerik.yaml: ${i + 1}. üyenin ekibi (${u.ekip}) "ekipler" listesinde yok`);
  if (u.dal && !u.ekip) throw new Error(`icerik.yaml: ${i + 1}. üyenin dalı (${u.dal}) var ama ekibi yazılmamış`);
  if (u.dal && !(u.dal in icerik.ekipler[u.ekip].dallar)) throw new Error(`icerik.yaml: ${i + 1}. üyenin dalı (${u.dal}) "${u.ekip}" ekibinin dalları arasında yok`);
}

/** İki dilli alandan istenen dili seçer. */
export function c(deger: string | { tr: string; en: string } | undefined, dil: Dil): string {
  if (!deger) return '';
  return typeof deger === 'string' ? deger : (deger[dil] ?? deger.tr ?? '');
}

export type Uye = (typeof icerik.uyeler)[number] & { sira: number; adsiz: boolean; sablon: boolean };

/**
 * Sitede gösterilecek üyeler. Hiçbir kayıt düşmez, ama adı yalnızca izni olan üyede görünür.
 * - adsiz: adı boş ya da izni yok. Kartta ad, fotoğraf, bölüm ve bağlantı çıkmaz, görev ve dal görünür.
 * - sablon: görevi, ekibi ve dalı da boş. Bu kayıtlar "yerleşecek üyeler" sırasında durur.
 * - Sorumlular (kaptan, ekip sorumluları) öne gelir, şablonlar sona kalır.
 */
export function gorunenUyeler(): Uye[] {
  const hepsi = icerik.uyeler.map((u, i) => {
    const adsiz = !u.ad.trim() || !u.izin;
    const sablon = adsiz && !u.ekip && !u.dal && !u.gorev.tr.trim() && !u.gorev.en.trim();
    // Adı görünmeyen üyenin kişisel alanları sayfaya hiç girmez.
    return adsiz ? { ...u, ad: '', fotograf: '', baglanti: '', bolum: { tr: '', en: '' }, sira: i + 1, adsiz, sablon } : { ...u, sira: i + 1, adsiz, sablon };
  });
  const agirlik = (u: Uye) => (u.sablon ? 2 : u.sorumlu ? 0 : 1);
  return hepsi.sort((a, b) => agirlik(a) - agirlik(b) || a.sira - b.sira);
}

export const gorunenDanismanlar = () => icerik.danismanlar.filter((d) => d.ad.trim() && d.izin);

type Modul = { default: ImageMetadata };
const galeri = import.meta.glob<Modul>('../assets/galeri/*.{png,jpg,jpeg,webp,avif}', { eager: true });
const uyeler = import.meta.glob<Modul>('../assets/uyeler/*.{png,jpg,jpeg,webp,avif}', { eager: true });
const sponsorlar = import.meta.glob<Modul>('../assets/sponsorlar/*.{png,jpg,jpeg,webp,avif,svg}', { eager: true });

export function galeriGorseli(dosya: string): ImageMetadata {
  const m = galeri[`../assets/galeri/${dosya}`];
  if (!m) throw new Error(`icerik.yaml: görsel bulunamadı: src/assets/galeri/${dosya}`);
  return m.default;
}
export function uyeGorseli(dosya: string): ImageMetadata {
  const m = uyeler[`../assets/uyeler/${dosya}`];
  if (!m) throw new Error(`icerik.yaml: üye fotoğrafı bulunamadı: src/assets/uyeler/${dosya}`);
  return m.default;
}
export function sponsorGorseli(dosya: string): ImageMetadata {
  const m = sponsorlar[`../assets/sponsorlar/${dosya}`];
  if (!m) throw new Error(`icerik.yaml: sponsor logosu bulunamadı: src/assets/sponsorlar/${dosya}`);
  return m.default;
}

/** Verisi olan bölümler, sayfadaki sırayla. Verisi boşalan bölüm sayfadan ve menüden birlikte kalkar. */
export function gorunenBolumler() {
  const i = icerik.iletisim;
  return (
    [
      ['suru', true],
      ['matris', true],
      ['takim', gorunenUyeler().length > 0],
      ['calismalar', icerik.surec.length > 0],
      ['galeri', icerik.galeri.length > 0],
      ['destek', true],
      ['iletisim', !!(i.eposta || i.instagram || i.linkedin || i.basvuru)],
    ] as const
  )
    .filter(([, var_]) => var_)
    .map(([ad]) => ad);
}
