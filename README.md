# Kayıt Asistanı — Yaşar Üniversitesi ders kaydı ön hazırlık

OBS'de kayıt yapmadan **önce** ders sepetini hazırlayıp tüm kuralları anında kontrol eden tek sayfalık web uygulaması.

Çözülen 3 sorun:

1. **Çakışma ve program**: Haftalık program, çakışan dersleri kırmızı gösterir. Çakışmayan bir şube varsa tek tıkla ona geçilir. Katalogda her şubenin sepetteki hangi dersle çakışacağı eklemeden önce görünür.
2. **Ön koşul ve AKTS sınırı**: Ön koşul, 40/32 AKTS sınırı, 20 AKTS asgari yük, geçilmiş ders tekrarı ve sınamalı öğrencinin alttan ders önceliği canlı olarak denetlenir. Her hatanın yanında "Çöz" butonu vardır.
3. **Kontenjan ve Plan B**: Her şubenin doluluk çubuğu vardır. Her ders için sıralı yedekler eklenebilir. "Kayıt günü simülasyonu" kontenjanları doldurur ve Plan B'nin otomatik devreye girdiğini gösterir.

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # kural motoru testleri
npm run build    # üretim derlemesi, ardından: npm run preview
```

Sunum için hazır linkler:

- `http://localhost:5173/?demo&student=ayse`: Başarılı öğrenci. Çakışma, dolu şube ve neredeyse dolu şube içerir.
- `http://localhost:5173/?demo&student=mert`: Sınamalı öğrenci. Alttan ders önceliği, ön koşul hatası ve 32 AKTS sınırı içerir.

Uygulama içindeki "Örnek senaryo yükle" butonu aynı sepeti yükler.

## Yayınlama (link paylaşmak için)

**Canlı site:** https://crnbilg.github.io/kayit-asistani/

```bash
npm run deploy   # derler ve dist/ klasörünü gh-pages dalına yükler
```

Demo senaryoları: https://crnbilg.github.io/kayit-asistani/#demo-ayse · https://crnbilg.github.io/kayit-asistani/#demo-mert

### claude.ai Artifact sürümü

```bash
npm run build:artifact   # dist-artifact/kayit-asistani.html (CSS ve JS gömülü tek dosya)
```

Yayınlanmış sürüm: https://claude.ai/artifact/Q4zTjmCYwPa8BSUeFpVm6G. Linkin sonuna `#demo-ayse` veya `#demo-mert` eklenince ilgili senaryo açılır. Bu tek dosya Netlify Drop, GitHub Pages gibi herhangi bir statik barındırmaya da yüklenebilir.

## Yapı

| Dosya | Görev |
|---|---|
| `src/rules/yasarRules.ts` | Tüm kural sabitleri ve kaynak linkleri. Kural değişirse yalnızca burası güncellenir. |
| `src/rules/engine.ts` | `validateCart` (kural motoru), statü, ön koşul, Plan B önerileri |
| `src/rules/conflicts.ts` | Saat çakışması ve alternatif şube bulma |
| `src/rules/simulate.ts` | Kayıt günü simülasyonu ve Plan B uygulama |
| `src/data/*.json` | Demo ders kataloğu ve öğrenciler |
| `src/components/*` | Katalog, sepet, haftalık program, uyarılar, Plan B, "Kayda Hazır" ekranları |

## Kural kaynakları

- [ÖİM: Ders Kayıtları](https://oim.yasar.edu.tr/ders-kayitlari/): 40 AKTS (başarılı), 32 AKTS (sınamalı), GANO ≤ 1,99 sınamalı, asgari 20 AKTS
- [Ön Lisans ve Lisans Eğitim-Öğretim ve Sınav Yönetmeliği](https://mevzuat.gov.tr/File/GeneratePdf?mevzuatNo=22754&mevzuatTertip=5&mevzuatTur=UniversiteYonetmeligi): ön koşul, F/W/U/NA tekrar zorunluluğu

> Ders kataloğu ve öğrenciler demo verisidir; gerçek OBS'ye bağlanılmaz.
