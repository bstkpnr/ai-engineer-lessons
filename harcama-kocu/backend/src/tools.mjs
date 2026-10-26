// Koçun kullanabileceği araçlar.
// Koç hangi aracı ne zaman çağıracağına karar veriyor; hesabı her zaman bu kod yapıyor.
import { KATEGORILER } from "./schema.mjs";

const KATEGORI_ADI = {
  market: "Market", yemek: "Yemek", ulasim: "Ulaşım", fatura: "Fatura", abonelik: "Abonelik",
  alisveris: "Alışveriş", saglik: "Sağlık", eglence: "Eğlence", nakit: "Nakit çekim", transfer: "Transfer", diger: "Diğer",
};

const round = (n) => Math.round(n * 100) / 100;
export const fmt = (n) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
const lower = (s) => s.toLocaleLowerCase("tr");

// Modele gönderilen araç tanımları: adı, ne işe yaradığı ve hangi parametreleri aldığı
export const TOOL_DEFINITIONS = [
  {
    name: "kategori_toplami",
    description:
      "Bir harcama kategorisindeki toplam harcamayı, işlem sayısını ve ortalama işlem tutarını hesaplar. İadeler toplamdan düşülür. Sadece TL işlemleri kapsar.",
    input_schema: {
      type: "object",
      properties: { kategori: { type: "string", enum: KATEGORILER, description: "Harcama kategorisi" } },
      required: ["kategori"],
    },
  },
  {
    name: "satici_ara",
    description:
      "Adında verilen metin geçen satıcılara yapılan işlemleri ve toplamını getirir. Örneğin 'migros', 'getir', 'netflix'.",
    input_schema: {
      type: "object",
      properties: { satici: { type: "string", description: "Satıcı adı ya da adının bir parçası" } },
      required: ["satici"],
    },
  },
  {
    name: "en_buyuk_islemler",
    description: "En yüksek tutarlı harcamaları büyükten küçüğe getirir. İsteğe bağlı olarak tek bir kategoriyle sınırlanabilir.",
    input_schema: {
      type: "object",
      properties: {
        adet: { type: "integer", minimum: 1, maximum: 10, description: "Kaç işlem getirileceği" },
        kategori: { type: "string", enum: KATEGORILER, description: "İsteğe bağlı kategori filtresi" },
      },
      required: ["adet"],
    },
  },
  {
    name: "tasarruf_hesapla",
    description:
      "Bir kategorideki harcama belirli bir yüzde azaltılırsa ne kadar tasarruf edileceğini hesaplar. 'Yemek siparişini %30 azaltsam ne kadar biriktiririm?' gibi sorular için.",
    input_schema: {
      type: "object",
      properties: {
        kategori: { type: "string", enum: KATEGORILER },
        azaltma_yuzdesi: { type: "number", minimum: 1, maximum: 100, description: "Harcamanın yüzde kaç azaltılacağı" },
      },
      required: ["kategori", "azaltma_yuzdesi"],
    },
  },
];

function categoryTotal(islemler, kategori) {
  const tl = islemler.filter((i) => i.para_birimi === "TRY" && i.kategori === kategori);
  const harcamalar = tl.filter((i) => i.tip === "harcama");
  const iade = tl.filter((i) => i.tip === "iade").reduce((s, i) => s + i.tutar, 0);
  const brut = harcamalar.reduce((s, i) => s + i.tutar, 0);
  return { brut: round(brut), iade: round(iade), net: round(brut - iade), adet: harcamalar.length };
}

const TOOLS = {
  kategori_toplami({ kategori }, islemler) {
    const t = categoryTotal(islemler, kategori);
    const sonuc = {
      kategori,
      net_toplam: t.net,
      iade_toplami: t.iade,
      islem_sayisi: t.adet,
      ortalama_islem: t.adet ? round(t.brut / t.adet) : 0,
    };
    return { sonuc, aciklama: `${KATEGORI_ADI[kategori]} toplamını hesapladı: ${fmt(t.net)}` };
  },

  satici_ara({ satici }, islemler) {
    const q = lower(String(satici).trim());
    const bulunan = islemler.filter((i) => lower(i.satici).includes(q) && i.para_birimi === "TRY");
    const toplam = bulunan.reduce((s, i) => s + (i.tip === "iade" ? -i.tutar : i.tutar), 0);
    const sonuc = {
      aranan: satici,
      islem_sayisi: bulunan.length,
      net_toplam: round(toplam),
      islemler: bulunan.slice(0, 20).map((i) => ({ satici: i.satici, tutar: i.tutar, tip: i.tip, kategori: i.kategori })),
    };
    return {
      sonuc,
      aciklama: bulunan.length
        ? `"${satici}" işlemlerini buldu: ${bulunan.length} işlem, ${fmt(toplam)}`
        : `"${satici}" için işlem bulamadı`,
    };
  },

  en_buyuk_islemler({ adet, kategori }, islemler) {
    const n = Math.min(Math.max(Math.round(adet) || 3, 1), 10);
    const liste = islemler
      .filter((i) => i.para_birimi === "TRY" && i.tip === "harcama" && (!kategori || i.kategori === kategori))
      .sort((a, b) => b.tutar - a.tutar)
      .slice(0, n)
      .map((i) => ({ satici: i.satici, tutar: i.tutar, kategori: i.kategori }));
    return {
      sonuc: { islemler: liste },
      aciklama: `En büyük ${liste.length} harcamayı listeledi${kategori ? ` (${KATEGORI_ADI[kategori]})` : ""}`,
    };
  },

  tasarruf_hesapla({ kategori, azaltma_yuzdesi }, islemler) {
    const t = categoryTotal(islemler, kategori);
    const yuzde = Math.min(Math.max(Number(azaltma_yuzdesi), 1), 100);
    const tasarruf = round((t.net * yuzde) / 100);
    const sonuc = {
      kategori,
      mevcut_harcama: t.net,
      azaltma_yuzdesi: yuzde,
      tasarruf,
      yeni_harcama: round(t.net - tasarruf),
      not: "Hesap, eklenen işlemlerin kapsadığı dönem içindir.",
    };
    return { sonuc, aciklama: `${KATEGORI_ADI[kategori]} için %${yuzde} azaltmanın tasarrufunu hesapladı: ${fmt(tasarruf)}` };
  },
};

// Modelden gelen araç çağrısını doğrulayıp çalıştırır. Hata olursa modele hata mesajı döner.
export function runTool(name, input, islemler) {
  const tool = TOOLS[name];
  if (!tool) return { hata: `Bilinmeyen araç: ${name}`, aciklama: `Bilinmeyen bir araç istedi (${name})` };
  if (input?.kategori !== undefined && !KATEGORILER.includes(input.kategori)) {
    return { hata: `Geçersiz kategori: ${input.kategori}`, aciklama: `Geçersiz kategori istedi: ${input.kategori}` };
  }
  if (name === "satici_ara" && !String(input?.satici ?? "").trim()) {
    return { hata: "Satıcı adı boş olamaz", aciklama: "Boş bir satıcı adı aradı" };
  }
  try {
    return tool(input ?? {}, islemler);
  } catch (error) {
    return { hata: error.message, aciklama: `Araç çalışırken hata oluştu (${name})` };
  }
}

// Uygulamadan gelen işlem listesini doğrula (kullanıcı girdisi)
export function sanitizeIslemler(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 1000).flatMap((i) => {
    if (!i || typeof i.satici !== "string" || typeof i.tutar !== "number" || !Number.isFinite(i.tutar)) return [];
    if (!KATEGORILER.includes(i.kategori) || !["harcama", "iade"].includes(i.tip)) return [];
    return [{
      satici: i.satici.slice(0, 80),
      tutar: i.tutar,
      kategori: i.kategori,
      tip: i.tip,
      para_birimi: ["TRY", "USD", "EUR"].includes(i.para_birimi) ? i.para_birimi : "TRY",
    }];
  });
}
