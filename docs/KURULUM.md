# Kurulum ve güncelleme

## Yerelde çalıştırma

```
npm install
npm run dev          # geliştirme, http://localhost:4321
npm run build        # dist/ klasörüne durağan çıktı
npm run preview      # derlenmiş siteyi http://127.0.0.1:4321 adresinde açar
npm test             # kabul denemeleri (önce build ve preview)
```

## İçerik ekleme

Bütün metinler `icerik.yaml` dosyasındadır. Boş bırakılan alan ve boş liste sitede görünmez.

| Ne | Nasıl |
|---|---|
| Üye | `uyeler` altındaki bir şablon satırını doldur. Fotoğrafı `src/assets/uyeler/` altına koy, dosya adını `fotograf` alanına yaz. Üye izin verdiyse `izin: true` yap. Adı yazılı ama izni `false` olan üye sitede hiç görünmez |
| Kaptan, ekip sorumlusu | `sorumlu: true`. Kart öne gelir |
| Danışman | `danismanlar` altında `ad` ve `izin: true` |
| Başarı | `basarilar` listesine satır. `tur`: finalist, derece ya da odul |
| Fotoğraf | Dosyayı `src/assets/galeri/` altına koy, `galeri` listesine `dosya` ve iki dilde `alt` yaz |
| Sponsor | Logoyu `src/assets/sponsorlar/` altına koy, `destek.sponsorlar` listesine `{ ad, logo, baglanti }` ekle |
| Sponsorluk dosyası | PDF'i `public/` altına koy, adını `destek.dosya` alanına yaz. Telefon ve IBAN içermeyen sürüm olmalı |
| Yarışma tanımı | `suru.yarisma`. teknofest.org'daki şartnameden doğrulandıktan sonra |

Fotoğrafı eklemeden önce konum bilgisini temizle: `exiftool -all= dosya.jpg` ya da
`magick girdi.heic -auto-orient -strip -resize '2000x2000>' cikti.jpg`.

Başarı ya da tanıtım cümlesi değişince paylaşım görsellerini yenile: `node araclar/og.mjs`.

## Yayın

`main` dalına gönderilen her değişiklik `.github/workflows/yayin.yml` ile derlenip GitHub Pages'e konur.
Depo `matristechnology/matristechnology.github.io` olursa adres `https://matristechnology.github.io/` olur.
Başka bir adreste yayınlanacaksa `astro.config.mjs` içindeki `site` ve `icerik.yaml` içindeki `site.adres` değişir.
Depoda Settings, Pages, Source olarak "GitHub Actions" seçilmelidir.

`ham/` klasörü ve PDF'ler `.gitignore` içindedir, depoya girmez.

## Sezon başı güncelleme listesi

- Üye listesi ve izinler
- Başarılar ve girişteki rozetler
- Giriş fotoğrafı ve galeri
- Sponsorlar ve ihtiyaç listesi
- İletişim adresleri
- `node araclar/og.mjs`
