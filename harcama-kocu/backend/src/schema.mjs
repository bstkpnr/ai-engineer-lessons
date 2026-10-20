// Modelin döndürebileceği değerler: API sözleşmemiz
export const KATEGORILER = [
  "market",
  "yemek",
  "ulasim",
  "fatura",
  "abonelik",
  "alisveris",
  "saglik",
  "eglence",
  "nakit",
  "transfer",
  "diger",
];
export const TIPLER = ["harcama", "iade"];

// Tutarı model değil kod sayıya çeviriyor: "1.250,00" → 1250, "149.99" → 149.99
export function parseAmount(raw) {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return NaN;
  let s = raw.replace(/[^\d.,]/g, "");
  if (!s) return NaN;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    // İkisi de varsa en sondaki ondalık ayırıcıdır
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    s = s.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma !== -1) {
    // Sadece virgül: sonrasında 1-2 hane varsa ondalık (245,90), 3 hane varsa binlik (1,250)
    const after = s.length - lastComma - 1;
    s = after === 3 ? s.replace(/,/g, "") : s.replace(/,/g, ".");
  } else if (lastDot !== -1) {
    // Sadece nokta: sonrasında tam 3 hane varsa binlik (1.250), yoksa ondalık (149.99)
    const after = s.length - lastDot - 1;
    s = after === 3 ? s.replace(/\./g, "") : s;
  }
  return Number(s);
}

export function validateTransaction(t) {
  const tutar = parseAmount(t.tutar_metin);
  if (!Number.isFinite(tutar) || tutar <= 0) throw new Error(`Geçersiz tutar: ${t.tutar_metin}`);
  if (!KATEGORILER.includes(t.kategori)) throw new Error(`Geçersiz kategori: ${t.kategori}`);
  if (!TIPLER.includes(t.tip)) throw new Error(`Geçersiz tip: ${t.tip}`);
  if (typeof t.satici !== "string" || !t.satici.trim()) throw new Error("Satıcı eksik");
  const tarih = typeof t.tarih === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.tarih) ? t.tarih : null;
  return {
    satici: t.satici.trim(),
    tutar: Math.round(tutar * 100) / 100,
    para_birimi: t.para_birimi === "USD" || t.para_birimi === "EUR" ? t.para_birimi : "TRY",
    kategori: t.kategori,
    tip: t.tip,
    tarih,
    kaynak: typeof t.kaynak === "string" ? t.kaynak : "",
  };
}
