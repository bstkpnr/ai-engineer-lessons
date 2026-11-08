"""Kelime araması (BM25) için seyrek (sparse) vektörler.

Anlam araması (embedding) "kahve" ile "Starbucks"u eşleştirmekte iyi, ama kısa bir soruyu uzun bir
hukuki metinle eşleştirirken zorlanabiliyor. Gerçek denemede "Kartım çalınırsa ne yapmalıyım?"
sorusunda "4.2 Çalınma ve Kaybetme" bölümü ancak 5. sıraya çıkabildi. Oysa "çalın" kelimesi o
bölümde birebir geçiyor. Kelime araması bu durumu yakalar.

BM25 iki fikre dayanır:
- Bir kelime parçada ne kadar sık geçiyorsa parça o kadar ilgilidir, ama bu etki doyar
  (10 kez geçmesi 1 kez geçmesinden 10 kat değerli değildir). Uzun parçalar biraz cezalandırılır.
- Nadir kelime değerlidir: "çalınma" az parçada geçer, "kart" neredeyse hepsinde. Bu kısmı (IDF)
  Qdrant bütün koleksiyona bakarak kendisi hesaplıyor.

Türkçe sondan eklemeli bir dil: "çalınırsa", "çalınması", "çalınma" aynı kökten. Türkçe bilgi erişimi
çalışmalarında kelimenin ilk birkaç harfini almak basit ama etkili bir kök bulma yöntemi olarak bilinir.
Denediğimizde ilk 5 harf kısa köklerde ("faiz" ile "faizi") eşleşmedi; Snowball kök bulucusu ise fiillerde
tutarsızdı ("çalınırsa" → "çalınır", "çalınması" → "çalınmas"). Bu yüzden her kelimeden hem ilk 4 hem
ilk 5 harfi terim olarak alıyoruz. İkisi birden eşleşen parça daha yüksek puan alıyor; "çalı" gibi
4 harflik terimlerin yol açtığı yanlış eşleşmeler ise IDF sayesinde düşük ağırlıkta kalıyor.
"""

import re
import zlib
from collections import Counter

from qdrant_client.models import SparseVector

PREFIXES = (4, 5)
K1, B, AVG_LEN = 1.2, 0.75, 120  # BM25'in standart parametreleri; AVG_LEN: ortalama parça uzunluğu (terim)

STOPWORDS = {
    "acaba",
    "ama",
    "ancak",
    "bana",
    "bazı",
    "ben",
    "beni",
    "benim",
    "bile",
    "bir",
    "biz",
    "bize",
    "bu",
    "bunu",
    "çok",
    "da",
    "daha",
    "de",
    "diye",
    "en",
    "gibi",
    "göre",
    "hem",
    "her",
    "için",
    "ile",
    "ise",
    "kadar",
    "ki",
    "mi",
    "mı",
    "mu",
    "mü",
    "nasıl",
    "ne",
    "neden",
    "o",
    "olan",
    "olarak",
    "olur",
    "sen",
    "siz",
    "size",
    "şu",
    "ve",
    "veya",
    "ya",
    "yani",
}

TOKEN_RE = re.compile(r"\w+", re.UNICODE)


def lower_tr(text: str) -> str:
    # Python'un lower()'ı "I"yı "i" yapar; Türkçede "ı" olmalı
    return text.replace("I", "ı").replace("İ", "i").lower()


def terms(text: str) -> list[str]:
    """Metni arama terimlerine çevirir: küçük harf, gereksiz kelimeleri at, ilk 4 ve 5 harfi al."""
    out: list[str] = []
    for w in TOKEN_RE.findall(lower_tr(text)):
        if len(w) < 2 or w in STOPWORDS or w.isdigit():
            continue
        out.append(w[: PREFIXES[0]])
        out.extend(w[:n] for n in PREFIXES[1:] if len(w) >= n)
    return out


def term_id(term: str) -> int:
    return zlib.crc32(term.encode("utf-8"))  # Her terime sabit bir sayı (sparse vektörün indeksi)


def _vector(weights: dict[int, float]) -> SparseVector:
    return SparseVector(indices=list(weights), values=list(weights.values()))


def encode_document(text: str) -> SparseVector:
    counts = Counter(terms(text))
    length = sum(counts.values()) or 1
    weights: dict[int, float] = {}
    for term, tf in counts.items():
        weight = tf * (K1 + 1) / (tf + K1 * (1 - B + B * length / AVG_LEN))
        weights[term_id(term)] = weights.get(term_id(term), 0.0) + weight
    return _vector(weights)


def encode_query(text: str) -> SparseVector:
    return _vector({term_id(t): 1.0 for t in set(terms(text))})
