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

## 26.11.2026: ayrıntı sayfaları, ilk sayfa Sürü İHA

- Ali'nin isteği: menüdeki yedi başlığın her biri için ayrı, daha ayrıntılı ve daha etkileşimli bir sayfa. Ana sayfa olduğu gibi kalıyor, Sürü İHA bölümünün altına yalnızca "Ayrıntılı incele" bağlantısı eklendi. Sayfalar tek tek, Ali'ye sorularak yapılıyor.
- Sürü İHA sayfası `/suru-iha/` ve `/en/swarm/`. Ali'nin seçtiği bölümler: roller, Görev 1 oynatıcısı, komut konsolu, lider düşerse, dizilim geometrisi. Görev 2'deki "sürüyü sen uçur" bölümü seçilmedi. Başta "neden İHA, neden sürü" anlatımı ve alan tarama benzetimi var, bunlara Ali "sen karar ver" dedi.
- Dil: her bölüm sade bir cümleyle açılır, komut adları, durum makineleri ve formüller "Teknik ayrıntı" kutusunda kapalı durur.
- Görünüm eğik 3B (Ali'nin seçimi). 3B kütüphanesi kullanılmadı, 2B tuval üstünde elle yazılmış perspektif izdüşüm var (`src/scripts/uc-boyut.ts`). Sayfa hızlı kalıyor, telefonda da çalışıyor. Ziyaretçi sürükleyerek ya da düğmeyle görünümü değiştirebiliyor.
- Uçuş modeli (`src/scripts/suru-model.ts`) takımın uçuş kodundan alındı: dizilim ofsetleri, 8 m aralık ve irtifa, yatışta irtifa ofseti (tan(açı) · 2), yuvaların korunması, lider seçiminde 5 + numara saniyelik kademeli zaman aşımı, QR içeriğinin kısa biçimi (`frm`, `alt`, `mnv`, `leav`, takım numarası 1), komut paketlerinin alanları.
- Ön Tasarım Raporu'ndaki döndürme formülünün ikinci satırında işaret hatası var (sin·x − cos·y). Sayfada koddaki doğru biçim kullanıldı: y = sin θ · ileri + cos θ · yan.
- Görev 1'deki QR noktalarının yeri, rota ve QR içerikleri örnektir, sayfada da öyle yazıyor. Süreler kısaltıldı, İHA'lar görünsün diye büyük çizildi.
- "Neden İHA" kartlarındaki örnekler (enkaz, yangın, köprü, tarla, boru hattı) genel bilgidir, takıma ait bir iddia değildir. Takıma ait sayı ve teknik bilgilerin hepsi Ön Tasarım Raporu'ndan.
- Ayrıntı sayfalarında menü, sayfası olan bölüm için o sayfaya, öteki bölümler için ana sayfadaki yerine gider.
- Alan tarama iki panele ayrıldı (Ali'nin isteği): solda tek İHA, sağda 3 ile 6 arası İHA'lık sürü. Tek düğmeyle aynı anda başlarlar, süre her panelin üstünde yazar. İki panel tek saatle ilerler, böylece fark gerçek. Sürüden ya da tek İHA'dan biri düşürülebilir.
- `icerik.yaml` içinde `{ tr: ..., en: ... }` biçiminde tırnaksız yazılan metin ilk virgülde kesiliyormuş, şema da kalan parçayı sessizce atıyormuş. Sürü İHA sayfasında 15 metin, ana sayfada 2 metin (İngilizce "2nd in Türkiye, Preliminary Design Report" başlığı ve ilk galeri fotoğrafının açıklaması) kesik çıkıyordu. Hepsi düzeltildi. Derleme artık kesik metin bulursa hata verip duruyor. Uzun metinler ayrı satırda yazılıyor.
- Sürü İHA sayfasının metinleri Ali'nin "çok yapay duruyor" uyarısı üzerine yeniden yazıldı: daha uzun ve somut cümleler, kalıp başlıklar yerine düz adlar.

## 26.11.2026: Matris sayfası, İHA'nın içi, mesh ağ

- İkinci ayrıntı sayfası Matris (`/matris/`, `/en/matris/`). Ali'nin seçtiği bölümler: neden bu işi yapıyoruz, hikâye ve zaman çizgisi, sayılarla Matris, İHA'nın içi. Rapor özeti, veri akışı şeması ve arıza senaryoları seçilmedi.
- İHA'nın içi takımın gerçek aracını gösteriyor (Ali'nin isteği): F450 gövde, Pixhawk 2.4.8, Raspberry Pi 4, Global Shutter kamera, M8N GPS, UWB, 11,1 V 3S Li-Po, Emax 820KV motor, 30 A ESC, FS-iA10B alıcı, Hobbywing UBEC. Hepsi Ön Tasarım Raporu'ndan. Ali'nin isteğiyle donanım adları artık sitede. Çizimdeki yerleşim ve ölçüler temsilî, bunu sayfa da söylüyor.
- Aynı çizimin kısa hali (hat düğmeleri olmadan) ana sayfadaki Matris bölümüne de kondu (Ali'nin isteği). İkisi tek bileşen: `src/components/IhaIci.astro`.
- Mesh ağ ve menzil benzetimi Ali'nin isteğiyle Sürü İHA sayfasına kondu. Menzil değeri gerçek değil.
- Hikâye metinleri: Ali "biraz senaryo oluştur, duruma göre düzeltiriz" dedi. Kuruluş yılı bilinmediği için yazılmadı. 2026 durakları rapordaki proje takviminden ve "Planlanan Geliştirmeler" bölümünden. "Neden" paragrafları ile "Başlangıç" ve "2024" duraklarının ikinci cümleleri taslak, takım düzeltecek (EKSIKLER).
- Sayılar (üye, ekip, dal, finalistlik) içerik dosyasındaki verilerden hesaplanıyor, elle yazılmıyor.
- İHA'nın içi baştan yapıldı. Ali ilk sürümü (2B tuvalde tel kafes kutular) beğenmedi, "çok daha iyi ve gerçekçi" istedi. İnternette ve GitHub'da açık lisanslı, parçaları ayrı bir F450 modeli arandı, bulunamadı (çıkanlar ücretli pazar yeri modelleri ya da başka gövdeler). Bu yüzden model three.js ile kodla kuruldu ve takımın atölye fotoğrafı (`arac-tezgah.jpg`) örnek alındı: iki kırmızı iki beyaz kafes kol, altın kenarlı siyah plakalar, gümüş Emax motorlar, beyaz 3B baskı taşıyıcıda Raspberry Pi ve üstünde Pixhawk, iki beyaz direk (GPS ve UWB), öndeki FS alıcı. Gerçek ışık, gölge ve malzeme var.
- three.js sitedeki ilk kütüphane (yaklaşık 535 KB, sıkıştırılmış hali daha küçük). Yalnızca İHA bölümü ekrana yaklaşınca indiriliyor, sayfanın ilk açılışına yük olmuyor. WebGL açılamazsa çizim alanı gizleniyor, parçalar düğmelerle okunmaya devam ediyor.
- "Benzetim" sözcüğü sitedeki bütün görünen metinlerde "simülasyon" yapıldı (Ali: Türkçede böyle kullanılmıyor).
- Matris sayfasında "Neden bu işi yapıyoruz" ve "Bundan sonrası" Ali'nin söylediklerine göre yeniden yazıldı: TEKNOFEST'te derece, iyi takım ortamı ve arkadaşlık, başka yarışma ve projeler, herkesin kendine bir şey katması.
- İHA modeli ikinci kez elden geçti (Ali: "illa bizimki gibi olacak diye bir şey yok, daha iyi bir tasarım yapabilirsin"). Parçalar aynı, görünüm daha derli toplu: ön kollar altın sarısı, arka kollar grafit, siyah taşıyıcı, kızaklı iniş takımı, tek ince GPS direği. Sayfadaki not artık modelin yarışmadaki araçla birebir aynı olmadığını söylüyor.
- UWB modülü direkten alındı (Ali: "orada değil, başka yerde olacak"). Gerçek yeri söylenmediği için arka uzantıya dik duran bir kart olarak kondu, Ali'ye soruldu.
- Kendiliğinden dönme artık kalıcı durmuyor: imleç üstündeyken ya da bir şeye basılınca duruyor, kısa bir süre sonra sürüyor.
- Parça seçilince: kamera parçaya yaklaşıyor, öteki parçalar saydamlaşıyor, parça yerinden biraz çıkıyor, bağlı olduğu parçalara giden hatlar çiziliyor ve panelde tıklanabilir "bağlı olduğu parçalar" listesi çıkıyor. Motor ve pervanede pervaneler dönüyor, GPS, Wi-Fi, UWB ve alıcıda anten dalgaları yayılıyor, kamerada yerdeki QR koduna bakan görüş alanı görünüyor.
- Takım sayfası (/takim/, /en/team/) Ali'nin seçtikleriyle kuruldu: tıklanan organizasyon şeması, ayrıntılı üye kartları (ekip, dal, arama), takım ortamı, danışmanlar (ad ve izin gelene kadar görünmez), en altta takıma katıl. "Hangi ekip neyi yapıyor (3B)", "bir komut kimlerin elinden geçiyor" ve "eski üyeler" seçilmedi.
- 17 üye kaydının hepsi ekip ve dala yerleştirildi (Ali: "17 tane yap, kafana göre yerleştir, bazı noktalara 2 kişi yerleşebilir"). İlk dokuzu ÖTR şemasından, son sekizinin görevi ve dalı taslak. Ana sayfadaki "yerleşecek üyeler" sırası böylece boşaldı.
- Takıma katıl düğmesi matristechnology@gmail.com adresine konu ve gövdesi dolu bir e-posta taslağı açar, seçilen dal gövdeye yazılır. Ali adresi "matristechnologygmail.com" diye yazdı, @ eklenerek kullanıldı.
- Çalışmalar sayfası (/calismalar/, /en/work/) Ali'nin seçtikleriyle kuruldu: tıklanan dört aşama, atölye anlatımı (Ali: "atölyede elektronikçilerin drone'la uğraşmasından da bahsedebilirsin"), raporların nasıl hazırlandığı ve dereceler (Ali: "çok detaya inmeden", araştırma, sonra günlerce haftalarca simülasyon ve canlı test). Simülasyondan sahaya, görevin anatomisi, failsafe, yazılım mimarisi, teknoloji yığını ve öteki projeler seçilmedi.
- Rapordaki ölçüm sonuçları ve parametre değerleri sayfaya yazılmadı. Geliştirme sürecindeki altı iyileştirme "Teknik ayrıntı" kutusunda, sade dille.
- Çalışmalar sayfasında "Atölyede bir gün" bölümü Ali'nin isteğiyle şimdilik kaldırıldı (icerik.yaml, calisma_sayfa.atolye.goster: false, metin duruyor). Dört aşama sekme yerine alt alta akışa çevrildi: kaydırdıkça kartlar belirir, yandaki çizgi dolar (Ali: "aşağı doğru kaydırdıkça animasyonlu gelme gibi").
- Çalışmalar sayfasındaki "Teknik ayrıntı" kutusu (denemelerde bulup düzelttiklerimiz) Ali'nin isteğiyle kaldırıldı, metin icerik.yaml'da duruyor.
- Galeri sayfası (/galeri/, /en/gallery/) Ali'nin seçtikleriyle kuruldu: konuya göre süzgeç, küçük resim şeritli büyük görüntüleyici, videolar, Instagram'a yönlendirme. Ali'nin isteğiyle fotoğrafı ve videosu henüz gelmemiş yerler boş şablon kare olarak duruyor (7 fotoğraf, 3 video). Videolar tıklanana kadar YouTube'dan hiçbir şey yüklemez. Zaman çizgisi, öne çıkan kareler ve öncesi sonrası seçilmedi.
- Üst menü (Ali, 26.11.2026): ayrıntı sayfası olan başlıklar (Sürü İHA, Matris, Takım, Çalışmalar, Galeri) artık ana sayfada da o sayfayı açıyor. Başa "Ana Sayfa" eklendi. Destek ve İletişim sayfaları yapılana kadar ana sayfadaki bölümlerine iniyor.
- Destek sayfası (/destek/, /en/support/) Ali'nin seçtikleriyle kuruldu: neden Matris, destek türleri, sponsor paketleri tablosu, logonun görüneceği yerler (çizimle), 3B model üzerinde ihtiyaç grupları, sponsor şablon kutuları, sık sorulanlar. Düğme sponsorluk sorumlusunun adresine konusu ve gövdesi dolu taslak açar, seçilen tür ve paket gövdeye yazılır. Sayfada tutar, telefon ve IBAN yok. Menüdeki Destek ve "Destek ol" artık bu sayfayı açıyor.
- 3B modele "vurgu" eklendi: birden çok parça birlikte öne çıkarılabiliyor (ihtiyaç grupları bunu kullanıyor).

## İletişim sayfası (27.11.2026)

- Ali'nin seçtiği bölümler: iletişim kartları ve haritada üniversitenin yeri.
- Sponsorluk konuları sponsorluk sorumlusuna, genel sorular ve basın takım adresine gider. Ali takım kaptanı olarak kendi adresinin de yayımlanmasını istedi, kartta ad yazmıyor.
- Harita OpenStreetMap gömmesi. Sayfanın açılışını bekletmesin diye bölüm ekrana yaklaşınca yüklenir, betik kapalıyken yerine bağlantılar durur.
- Üst menüde İletişim artık bu sayfayı açıyor. Yedi başlığın hepsinin ayrıntı sayfası var.

## Ana sayfa sadeleştirme (27.11.2026)

- Ali'nin onayıyla ana sayfa özet haline getirildi: takım bölümünde 17 üye kartı yerine üç ekip kartı, ihtiyaç listesi ve başarı çizgisi kaldırıldı (ikisi de ayrıntı sayfalarında duruyor).
- Sayfa altlarına önceki, ana sayfa, sonraki geçişi eklendi. Site ikonu logodaki M harfi, alt yazı "Matris Technology".
- sitemap.xml eklendi, robots.txt onu gösteriyor.

## Görünürlük (27.11.2026)

- Yapısal veri, aranan cümleyle sayfa başlıkları, sık sorulanlar sayfası (`/sss/`, menüde yok, alt bilgiden ulaşılır), `llms.txt` eklendi.
- "TÜBİTAK" kelimesi doğrulanmış bir bağ olmadan siteye yazılmadı.
- Site dışındaki adımlar `docs/GORUNURLUK.md` içinde, Ali yapacak.

## Sponsor paketleri ve 3B tişört (27.11.2026)

- Ali'nin verdiği kural: tişörtte ana sponsor göğüste, altın kolda, gümüş sırtın üstünde (iki büyük panel), destekçi sırtın altında (dört panel). Destekçiye teşekkür mesajı var.
- Etkinlik, yarışma, sunum ve raporlarda dört paket de anılıyor, ana sponsor ve altın "ön planda".
- Destek sayfasında tişört three.js ile kodla kurulan 3B model. Paket seçilince o yüzünü çevirir, paket tablosundaki seçim de tişörte yansır.

## Tişört modeli yenilendi (27.11.2026)

- Ali'nin geri bildirimi: ilk model kare duruyor, ön arka belli değil, forma siyah ve üstünde Matris logosu olmalı. Yeni model siyah polo yaka: düğmeli pat, yaka, kol bantları, kolda bayrak arması, sol göğüste Matris logosu (`public/tisort-logo.png`, saydam zeminli).
- Sırtta üstte okul adı (yazı olarak, BTÜ amblemi konmadı), altında gümüş (2 büyük panel), onun altında destekçi (4 panel). Ana sponsor sağ göğüste, altın kollarda.
- Ön ve arka: ekranda "Ön / Arka / Yan" etiketi ve Ön, Arka düğmeleri var.

## Arka plan sürüsü: üçerli sürüler, Destek'te tişört ilk sekme (27.11.2026)

- Ali'nin tarifi: dronelar 3'erli sürü halinde formasyona girer, yeni gelen boş yuvası olan bir sürüye katılır, sürüden kimse ayrılmaz, formasyon bozulunca herkes kendi bölgesine uçar. Eski kural (sürü doluysa en eski üye ayrılır) kaldırıldı.
- Her sürünün kendi lideri, formasyonu ve planı var. En çok 12 araç, 4 sürü. Sayı üçe bölünmezse son sürü eksik kalır, boş yuvası silik halkayla gösterilir.
- Boş yuva yoksa ve ekranda üç boşta araç varsa yeni sürü kurulur.
- Yabancı sürü sahnesi korundu: bütün sürüler birlikte hücum eder.
- Destek sayfasında "Logonuz nerede görünür?" bölümü artık tişörtle açılıyor.
