// Sitenin etkileşimleri. Betik çalışmasa da içerik okunur, burada yalnızca kolaylıklar var:
// belirme hareketi, menü vurgusu, tema, dil, üye süzgeci, üye ayrıntısı, galeri görüntüleyicisi.

const kok = document.documentElement;
const govde = document.body;
const $ = <T extends Element = HTMLElement>(s: string, e: ParentNode = document) => e.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, e: ParentNode = document) => [...e.querySelectorAll<T>(s)];
const hareketVar = () => kok.classList.contains('anim');

/* ── 1. Belirme: öğe görüş alanına girince bir kez belirir ─────────────────── */
{
  const ogeler = $$('[data-belir]:not(.gorundu)');
  if (!hareketVar()) ogeler.forEach((o) => o.classList.add('gorundu'));
  else {
    const izleyici = new IntersectionObserver(
      (kayitlar) => {
        for (const k of kayitlar) {
          if (!k.isIntersecting) continue;
          k.target.classList.add('gorundu');
          izleyici.unobserve(k.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    ogeler.forEach((o) => izleyici.observe(o));
  }
}
(window as any).__hazir = true;

/* ── 2. Menü: bulunulan bölümü göster ──────────────────────────────────────── */
let suankiBolum: HTMLElement | null = null;
const bolumler = $$('main > section[id]');
if (govde.dataset.sayfa === 'ana' && 'IntersectionObserver' in window) {
  const baglar = $$<HTMLAnchorElement>('.menu a[data-bolum]');
  const izleyici = new IntersectionObserver(
    (kayitlar) => {
      for (const k of kayitlar) {
        if (!k.isIntersecting) continue;
        suankiBolum = k.target as HTMLElement;
        for (const b of baglar) {
          if (b.dataset.bolum === suankiBolum.id) b.setAttribute('aria-current', 'true');
          else b.removeAttribute('aria-current');
        }
        // Menüde kendi bölümü olmayan yerdeyken (giriş ve sayfası ayrı olan bölümler) "Ana Sayfa" yanar.
        const anaBag = $('.menu a[data-ana]');
        if (baglar.some((b) => b.hasAttribute('aria-current'))) anaBag?.removeAttribute('aria-current');
        else anaBag?.setAttribute('aria-current', 'page');
      }
    },
    { rootMargin: '-40% 0px -55% 0px' },
  );
  bolumler.forEach((b) => izleyici.observe(b));
}

// Mobil menü: bağlantıya basınca, dışarı tıklayınca ya da Esc ile kapanır.
const mobilMenu = $<HTMLDetailsElement>('.mobil-menu');
if (mobilMenu) {
  mobilMenu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) mobilMenu.open = false;
  });
  document.addEventListener('click', (e) => {
    if (mobilMenu.open && !mobilMenu.contains(e.target as Node)) mobilMenu.open = false;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobilMenu.open) {
      mobilMenu.open = false;
      $('summary', mobilMenu)?.focus();
    }
  });
}

/* ── 3. Tema ───────────────────────────────────────────────────────────────── */
$$('[data-tema]').forEach((d) =>
  d.addEventListener('click', () => {
    const simdiki = kok.dataset.theme ?? 'dark';
    const yeni = simdiki === 'dark' ? 'light' : 'dark';
    kok.dataset.theme = yeni;
    try {
      localStorage.setItem('tema', yeni);
    } catch {}
  }),
);

/* ── 4. Dil: bulunulan bölüm korunur ───────────────────────────────────────── */
$$<HTMLAnchorElement>('[data-dil-degistir]').forEach((bag) => {
  bag.addEventListener('click', () => {
    if (govde.dataset.sayfa !== 'ana') return;
    const cizgi = innerHeight * 0.4;
    const bulunan = bolumler.find((b) => {
      const r = b.getBoundingClientRect();
      return r.top <= cizgi && r.bottom > cizgi;
    });
    const karsi = (bulunan ?? suankiBolum)?.dataset.karsi;
    const u = new URL(bag.getAttribute('href')!, location.href);
    u.hash = karsi && scrollY > 50 ? `#${karsi}` : '';
    bag.setAttribute('href', u.pathname + u.hash);
  });
});

/* ── 5. Ekip süzgeci: seçilen ekip öne çıkar, ötekiler söner (dar ekranda gizlenir) ── */
const suzgec = $('[data-suzgec]');
if (suzgec) {
  const dugmeler = $$<HTMLButtonElement>('button', suzgec);
  suzgec.addEventListener('click', (e) => {
    const d = (e.target as HTMLElement).closest('button');
    if (!d) return;
    const ekip = d.dataset.ekip ?? '';
    dugmeler.forEach((x) => x.setAttribute('aria-pressed', String(x === d)));
    for (const k of $$('[data-ekipler] > li')) {
      const sonuk = !!ekip && k.dataset.ekip !== ekip;
      k.toggleAttribute('data-sonuk', sonuk);
      if (!sonuk) {
        k.classList.add('gorundu');
        $$('.uye', k).forEach((u) => u.classList.add('gorundu'));
        $$<HTMLDetailsElement>('details', k).forEach((x) => (x.open = true));
      }
    }
  });
}

/* ── 6. Üye ayrıntısı: düğmeyle ya da karta dokununca açılır ───────────────── */
for (const kart of $$('.uye')) {
  const dugme = $<HTMLButtonElement>('.uye-ac', kart);
  if (!dugme) continue;
  const ayarla = (acik: boolean) => {
    kart.toggleAttribute('data-acik', acik);
    dugme.setAttribute('aria-expanded', String(acik));
  };
  kart.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) return;
    ayarla(!kart.hasAttribute('data-acik'));
  });
  kart.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && kart.hasAttribute('data-acik')) {
      ayarla(false);
      dugme.focus();
    }
  });
}

/* ── 7. Galeri: tıklayınca büyür, ok tuşlarıyla gezilir, Esc ile kapanır ───── */
const buyutec = $<HTMLDialogElement>('[data-buyutec]');
const fotolar = $$<HTMLAnchorElement>('[data-galeri] a[data-foto]');
if (buyutec && fotolar.length && typeof buyutec.showModal === 'function') {
  const resim = $<HTMLImageElement>('[data-buyuk]', buyutec)!;
  const aciklama = $('[data-aciklama]', buyutec)!;
  const sayac = $('[data-sayac]', buyutec)!;
  let sira = 0;
  const goster = (i: number) => {
    sira = (i + fotolar.length) % fotolar.length;
    const f = fotolar[sira];
    resim.src = f.href;
    resim.alt = f.dataset.alt ?? '';
    aciklama.textContent = f.dataset.alt ?? '';
    sayac.textContent = `${sira + 1} / ${fotolar.length}`;
    buyutec.dataset.sira = String(sira + 1);
  };
  fotolar.forEach((f, i) =>
    f.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return; // yeni sekmede açmak isteyene karışma
      e.preventDefault();
      goster(i);
      buyutec.showModal();
    }),
  );
  $('[data-onceki]', buyutec)!.addEventListener('click', () => goster(sira - 1));
  $('[data-sonraki]', buyutec)!.addEventListener('click', () => goster(sira + 1));
  $('[data-kapat]', buyutec)!.addEventListener('click', () => buyutec.close());
  buyutec.addEventListener('click', (e) => {
    if (e.target === buyutec) buyutec.close(); // arka plana tıklama
  });
  buyutec.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    goster(sira + (e.key === 'ArrowRight' ? 1 : -1));
  });
  // Kapanınca odak açılan fotoğrafa döner, ziyaretçi kaldığı yerden sürdürür.
  buyutec.addEventListener('close', () => fotolar[sira]?.focus({ preventScroll: true }));
}

/* ── 8. İlerleme çubuğu ve başarı çizgisi: CSS desteği yoksa betikle ───────── */
if (hareketVar() && !CSS.supports('animation-timeline: scroll()')) {
  kok.classList.add('kaydirma-yedek');
  const cubuk = $('.ilerleme span');
  const cizgiler = $$('[data-cizgi]');
  let bekliyor = false;
  const guncelle = () => {
    bekliyor = false;
    const boy = kok.scrollHeight - innerHeight;
    cubuk?.style.setProperty('--p', String(boy > 0 ? Math.min(1, scrollY / boy) : 0));
    for (const c of cizgiler) {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--dolum', String(Math.max(0, Math.min(1, (innerHeight * 0.62 - r.top) / r.height))));
    }
  };
  addEventListener(
    'scroll',
    () => {
      if (!bekliyor) {
        bekliyor = true;
        requestAnimationFrame(guncelle);
      }
    },
    { passive: true },
  );
  addEventListener('resize', guncelle);
  guncelle();
}
