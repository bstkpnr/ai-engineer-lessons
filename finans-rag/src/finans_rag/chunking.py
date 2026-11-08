"""Dokümanı aranabilir parçalara bölmek (chunking).

Tek bir doğru parça boyutu yok; dokümanın yapısına göre karar veriyoruz:
- Kanunlar "MADDE 1", "MADDE 2" diye, sözleşmeler "7.3. Geç Ödeme" gibi numaralı başlıklarla ilerler.
  Bir madde ya da başlık genelde tek bir konuyu anlatır, bu yüzden önce ona göre bölüyoruz.
  Kaynak gösterirken de "Madde 26" ya da "7.3 Geç Ödeme" diyebiliyoruz.
- Ücret tarifesi gibi tablolu dokümanlarda madde yok; satırları bölmemek için küçük parçalar kullanıyoruz.
- Diğer metinlerde LangChain'in RecursiveCharacterTextSplitter'ı: önce paragraf, sonra satır, sonra
  cümle sınırından böler. Parçalar arasındaki örtüşme (overlap), bir cümlenin iki parçaya bölünüp
  anlamını kaybetmesini önler.
"""

import re
import uuid

from langchain_text_splitters import RecursiveCharacterTextSplitter

from .models import Chunk, Source

# Kanun: "MADDE 26 –", "Madde 26-", "MADDE 26." gibi başlıklar
MADDE_RE = re.compile(r"(?m)^(?:MADDE|Madde)\s+(\d+)\s*[-–—.:]?")
# Sözleşme: "7.3. Geç Ödeme (Temerrüt)" gibi numaralı başlıklar. Numaranın her parçası en fazla
# iki hane: "251 TL Yıllık" gibi tablo satırları başlık sanılmasın.
NUMBERED_RE = re.compile(r"(?m)^(\d{1,2}(?:\.\d{1,2})*)\.?\s+([A-ZÇĞİÖŞÜ][^\n]{2,90})$")
MIN_SECTION_COUNT = 3  # Bu kadar başlık bulunamazsa doküman bu yapıda sayılmaz

SIZES = {  # (parça boyutu, örtüşme) karakter cinsinden
    "mevzuat": (1200, 150),
    "sozlesme": (1000, 150),
    "tarife": (500, 50),
    "genel": (800, 120),
}


def _splitter(doc_type: str) -> RecursiveCharacterTextSplitter:
    size, overlap = SIZES.get(doc_type, SIZES["genel"])
    return RecursiveCharacterTextSplitter(
        chunk_size=size, chunk_overlap=overlap, separators=["\n\n", "\n", ". ", " ", ""]
    )


def _chunk_id(source: Source, page: int, index: int) -> str:
    # Aynı doküman tekrar yüklenirse aynı id çıkar: Qdrant'ta kopya oluşmaz, üzerine yazılır
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{source.file}#{page}#{index}"))


def _make(source: Source, text: str, page: int, section: str | None, index: int) -> Chunk:
    return Chunk(
        id=_chunk_id(source, page, index),
        text=text.strip(),
        source=source.title,
        doc_type=source.doc_type,
        page=page,
        section=section,
        url=source.url,
        valid_from=source.valid_from,
    )


def _article_label(m: re.Match) -> str:
    return f"Madde {m.group(1)}"


def _numbered_label(m: re.Match) -> str:
    return f"{m.group(1)} {m.group(2).strip()}"


def _title_line_start(full: str, pos: int) -> int:
    """Kanunlarda madde başlığı ("Kapsam") "MADDE 2" satırının hemen üstündedir.
    O kısa satırı bir önceki maddeye değil, bu maddeye dahil eder."""
    prev = full.rfind("\n", 0, max(pos - 1, 0))
    line = full[prev + 1 : pos].strip()
    if 0 < len(line) <= 60 and not line.endswith((".", ":", ";", ",")):
        return prev + 1
    return pos


def chunk_by_sections(
    source: Source, pages: list[tuple[int, str]], pattern: re.Pattern, label, title_above: bool = False
) -> list[Chunk] | None:
    """Başlıklara göre böler. Doküman bu yapıda değilse None döner."""
    full, starts = "", []  # starts: (metindeki konum, sayfa_no)
    for page_no, text in pages:
        starts.append((len(full), page_no))
        full += text + "\n\n"

    def page_at(pos: int) -> int:
        return max((p for start, p in starts if start <= pos), default=pages[0][0])

    matches = list(pattern.finditer(full))
    if len(matches) < MIN_SECTION_COUNT:
        return None

    bounds = [_title_line_start(full, m.start()) if title_above else m.start() for m in matches]
    segments = []
    if bounds[0] > 0 and full[: bounds[0]].strip():
        segments.append((0, bounds[0], "Giriş"))
    for i, m in enumerate(matches):
        end = bounds[i + 1] if i + 1 < len(matches) else len(full)
        segments.append((bounds[i], end, label(m)))

    splitter = _splitter(source.doc_type)
    max_size = SIZES.get(source.doc_type, SIZES["genel"])[0]
    chunks: list[Chunk] = []
    for start, end, section in segments:
        text = full[start:end].strip()
        if not text:
            continue
        # Çok uzun bir bölüm yine de bölünür, ama her parça hangi bölüme ait olduğunu bilir
        parts = splitter.split_text(text) if len(text) > max_size else [text]
        offset = start
        for part in parts:
            pos = full.find(part[:40], offset)
            offset = pos if pos >= 0 else offset
            chunks.append(_make(source, part, page_at(offset), section, len(chunks)))
    return chunks


def chunk_by_page(source: Source, pages: list[tuple[int, str]]) -> list[Chunk]:
    """Her sayfayı kendi içinde böler; böylece her parçanın sayfa numarası kesin olur."""
    splitter = _splitter(source.doc_type)
    chunks: list[Chunk] = []
    for page_no, text in pages:
        for part in splitter.split_text(text):
            chunks.append(_make(source, part, page_no, None, len(chunks)))
    return chunks


def chunk_document(source: Source, pages: list[tuple[int, str]]) -> list[Chunk]:
    if not pages:
        return []
    if source.doc_type in ("mevzuat", "sozlesme"):
        by_madde = chunk_by_sections(source, pages, MADDE_RE, _article_label, title_above=True)
        if by_madde:
            return by_madde
    if source.doc_type == "sozlesme":
        by_heading = chunk_by_sections(source, pages, NUMBERED_RE, _numbered_label)
        if by_heading:
            return by_heading
    return chunk_by_page(source, pages)
