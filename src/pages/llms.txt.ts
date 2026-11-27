// Yapay zekâ aramaları için sitenin düz yazı özeti (llms.txt). İçerik icerik.yaml'dan üretilir, elle yazılmaz.
import type { APIRoute } from 'astro';
import { icerik, c } from '../lib/icerik';
import { altSayfa, sssYol, sayfaBasligi } from '../lib/i18n';

export const GET: APIRoute = ({ site }) => {
  const kok = (site?.href ?? 'https://matristechnology.github.io/').replace(/\/$/, '');
  const S = icerik.sss_sayfa;
  const sayfalar = (Object.keys(altSayfa) as (keyof typeof altSayfa)[]).map((k) => `- [${sayfaBasligi[k].tr}](${kok}${altSayfa[k].tr})`);
  const metin = [
    '# Matris (Matris Technology)',
    '',
    `> ${c(icerik.site.aciklama, 'tr')}`,
    '',
    'Matris, Bursa Teknik Üniversitesi öğrencilerinden oluşan TEKNOFEST Sürü İHA yarışma takımıdır. Site Türkçe ve İngilizce yayımlanır, İngilizce sayfalar /en/ altındadır.',
    '',
    '## Dereceler',
    ...icerik.basarilar.map((b) => `- ${b.yil}: ${c(b.baslik, 'tr')}${c(b.ayrinti, 'tr') ? ` (${c(b.ayrinti, 'tr')})` : ''}`),
    '',
    '## Sayfalar',
    `- [Ana sayfa](${kok}/)`,
    ...sayfalar,
    `- [${c(S.baslik, 'tr')}](${kok}${sssYol.tr})`,
    '',
    '## Sık sorulanlar',
    ...S.liste.flatMap((x) => ['', `### ${c(x.soru, 'tr')}`, c(x.cevap, 'tr')]),
    '',
    '## İletişim',
    `- E-posta: ${icerik.iletisim.takim_eposta}`,
    `- Instagram: ${icerik.iletisim.instagram}`,
    ...(icerik.iletisim.linkedin ? [`- LinkedIn: ${icerik.iletisim.linkedin}`] : []),
    '',
  ].join('\n');
  return new Response(metin, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
