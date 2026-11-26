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
    await demo.locator('[data-dizilim-sec="v"]').click();
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
  await expect(demo).toHaveAttribute('data-sayi', '6');
  await expect(demo.locator('[data-durum]')).toContainText('6');
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

test('D9 benzetim: dizilime düzgün giriyor, araç düşünce boşluk kapanıyor, lider düşünce yenisi seçiliyor', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const demo = page.locator('[data-suru-demo]');
  await demo.scrollIntoViewIfNeeded();
  await demo.locator('[data-sifirla]').click();
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 8000 });
  // Tuvalden oku. Lider vurgu renginde, takipçiler metin renginde. Yatay eksende araç kümeleri ve aralıkları.
  const olc = () =>
    demo.locator('canvas').evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      const lider: number[][] = [], takipci: number[][] = [], sutun = new Array(c.width).fill(0);
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if (d[i + 3] < 225) continue;
        const sari = d[i] > 200 && d[i + 1] > 160 && d[i + 2] < 150, beyaz = d[i] > 215 && d[i + 1] > 215 && d[i + 2] > 205;
        if (sari) lider.push([x / c.width, y / c.height]);
        else if (beyaz) takipci.push([x / c.width, y / c.height]);
        if (sari || beyaz) sutun[x]++;
      }
      const ort = (v: number[][], k: number) => +(v.reduce((a, b) => a + b[k], 0) / (v.length || 1)).toFixed(3);
      const yay = (v: number[][], k: number) => { const o = ort(v, k); return +Math.sqrt(v.reduce((a, b) => a + (b[k] - o) ** 2, 0) / (v.length || 1)).toFixed(3); };
      // Boyalı sütun dizileri. Bir aracın ince kolları arasında kalan kısa boşluklar aynı araç sayılır.
      const parca: number[][] = []; let bas = -1;
      sutun.forEach((n, x) => { if (n > 0 && bas < 0) bas = x; if ((n === 0 || x === c.width - 1) && bas >= 0) { parca.push([bas, x]); bas = -1; } });
      const birles = 8 * (c.width / c.clientWidth), araclar: number[][] = [];
      for (const p of parca) { const son = araclar[araclar.length - 1]; if (son && p[0] - son[1] < birles) son[1] = p[1]; else araclar.push([...p]); }
      const kumeler = araclar.map(([a, b]) => (a + b) / 2);
      const aralik = kumeler.slice(1).map((k, i) => k - kumeler[i]);
      const hepsi = [...lider, ...takipci];
      return { ly: ort(lider, 1), ty: ort(takipci, 1), yayX: yay(hepsi, 0), yayY: yay(hepsi, 1), kume: kumeler.length, enBuyuk: Math.max(...aralik), enKucuk: Math.min(...aralik) };
    });
  // Çizgi: 5 araç yan yana, aralıklar eşit
  const cizgi = await olc();
  console.log('çizgi, 5 araç', JSON.stringify(cizgi));
  expect(cizgi.kume).toBe(5);
  expect(cizgi.yayX / cizgi.yayY).toBeGreaterThan(4);
  expect(cizgi.enBuyuk / cizgi.enKucuk).toBeLessThan(1.15);

  // V: takipçiler liderin önünde (sürü yukarı bakıyor).
  await demo.locator('[data-dizilim-sec="v"]').click();
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 8000 });
  const v = await olc();
  console.log('V', JSON.stringify(v));
  expect(v.ly - v.ty).toBeGreaterThan(0.03);
  // Ok başı: takipçiler liderin arkasında
  await demo.locator('[data-dizilim-sec="ok"]').click();
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 8000 });
  const ok = await olc();
  console.log('ok başı', JSON.stringify(ok));
  expect(ok.ty - ok.ly).toBeGreaterThan(0.03);

  // Bir araç düşüyor: kalan 4 araç yeniden eşit aralıklı çizgi
  await demo.locator('[data-dizilim-sec="cizgi"]').click();
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 8000 });
  await demo.locator('[data-dusur]').click();
  await expect(demo).toHaveAttribute('data-sayi', '4');
  await bekle(page, 1000); // düşen aracın izi silinsin
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 8000 });
  const dustu = await olc();
  console.log('bir araç düştü', JSON.stringify(dustu));
  expect(dustu.kume).toBe(4);
  expect(dustu.enBuyuk / dustu.enKucuk).toBeLessThan(1.15);
  await expect(demo.locator('[data-durum]')).toContainText('4');

  // Lider düşüyor: en küçük numaralı araç lider oluyor, sürü onun çevresinde yeniden diziliyor
  const eski = await demo.getAttribute('data-lider');
  await demo.locator('[data-artir]').click();
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 8000 });
  await demo.locator('[data-lider-dusur]').click();
  const yeni = await demo.getAttribute('data-lider');
  expect(yeni).not.toBe(eski);
  await expect(demo.locator('[data-durum]')).toContainText(`(${yeni})`);
  await bekle(page, 1000);
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 8000 });
  const lider = await olc();
  console.log('yeni liderle', JSON.stringify(lider));
  expect(lider.kume).toBe(4);
  expect(lider.enBuyuk / lider.enKucuk).toBeLessThan(1.15);

  // Engel: sürü engelin öbür yanına geçip yeniden yerleşiyor
  await demo.locator('[data-engel-dugme]').click();
  await expect(demo).toHaveAttribute('data-engel', '1');
  await expect(demo).toHaveAttribute('data-oturdu', '1', { timeout: 12000 });
});

test('D9c arka plan sürüsü: yabancı sürü geliyor, önleniyor, sürü yeniden dizilime giriyor', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?baskin'); // yabancı sürüyü 1,5 sn sonra çağırır
  const tuval = page.locator('canvas[data-suru]');
  await expect(tuval).toHaveAttribute('data-onleme', '1', { timeout: 6000 });
  // Yabancı renkte piksel var mı (kırmızı tonu)
  const kirmizi = () => tuval.evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 120 && d[i] > 200 && d[i + 1] < 140 && d[i + 2] < 130) n++;
    return n;
  });
  await expect.poll(kirmizi, { timeout: 5000 }).toBeGreaterThan(30);
  // Dağınıkken gelen yabancıya karşı önce dizilime giriliyor, dizilimle hücum ediliyor, sonra tek tek kovalanıyor
  const bas = Date.now();
  await expect(tuval).toHaveAttribute('data-onleme', '0', { timeout: 25000 });
  console.log('önleme süresi', Date.now() - bas, 'ms')
  expect(await tuval.getAttribute('data-fazlar')).toBe('topla>hucum>kovala');
  await bekle(page, 800); // son parlama sönsün
  expect(await kirmizi()).toBe(0);
});

test('D9e arka plan sürüsü: serbest dolaşan araçlar ekranda toplanıyor, dizilim kuruyor, sonra dağılıyor', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?dizilim'); // ilk dizilimi 1,2 sn sonra çağırır
  await page.evaluate(() => scrollTo(0, 2400));
  const tuval = page.locator('canvas[data-suru]');
  await expect(tuval).toHaveAttribute('data-mod', 'toplan', { timeout: 6000 });
  const gorunen = Number(await tuval.getAttribute('data-gorunen')), uye = Number(await tuval.getAttribute('data-uye'));
  console.log('görünen', gorunen, 'katılan', uye);
  expect(uye).toBeGreaterThanOrEqual(Math.max(5, Math.min(12, gorunen)));
  expect(uye).toBeLessThanOrEqual(12);
  await expect(tuval).toHaveAttribute('data-mod', 'dizilim', { timeout: 9000 });
  await expect(tuval).toHaveAttribute('data-mod', 'serbest', { timeout: 40_000 });
  await expect(tuval).toHaveAttribute('data-uye', '0');
});

test('D9f arka plan sürüsü: dizilim sürerken yenileri boş yuvaya katılıyor, sürüdekiler yerinden kıpırdamıyor, dolunca en eski ayrılıyor', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?dizilim');
  await page.evaluate(() => scrollTo(0, 1200));
  const tuval = page.locator('canvas[data-suru]');
  await expect(tuval).toHaveAttribute('data-mod', 'dizilim', { timeout: 12000 });
  const lider = await tuval.getAttribute('data-lider');
  // Sayfada izle: sürüde kalan bir İHA'nın yuvası, dizilim değişimi dışında hiç değişmemeli. Lider hep aynı.
  await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('canvas[data-suru]')!, w = window as any;
    w.__ihlal = 0; w.__lider = new Set();
    let once = new Map<string, string>(), onceAdim = '';
    w.__izci = setInterval(() => {
      const d = c.dataset, simdi = new Map((d.yuvalar || '').split(',').filter(Boolean).map((p) => p.split(':') as [string, string]));
      if (d.mod === 'dizilim') w.__lider.add(d.lider);
      if (d.adim !== 'degis' && onceAdim !== 'degis') for (const [i, s] of simdi) if (once.has(i) && once.get(i) !== s) w.__ihlal++;
      once = simdi; onceAdim = d.adim || '';
    }, 30);
  });
  for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, 700); await bekle(page, 250); }
  await expect.poll(async () => Number(await tuval.getAttribute('data-katilan')), { timeout: 5000 }).toBeGreaterThan(0);
  await expect(tuval).toHaveAttribute('data-disarida', '0', { timeout: 5000 });
  const sonuc = await page.evaluate(() => { const w = window as any; clearInterval(w.__izci); return { ihlal: w.__ihlal, liderler: [...w.__lider] }; });
  const uye = Number(await tuval.getAttribute('data-uye'));
  console.log('kaydırma sonrası', JSON.stringify({ uye, lider, ...sonuc, katilan: await tuval.getAttribute('data-katilan'), ayrilan: await tuval.getAttribute('data-ayrilan') }));
  expect(sonuc.ihlal).toBe(0);
  expect(sonuc.liderler).toEqual([lider]);
  expect(uye).toBeGreaterThanOrEqual(5);
  expect(uye).toBeLessThanOrEqual(12);
  // Sürü 12'yi aşınca en eski ayrılıyor: katılan sayısı ile sürü büyüklüğü tutarlı
  const katilan = Number(await tuval.getAttribute('data-katilan')), ayrilan = Number(await tuval.getAttribute('data-ayrilan'));
  expect(ayrilan).toBe(Math.max(0, katilan - (uye - Number(await tuval.getAttribute('data-ilk')))));
});

test('D9d takım: üyeler dallarında, adı izinsiz görünmüyor, süzgeç öteki ekipleri söndürüyor', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const ekipler = page.locator('[data-ekipler] > li');
  await expect(ekipler).toHaveCount(3);
  // Her üye kartı bir dalın içinde ya da ekip kutularının üstünde. Yerleşmemiş kayıtlar ayrı sırada.
  const uyeler = await page.locator('.uye').count(), bekleyen = await page.locator('.bekleyenler li').count();
  expect(uyeler + bekleyen).toBe(17);
  // İzni olmayan üyenin adı yok: kartta "İsim yakında" yazıyor
  const adsiz = page.locator('.uye.adsiz');
  expect(await adsiz.count()).toBeGreaterThan(0);
  await expect(adsiz.first()).toContainText(/İsim yakında/);
  await page.locator('[data-suzgec] button[data-ekip="yazilim"]').click();
  await expect(page.locator('[data-ekipler] > li[data-ekip="yazilim"]')).not.toHaveAttribute('data-sonuk', '');
  await expect(page.locator('[data-ekipler] > li[data-ekip="mekanik"]')).toHaveAttribute('data-sonuk', '');
  await expect.poll(() => page.locator('[data-ekipler] > li[data-ekip="mekanik"]').evaluate((e) => +getComputedStyle(e).opacity)).toBeLessThan(0.5);
  // Dal katlanıp açılıyor
  const dal = page.locator('.dal details').first();
  await dal.locator('summary').click();
  await expect(dal).not.toHaveAttribute('open', '');
  await dal.locator('summary').click();
  await expect(dal).toHaveAttribute('open', '');
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
  for (const yol of ['/', '/en/', '/suru-iha/', '/en/swarm/']) {
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

test.describe('D14 Sürü İHA sayfası', () => {
  test('iki dilde açılıyor, taşma yok, hata yok, ana sayfadan ve menüden ulaşılıyor', async ({ page }) => {
    const hatalar: string[] = [];
    page.on('pageerror', (e) => hatalar.push(e.message));
    await page.setViewportSize({ width: 320, height: 800 });
    for (const yol of ['/suru-iha/', '/en/swarm/']) {
      await page.goto(yol);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await bekle(page, 300);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      expect(await page.locator('[data-tarama], [data-roller], [data-gorev], [data-konsol], [data-lider-sahne], [data-geometri]').count()).toBe(6);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.locator('.ayrintili a').click();
    await expect(page).toHaveURL(/\/suru-iha\/$/);
    await expect(page.locator('.menu a[aria-current="page"]')).toHaveText('Sürü İHA');
    await page.locator('a[data-dil-degistir]').click();
    await expect(page).toHaveURL(/\/en\/swarm\/$/);
    expect(hatalar).toEqual([]);
  });

  test('Görev 1 baştan sona: QR sırası doğru, komutlar uygulanıyor, sürü iniyor', async ({ page }) => {
    await page.goto('/suru-iha/');
    const g = page.locator('[data-gorev]');
    await g.scrollIntoViewIfNeeded();
    await page.locator('[data-gorev] [data-hiz="4"]').click();
    await page.locator('[data-gorev] [data-oynat]').click();
    await expect(g).toHaveAttribute('data-okunan', '1', { timeout: 15000 });
    await expect(page.locator('[data-gorev] [data-qr-json]')).toContainText('"frm","v",8');
    await expect(g).toHaveAttribute('data-faz', 'bitti', { timeout: 60000 });
    await expect(g).toHaveAttribute('data-okunan', '1,3,4,5,2');
    await expect(g).toHaveAttribute('data-tip', 'OKBASI');
    await expect(page.locator('[data-gorev] li[data-adim].bitti')).toHaveCount(7);
  });

  test('tarama biter, düşen İHA’nın işini kalanlar üstlenir, tek İHA düşerse yarım kalır', async ({ page }) => {
    await page.goto('/suru-iha/');
    const t = page.locator('[data-tarama]');
    await t.scrollIntoViewIfNeeded();
    await page.locator('[data-tarama] [data-basla]').click();
    await bekle(page, 1500);
    await page.locator('[data-tarama] [data-dusur]').click();
    await expect(t).toHaveAttribute('data-dusen', '1');
    await expect(t).toHaveAttribute('data-durum', 'bitti', { timeout: 40000 });
    await expect(t).toHaveAttribute('data-oran', '100');
    await page.locator('[data-tarama] [data-basla]').click();
    await page.locator('[data-tarama] [data-azalt]').click();
    await page.locator('[data-tarama] [data-azalt]').click();
    await expect(t).toHaveAttribute('data-sayi', '1');
    await page.locator('[data-tarama] [data-basla]').click();
    await bekle(page, 2000);
    await page.locator('[data-tarama] [data-dusur]').click();
    await expect(t).toHaveAttribute('data-durum', 'yarim', { timeout: 5000 });
  });

  test('konsol: komutlar doğru anda kabul ediliyor, paket doğru', async ({ page }) => {
    await page.goto('/suru-iha/');
    const k = page.locator('[data-konsol]'), paket = page.locator('[data-konsol] [data-paket]');
    await k.scrollIntoViewIfNeeded();
    const bas = (s: string) => page.locator(`[data-konsol] ${s}`).click();
    await bas('[data-k="ALTITUDE"][data-arg="2"]');
    await expect(k).toHaveAttribute('data-havada', '0');
    await bas('[data-k="TAKEOFF"]');
    await expect(paket).toContainText('"cmd":"TAKEOFF"');
    await bas('[data-k="ALTITUDE"][data-arg="2"]');
    await expect(paket).toHaveText('{"cmd":"ALTITUDE","altitude":10}');
    await bas('[data-k="FORMATION"][data-arg="V"]');
    await expect(k).toHaveAttribute('data-tip', 'V');
    await bas('[data-k="SEPARATE"][data-arg="b"]');
    await expect(paket).toContainText('"color":"MAVI"');
    await expect(k).toHaveAttribute('data-ayrilma', 'BEKLE', { timeout: 20000 });
    await bas('[data-k="STAY_GROUNDED"]');
    await expect(k).toHaveAttribute('data-bos-yuva', '2');
    await bas('[data-k="SUBSTITUTE"]');
    await expect(paket).toContainText('"cmd":"SUBSTITUTE","drone_id":3,"slot":2');
    await expect(k).toHaveAttribute('data-yedek', 'dizide');
    await bas('[data-k="DISARM"]');
    await expect(paket).toContainText('SUBSTITUTE');
  });

  test('lider arızasında kademeli zaman aşımıyla İHA 1 lider oluyor ve sürü eve iniyor', async ({ page }) => {
    await page.goto('/suru-iha/');
    const l = page.locator('[data-lider-sahne]');
    await l.scrollIntoViewIfNeeded();
    await page.locator('[data-lider-sahne] [data-ariza]').click();
    await expect(l).toHaveAttribute('data-faz', 'ariza');
    await bekle(page, 4000);
    await expect(l).toHaveAttribute('data-faz', 'ariza');
    await expect(l).toHaveAttribute('data-lider', '1', { timeout: 5000 });
    await expect(l).toHaveAttribute('data-faz', 'evde', { timeout: 25000 });
  });

  test('planlı devirde (HANDOFF) görev sürüyor, eski lider ayrılıp iniyor', async ({ page }) => {
    await page.goto('/suru-iha/');
    const l = page.locator('[data-lider-sahne]');
    await l.scrollIntoViewIfNeeded();
    await page.locator('[data-lider-sahne] [data-devir]').click();
    await expect(l).toHaveAttribute('data-lider', '1');
    await expect(page.locator('[data-lider-sahne] [data-paket]')).toContainText('"new_leader_id":1');
    await expect(l).toHaveAttribute('data-faz', 'devir-son', { timeout: 25000 });
  });

  test('geometri tablosu ofsetleri ve döndürmeyi doğru hesaplıyor', async ({ page }) => {
    await page.goto('/suru-iha/');
    const satir = (n: number) => page.locator(`[data-geometri] tbody tr:nth-child(${n + 1}) td`).allTextContents();
    expect(await satir(1)).toEqual(['1', '(8.0, 8.0)', '(-8.0, 8.0)', '+0.0 m']);
    await page.locator('[data-geometri] [data-tip="CIZGI"]').click();
    await page.locator('#g-yon').fill('0');
    expect(await satir(2)).toEqual(['2', '(0.0, -8.0)', '(0.0, -8.0)', '+0.0 m']);
    await page.locator('#g-pitch').fill('10');
    await page.locator('[data-geometri] [data-tip="V"]').click();
    // V, 5 İHA: ileri ofsetlerin ortalaması 9,6. Yuva 0 merkezin 9,6 m gerisinde: +9,6 · tan10° · 2 = +3,4 m
    expect((await satir(0))[3]).toBe('+3.4 m');
  });

  test('hareketi azalt: hiçbir sahne kendiliğinden oynamıyor, adım düğmesi tek adımı bitiriyor', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/suru-iha/');
    const g = page.locator('[data-gorev]');
    await g.scrollIntoViewIfNeeded();
    await page.locator('[data-gorev] [data-sonraki]').click();
    await expect(g).toHaveAttribute('data-adim-no', '1');
    await page.locator('[data-gorev] [data-sonraki]').click();
    await expect(g).toHaveAttribute('data-okunan', '1');
    await expect(g).toHaveAttribute('data-adim-no', '2');
  });

  test('betik kapalıyken rollerin yazılı anlatımı görünüyor', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/suru-iha/');
    await expect(page.locator('.roller-yazi')).toBeVisible();
    await expect(page.locator('[data-gorev]')).toBeHidden();
    await ctx.close();
  });
});
