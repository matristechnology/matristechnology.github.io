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
| Benzetimde araç sayısı | 3 ile başlar, 3 ile 6 arası | `src/scripts/demo-suru.ts` |
| Benzetimde alan | Ev, 4 QR noktası, kırmızı ve mavi iniş alanı. Yerleri temsili | `demo-suru.ts` içinde `EV`, `QR`, `ALAN` |
| Benzetimde QR emirleri | QR 1: V. QR 2: 12 m ve 10 derece yatış. QR 3: 2 numaralı araç kırmızı alana iner, kalanlar ok başı. QR 4: 8 m, çizgi, eve dönüş | `demo-suru.ts` içinde `GOREV` |
| Benzetimde hızlar | Uçuş irtifası 8 m, tırmanma 4 m/sn, bir görev yaklaşık 50 sn | `demo-suru.ts` |
| Elektronik ve Mekanik dalları | Aviyonik, Güç sistemi, Montaj ve kablolama. Gövde tasarımı, Üretim, Uçuş testleri. Benim önerim, Ali onaylayınca kesinleşir | `icerik.yaml` içinde `ekipler` |
| Dar ekranda sürü saydamlığı | 0,6 katı | `suru.ts`, `kis` |

## Kendi yazdığım metinler

Takımın verdiği metinler taşındı, yalnızca noktalı virgüller çıkarıldı ve İngilizceye çevrildi. Şunlar benim yazdığım, Ali'nin onayına açık metinlerdir:

- "Sürü İHA nedir" bölümündeki iki paragraf ve benzetimin beş açıklama cümlesi (genel kavram anlatımı)
- Girişteki tek cümlelik tanıtım (tanıtım dosyasındaki cümlenin kısaltılmışı)
- "Nasıl çalışıyoruz" ve "Galeri" altındaki birer cümlelik girişler, galeri fotoğraflarının açıklamaları (fotoğrafta görünenin tarifi)
- Tek bakışta şeridindeki sayılar veriden hesaplanır: üye kaydı sayısı (17), ekip sayısı (3), dal sayısı (10), türü finalist olan başarı sayısı (2)

## Fotoğraf seçimi

Kullanılanlar: giriş için `IMG_4150` (Eylül 2026), galeri için tanıtım dosyasından 9 kare ve `IMG_4055`.
Kullanılmayanlar ve nedeni: tek kişinin yüzünün öne çıktığı özçekimler (5 kare), hazır görsel bankası fotoğrafı (para), başka logolu "destek ihtiyaçlarımız" görseli, takım dışı kişilerin ve yetkililerin öne çıktığı kalabalık kareleri (3 kare), belediye afişli masa fotoğrafı, çok küçük kareler (502x280 İHA, 673x375 uçuş), dört kişilik WhatsApp fotoğrafı (arka planda siyasi afişler).
Bütün görsellerden konum ve cihaz bilgisi silindi.

## 26.11.2026: ekip yapısı ve benzetim

- Takım üç ana ekibe ayrıldı: Yazılım, Elektronik, Mekanik. Her ekibin altında dallar var. Yazılım dalları Ali'nin verdiği üç dal (algoritma, görüntü işleme, gömülü sistemler) ve Ön Tasarım Raporu'ndaki organizasyon şemasından Haberleşme.
- "Kendin dene" benzetimi takımın uçuş kodu ve 2026 Ön Tasarım Raporu okunarak yeniden yazıldı. Artık yarışmanın iki görevini gösteriyor.
- Koddan alınan fikirler: lider ve takipçi düzeni, yuva hesabı (çizgi, V, ok başı), görev akışı (QR noktasına git, kuzeye dön, merkezle, oku, uygula), yatışta irtifa farkı, sürüden ayrılıp renkli alana iniş ve geri katılma, lider düşünce en küçük numaralı aracın liderliği alıp eve dönmesi.
- Siteye bilerek konmayanlar: saha koordinatları, ağ adresleri, başvuru numarası, gerçek parametre değerleri. Benzetimdeki sayılar temsilidir.
- Çarpışmadan kaçınma benzetimde basit bir itme kuvvetidir, koddaki ORCA yöntemi değildir.
- Rapordaki organizasyon şemasında adı geçen üyeler siteye yazılmadı. Üye bilgisi ve izinler Ali'den gelince girilecek.
- Arka plandaki sürü artık benzetim alanının üstünden geçmiyor, araçlar karışmasın diye.
- Elimdeki şartname PDF'i açılmadı, sayfalar boş çıkıyor. Yarışma tanımının kaynağı takımın kendi raporu.
