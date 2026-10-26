import { test } from "node:test";
import assert from "node:assert/strict";
import { runTool, sanitizeIslemler } from "../src/tools.mjs";

const islemler = [
  { satici: "Migros", tutar: 245.9, kategori: "market", tip: "harcama", para_birimi: "TRY" },
  { satici: "Migros", tutar: 487.3, kategori: "market", tip: "harcama", para_birimi: "TRY" },
  { satici: "Getir Yemek", tutar: 312.5, kategori: "yemek", tip: "harcama", para_birimi: "TRY" },
  { satici: "Trendyol", tutar: 1899, kategori: "alisveris", tip: "harcama", para_birimi: "TRY" },
  { satici: "Trendyol", tutar: 450, kategori: "alisveris", tip: "iade", para_birimi: "TRY" },
  { satici: "Steam", tutar: 9.99, kategori: "eglence", tip: "harcama", para_birimi: "USD" },
];

test("kategori_toplami iadeleri düşer, ortalamayı hesaplar", () => {
  const { sonuc } = runTool("kategori_toplami", { kategori: "alisveris" }, islemler);
  assert.equal(sonuc.net_toplam, 1449);
  assert.equal(sonuc.islem_sayisi, 1);
  assert.equal(runTool("kategori_toplami", { kategori: "market" }, islemler).sonuc.net_toplam, 733.2);
});

test("satici_ara büyük/küçük harf ve Türkçe karakterden bağımsız bulur", () => {
  const { sonuc } = runTool("satici_ara", { satici: "MİGROS" }, islemler);
  assert.equal(sonuc.islem_sayisi, 2);
  assert.equal(sonuc.net_toplam, 733.2);
});

test("en_buyuk_islemler döviz ve iadeleri katmaz", () => {
  const { sonuc } = runTool("en_buyuk_islemler", { adet: 2 }, islemler);
  assert.deepEqual(sonuc.islemler.map((i) => i.tutar), [1899, 487.3]);
});

test("tasarruf_hesapla yüzdeyi kodla hesaplar", () => {
  const { sonuc } = runTool("tasarruf_hesapla", { kategori: "market", azaltma_yuzdesi: 30 }, islemler);
  assert.equal(sonuc.tasarruf, 219.96);
  assert.equal(sonuc.yeni_harcama, 513.24);
});

test("geçersiz araç ve parametreleri hata olarak döndürür", () => {
  assert.ok(runTool("hesap_sil", {}, islemler).hata);
  assert.ok(runTool("kategori_toplami", { kategori: "kripto" }, islemler).hata);
  assert.ok(runTool("satici_ara", { satici: "  " }, islemler).hata);
});

test("uygulamadan gelen bozuk işlemleri ayıklar", () => {
  const clean = sanitizeIslemler([...islemler, { satici: "X", tutar: "100", kategori: "market", tip: "harcama" }, null]);
  assert.equal(clean.length, islemler.length);
});
