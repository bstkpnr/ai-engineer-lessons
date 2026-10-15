const tokens = ["güzel", "sıcak", "soğuk", "bulutlu", "yağmurlu"];
const logits = [3.0, 2.5, 2.1, 1.4, 0.6];

function softmax(scores, temperature = 1) {
  const scaled = scores.map((s) => s / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// Verilen adaylar arasından olasılıklarına göre rastgele birini seç
function pick(candidates) {
  const total = candidates.reduce((sum, c) => sum + c.p, 0);
  let r = Math.random() * total;
  for (const c of candidates) {
    r -= c.p;
    if (r <= 0) return c.token;
  }
  return candidates.at(-1).token;
}

// Olasılığa göre büyükten küçüğe sıralanmış adaylar
const sorted = softmax(logits)
  .map((p, i) => ({ token: tokens[i], p }))
  .sort((a, b) => b.p - a.p);

const strategies = {
  // Greedy: her zaman en olası token
  greedy: () => sorted[0].token,
  // Top-k: sadece en olası k aday arasından seç
  "top-k (k=2)": () => pick(sorted.slice(0, 2)),
  // Top-p: toplam olasılığı p'ye ulaşana kadar adayları al, onların arasından seç
  "top-p (p=0.9)": () => {
    const pool = [];
    let cumulative = 0;
    for (const c of sorted) {
      pool.push(c);
      cumulative += c.p;
      if (cumulative >= 0.9) break;
    }
    return pick(pool);
  },
  // Kısıtsız örnekleme: tüm adaylar arasından seç
  "sampling (T=1)": () => pick(sorted),
};

for (const [name, strategy] of Object.entries(strategies)) {
  const results = Array.from({ length: 10 }, strategy);
  console.log(`\n${name}:`);
  console.log(results.join(", "));
}
