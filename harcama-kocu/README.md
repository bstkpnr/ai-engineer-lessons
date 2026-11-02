# Harcama Koçu 💸

**AI Engineer Oluyoruz** serisinde 5 günde öğrendiklerimizi tek bir mobil uygulamada birleştirdiğimiz proje.

Banka SMS'lerini yapıştırıyorsun; uygulama harcamaları çıkarıp kategorilere ayırıyor, özetini gösteriyor ve harcamaların hakkında bir koçla sohbet etmeni sağlıyor.

| Ekle | Harcamalar | Koç |
|---|---|---|
| ![Ekle](screenshots/1-ekle.png) | ![Harcamalar](screenshots/2-harcamalar.png) | ![Koç](screenshots/3-koc.png) |

## Projenin en önemli kuralı

> **Model okur ve konuşur, kod hesaplar.**

Model SMS'ten tutarı metin olarak çıkarıyor (`"1.250,00"`), onu sayıya çeviren, toplayan ve yüzdeyi hesaplayan kod. Koç da toplamları kendisi hesaplamıyor; kodun hazırladığı özeti yorumluyor. Para işinde yanlış toplam kabul edilemez ve Gün 3'te gördüğümüz gibi model sayıları token parçaları olarak görüyor.

## Hangi özellik hangi günden geliyor?

| Gün | Konu | Uygulamadaki karşılığı |
|---|---|---|
| 1 | İlk API çağrısı | Uygulama → backend → model. API anahtarı sadece backend'de |
| 2 | Token, maliyet, hafızasızlık | Geliştirici modunda her isteğin token ve maliyeti. Koç önceki soruları hatırlıyor çünkü geçmişi her istekte biz gönderiyoruz (son 10 mesaj) |
| 3 | Tokenization | Model sayı hesaplamıyor; tutarlar kodla ayrıştırılıyor ve toplanıyor |
| 4 | Temperature, streaming, prompt caching | Veri çıkarmada `temperature: 0`, sohbette `0.7` (model bu ayarı reddederse otomatik olarak onsuz devam ediliyor). Koçun cevabı kelime kelime akıyor. System prompt ve özet önbelleğe alınıyor |
| 5 | System prompt, few-shot, JSON, doğrulama, injection | SMS'ten JSON çıkarma, her işlemin doğrulanması, hassas veri maskeleme, "yatırım tavsiyesi verme" kuralı |
| 7 | Tool use (araç kullanımı) | Koç rakam gereken sorularda backend'deki araçları kendisi çağırıyor; hesabı kod yapıyor |
| 8 | Embedding ve anlamsal arama | "Kahveye ne kadar harcadım?" gibi sorularda satıcı adı geçmese bile anlamca yakın harcamaları buluyor |

## Koçun araçları (Gün 7)

Koç işlem listesinin tamamını görmüyor; sadece genel bir özet görüyor. Daha detaylı bir rakam gerektiğinde şu araçlardan birini çağırıyor:

| Araç | Ne yapar | Örnek soru |
|---|---|---|
| `kategori_toplami` | Bir kategorinin toplamı, işlem sayısı, ortalaması | "Market harcamalarım toplam ne kadar?" |
| `satici_ara` | Bir satıcıya yapılan işlemler ve toplamı | "Migros'a ne kadar harcadım?" |
| `en_buyuk_islemler` | En yüksek tutarlı harcamalar | "En büyük 3 harcamam neler?" |
| `tasarruf_hesapla` | Bir kategori yüzde X azalırsa tasarruf | "Yemek siparişini %30 azaltsam ne kadar biriktiririm?" |
| `anlamsal_ara` | Anlamca sorguya yakın satıcılar ve toplamları (Gün 8) | "Kahveye ne kadar harcadım?", "Dijital aboneliklerim?" |

Akış: Model bir aracı ister → backend aracı işlemler üzerinde çalıştırır → sonuç modele geri verilir → model cevaba devam eder. Bir cevap için en fazla 5 adım atılabilir. Uygulamada koçun her araç çağrısı cevabın üstünde kısa bir not olarak görünür.

## Anlamsal arama (Gün 8)

`satici_ara` kelimeyle arar: "kahve" dersen "Starbucks"u bulamaz. `anlamsal_ara` ise anlamla arar.

- Veri çıkarma sırasında model her işleme kısa bir açıklama ekliyor (Starbucks → "kahve zinciri").
- Her satıcı `"Starbucks: kahve zinciri (Yeme-İçme)"` gibi bir metne çevrilip **embedding**'e, yani anlamını temsil eden bir sayı dizisine dönüştürülüyor.
- Sorgu da aynı şekilde vektöre çevriliyor; benzerliği en yüksek satıcılar seçiliyor, toplamı yine kod hesaplıyor.
- Embedding modeli yerelde çalışıyor (`Xenova/paraphrase-multilingual-MiniLM-L12-v2`, Türkçe destekli). Veri hiçbir yere gönderilmiyor, ek API anahtarı gerekmiyor.
- İlk çalıştırmada modelin sıkıştırılmış hali (~120 MB) bir kez indirilir ve `backend/node_modules/@huggingface/transformers/.cache` altına kaydedilir. İndirilemezse (internet yok, disk dolu) koç çökmez; kelime tabanlı yedek aramaya geçer ve bunu belirtir.
- Disk dolduğu için indirme yarıda kaldıysa: yer açtıktan sonra yarım kalan önbelleği sil (`rm -rf backend/node_modules/@huggingface/transformers/.cache`) ve sunucuyu yeniden başlat.

Ayarlar (ana `.env`, isteğe bağlı):
```
EMBEDDING_MODEL=Xenova/paraphrase-multilingual-MiniLM-L12-v2
SEMANTIC_MIN_SCORE=0.4   # Bu benzerliğin altındaki satıcılar eşleşme sayılmaz
EMBEDDING_DTYPE=q8       # q8 = sıkıştırılmış (~120 MB), fp32 = tam (~470 MB)
EMBEDDING_CACHE_DIR=...  # Modeli başka bir diske kaydetmek istersen
```

## Geliştirici modu

Sağ üstteki anahtarı açınca her işlemin altında "arka planda ne oldu" paneli çıkıyor: model, temperature, input/output token, önbellek durumu, maliyet, `stop_reason`, ilk token süresi ve modele giden prompt.

## Çalıştırma

### 1. Backend

```bash
cd backend
npm install
npm start      # Ana klasördeki .env dosyasındaki ANTHROPIC_API_KEY ile
# ya da
npm run demo   # API anahtarı olmadan, kural tabanlı demo modu
npm test       # Tutar ayrıştırma, maskeleme, araç ve anlamsal arama testleri
```

| Endpoint | Açıklama |
|---|---|
| `POST /extract` | `{ "text": "..." }` gönder, işlemleri ve atlanan satırları al |
| `POST /chat` | `{ "summary": {...}, "islemler": [...], "messages": [...] }` gönder, cevabı ve araç çağrılarını satır satır (NDJSON) akış olarak al |
| `GET /stats` | Toplam istek, token ve önbellek kullanımı |
| `GET /health` | Sunucu durumu ve mod (demo / model) |

Tahmini maliyeti görmek için ana `.env` dosyasına modelin güncel fiyatlarını ekle (1 milyon token başına USD):
```
INPUT_PRICE_PER_MTOK=...
OUTPUT_PRICE_PER_MTOK=...
```

### 2. Mobil uygulama

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

Telefonunda **Expo Go** ile QR kodu okut. `.env` içindeki `EXPO_PUBLIC_API_URL` değerine `localhost` yerine bilgisayarının yerel ağ IP adresini yaz (macOS: `ipconfig getifaddr en0`). Telefon ve bilgisayar aynı Wi-Fi ağında olmalı.

## Bilinçli olarak yapmadıkları

- **Bankaya bağlanmıyor.** Kullanıcı veriyi kendisi yapıştırıyor.
- **Yatırım tavsiyesi vermiyor.** Koçun system prompt'unda açık bir kural var.
- **Veriyi saklamıyor.** Her şey uygulamanın belleğinde; uygulama kapanınca silinir.
- **Kur çevirmiyor.** Döviz harcamaları ayrı listeleniyor, TL toplamına eklenmiyor.

Örnek SMS'lerdeki banka ("BANKAM"), kart numarası ve tutarlar tamamen kurgusaldır.

## Klasör yapısı

```
backend/
  server.mjs           Express sunucusu, streaming ve hata yönetimi
  src/prompts.mjs      Veri çıkarma ve koç system prompt'ları
  src/extractor.mjs    SMS → JSON (temperature 0, önbellekli system prompt)
  src/coach.mjs        Streaming sohbet ve araç kullanma döngüsü
  src/tools.mjs        Koçun araçları (kategori, satıcı, en büyükler, tasarruf, anlamsal)
  src/embeddings.mjs   Yerel embedding modeli ve benzerlik
  src/semanticSearch.mjs  Anlamsal arama ve yedek kelime araması
  src/schema.mjs       Kategoriler, tutar ayrıştırma ve doğrulama
  src/mask.mjs         Kart, IBAN, TCKN, telefon, e-posta maskeleme
  src/stats.mjs        Token, önbellek ve maliyet takibi
  src/demo.mjs         API anahtarı olmadan çalışan taklit
mobile/
  src/summary.ts       Bütün hesaplar burada (model değil, kod)
  src/store.tsx        Uygulama durumu ve mükerrer kayıt kontrolü
  src/api.ts           Backend istemcisi ve streaming okuyucu
  src/screens/         Ekle, Harcamalar, Koç
  src/components/      Geliştirici paneli, sekme çubuğu, kartlar
```
