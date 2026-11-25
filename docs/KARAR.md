# Kararlar

## Araçlar

Astro 7 ile durağan çıktı, arayüz çatısı yok. Düz CSS, düz TypeScript. İçerik `icerik.yaml`, şema denetimi zod.
Denemeler Playwright. Yazı tipleri depoya gömülü (Inter Tight, JetBrains Mono), dış kaynak ve izleme aracı yok.

## Ali'nin kararları (25.11.2026)

- Başarılar tanıtım dosyasındaki gibi yazıldı: 2024 Finalist, 2026 Ön Tasarım Raporu Türkiye 2.si (93/100), 2026 Finalist. Proje tanımındaki "2022" kullanılmadı.
- 17 şablon üye kartı yayında da görünür ("Üye 01", "Yakında"). Proje tanımındaki İ3 (yer tutucu kalmaz) bu noktada bilerek aşıldı.
- İletişim: Instagram, LinkedIn ve sponsorluk sorumlusunun e-postası. Telefon ve IBAN siteye girmez.
- Yayın hesabı: github.com/matristechnology.

## Tasarım

- Motif sürü. Arka planda dolaşan sürü, "Sürü İHA nedir" bölümündeki oynanabilir benzetim, üstlükteki üç nokta ve şablon kartlardaki İHA imi buna bağlı.
- Varsayılan tema koyu, ziyaretçinin sistemi açık temada olsa da. Açık tema düğmeyle seçilir ve hatırlanır.
- Vurgu rengi logodan örneklenen altın sarısı `#e8c468`. Açık temada aynı rengin koyu tonu `#765600`.
- Logo yalnızca siyah zeminiyle kullanılır, biçimi ve rengi değiştirilmedi. Yalnızca Matris logosu var, BTÜ, MATRO ve TEKNOFEST adları düz yazı.
- Kişisel sitedeki "yabancı sürü ve önleme" sahnesi alınmadı: sponsor sitesinde savunma çağrışımı istenmedi.

## Kendi seçtiğim sayılar (değiştirilebilir)

| Ne | Değer | Yer |
|---|---|---|
| Arka plan sürüsündeki araç | 11 | `src/scripts/suru.ts`, `N` |
| Dizilimde kalma süresi | 7 sn | `SURE` |
| Dağılıp tek tek dolaşma | 8 sn | `DAGIL` |
| Benzetimde araç sayısı | 7 ile başlar, 3 ile 12 arası | `src/scripts/demo-suru.ts` |
| Benzetimde boşta devriye | 9 sn dokunulmazsa başlar | `demo-suru.ts` |
| Dar ekranda sürü saydamlığı | 0,6 katı | `suru.ts`, `kis` |

## Kendi yazdığım metinler

Takımın verdiği metinler taşındı, yalnızca noktalı virgüller çıkarıldı ve İngilizceye çevrildi. Şunlar benim yazdığım, Ali'nin onayına açık metinlerdir:

- "Sürü İHA nedir" bölümündeki iki paragraf ve benzetimin beş açıklama cümlesi (genel kavram anlatımı)
- Girişteki tek cümlelik tanıtım (tanıtım dosyasındaki cümlenin kısaltılmışı)
- "Nasıl çalışıyoruz" ve "Galeri" altındaki birer cümlelik girişler, galeri fotoğraflarının açıklamaları (fotoğrafta görünenin tarifi)
- Tek bakışta şeridindeki sayılar veriden hesaplanır: üye kaydı sayısı (17), alt ekip sayısı (4), türü finalist olan başarı sayısı (2)

## Fotoğraf seçimi

Kullanılanlar: giriş için `IMG_4150` (Eylül 2026), galeri için tanıtım dosyasından 9 kare ve `IMG_4055`.
Kullanılmayanlar ve nedeni: tek kişinin yüzünün öne çıktığı özçekimler (5 kare), hazır görsel bankası fotoğrafı (para), başka logolu "destek ihtiyaçlarımız" görseli, takım dışı kişilerin ve yetkililerin öne çıktığı kalabalık kareleri (3 kare), belediye afişli masa fotoğrafı, çok küçük kareler (502x280 İHA, 673x375 uçuş), dört kişilik WhatsApp fotoğrafı (arka planda siyasi afişler).
Bütün görsellerden konum ve cihaz bilgisi silindi.
