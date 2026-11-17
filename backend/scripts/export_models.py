"""Package the trained notebook outputs (model/outputs) into the compact files the API loads.

    cd backend
    python -m scripts.export_models                       # reads ../model/outputs
    python -m scripts.export_models --outputs /path/to/outputs

Writes to data/models/:
  domain_classifier.joblib  TF-IDF (word + char) vectorisers + tuned Logistic Regression, 11 legal domains
  section_embeddings.npy    multilingual-E5-small passage vectors (float16, L2-normalised), one row per section
  section_ids.json          the corpus section id of every embedding row (keeps rows aligned with the database)
  model_report.json         benchmark tables from the notebook (classification, retrieval, generation, zero-shot)

The section order is rebuilt exactly as the notebook did (in-force Acts, text >= 60 chars) and checked against
the embedding count, so a different corpus build can never be silently misaligned.
"""
from __future__ import annotations

import argparse
import csv
import json
import sqlite3
from pathlib import Path

import joblib
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


def notebook_doc_order(db_path: Path) -> list[int]:
    """Section ids in the order the notebook embedded them (cell 'RAG · docs')."""
    db = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    rows = db.execute(
        "SELECT s.id, s.text_en, s.text_bn FROM sections s JOIN acts a ON a.id = s.act_id WHERE a.repealed = 0"
    ).fetchall()
    ids = []
    for sid, te, tb in rows:
        te, tb = te or "", tb or ""
        if len(te) + len(tb) == 0:
            continue
        if len(tb if tb else te) < 60:
            continue
        ids.append(sid)
    return ids


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        out = []
        for row in csv.DictReader(f):
            clean = {}
            for k, v in row.items():
                if v in ("", None):
                    clean[k] = None
                    continue
                try:
                    clean[k] = float(v)
                except ValueError:
                    clean[k] = v
            out.append(clean)
        return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--outputs", default=str(ROOT.parent / "model" / "outputs"))
    ap.add_argument("--db", default=str(ROOT / "data" / "legal_corpus.db"))
    ap.add_argument("--dest", default=str(ROOT / "data" / "models"))
    a = ap.parse_args()
    out, art, dest = Path(a.outputs), Path(a.outputs) / "artifacts", Path(a.dest)
    dest.mkdir(parents=True, exist_ok=True)

    # 1) domain classifier ------------------------------------------------------------------------
    vec = joblib.load(art / "vectorisers.joblib")
    lr = joblib.load(art / "logreg.joblib")
    for v in (vec["vec_w"], vec["vec_c"]):
        v.stop_words_ = None  # pruned-term set kept only for introspection; not used by transform()
    bundle = {"vec_w": vec["vec_w"], "vec_c": vec["vec_c"], "model": lr, "classes": list(vec["classes"]),
              "name": "Logistic Regression (word + char TF-IDF)"}
    joblib.dump(bundle, dest / "domain_classifier.joblib", compress=3)
    print(f"domain_classifier.joblib  {(dest / 'domain_classifier.joblib').stat().st_size / 1e6:.1f} MB")

    # 2) dense retrieval index --------------------------------------------------------------------
    emb_path = art / "section_embeddings.npy"
    if not emb_path.exists():
        emb_path = out / "e5_docs.npy"
    E = np.load(emb_path).astype("float16")
    ids = notebook_doc_order(Path(a.db))
    if len(ids) != E.shape[0]:
        raise SystemExit(f"Embedding rows ({E.shape[0]}) != corpus sections ({len(ids)}). Re-run the notebook on this corpus.")
    np.save(dest / "section_embeddings.npy", E)
    (dest / "section_ids.json").write_text(json.dumps(ids))
    print(f"section_embeddings.npy    {E.shape[0]:,} x {E.shape[1]}  ({(dest / 'section_embeddings.npy').stat().st_size / 1e6:.1f} MB)")

    # 3) benchmark report -------------------------------------------------------------------------
    report = {
        "source": "model/legal-ai-output-notebook.ipynb",
        "classification": read_csv(out / "results_classification.csv"),
        "zeroShot": read_csv(out / "results_llm_zero_shot_subset.csv"),
        "retrieval": read_csv(out / "results_rag_retrieval.csv"),
        "generation": read_csv(out / "results_rag_generation.csv"),
        "classes": bundle["classes"],
    }
    (dest / "model_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(f"model_report.json         {len(report['classification'])} classifiers, {len(report['retrieval'])} retrieval rows")


if __name__ == "__main__":
    main()
