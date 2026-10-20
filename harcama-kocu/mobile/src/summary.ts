import { kategoriLabel } from "./labels";
import type { Kategori, KayitliIslem } from "./types";

// Tüm hesaplar burada, kodla yapılıyor. Model sadece bu hazır rakamları yorumluyor.
export type Summary = ReturnType<typeof buildSummary>;

const round = (n: number) => Math.round(n * 100) / 100;

export function buildSummary(islemler: KayitliIslem[]) {
  const tl = islemler.filter((i) => i.para_birimi === "TRY");
  const doviz = islemler.filter((i) => i.para_birimi !== "TRY");

  const harcamalar = tl.filter((i) => i.tip === "harcama");
  const iadeler = tl.filter((i) => i.tip === "iade");
  const toplam_harcama = round(harcamalar.reduce((s, i) => s + i.tutar, 0));
  const toplam_iade = round(iadeler.reduce((s, i) => s + i.tutar, 0));
  const net = round(toplam_harcama - toplam_iade);

  // Kategori bazında net harcama (iadeler kendi kategorisinden düşülür)
  const byCat = new Map<Kategori, { tutar: number; adet: number }>();
  for (const i of tl) {
    const c = byCat.get(i.kategori) ?? { tutar: 0, adet: 0 };
    c.tutar += i.tip === "iade" ? -i.tutar : i.tutar;
    if (i.tip === "harcama") c.adet += 1;
    byCat.set(i.kategori, c);
  }
  const kategoriler = [...byCat.entries()]
    .map(([kategori, c]) => ({
      kategori,
      etiket: kategoriLabel[kategori],
      tutar: round(c.tutar),
      adet: c.adet,
      yuzde: net > 0 ? Math.round((c.tutar / net) * 100) : 0,
    }))
    .filter((c) => c.tutar > 0)
    .sort((a, b) => b.tutar - a.tutar);

  const bySeller = new Map<string, { tutar: number; adet: number }>();
  for (const i of harcamalar) {
    const key = i.satici;
    const s = bySeller.get(key) ?? { tutar: 0, adet: 0 };
    s.tutar += i.tutar;
    s.adet += 1;
    bySeller.set(key, s);
  }
  const en_cok_harcanan_saticilar = [...bySeller.entries()]
    .map(([satici, s]) => ({ satici, tutar: round(s.tutar), adet: s.adet }))
    .sort((a, b) => b.tutar - a.tutar)
    .slice(0, 5);

  const abonelikMap = new Map<string, number>();
  for (const i of harcamalar.filter((i) => i.kategori === "abonelik")) abonelikMap.set(i.satici, i.tutar);
  const abonelikler = [...abonelikMap.entries()].map(([satici, tutar]) => ({ satici, tutar }));
  const abonelik_toplami = round(abonelikler.reduce((s, a) => s + a.tutar, 0));

  return {
    not: "Tutarlar TL'dir. Döviz harcamaları kura çevrilmeden ayrıca listelenmiştir.",
    islem_sayisi: harcamalar.length,
    toplam_harcama,
    toplam_iade,
    net_harcama: net,
    kategoriler,
    en_cok_harcanan_saticilar,
    abonelikler,
    abonelik_toplami,
    doviz_harcamalari: doviz.map((i) => ({ satici: i.satici, tutar: i.tutar, para_birimi: i.para_birimi })),
    // Modele her işlemin dökümünü değil, sadece kısa bir listesini gönderiyoruz (context ve maliyet için)
    islemler: islemler.slice(0, 60).map((i) => ({
      satici: i.satici,
      kategori: i.kategori,
      tip: i.tip,
      tutar: i.tutar,
      para_birimi: i.para_birimi,
    })),
  };
}
