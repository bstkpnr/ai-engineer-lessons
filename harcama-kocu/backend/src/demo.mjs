// DEMO MODU: API anahtarı olmadan uygulamayı denemek için kural tabanlı basit bir taklit.
// Gerçek bir model değildir; sadece uygulamanın uçtan uca çalıştığını görmek içindir.
import { validateTransaction } from "./schema.mjs";

const MERCHANTS = [
  [/m[iİı]gros/i, "Migros", "market"],
  [/a101|bim\b|şok|sok market|carrefour/i, "Market", "market"],
  [/getir.*yemek|yemeksepeti|trendyol yemek/i, "Yemek siparişi", "yemek"],
  [/starbucks|kahve|cafe/i, "Kafe", "yemek"],
  [/netflix/i, "Netflix", "abonelik"],
  [/spotify/i, "Spotify", "abonelik"],
  [/youtube/i, "YouTube Premium", "abonelik"],
  [/shell|opet|bp\b|petrol/i, "Akaryakıt", "ulasim"],
  [/uber|bitaksi|istanbulkart|metro/i, "Ulaşım", "ulasim"],
  [/turkcell|vodafone|elektrik|enerjisa|igdas|su idaresi|fatura/i, "Fatura", "fatura"],
  [/trendyol|hepsiburada|amazon|zara/i, "Online alışveriş", "alisveris"],
  [/eczane|hastane/i, "Sağlık", "saglik"],
  [/sinema|biletix|steam/i, "Eğlence", "eglence"],
  [/atm|nakit/i, "Nakit çekim", "nakit"],
];
const SKIP = /şifre|sifre|kampanya|bakiye|puan kazan|hosgeldin|hoşgeldin/i;
const AMOUNT = /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(TL|TRY|USD|EUR|\$|€)/i;

export async function extractDemo(text) {
  const islemler = [];
  const atlananlar = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const amount = line.match(AMOUNT);
    if (SKIP.test(line) || !amount) {
      atlananlar.push({ kaynak: line, neden: "Harcama bilgisi bulunamadı" });
      continue;
    }
    const [, satici = "Diğer", kategori = "diger"] = MERCHANTS.find(([re]) => re.test(line)) ?? [];
    const cur = amount[2].toUpperCase();
    islemler.push(
      validateTransaction({
        kaynak: line,
        satici,
        tutar_metin: amount[1],
        para_birimi: cur === "$" ? "USD" : cur === "€" ? "EUR" : cur === "TL" ? "TRY" : cur,
        kategori,
        tip: /iade/i.test(line) ? "iade" : "harcama",
        tarih: null,
      }),
    );
  }
  await new Promise((r) => setTimeout(r, 500));
  return {
    islemler,
    atlananlar,
    debug: { model: "demo", stop_reason: "demo", sure_ms: 500, usage: null, prompt: null },
  };
}

const fmt = (n) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

function demoAnswer(summary, question) {
  const q = question.toLocaleLowerCase("tr");
  const top = summary.kategoriler?.[0];
  if (/yatır|hisse|fon|kripto|borsa|altın|dolar al/.test(q)) {
    return "Yatırım konusunda öneri veremiyorum; bu bir yatırım danışmanının işi. Ama harcamalarında tasarruf edebileceğin alanları birlikte bulabiliriz. İstersen aboneliklerine bakalım mı?";
  }
  if (/abonelik/.test(q)) {
    const list = (summary.abonelikler ?? []).map((a) => `${a.satici} (${fmt(a.tutar)})`).join(", ");
    return list
      ? `Düzenli ödediğin abonelikler: ${list}. Toplamı ${fmt(summary.abonelik_toplami)}. Benzer işi gören iki abonelik varsa birini iptal etmeyi düşünebilirsin.`
      : "Eklediğin harcamalarda bir abonelik görmüyorum.";
  }
  if (top) {
    return `En çok harcamayı ${top.etiket} kategorisinde yapmışsın: ${fmt(top.tutar)}, toplamın %${top.yuzde} kadarı. Toplam harcaman ${fmt(summary.toplam_harcama)}. Tasarruf için ilk bakılacak yer burası olabilir.`;
  }
  return "Henüz yorum yapabileceğim bir harcama eklemedin. Ekle sekmesinden birkaç SMS yapıştırarak başlayabilirsin.";
}

export async function streamCoachDemo({ summary, messages }, onText) {
  const answer = demoAnswer(summary, messages.at(-1)?.content ?? "");
  const started = Date.now();
  for (const word of answer.split(/(?<= )/)) {
    await new Promise((r) => setTimeout(r, 35));
    onText(word);
  }
  return {
    model: "demo",
    stop_reason: "demo",
    sure_ms: Date.now() - started,
    ilk_token_ms: 35,
    usage: null,
    gecmis_mesaj_sayisi: messages.length,
  };
}
