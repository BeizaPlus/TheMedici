#!/usr/bin/env python3
"""
First Aid coverage map for a MeWorld case — search ALL relevant index hits.

Run from game/:
  python scripts/first-aid-case-coverage.py --terms dysphagia,achalasia,GERD
  python scripts/first-aid-case-coverage.py --terms menopause,dyspareunia,atrophic --case-id 097
  python scripts/first-aid-case-coverage.py --terms dysphagia --limit 12 --json

Requires pages.json (run build-first-aid-index.py once if missing).
Output: markdown coverage table (stdout) for paste into docs/cases/case-NNN-*.md
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

GAME_ROOT = Path(__file__).resolve().parents[1]
INDEX_DIR = GAME_ROOT / "reference" / "first-aid" / "index"
BUILD_SCRIPT = GAME_ROOT / "scripts" / "build-first-aid-index.py"


def _load_build_module():
    import importlib.util

    spec = importlib.util.spec_from_file_location("build_first_aid_index", BUILD_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {BUILD_SCRIPT}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_build = None


def build_mod():
    global _build
    if _build is None:
        _build = _load_build_module()
    return _build


def load_index_data():
    mod = build_mod()
    pages_path = INDEX_DIR / "pages.json"
    if not pages_path.is_file():
        print("pages.json missing — building index (first run may take a minute)...", file=sys.stderr)
        return mod.build_index()
    return {
        "meta": json.loads((INDEX_DIR / "meta.json").read_text(encoding="utf-8")),
        "topics": json.loads((INDEX_DIR / "topics.json").read_text(encoding="utf-8")),
        "pages_full": json.loads(pages_path.read_text(encoding="utf-8")),
    }


def parse_terms(raw: list[str]) -> list[str]:
    out: list[str] = []
    for item in raw:
        for part in re.split(r"[,;]+", item):
            t = part.strip()
            if t and t not in out:
                out.append(t)
    return out


def merge_hits(data: dict, terms: list[str], per_term_limit: int) -> list[dict]:
    search_index = build_mod().search_index
    by_key: dict[str, dict] = {}
    for term in terms:
        for hit in search_index(data, term, limit=per_term_limit):
            if hit.get("kind") == "topic":
                key = f"topic:{hit.get('slug')}"
                label = hit.get("label", term)
                pages = hit.get("pages") or []
                pdf_pages = hit.get("pdfPage1") or []
                book_page = pages[0] if pages else "?"
                pdf_page = pdf_pages[0] if pdf_pages else "?"
                excerpt = (hit.get("excerpt") or "").replace("\n", " ").strip()
            else:
                book_page = hit.get("bookPage", "?")
                key = f"page:{book_page}"
                label = hit.get("section", "page")
                pdf_page = hit.get("pdfPage1", "?")
                excerpt = (hit.get("snippet") or "").replace("\n", " ").strip()
            if key not in by_key:
                by_key[key] = {
                    "matchedTerms": [term],
                    "label": label,
                    "bookPage": book_page,
                    "pdfPage1": pdf_page,
                    "excerpt": excerpt[:280] + ("…" if len(excerpt) > 280 else ""),
                }
            elif term not in by_key[key]["matchedTerms"]:
                by_key[key]["matchedTerms"].append(term)
    rows = list(by_key.values())
    rows.sort(key=lambda r: (str(r["bookPage"]), str(r.get("label") or "")))
    return rows


def markdown_table(rows: list[dict], case_id: str | None) -> str:
    cid = case_id or "NNN"
    lines = [
        f"## First Aid coverage map (case {cid})",
        "",
        "> Agent: fill **Touch in this case** before promote. Every high-yield row should be HPI, exam, stack, result, or tutor beat — or mark **deferred** with reason.",
        "",
        "| FA book p. | PDF p. | Matched terms | High-yield (paraphrase) | Touch in this case |",
        "|------------|--------|---------------|-------------------------|-------------------|",
    ]
    for r in rows:
        terms = ", ".join(r["matchedTerms"])
        excerpt = r["excerpt"].replace("|", "\\|")
        lines.append(
            f"| {r['bookPage']} | {r['pdfPage1']} | {terms} | {excerpt} | *(fill)* |"
        )
    lines.append("")
    lines.append(f"**Coverage:** {len(rows)} First Aid hit(s) · terms searched: see Matched terms column")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="First Aid multi-term coverage map for case markdown")
    parser.add_argument(
        "--terms",
        "-t",
        action="append",
        required=True,
        help="Comma-separated search terms (repeat flag for more groups)",
    )
    parser.add_argument("--case-id", help="Case id for markdown header (e.g. 097)")
    parser.add_argument("--limit", type=int, default=10, help="Max hits per search term")
    parser.add_argument("--json", action="store_true", help="JSON output instead of markdown")
    args = parser.parse_args()

    terms = parse_terms(args.terms)
    if not terms:
        print("No terms provided.", file=sys.stderr)
        sys.exit(1)

    data = load_index_data()
    rows = merge_hits(data, terms, args.limit)

    if args.json:
        sys.stdout.write(json.dumps({"caseId": args.case_id, "terms": terms, "rows": rows}, indent=2, ensure_ascii=False))
        sys.stdout.write("\n")
        return

    if not rows:
        print("No First Aid hits for:", ", ".join(terms), file=sys.stderr)
        sys.exit(1)

    sys.stdout.buffer.write(markdown_table(rows, args.case_id).encode("utf-8"))
    sys.stdout.buffer.write(b"\n")


if __name__ == "__main__":
    main()
