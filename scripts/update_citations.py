#!/usr/bin/env python3
"""Refresh Google Scholar citation numbers in the site, in place.

What it updates
---------------
1. The three hero totals in ``index.html`` (citations, h-index, i10-index),
   located by their adjacent ``data-i18n`` markers (``hero.cites`` / ``hero.h``
   / ``hero.i10``).
2. Every per-article "Cited by N" count in ``index.html``, matched to a Scholar
   article by (normalized, then fuzzy) title. Unmatched entries are left
   untouched and reported -- the script never guesses or deletes.
3. The "as of <Month Year>" date stamps: the English ones in ``index.html``
   (the hero as-of span, the cite-note paragraph, and every
   ``title="Citations on Google Scholar (<Month Year>)"`` attribute) and the two
   Chinese ones in ``assets/js/main.js`` (``hero.asof`` and ``cite.note``).

Data source
-----------
SerpApi's Google Scholar Author API (https://serpapi.com/google-scholar-author-api).
Set the API key in the SERPAPI_KEY environment variable. The free tier (100
searches/month) is ample for a monthly run (one or two searches each).

Usage
-----
    SERPAPI_KEY=... python scripts/update_citations.py            # write changes
    SERPAPI_KEY=... python scripts/update_citations.py --check    # report only

Only the standard library plus ``requests`` is required. Files are edited as
text via scoped regular expressions so the commit diff stays minimal (no HTML
re-serialization, publication years are never touched).
"""

from __future__ import annotations

import argparse
import datetime as dt
import difflib
import html
import os
import re
import sys
from pathlib import Path

import requests

SCHOLAR_AUTHOR_ID = "pcxTCZkAAAAJ"
SERPAPI_ENDPOINT = "https://serpapi.com/search.json"
FUZZY_THRESHOLD = 0.87  # min title similarity to accept a per-article match

ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / "index.html"
MAIN_JS = ROOT / "assets" / "js" / "main.js"


# --------------------------------------------------------------------------- #
# Scholar data via SerpApi
# --------------------------------------------------------------------------- #
def fetch_scholar(api_key: str) -> dict:
    """Return {'totals': {...}, 'articles': [(title, citations), ...]}."""
    totals: dict[str, int] = {}
    articles: list[tuple[str, int]] = []
    start = 0

    while True:
        params = {
            "engine": "google_scholar_author",
            "author_id": SCHOLAR_AUTHOR_ID,
            "api_key": api_key,
            "num": 100,
            "start": start,
            "sort": "pubdate",
        }
        resp = requests.get(SERPAPI_ENDPOINT, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise RuntimeError(f"SerpApi error: {data['error']}")

        if not totals:
            for row in data.get("cited_by", {}).get("table", []):
                for key, payload in row.items():
                    if isinstance(payload, dict) and "all" in payload:
                        totals[key] = int(payload["all"])

        page = data.get("articles", []) or []
        for art in page:
            title = (art.get("title") or "").strip()
            cited = art.get("cited_by", {}).get("value")
            if title and cited is not None:
                articles.append((title, int(cited)))

        nxt = data.get("serpapi_pagination", {}).get("next")
        if not page or not nxt:
            break
        start += len(page)

    missing = {"citations", "h_index", "i10_index"} - set(totals)
    if missing:
        raise RuntimeError(f"Scholar totals missing keys: {sorted(missing)}")
    return {"totals": totals, "articles": articles}


# --------------------------------------------------------------------------- #
# Title matching helpers
# --------------------------------------------------------------------------- #
def strip_tags(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text)


def normalize_title(text: str) -> str:
    text = html.unescape(strip_tags(text)).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return text.strip()


def build_matcher(articles: list[tuple[str, int]]):
    """Return a function mapping a site title -> citations (or None)."""
    exact: dict[str, int] = {}
    norm_keys: list[str] = []
    for title, cited in articles:
        key = normalize_title(title)
        exact[key] = cited
        norm_keys.append(key)

    def lookup(site_title: str):
        key = normalize_title(site_title)
        if key in exact:
            return exact[key]
        # Fuzzy fallback for minor title differences / truncation.
        best, best_ratio = None, 0.0
        for cand in norm_keys:
            ratio = difflib.SequenceMatcher(None, key, cand).ratio()
            if ratio > best_ratio:
                best, best_ratio = cand, ratio
        if best is not None and best_ratio >= FUZZY_THRESHOLD:
            return exact[best]
        return None

    return lookup


# --------------------------------------------------------------------------- #
# index.html edits
# --------------------------------------------------------------------------- #
def update_index_html(text: str, scholar: dict, en_date: str) -> tuple[str, list[str]]:
    totals = scholar["totals"]
    notes: list[str] = []

    # 1. Hero totals -- anchored on the adjacent data-i18n label spans.
    hero_specs = [
        ("citations", r'(<strong>)[\d,]+(</strong>\s*<span data-i18n="hero\.cites">)',
         f"{totals['citations']:,}"),
        ("h_index", r'(<strong>)\d+(</strong>\s*<span data-i18n="hero\.h">)',
         str(totals["h_index"])),
        ("i10_index", r'(<strong>)\d+(</strong>\s*<span data-i18n="hero\.i10">)',
         str(totals["i10_index"])),
    ]
    for name, pattern, value in hero_specs:
        text, n = re.subn(pattern, r"\g<1>" + value + r"\g<2>", text)
        if n != 1:
            notes.append(f"WARNING: hero metric '{name}' matched {n} times (expected 1)")

    # 2. Per-article "Cited by N", matched within each <li> by title.
    lookup = build_matcher(scholar["articles"])
    stats = {"updated": 0, "unchanged": 0, "unmatched": 0}

    def repl_li(m: re.Match) -> str:
        open_tag, body, close_tag = m.group(1), m.group(2), m.group(3)
        if 'class="cited"' not in body:
            return m.group(0)
        title_m = re.search(r'<span class="pub-title">(.*?)</span>', body, re.S)
        if not title_m:
            return m.group(0)
        site_title = title_m.group(1)
        citations = lookup(site_title)
        if citations is None:
            stats["unmatched"] += 1
            notes.append("UNMATCHED: " + " ".join(strip_tags(site_title).split())[:90])
            return m.group(0)
        new_body, n = re.subn(
            r"(Cited by <strong>)\d+(</strong>)",
            r"\g<1>" + str(citations) + r"\g<2>",
            body,
        )
        if n:
            if new_body != body:
                stats["updated"] += 1
            else:
                stats["unchanged"] += 1
        return open_tag + new_body + close_tag

    text = re.sub(r"(<li[^>]*>)(.*?)(</li>)", repl_li, text, flags=re.S)
    notes.append(
        f"articles: {stats['updated']} updated, {stats['unchanged']} already current, "
        f"{stats['unmatched']} unmatched"
    )

    # 3. English date stamps (scoped -- never touches publication years).
    text = re.sub(r"as of [A-Z][a-z]+ \d{4}", f"as of {en_date}", text)
    text = re.sub(
        r"(Citations on Google Scholar \()[A-Z][a-z]+ \d{4}(\))",
        r"\g<1>" + en_date + r"\g<2>",
        text,
    )
    return text, notes


# --------------------------------------------------------------------------- #
# main.js edits (Chinese date strings only)
# --------------------------------------------------------------------------- #
def update_main_js(text: str, zh_date: str) -> str:
    return re.sub(r"截至 \d{4} 年 \d{1,2} 月", zh_date, text)


# --------------------------------------------------------------------------- #
def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh Scholar citations in the site.")
    parser.add_argument("--check", action="store_true",
                        help="report what would change without writing files")
    args = parser.parse_args()

    api_key = os.environ.get("SERPAPI_KEY")
    if not api_key:
        print("ERROR: SERPAPI_KEY environment variable is not set.", file=sys.stderr)
        return 2

    today = dt.date.today()
    en_date = today.strftime("%B %Y")           # e.g. "June 2026"
    zh_date = f"截至 {today.year} 年 {today.month} 月"

    print(f"Fetching Google Scholar data for author {SCHOLAR_AUTHOR_ID} ...")
    scholar = fetch_scholar(api_key)
    t = scholar["totals"]
    print(f"  totals: {t['citations']:,} citations, h-index {t['h_index']}, "
          f"i10-index {t['i10_index']}")
    print(f"  articles returned by Scholar: {len(scholar['articles'])}")
    print(f"  stamping date: '{en_date}' / '{zh_date}'")

    index_text = INDEX_HTML.read_text(encoding="utf-8")
    new_index, notes = update_index_html(index_text, scholar, en_date)
    for note in notes:
        print("  " + note)

    js_text = MAIN_JS.read_text(encoding="utf-8")
    new_js = update_main_js(js_text, zh_date)

    index_changed = new_index != index_text
    js_changed = new_js != js_text

    if not index_changed and not js_changed:
        print("No changes -- everything is already current.")
        return 0

    if args.check:
        print(f"[--check] would update: "
              f"{'index.html ' if index_changed else ''}"
              f"{'main.js' if js_changed else ''}".strip())
        return 0

    if index_changed:
        INDEX_HTML.write_text(new_index, encoding="utf-8")
        print(f"Wrote {INDEX_HTML.relative_to(ROOT)}")
    if js_changed:
        MAIN_JS.write_text(new_js, encoding="utf-8")
        print(f"Wrote {MAIN_JS.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
