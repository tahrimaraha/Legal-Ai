"""Crime-statistics context built from the two uploaded crime datasets (never invented numbers)."""
from __future__ import annotations

import sqlite3
import threading
from statistics import median
from typing import Optional

from app.rag.lexicon import CRIME_LABELS, DISTRICT_UNITS
from app.rag.textproc import to_bn_digits


class CrimeStats:
    def __init__(self, conn: sqlite3.Connection, lock: threading.Lock):
        self.db, self.lock = conn, lock
        with lock:
            totals = dict(self.db.execute(
                "SELECT year, cases FROM crime_unit WHERE unit='Total' AND category='Total Cases'").fetchall())
        med = median(totals.values()) if totals else 0
        # a year far below the typical level is an incomplete year (the 2019 file holds only a fraction)
        self.full_years = sorted(y for y, v in totals.items() if v >= 0.5 * med)
        self.partial_years = sorted(y for y in totals if y not in self.full_years)

    def national(self, category: str) -> Optional[dict]:
        with self.lock:
            rows = dict(self.db.execute(
                "SELECT year, cases FROM crime_unit WHERE unit='Total' AND category=?", (category,)).fetchall())
        ys = [y for y in self.full_years if y in rows]
        if len(ys) < 2:
            return None
        first, last = ys[0], ys[-1]
        peak = max(ys, key=lambda y: rows[y])
        pct = (rows[last] - rows[first]) / rows[first] * 100 if rows[first] else 0.0
        return {"category": category, "firstYear": first, "lastYear": last, "first": rows[first], "last": rows[last],
                "pctChange": round(pct, 1), "peakYear": peak, "peak": rows[peak]}

    def unit_cases(self, unit: str, category: str) -> Optional[dict]:
        if not self.full_years:
            return None
        y = self.full_years[-1]
        with self.lock:
            r = self.db.execute("SELECT cases FROM crime_unit WHERE unit=? AND category=? AND year=?",
                                (unit, category, y)).fetchone()
        return {"unit": unit, "year": y, "cases": r[0]} if r else None

    def district_stats(self, category: str) -> dict:
        out = {}
        for district in ("dhaka", "chattogram", "khulna", "rajshahi", "barishal", "sylhet", "rangpur", "mymensingh"):
            s = self.unit_cases(DISTRICT_UNITS[district], category)
            if s:
                out[district] = s
        return out

    def rate(self) -> Optional[dict]:
        with self.lock:
            rows = self.db.execute("SELECT year, per100k FROM crime_rate ORDER BY year").fetchall()
        return {"firstYear": rows[0][0], "first": rows[0][1], "lastYear": rows[-1][0], "last": rows[-1][1]} if rows else None

    def sentences(self, category: str) -> tuple[str, str]:
        """(English, Bengali) one-paragraph context, or ('','') when the dataset has nothing."""
        n = self.national(category)
        if not n:
            return "", ""
        en_l, bn_l = CRIME_LABELS.get(category, (category.lower(), category))
        d = lambda x: f"{x:,}"  # noqa: E731
        trend_en = "rose" if n["pctChange"] > 0 else "fell"
        trend_bn = "বেড়েছে" if n["pctChange"] > 0 else "কমেছে"
        en = (f"Context from police-recorded data: cases of {en_l} recorded nationwide were {d(n['first'])} in {n['firstYear']} "
              f"and {d(n['last'])} in {n['lastYear']} (it {trend_en} by {abs(n['pctChange']):.0f}%). "
              f"These are reported cases only; the 2019 figures in the file cover just part of the year and are not used.")
        bn = (f"পুলিশের নথিভুক্ত তথ্যের প্রেক্ষাপট: সারাদেশে {bn_l} মামলা {to_bn_digits(n['firstYear'])} সালে ছিল {to_bn_digits(d(n['first']))}টি "
              f"এবং {to_bn_digits(n['lastYear'])} সালে {to_bn_digits(d(n['last']))}টি ({to_bn_digits(abs(round(n['pctChange'])))}% {trend_bn})। "
              f"এগুলো শুধু নথিভুক্ত মামলা; ফাইলে ২০১৯ সালের তথ্য বছরের আংশিক, তাই ব্যবহার করা হয়নি।")
        return en, bn
