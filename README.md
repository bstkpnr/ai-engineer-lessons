# AI Engineer Oluyoruz 🚀

Bir mobil geliştiricinin AI Engineering öğrenme yolculuğu. Bu depo, Medium'daki **AI Engineer Oluyoruz** serisinin kod örneklerini içeriyor.

Her gün kendi klasöründe; yazıyı okurken ilgili klasördeki kodları çalıştırabilirsin.

## Yazılar

| Gün | Konu | Kodlar |
|---|---|---|
| 1 | [Bir mobil geliştirici neden yön değiştirir?](https://medium.com/@bstkpnr/ai-engineer-oluyoruz-g%C3%BCn-1-bir-mobil-geli%C5%9Ftirici-neden-y%C3%B6n-de%C4%9Fi%C5%9Ftirir-c1e50dbb3ee3) | [`gun-1`](./gun-1) |
| 2 | [LLM'ler aslında nasıl çalışıyor?](https://medium.com/@bstkpnr/ai-engineer-oluyoruz-g%C3%BCn-2-llmler-asl%C4%B1nda-nas%C4%B1l-%C3%A7al%C4%B1%C5%9F%C4%B1yor-64bc8b1a2598) | [`gun-2`](./gun-2) |
| 3 | [Model metni nasıl anlıyor?] (https://medium.com/@bstkpnr/ai-engineer-oluyoruz-g%C3%BCn-3-model-metni-nas%C4%B1l-anl%C4%B1yor-4b68cec111b1) | [`gun-3`](./gun-3) |

## Başlarken

**Gereksinimler:** [Node.js](https://nodejs.org) 20.6 veya üzeri

1. Depoyu klonla:
   ```bash
   git clone https://github.com/KULLANICI_ADIN/ai-engineer-oluyoruz.git
   cd ai-engineer-oluyoruz
   ```
2. API anahtarını ekle (Gün 1 ve Gün 2 için gerekli):
   ```bash
   cp .env.example .env
   ```
   Sonra `.env` dosyasını açıp kendi Anthropic API anahtarını yaz.
3. İstediğin günün klasörüne gir ve çalıştır:
   ```bash
   cd gun-2
   npm install
   npm run tokens
   ```

> ⚠️ `.env` dosyası `.gitignore` içinde, yani GitHub'a yüklenmez. API anahtarını asla koda ya da bir mobil uygulamanın içine yazma.

## İletişim

Sorular, öneriler ya da sadece merhaba demek için Medium'da yorum bırakabilirsin: [@bstkpnr](https://medium.com/@bstkpnr)
