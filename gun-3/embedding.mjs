import { pipeline } from "@huggingface/transformers";

const embed = await pipeline(
  "feature-extraction",
  "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
);

const sentences = [
  "Telefonumun şarjı çok çabuk bitiyor",
  "Bataryam yarım günde tükeniyor",
  "Uygulama açılırken donuyor",
  "Kedim bütün gün uyudu",
];

const output = await embed(sentences, { pooling: "mean", normalize: true });
const vectors = output.tolist();

console.log(`Her cümle ${vectors[0].length} sayılık bir vektöre dönüştü.\n`);

// Vektörler normalize edildiği için iki vektörün çarpımı = cosine similarity
const similarity = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

const base = sentences[0];
for (let i = 1; i < sentences.length; i++) {
  const score = similarity(vectors[0], vectors[i]);
  console.log(`"${base}"\n  ↔ "${sentences[i]}"  →  ${score.toFixed(2)}\n`);
}
