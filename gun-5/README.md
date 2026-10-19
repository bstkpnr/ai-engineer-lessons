# Gün 5: Modelden istediğini almak (Prompt Engineering)

📖 Yazı: [AI Engineer Oluyoruz — Gün 5](https://medium.com/@bstkpnr/ai-engineer-oluyoruz-g%C3%BCn-5-system-prompt-few-shot-ve-%C3%A7%C4%B1kt%C4%B1-do%C4%9Frulama-e4fe86af895a?postPublishedType=initial)

Kötü bir prompt'tan başlayıp her teknikle adım adım iyileşen bir **uygulama yorumu analizcisi**.

| Dosya | Adım | Komut |
|---|---|---|
| `01-bad-prompt.mjs` | Belirsiz prompt | `npm run bad` |
| `02-clear-prompt.mjs` | Net talimat, bağlam ve amaç | `npm run clear` |
| `03-system-and-tags.mjs` | System prompt, etiketler ve prompt injection | `npm run system` |
| `04-few-shot.mjs` | Örneklerle yönlendirme ve JSON | `npm run few-shot` |
| `reviewAnalyzer.mjs` | Tüm tekniklerle bitmiş analizci | `npm run analyze` |

Örnek yorumlar `reviews.mjs` dosyasında; kendi yorumlarını ekleyip deneyebilirsin.

## Çalıştırma

```bash
npm install
npm run analyze
```

> API anahtarının ana klasördeki `.env` dosyasında olması gerekiyor.
