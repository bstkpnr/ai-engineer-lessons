import { embed as defaultEmbed, similarity } from "./embeddings.mjs";

// Benzerlik eşikleri. Gerçek verilerle deneyerek ayarlanabilir.
const MIN_SCORE = Number(process.env.SEMANTIC_MIN_SCORE ?? 0.4); // Bunun altındakiler alakasız sayılır
const MAX_GAP = 0.15; // En iyi sonuçtan bu kadar uzak olanlar elenir
const MAX_SELLERS = 8;
const MAX_CANDIDATES = 3; // Eşiğin hemen altında kalanlar: toplama girmez, koç karar versin diye gösterilir

const KATEGORI_ADI = {
  market: "market", yemek: "yemek", ulasim: "ulaşım", fatura: "fatura", abonelik: "abonelik",
  alisveris: "alışveriş", saglik: "sağlık", eglence: "eğlence", nakit: "nakit çekim", transfer: "transfer", diger: "diğer",
};

const lower = (s) => s.toLocaleLowerCase("tr");

// Her harcamanın aranabilir metni: satıcı + yapay zekânın yazdığı kısa açıklama + kategori
export const searchableText = (i) =>
  `${i.satici}: ${i.aciklama || i.satici} (${KATEGORI_ADI[i.kategori] ?? i.kategori})`;

// Model yoksa: kelimelerin ilk 4 harfi üzerinden basit bir eşleşme (yedek arama)
function keywordFallback(query, texts) {
  const stems = lower(query).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3).map((w) => w.slice(0, 4));
  return texts.map((t) => (stems.some((s) => lower(t).includes(s)) ? 1 : 0));
}

// Soruya anlamca en yakın satıcıları bulur. Toplamları kod hesaplar.
// haric: koçun alakasız bulup toplamdan çıkarmak istediği satıcılar (çıkarma işini de kod yapar)
export async function semanticSearch(query, islemler, embedFn = defaultEmbed, haric = []) {
  const excluded = new Set(haric.map((h) => lower(String(h)).trim()));
  const tl = islemler.filter((i) => i.para_birimi === "TRY" && !excluded.has(lower(i.satici).trim()));

  // Aynı satıcının işlemlerini tek bir aranabilir metinde topla
  const groups = new Map();
  for (const i of tl) {
    const text = searchableText(i);
    if (!groups.has(text)) groups.set(text, []);
    groups.get(text).push(i);
  }
  const texts = [...groups.keys()];
  if (!texts.length) return { yontem: "anlamsal", eslesmeler: [], yakin_adaylar: [], net_toplam: 0, islem_sayisi: 0 };

  const vectors = await embedFn([query, ...texts]);
  const yontem = vectors ? "anlamsal" : "yedek_kelime_aramasi";
  const scores = vectors
    ? texts.map((_, k) => similarity(vectors[0], vectors[k + 1]))
    : keywordFallback(query, texts);

  const best = Math.max(...scores);
  const ranked = texts.map((text, k) => ({ text, skor: scores[k] })).sort((a, b) => b.skor - a.skor);
  const isMatch = (m) => m.skor >= MIN_SCORE && m.skor >= best - MAX_GAP;

  const toResult = ({ text, skor }) => {
    const items = groups.get(text);
    const toplam = items.reduce((s, i) => s + (i.tip === "iade" ? -i.tutar : i.tutar), 0);
    return {
      satici: items[0].satici,
      aciklama: items[0].aciklama || "",
      skor: Math.round(skor * 100) / 100,
      islem_sayisi: items.filter((i) => i.tip === "harcama").length,
      toplam: Math.round(toplam * 100) / 100,
    };
  };

  const eslesmeler = ranked.filter(isMatch).slice(0, MAX_SELLERS).map(toResult);
  // Anlamsal aramada eşiğe takılan en yakın birkaç satıcı. Benzerlik kusursuz değil;
  // "arabam" ile "akaryakıt istasyonu" eşiğin altında kalabilir. Toplama girmezler.
  const yakin_adaylar = vectors
    ? ranked.filter((m) => !isMatch(m) && m.skor > 0).slice(0, MAX_CANDIDATES).map(toResult)
    : [];

  return {
    yontem,
    eslesmeler,
    yakin_adaylar,
    net_toplam: Math.round(eslesmeler.reduce((s, m) => s + m.toplam, 0) * 100) / 100,
    islem_sayisi: eslesmeler.reduce((s, m) => s + m.islem_sayisi, 0),
  };
}
