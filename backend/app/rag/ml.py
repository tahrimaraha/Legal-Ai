"""Trained models from the Legal AI notebook (model/legal-ai-output-notebook.ipynb), served at runtime.

* DomainClassifier — tuned Logistic Regression on word + character TF-IDF; predicts one of 11 legal domains.
* DenseRetriever   — multilingual-E5-small sentence embeddings of every corpus section (precomputed in the
                     notebook); used with the BM25/FTS5 search for hybrid retrieval (the notebook's RAG ③).

Both are optional: if the ML packages or the exported files (data/models/, made by scripts/export_models.py)
are missing, they report unavailable and the assistant keeps working with keyword search only.
The text pre-processing below mirrors the notebook exactly — the classifier only works on identically
prepared input.
"""
from __future__ import annotations

import json
import re
import threading
import time
import unicodedata
from pathlib import Path
from typing import Optional

from app.core.logging import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------- notebook pre-processing (cell 3) --
BN2EN = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
_ZW = dict.fromkeys([0x200C, 0x200D], None)
TOKEN_RE = re.compile(r"[A-Za-z0-9ঀ-৿]+")
BN_RE = re.compile(r"[ঀ-৿]")
STOP_BN = set(
    "এই এ ও এবং বা কিংবা যে যদি তাহা তাহার হইবে হইলে হইতে কোন কোনো করিবে করা করে করিয়া জন্য দ্বারা থেকে সে তিনি তাঁহার "
    "তার আমার আমি কি কী কেন আছে নেই না হয় হবে হলে হয়েছে করতে উপর মধ্যে সহিত সঙ্গে অধীন অনুযায়ী প্রতি এর তা তাই যা যার "
    "যাহার সেই ওই এটি ইহা ইহার উক্ত কর্তৃক ধারা অথবা তবে তাহাকে হইয়াছে হইয়া থাকিবে থাকে থাকা নয় নহে নাই আর কিন্তু বলিয়া বলে".split()
)
BN_SUFFIX = sorted(["গুলোকে", "গুলিকে", "গুলোর", "গুলির", "গুলো", "গুলি", "দিগের", "দিগকে", "েরটা", "েরা", "দের", "টিকে",
                    "টির", "টার", "টিতে", "টি", "টা", "কে", "রা", "ের", "তে", "য়ে", "ে", "র", "ায়", "য়"], key=len, reverse=True)

# The notebook's weak-labelling rules (cell "Label engineering"): an Act's legal domain from keywords in its title.
# Used to check a prediction against the Act actually cited in an answer.
DOMAINS = {
 "Criminal Law & Policing": r"\b(penal|criminal|police|offences?|crimes?|narcotics?|drugs? control|arms|explosives?|terroris[mt]|torture|acid|trafficking|prisons?|prisoners|jails?|speedy trial|special powers|repression|corruption|laundering|suppression|violence|abduction)\b|দণ্ডবিধি|ফৌজদারি|পুলিশ|অপরাধ|মাদক|অস্ত্র|বিস্ফোরক|সন্ত্রাস|নির্যাতন|এসিড|পাচার|কারাগার|দুর্নীতি|দমন|সহিংসতা",
 "Family & Personal Law": r"\b(marriages?|divorce|muslim family|hindu|christian|parsi|guardians?|succession|inheritance|dowry|maintenance|family courts?|wards|shariat|matrimonial)\b|বিবাহ|তালাক|পারিবারিক|উত্তরাধিকার|যৌতুক|অভিভাবক|মুসলিম|হিন্দু|খ্রিস্টান",
 "Land & Property": r"\b(land|lands|property|tenancy|acquisition|requisition|rent|survey|settlement|waqf|estates?|premises|buildings?|apartment|alluvion)\b|ভূমি|জমি|সম্পত্তি|হস্তান্তর|প্রজাস্বত্ব|অধিগ্রহণ|ভাড়া|জরিপ|ওয়াক্‌ফ|ইমারত|দালান|অ্যাপার্টমেন্ট",
 "Labour & Employment": r"\b(labou?r|workers?|employment|wages|factory|factories|trade unions?|industrial relations|workmen|provident fund|establishments?|maternity|employers?)\b|শ্রম|শ্রমিক|কারখানা|মজুরি|ভবিষ্য তহবিল|কর্মসংস্থান",
 "Commerce, Consumer & Companies": r"\b(consumers?|compan(y|ies)|partnership|contract|sale of goods|trade|trading|competition|import|export|standards|business|industries|industry|cooperative|societies)\b|ভোক্তা|কোম্পানি|অংশীদারি|চুক্তি|বাণিজ্য|প্রতিযোগিতা|আমদানি|রপ্তানি|শিল্প|সমবায়",
 "Banking, Finance & Tax": r"\b(banks?|banking|financ\w*|income tax|value added|vat|customs|insurance|securities|money|loans?|negotiable|currency|stamps?|revenue|tax|taxes|debt|monetary)\b|ব্যাংক|আর্থিক|আয়কর|মূল্য সংযোজন|ভ্যাট|শুল্ক|বীমা|সিকিউরিটিজ|ঋণ|মুদ্রা|স্ট্যাম্প|রাজস্ব|অর্থ ঋণ|অর্থ আইন",
 "Constitution, Courts & Procedure": r"\b(constitution|courts?|civil procedure|evidence|limitation|arbitration|judges?|judicial|procedure|jurisdiction|supreme|legal aid|advocates?|bar council|oaths?|tribunals?)\b|সংবিধান|আদালত|দেওয়ানি|সাক্ষ্য|তামাদি|সালিস|বিচারক|কার্যবিধি|সুপ্রিম|আইনগত সহায়তা|আইনজীবী|শপথ|ট্রাইব্যুনাল",
 "Local Government & Administration": r"\b(municipal\w*|union parishad|upazila|city corporation|district|local government|pourashava|administrative|civil service|public service|public servants?|election|representation of the people|parishad)\b|পৌরসভা|ইউনিয়ন পরিষদ|উপজেলা|সিটি কর্পোরেশন|জেলা|স্থানীয় সরকার|প্রশাসনিক|সরকারি কর্ম|নির্বাচন|পরিষদ",
 "Education, Health & Environment": r"\b(universit\w*|colleges?|education\w*|health|medical|hospitals?|pharmac\w*|environment\w*|pollution|forests?|wildlife|water|fisher\w*|agricultur\w*|food|nursing|dental|biodiversity|livestock|animal)\b|বিশ্ববিদ্যালয়|কলেজ|শিক্ষা|স্বাস্থ্য|চিকিৎসা|হাসপাতাল|পরিবেশ|দূষণ|বন্যপ্রাণী|পানি|মৎস্য|কৃষি|খাদ্য|নার্সিং|প্রাণিসম্পদ",
 "ICT, Media & Intellectual Property": r"\b(information and communication|cyber|digital|telecommunication\w*|broadcast\w*|press|copyright|patents?|trade ?marks?|designs?|films?|publications?|information technology|newspapers?)\b|তথ্য ও যোগাযোগ|সাইবার|ডিজিটাল|টেলিযোগাযোগ|সম্প্রচার|কপিরাইট|পেটেন্ট|ট্রেডমার্ক|চলচ্চিত্র|প্রকাশনা|সংবাদপত্র",
 "Transport, Energy & Infrastructure": r"\b(road|roads|transport|railways?|aviation|shipping|ports?|electric\w*|energy|gas|petroleum|power development|inland water|vehicles?|bridges?|aircraft)\b|সড়ক|পরিবহন|রেলওয়ে|বিমান|জাহাজ|বন্দর|বিদ্যুৎ|জ্বালানি|গ্যাস|পেট্রোলিয়াম|যানবাহন|সেতু",
}
_DOMAIN_RE = {k: re.compile(v, re.I) for k, v in DOMAINS.items()}


def act_domain(title: str) -> Optional[str]:
    """Domain with the most keyword hits in the Act title; ties go to the earlier domain (as in training)."""
    best, score = None, 0
    for k, rx in _DOMAIN_RE.items():
        n = len(rx.findall(title or ""))
        if n > score:
            best, score = k, n
    return best


# Bengali display names for the 11 domains the classifier was trained on
DOMAIN_BN = {
    "Banking, Finance & Tax": "ব্যাংকিং, অর্থ ও কর",
    "Commerce, Consumer & Companies": "বাণিজ্য, ভোক্তা ও কোম্পানি",
    "Constitution, Courts & Procedure": "সংবিধান, আদালত ও কার্যবিধি",
    "Criminal Law & Policing": "ফৌজদারি আইন ও পুলিশ",
    "Education, Health & Environment": "শিক্ষা, স্বাস্থ্য ও পরিবেশ",
    "Family & Personal Law": "পারিবারিক ও ব্যক্তিগত আইন",
    "ICT, Media & Intellectual Property": "আইসিটি, গণমাধ্যম ও মেধাস্বত্ব",
    "Labour & Employment": "শ্রম ও কর্মসংস্থান",
    "Land & Property": "ভূমি ও সম্পত্তি",
    "Local Government & Administration": "স্থানীয় সরকার ও প্রশাসন",
    "Transport, Energy & Infrastructure": "পরিবহন, জ্বালানি ও অবকাঠামো",
}


def normalise(text: str) -> str:
    t = unicodedata.normalize("NFC", text or "")
    t = t.translate(_ZW).translate(BN2EN)
    t = t.replace("য়", "য়").replace("ড়", "ড়").replace("ঢ়", "ঢ়")
    t = t.replace("ী", "ি").replace("ূ", "ু")
    t = re.sub(r"\[\*+\]", " ", t)
    t = re.sub(r"(?<=[A-Za-zঀ-৿,;:)\s.])\d{1,3}\[", " ", t)
    t = re.sub(r"[\[\]()]", " ", t)
    return re.sub(r"\s+", " ", t).strip().lower()


class _Tokeniser:
    def __init__(self) -> None:
        from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

        self.stop_en = set(ENGLISH_STOP_WORDS) | {"shall", "may", "thereof", "hereby", "herein", "said", "act", "section",
                                                  "sub", "clause", "whereas", "provided"}
        try:
            from nltk.stem import PorterStemmer

            self._porter = PorterStemmer().stem
        except Exception:  # noqa: BLE001 - same fallback the notebook used
            self._porter = lambda w: re.sub(r"(ing|edly|ed|ies|es|s)$", "", w) if len(w) > 4 else w
        self._cache: dict[str, str] = {}

    @staticmethod
    def _stem_bn(w: str) -> str:
        for suf in BN_SUFFIX:
            if w.endswith(suf) and len(w) - len(suf) >= 3:
                return w[: -len(suf)]
        return w

    def stem(self, w: str) -> str:
        r = self._cache.get(w)
        if r is None:
            r = self._stem_bn(w) if BN_RE.search(w) else self._porter(w)
            if len(self._cache) < 200_000:
                self._cache[w] = r
        return r

    def tokenise(self, text: str) -> list[str]:
        out = []
        for w in TOKEN_RE.findall(normalise(text)):
            if w in self.stop_en or w in STOP_BN:
                continue
            if len(w) < 2 and not w.isdigit():
                continue
            out.append(self.stem(w))
        return out


# ----------------------------------------------------------------------------- domain classifier --
class DomainClassifier:
    def __init__(self, path: Path):
        import joblib
        from scipy.sparse import hstack

        b = joblib.load(path)
        self._hstack = hstack
        self.vec_w, self.vec_c, self.model = b["vec_w"], b["vec_c"], b["model"]
        self.classes: list[str] = list(b["classes"])
        self.name: str = b.get("name", "Logistic Regression")
        self.tok = _Tokeniser()

    def proba(self, texts: list[str]):
        clean = [" ".join(self.tok.tokenise(t)) for t in texts]
        X = self._hstack([self.vec_w.transform(clean), self.vec_c.transform([normalise(t) for t in texts])]).tocsr()
        return self.model.predict_proba(X)

    def predict(self, text: str, top: int = 3) -> list[dict]:
        p = self.proba([text])[0]
        order = p.argsort()[::-1][:top]
        return [{"labelEn": self.classes[i], "labelBn": DOMAIN_BN.get(self.classes[i], self.classes[i]),
                 "confidence": round(float(p[i]), 3)} for i in order]


# ----------------------------------------------------------------------------- dense retriever --
class DenseRetriever:
    MODEL = "intfloat/multilingual-e5-small"

    def __init__(self, emb_path: Path, ids_path: Path):
        import numpy as np
        from sentence_transformers import SentenceTransformer

        self.np = np
        self.E = np.load(emb_path).astype("float32")  # L2-normalised in the notebook -> dot product = cosine
        self.ids: list[int] = json.loads(ids_path.read_text())
        if len(self.ids) != self.E.shape[0]:
            raise ValueError("section_ids.json does not match section_embeddings.npy")
        self.encoder = SentenceTransformer(self.MODEL, device="cpu")
        self.encoder.max_seq_length = 256
        self.lock = threading.Lock()

    def search(self, query: str, k: int = 60) -> list[tuple[int, float]]:
        with self.lock:  # the torch encoder is not re-entrant
            q = self.encoder.encode(["query: " + query], normalize_embeddings=True, convert_to_numpy=True)[0]
        s = self.E @ q.astype("float32")
        k = min(k, len(s))
        idx = self.np.argpartition(-s, k - 1)[:k]
        idx = idx[self.np.argsort(-s[idx])]
        return [(self.ids[i], float(s[i])) for i in idx]


# --------------------------------------------------------------------------------- registry --
class ModelRegistry:
    """Loads the optional models once, in the background, and remembers why one is unavailable."""

    def __init__(self, models_dir: Path):
        self.dir = models_dir
        self.classifier: Optional[DomainClassifier] = None
        self.dense: Optional[DenseRetriever] = None
        self.errors: dict[str, str] = {}
        self.ready = threading.Event()
        self._started = False
        self._lock = threading.Lock()

    def start(self) -> None:
        with self._lock:
            if self._started:
                return
            self._started = True
        threading.Thread(target=self._load, name="ml-models", daemon=True).start()

    def _load(self) -> None:
        t0 = time.perf_counter()
        try:
            self.classifier = DomainClassifier(self.dir / "domain_classifier.joblib")
        except Exception as exc:  # noqa: BLE001
            self.errors["classifier"] = f"{type(exc).__name__}: {exc}"
        try:
            self.dense = DenseRetriever(self.dir / "section_embeddings.npy", self.dir / "section_ids.json")
        except Exception as exc:  # noqa: BLE001
            self.errors["dense"] = f"{type(exc).__name__}: {exc}"
        self.ready.set()
        logger.info("ml_models_loaded", classifier=self.classifier is not None, dense=self.dense is not None,
                    seconds=round(time.perf_counter() - t0, 1), errors=self.errors or None)

    def status(self) -> dict:
        return {
            "loaded": self.ready.is_set(),
            "classifier": self.classifier.name if self.classifier else None,
            "dense": DenseRetriever.MODEL if self.dense else None,
            "retrieval": "hybrid" if self.dense else "keyword",
            "errors": self.errors,
        }
