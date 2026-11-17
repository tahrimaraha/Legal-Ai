"""Legal retrieval engine: topic routing + BM25 (SQLite FTS5) + re-ranking + cited answer composition.

Works fully offline. An optional LLM (see llm.py) can rewrite the answer text, but every citation always
comes from retrieved dataset sections.
"""
from __future__ import annotations

import re
import sqlite3
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.rag.crime import CrimeStats
from app.rag.ml import act_domain
from app.rag.lexicon import HEADS, PENAL_TOPICS, SYNONYMS, TOPICS, Topic
from app.rag.textproc import BN2EN, has_bn, norm_query, split_sentences, to_bn_digits, tokenize

GENERIC = {"section", "act", "law", "bangladesh", "legal", "please", "tell", "know", "want", "need", "help",
           "can", "ordinance", "বাংলাদেশ", "আইন", "জানতে", "চাই", "বলুন"}
LABEL_RE = re.compile(r"^(.*?)\s·\s(?:Section|Article|ধারা|অনুচ্ছেদ)\s(\S+?)(?:\s—|\s-|$)")
MIN_CONFIDENCE = 0.22
LEGAL_CUES = re.compile(
    r"\b(law|legal|illegal|lawful|act|section|court|police|punish|penalt|fine|rights?|case|crime|offen[cs]e|"
    r"sue|lawyer|advocate|notice|bail|arrest|complain|legally|allowed|entitled|compensation)\b|"
    r"আইন|শাস্তি|মামলা|আদালত|অধিকার|অপরাধ|ধারা|দণ্ড|জরিমানা|আইনজীবী|নোটিশ|জামিন|অভিযোগ|ক্ষতিপূরণ|বেআইনি|বৈধ")


# A question about another country's law ("... in California") is out of scope: the corpus is Bangladesh law only.
_PLACES_EN = (r"(the )?(usa|us|u\.s\.|united states|america|california|texas|new york|uk|united kingdom|england|britain|"
              r"india|pakistan|canada|australia|germany|france|japan|china|dubai|uae|saudi arabia|malaysia|singapore)")
# Only questions about the law OF another place: "penalty for X in California", "is it legal in the UK", "Indian law".
FOREIGN_LAW_EN = re.compile(
    r"\b(laws?|legal|illegal|lawful|penalt\w*|punish\w*|fine|sentence|jail|prison|allowed|crime)\b[^.?!]{0,60}?\bin " + _PLACES_EN + r"\b|"
    r"\b(us|american|californian|uk|british|english|indian|pakistani|canadian|australian|german|french|japanese|chinese|saudi|"
    r"malaysian|singaporean)\s+(law|laws|legal system|penal code|court)\b", re.I)
# Bengali: place name + locative ending, then (within a few words) a punishment / legality word. Matched on text with
# "য়" decomposed (য + ়), as Bengali keyboards type it; no \b, which is unreliable next to Bengali vowel signs.
FOREIGN_LAW_BN = re.compile(
    ("(যুক্তরাষ্ট্র|আমেরিকা|ক্যালিফোর্নিয়া|যুক্তরাজ্য|ইংল্যান্ড|ব্রিটেন|ভারত|পাকিস্তান|কানাডা|অস্ট্রেলিয়া|জার্মানি|ফ্রান্স|জাপান|চীন|দুবাই|"
     "সৌদি আরব|মালয়েশিয়া|সিঙ্গাপুর)(ে|য়|এ|তে|ের আইনে|এর আইনে)[^।?!]{0,40}?(শাস্তি|দণ্ড|জরিমানা|বৈধ|অবৈধ|আইনে)").replace("\u09df", "\u09af\u09bc"))


def is_foreign_law(question: str) -> bool:
    """True for questions about another country's law; the corpus covers Bangladesh law only."""
    if re.search(r"bangladesh|বাংলাদেশ", question, re.I):
        return False
    return bool(FOREIGN_LAW_EN.search(question) or FOREIGN_LAW_BN.search(question.replace("\u09df", "\u09af\u09bc")))


# Dense (E5) weight in the fusion by query language: the notebook's benchmark found E5 on par with BM25 for
# English but clearly weaker for Bengali-to-Bengali retrieval (Hit@5 0.41 vs 0.60), so it gets half weight there.
DENSE_WEIGHT = {"en": 1.0, "bn": 0.5}


@dataclass
class Hit:
    sid: int
    act_id: int
    score: float
    row: sqlite3.Row
    act: sqlite3.Row


@dataclass
class Analysis:
    topics: list[Topic] = field(default_factory=list)
    tokens: list[str] = field(default_factory=list)
    expand: list[str] = field(default_factory=list)
    lang: str = "en"


class LegalEngine:
    def __init__(self, db_path: str | Path):
        self.path = str(db_path)
        self.db = sqlite3.connect(f"file:{self.path}?mode=ro", uri=True, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.lock = threading.Lock()
        self.crime = CrimeStats(self.db, self.lock)
        self.models = None  # optional trained models (app.rag.ml.ModelRegistry), attached by the API
        with self.lock:
            self.acts = {r["id"]: r for r in self.db.execute("SELECT * FROM acts")}
            self.meta = dict(self.db.execute("SELECT key, value FROM meta").fetchall())
        self.topic_acts: dict[str, set[int]] = {}
        for t in TOPICS:
            pats = [re.compile(p, re.I) for p in t.acts]
            weights: dict[int, float] = {}
            for a in self.acts.values():
                if a["repealed"]:
                    continue
                hay = f"{a['title_en'] or ''} | {a['title_bn'] or ''}".strip()
                for i, p in enumerate(pats):
                    if p.search(hay):
                        weights[a["id"]] = max(0.5, 1.0 - 0.12 * i)  # earlier pattern = more central Act
                        break
            self.topic_acts[t.id] = weights

    # ------------------------------------------------------------------ analysis --
    def analyze(self, query: str) -> Analysis:
        q = norm_query(query)
        scored = sorted(((t.score(q), t) for t in TOPICS), key=lambda x: -x[0])
        scored = [(s, t) for s, t in scored if s > 0]
        topics: list[Topic] = []
        if scored:
            top = scored[0][0]
            topics = [t for s, t in scored[:3] if s >= max(1, top * 0.5)]
        tokens = [t for t in tokenize(query) if t not in GENERIC]
        expand: list[str] = []
        for phrase, to in SYNONYMS.items():
            if norm_query(phrase) in q:
                expand += tokenize(to)
        for t in topics:
            expand += [x for e in t.expand for x in tokenize(e)]
        return Analysis(topics, list(dict.fromkeys(tokens)), list(dict.fromkeys(expand)), "bn" if has_bn(query) else "en")

    # ------------------------------------------------------------------- search --
    def _fts(self, tokens: list[str], act_ids: Optional[set[int]], limit: int) -> list[tuple[int, float]]:
        if not tokens:
            return []
        expr = " OR ".join(f'"{t}"' for t in tokens[:40])
        sql = ("SELECT s.id AS id, bm25(sections_fts, 1.2, 3.0, 1.0) AS r FROM sections_fts "
               "JOIN sections s ON s.id = sections_fts.rowid WHERE sections_fts MATCH ?")
        args: list = [expr]
        if act_ids:
            sql += f" AND s.act_id IN ({','.join(str(i) for i in act_ids)})"
        sql += " ORDER BY r LIMIT ?"
        args.append(limit)
        with self.lock:
            rows = self.db.execute(sql, args).fetchall()
        if not rows:
            return []
        worst = max(-r["r"] for r in rows) or 1.0
        return [(r["id"], -r["r"] / worst) for r in rows]

    @staticmethod
    def _fuse(lexical: dict[int, float], dense: list[tuple[int, float]], w_dense: float = 1.0, k: int = 60) -> dict[int, float]:
        """Weighted reciprocal-rank fusion of the keyword and dense rankings (the notebook's RAG ③), scaled to 0..1."""
        fused: dict[int, float] = {}
        for rank, sid in enumerate(sorted(lexical, key=lambda s: -lexical[s])):
            fused[sid] = fused.get(sid, 0.0) + 1.0 / (k + rank + 1)
        for rank, (sid, _) in enumerate(dense):
            fused[sid] = fused.get(sid, 0.0) + w_dense / (k + rank + 1)
        top = max(fused.values())
        return {sid: v / top for sid, v in fused.items()}

    def search(self, an: Analysis, k: int = 4, dense: Optional[list[tuple[int, float]]] = None) -> list[Hit]:
        cand: dict[int, float] = {}
        for sid, sc in self._fts(an.tokens, None, 80):
            cand[sid] = max(cand.get(sid, 0), sc)
        for i, t in enumerate(an.topics[:2]):
            ids = set(self.topic_acts[t.id])
            toks = list(dict.fromkeys(an.tokens + [x for e in t.expand for x in tokenize(e)]))
            for sid, sc in self._fts(toks, ids, 40):
                cand[sid] = max(cand.get(sid, 0), sc * (1.0 if i == 0 else 0.9))
        if dense:
            cand = self._fuse(cand, dense, DENSE_WEIGHT[an.lang])
        if not cand:
            return []
        ids = list(cand)
        with self.lock:
            rows = self.db.execute(
                f"SELECT * FROM sections WHERE id IN ({','.join(map(str, ids))})").fetchall()
        qset = set(an.tokens)
        penal_q = any(t.id in PENAL_TOPICS for t in an.topics)
        hits: list[Hit] = []
        for r in rows:
            act = self.acts[r["act_id"]]
            text = f"{r['text_bn']} {r['text_en']}"
            if len(text.strip()) < 40:
                continue
            stoks = set(tokenize(f"{r['heading_en']} {r['heading_bn']} {text[:1800]}"))
            title = set(tokenize(f"{act['title_en']} {act['title_bn']}"))
            cover = len(qset & (stoks | title)) / len(qset) if qset else 0.0
            boost = 0.0
            for rank, t in enumerate(an.topics):
                w = self.topic_acts[t.id].get(act["id"])
                if w:
                    boost = max(boost, w * (1.0 if rank == 0 else 0.6))
            htoks = set(tokenize(f"{r['heading_en']} {r['heading_bn']}"))
            hq = set(an.tokens) | set(an.expand)
            head_ov = min(1.0, len(htoks & hq) / 2) if htoks else 0.0
            head = f"{r['heading_en']} {r['heading_bn']}".lower()
            anchor = 0.0
            for t in an.topics[:2]:
                if t.id in HEADS and re.search(HEADS[t.id], head, re.I):
                    anchor = 0.3
                    break
            pen = 0.1 if re.search(r"definition|সংজ্ঞা", head) and not re.search(r"defin|সংজ্ঞা", norm_query(" ".join(an.tokens))) else 0.0
            both = 0.05 if r["text_bn"] and r["text_en"] else 0.0
            penal = 0.08 if (penal_q and re.search(r"imprison|punish|fine\b|কারাদণ্ড|দণ্ড|অর্থদণ্ড", text[:1500], re.I)) else 0.0
            if an.topics:
                s = 0.4 * cand[r["id"]] + 0.25 * boost + 0.15 * cover + 0.3 * head_ov + both + penal + anchor - pen
                if boost == 0 and cover < 0.6:
                    s *= 0.55  # off-topic Act without strong lexical support
                elif act["n_sections"] > 300 and anchor == 0 and cover < 0.7:
                    s *= 0.7  # broad codes (Penal Code ...): prefer sections whose heading matches the topic
            else:
                s = 0.6 * cand[r["id"]] + 0.25 * cover + 0.15 * head_ov + both - pen
            hits.append(Hit(r["id"], r["act_id"], s, r, act))
        hits.sort(key=lambda h: -h.score)
        chosen: list[Hit] = []
        per_act: dict[int, int] = {}
        for h in hits:
            if per_act.get(h.act_id, 0) >= (3 if h.act_id == hits[0].act_id else 2):
                continue
            chosen.append(h)
            per_act[h.act_id] = per_act.get(h.act_id, 0) + 1
            if len(chosen) >= k:
                break
        return chosen

    def direct_lookup(self, question: str) -> Optional[Hit]:
        """Handles the app's own 'explain this section' prompt: '<Act label> · Section N — ...'."""
        m = LABEL_RE.match(question.strip())
        if not m:
            return None
        title, num = m.group(1).strip(), m.group(2).strip().rstrip(".")
        for a in self.acts.values():
            if title in (a["title_en"], a["title_bn"]):
                with self.lock:
                    for cand in {num, num.translate(BN2EN), to_bn_digits(num)}:
                        r = self.db.execute("SELECT * FROM sections WHERE act_id=? AND num=? LIMIT 1", (a["id"], cand)).fetchone()
                        if r:
                            return Hit(r["id"], a["id"], 0.99, r, a)
        return None

    # ---------------------------------------------------------------- citations --
    @staticmethod
    def _cut(text: str, n: int) -> str:
        if len(text) <= n:
            return text
        cut = text[:n]
        sp = max(cut.rfind(" "), cut.rfind("।"), cut.rfind("."))
        return cut[: sp if sp > n * 0.6 else n].rstrip()

    @staticmethod
    def _ell(snippet: str, full: str) -> str:
        """Add an ellipsis when a snippet stops before the end of its text (display only)."""
        s = snippet.rstrip()
        return s if len(s) >= len(full.rstrip()) or s.endswith((".", "।", ")", "—")) else s + " …"

    @staticmethod
    def _best_sentence(text: str, qtoks: set[str]) -> str:
        sents = [s for s in split_sentences(text) if len(s) >= 25] or [text]
        best = max(sents, key=lambda s: (len(qtoks & set(tokenize(s))), -abs(len(s) - 160)))
        return LegalEngine._cut(best, 320)

    def citation(self, h: Hit, qtoks: set[str]) -> dict:
        r, a = h.row, h.act
        num_en = (r["num"] or "").translate(BN2EN)
        is_const = (a["statute_id"] == "constitution-1972") or "constitution" in (a["title_en"] or "").lower()
        word_en, word_bn = ("Article", "অনুচ্ছেদ") if is_const else ("Section", "ধারা")
        t_en = a["title_en"] or a["title_bn"]
        t_bn = a["title_bn"] or a["title_en"]
        label_en = f"{t_en} · {word_en} {num_en}" if num_en else t_en
        label_bn = f"{t_bn} · {word_bn} {to_bn_digits(num_en)}" if num_en else t_bn
        en_ok = r["text_en"] and not (r["en_partial"] and len(r["text_en"]) < 120)
        text_en = self._cut(r["text_en"] if en_ok else (r["text_bn"] or r["text_en"]), 1400)
        text_bn = self._cut(r["text_bn"] or r["text_en"], 1400)
        return {
            "id": f"{a['id']}-{num_en or 'x'}-{r['id']}",
            "statuteId": a["slug"], "statuteSlug": a["slug"],
            "labelBn": label_bn, "labelEn": label_en,
            "section": to_bn_digits(num_en) if num_en else "",
            "textBn": text_bn, "textEn": text_en,
            "matchBn": self._best_sentence(text_bn, qtoks), "matchEn": self._best_sentence(text_en, qtoks),
            "score": round(max(0.05, min(0.95, h.score)), 2),
        }

    # ------------------------------------------------------------------- answer --
    def answer(self, question: str, history: Optional[list[dict]] = None, llm_text: Optional[tuple[str, str]] = None) -> dict:
        direct = self.direct_lookup(question)
        q_for_search = question
        if not direct and history and len(tokenize(question)) < 4:
            prev = [m["text"] for m in history if m.get("role") == "user"]
            if prev:
                q_for_search = f"{prev[-1]} {question}"
        an = self.analyze(q_for_search)
        foreign = not direct and is_foreign_law(question)
        in_scope = not foreign and bool(direct or an.topics or LEGAL_CUES.search(norm_query(q_for_search)))
        if not in_scope:
            hits: list[Hit] = []
        else:
            hits = [direct] if direct else self.search(an, dense=self.dense_hits(q_for_search))
        confident = bool(hits) and (direct is not None or hits[0].score >= MIN_CONFIDENCE or bool(an.topics))
        qtoks = set(an.tokens) | set(an.expand)
        cites = [self.citation(h, qtoks) for h in hits] if confident else []
        cat = next((t.crime for t in an.topics if t.crime), None)
        crime_en, crime_bn = self.crime.sentences(cat) if cat else ("", "")
        body_en, body_bn = self._compose(an, hits if confident else [], cites, crime_en, crime_bn, bool(direct))
        if llm_text and confident:
            body_en, body_bn = llm_text
        domain = self.classify(q_for_search) if in_scope else None
        domain_ok = self.domain_confirmed(domain, hits if cites else [])
        return {
            "message": {
                "id": f"msg-{uuid.uuid4().hex[:12]}", "role": "assistant", "bodyBn": body_bn, "bodyEn": body_en,
                "citations": cites, "createdAt": datetime.now(timezone.utc).isoformat(),
            },
            "topics": [t.id for t in an.topics],
            "domain": domain,
            "domainConfirmed": domain_ok,
            "retrieval": "hybrid" if self._dense() and not direct else "keyword",
        }

    # ------------------------------------------------------------ trained models --
    def _dense(self):
        m = self.models
        return m.dense if m is not None and m.ready.is_set() else None

    def dense_hits(self, query: str, k: int = 60) -> Optional[list[tuple[int, float]]]:
        d = self._dense()
        return d.search(query, k) if d else None

    @staticmethod
    def domain_confirmed(domain: Optional[list[dict]], hits: list[Hit], strong: float = 0.75) -> bool:
        """Show a predicted legal area only if it matches an Act actually cited (labelled with the notebook's
        title rules) or the classifier is very confident — the model was trained on statute text, not questions."""
        if not domain or not hits:
            return False
        top = domain[0]
        cited = {act_domain(f"{h.act['title_en'] or ''} {h.act['title_bn'] or ''}".strip()) for h in hits[:2]}
        return top["labelEn"] in cited or top["confidence"] >= strong

    def classify(self, text: str) -> Optional[list[dict]]:
        m = self.models
        if m is None or not m.ready.is_set() or m.classifier is None:
            return None
        return m.classifier.predict(text)

    def _compose(self, an: Analysis, hits: list[Hit], cites: list[dict], crime_en: str, crime_bn: str, direct: bool) -> tuple[str, str]:
        names_en = " / ".join(t.name_en.lower() for t in an.topics)
        names_bn = " / ".join(t.name_bn for t in an.topics)
        en: list[str] = []
        bn: list[str] = []
        if not hits:
            en.append("I could not find a section in the Bangladesh laws in our database that clearly matches this question. "
                      "Try describing what happened in a few plain words (who, what, when), or name the law if you know it.")
            bn.append("আমাদের ডেটাবেসে থাকা বাংলাদেশের আইনে এই প্রশ্নের সঙ্গে স্পষ্টভাবে মেলে এমন কোনো ধারা পাইনি। "
                      "কী ঘটেছে তা কয়েকটি সহজ কথায় (কে, কী, কখন) লিখে আবার চেষ্টা করুন, অথবা আইনের নাম জানলে সেটি লিখুন।")
        else:
            if direct:
                en.append("Here is the section you asked about, as it appears in the official text in our database.")
                bn.append("আপনি যে ধারাটি জানতে চেয়েছেন, আমাদের ডেটাবেসের অফিসিয়াল পাঠ অনুযায়ী তা নিচে দেওয়া হলো।")
            elif an.topics:
                en.append(f"Your question appears to be about {names_en}. Here is what the Bangladesh laws in our database say, followed by practical next steps.")
                bn.append(f"আপনার প্রশ্নটি মনে হচ্ছে {names_bn} সম্পর্কিত। আমাদের ডেটাবেসে বাংলাদেশের আইন যা বলে তা নিচে দেওয়া হলো, এরপর করণীয় ধাপগুলো আছে।")
            else:
                en.append("Here are the provisions in our database that are most relevant to your question.")
                bn.append("আপনার প্রশ্নের সঙ্গে সবচেয়ে প্রাসঙ্গিক যে ধারাগুলো আমাদের ডেটাবেসে আছে, তা নিচে দেওয়া হলো।")
            en.append("What the law says:")
            bn.append("আইন কী বলে:")
            for i, (h, c) in enumerate(zip(hits, cites), 1):
                head_en = f" ({h.row['heading_en']})" if h.row["heading_en"] else ""
                head_bn = f" ({h.row['heading_bn']})" if h.row["heading_bn"] else ""
                snippet_en = self._ell(c["textEn"] if direct else c["matchEn"], c["textEn"])
                snippet_bn = self._ell(c["textBn"] if direct else c["matchBn"], c["textBn"])
                note_bn = ""
                if not h.row["text_bn"]:
                    note_bn = " (এই আইনের মূল পাঠ ইংরেজিতে)"
                en.append(f"{i}. {c['labelEn']}{head_en}: {snippet_en}")
                bn.append(f"{to_bn_digits(i)}। {c['labelBn']}{head_bn}: {snippet_bn}{note_bn}")
            steps = next((t for t in an.topics if t.steps_en), None)
            if steps and not direct:
                en.append("What you can do next:")
                bn.append("এরপর যা করতে পারেন:")
                en += [f"• {s}" for s in steps.steps_en]
                bn += [f"• {s}" for s in steps.steps_bn]
            if crime_en:
                en.append(crime_en)
                bn.append(crime_bn)
            if an.topics and not direct:
                areas = ", ".join(dict.fromkeys(a for t in an.topics for a in t.areas[:2]))
                en.append(f"The right specialist is a lawyer experienced in: {areas}. You can use Find a Lawyer in the app, or Verify with Lawyer on this answer.")
                bn.append("এ ধরনের বিষয়ে অভিজ্ঞ আইনজীবীই সঠিক বিশেষজ্ঞ। অ্যাপের ‘আইনজীবী খুঁজুন’ ব্যবহার করতে পারেন, অথবা এই উত্তরে ‘আইনজীবীকে দিয়ে যাচাই করান’ চাপুন।")
            if any(h.row["en_mt"] for h in hits):
                en.append("Note: the English wording of Bengali-language laws comes from a machine translation in the source dataset and may be imprecise; the Bengali text is the official version.")
                bn.append("দ্রষ্টব্য: বাংলা ভাষার আইনের ইংরেজি পাঠ উৎস ডেটাসেটের মেশিন অনুবাদ, তাই অসম্পূর্ণ হতে পারে; বাংলা পাঠই অফিসিয়াল।")
        return "\n\n".join(en), "\n\n".join(bn)

    # --------------------------------------------------------- recommendations --
    def recommend(self, query: str) -> dict:
        an = self.analyze(query)
        hits = self.search(an, k=3, dense=self.dense_hits(query))
        qtoks = set(an.tokens) | set(an.expand)
        areas = list(dict.fromkeys(a for t in an.topics for a in t.areas))
        cat = next((t.crime for t in an.topics if t.crime), None)
        return {
            "topics": [{"id": t.id, "nameEn": t.name_en, "nameBn": t.name_bn} for t in an.topics],
            "areaHints": areas,
            "urgent": any(t.urgent for t in an.topics),
            "statutes": [{"labelEn": c["labelEn"], "labelBn": c["labelBn"], "score": c["score"]}
                         for c in (self.citation(h, qtoks) for h in hits)],
            "domain": self.classify(query),
            "crimeCategory": cat,
            "national": self.crime.national(cat) if cat else None,
            "districts": self.crime.district_stats(cat) if cat else {},
        }

    def stats(self) -> dict:
        return {"acts": len(self.acts), "sections": int(self.meta.get("sections", 0)),
                "indexedSections": int(self.meta.get("indexed_sections", 0)), "builtAt": self.meta.get("built_at"),
                "crimeYears": self.crime.full_years, "partialCrimeYears": self.crime.partial_years}
