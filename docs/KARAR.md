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
| Benzetimde araç sayısı | 5 ile başlar, 3 ile 7 arası | `src/scripts/demo-suru.ts` |
| Benzetimde boşta dolaşma | 9 sn dokunulmazsa başlar, 7 sn arayla yeni nokta | `demo-suru.ts` |
| Arka plan sürüsü | 30 İHA, her birinin sayfada bir bölgesi var (bölgeler sayfa boyunca eşit aralıklı). Serbestken bölgesinde dolaşır (80 ile 125 px/sn, her noktada 1,2 ile 4,2 sn asılı). 8 ile 14 sn arayla dizilim: en az 5, en çok 12 üye. Ayrılan İHA 6 sn yeniden katılmaz | `src/scripts/suru.ts` içinde `N`, `EN_AZ`, `EN_COK`, `BEKLEME` |
| Yabancı sürü | İlk gelişi 15 ile 27 sn arası, sonra 40 ile 70 sn arayla. 5 ile 7 araç | `suru.ts` içinde `baskin` |
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

## 26.11.2026: ekip yapısı, benzetim, arka plan sürüsü

- Takım üç ana ekibe ayrıldı: Yazılım, Elektronik, Mekanik. Her ekibin altında dallar var. Yazılım dalları Ali'nin verdiği üç dal ve Ön Tasarım Raporu'ndaki organizasyon şemasından Haberleşme.
- Üyeler ekip kutularının içinde, kendi dallarının altında duruyor. Kaptan kutuların üstünde. Görevi ve dalı belli olmayan kayıtlar "Yerleşecek üyeler" sırasında.
- İlk dokuz kaydın görevi ve dalı Ön Tasarım Raporu'ndaki organizasyon şemasından. Adlar `icerik.yaml` içine bilerek yazılmadı, depo herkese açık. İzin gelince yazılır.
- Kural değişti: adı yazılı ama izni olmayan üye artık hiç gizlenmiyor, adsız görünüyor. Görev ve dalı çıkar, adı, fotoğrafı, bölümü ve bağlantısı sayfaya hiç girmez.
- "Kendin dene" bir ara yarışma alanına çevrilmişti, Ali istemedi. Yeniden serbest uçan sürü oldu, uçuş mantığı takımın kodundan sadeleştirildi: lider ve takipçiler, yuvalar taraf değiştirmez, sürü önce döner sonra gider, araç düşünce kalanlar içeri kayar, lider düşünce en küçük numaralı araç lider olur.
- Arka plan sürüsü dizilime girerken her İHA'ya toplam yolu en kısa yapan yuva verilir (Macar yöntemi). 500 rastgele geçişte kesişen yol çıkmadı. Sonra her İHA yuvasına düz çizgiyle, ötekilerle aynı anda varır.
- Yabancı sürü sahnesi geri geldi: kırmızı bir sürü kenardan girer, bizimkiler kovalayıp düşürür, sonra yeniden dizilime girer. Renk koyu temada `#ff6b5e`, açık temada `#c4302b`.
- Siteye bilerek konmayanlar: saha koordinatları, ağ adresleri, başvuru numarası, gerçek parametre değerleri.
- Çarpışmadan kaçınma benzetimde basit bir itme kuvvetidir, koddaki ORCA yöntemi değildir.
- Arka plandaki sürü benzetim alanının üstünden geçmiyor.
- Elimdeki şartname PDF'i açılmadı, sayfalar boş çıkıyor. Yarışma tanımının kaynağı takımın kendi raporu.

## 26.11.2026: arka plan sürüsü serbest dolaşıyor

- Ali'nin isteği: İHA'lar genelde tek tek dolaşsın, sayı 20 olsun, dizilim zamanı gelince ekranda görünenler toplansın, bir iki yere gidip dizilim değiştirsin ya da dönsün, sonra dağılsın.
- İHA'ların konumu sayfaya bağlı: kaydırınca başka İHA'lar görünür. Dizilim ise görüş alanında kurulur ve kaydırılsa da görüş alanında kalır, üyeler arkasından yetişir.
- Ekranda 5'ten az İHA varsa en yakındakiler ekran dışından gelir. Sayfa uzun olduğu için çoğu zaman ekranda 0 ile 2 İHA oluyor, dizilime gelenlerin çoğu dışarıdan geliyor.
- Kenarlardan giren yabancı sürü kaldı. Onu da o an görünenler ve en yakındakiler önlüyor, iş bitince dağılıyorlar.
- Boş bir yere tıklamak serbestken görünenleri oraya toplar, dizilimdeyken sürüyü oraya götürür.

## 26.11.2026: bölgeler, canlı üyelik, dizilimle hücum

- İHA sayısı 30. Her İHA'nın sayfada bir bölgesi var, serbestken orada dolaşır, sürüden ayrılınca oraya döner.
- Sürü kuruluyken görüş alanına giren İHA katılır, kaydırmaya gerek yok. Sıradaki boş yuvaya kendisi uçar, sürüdekiler yerinden kıpırdamaz. 12 doluysa sürüdeki en eski üye (lider hariç) yuvasını bırakıp bölgesine döner, yeni gelen onun yuvasına girer. Bölgesinden uzaklaşan üye ayrılmaz (Ali'nin isteği, bir önceki kural kaldırıldı).
- Her sürünün bir lideri var: kurulurken görüş alanının ortasına en yakın İHA. Lider olduğu yerde kalır, sürü onun çevresinde kurulur. Lider metin renginde ve çevresinde ince altın bir halkayla çizilir. Halka diziliminde lider ortada durur.
- Yabancı sürü geldiğinde bizimkiler dağınıksa önce dizilime girer, yabancılara dönük. Fark ettikten sonra dizilimle hücum eder, 130 px yaklaşınca her İHA kendine en yakın yabancıyı kovalar, hedefin biraz ilerisine nişan alır. Dizilim zaten kuruluysa doğrudan hücuma geçer.
