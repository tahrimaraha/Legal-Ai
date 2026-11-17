# Corpus data

`legal_corpus.db` is the prebuilt, read-only search index the AI assistant loads at start-up
(35,265 sections from 1,286 Acts + police-recorded crime statistics). It is built from your datasets by:

    cd backend
    python -m scripts.build_corpus --raw data/raw

Put the original dataset files in `data/raw/` (zips or extracted both work):
`acts_1_.zip`, `bd-law-dataset-main.zip`, `bd_laws_translated_05022022_csv.zip`, `bdlaws_ds_formatted_csv.zip`,
`filtered_act_list.csv`, `BD_Crime_Statistics_2010-2019.xls`, `bangladesh-crime-rate-statistics.xls`.
Rebuild whenever you add or replace datasets; the API picks up the new file on the next start.

## Trained models (`data/models/`)

Exported from the training notebook (`../model/legal-ai-output-notebook.ipynb`) by `python -m scripts.export_models`:
`domain_classifier.joblib` (legal-area classifier), `section_embeddings.npy` + `section_ids.json` (E5 vectors for hybrid
search) and `model_report.json` (benchmark tables). `python -m scripts.evaluate_rag` writes `app_evaluation.json`.
They need `pip install -r requirements-ml.txt`; without them the assistant falls back to keyword search.
If you rebuild the corpus, re-run the notebook's embedding step — `export_models` refuses misaligned embeddings.
