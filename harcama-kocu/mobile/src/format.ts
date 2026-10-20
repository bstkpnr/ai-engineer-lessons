// Tutarları Türkçe biçimde yaz: 1250.5 → "1.250,50 TL"
export function formatMoney(value: number, currency: "TRY" | "USD" | "EUR" = "TRY") {
  const fixed = Math.abs(value).toFixed(2);
  const [int, dec] = fixed.split(".");
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = value < 0 ? "-" : "";
  const suffix = currency === "TRY" ? "TL" : currency;
  return `${sign}${withDots},${dec} ${suffix}`;
}
