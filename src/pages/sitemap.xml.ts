// Arama motorları için site haritası: ana sayfa, yedi ayrıntı sayfası ve sık sorulanlar, iki dilde, birbirinin karşılığıyla.
import type { APIRoute } from 'astro';
import { altSayfa, anaYol, sssYol } from '../lib/i18n';

export const GET: APIRoute = ({ site }) => {
  const kok = (site?.href ?? 'https://matristechnology.github.io/').replace(/\/$/, '');
  const ciftler = [{ tr: anaYol('tr'), en: anaYol('en') }, ...Object.values(altSayfa), sssYol];
  const satir = (yol: string, c: { tr: string; en: string }) =>
    `  <url><loc>${kok}${yol}</loc><xhtml:link rel="alternate" hreflang="tr" href="${kok}${c.tr}"/><xhtml:link rel="alternate" hreflang="en" href="${kok}${c.en}"/></url>`;
  const govde = ciftler.flatMap((c) => [satir(c.tr, c), satir(c.en, c)]).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${govde}\n</urlset>\n`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
