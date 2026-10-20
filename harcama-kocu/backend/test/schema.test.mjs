import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, validateTransaction } from "../src/schema.mjs";

test("Türkçe ve İngilizce tutar biçimlerini doğru çevirir", () => {
  assert.equal(parseAmount("1.250,00"), 1250);
  assert.equal(parseAmount("245,90"), 245.9);
  assert.equal(parseAmount("1,250.00"), 1250);
  assert.equal(parseAmount("149.99"), 149.99);
  assert.equal(parseAmount("1.250"), 1250);
  assert.equal(parseAmount("12.345.678,90"), 12345678.9);
  assert.equal(parseAmount("3000"), 3000);
  assert.equal(parseAmount("1.250,00 TL"), 1250);
});

test("geçersiz tutar ya da kategoriyi reddeder", () => {
  const base = { kaynak: "x", satici: "Migros", tutar_metin: "10,00", kategori: "market", tip: "harcama", tarih: null };
  assert.throws(() => validateTransaction({ ...base, tutar_metin: "abc" }));
  assert.throws(() => validateTransaction({ ...base, kategori: "kripto" }));
  assert.throws(() => validateTransaction({ ...base, tip: "transfer" }));
  assert.equal(validateTransaction(base).tutar, 10);
});

test("uydurma tarih biçimlerini null yapar", () => {
  const t = validateTransaction({ kaynak: "x", satici: "A", tutar_metin: "5", kategori: "diger", tip: "harcama", tarih: "12.10" });
  assert.equal(t.tarih, null);
});
