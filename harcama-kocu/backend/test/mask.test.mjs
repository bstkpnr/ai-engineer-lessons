import { test } from "node:test";
import assert from "node:assert/strict";
import { maskSensitive } from "../src/mask.mjs";

test("kart numarasını maskeler, son 4 haneyi bırakır", () => {
  const { masked, found } = maskSensitive("Kartım 4543 1234 5678 9012 bloke oldu");
  assert.equal(masked, "Kartım **** **** **** 9012 bloke oldu");
  assert.deepEqual(found, ["kart"]);
});

test("IBAN'ı maskeler", () => {
  const { masked } = maskSensitive("TR33 0006 1005 1978 6457 8413 26 hesabına gönderdim");
  assert.equal(masked, "TR** **** **** **** **** **26 hesabına gönderdim");
});

test("TC kimlik, telefon ve e-postayı maskeler", () => {
  const { masked, found } = maskSensitive("TC 12345678901, tel 0532 123 45 67, mail ali.veli@ornek.com");
  assert.equal(masked, "TC ***********, tel 05** *** ** 67, mail a***@ornek.com");
  assert.deepEqual(found.sort(), ["eposta", "tckn", "telefon"]);
});

test("hassas veri yoksa metne dokunmaz", () => {
  const text = "Uygulama açılırken donuyor, 3 gündür böyle.";
  assert.deepEqual(maskSensitive(text), { masked: text, found: [] });
});
