// Kullanım ve maliyet takibi (bellekte tutulur, sunucu yeniden başlayınca sıfırlanır)
const stats = { istek: 0, hata: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 };

// Fiyatlar değişebildiği için koda gömmüyoruz; .env üzerinden "1 milyon token başına USD" olarak veriliyor
const INPUT_PRICE = Number(process.env.INPUT_PRICE_PER_MTOK) || null;
const OUTPUT_PRICE = Number(process.env.OUTPUT_PRICE_PER_MTOK) || null;

export function costOf(usage) {
  if (!INPUT_PRICE || !OUTPUT_PRICE || !usage) return null;
  const cost = (usage.input_tokens / 1e6) * INPUT_PRICE + (usage.output_tokens / 1e6) * OUTPUT_PRICE;
  return Number(cost.toFixed(5));
}

export function recordUsage(usage) {
  stats.istek += 1;
  if (!usage) return;
  stats.input_tokens += usage.input_tokens ?? 0;
  stats.output_tokens += usage.output_tokens ?? 0;
  stats.cache_read_tokens += usage.cache_read_input_tokens ?? 0;
  stats.cache_write_tokens += usage.cache_creation_input_tokens ?? 0;
}

export function recordError() {
  stats.hata += 1;
}

export function getStats() {
  return { ...stats, tahmini_maliyet_usd: costOf(stats) };
}
