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

import { fmt, runTool } from "./tools.mjs";

const CATEGORY_WORDS = [
  [/market/, "market"], [/yemek|sipariş/, "yemek"], [/fatura/, "fatura"], [/abonelik/, "abonelik"],
  [/ulaşım|benzin|akaryakıt/, "ulasim"], [/alışveriş/, "alisveris"], [/nakit/, "nakit"],
  [/sağlık|eczane/, "saglik"], [/eğlence|oyun/, "eglence"],
];

// Demo modunda modelin araç seçimini basit kurallarla taklit ediyoruz
function planDemo(question, islemler) {
  const q = question.toLocaleLowerCase("tr");
  if (/yatır|hisse|fon|kripto|borsa|altın/.test(q)) return { refuse: true };
  const kategori = CATEGORY_WORDS.find(([re]) => re.test(q))?.[1];
  const percent = q.match(/%\s?(\d+)|yüzde\s?(\d+)/);
  if (percent && kategori) return { tool: "tasarruf_hesapla", input: { kategori, azaltma_yuzdesi: Number(percent[1] ?? percent[2]) } };
  if (/en büyük|en pahalı|en yüksek/.test(q)) return { tool: "en_buyuk_islemler", input: { adet: 3, ...(kategori ? { kategori } : {}) } };
  const seller = islemler.map((i) => i.satici).find((s) => q.includes(s.toLocaleLowerCase("tr").split(" ")[0]));
  if (seller) return { tool: "satici_ara", input: { satici: seller.split(" ")[0] } };
  if (kategori) return { tool: "kategori_toplami", input: { kategori } };
  return {};
}

function demoText(plan, result, summary) {
  if (plan.refuse) {
    return "Yatırım konusunda öneri veremiyorum; bu bir yatırım danışmanının işi. Ama harcamalarında tasarruf edebileceğin alanları birlikte bulabiliriz.";
  }
  const r = result?.sonuc;
  switch (plan.tool) {
    case "kategori_toplami":
      return `Bu kategoride ${r.islem_sayisi} harcaman var, toplamı ${fmt(r.net_toplam)}. Ortalama bir işlem ${fmt(r.ortalama_islem)} tutuyor.`;
    case "satici_ara":
      return r.islem_sayisi
        ? `${plan.input.satici} için ${r.islem_sayisi} işlem buldum, toplam ${fmt(r.net_toplam)}.`
        : `${plan.input.satici} adına bir işlem bulamadım.`;
    case "en_buyuk_islemler":
      return "En büyük harcamaların:\n" + r.islemler.map((i) => `- ${i.satici}: ${fmt(i.tutar)}`).join("\n");
    case "tasarruf_hesapla":
      return `Bu kategoride şu an ${fmt(r.mevcut_harcama)} harcıyorsun. %${r.azaltma_yuzdesi} azaltırsan ${fmt(r.tasarruf)} tasarruf edersin; yeni harcaman ${fmt(r.yeni_harcama)} olur.`;
    default: {
      const top = summary.kategoriler?.[0];
      return top
        ? `En çok harcamayı ${top.etiket} kategorisinde yapmışsın: ${fmt(top.tutar)}. Toplam harcaman ${fmt(summary.toplam_harcama)}.`
        : "Henüz yorum yapabileceğim bir harcama eklemedin.";
    }
  }
}

export async function streamCoachDemo({ summary, messages, islemler }, onEvent) {
  const started = Date.now();
  const plan = planDemo(messages.at(-1)?.content ?? "", islemler);
  const araclar = [];
  let result;
  if (plan.tool) {
    await new Promise((r) => setTimeout(r, 300));
    result = runTool(plan.tool, plan.input, islemler);
    const call = { name: plan.tool, input: plan.input, aciklama: result.aciklama, hata: result.hata ?? null };
    araclar.push(call);
    onEvent({ type: "tool", ...call });
  }
  for (const word of demoText(plan, result, summary).split(/(?<= )/)) {
    await new Promise((r) => setTimeout(r, 35));
    onEvent({ type: "text", text: word });
  }
  return {
    model: "demo",
    stop_reason: "demo",
    sure_ms: Date.now() - started,
    ilk_token_ms: plan.tool ? 335 : 35,
    usage: null,
    adim: plan.tool ? 2 : 1,
    araclar,
    gecmis_mesaj_sayisi: messages.length,
  };
}
