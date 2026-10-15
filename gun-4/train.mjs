// Model "girdiyi kaç ile çarpmalıyım?" sorusunun cevabını bilmiyor.
// Elimizdeki örneklerde cevap 3 ama bunu modele söylemiyoruz; veriden öğrenecek.
const data = [
  { x: 1, y: 3 },
  { x: 2, y: 6 },
  { x: 3, y: 9 },
  { x: 4, y: 12 },
];

let w = 0; // Modelin tek parametresi, rastgele bir başlangıç
const learningRate = 0.02;

for (let step = 1; step <= 12; step++) {
  // 1. Tahmin yap ve hatayı (loss) ölç: ortalama kare hata
  const loss =
    data.reduce((sum, { x, y }) => sum + (w * x - y) ** 2, 0) / data.length;

  // 2. Gradient: w'yi biraz artırırsak loss nasıl değişir?
  const gradient =
    data.reduce((sum, { x, y }) => sum + 2 * (w * x - y) * x, 0) / data.length;

  console.log(
    `Adım ${String(step).padStart(2)}: w = ${w.toFixed(3)}  loss = ${loss.toFixed(4)}`
  );

  // 3. Parametreyi hatayı azaltacak yöne küçük bir adım kaydır
  w = w - learningRate * gradient;
}

console.log(`\nÖğrenilen değer: w ≈ ${w.toFixed(3)} (doğru cevap: 3)`);
