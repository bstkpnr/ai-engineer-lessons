// "Bugün hava çok ..." cümlesinden sonra modelin ürettiği ham puanlar (logits, temsili)
const tokens = ["güzel", "sıcak", "soğuk", "bulutlu", "yağmurlu"];
const logits = [3.0, 2.5, 2.1, 1.4, 0.6];

function softmax(scores, temperature = 1) {
  const scaled = scores.map((s) => s / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

for (const temperature of [0.2, 0.7, 1.0, 1.5]) {
  const probs = softmax(logits, temperature);
  console.log(`\n--- temperature: ${temperature} ---`);
  tokens.forEach((token, i) => {
    const bar = "█".repeat(Math.round(probs[i] * 40));
    console.log(`${token.padEnd(9)} ${bar} %${(probs[i] * 100).toFixed(0)}`);
  });
}
