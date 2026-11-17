# Legal AI — model training & evaluation

`legal-ai-output-notebook.ipynb` trains, tunes, ensembles and evaluates the project's NLP models on the
Bangladesh-law corpus and benchmarks four RAG retrieval architectures (run on Kaggle/Colab with a GPU).

| What | Where |
|---|---|
| Training notebook (with outputs) | `legal-ai-output-notebook.ipynb` |
| Input: law corpus (35,265 sections, 1,286 Acts) | `../backend/data/legal_corpus.db` (same file the API uses) |
| Input: crime statistics | `BD_Crime_Statistics_2010-2019.xls`, `bangladesh-crime-rate-statistics.xls` (CSV text; copies in `../backend/data/raw/`) |
| Results tables | `outputs/results_*.csv` |
| Figures | `outputs/figures/*.png` (a selection is shown on the website at `/ai-model`) |
| Trained model files (large, not in Git) | `outputs/artifacts/` — from `legal_ai_outputs.zip` |

## Models in the notebook

* **Classification** (11 legal domains, split by Act): Logistic Regression, Linear SVM, Complement NB, Random Forest,
  XGBoost, TextCNN, BiLSTM-Attention, XLM-RoBERTa (fine-tuned), multilingual-E5 + LR head, 3 ensembles;
  Qwen2.5-1.5B zero-shot for comparison.
* **RAG retrieval**: ① BM25 · ② multilingual-E5-small dense · ③ hybrid reciprocal-rank fusion · ④ hybrid + LLM re-rank.
* **Generation**: Qwen2.5-1.5B with and without retrieval.

## What the website uses

| Notebook output | Used for | Runtime file |
|---|---|---|
| Logistic Regression + TF-IDF vectorisers | "Legal area" shown on every chat answer, and in lawyer recommendations | `backend/data/models/domain_classifier.joblib` |
| E5 section embeddings (`section_embeddings.npy`) | Hybrid retrieval (BM25 + dense, rank fusion) in `/chat` | `backend/data/models/section_embeddings.npy` + `section_ids.json` |
| `results_*.csv` | The `/ai-model` page | `backend/data/models/model_report.json` |

XLM-RoBERTa and the ensembles score higher but their weights were not exported (278M parameters, GPU-sized), so the
site runs the fast CPU model. The exported classifier reproduces the notebook exactly: accuracy 0.6250, macro-F1 0.4958
on the notebook's test split.

## Regenerate the runtime files

```bash
# 1) unzip legal_ai_outputs.zip here so that model/outputs/artifacts/ exists
cd backend
pip install -r requirements-ml.txt
python -m scripts.export_models      # -> data/models/ (classifier, embeddings, report)
python -m scripts.evaluate_rag       # -> data/models/app_evaluation.json (accuracy of the deployed assistant)
```

`evaluate_rag` runs the real `/chat` engine on the notebook's curated questions
(`backend/data/eval/curated_questions.json`, 15 topics × English + Bengali) and compares keyword-only vs hybrid
retrieval, out-of-scope rejection, and classifier accuracy on questions.
