import type { Kategori } from "./types";

export const kategoriLabel: Record<Kategori, string> = {
  market: "Market",
  yemek: "Yemek",
  ulasim: "Ulaşım",
  fatura: "Fatura",
  abonelik: "Abonelik",
  alisveris: "Alışveriş",
  saglik: "Sağlık",
  eglence: "Eğlence",
  nakit: "Nakit çekim",
  transfer: "Transfer",
  diger: "Diğer",
};

export const kategoriIcon: Record<Kategori, string> = {
  market: "🛒",
  yemek: "🍔",
  ulasim: "⛽",
  fatura: "💡",
  abonelik: "🔁",
  alisveris: "🛍️",
  saglik: "💊",
  eglence: "🎮",
  nakit: "💵",
  transfer: "↔️",
  diger: "•",
};

export const maskeLabel: Record<string, string> = {
  kart: "kart numarası",
  iban: "IBAN",
  tckn: "TC kimlik no",
  telefon: "telefon",
  eposta: "e-posta",
};
