# Gün 3: Model metni nasıl anlıyor?

📖 Yazı: [AI Engineer Oluyoruz — Gün 3](GUN_3_LINKI)

Bu günün deneyleri **API anahtarı gerektirmiyor**, tamamen kendi bilgisayarında çalışıyor.

| Dosya | Deney | Komut |
|---|---|---|
| `tokenizer.mjs` | Tokenizer'ı gözle görmek | `npm run tokenizer` |
| `embedding.mjs` | Embedding ile anlam benzerliğini ölçmek | `npm run embedding` |
| `attention.mjs` | Attention'ı kendi elinle hesaplamak | `npm run attention` |

## Çalıştırma

```bash
npm install
npm run attention
```

> `embedding.mjs` ilk çalıştırmada embedding modelini internetten indirir, bu yüzden biraz sürebilir. Sonraki çalıştırmalar hızlıdır.
