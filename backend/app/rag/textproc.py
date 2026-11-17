"""Bengali/English text utilities shared by the corpus builder and the query engine.

Index-time and query-time MUST use the same functions here, otherwise tokens will not match.
"""
from __future__ import annotations

import re
import unicodedata

BN2EN = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
EN2BN = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")

_BN_CHAR = re.compile(r"[\u0980-\u09FF]")
_TOKEN = re.compile(r"[A-Za-z0-9\u0980-\u09FF]+")
_ZW = dict.fromkeys([0x200C, 0x200D], None)

STOP_EN = frozenset(
    """a an and any are as at be been being by can could do does for from has have how i if in into is it its may me
    my no not of on or our shall should so such than that the their them then there these they this those to under
    was we were what when where which who whom why will with would you your am also upon thereof therein
    hereby herein said whom whose""".split()
)
STOP_BN = frozenset(
    """এই এ ও এবং বা কিংবা যে যদি তাহা তাহার হইবে হইলে হইতে কোন কোনো করিবে করা করে করিয়া জন্য দ্বারা থেকে সে
    তিনি তাঁহার তার আমার আমি আমাকে আমরা কি কী কেন কিভাবে কীভাবে কোথায় আছে নেই না হয় হবে হলে হয়েছে করতে করব
    করবো পারি পারেন উপর মধ্যে সহিত সঙ্গে অধীন অনুযায়ী প্রতি এর তা তাই যা যার যাহার সেই ওই এটি ইহা ইহার উক্ত কর্তৃক
    ধারা অথবা তবে তাহাকে তাহাদের তাদের হইয়াছে হইয়া থাকিবে থাকে থাকা নয় নহে নাই আর কিন্তু বলিয়া বলে""".split()
)

_BN_SUFFIXES = sorted(
    ["গুলোকে", "গুলিকে", "গুলোর", "গুলির", "গুলো", "গুলি", "দিগের", "দিগকে", "েরটা", "েরা", "দের", "টিকে", "টির",
     "টার", "টিতে", "টি", "টা", "কে", "রা", "ের", "তে", "য়ে", "ে", "র", "ায়", "য়"],
    key=len,
    reverse=True,
)


def has_bn(s: str) -> bool:
    return bool(_BN_CHAR.search(s or ""))


def bn_ratio(s: str) -> float:
    letters = [c for c in (s or "") if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if "\u0980" <= c <= "\u09FF") / len(letters)


def to_bn_digits(s: str) -> str:
    return str(s).translate(EN2BN)


def _norm_bn(tok: str) -> str:
    tok = unicodedata.normalize("NFC", tok)
    tok = tok.replace("য\u09bc", "\u09df").replace("ড\u09bc", "\u09dc").replace("ঢ\u09bc", "\u09dd")
    return tok.replace("ী", "ি").replace("ূ", "ু").replace("ৈ", "ৈ")


def stem_bn(tok: str) -> str:
    tok = _norm_bn(tok)
    for suf in _BN_SUFFIXES:
        if tok.endswith(suf) and len(tok) - len(suf) >= 3:
            return tok[: -len(suf)]
    return tok


def tokenize(text: str, *, keep_stop: bool = False) -> list[str]:
    """Lower-cased, digit-normalised, stop-word-filtered tokens (Bengali tokens lightly stemmed)."""
    if not text:
        return []
    text = text.translate(BN2EN).translate(_ZW).lower()
    out: list[str] = []
    for tok in _TOKEN.findall(text):
        if has_bn(tok):
            tok = stem_bn(tok)
            if not keep_stop and tok in STOP_BN:
                continue
        else:
            if not keep_stop and tok in STOP_EN:
                continue
            if len(tok) < 2 and not tok.isdigit():
                continue
        if tok.isdigit() and len(tok) > 4:
            continue
        out.append(tok)
    return out


_FOOTNOTE_OPEN = re.compile(r"(?<=[A-Za-z\u0980-\u09FF,;:)\s.])\d{1,3}\[")
_REPEAL_STUB = re.compile(r"^\W*\d*[A-Za-z]*\W*\[?\s*(repealed|omitted|রহিত|বিলুপ্ত|বিলোপ)", re.I)


def clean_text(s: str) -> str:
    """Display clean-up: drop footnote markers, collapse whitespace. Keeps the legal wording untouched."""
    if not s:
        return ""
    s = s.replace("\t", " ").replace("\r", " ")
    s = re.sub(r"\[\*+\]", "", s)
    s = _FOOTNOTE_OPEN.sub("[", s)
    s = re.sub(r"[ \u00a0]+", " ", s)
    s = re.sub(r"\s*\n\s*", "\n", s)
    return s.strip()


def is_repeal_stub(s: str) -> bool:
    return bool(_REPEAL_STUB.match((s or "").strip())) and len(s) < 260


def split_sentences(text: str) -> list[str]:
    """Sentence-ish split that works for English full stops and the Bengali danda."""
    parts = re.split(r"(?<=[.;:।])\s+|\n+", text)
    return [p.strip() for p in parts if p and p.strip()]


def norm_query(text: str) -> str:
    """Whole-string normalisation used for keyword/trigger matching (not for FTS tokens)."""
    return _norm_bn((text or "").translate(_ZW)).translate(BN2EN).lower()
