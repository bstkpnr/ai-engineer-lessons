from finans_rag.chunking import chunk_document
from finans_rag.loader import clean_text
from finans_rag.models import Source

KANUN = Source(file="kanun.pdf", title="5464 sayılı Kanun", doc_type="mevzuat")

PAGES = [
    (1, "BANKA KARTLARI VE KREDİ KARTLARI KANUNU\nAmaç ve kapsam\nMADDE 1 – Bu Kanunun amacı..."),
    (2, "MADDE 2 – Bu Kanun kart çıkaran kuruluşları kapsar.\nMADDE 3 – Tanımlar şunlardır."),
    (
        3,
        "devamı olan tanımlar.\nMADDE 26 – Kartın kaybolması veya çalınması halinde kart hamilinin sorumluluğu...",
    ),
]


def test_splits_by_article_and_finds_correct_page():
    chunks = chunk_document(KANUN, PAGES)
    sections = [(c.section, c.page) for c in chunks]
    assert ("Giriş", 1) in sections
    assert ("Madde 1", 1) in sections
    assert ("Madde 3", 2) in sections
    assert ("Madde 26", 3) in sections
    madde3 = next(c for c in chunks if c.section == "Madde 3")
    assert "devamı olan tanımlar" in madde3.text  # sayfa sınırını aşan madde bölünmez


def test_long_article_is_split_but_keeps_article_info():
    long = "MADDE 1 – " + "Kart hamili ödemeyi zamanında yapar. " * 80
    pages = [(1, long), (2, "MADDE 2 – Kısa madde."), (3, "MADDE 3 – Bir başka kısa madde.")]
    chunks = chunk_document(KANUN, pages)
    madde1 = [c for c in chunks if c.section == "Madde 1"]
    assert len(madde1) > 1
    assert all(len(c.text) <= 1200 for c in madde1)


def test_splits_by_page_when_no_article_structure():
    tarife = Source(file="t.pdf", title="Ücret tarifesi", doc_type="tarife")
    pages = [(1, "Yıllık kart ücreti 500 TL\n" * 40), (2, "Nakit avans ücreti 50 TL")]
    chunks = chunk_document(tarife, pages)
    assert {c.page for c in chunks} == {1, 2}
    assert all(c.section is None for c in chunks)
    assert all(len(c.text) <= 500 for c in chunks)


def test_same_document_produces_same_ids():
    assert [c.id for c in chunk_document(KANUN, PAGES)] == [c.id for c in chunk_document(KANUN, PAGES)]


def test_pdf_text_is_cleaned():
    assert clean_text("kre-\ndi  kartı  ücreti\n\n\n\nyıllık") == "kredi kartı ücreti\n\nyıllık"


def test_detects_letter_spaced_text():
    from finans_rag.loader import is_letter_spaced

    assert is_letter_spaced("B A N K A K A R T L A R I V E K R E D İ K A R T L A R I K A N U N U M A D D E 1")
    assert not is_letter_spaced("Bu Kanunun amacı banka kartları ve kredi kartlarının çıkarılmasına " * 3)


def test_article_title_is_included_in_its_own_article():
    chunks = chunk_document(KANUN, PAGES)
    madde2 = next(c for c in chunks if c.section == "Madde 1")
    assert madde2.text.startswith("Amaç ve kapsam")


def test_contract_is_split_by_numbered_headings():
    sozlesme = Source(file="s.pdf", title="Sözleşme", doc_type="sozlesme")
    pages = [
        (1, "KREDİ KARTI SÖZLEŞMESİ\n7. BORÇ ÖDEMELERİNİZ\nBorcunuzu son ödeme tarihine kadar ödersiniz."),
        (
            2,
            "251 TL 125 TL Yıllık\n7.1. Minimum Ödeme Oranları\nAsgari ödeme tutarı limitin yüzde yirmisidir.",
        ),
        (3, "7.3. Geç Ödeme (Temerrüt)\nGecikme faizi uygulanır."),
    ]
    sections = [c.section for c in chunk_document(sozlesme, pages)]
    assert sections == [
        "Giriş",
        "7 BORÇ ÖDEMELERİNİZ",
        "7.1 Minimum Ödeme Oranları",
        "7.3 Geç Ödeme (Temerrüt)",
    ]


def test_watermark_repeated_on_every_page_is_removed():
    from finans_rag.loader import remove_repeated_lines

    pages = [(i, f"ÖRNEKTİR\nSayfa {i} içeriği burada") for i in range(1, 6)]
    assert remove_repeated_lines(pages)[0] == (1, "Sayfa 1 içeriği burada")
