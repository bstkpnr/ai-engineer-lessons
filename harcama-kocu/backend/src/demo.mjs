// DEMO MODU: API anahtarı olmadan uygulamayı denemek için kural tabanlı basit bir taklit.
// Gerçek bir model değildir; sadece uygulamanın uçtan uca çalıştığını görmek içindir.
import { validateTransaction } from "./schema.mjs";

const MERCHANTS = [
  [/m[iİı]gros/i, "Migros", "market", "süpermarket zinciri"],
  [/a101|bim\b|şok|sok market|carrefour/i, "Market", "market", "süpermarket"],
  [/getir.*yemek|yemeksepeti|trendyol yemek/i, "Yemek siparişi", "yemek", "online yemek siparişi"],
  [/starbucks|kahve|cafe/i, "Starbucks", "yemek", "kahve zinciri"],
  [/netflix/i, "Netflix", "abonelik", "dijital video aboneliği"],
  [/spotify/i, "Spotify", "abonelik", "dijital müzik aboneliği"],
  [/youtube/i, "YouTube Premium", "abonelik", "dijital video aboneliği"],
  [/shell|opet|bp\b|petrol/i, "Shell", "ulasim", "akaryakıt istasyonu"],
  [/uber|bitaksi|istanbulkart|metro/i, "Ulaşım", "ulasim", "toplu taşıma ve taksi"],
  [/turkcell|vodafone/i, "Turkcell", "fatura", "mobil hat faturası"],
  [/elektrik|enerjisa|igdas|su idaresi|fatura/i, "Enerjisa", "fatura", "elektrik faturası"],
  [/trendyol|hepsiburada|amazon|zara/i, "Trendyol", "alisveris", "online alışveriş sitesi"],
  [/eczane|hastane/i, "Eczane", "saglik", "eczane"],
  [/sinema|biletix|steam/i, "Steam", "eglence", "dijital oyun mağazası"],
  [/atm|nakit/i, "ATM", "nakit", "nakit para çekimi"],
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
    const [, satici = "Diğer", kategori = "diger", aciklama = ""] = MERCHANTS.find(([re]) => re.test(line)) ?? [];
    const cur = amount[2].toUpperCase();
    islemler.push(
      validateTransaction({
        kaynak: line,
        satici,
        aciklama,
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
    debug: { model: "demo", temperature: 0, stop_reason: "demo", sure_ms: 500, usage: null, prompt: null },
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
  const semantic = q.match(/kahve|araba|arabam|dijital|online|eğlenceye|ulaşıma/);
  if (semantic && !percent) return { tool: "anlamsal_ara", input: { sorgu: semantic[0] } };
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
    case "anlamsal_ara":
      return r.eslesmeler.length
        ? `"${plan.input.sorgu}" ile ilgili şu harcamaları buldum:\n` +
            r.eslesmeler.map((m) => `- ${m.satici} (${m.aciklama}): ${fmt(m.toplam)}`).join("\n") +
            `\nToplam ${fmt(r.net_toplam)}.`
        : `"${plan.input.sorgu}" ile ilgili bir harcama bulamadım.`;
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
    result = await runTool(plan.tool, plan.input, islemler);
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
    temperature: 0.7,
    stop_reason: "demo",
    sure_ms: Date.now() - started,
    ilk_token_ms: plan.tool ? 335 : 35,
    usage: null,
    adim: plan.tool ? 2 : 1,
    araclar,
    gecmis_mesaj_sayisi: messages.length,
  };
}
