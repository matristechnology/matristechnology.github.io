// Paylaşım önizleme görsellerini üretir: public/og-tr.png, public/og-en.png
// İçerik değişince yeniden çalıştır: node araclar/og.mjs
import { chromium } from '@playwright/test';
import { parse } from 'yaml';
import fs from 'node:fs';

const icerik = parse(fs.readFileSync('icerik.yaml', 'utf8'));
const veri = (yol, tur) => `data:${tur};base64,` + fs.readFileSync(yol).toString('base64');
const b = await chromium.launch();
for (const dil of ['tr', 'en']) {
  const s = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const rozetler = icerik.basarilar.map((x) => `<li><b>${x.yil}</b>${x.baslik[dil]}</li>`).join('');
  await s.setContent(`<!doctype html><meta charset="utf-8"><style>
    @font-face{font-family:IT;font-weight:100 900;src:url(${veri('public/fonts/inter-tight-latin-wght-normal.woff2', 'font/woff2')})}
    @font-face{font-family:IT;font-weight:100 900;src:url(${veri('public/fonts/inter-tight-latin-ext-wght-normal.woff2', 'font/woff2')});unicode-range:U+0100-02BA}
    *{box-sizing:border-box;margin:0}
    body{width:1200px;height:630px;background:#0a0a0b;color:#ecebe6;font-family:IT;display:grid;grid-template-columns:1fr 470px}
    .y{padding:64px 0 64px 72px;display:flex;flex-direction:column;justify-content:space-between}
    .u{font-size:25px;color:#a5a39a}
    h1{font-size:150px;line-height:.92;letter-spacing:-.04em;font-weight:680}
    p{font-size:33px;line-height:1.3;color:#a5a39a;margin-top:22px;max-width:620px}
    ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:10px}
    li{font-size:21px;font-weight:550;padding:8px 16px;border:1.5px solid #6f6238;border-radius:99px;white-space:nowrap}
    li b{color:#e8c468;font-weight:500;margin-right:10px}
    .f{background:url(${veri('src/assets/galeri/' + icerik.takim.fotograf, 'image/jpeg')}) 42% 40%/cover;margin:40px 40px 40px 30px;border-radius:14px}
  </style><div class="y"><div class="u">${icerik.takim.ustluk[dil]}</div>
  <div><h1>${icerik.takim.ad}</h1><p>${icerik.takim.tanitim[dil]}</p></div><ul>${rozetler}</ul></div><div class="f"></div>`);
  await s.evaluate(() => document.fonts.ready);
  await s.screenshot({ path: `public/og-${dil}.png` });
}
await b.close();
