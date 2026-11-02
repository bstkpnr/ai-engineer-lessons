import { test } from "node:test";
import assert from "node:assert/strict";
import { semanticSearch, searchableText } from "../src/semanticSearch.mjs";

// Gerçek model yerine kontrollü, sahte bir embedding: her boyut bir "anlam"
const DIMS = [/kahve/, /abonel|dijital|video|müzik/, /akaryakıt|araba|benzin/, /market|süpermarket/];
function fakeEmbed(texts) {
  return texts.map((t) => {
    const lower = t.toLocaleLowerCase("tr");
    const v = DIMS.map((re) => (re.test(lower) ? 1 : 0));
    const norm = Math.hypot(...v) || 1;
    return v.map((x) => x / norm);
  });
}

const islemler = [
  { satici: "Starbucks", aciklama: "kahve zinciri", tutar: 132.4, kategori: "yemek", tip: "harcama", para_birimi: "TRY" },
  { satici: "Netflix", aciklama: "dijital video aboneliği", tutar: 149.99, kategori: "abonelik", tip: "harcama", para_birimi: "TRY" },
  { satici: "Spotify", aciklama: "dijital müzik aboneliği", tutar: 59.99, kategori: "abonelik", tip: "harcama", para_birimi: "TRY" },
  { satici: "Shell", aciklama: "akaryakıt istasyonu", tutar: 1250, kategori: "ulasim", tip: "harcama", para_birimi: "TRY" },
  { satici: "Migros", aciklama: "süpermarket zinciri", tutar: 245.9, kategori: "market", tip: "harcama", para_birimi: "TRY" },
  { satici: "Migros", aciklama: "süpermarket zinciri", tutar: 487.3, kategori: "market", tip: "harcama", para_birimi: "TRY" },
];

test("kelime geçmese de anlama göre bulur ve toplamı kodla hesaplar", async () => {
  const r = await semanticSearch("dijital abonelikler", islemler, fakeEmbed);
  assert.equal(r.yontem, "anlamsal");
  assert.deepEqual(r.eslesmeler.map((m) => m.satici).sort(), ["Netflix", "Spotify"]);
  assert.equal(r.net_toplam, 209.98);
});

test("aynı satıcının işlemlerini tek eşleşmede toplar", async () => {
  const r = await semanticSearch("market alışverişi", islemler, fakeEmbed);
  assert.equal(r.eslesmeler.length, 1);
  assert.equal(r.eslesmeler[0].islem_sayisi, 2);
  assert.equal(r.eslesmeler[0].toplam, 733.2);
});

test("alakasız soruda boş döner", async () => {
  const r = await semanticSearch("tatil", islemler, fakeEmbed);
  assert.equal(r.eslesmeler.length, 0);
  assert.equal(r.net_toplam, 0);
});

test("model yoksa yedek kelime aramasına geçer", async () => {
  const r = await semanticSearch("kahve", islemler, async () => null);
  assert.equal(r.yontem, "yedek_kelime_aramasi");
  assert.deepEqual(r.eslesmeler.map((m) => m.satici), ["Starbucks"]);
});

test("aranabilir metin satıcı, açıklama ve kategoriyi içerir", () => {
  assert.equal(searchableText(islemler[0]), "Starbucks: kahve zinciri (yemek)");
});

test("haric ile alakasız satıcı çıkarılır, toplamı yine kod hesaplar", async () => {
  const r = await semanticSearch("dijital abonelikler", islemler, fakeEmbed, ["netflix"]);
  assert.deepEqual(r.eslesmeler.map((m) => m.satici), ["Spotify"]);
  assert.equal(r.net_toplam, 59.99);
});

test("eşiğin altında kalanlar toplama girmeden aday olarak döner", async () => {
  // "kahve ve market" iki boyutlu: Starbucks ve Migros ~0.71, diğerleri 0
  const r = await semanticSearch("kahve market", islemler, fakeEmbed);
  assert.equal(r.yakin_adaylar.every((a) => !r.eslesmeler.some((m) => m.satici === a.satici)), true);
  const zayif = await semanticSearch("kahve market", islemler, async (texts) => {
    const v = fakeEmbed(texts);
    v[0] = [0.3, 0, 0.95, 0]; // sorgu çoğunlukla "araba": Shell eşleşir, Starbucks aday kalır
    return v;
  });
  assert.deepEqual(zayif.eslesmeler.map((m) => m.satici), ["Shell"]);
  assert.deepEqual(zayif.yakin_adaylar.map((m) => m.satici), ["Starbucks"]);
  assert.equal(zayif.net_toplam, 1250);
});
