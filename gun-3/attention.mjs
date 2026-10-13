// Puanları olasılıklara çeviren fonksiyon (toplamları 1 olur)
function softmax(scores) {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// İki vektörün benzerliği (dot product)
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

// Her kelimenin "key" vektörü (temsili):
// 1. boyut: "kişi olma" özelliği, 2. boyut: "nesne olma" özelliği
const words = ["Ali", "kitabı", "Ayşe'ye", "verdi"];
const keys = [
  [1.0, 0.1], // Ali
  [0.1, 1.0], // kitabı
  [0.9, 0.2], // Ayşe'ye
  [0.1, 0.2], // verdi
];

// "o" kelimesinin query'si: "Ben bir kişi arıyorum"
const queryO = [1.0, 0.1];

const scores = keys.map((key) => dot(queryO, key));
const weights = softmax(scores);

console.log(`"o" kelimesi kime ne kadar dikkat ediyor?\n`);
words.forEach((word, i) => {
  const bar = "█".repeat(Math.round(weights[i] * 40));
  console.log(`${word.padEnd(9)} ${bar} %${(weights[i] * 100).toFixed(0)}`);
});
