// Ekran görüntüsü alır: node araclar/cek.mjs <çıktı klasörü> [taban adres]
// Masaüstü ve telefon genişliğinde giriş ekranı, her bölüm ve tam sayfa.
import { chromium } from '@playwright/test';
const [klasor = 'test-results/goruntu', taban = 'http://127.0.0.1:4321'] = process.argv.slice(2);
const b = await chromium.launch();
for (const [ad, en, boy] of [['masaustu', 1440, 900], ['telefon', 390, 844]]) {
  const s = await b.newPage({ viewport: { width: en, height: boy }, deviceScaleFactor: ad === 'telefon' ? 2 : 1 });
  const hatalar = [];
  s.on('pageerror', (e) => hatalar.push(e.message));
  s.on('console', (m) => m.type() === 'error' && hatalar.push(m.text()));
  await s.goto(taban + '/', { waitUntil: 'load' });
  await s.waitForTimeout(1200);
  await s.screenshot({ path: `${klasor}/${ad}-giris.png` });
  for (const id of await s.$$eval('main > section[id]', (l) => l.map((x) => x.id).filter((x) => x !== 'ust'))) {
    await s.evaluate((i) => document.getElementById(i).scrollIntoView({ behavior: 'instant', block: 'start' }), id);
    await s.waitForTimeout(900);
    await s.screenshot({ path: `${klasor}/${ad}-${id}.png` });
  }
  const tasma = await s.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(ad, 'yatay taşma:', tasma, 'hata:', hatalar.length ? hatalar : 'yok');
  await s.close();
}
await b.close();
