// Kabul denemeleri (MTS-PRJ-2026-015, 10. bölüm). Yerelde: npm run build && npm run preview, sonra npm test
// Canlı adres için: TABAN=https://... npm test
import { test, expect, type Page } from '@playwright/test';

const bekle = (s: Page, ms: number) => s.waitForTimeout(ms);

test.describe('D1 telefon genişliği', () => {
  for (const gen of [320, 390]) {
    test(`${gen}px: yatay taşma yok (TR ve EN)`, async ({ page }) => {
      await page.setViewportSize({ width: gen, height: 800 });
      for (const yol of ['/', '/en/']) {
        await page.goto(yol);
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await bekle(page, 300);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(gen);
      }
    });
  }
  test('390px: dokunma hedefleri en az 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const kucukler = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a, button, summary')]
        .filter((e) => e.offsetParent !== null && !e.closest('.yazi, .bolum-giris, .demo-not, .atla, dialog'))
        .map((e) => ({ ad: (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 30), r: e.getBoundingClientRect() }))
        .filter((x) => x.r.height < 43.5 || x.r.width < 43.5)
        .map((x) => `${x.ad} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`),
    );
    expect(kucukler).toEqual([]);
  });
});

test('D2 baştan sona kaydırma: her şey beliriyor, hiçbir bölüm sonradan yer değiştirmiyor', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  const yerler = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('main > section')].map((b) => Math.round(b.offsetTop)));
  const once = await yerler();
  const boy = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= boy; y += 350) {
    await page.evaluate((k) => scrollTo({ top: k, behavior: 'instant' }), y);
    await bekle(page, 110);
  }
  await bekle(page, 900);
  expect(await yerler()).toEqual(once);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(boy);
  expect(await page.locator('[data-belir]:not(.gorundu):not([hidden])').count()).toBe(0);
});

test.describe('D3 hareketi azalt', () => {
  test.use({ reducedMotion: 'reduce' });
  test('hiçbir hareket yok, sürü yok, içerik eksiksiz', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/anim/);
    await expect(page.locator('canvas[data-suru]')).toBeHidden();
    await expect(page.locator('[data-suru-dugme]')).toBeHidden();
    for (const b of await page.locator('main > section h2').all()) await expect(b).toBeVisible();
    // Benzetim durağan: iki ayrı anda tuval aynı, ama düğmeye basınca tek karede değişiyor.
    const demo = page.locator('[data-suru-demo]');
    await demo.scrollIntoViewIfNeeded();
    const oku = () => demo.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
    await bekle(page, 400);
    const a = await oku();
    await bekle(page, 700);
    expect(await oku()).toBe(a);
    await demo.locator('[data-dizilim-sec="halka"]').click();
    await expect(demo).toHaveAttribute('data-oturdu', '1');
    const b = await oku();
    expect(b).not.toBe(a);
    await bekle(page, 500);
    expect(await oku()).toBe(b);
  });
});

test.describe('D4 betikler kapalı', () => {
  test.use({ javaScriptEnabled: false });
  test('metinler ve görseller okunuyor, benzetimin yerinde yazılı anlatım var', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    for (const b of await page.locator('main > section h2').all()) await expect(b).toBeVisible();
    await expect(page.locator('[data-suru-demo]')).toBeHidden();
    await expect(page.locator('.demo-fikirler li')).toHaveCount(5);
    await expect(page.locator('.demo-fikirler li').first()).toBeVisible();
    await expect(page.locator('.uye').first()).toBeVisible();
    await expect(page.locator('.galeri img').first()).toBeVisible();
    await expect(page.locator('.cagri .dugme.birincil')).toBeVisible();
  });
});

test('D5 fare kullanmadan: menü, benzetim düğmeleri ve galeri klavyeyle çalışıyor', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Safari Tab ile bağlantılara varsayılan olarak odaklanmıyor');
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.keyboard.press('Tab');
  await expect(page.locator('.atla')).toBeFocused();
  // Her odak görünür bir çerçeve taşıyor
  const menu = page.locator('.menu a').first();
  await menu.focus();
  expect(await menu.evaluate((e) => getComputedStyle(e).outlineStyle)).not.toBe('none');
  const demo = page.locator('[data-suru-demo]');
  await demo.locator('[data-dizilim-sec="v"]').focus();
  await page.keyboard.press('Enter');
  await expect(demo).toHaveAttribute('data-dizilim', 'v');
  await demo.locator('[data-artir]').focus();
  await page.keyboard.press('Space');
  await expect(demo).toHaveAttribute('data-sayi', '8');
  await expect(demo.locator('[data-durum]')).toContainText('8');
  // Galeri: Enter ile açılır, ok tuşlarıyla gezilir, Esc ile kapanır, odak fotoğrafa döner
  const ilk = page.locator('[data-galeri] a').first();
  await ilk.focus();
  await page.keyboard.press('Enter');
  const buyutec = page.locator('[data-buyutec]');
  await expect(buyutec).toBeVisible();
  await expect(buyutec).toHaveAttribute('data-sira', '1');
  await page.keyboard.press('ArrowRight');
  await expect(buyutec).toHaveAttribute('data-sira', '2');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(buyutec).not.toHaveAttribute('data-sira', '1');
  await page.keyboard.press('Escape');
  await expect(buyutec).toBeHidden();
});

test('D6 dil ve tema: bölüm korunuyor, çevrilmemiş başlık yok, seçimler yenilemede duruyor', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  const tr = await page.locator('main h2, main h3, .menu a, .dugme').allTextContents();
  await page.locator('#takim').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.getElementById('takim')!.scrollIntoView({ behavior: 'instant' }));
  await bekle(page, 400);
  await page.locator('[data-dil-degistir]').click();
  await expect(page).toHaveURL(/\/en\/#team$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const en = await page.locator('main h2, main h3, .menu a, .dugme').allTextContents();
  const ayni = en.filter((x) => tr.includes(x) && /[a-zçğıöşü]{4}/i.test(x) && !/^(Matris|Finalist|V|Üye|Member)\b/.test(x.trim()));
  expect(ayni).toEqual([]);
  expect(en.join(' ')).not.toMatch(/[ğışİ]/);
  // Tema: varsayılan koyu, düğmeyle açık, yenileyince açık kalıyor
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(10, 10, 11)');
  await page.locator('[data-tema]').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  // Sürü düğmesi: kapatınca tuval gizleniyor ve seçim hatırlanıyor
  await page.locator('[data-suru-dugme]').click();
  await page.reload();
  await expect(page.locator('canvas[data-suru]')).toBeHidden();
  await expect(page.locator('[data-suru-dugme]')).toHaveAttribute('aria-pressed', 'false');
});

test('D6b iki temada da metin okunaklı (karşıtlık en az 4,5)', async ({ page }) => {
  await page.goto('/');
  const olc = () =>
    page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      const renk = (ad: string) => {
        const h = s.getPropertyValue(ad).trim().slice(1);
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const oran = (a: string, b: string) => { const [x, y] = [renk(a), renk(b)].sort((m, n) => n - m); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
      return { metin: oran('--metin', '--zemin'), soluk: oran('--soluk', '--zemin'), solukYuzey: oran('--soluk', '--yuzey'), vurgu: oran('--vurgu', '--zemin'), dugme: oran('--vurgu-ustu', '--vurgu') };
    });
  for (const tema of ['dark', 'light']) {
    await page.evaluate((t) => (document.documentElement.dataset.theme = t), tema);
    const o = await olc();
    console.log('karşıtlık', tema, JSON.stringify(o));
    for (const v of Object.values(o)) expect(v).toBeGreaterThanOrEqual(4.5);
  }
});

test('D9 benzetim: dizilim değişince araçlar yeni dizilime varıyor, araç düşünce boşluk kapanıyor', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const demo = page.locator('[data-suru-demo]');
  await demo.scrollIntoViewIfNeeded();
  await demo.locator('[data-sifirla]').click();
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 8000 });
  // Tuvalden oku: tam boyalı vurgu rengi piksellerin yayılımı ve dikey eksende araç kümeleri.
  const olc = () =>
    demo.locator('canvas').evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      const xs: number[] = [], ys: number[] = [], satir = new Array(c.height).fill(0);
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if (d[i + 3] > 200 && d[i] > 180 && d[i + 2] < 160) { xs.push(x); ys.push(y); satir[y]++; }
      }
      const yay = (v: number[]) => { const o = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - o) ** 2, 0) / v.length); };
      const kumeler: number[] = []; let bas = -1;
      satir.forEach((n, y) => { if (n > 0 && bas < 0) bas = y; if ((n === 0 || y === c.height - 1) && bas >= 0) { kumeler.push((bas + y) / 2); bas = -1; } });
      const aralik = kumeler.slice(1).map((k, i) => k - kumeler[i]);
      return { piksel: xs.length, yayX: +yay(xs).toFixed(1), yayY: +yay(ys).toFixed(1), kume: kumeler.length, enBuyuk: Math.max(...aralik), enKucuk: Math.min(...aralik) };
    });
  const cizgi = await olc();
  console.log('çizgi, 7 araç', JSON.stringify(cizgi));
  expect(cizgi.kume).toBe(7);
  expect(cizgi.yayY / cizgi.yayX).toBeGreaterThan(4);

  await demo.locator('[data-dusur]').click();
  await expect(demo).toHaveAttribute('data-sayi', '6');
  await bekle(page, 1000); // düşen aracın izi silinsin
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 8000 });
  const dustu = await olc();
  console.log('bir araç düştü', JSON.stringify(dustu));
  expect(dustu.kume).toBe(6);
  expect(dustu.enBuyuk / dustu.enKucuk).toBeLessThan(1.25); // boşluk kapandı: aralıklar eşit
  await expect(demo.locator('[data-durum]')).toContainText('6');

  await demo.locator('[data-dizilim-sec="halka"]').click();
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 8000 });
  const halka = await olc();
  console.log('halka', JSON.stringify(halka));
  const oran = halka.yayY / halka.yayX;
  expect(oran).toBeGreaterThan(0.75);
  expect(oran).toBeLessThan(1.33);

  // Engel: sürü engelin öbür yanına geçiyor, hiçbir araç engelin içinde kalmıyor
  await demo.locator('[data-engel-dugme]').click();
  await expect(demo).toHaveAttribute('data-engel', '1');
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 12000 });
});

test('D9b görünmeyen benzetim çalışmıyor', async ({ page }) => {
  await page.goto('/');
  const demo = page.locator('[data-suru-demo]');
  await demo.scrollIntoViewIfNeeded();
  await bekle(page, 600);
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await bekle(page, 500);
  const oku = () => demo.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const a = await oku();
  await bekle(page, 900);
  expect(await oku()).toBe(a);
});

test('D10 bağlantılar: sayfa içi hedefler var, dış bağlantılar doğru adreste, kırık dosya yok', async ({ page, request }) => {
  for (const yol of ['/', '/en/']) {
    await page.goto(yol);
    const baglar = await page.locator('a[href]').evaluateAll((l) => l.map((a) => a.getAttribute('href')!));
    for (const h of new Set(baglar)) {
      if (h.startsWith('#')) expect(await page.locator(`[id="${h.slice(1)}"]`).count(), h).toBe(1);
      else if (h.startsWith('/')) expect((await request.get(h.split('#')[0])).status(), h).toBe(200);
      else expect(h, h).toMatch(/^(mailto:[^@\s]+@[^@\s]+\.[a-z]+$|https:\/\/(www\.)?(instagram|linkedin)\.com\/)/);
    }
  }
  expect((await request.get('/olmayan-sayfa/')).status()).toBe(404);
});

test('E3 üye kartı ayrıntısı düğmeyle açılıyor (ayrıntısı olan üye varsa)', async ({ page }) => {
  await page.goto('/');
  const dugme = page.locator('.uye-ac').first();
  test.skip((await dugme.count()) === 0, 'Henüz ayrıntısı olan üye yok: kartların hepsi şablon');
  await dugme.focus();
  await page.keyboard.press('Enter');
  await expect(dugme).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.uye[data-acik] .uye-ayrinti').first()).toBeVisible();
});
