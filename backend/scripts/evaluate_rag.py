"""Evaluate the deployed assistant on the notebook's curated question set (data/eval/curated_questions.json).

    cd backend
    python -m scripts.evaluate_rag            # prints a table and writes data/models/app_evaluation.json

For every curated question (15 topics x English + Bengali) it runs the real engine used by /chat and checks
whether a gold section (Act + section number) is retrieved. Two configurations are compared:
  keyword  - topic routing + BM25 (SQLite FTS5) + re-ranking (the engine without trained models)
  hybrid   - the same engine fused with multilingual-E5-small dense retrieval (reciprocal-rank fusion)
It also measures out-of-scope rejection (no citations for non-legal or foreign-law questions) and the
accuracy of the trained domain classifier on the questions.
"""
from __future__ import annotations

import json
import math
import time
from datetime import datetime, timezone
from pathlib import Path

from app.rag.engine import LegalEngine
from app.rag.ml import ModelRegistry
from app.rag.textproc import BN2EN

ROOT = Path(__file__).resolve().parents[1]


def norm_num(n: str | None) -> str:
    return str(n or "").translate(BN2EN).lower().strip()


def metrics(ranks: list[int | None]) -> dict:
    n = len(ranks)
    hit = lambda k: sum(1 for r in ranks if r is not None and r <= k) / n  # noqa: E731
    return {"n": n, "Hit@1": hit(1), "Hit@3": hit(3), "Hit@4": hit(4), "Hit@5": hit(5), "Hit@10": hit(10),
            "MRR@10": sum(1 / r for r in ranks if r is not None and r <= 10) / n,
            "nDCG@10": sum(1 / math.log2(r + 1) for r in ranks if r is not None and r <= 10) / n}


def main() -> None:
    ev = json.loads((ROOT / "data/eval/curated_questions.json").read_text())
    engine = LegalEngine(ROOT / "data/legal_corpus.db")
    reg = ModelRegistry(ROOT / "data/models")
    reg._load()  # synchronous for the script
    engine.models = reg
    qs = [(q, lang) for q in ev["in_corpus"] for lang in ("en", "bn")]

    out: dict = {"generatedAt": datetime.now(timezone.utc).isoformat(), "questions": len(qs),
                 "models": reg.status(), "retrieval": {}, "perQuestion": []}
    per: dict[str, dict] = {}
    for mode in ("keyword", "hybrid"):
        if mode == "hybrid" and not reg.dense:
            continue
        ranks, ranks_by_lang, ms = [], {"en": [], "bn": []}, []
        for q, lang in qs:
            text = q[lang]
            gold = {(g["act"], norm_num(s)) for g in q["gold"] for s in g["sections"]}
            t0 = time.perf_counter()
            an = engine.analyze(text)
            hits = engine.search(an, k=10, dense=engine.dense_hits(text) if mode == "hybrid" else None)
            ms.append((time.perf_counter() - t0) * 1000)
            rank = next((i for i, h in enumerate(hits, 1) if (h.act_id, norm_num(h.row["num"])) in gold), None)
            ranks.append(rank)
            ranks_by_lang[lang].append(rank)
            top = hits[0] if hits else None
            per.setdefault(f"{q['id']}/{lang}", {"id": q["id"], "lang": lang, "question": text})[mode] = {
                "rank": rank, "top": f"{top.act['title_en'] or top.act['title_bn']} · {norm_num(top.row['num'])}" if top else None}
        out["retrieval"][mode] = {"all": metrics(ranks), "en": metrics(ranks_by_lang["en"]), "bn": metrics(ranks_by_lang["bn"]),
                                  "msPerQuery": sum(ms) / len(ms)}

    # out-of-scope rejection: the full /chat answer path must return no citations
    ooc = [(q, lang) for q in ev["out_of_corpus"] for lang in ("en", "bn")]
    rejected = sum(1 for q, lang in ooc if not engine.answer(q[lang])["message"]["citations"])
    out["outOfScope"] = {"questions": len(ooc), "rejected": rejected, "rate": rejected / len(ooc)}

    # domain classifier on user questions (gold = the domain of the gold Act, by the notebook's labelling rules)
    if reg.classifier:
        ok1 = ok3 = shown = shown_ok = 0
        for q, lang in qs:
            pred = reg.classifier.predict(q[lang], top=3)
            ok1 += pred[0]["labelEn"] == q["domain"]
            ok3 += any(p["labelEn"] == q["domain"] for p in pred)
            r = engine.answer(q[lang])  # the chat path: is the label displayed, and is it right?
            if r["domainConfirmed"]:
                shown += 1
                shown_ok += r["domain"][0]["labelEn"] == q["domain"]
        out["domainOnQuestions"] = {"questions": len(qs), "top1": ok1 / len(qs), "top3": ok3 / len(qs),
                                    "shown": shown, "shownCorrect": shown_ok,
                                    "precisionWhenShown": shown_ok / shown if shown else None}

    out["perQuestion"] = list(per.values())
    dest = ROOT / "data/models/app_evaluation.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1))

    print(f"Curated questions: {len(qs)} ({len(ev['in_corpus'])} topics x EN/BN)")
    print(f"{'mode':8} {'lang':4} {'Hit@1':>6} {'Hit@3':>6} {'Hit@5':>6} {'Hit@10':>6} {'MRR@10':>7} {'ms/q':>6}")
    for mode, r in out["retrieval"].items():
        for lang in ("all", "en", "bn"):
            m = r[lang]
            print(f"{mode:8} {lang:4} {m['Hit@1']:6.2f} {m['Hit@3']:6.2f} {m['Hit@5']:6.2f} {m['Hit@10']:6.2f} {m['MRR@10']:7.3f} "
                  f"{r['msPerQuery'] if lang == 'all' else 0:6.0f}")
    print(f"out-of-scope rejected: {rejected}/{len(ooc)}")
    if "domainOnQuestions" in out:
        d = out["domainOnQuestions"]
        print(f"domain classifier on questions: top-1 {d['top1']:.2f}, top-3 {d['top3']:.2f}; "
              f"label shown on {d['shown']}/{d['questions']} answers, correct {d['shownCorrect']}/{d['shown']}")
    print(f"wrote {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
