import { getEncoding } from "js-tiktoken";

const enc = getEncoding("cl100k_base");

const texts = [
  "Bugün hava çok güzel",
  "The weather is very nice today",
  "Yapabileceklerimizden",
  "1234567",
];

for (const text of texts) {
  const ids = enc.encode(text);
  const pieces = ids.map((id) => enc.decode([id]));
  console.log(`\n"${text}" → ${ids.length} token`);
  console.log(pieces.map((p) => `[${p}]`).join(" "));
}
