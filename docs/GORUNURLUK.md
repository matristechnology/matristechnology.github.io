# Görünürlük: Ali'nin yapacakları

Site tarafındaki işler 27.11.2026'da yapıldı (en altta listeli). Aşağıdakiler site dışında kaldığı için senin elinde. Önem sırasına göre yazıldı.

## 1. Google Search Console'a kaydol (15 dakika, en önemli adım)

Bu yapılmadan Google'ın siteyi ne zaman bulacağı belli olmaz.

1. https://search.google.com/search-console adresine `matristechnology@gmail.com` hesabıyla gir.
2. "Mülk ekle" de, "URL ön eki" seçeneğine `https://matristechnology.github.io/` yaz.
3. Doğrulama yöntemi olarak "HTML etiketi"ni seç. Sana şuna benzer bir satır verir:
   `<meta name="google-site-verification" content="abc123..." />`
4. Tırnak içindeki `content` değerini bana yaz ya da `icerik.yaml` içinde `site.google_dogrulama` alanına koy. Yayına alınca "Doğrula"ya bas.
5. Sol menüden "Site haritaları"na gir, `sitemap.xml` yaz ve gönder.
6. Üstteki arama kutusuna ana sayfa adresini yapıştır, "Dizine eklenmesini iste" de. Aynısını `/suru-iha/` ve `/sss/` için de yap.

İlk sonuçların görünmesi birkaç gün ile birkaç hafta arasında sürer.

## 2. Bing Webmaster Tools (5 dakika)

https://www.bing.com/webmasters adresinde "Google Search Console'dan içe aktar" seçeneği var. ChatGPT'nin araması Bing'in dizinini kullandığı için yapay zekâ aramalarında görünmek adına bu adım önemli.

## 3. Kendi hesaplarınıza site adresini yaz (10 dakika)

- Instagram `@btu_matris` profilindeki bağlantı alanına `https://matristechnology.github.io/`
- LinkedIn şirket sayfasının "Web sitesi" alanına aynı adres
- Varsa YouTube kanalının hakkında bölümüne
- Takım üyelerinin LinkedIn profillerinde deneyim kısmına "Matris Technology" şirket sayfasını bağlamaları

Her yerde ad aynı yazılsın: "Matris" ya da "Matris Technology". Bir yerde "MATRİS Takımı", başka yerde "Matris İHA" yazarsa arama motorları bunları aynı takım olarak eşleştirmekte zorlanır.

## 4. Başka sitelerden bağlantı iste

Sıralamayı en çok yükselten şey güvenilir sitelerden gelen bağlantıdır.

- **Bursa Teknik Üniversitesi:** üniversitenin haber sayfasında finalistlik ya da rapor ikinciliği haberi çıktıysa içine site adresinin eklenmesini iste. Çıkmadıysa basın birimine kısa bir haber metni gönder. `btu.edu.tr` uzantılı bir bağlantı çok değerlidir.
- **MATRO Topluluğu:** topluluğun sayfasında ve sosyal hesaplarında takımın sitesine bağlantı.
- **Sponsorlar:** sponsor olan firmalardan kendi sitelerinde "desteklediğimiz takımlar" kısmında bağlantı vermelerini iste.
- **TEKNOFEST:** takım tanıtım formlarında web sitesi alanı varsa doldur.
- **Yerel basın:** Bursa haber sitelerine derece haberi gönderirken adresi ekle.

## 5. Kendi alan adı (isteğe bağlı)

`matristechnology.com` ya da `matristech.com.tr` gibi bir alan adı `github.io` adresinden daha güvenilir ve akılda kalıcı görünür. Yıllık ücreti düşüktür. Alırsan bana söyle, siteyi o adrese ben taşırım. Taşıma erken yapılırsa daha iyi olur, çünkü dizine girdikten sonra adres değiştirmek sıralamayı bir süre düşürür.

## 6. Düzenli içerik

Arama motorları güncellenen siteleri daha sık ziyaret eder. Test günü, yarışma, rapor sonucu, yeni sponsor gibi gelişmeleri iki üç paragrafla yazıp bana gönderirsen siteye "Haberler" bölümü açıp eklerim. Ayda bir yazı bile fark yaratır.

Yazılarda insanların arayacağı cümleleri doğal biçimde kullan: "TEKNOFEST Sürü İHA Yarışması", "sürü İHA takımı", "Bursa Teknik Üniversitesi". Aynı kelimeyi art arda tekrar etmek işe yaramaz, ters teper.

## 7. Eksik veriler görünürlüğü de etkiliyor

- Üye adları ve fotoğrafları (izinle): kişi adıyla yapılan aramalarda site çıkar.
- Galerideki boş kareler ve YouTube videoları: görsel ve video aramalarında yer açar.
- Sponsor logoları.

## Beklenti

| Arama | Beklenti |
|---|---|
| "Matris Technology", "Matris sürü İHA takımı" | İlk sıra, dizine girince |
| "BTÜ sürü İHA", "Bursa Teknik Üniversitesi TEKNOFEST takımı" | İlk sayfa |
| "TEKNOFEST sürü İHA takımları", "sürü İHA nedir" | Mümkün, dış bağlantıya ve içeriğe bağlı |
| "TEKNOFEST", "TÜBİTAK", "yarışma takımı" | Beklememek lazım, resmi siteler ve haber siteleri var |

"TÜBİTAK" kelimesi sitede geçmiyor. Takımın TÜBİTAK ile gerçek bir bağı varsa (destek, proje, yarışma) söyle, doğru cümleyle ekleyelim.

## Sitede yapılanlar (27.11.2026)

- Her sayfada yapısal veri (schema.org): takımın adı, üniversitesi, dereceleri, Instagram ve LinkedIn hesapları, sayfa kırıntısı.
- Sayfa başlıkları aranan cümlelerle yeniden yazıldı, her sayfanın başlığı ayrı.
- Sık sorulanlar sayfası (`/sss/`, `/en/faq/`): dokuz soru ve kısa cevap, soru cevap yapısal verisiyle.
- `sitemap.xml`, `robots.txt` ve yapay zekâ aramaları için `llms.txt`.
- Ana sayfadaki takım fotoğrafı artık beklemeden çiziliyor (açılış hızı).
- Search Console doğrulama kodu için hazır alan: `icerik.yaml` içinde `site.google_dogrulama`.
