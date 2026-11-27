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
    await expect(page.locator('[data-ekipler] > li').first()).toBeVisible();
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

test('D9e arka plan sürüsü: görünen araçlar üçerli sürülere ayrılıyor, planlarını izliyor, sonra herkes dağılıyor', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?dizilim'); // ilk dizilimi 1,2 sn sonra çağırır
  await page.evaluate(() => scrollTo(0, 2400));
  const tuval = page.locator('canvas[data-suru]');
  await expect(tuval).toHaveAttribute('data-mod', 'toplan', { timeout: 6000 });
  const gorunen = Number(await tuval.getAttribute('data-gorunen')), uye = Number(await tuval.getAttribute('data-uye'));
  const gruplar = ((await tuval.getAttribute('data-suruler')) ?? '').split(';').map((g) => g.split(':')[1].split('.').length);
  console.log('görünen', gorunen, 'katılan', uye, 'sürüler', JSON.stringify(gruplar));
  expect(uye).toBeGreaterThanOrEqual(Math.max(3, Math.min(12, gorunen) - 1));
  expect(uye).toBeLessThanOrEqual(12);
  expect(gruplar.length).toBeLessThanOrEqual(4);
  for (const g of gruplar) expect(g).toBeLessThanOrEqual(3);
  // Tam sürülerin hepsi üçlü: yalnızca sonuncusu eksik kalabilir
  expect(gruplar.filter((g) => g < 3).length).toBeLessThanOrEqual(1);
  await expect(tuval).toHaveAttribute('data-mod', 'dizilim', { timeout: 9000 });
  await expect(tuval).toHaveAttribute('data-mod', 'serbest', { timeout: 45_000 });
  await expect(tuval).toHaveAttribute('data-uye', '0');
});

test('D9f arka plan sürüsü: eksik sürüye yeni gelen katılıyor, kimse ayrılmıyor, sürüdekiler kıpırdamıyor, dağılınca herkes bölgesine dönüyor', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?dizilim=5'); // beş araç: üçlü bir sürü ve boş yuvası olan ikili bir sürü
  const tuval = page.locator('canvas[data-suru]');
  // Sürü kurulmadan önce izleyici kurulur: sürülerin üyeleri, boyutları ve yuvaları 30 ms'de bir okunur.
  await page.evaluate(() => {
    scrollTo(0, 1200);
    const c = document.querySelector<HTMLCanvasElement>('canvas[data-suru]')!, w = window as any;
    w.__ihlal = 0; w.__azalan = 0; w.__buyuk = 0; w.__tamam = 0; w.__ikili = 0; w.__liderler = new Set();
    let once = new Map<string, string[]>(), oncekiYuva = new Map<string, string>(), onceAdim = '';
    w.__izci = setInterval(() => {
      const d = c.dataset;
      const gruplar = new Map((d.suruler || '').split(';').filter(Boolean).map((g) => { const [id, l] = g.split(':'); return [id, (l || '').split('.').filter(Boolean)] as [string, string[]]; }));
      for (const [id, uy] of gruplar) {
        if (uy.length > 3) w.__buyuk++;
        if (uy.length === 2) w.__ikili++;
        const eski = once.get(id);
        if (eski) { if (!eski.every((i) => uy.includes(i))) w.__azalan++; if (eski.length < 3 && uy.length === 3) w.__tamam++; }
      }
      (d.lider || '').split(',').filter(Boolean).forEach((l) => w.__liderler.add(l));
      const simdi = new Map((d.yuvalar || '').split(',').filter(Boolean).map((p) => p.split(':') as [string, string]));
      const degisim = (d.adim || '').includes('degis') || onceAdim.includes('degis');
      if (!degisim) for (const [i, s] of simdi) if (oncekiYuva.has(i) && oncekiYuva.get(i) !== s) w.__ihlal++;
      once = gruplar; oncekiYuva = simdi; onceAdim = d.adim || '';
    }, 30);
  });
  await expect(tuval).toHaveAttribute('data-mod', /toplan|dizilim/, { timeout: 20_000 });
  for (let k = 0; k < 7; k++) { await page.mouse.wheel(0, 700); await bekle(page, 250); }
  await expect.poll(async () => Number(await tuval.getAttribute('data-katilan')), { timeout: 8000 }).toBeGreaterThan(0);
  await expect(tuval).toHaveAttribute('data-mod', 'serbest', { timeout: 60_000 });
  const sonuc = await page.evaluate(() => { const w = window as any; clearInterval(w.__izci); return { ihlal: w.__ihlal, azalan: w.__azalan, buyuk: w.__buyuk, tamam: w.__tamam, ikili: w.__ikili, liderler: w.__liderler.size }; });
  console.log('sürü izi', JSON.stringify(sonuc), 'katılan', await tuval.getAttribute('data-katilan'), 'dağılan', await tuval.getAttribute('data-dagilan'));
  expect(sonuc.ikili).toBeGreaterThan(0);  // eksik sürü göründü
  expect(sonuc.tamam).toBeGreaterThan(0);  // yeni gelen eksik sürüyü üçe tamamladı
  expect(sonuc.buyuk).toBe(0);             // hiçbir sürü üçü aşmadı
  expect(sonuc.azalan).toBe(0);            // kimse sürüsünden ayrılmadı
  expect(sonuc.ihlal).toBe(0);             // sürüdekilerin yuvası kıpırdamadı
  await expect(tuval).toHaveAttribute('data-uye', '0');
  expect(Number(await tuval.getAttribute('data-dagilan'))).toBeGreaterThanOrEqual(2);
  // Formasyon bozulunca herkes kendi bölgesine döndü
  await expect(tuval).toHaveAttribute('data-evde-degil', '0', { timeout: 30_000 });
});

test('D9d takım özeti: ana sayfada üç ekip kartı, üye adı ve kartı yok, ayrıntı Takım sayfasında', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const ekipler = page.locator('[data-ekipler] > li');
  await expect(ekipler).toHaveCount(3);
  await expect(ekipler.locator('.ekip-sayi')).toHaveText(['9 kişi', '3 kişi', '4 kişi']);
  expect(await ekipler.locator('.etiketler li').count()).toBe(10);
  await expect(page.locator('#takim .uye, #takim [data-suzgec]')).toHaveCount(0);
  await expect(page.locator('#takim .ayrintili a')).toHaveAttribute('href', '/takim/');
  // Ana sayfa kısa tutuluyor: ihtiyaç listesi ve başarı çizgisi ayrıntı sayfalarında
  await expect(page.locator('main .ihtiyac, main [data-cizgi]')).toHaveCount(0);
  await expect(page.locator('#iletisim a[href="mailto:matristechnology@gmail.com"]')).toBeVisible();
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
  test.setTimeout(120000); // on iki sayfa ve her birindeki bağlantılar: canlı adreste 30 saniyeyi aşabiliyor
  for (const yol of ['/', '/en/', '/suru-iha/', '/en/swarm/', '/matris/', '/en/matris/', '/takim/', '/en/team/', '/calismalar/', '/en/work/', '/galeri/', '/en/gallery/', '/destek/', '/en/support/', '/iletisim/', '/en/contact/', '/sss/', '/en/faq/']) {
    await page.goto(yol);
    const baglar = await page.locator('a[href]').evaluateAll((l) => l.map((a) => a.getAttribute('href')!));
    for (const h of new Set(baglar)) {
      if (h.startsWith('#')) expect(await page.locator(`[id="${h.slice(1)}"]`).count(), h).toBe(1);
      else if (h.startsWith('/')) expect((await request.get(h.split('#')[0])).status(), h).toBe(200);
      else expect(h, h).toMatch(/^(mailto:[^@\s?]+@[^@\s?]+\.[a-z]+(\?subject=[^\s]*)?$|https:\/\/(www\.)?(instagram|linkedin)\.com\/|https:\/\/www\.openstreetmap\.org\/\?mlat=|https:\/\/www\.google\.com\/maps\/dir\/)/);
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
      expect(await page.locator('[data-tarama], [data-roller], [data-gorev], [data-konsol], [data-lider-sahne], [data-mesh], [data-geometri]').count()).toBe(7);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.locator('.ayrintili a[href="/suru-iha/"]').click();
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

  test('tarama: tek İHA ile sürü aynı anda başlıyor, sürü önce bitiriyor, düşen İHA’nın işini kalanlar alıyor', async ({ page }) => {
    test.setTimeout(90000); // tek İHA alanı yaklaşık 34 sn'de tarıyor
    await page.goto('/suru-iha/');
    const t = page.locator('[data-tarama]');
    await t.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-tarama] canvas')).toHaveCount(2);
    await page.locator('[data-tarama] [data-azalt]').click();
    await expect(t).toHaveAttribute('data-sayi', '3');
    await page.locator('[data-tarama] [data-basla]').click();
    await expect(t).toHaveAttribute('data-tek', 'surer');
    await expect(t).toHaveAttribute('data-suru', 'surer');
    await bekle(page, 1500);
    await page.locator('[data-tarama] [data-dusur]').click();
    await expect(t).toHaveAttribute('data-dusen', '1');
    await expect(t).toHaveAttribute('data-suru', 'bitti', { timeout: 40000 });
    await expect(t).toHaveAttribute('data-suru-oran', '100');
    // Sürü bitirdiğinde tek İHA hâlâ tarıyor olmalı.
    await expect(t).toHaveAttribute('data-tek', 'surer');
    await expect(t).toHaveAttribute('data-tek', 'bitti', { timeout: 40000 });
    const [tekSure, suruSure] = [Number(await t.getAttribute('data-tek-sure')), Number(await t.getAttribute('data-suru-sure'))];
    console.log(`tarama: sürü ${suruSure} sn (biri düştü), tek İHA ${tekSure} sn`);
    expect(tekSure).toBeGreaterThan(suruSure * 1.2);
    // Tek İHA düşerse iş yarım kalır.
    await page.locator('[data-tarama] [data-basla]').click();
    await page.locator('[data-tarama] [data-basla]').click();
    await bekle(page, 2500);
    await page.locator('[data-tarama] [data-dusur-tek]').click();
    await expect(t).toHaveAttribute('data-tek', 'yarim');
    await expect(page.locator('[data-tarama] [data-panel="tek"]')).toHaveAttribute('data-yarim', '');
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

  test('mesh ağ: menzil dışındaki İHA’ya paket aradan atlayarak ulaşıyor, tamamen uzaklaşan kopuyor', async ({ page }) => {
    await page.goto('/suru-iha/');
    const m = page.locator('[data-mesh]');
    await m.scrollIntoViewIfNeeded();
    await expect(m).toHaveAttribute('data-secili', '4');
    await expect(m).toHaveAttribute('data-atlama', '2');
    await expect(page.locator('[data-mesh] [data-durum]')).toContainText('İHA 2');
    await page.locator('[data-mesh] [data-yakin]').click();
    await page.locator('[data-mesh] [data-yakin]').click();
    await page.locator('[data-mesh] [data-yakin]').click();
    await expect(m).toHaveAttribute('data-atlama', '1');
    await page.locator('[data-mesh] [data-sifirla]').click();
    await expect(m).toHaveAttribute('data-atlama', '2');
    for (let i = 0; i < 3; i++) await page.locator('[data-mesh] [data-uzak]').click();
    await expect(m).toHaveAttribute('data-atlama', '-1');
    await expect(m).toHaveAttribute('data-kopuk', '1');
    await page.locator('[data-mesh] [data-zincir]').click();
    await expect(m).toHaveAttribute('data-atlama', '4');
    await expect(m).toHaveAttribute('data-kopuk', '0');
    await page.locator('[data-mesh] [data-sec="2"]').click();
    await expect(m).toHaveAttribute('data-atlama', '2');
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

test.describe('D15 Matris sayfası', () => {
  test('iki dilde açılıyor, taşma yok, hata yok, ana sayfadan ve menüden ulaşılıyor', async ({ page }) => {
    const hatalar: string[] = [];
    page.on('pageerror', (e) => hatalar.push(e.message));
    await page.setViewportSize({ width: 320, height: 800 });
    for (const yol of ['/matris/', '/en/matris/']) {
      await page.goto(yol);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await bekle(page, 300);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      expect(await page.locator('[data-iha-ici], [data-hikaye]').count()).toBe(2);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.locator('.ayrintili a[href="/matris/"]').click();
    await expect(page).toHaveURL(/\/matris\/$/);
    await expect(page.locator('.menu a[aria-current="page"]')).toHaveText('Matris');
    await page.locator('a[data-dil-degistir]').click();
    await expect(page).toHaveURL(/\/en\/matris\/$/);
    expect(hatalar).toEqual([]);
  });

  test('İHA’nın içi: parça seçiliyor, parçalara ayrılıyor, hatlar gösteriliyor, tuval boyanıyor', async ({ page }) => {
    test.setTimeout(90000); // Chromium'da yazılımla çizilen 3B model makine yüklüyken yavaş açılıyor
    await page.goto('/matris/');
    const i = page.locator('[data-iha-ici]');
    await i.scrollIntoViewIfNeeded();
    await expect(i).toHaveAttribute('data-hazir', '1', { timeout: 20000 });
    expect(Number(await i.getAttribute('data-ucgen'))).toBeGreaterThan(20000);
    await expect(page.locator('[data-iha-ici] [data-durum]')).not.toBeEmpty();
    await page.locator('[data-iha-ici] [data-parca="otopilot"]').click();
    await expect(i).toHaveAttribute('data-secili', 'otopilot');
    await expect(page.locator('[data-parca-panel]')).toContainText('Pixhawk 2.4.8');
    // Seçilen parçanın bağlı olduğu parçalar listelenir, birine basınca o parçaya geçilir.
    await expect(page.locator('[data-parca-panel] [data-git]')).toHaveCount(6);
    await page.locator('[data-parca-panel] [data-git="gps"]').click();
    await expect(i).toHaveAttribute('data-secili', 'gps');
    await page.locator('[data-iha-ici] [data-parca="otopilot"]').click();
    await page.locator('[data-iha-ici] [data-ac]').click();
    await expect(i).toHaveAttribute('data-acik', '1');
    await expect(page.locator('[data-iha-ici] [data-ac]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-iha-ici] [data-hat="guc"]').click();
    await expect(i).toHaveAttribute('data-hat', 'guc');
    await expect(i).toHaveAttribute('data-secili', '');
    await expect(page.locator('[data-iha-ici] [data-durum]')).toContainText('UBEC');
    await bekle(page, 600);
    const boyali = await page.locator('[data-iha-ici] canvas').evaluate((t: HTMLCanvasElement) => {
      // Çizim WebGL ile yapılıyor, pikselleri okumak için 2B bir tuvale kopyalanır.
      const k = document.createElement('canvas'); k.width = t.width; k.height = t.height;
      const c = k.getContext('2d')!; c.drawImage(t, 0, 0);
      const v = c.getImageData(0, 0, k.width, k.height).data;
      let n = 0;
      for (let k = 3; k < v.length; k += 4) if (v[k] > 40) n++;
      return n / (v.length / 4);
    });
    console.log(`İHA çizimi: tuvalin %${(boyali * 100).toFixed(1)} kadarı boyalı`);
    expect(boyali).toBeGreaterThan(0.08);
    // Tuvalin ortasına tıklayınca bir parça seçilir.
    await page.locator('[data-iha-ici] [data-ac]').click();
    await bekle(page, 1200);
    const k = (await page.locator('[data-iha-ici] canvas').boundingBox())!;
    await page.mouse.click(k.x + k.width / 2, k.y + k.height / 2);
    await expect(i).not.toHaveAttribute('data-secili', '');
  });

  test('ana sayfada İHA’nın kısa hali var: parça seçiliyor, hat düğmeleri yok', async ({ page }) => {
    await page.goto('/');
    const i = page.locator('[data-iha-ici]');
    await i.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-iha-ici] [data-hat]')).toHaveCount(0);
    await page.locator('[data-iha-ici] [data-parca="kamera"]').click();
    await expect(page.locator('[data-parca-panel]')).toContainText('Global Shutter');
  });

  test('hikâye: durak tıklanınca yalnızca o panel görünüyor, ok tuşları ve düğmeler geziyor', async ({ page }) => {
    await page.goto('/matris/');
    const h = page.locator('[data-hikaye]');
    await h.scrollIntoViewIfNeeded();
    await expect(page.locator('.hikaye-panel:visible')).toHaveCount(1);
    await page.locator('#durak-4').click();
    await expect(h).toHaveAttribute('data-no', '4');
    await expect(page.locator('.hikaye-panel:visible')).toContainText('93');
    await page.keyboard.press('ArrowRight');
    await expect(h).toHaveAttribute('data-no', '5');
    await expect(page.locator('#durak-5')).toBeFocused();
    await page.locator('[data-hikaye] [data-onceki]').click();
    await expect(h).toHaveAttribute('data-no', '4');
    await expect(page.locator('.hikaye-panel:visible')).toHaveCount(1);
  });

  test('sayılar sayarak doluyor ve doğru değerde duruyor', async ({ page }) => {
    await page.goto('/matris/');
    await page.locator('.sayilar').scrollIntoViewIfNeeded();
    await bekle(page, 1600);
    const d = await page.locator('[data-say]').evaluateAll((l) => l.map((e) => [e.textContent, (e as HTMLElement).dataset.say]));
    expect(d.length).toBeGreaterThanOrEqual(4);
    for (const [yazi, hedef] of d) expect(yazi).toBe(hedef);
  });

  test('hareketi azalt: İHA kendiliğinden dönmüyor, parçalara ayırma anında oluyor', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/matris/');
    const i = page.locator('[data-iha-ici]');
    await i.scrollIntoViewIfNeeded();
    await expect(i).toHaveAttribute('data-hazir', '1', { timeout: 20000 });
    const oku = () => page.locator('[data-iha-ici] canvas').evaluate((t: HTMLCanvasElement) => t.toDataURL().length + ':' + t.toDataURL().slice(-80));
    const a = await oku();
    await bekle(page, 700);
    expect(await oku()).toBe(a);
    await page.locator('[data-iha-ici] [data-ac]').click();
    await expect(i).toHaveAttribute('data-acik', '1');
    expect(await oku()).not.toBe(a);
  });

  test('betik kapalıyken bütün duraklar ve parçaların yazılı listesi görünüyor', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/matris/');
    expect(await page.locator('.hikaye-panel:visible').count()).toBeGreaterThan(3);
    await expect(page.locator('.parca-yazi')).toBeVisible();
    await expect(page.locator('[data-iha-ici]')).toBeHidden();
    await ctx.close();
  });
});

test.describe('D16 Takım sayfası', () => {
  test('sayfa iki dilde açılır, ana sayfadan bağlantı var, 320 pikselde taşmaz', async ({ page }) => {
    for (const yol of ['/takim/', '/en/team/']) {
      await page.goto(yol);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-kart]')).toHaveCount(17);
    }
    await page.goto('/');
    await expect(page.locator('.ayrintili a[href="/takim/"]')).toBeVisible();
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/takim/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test('şema: kutuya basınca anlatım açılır, yol yanar, üyeleri göster kartları süzer', async ({ page }) => {
    await page.goto('/takim/');
    const s = page.locator('[data-sema]');
    await expect(s).toHaveAttribute('data-secili', 'kaptan');
    await s.locator('[data-dugum="dal:goruntu"]').click();
    await expect(s.locator('[data-sema-panel]')).toContainText('OpenCV');
    await expect(s.locator('[data-dugum="ekip:yazilim"]')).toHaveAttribute('data-yolda', '');
    await expect(s.locator('[data-dugum="ekip:mekanik"]')).not.toHaveAttribute('data-yolda', '');
    await s.locator('[data-goster]').click();
    const k = page.locator('[data-kadro]');
    await expect(k).toHaveAttribute('data-gorunen', '2');
    await expect(k).toHaveAttribute('data-dal', 'goruntu');
    await expect(page.locator('[data-kart]:visible')).toHaveCount(2);
  });

  test('üyeler: ekip, dal ve arama süzgeci', async ({ page }) => {
    await page.goto('/takim/');
    const k = page.locator('[data-kadro]');
    await expect(k).toHaveAttribute('data-gorunen', '17');
    await k.locator('[data-kadro-ekip] [data-ekip="mekanik"]').click();
    await expect(k).toHaveAttribute('data-gorunen', '4');
    await k.locator('[data-kadro-dal]').selectOption('haberlesme');
    await expect(k).toHaveAttribute('data-ekip', 'yazilim');
    await expect(k).toHaveAttribute('data-gorunen', '2');
    await k.locator('[data-kadro-ekip] [data-ekip=""]').click();
    await k.locator('[data-kadro-ara]').fill('uwb');
    await expect(k).toHaveAttribute('data-gorunen', '1');
    await expect(k.locator('[data-kadro-durum]')).toContainText('17');
    await k.locator('[data-kadro-ara]').fill('zzzz');
    await expect(k.locator('[data-kadro-bos]')).toBeVisible();
  });

  test('adı ve izni olmayan üyenin kişisel bilgisi sayfada yok', async ({ page }) => {
    await page.goto('/takim/');
    await expect(page.locator('[data-kart].adsiz')).toHaveCount(17);
    await expect(page.locator('[data-kart] img')).toHaveCount(0);
  });

  test('takıma katıl: dal seçilince e-posta taslağına yazılır', async ({ page }) => {
    await page.goto('/takim/');
    const k = page.locator('[data-katil]'), d = k.locator('[data-katil-dugme]');
    await expect(d).toHaveAttribute('href', /^mailto:matristechnology@gmail\.com\?subject=/);
    await k.locator('[data-dal="test"]').click();
    await expect(k).toHaveAttribute('data-secili', 'test');
    await expect(k.locator('[data-katil-panel]')).toContainText('Uçuş testleri');
    expect(decodeURIComponent((await d.getAttribute('href')) ?? '')).toContain('İlgilendiğim dal: Uçuş testleri');
  });

  test('betik kapalıyken şema anlatımı, kartlar ve başvuru bağlantısı görünür', async ({ browser }) => {
    const b = await browser.newContext({ javaScriptEnabled: false });
    const page = await b.newPage();
    await page.goto('/takim/');
    await expect(page.locator('#sema dl.js-yok')).toBeVisible();
    await expect(page.locator('[data-kart]').first()).toBeVisible();
    await expect(page.locator('[data-katil-dugme]')).toHaveAttribute('href', /^mailto:matristechnology@gmail\.com/);
    await b.close();
  });
});

test.describe('D17 Çalışmalar sayfası', () => {
  test('sayfa iki dilde açılır, ana sayfadan bağlantı var, 320 pikselde taşmaz', async ({ page }) => {
    for (const yol of ['/calismalar/', '/en/work/']) {
      await page.goto(yol);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-akis] [data-adim]')).toHaveCount(4);
    }
    await page.goto('/');
    await expect(page.locator('.ayrintili a[href="/calismalar/"]')).toBeVisible();
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/calismalar/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test('aşamalar: kaydırdıkça belirir, yandaki çizgi dolar', async ({ page }) => {
    await page.goto('/calismalar/');
    const a = page.locator('[data-akis]');
    await expect(a.locator('[data-adim]')).toHaveCount(4);
    expect(Number(await a.getAttribute('data-gecen'))).toBeLessThan(4);
    await expect(a.locator('[data-adim]').nth(3).locator('.asama-yazi')).not.toHaveClass(/gorundu/);
    await a.locator('[data-adim]').nth(3).scrollIntoViewIfNeeded();
    await expect(a.locator('[data-adim]').nth(3).locator('.asama-yazi')).toHaveClass(/gorundu/);
    await page.locator('#rapor').scrollIntoViewIfNeeded();
    await expect(a).toHaveAttribute('data-gecen', '4');
    await expect(a.locator('[data-adim]').nth(3).locator('.asama-yazi')).toHaveClass(/gorundu/);
    await expect(a.locator('[data-adim]').nth(2)).toContainText('Tek İHA testleri');
    await expect(a.locator('[data-adim]').nth(2).locator('.asama-bakilan li')).toHaveCount(4);
    await expect(a.locator('[data-adim]').nth(2).locator('img')).toBeVisible();
    await expect(page.locator('#atolye')).toHaveCount(0);
  });

  test('raporlar: süreç adımları ve dereceler içerikten gelir', async ({ page }) => {
    await page.goto('/calismalar/');
    await expect(page.locator('.rapor-yol li')).toHaveCount(5);
    await expect(page.locator('.dereceler li')).toHaveCount(3);
    await expect(page.locator('.dereceler')).toContainText('93/100');
  });

  test('betik kapalıyken dört aşamanın hepsi alt alta okunur', async ({ browser }) => {
    const b = await browser.newContext({ javaScriptEnabled: false });
    const page = await b.newPage();
    await page.goto('/calismalar/');
    await expect(page.locator('[data-akis] .akis-kart:visible')).toHaveCount(4);
    await b.close();
  });
});

test.describe('D18 Galeri sayfası', () => {
  test('sayfa iki dilde açılır, ana sayfadan bağlantı var, 320 pikselde taşmaz', async ({ page }) => {
    for (const yol of ['/galeri/', '/en/gallery/']) {
      await page.goto(yol);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-gfoto]')).toHaveCount(10);
    }
    await page.goto('/');
    await expect(page.locator('.ayrintili a[href="/galeri/"]')).toBeVisible();
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/galeri/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test('konu süzgeci fotoğrafları ve boş şablon kareleri süzer', async ({ page }) => {
    await page.goto('/galeri/');
    const g = page.locator('[data-gsayfa]');
    await expect(g).toHaveAttribute('data-gorunen', '10');
    await expect(g).toHaveAttribute('data-sablon', '7');
    await g.locator('[data-gsuz] [data-konu="saha"]').click();
    await expect(g).toHaveAttribute('data-gorunen', '5');
    await expect(g).toHaveAttribute('data-sablon', '1');
    await expect(g.locator('[data-gfoto]:visible')).toHaveCount(5);
    await expect(g.locator('[data-gdurum]')).toContainText('5');
    await g.locator('[data-gsuz] [data-konu=""]').click();
    await expect(g).toHaveAttribute('data-gorunen', '10');
  });

  test('görüntüleyici: yalnızca süzülen fotoğraflarda gezer, küçük resimle atlanır, Esc ile kapanır', async ({ page }) => {
    await page.goto('/galeri/');
    const g = page.locator('[data-gsayfa]'), gb = page.locator('[data-gb]');
    await g.locator('[data-gsuz] [data-konu="atolye"]').click();
    await expect(g).toHaveAttribute('data-gorunen', '2');
    await g.locator('[data-gfoto]:visible').first().click();
    await expect(gb).toBeVisible();
    await expect(gb.locator('[data-sayac]')).toHaveText('1 / 2');
    await expect(gb.locator('[data-serit] button')).toHaveCount(2);
    await page.keyboard.press('ArrowRight');
    await expect(gb).toHaveAttribute('data-sira', '2');
    await page.keyboard.press('ArrowRight');
    await expect(gb).toHaveAttribute('data-sira', '1');
    await gb.locator('[data-serit] button').nth(1).click();
    await expect(gb).toHaveAttribute('data-sira', '2');
    await expect(gb.locator('[data-serit] button').nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(gb.locator('[data-aciklama]')).not.toBeEmpty();
    await page.keyboard.press('Escape');
    await expect(gb).toBeHidden();
  });

  test('video şablonları ve Instagram bağlantısı', async ({ page }) => {
    await page.goto('/galeri/');
    await expect(page.locator('[data-video-sablon]')).toHaveCount(3);
    await expect(page.locator('[data-insta]')).toHaveAttribute('href', /^https:\/\/www\.instagram\.com\//);
  });

  test('betik kapalıyken bütün fotoğraflar görünür ve büyük haline bağlıdır', async ({ browser }) => {
    const b = await browser.newContext({ javaScriptEnabled: false });
    const page = await b.newPage();
    await page.goto('/galeri/');
    await expect(page.locator('[data-gfoto]:visible')).toHaveCount(10);
    expect(await page.locator('[data-gfoto]').first().getAttribute('href')).toMatch(/\.webp$/);
    await b.close();
  });
});

test('D19 üst menü: başlıklar ayrıntı sayfalarını açar, Ana Sayfa girişe döner', async ({ page }) => {
  await page.goto('/');
  const menu = page.locator('.menu');
  await expect(menu.locator('a').first()).toHaveText('Ana Sayfa');
  await expect(menu.locator('a[aria-current="page"]')).toHaveText('Ana Sayfa');
  for (const [ad, yol] of [['Sürü İHA', '/suru-iha/'], ['Matris', '/matris/'], ['Takım', '/takim/'], ['Çalışmalar', '/calismalar/'], ['Galeri', '/galeri/'], ['Destek', '/destek/'], ['İletişim', '/iletisim/']]) {
    await expect(menu.getByRole('link', { name: ad, exact: true })).toHaveAttribute('href', yol);
  }
  await menu.getByRole('link', { name: 'Takım', exact: true }).click();
  await expect(page).toHaveURL(/\/takim\/$/);
  await expect(page.locator('.menu a[aria-current="page"]')).toHaveText('Takım');
  await page.locator('.menu').getByRole('link', { name: 'Ana Sayfa', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('h1')).toBeVisible();
  await page.goto('/en/gallery/');
  await expect(page.locator('.menu a').first()).toHaveAttribute('href', '/en/');
});

test.describe('D20 Destek sayfası', () => {
  test('sayfa iki dilde açılır, menüden ve ana sayfadan ulaşılır, 320 pikselde taşmaz', async ({ page }) => {
    for (const yol of ['/destek/', '/en/support/']) {
      await page.goto(yol);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-tur]')).toHaveCount(3);
    }
    await page.goto('/');
    await expect(page.locator('.ayrintili a[href="/destek/"]')).toBeVisible();
    await expect(page.locator('.menu').getByRole('link', { name: 'Destek', exact: true })).toHaveAttribute('href', '/destek/');
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/destek/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test('tür ve paket seçimi e-posta taslağına yazılır, sayfada tutar yok', async ({ page }) => {
    await page.goto('/destek/');
    const d = page.locator('[data-destek]'), bag = page.locator('[data-destek-dugme]');
    await expect(bag).toHaveAttribute('href', /^mailto:[^?@]+@[^?]+\?subject=/);
    await d.locator('[data-tur]').nth(0).click();
    await expect(d).toHaveAttribute('data-secili-tur', 'Malzeme desteği');
    await d.locator('[data-paket]').nth(1).click();
    await expect(d).toHaveAttribute('data-secili-paket', 'Altın');
    await expect(d.locator('thead th[data-sutun="1"]')).toHaveAttribute('data-secili', '');
    const govde = decodeURIComponent((await bag.getAttribute('href')) ?? '');
    expect(govde).toContain('Destek türü: Malzeme desteği');
    expect(govde).toContain('Paket: Altın');
    await expect(d.locator('[data-secim]')).toContainText('Altın');
    expect(await page.locator('main').innerText()).not.toMatch(/₺|\bTL\b|IBAN/);
  });

  test('3B tişört: paket seçilince tişört o yüzünü çevirir, tablo seçimi de tişörte yansır', async ({ page }) => {
    test.setTimeout(90000); // Chromium'da yazılımla çizilen 3B model makine yüklüyken yavaş
    await page.goto('/destek/');
    const l = page.locator('[data-logo]'), t = l.locator('[data-tisort]');
    await l.scrollIntoViewIfNeeded();
    await l.locator('[data-yer="tisort"]').click();
    await expect(l.locator('[data-tisort-paket]')).toHaveCount(4);
    await expect(l.locator('[data-tisort-yer]').nth(2)).toContainText('Sırtın üst bölümünde');
    const hazir = await t.evaluate((e) => new Promise<boolean>((r) => { const bak = (n: number) => (e.dataset.hazir || e.classList.contains('webgl-yok') ? r(!!e.dataset.hazir) : n > 80 ? r(false) : setTimeout(() => bak(n + 1), 150)); bak(0); }));
    await l.locator('[data-tisort-paket="0"]').click();
    await expect(l).toHaveAttribute('data-tisort-paket', '0');
    await expect(l.locator('[data-tisort-paket="0"]')).toHaveAttribute('aria-pressed', 'true');
    if (hazir) {
      // Ana sponsor göğüste: tişört karşıdan (0 ya da 6,28). Gümüş sırtta: tişört arkasını döner (3,14).
      await expect.poll(async () => Number(await t.getAttribute('data-aci')), { timeout: 8000 }).toBeLessThan(0.05);
      await l.locator('[data-tisort-paket="2"]').click();
      await expect.poll(async () => Number(await t.getAttribute('data-aci')), { timeout: 8000 }).toBeCloseTo(3.14, 1);
      await expect(t).toHaveAttribute('data-paket-no', '2', { timeout: 15000 });
      // Tuval boş değil: siyah tişört çizilmiş (kare başına dolu piksel)
      const dolu = await t.locator('canvas').evaluate((c: HTMLCanvasElement) => { const k = document.createElement('canvas'); k.width = 80; k.height = 60; const x = k.getContext('2d')!; x.drawImage(c, 0, 0, 80, 60); const d = x.getImageData(0, 0, 80, 60).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++; return n; });
      expect(dolu).toBeGreaterThan(800);
      // Ön ve arka belli: etiket yüzü söylüyor, düğmeler tişörtü çeviriyor
      await expect(t).toHaveAttribute('data-yuz', 'arka');
      await expect(t.locator('[data-tisort-yuz]')).toHaveText('Arka');
      await t.locator('[data-tisort-don="0"]').click();
      await expect(t).toHaveAttribute('data-yuz', 'on', { timeout: 15000 });
      await expect(t.locator('[data-tisort-yuz]')).toHaveText('Ön');
      await t.locator('[data-tisort-don="3.14159"]').click();
      await expect(t).toHaveAttribute('data-yuz', 'arka', { timeout: 15000 });
    }
    // Paket tablosunda Destekçi seçilince tişörtte de seçilir
    await page.locator('[data-paket]').nth(3).click();
    await expect(l).toHaveAttribute('data-tisort-paket', '3', { timeout: 15000 });
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test('paket tablosu: gümüş ve destekçi sırtta, etkinlik ve sunumda dört paket de var', async ({ page }) => {
    await page.goto('/destek/');
    const satir = (ad: string) => page.locator('.paketler tbody tr', { hasText: ad }).locator('td');
    await expect(satir('Takım tişörtünde logo')).toHaveText([/Göğüste/, /Kolda/, /Sırtın üstünde/, /Sırtın altında/]);
    await expect(satir('Etkinlik ve yarışmada görünürlük')).toHaveText([/Ön planda/, /Ön planda/, /Var/, /Var/]);
    await expect(satir('Sunum ve raporlarda anılma')).toHaveText([/Ön planda/, /Ön planda/, /Var/, /Var/]);
    await expect(satir('Sosyal medya paylaşımı').nth(3)).toHaveText(/Teşekkür mesajı/);
  });

  test('logonun yeri: seçilen yerin anlatımı ve çizimi görünür', async ({ page }) => {
    await page.goto('/destek/');
    const l = page.locator('[data-logo]');
    // İlk gösterilen yer takım tişörtü
    await expect(l.locator('[data-yer-cizim]:visible')).toHaveCount(1);
    await expect(l).toHaveAttribute('data-yer', 'tisort');
    await expect(l.locator('[data-yer-cizim="tisort"]')).toBeVisible();
    await expect(l.locator('[data-yer-panel]:visible')).toContainText('tişört');
    await expect(l.locator('[data-yer]').first()).toHaveAttribute('data-yer', 'tisort');
    await l.locator('[data-yer="iha"]').click();
    await expect(l).toHaveAttribute('data-yer', 'iha');
    await expect(l.locator('[data-yer-cizim="iha"]')).toBeVisible();
    await expect(l.locator('[data-yer-panel]:visible')).toContainText('İHA');
  });

  test('ihtiyaç grupları: grup seçilince kalemleri açılır, model yüklenir', async ({ page }) => {
    test.setTimeout(90000); // Chromium'da yazılımla çizilen 3B model yavaş açılıyor
    await page.goto('/destek/');
    const i = page.locator('[data-ihtiyac]');
    await i.scrollIntoViewIfNeeded();
    await expect(i).toHaveAttribute('data-hazir', '1', { timeout: 20000 });
    await i.locator('[data-grup="2"]').click();
    await expect(i).toHaveAttribute('data-grup', '2');
    await expect(i.locator('[data-grup-panel]:visible')).toContainText('EMAX 820KV motor');
    await i.locator('[data-grup="2"]').click();
    await expect(i).toHaveAttribute('data-grup', '-1');
  });

  test('sponsor şablonları ve sık sorulanlar', async ({ page }) => {
    await page.goto('/destek/');
    await expect(page.locator('[data-sponsor-sablon]')).toHaveCount(4);
    const s = page.locator('.sss details');
    await expect(s).toHaveCount(4);
    await s.first().locator('summary').click();
    await expect(s.first().locator('p')).toBeVisible();
  });

  test('betik kapalıyken türler, paketler, ihtiyaç listesi ve düğme okunur', async ({ browser }) => {
    const b = await browser.newContext({ javaScriptEnabled: false });
    const page = await b.newPage();
    await page.goto('/destek/');
    await expect(page.locator('.tur-metin').first()).toBeVisible();
    await expect(page.locator('.paketler tbody tr')).toHaveCount(6);
    await expect(page.locator('#ihtiyac dl.js-yok')).toContainText('Raspberry Pi 5');
    await expect(page.locator('[data-yer-panel]:visible')).toHaveCount(3);
    await expect(page.locator('[data-destek-dugme]')).toHaveAttribute('href', /^mailto:/);
    await b.close();
  });
});


test.describe('D21 İletişim sayfası', () => {
  test('sayfa iki dilde açılır, menüden ve ana sayfadan ulaşılır, 320 pikselde taşmaz', async ({ page }) => {
    for (const yol of ['/iletisim/', '/en/contact/']) {
      await page.goto(yol);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-ulas]')).toHaveCount(5);
    }
    await page.goto('/');
    await expect(page.locator('.ayrintili a[href="/iletisim/"]')).toBeVisible();
    await page.locator('.menu').getByRole('link', { name: 'İletişim', exact: true }).click();
    await expect(page).toHaveURL(/\/iletisim\/$/);
    await expect(page.locator('.menu a[aria-current="page"]')).toHaveText('İletişim');
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/iletisim/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test('kartlar: üç adres konulu taslak açar, Instagram ve LinkedIn bağlantılı, telefon ve IBAN yok', async ({ page }) => {
    await page.goto('/iletisim/');
    const k = page.locator('[data-iletisim]');
    for (const ad of ['sponsor', 'takim', 'kaptan']) {
      await expect(k.locator(`[data-ulas="${ad}"] [data-yaz]`)).toHaveAttribute('href', /^mailto:[^?@]+@[^?]+\?subject=.+/);
    }
    await expect(k.locator('[data-ulas="takim"] .ulas-adres')).toHaveText('matristechnology@gmail.com');
    await expect(k.locator('[data-ulas="instagram"] a')).toHaveAttribute('href', /instagram\.com/);
    await expect(k.locator('[data-ulas="linkedin"] a')).toHaveAttribute('href', /linkedin\.com\/company\//);
    await expect(k.locator('[data-ulas-sablon]')).toHaveCount(0);
    expect(await page.locator('main').innerText()).not.toMatch(/IBAN|\+90|\b0?5\d{2}[ .]?\d{3}/);
  });

  test('adresi kopyala: panoya yazar ve durumu söyler', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'pano izni yalnızca Chromium\'da verilebiliyor');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/iletisim/');
    const k = page.locator('[data-iletisim]'), d = k.locator('[data-ulas="takim"] [data-kopyala]');
    await d.click();
    await expect(k).toHaveAttribute('data-kopyalanan', 'matristechnology@gmail.com');
    await expect(d).toHaveText('Kopyalandı');
    await expect(k.locator('[data-kopya-durum]')).toContainText('matristechnology@gmail.com');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('matristechnology@gmail.com');
    await expect(d).toHaveText('Adresi kopyala', { timeout: 5000 });
  });

  test('harita: bölüme gelince istenir, üniversitenin yerini işaretler', async ({ page }) => {
    await page.goto('/iletisim/');
    const h = page.locator('[data-harita]');
    await h.scrollIntoViewIfNeeded();
    await expect(h).toHaveAttribute('data-istendi', '1');
    await expect(h.locator('iframe')).toHaveAttribute('src', /openstreetmap\.org\/export\/embed\.html\?bbox=.+marker=40\.18861%2C29\.12978/);
    await expect(page.locator('[data-tarif]')).toHaveAttribute('href', /destination=40\.18861%2C29\.12978/);
  });

  test('betik kapalıyken adresler ve harita bağlantıları görünür', async ({ browser }) => {
    const b = await browser.newContext({ javaScriptEnabled: false });
    const page = await b.newPage();
    await page.goto('/iletisim/');
    await expect(page.locator('[data-ulas="sponsor"] .ulas-adres')).toBeVisible();
    await expect(page.locator('[data-buyuk-harita]')).toBeVisible();
    await expect(page.locator('[data-harita]')).toBeHidden();
    await b.close();
  });
});

test('D22 sayfa altı geçişi: önceki, ana sayfa ve sonraki düğmeleri menü sırasını izler', async ({ page }) => {
  const sira = ['/suru-iha/', '/matris/', '/takim/', '/calismalar/', '/galeri/', '/destek/', '/iletisim/'];
  for (let i = 0; i < sira.length; i++) {
    await page.goto(sira[i]);
    const g = page.locator('[data-gecis]');
    await expect(g.locator('[data-ana-don]')).toHaveAttribute('href', '/');
    if (i > 0) await expect(g.locator('[data-once]')).toHaveAttribute('href', sira[i - 1]); else await expect(g.locator('[data-once]')).toHaveCount(0);
    if (i < sira.length - 1) await expect(g.locator('[data-sonra]')).toHaveAttribute('href', sira[i + 1]); else await expect(g.locator('[data-sonra]')).toHaveCount(0);
  }
  await page.goto('/takim/');
  await page.locator('[data-gecis] [data-sonra]').click();
  await expect(page).toHaveURL(/\/calismalar\/$/);
  await page.locator('[data-gecis] [data-once]').click();
  await expect(page).toHaveURL(/\/takim\/$/);
  await page.goto('/en/work/');
  await expect(page.locator('[data-gecis] [data-sonra]')).toHaveAttribute('href', '/en/gallery/');
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/calismalar/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test('D23 site haritası: on sekiz sayfanın hepsi var ve açılıyor', async ({ request }) => {
  const y = await request.get('/sitemap.xml');
  expect(y.status()).toBe(200);
  const adresler = [...(await y.text()).matchAll(/<loc>https:\/\/matristechnology\.github\.io([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(adresler).toHaveLength(18);
  for (const a of adresler) expect((await request.get(a)).status(), a).toBe(200);
  expect(await (await request.get('/robots.txt')).text()).toContain('sitemap.xml');
});

test.describe('D24 arama görünürlüğü', () => {
  test('her sayfada yapısal veri var: takım, dereceler, sosyal hesaplar, kırıntı', async ({ page }) => {
    for (const yol of ['/', '/suru-iha/', '/en/support/', '/sss/']) {
      await page.goto(yol);
      const veri = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
      const g = veri['@graph'] as Record<string, any>[];
      const takim = g.find((x) => x['@type'] === 'Organization')!;
      expect(takim.name).toBe('Matris');
      expect(takim.alternateName).toContain('Matris Technology');
      expect(takim.sameAs.join(' ')).toMatch(/instagram\.com.*linkedin\.com/);
      expect(takim.award).toHaveLength(3);
      expect(takim.parentOrganization.name).toMatch(/Bursa/);
      expect(!!g.find((x) => x['@type'] === 'BreadcrumbList')).toBe(yol !== '/');
    }
  });

  test('sayfa başlıkları ayrı ve takım adını taşıyor, tek h1 var', async ({ page }) => {
    const basliklar = new Set<string>();
    for (const yol of ['/', '/suru-iha/', '/matris/', '/takim/', '/calismalar/', '/galeri/', '/destek/', '/iletisim/', '/sss/']) {
      await page.goto(yol);
      const b = await page.title();
      expect(b, yol).toMatch(/Matris/);
      expect(b.length, yol).toBeLessThanOrEqual(65);
      basliklar.add(b);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(((await page.locator('meta[name="description"]').getAttribute('content')) ?? '').length, yol).toBeGreaterThan(50);
    }
    expect(basliklar.size).toBe(9);
    await page.goto('/suru-iha/');
    await expect(page).toHaveTitle(/Sürü İHA nedir/);
  });

  test('sık sorulanlar: dokuz soru açık duruyor, yapısal veriyle aynı, alt bilgiden ulaşılıyor', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-sss-bag]').click();
    await expect(page).toHaveURL(/\/sss\/$/);
    const sorular = page.locator('[data-soru]');
    await expect(sorular).toHaveCount(9);
    await expect(sorular.first().locator('p')).toBeVisible();
    const veri = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
    const sss = (veri['@graph'] as Record<string, any>[]).find((x) => x['@type'] === 'FAQPage')!;
    expect(sss.mainEntity).toHaveLength(9);
    expect(sss.mainEntity[1].name).toBe(await sorular.nth(1).locator('h2').innerText());
    await page.goto('/en/faq/');
    await expect(page.locator('[data-soru]')).toHaveCount(9);
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/sss/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

  test('llms.txt takımı, dereceleri ve soruları düz yazıyla veriyor', async ({ request }) => {
    const y = await request.get('/llms.txt');
    expect(y.status()).toBe(200);
    const m = await y.text();
    expect(m).toContain('# Matris');
    expect(m).toContain('Sürü İHA nedir?');
    expect(m).toMatch(/2026: .*Türkiye 2\.si/);
    expect(m).not.toMatch(/undefined|\[object/);
  });
});
