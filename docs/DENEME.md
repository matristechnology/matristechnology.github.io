# Deneme tablosu

25.11.2026, yerel önizleme (`http://127.0.0.1:4321`), Playwright ile Chromium, Firefox ve WebKit.
Toplam: 35 geçti, 4 atlandı, 0 düştü. Atlananlar: E3 üç tarayıcıda (ayrıntısı olan gerçek üye yok), D5 WebKit'te (Safari Tab ile bağlantıya odaklanmıyor).

| No | Deneme | Sonuç | Kanıt |
|---|---|---|---|
| D1 | 320 ve 390 piksel | Geçti | Sayfa genişliği 320 ve 390, taşma 0. 390'da 44 pikselden küçük hedef yok |
| D2 | Baştan sona kaydırma | Geçti | Bütün öğeler belirdi, bölümlerin konumu ve sayfa yüksekliği kaydırma sonrası aynı |
| D3 | Hareketi azalt | Geçti | Sürü tuvali ve düğmesi yok, benzetim durağan, düğmeye basınca tek karede yeni dizilim |
| D4 | Betikler kapalı | Geçti | Başlıklar, kartlar, görseller görünür. Benzetimin yerinde 5 maddelik yazılı anlatım |
| D5 | Fare olmadan | Geçti (Chromium, Firefox) | Menü, benzetim düğmeleri (Enter, Boşluk), galeri (Enter, oklar, Esc) |
| D6 | Dil ve tema | Geçti | `/en/#team` adresine geçiş, İngilizce sayfada Türkçe başlık yok, tema ve sürü seçimi yenilemede duruyor |
| D6b | Karşıtlık | Geçti | Koyu: metin 16,6, soluk 7,8, vurgu 11,8. Açık: metin 16,7, soluk 6,8, vurgu 6,2 |
| D7 | İzin hayır | Geçti | Örnek veriyle derleme: izni olmayan "Gizli Kisi" iki dilde de çıktıda yok. Veri sonra geri alındı |
| D8 | Boş bölüm | Geçti | Galeri listesi boşaltılınca bölüm ve menü bağlantısı çıktıdan kalktı. Veri sonra geri alındı |
| D9 | Benzetim ölçümü | Geçti | 26.11.2026. Çizgide 5 araç, aralıklar 42 px. V'de takipçiler liderin 0,12 tuval boyu önünde, ok başında 0,12 arkasında. Bir araç düşünce 4 araç, aralıklar 42 ile 44 px. Lider düşünce yeni lider seçildi, aralıklar yine 42 ile 44 px |
| D9c | Arka plan sürüsü ve yabancı sürü | Geçti | Yabancı sürü geldi (kırmızı piksel var), 20 sn içinde önlendi, sonra ekranda kırmızı kalmadı. Dizilim eşleştirmesi 300 denemede kaba kuvvetle aynı, 500 rastgele geçişte kesişen yol yok |
| D9e | Arka plan sürüsü döngüsü | Geçti | Sayfanın ortasında ekranda 0 ile 2 İHA görünürken dizilime 5 İHA katıldı, dizilim kuruldu, 40 sn içinde dağıldı. Elle izlenen döngü: toplanma 2,8 sn, git, dönüş, git, dağıl, toplam 11,6 sn |
| D9d | Takım bölümü | Geçti | 3 ekip kutusu, 17 kaydın hepsi kartta ya da yerleşecekler sırasında, adsız kartta "İsim yakında". Süzgeç öteki ekipleri söndürüyor, dal katlanıp açılıyor |
| D9b | Görünmeyen benzetim | Geçti | Ekran dışındayken tuval 0,9 sn boyunca değişmedi |
| D10 | Bağlantılar | Geçti | Sayfa içi hedeflerin hepsi var, dış bağlantılar Instagram ve e-posta, olmayan sayfa 404 |
| D11 | Ham veriyle karşılaştırma | Elle yapıldı | Başarılar, tanıtım, ekip yapısı, süreç, sponsorluk metinleri tanıtım dosyasının 2, 3, 4, 5 ve 10. sayfalarından. Kendi yazdığım metinler KARAR.md içinde listeli |
| D12 | Sayfa denetim aracı | Yapılmadı | Lighthouse bu oturumda çalıştırılamadı |
| D13 | Canlı adres | Geçti | 26.11.2026, https://matristechnology.github.io/ üzerinde 34 geçti, 4 atlandı, 1 düştü. Düşen D10 (WebKit, 30 sn zaman aşımı) tek başına 3 kez çalıştırılınca 3 kez geçti: geçici |

Denemeleri yinelemek için: `npm run build && npm run preview`, sonra `npm test`.
