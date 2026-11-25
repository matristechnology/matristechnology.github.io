import { defineConfig } from 'astro/config';

// Yayın adresi değişirse yalnızca bu satır ve icerik.yaml içindeki site.adres değişir.
export default defineConfig({
  site: 'https://matristechnology.github.io',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
  // CSS küçültücü animation-timeline bildirimini bozuyor, bu yüzden küçültme kapalı.
  vite: { build: { cssMinify: false } },
});
