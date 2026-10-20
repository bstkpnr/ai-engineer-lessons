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
| 4 | Temperature, streaming, prompt caching | Veri çıkarmada `temperature: 0`, sohbette `0.7`. Koçun cevabı kelime kelime akıyor. System prompt ve özet önbelleğe alınıyor |
| 5 | System prompt, few-shot, JSON, doğrulama, injection | SMS'ten JSON çıkarma, her işlemin doğrulanması, hassas veri maskeleme, "yatırım tavsiyesi verme" kuralı |

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
npm test       # Tutar ayrıştırma ve maskeleme testleri
```

| Endpoint | Açıklama |
|---|---|
| `POST /extract` | `{ "text": "..." }` gönder, işlemleri ve atlanan satırları al |
| `POST /chat` | `{ "summary": {...}, "messages": [...] }` gönder, cevabı satır satır (NDJSON) akış olarak al |
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
  src/coach.mjs        Streaming sohbet (temperature 0.7, önbellekli özet)
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
