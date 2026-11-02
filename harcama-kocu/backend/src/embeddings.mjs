// Gün 3'teki embedding modeli: metni anlamını taşıyan bir sayı listesine (vektöre) çevirir.
// Model senin bilgisayarında çalışır; ek API anahtarı ya da ücret gerekmez.
// İlk çalıştırmada model bir kez internetten indirilir (sıkıştırılmış hali ~120 MB).

const MODEL_ID = process.env.EMBEDDING_MODEL ?? "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
// q8: modelin sıkıştırılmış (quantized) hali. Tam hali ~470 MB, bu ~120 MB; arama kalitesi neredeyse aynı.
const DTYPE = process.env.EMBEDDING_DTYPE ?? "q8";

let extractorPromise = null;
let unavailable = false;
let guarded = false;
const cache = new Map(); // Aynı metni tekrar tekrar hesaplamamak için (metin → vektör)

// Model indirilirken disk dolarsa ya da yazma izni yoksa, kütüphanenin önbelleğe yazan dosya
// akışı yakalanmamış bir hata fırlatıp sunucuyu çökertebiliyor; bu hata yükleme başarısız
// olduktan biraz sonra da gelebiliyor. Bu yüzden yükleme sırasında ve başarısızlıktan sonraki
// kısa bir süre boyunca sadece dosya sistemi hatalarını yakalayıp yedek aramaya geçiyoruz.
const FS_ERRORS = new Set(["ENOSPC", "EACCES", "EPERM", "EROFS", "EDQUOT"]);
const GRACE_MS = 15_000;
function onLoadCrash(error) {
  if (FS_ERRORS.has(error?.code)) {
    markUnavailable(error);
    return;
  }
  // Bizimle ilgisi olmayan bir hata: Node'un normal davranışı gibi yazdır ve kapan
  console.error(error);
  process.exit(1);
}
function guard(on) {
  if (on === guarded) return;
  guarded = on;
  if (on) process.on("uncaughtException", onLoadCrash);
  else process.off("uncaughtException", onLoadCrash);
}

function markUnavailable(error) {
  if (unavailable) return;
  unavailable = true;
  const hint =
    error?.code === "ENOSPC"
      ? " (diskte yer kalmamış; yer açıp yarım inen model önbelleğini silmen gerekebilir, README'ye bak)"
      : "";
  console.warn(`⚠️  Embedding modeli yüklenemedi, yedek kelime aramasına geçiliyor: ${error?.message}${hint}`);
}

async function loadExtractor() {
  guard(true);
  let ok = false;
  try {
    const { pipeline, env } = await import("@huggingface/transformers");
    if (process.env.EMBEDDING_CACHE_DIR) env.cacheDir = process.env.EMBEDDING_CACHE_DIR;
    const extractor = await pipeline("feature-extraction", MODEL_ID, { dtype: DTYPE });
    ok = !unavailable;
    return ok ? extractor : null;
  } catch (error) {
    markUnavailable(error);
    return null;
  } finally {
    if (ok) guard(false);
    else setTimeout(() => guard(false), GRACE_MS).unref();
  }
}

async function getExtractor() {
  if (unavailable) return null;
  extractorPromise ??= loadExtractor();
  return extractorPromise;
}

// Sunucu açılırken modeli arka planda yüklemeye başla (ilk soru beklemesin)
export function warmUpEmbeddings() {
  getExtractor().then((e) => e && console.log(`Embedding modeli hazır: ${MODEL_ID} (${DTYPE})`));
}

// Metin listesini vektörlere çevirir. Model yoksa null döner.
export async function embed(texts) {
  const extractor = await getExtractor();
  if (!extractor) return null;

  const missing = [...new Set(texts.filter((t) => !cache.has(t)))];
  if (missing.length) {
    const output = await extractor(missing, { pooling: "mean", normalize: true });
    output.tolist().forEach((vector, i) => cache.set(missing[i], vector));
  }
  return texts.map((t) => cache.get(t));
}

// Vektörler normalize edildiği için iki vektörün çarpımı = cosine similarity (Gün 3)
export const similarity = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
