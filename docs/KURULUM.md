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
| Üye | `uyeler` altındaki bir şablon satırını doldur. Fotoğrafı `src/assets/uyeler/` altına koy, dosya adını `fotograf` alanına yaz. Üye izin verdiyse `izin: true` yap. Adı yazılı ama izni `false` olan üye adsız görünür: görevi ve dalı çıkar, adı, fotoğrafı, bölümü, bağlantısı çıkmaz |
| Üyenin ekibi | `ekip`: yazilim, elektronik ya da mekanik. `dal`: o ekibin dallarından biri (örnek: `ekip: yazilim, dal: goruntu`). Kartta "Yazılım · Görüntü işleme" diye görünür |
| Ekip ve dallar | `ekipler` altında. Dal eklemek, silmek ya da adını değiştirmek için yalnızca orayı değiştir |
| Kaptan, ekip sorumlusu | `sorumlu: true`. Ekibi boş bırakılan üye (kaptan gibi) ekip kutularının üstünde durur |
| Danışman | `danismanlar` altında `ad` ve `izin: true` |
| Başarı | `basarilar` listesine satır. `tur`: finalist, derece ya da odul |
| Fotoğraf | Dosyayı `src/assets/galeri/` altına koy, `galeri` listesine `dosya` ve iki dilde `alt` yaz |
| Sponsor | Logoyu `src/assets/sponsorlar/` altına koy, `destek.sponsorlar` listesine `{ ad, logo, baglanti }` ekle |
| Sponsorluk dosyası | PDF'i `public/` altına koy, adını `destek.dosya` alanına yaz. Telefon ve IBAN içermeyen sürüm olmalı |
| Yarışma tanımı | `suru.yarisma`. Takımın 2026 Ön Tasarım Raporu'ndaki görev tanımından yazıldı. Şartname değişirse güncelle |

Fotoğrafı eklemeden önce konum bilgisini temizle: `exiftool -all= dosya.jpg` ya da
`magick girdi.heic -auto-orient -strip -resize '2000x2000>' cikti.jpg`.

Başarı ya da tanıtım cümlesi değişince paylaşım görsellerini yenile: `node araclar/og.mjs`.

## Yayın

Adres: https://matristechnology.github.io/ · Depo: github.com/matristechnology/matristechnology.github.io

```
npm run yayinla      # derler, çıktıyı gh-pages dalına gönderir
git push             # kaynak kodu main dalına gönderir
```

GitHub Pages `gh-pages` dalından yayınlar. Yayın birkaç dakika sürer.
`gh` hesabı `matristechnology` olmalı: `gh auth switch -u matristechnology`.

Kendiliğinden yayın (main'e push edince) için hazır iş akışı `.github/workflows/yayin.yml` dosyasında duruyor ama depoya gönderilmedi,
çünkü `gh` girişinde `workflow` izni yok. Açmak için: `gh auth refresh -h github.com -s workflow`, sonra dosyayı commit edip gönder
ve depoda Settings, Pages, Source olarak "GitHub Actions" seç.

`ham/` klasörü ve PDF'ler `.gitignore` içindedir, depoya girmez.

## Sezon başı güncelleme listesi

- Üye listesi ve izinler
- Başarılar ve girişteki rozetler
- Giriş fotoğrafı ve galeri
- Sponsorlar ve ihtiyaç listesi
- İletişim adresleri
- `node araclar/og.mjs`
