// Hassas verileri modele göndermeden önce maskeler.
// Gerçek bir bankacılık uygulamasında bu adım KVKK ve regülasyonlar açısından zorunludur.

const RULES = [
  {
    type: "iban",
    // TR + 24 rakam, boşluklu ya da boşluksuz
    pattern: /\bTR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/gi,
    mask: (m) => {
      const digits = m.replace(/\s/g, "");
      return `TR** **** **** **** **** **${digits.slice(-2)}`;
    },
  },
  {
    type: "kart",
    // 16 haneli kart numarası: boşluklu, tireli ya da bitişik
    pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
    mask: (m) => `**** **** **** ${m.replace(/\D/g, "").slice(-4)}`,
  },
  {
    type: "tckn",
    // 11 haneli, 0 ile başlamayan TC kimlik numarası
    pattern: /\b[1-9]\d{10}\b/g,
    mask: () => "***********",
  },
  {
    type: "telefon",
    // 05xx xxx xx xx biçimindeki cep telefonları
    pattern: /\b0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g,
    mask: (m) => `05** *** ** ${m.replace(/\D/g, "").slice(-2)}`,
  },
  {
    type: "eposta",
    pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
    mask: (m) => `${m[0]}***@${m.split("@")[1]}`,
  },
];

export function maskSensitive(text) {
  const found = [];
  let masked = text;
  for (const rule of RULES) {
    masked = masked.replace(rule.pattern, (match) => {
      found.push(rule.type);
      return rule.mask(match);
    });
  }
  return { masked, found: [...new Set(found)] };
}
