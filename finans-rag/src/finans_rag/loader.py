"""PDF'ten sayfa sayfa metin okuma ve doküman listesini (sources.json) yükleme."""

import json
import re
from collections import Counter
from pathlib import Path

from pypdf import PdfReader

from .models import Source


def clean_text(text: str) -> str:
    """PDF'ten gelen metindeki gereksiz boşlukları toparlar, satır yapısını korur."""
    text = text.replace(" ", " ").replace("­", "")  # bölünmez boşluk, yumuşak tire
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)  # satır sonunda bölünmüş kelimeler: "kre-\ndi" → "kredi"
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def is_letter_spaced(text: str) -> bool:
    """Bazı PDF'lerde her harf ayrı konumlandırıldığı için metin "B A N K A" diye gelir.
    Bu metin hem aramayı hem "MADDE 1" gibi başlıkları bozar."""
    tokens = text.split()
    return len(tokens) > 20 and sum(len(t) == 1 for t in tokens) / len(tokens) > 0.5


def extract_page(page) -> str:
    text = page.extract_text() or ""
    if is_letter_spaced(text):
        # "layout" modu harflerin konumuna bakıp kelimeleri yeniden birleştirir
        text = page.extract_text(extraction_mode="layout") or ""
    return clean_text(text)


PAGE_COUNTER_RE = re.compile(r"(?m)^\s*\d+\s*/\s*\d+\s*$")  # "5 / 20" gibi sayfa sayaçları


def remove_repeated_lines(pages: list[tuple[int, str]], ratio: float = 0.6) -> list[tuple[int, str]]:
    """Sayfaların çoğunda aynen tekrar eden kısa satırlar üst bilgi, alt bilgi ya da filigrandır
    ("ÖRNEKTİR", banka adı). Her parçaya karışıp aramayı bozmasınlar diye çıkarılır."""
    if len(pages) < 4:
        return pages
    counts = Counter(line for _, text in pages for line in set(text.split("\n")) if 0 < len(line) <= 40)
    repeated = {line for line, n in counts.items() if n / len(pages) >= ratio}
    return [(p, "\n".join(l for l in text.split("\n") if l not in repeated).strip()) for p, text in pages]


def read_pdf(path: Path) -> list[tuple[int, str]]:
    """[(sayfa_no, metin), ...] döndürür. Sayfa numarası 1'den başlar; kaynak gösterirken bunu kullanırız."""
    reader = PdfReader(path)
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = PAGE_COUNTER_RE.sub("", extract_page(page)).strip()
        if text:
            pages.append((i, text))
    return [(p, t) for p, t in remove_repeated_lines(pages) if t]


def load_sources(data_dir: Path) -> list[Source]:
    manifest = data_dir / "sources.json"
    if not manifest.exists():
        raise FileNotFoundError(f"{manifest} bulunamadı. Hangi PDF'lerin yükleneceğini bu dosya söyler.")
    return [Source(**item) for item in json.loads(manifest.read_text(encoding="utf-8"))]
