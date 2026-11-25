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
  ekipler: z.record(z.string(), ikiDil),
  ekip_yazisi: ikiDilBos,
  uyeler: liste(
    z.object({
      ad: metin,
      gorev: ikiDilBos,
      ekip: metin,
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

const sonuc = sema.safeParse(parse(ham));
if (!sonuc.success) {
  const satirlar = sonuc.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`icerik.yaml biçim hatası:\n${satirlar}`);
}

export const icerik = sonuc.data;

for (const [i, u] of icerik.uyeler.entries()) {
  if (u.ekip && !(u.ekip in icerik.ekipler)) throw new Error(`icerik.yaml: ${i + 1}. üyenin ekibi (${u.ekip}) "ekipler" listesinde yok`);
}

/** İki dilli alandan istenen dili seçer. */
export function c(deger: string | { tr: string; en: string } | undefined, dil: Dil): string {
  if (!deger) return '';
  return typeof deger === 'string' ? deger : (deger[dil] ?? deger.tr ?? '');
}

export type Uye = (typeof icerik.uyeler)[number] & { sira: number; sablon: boolean };

/**
 * Sitede gösterilecek üyeler.
 * - Adı boş olan kayıt şablon karttır ("Üye 01", "yakında").
 * - Adı yazılı ama izni olmayan üye hiç gösterilmez.
 * - Sorumlular (kaptan, ekip sorumluları) öne gelir, şablonlar sona kalır.
 */
export function gorunenUyeler(): Uye[] {
  const hepsi = icerik.uyeler.map((u, i) => ({ ...u, sira: i + 1, sablon: !u.ad.trim() }));
  const gorunen = hepsi.filter((u) => u.sablon || u.izin);
  const agirlik = (u: Uye) => (u.sablon ? 2 : u.sorumlu ? 0 : 1);
  return gorunen.sort((a, b) => agirlik(a) - agirlik(b) || a.sira - b.sira);
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
