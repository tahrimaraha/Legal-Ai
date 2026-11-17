"""Build the Legal AI corpus (SQLite + FTS5) from the uploaded Bangladesh-law and crime datasets.

Usage (from the `backend/` folder):

    python -m scripts.build_corpus --raw data/raw            # folder holding the dataset files / zips
    python -m scripts.build_corpus --raw /path/to/uploads --out data/legal_corpus.db

`--raw` may contain either the original zip files or their extracted contents:
    acts_1_.zip                         official Acts (JSON, 1,484 files, Bengali + English, 2025)
    bd-law-dataset-main.zip             6 core Acts as clean structured JSON (Penal Code, CrPC, ...)
    bd_laws_translated_05022022_csv.zip section headings + English (machine) translation of Bengali laws
    bdlaws_ds_formatted_csv.zip         section headings + Bengali original text (row-aligned with the above)
    filtered_act_list.csv               act metadata incl. the is_repealed flag
    BD_Crime_Statistics_2010-2019.xls   police-recorded cases by unit and category (actually a CSV)
    bangladesh-crime-rate-statistics.xls  homicide-style rate per 100k (actually a CSV)

The result is one ~read-only SQLite file that the API loads at start-up. No external services needed.
"""
from __future__ import annotations

import argparse
import csv
import glob
import io
import json
import os
import re
import sqlite3
import sys
import time
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Iterator, Optional

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.rag.textproc import (  # noqa: E402
    BN2EN,
    bn_ratio,
    clean_text,
    has_bn,
    is_repeal_stub,
    tokenize,
)

csv.field_size_limit(10**9)
MAX_TEXT = 8000
MAX_TOKENS = 1500

SCHEMA = """
PRAGMA journal_mode=OFF;
CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE acts(
  id INTEGER PRIMARY KEY, slug TEXT, title_en TEXT, title_bn TEXT, year INTEGER, act_no TEXT,
  lang TEXT, repealed INTEGER, source TEXT, url TEXT, n_sections INTEGER, statute_id TEXT
);
CREATE TABLE sections(
  id INTEGER PRIMARY KEY, act_id INTEGER, num TEXT, num_sort INTEGER,
  heading_en TEXT, heading_bn TEXT, text_bn TEXT, text_en TEXT, en_mt INTEGER, en_partial INTEGER
);
CREATE INDEX ix_sections_act ON sections(act_id, num_sort);
CREATE VIRTUAL TABLE sections_fts USING fts5(t, h, b, content='', tokenize="porter unicode61");
CREATE TABLE crime_unit(year INTEGER, unit TEXT, category TEXT, cases INTEGER);
CREATE INDEX ix_crime ON crime_unit(category, unit, year);
CREATE TABLE crime_rate(year INTEGER, per100k REAL, pct_change REAL);
"""

# ------------------------------------------------------------------ dataset access (dir or zip) --


class Raw:
    def __init__(self, root: str):
        self.root = Path(root)

    def _find(self, *names: str) -> Optional[Path]:
        for n in names:
            for p in (self.root / n, *self.root.rglob(n)):
                if p.exists():
                    return p
        return None

    def text_stream(self, csv_name: str, zip_name: str) -> Optional[io.TextIOBase]:
        p = self._find(csv_name)
        if p:
            return open(p, encoding="utf-8-sig", newline="")
        z = self._find(zip_name)
        if z:
            zf = zipfile.ZipFile(z)
            member = next(m for m in zf.namelist() if m.endswith(csv_name))
            return io.TextIOWrapper(zf.open(member), encoding="utf-8-sig", newline="")
        return None

    def acts_json(self) -> Iterator[tuple[int, dict]]:
        d = self._find("acts")
        files = sorted(glob.glob(str(d / "act-print-*.json"))) if d and d.is_dir() else []
        if files:
            for f in files:
                yield int(re.findall(r"(\d+)", os.path.basename(f))[-1]), json.load(open(f, encoding="utf-8"))
            return
        z = self._find("acts_1_.zip", "acts.zip")
        if z:
            zf = zipfile.ZipFile(z)
            for m in zf.namelist():
                if m.endswith(".json") and "act-print-" in m:
                    yield int(re.findall(r"(\d+)", os.path.basename(m))[-1]), json.load(zf.open(m))

    def core_json(self) -> dict[str, list]:
        out: dict[str, list] = {}
        d = self._find("bd-law-dataset-main")
        if d and d.is_dir():
            for f in glob.glob(str(d / "json" / "*.json")):
                out[Path(f).stem] = json.load(open(f, encoding="utf-8"))
            return out
        z = self._find("bd-law-dataset-main.zip")
        if z:
            zf = zipfile.ZipFile(z)
            for m in zf.namelist():
                if m.endswith(".json"):
                    out[Path(m).stem] = json.load(zf.open(m))
        return out


# --------------------------------------------------------------------------------- helpers --

_PRE = r"^\s*(?:\d{1,3}\[\s*)?"  # optional footnote marker such as "5[" in front of the number
_SEP = r"(?:[।৷.\u2013\u2014\-:)]|\t|\s(?=\S))"  # danda (U+0964), Bengali danda variant (U+09F7), dot, dash...
_EN_NUM = re.compile(_PRE + r"(\d{1,4}[A-Za-z]{0,3})\s*" + _SEP)
_BN_NUM = re.compile(_PRE + r"([০-৯]{1,4}[ক-হ]{0,3})\s*" + _SEP)


def parse_num(text: str) -> Optional[str]:
    m = _BN_NUM.match(text or "") or _EN_NUM.match(text or "")
    return m.group(1) if m else None


def ascii_num(num: str) -> str:
    return (num or "").translate(BN2EN).lower()


def num_sort(num: str) -> int:
    m = re.match(r"\d+", ascii_num(num))
    return int(m.group()) if m else 0


def strip_num(text: str) -> str:
    return re.sub(
        r"^\s*(?:\d{1,3}\[\s*)?(?:[০-৯]{1,4}[ক-হ]{0,3}|\d{1,4}[A-Za-z]{0,3})\s*(?:[।৷.\u2013\u2014\-:]|\t)?\s*",
        "", text or "", count=1,
    )


def clean_title(t: str) -> str:
    t = re.sub(r"^\s*\d+(?=[^\d\s])", "", t or "")
    t = re.sub(r"\s+", " ", t.replace("\t", " ")).strip()
    return t


def norm_title(t: str) -> str:
    t = clean_title(t).lower()
    t = re.sub(r"^the\s+", "", t)
    return re.sub(r"[^a-z0-9\u0980-\u09FF]+", "", t)


def year_of(*vals) -> Optional[int]:
    for v in vals:
        m = re.search(r"(1[6-9]\d\d|20\d\d)", str(v or "").translate(BN2EN))
        if m:
            return int(m.group(1))
    return None


def group_items(items: list[dict]) -> list[dict]:
    """The official JSON stores one *paragraph* per item; regroup paragraphs into numbered sections."""
    secs: list[dict] = []
    last = -1
    for it in items:
        content = (it.get("section_content") or "").strip()
        title = (it.get("section_title") or "").strip()
        if not content:
            continue
        num = parse_num(content)
        take = False
        if num is not None:
            n = num_sort(num)
            if (not secs and n <= 3) or (secs and last <= n <= last + 60):
                take = True
        if take:
            last = num_sort(num)
            heading = title if title and not title.isupper() else ""
            secs.append({"num": num, "heading": heading, "text": content})
        elif secs:
            secs[-1]["text"] += "\n" + content
            if title and not secs[-1]["heading"] and not title.isupper():
                secs[-1]["heading"] = title
        else:
            secs.append({"num": "", "heading": title if title and not title.isupper() else "", "text": content})
    return secs


STATUTE_IDS = [
    (r"^constitution of the people|^গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান", "constitution-1972"),
    (r"^penal code, 1860", "penal-code-1860"),
    (r"domestic violence \(prevention|পারিবারিক সহিংসতা \(প্রতিরোধ", "domestic-violence-2010"),
    (r"^dowry prohibition act, 2018|যৌতুক নিরোধ আইন, ২০১৮", "dowry-prohibition-2018"),
    (r"consumer rights protection act, 2009|ভোক্তা অধিকার সংরক্ষণ আইন, ২০০৯", "consumer-rights-2009"),
    (r"সাইবার সুরক্ষা অধ্যাদেশ, ২০২৫|cyber security ordinance, 2025", "cyber-ordinance-2025"),
    (r"house rent control act, 1991", "rent-control-1991"),
    (r"^evidence act, 1872", "evidence-act-1872"),
    (r"family courts ordinance, 1985", "family-courts-1985"),
    (r"শ্রম আইন, ২০০৬|^bangladesh labour act, 2006", "labour-act-2006"),
    (r"^succession act, 1925", "succession-laws"),
    (r"^registration act, 1908", "land-registration-act"),
]


# A few Bengali-origin Acts whose English title in the CSV is a gazette date or a fragment.
EN_TITLE_FIX = {
    856: "Vested Property Restitution Act, 2001",
    1126: "Persons with Disabilities Rights and Protection Act, 2013",
    1151: "Deoxyribonucleic Acid (DNA) Act, 2014",
    1193: "Railway Property (Recovery of Illegal Possession) Act, 2016",
    1276: "Narcotics Control Act, 2018",
    1355: "Narcotics Control (Amendment) Act, 2020",
    1444: "Family Courts Act, 2023",
    1524: "Women and Children Repression Prevention (Amendment) Ordinance, 2025",
    1538: "Cyber Security Ordinance, 2025",
}


def good_en_title(t: str) -> bool:
    return bool(
        t
        and len(t) >= 12
        and re.search(r"\b(Act|Ordinance|Order|Constitution|Regulation|Law)\b", t, re.I)
        and not t[:1].islower()
        and not re.match(r"^\d|^[A-Z][a-z]+ \d", t)
    )


def statute_id_for(title_en: str, title_bn: str) -> Optional[str]:
    hay = f"{clean_title(title_en).lower()}|{clean_title(title_bn)}"
    for pat, sid in STATUTE_IDS:
        for part in hay.split("|"):
            if re.search(pat, part.strip()):
                return sid
    return None


# ------------------------------------------------------------------------------------ main --


def build(raw_dir: str, out_path: str) -> None:
    t0 = time.time()
    raw = Raw(raw_dir)

    # 1) CSV pair (row-aligned): English MT + Bengali original ---------------------------------
    s_en = raw.text_stream("bd_laws_translated_05022022.csv", "bd_laws_translated_05022022_csv.zip")
    s_bn = raw.text_stream("bdlaws_ds_formatted.csv", "bdlaws_ds_formatted_csv.zip")
    csv_acts: dict[int, dict] = {}
    if s_en and s_bn:
        for a, b in zip(csv.DictReader(s_en), csv.DictReader(s_bn)):
            try:
                uid = int(float(a["url_id"]))
            except (ValueError, TypeError):
                continue
            g = csv_acts.setdefault(
                uid,
                {"title_en": a["law_title"], "title_bn": b["law_title"], "orig": a["original_language"], "rows": []},
            )
            g["rows"].append(
                {
                    "name_en": (a["section_name"] or "").strip(),
                    "desc_en": (a["section_description"] or "").strip(),
                    "name_bn": (b["section_name"] or "").strip(),
                    "desc_bn": (b["section_description"] or "").strip(),
                }
            )
    print(f"csv acts: {len(csv_acts)}")

    # 2) metadata list ------------------------------------------------------------------------
    repealed_by_id: dict[int, bool] = {}
    meta_csv = raw._find("filtered_act_list.csv")
    if meta_csv:
        with open(meta_csv, encoding="utf-8-sig", newline="") as fh:
            for r in csv.DictReader(fh):
                m = re.search(r"act-(?:print-)?(\d+)", r.get("Act Link", "") or r.get("full_text", ""))
                if m:
                    repealed_by_id[int(m.group(1))] = str(r.get("is_repealed")).lower() == "true"

    # 3) core JSON (clean English structure) ---------------------------------------------------
    core_by_title: dict[str, list] = {}
    for stem, rows in raw.core_json().items():
        if rows:
            core_by_title[norm_title(rows[0].get("law_name_en", stem))] = rows

    acts_json = {uid: d for uid, d in raw.acts_json()}
    print(f"acts json: {len(acts_json)}  core json: {len(core_by_title)}")

    if os.path.exists(out_path):
        os.remove(out_path)
    db = sqlite3.connect(out_path)
    db.executescript(SCHEMA)

    all_ids = sorted(set(acts_json) | set(csv_acts))
    sec_id = 0
    n_sections_total = 0
    used_core = 0
    for uid in all_ids:
        jd = acts_json.get(uid)
        ca = csv_acts.get(uid)

        title_src = clean_title(jd["act_title"]) if jd else ""
        title_bn_csv = clean_title(ca["title_bn"]) if ca else ""
        title_en_csv = clean_title(ca["title_en"]) if ca else ""
        lang = None
        if jd:
            lang = "bn" if jd.get("language") == "bengali" or bn_ratio(title_src) > 0.5 else "en"
        elif ca:
            lang = "bn" if ca["orig"] == "bn" or has_bn(title_bn_csv) else "en"
        title_bn = (title_bn_csv if has_bn(title_bn_csv) else (title_src if has_bn(title_src) else ""))
        title_en = ""
        for cand in (title_en_csv, title_src):
            if cand and not has_bn(cand):
                title_en = cand
                break
        if uid in EN_TITLE_FIX:
            title_en = EN_TITLE_FIX[uid]
        elif lang == "bn" and not good_en_title(title_en):
            title_en = ""  # junk CSV title: the UI falls back to the Bengali title
        if not title_en and not title_bn:
            continue
        year = year_of(jd and jd.get("act_year"), title_bn, title_en, jd and jd.get("csv_metadata", {}).get("act_year_from_csv"))
        if title_en and year:
            title_en = re.sub(r"\b(1[6-9]\d\d|20\d\d)\b(?!.*\b(1[6-9]\d\d|20\d\d)\b)", str(year), title_en)
        repealed = int(
            repealed_by_id.get(uid, bool(jd and jd.get("csv_metadata", {}).get("is_repealed")))
        )

        # --- English overlay: number -> (heading, text, machine_translated, partial)
        en_map: dict[str, tuple[str, str, int, int]] = {}
        csv_by_num: dict[str, dict] = {}
        if ca:
            for r in ca["rows"]:
                num = parse_num(r["desc_bn"]) or parse_num(r["desc_en"])
                if num is None:
                    continue
                k = ascii_num(num)
                if k not in csv_by_num or len(r["desc_en"]) > len(csv_by_num[k]["desc_en"]):
                    csv_by_num[k] = r
        core_rows = core_by_title.get(norm_title(title_en)) if title_en else None
        if core_rows is None and uid == 957:
            core_rows = next((v for k, v in core_by_title.items() if "constitution" in k), None)

        sections: list[dict] = []
        source = "acts-json" if jd else "csv"
        if jd:
            grouped = group_items(jd.get("sections", []))
        else:
            grouped = []
            for r in ca["rows"]:
                body = r["desc_bn"] if lang == "bn" else r["desc_en"]
                grouped.append({"num": parse_num(body) or "", "heading": r["name_bn"] if lang == "bn" else r["name_en"], "text": body})

        if core_rows and lang == "en":
            used_core += 1
            source = "core-json"
            grouped = [
                {"num": str(r.get("section_no_en", "")).strip(), "heading": r.get("section_name_en", ""), "text": r.get("content", "")}
                for r in core_rows
            ]
        if core_rows:
            for r in core_rows:
                en_map[ascii_num(str(r.get("section_no_en", "")))] = (
                    r.get("section_name_en", ""), strip_num(r.get("content", "")), 0, 0,
                )

        for g in grouped:
            num = g["num"]
            body_raw = g["text"]
            text = clean_text(strip_num(body_raw) if num else body_raw).lstrip(". ")
            if len(text) < 12:
                continue
            stub = is_repeal_stub(text)
            h_main = clean_text(g.get("heading", ""))
            h_en = h_bn = ""
            t_en = t_bn = ""
            mt = partial = 0
            k = ascii_num(num)
            row = csv_by_num.get(k)
            if lang == "bn":
                t_bn = text
                h_bn = h_main or (clean_text(row["name_bn"]) if row else "")
                if k in en_map:
                    h_en, t_en, mt, partial = en_map[k]
                elif row and row["desc_en"] and not has_bn(strip_num(row["desc_en"])):
                    t_en = clean_text(strip_num(row["desc_en"]))
                    h_en = clean_text(row["name_en"])
                    mt = 1
                    partial = int(len(t_en) < 0.35 * len(t_bn) and len(t_bn) > 150)
                elif row:
                    h_en = clean_text(row["name_en"])
            else:
                t_en = text
                h_en = h_main or (clean_text(row["name_en"]) if row else "")
                if row and has_bn(row["desc_bn"]):
                    h_bn = clean_text(row["name_bn"]) if has_bn(row["name_bn"]) else ""
            sections.append(
                {
                    "num": num, "h_en": h_en[:300], "h_bn": h_bn[:300], "t_en": t_en[:MAX_TEXT], "t_bn": t_bn[:MAX_TEXT],
                    "mt": mt, "partial": partial, "stub": stub,
                }
            )

        if not sections:
            continue
        sid = statute_id_for(title_en, title_bn) or ("constitution-1972" if uid == 367 else None)
        slug = sid or f"act-{uid}"
        db.execute(
            "INSERT INTO acts VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                uid, slug, title_en, title_bn, year, (jd or {}).get("act_no"), lang, repealed, source,
                (jd or {}).get("source_url") or f"http://bdlaws.minlaw.gov.bd/act-{uid}.html", len(sections), sid,
            ),
        )
        ttoks = " ".join(tokenize(f"{title_en} {title_bn}"))
        for s in sections:
            sec_id += 1
            db.execute(
                "INSERT INTO sections VALUES(?,?,?,?,?,?,?,?,?,?)",
                (sec_id, uid, s["num"], num_sort(s["num"]), s["h_en"], s["h_bn"], s["t_bn"], s["t_en"], s["mt"], s["partial"]),
            )
            if s["stub"] or repealed:
                continue  # stored (for completeness) but never retrieved
            body = tokenize(f"{s['t_bn']} {s['t_en']}")[:MAX_TOKENS]
            db.execute(
                "INSERT INTO sections_fts(rowid,t,h,b) VALUES(?,?,?,?)",
                (sec_id, ttoks, " ".join(tokenize(f"{s['h_en']} {s['h_bn']}")), " ".join(body)),
            )
        n_sections_total += len(sections)
    print(f"acts written, sections={n_sections_total}, core-json acts used={used_core}")

    # 4) crime statistics ---------------------------------------------------------------------
    cs = raw._find("BD_Crime_Statistics_2010-2019.xls", "BD_Crime_Statistics_2010-2019.csv")
    if cs:
        with open(cs, encoding="utf-8-sig", newline="") as fh:
            rd = csv.DictReader(fh)
            for r in rd:
                y = int(r["Year"])
                unit = r["Unit Name"].strip()
                for col, val in r.items():
                    if col in ("Year", "Unit Name") or val in (None, ""):
                        continue
                    db.execute("INSERT INTO crime_unit VALUES(?,?,?,?)", (y, unit, col.strip(), int(float(val))))
    cr = raw._find("bangladesh-crime-rate-statistics.xls", "bangladesh-crime-rate-statistics.csv")
    if cr:
        with open(cr, encoding="utf-8-sig", newline="") as fh:
            for r in csv.reader(fh):
                m = re.match(r"\d+/\d+/(\d{4})", (r[0] if r else "").strip())
                if m and len(r) >= 2:
                    pc = float(r[2]) if len(r) > 2 and r[2].strip() else None
                    db.execute("INSERT INTO crime_rate VALUES(?,?,?)", (int(m.group(1)), float(r[1]), pc))

    meta = {
        "built_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "acts": str(db.execute("SELECT COUNT(*) FROM acts").fetchone()[0]),
        "sections": str(n_sections_total),
        "indexed_sections": str(db.execute("SELECT COUNT(*) FROM sections_fts").fetchone()[0]),
        "crime_note": "BD_Crime_Statistics covers 2010-2019; 2019 holds only a fraction of a normal year (partial) and is excluded from trends.",
    }
    db.executemany("INSERT INTO meta VALUES(?,?)", meta.items())
    db.commit()
    db.execute("INSERT INTO sections_fts(sections_fts) VALUES('optimize')")
    db.commit()
    db.execute("VACUUM")
    db.close()
    mb = os.path.getsize(out_path) / 1e6
    print(f"done in {time.time() - t0:.0f}s -> {out_path} ({mb:.1f} MB)  {meta}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="data/raw", help="folder with the dataset files (zips or extracted)")
    ap.add_argument("--out", default="data/legal_corpus.db")
    a = ap.parse_args()
    build(a.raw, a.out)
