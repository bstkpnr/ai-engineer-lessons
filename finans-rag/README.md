# finans-rag

Türkçe finans dokümanları (kanun, kredi kartı sözleşmesi) üzerinde soru cevaplayan ve **her cevabın hangi belgenin hangi sayfasından geldiğini gösteren** bir RAG servisi.

[AI Engineer Oluyoruz](https://medium.com/@bstkpnr) serisindeki [Harcama Koçu](https://github.com/bstkpnr/ai-engineer-lessons/tree/main/harcama-kocu) uygulamasının doküman tarafı olarak yazıldı, ama tek başına da çalışır.

```
           ┌─► anlam araması (embedding) ─┐
Soru ──────┤                              ├─► RRF ile birleştir ─► LLM (sadece bu parçalarla) ─► cevap + kaynaklar
           └─► kelime araması (BM25) ─────┘                         │
                                                                    └─ "cevaplanabildi: false" → kaynak yok, "bulamadım"
```

## Ne yapar?

- **`POST /search`**: Soruya en yakın doküman parçalarını benzerlik skoru, belge adı, sayfa ve madde bilgisiyle döndürür. Harcama Koçu bu uç noktayı `dokuman_ara` aracıyla çağırır.
- **`POST /ask`**: Bulunan parçalardan, `[1]`, `[2]` diye kaynak gösteren bir cevap üretir.
- **`GET /health`**: Veritabanındaki parça sayısı ve eşik değeri.

```bash
curl -s localhost:8000/ask -H 'content-type: application/json' \
  -d '{"question": "Kartım çalınırsa sorumluluğum ne kadar?"}'
```

## Kurulum

[uv](https://docs.astral.sh/uv/) gerekir.

```bash
uv sync
cp .env.example .env          # ANTHROPIC_API_KEY'i yaz
```

### 1. Dokümanları indir

PDF'leri `data/` klasörüne, `data/sources.json` içindeki dosya adlarıyla kaydet:

| Dosya | Kaynak |
| --- | --- |
| `kanun-5464.pdf` | [mevzuat.gov.tr](https://www.mevzuat.gov.tr) üzerinde "5464" aratıp PDF olarak indir |
| `garanti-kredi-karti-sozlesmesi.pdf` | [Garanti BBVA kredi kartı sözleşmesi](https://m.garantibbva.com.tr/content/dam/public-website/pdf/kart/kredi-karti-sozlesmesi.pdf) |

Banka dokümanlarının hakkı bankaya ait olduğu için repoya konmuyor. Kanun metni resmi metin olduğu için repoda tutulabilir.

Başka bir doküman eklemek için `data/sources.json` dosyasına bir satır eklemen yeterli. `doc_type` değerleri: `mevzuat`, `sozlesme`, `tarife`, `genel`. Oran ya da ücret içeren dokümanlara `valid_from` (geçerlilik tarihi) eklersen cevapta bu tarih belirtilir.

### 2. Parçala ve yükle

```bash
uv run finans-rag-ingest --dry-run --show 3   # önce parçaları incele
uv run finans-rag-ingest --reset              # sonra yükle
```

İlk çalıştırmada embedding modeli (~220 MB) bir kez indirilir.

### 3. Servisi çalıştır

```bash
uv run --env-file .env uvicorn finans_rag.api:app --reload --port 8000
```

API belgeleri: http://localhost:8000/docs

> Yerel Qdrant klasörünü aynı anda tek bir süreç açabilir. Servis çalışırken yükleme yapacaksan önce servisi durdur ya da Qdrant'ı Docker'da çalıştır: `docker compose up -d` ve `QDRANT_URL=http://localhost:6333`.

## Tasarım kararları

**Parçalama dokümanın yapısına göre seçiliyor.** Kanun ve sözleşmeler önce maddelere bölünüyor. Bir madde genelde tek bir konuyu anlattığı için aramada isabet artıyor, kaynak gösterirken de "Madde 26" denebiliyor. Uzun maddeler yine bölünüyor ama her parça hangi maddeye ait olduğunu biliyor. Madde yapısı olmayan dokümanlar sayfa sayfa, LangChain'in `RecursiveCharacterTextSplitter`'ı ile bölünüyor: önce paragraf, sonra satır, sonra cümle sınırından. Tablolu ücret tarifelerinde satırlar dağılmasın diye daha küçük parçalar kullanılıyor.

**Hibrit arama: anlam ve kelime birlikte.** İlk gerçek denemede "Kartım çalınırsa ne yapmalıyım?" sorusunda anlam araması "4.2 Çalınma ve Kaybetme" bölümünü ancak 5. sıraya koyabildi; ilk sırada alakasız "uçuş mili" bölümü vardı (skorlar 0.25-0.28, birbirine çok yakın). Oysa "çalın" kelimesi o bölümde birebir geçiyor. Bu yüzden her parça için bir de kelime vektörü (BM25) saklanıyor. İki aramanın skorları farklı ölçeklerde olduğu için doğrudan toplanmıyor; Reciprocal Rank Fusion ile sıralarına göre birleştiriliyor. Türkçe ekler için her kelimenin ilk 4 ve 5 harfi terim olarak alınıyor ("çalınırsa" ve "çalınması" → "çalın"; "faiz" ve "faizi" → "faiz").

**"Cevap var mı" kararını skor değil model veriyor.** Aynı denemede alakasız "Hisse senedi almalı mıyım?" sorusu 0.45, alakalı "çalınma" sorusu 0.25 aldı: sabit bir benzerlik eşiği ikisini birden doğru ayıramaz. Eşik (`RAG_MIN_SCORE`) artık sadece kaba bir ön eleme. Model cevabını `{"cevaplanabildi": true/false, "cevap": "..."}` biçiminde veriyor; Pydantic ile doğrulanıyor ve `false` ise kaynak listesi boş dönüyor.

**İlgili parça yoksa model hiç çağrılmıyor.** Benzerliği `RAG_MIN_SCORE` eşiğinin altında kalan parçalar ilgili sayılmıyor. Hiç ilgili parça yoksa cevap doğrudan "bulamadım" oluyor. Model elinde kaynak yokken de bir şey söylemeye çalışır; en güvenli yol onu bu duruma hiç sokmamak.

**Kaynakları model değil kod belirliyor.** Model cevaptaki her bilgiyi `[n]` ile bir kaynağa bağlıyor. Cevaptaki numaraları kod okuyor ve kaynak listesini kendisi kuruyor: modelin uydurduğu bir numara listeye giremiyor. Hiç kaynak göstermeyen bir cevap "bulundu" sayılmıyor.

**Kaynak metinleri veri, talimat değil.** Parçalar modele `<kaynak>` etiketleri içinde veriliyor ve system prompt bu metinlerdeki talimatlara uyulmamasını söylüyor (prompt injection'a karşı).

**Aynı doküman tekrar yüklenince kopya oluşmuyor.** Parça kimlikleri dosya adı, sayfa ve sıradan üretiliyor; tekrar yüklemek üzerine yazıyor.

## Testler

```bash
uv run pytest
```

Testler gerçek model yerine kontrollü sahte bir embedding ve bellekte çalışan bir Qdrant kullanıyor; internet gerektirmiyor.

## Yapı

```
src/finans_rag/
  config.py      Ayarlar (ortam değişkenleri)
  models.py      Pydantic modelleri: Chunk, Hit, AskResponse...
  loader.py      PDF'ten sayfa sayfa metin, sources.json
  chunking.py    Maddeye ya da sayfaya göre parçalama
  embeddings.py  Çok dilli embedding modeli (fastembed)
  keyword.py     Kelime araması için BM25 vektörleri, Türkçe ekler
  store.py       Qdrant: yükleme, hibrit arama, RRF
  answer.py      Kaynak gösteren cevap üretimi
  api.py         FastAPI servisi
  ingest.py      Yükleme komutu
```
