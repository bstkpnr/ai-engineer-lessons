export type Kategori =
  | "market"
  | "yemek"
  | "ulasim"
  | "fatura"
  | "abonelik"
  | "alisveris"
  | "saglik"
  | "eglence"
  | "nakit"
  | "transfer"
  | "diger";

export type ParaBirimi = "TRY" | "USD" | "EUR";

export type Islem = {
  satici: string;
  tutar: number;
  para_birimi: ParaBirimi;
  kategori: Kategori;
  tip: "harcama" | "iade";
  tarih: string | null;
  kaynak: string;
};

export type KayitliIslem = Islem & { id: string };

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
} | null;

// Geliştirici modunda gösterilen "arka planda ne oldu" bilgisi
export type Debug = {
  model: string;
  stop_reason: string | null;
  sure_ms: number;
  ilk_token_ms?: number | null;
  usage: Usage;
  maliyet_usd?: number | null;
  gecmis_mesaj_sayisi?: number;
  prompt?: { system: string; user: string } | null;
};

export type ExtractResponse = {
  islemler: Islem[];
  atlananlar: { kaynak: string; neden: string }[];
  maskelenen: string[];
  debug: Debug;
};

export type ChatMessage = { role: "user" | "assistant"; content: string; debug?: Debug; error?: boolean };
