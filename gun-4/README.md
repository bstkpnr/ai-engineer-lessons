# Gün 4: Model cevabı nasıl üretiyor?

📖 Yazı: [AI Engineer Oluyoruz — Gün 4](https://medium.com/@bstkpnr/ai-engineer-oluyoruz-g%C3%BCn-4-model-cevab%C4%B1-nas%C4%B1l-%C3%BCretiyor-c5f714087470?postPublishedType=initial)

İlk üç deney **API anahtarı gerektirmiyor** ve hiçbir kütüphane kurmadan çalışıyor.

| Dosya | Deney | Komut |
|---|---|---|
| `temperature.mjs` | Temperature'ı kendi elinle uygulamak | `npm run temperature` |
| `sampler.mjs` | Greedy, top-k ve top-p örnekleyicileri | `npm run sampler` |
| `train.mjs` | Gradient descent ile mini eğitim | `npm run train` |
| `caching.mjs` | Prompt caching (API anahtarı gerekir) | `npm run caching` |

## Çalıştırma

```bash
npm install
npm run temperature
```

> `caching.mjs` için API anahtarının ana klasördeki `.env` dosyasında olması gerekiyor.
