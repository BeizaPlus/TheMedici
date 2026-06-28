#!/usr/bin/env python3
"""
One-time / on-demand First Aid PDF → local JSON index (no LLM, no DeepSeek).

Uses PyMuPDF (fitz) when available, else pypdf. Output:
  reference/first-aid/index/meta.json      — build stats (safe to commit)
  reference/first-aid/index/page-map.json  — book page → pdf viewer page + excerpt (commit)
  reference/first-aid/index/topics.json    — INDEX section topic → pages (commit)
  reference/first-aid/index/pages.json     — full page text for local grep (gitignored)

Usage:
  python scripts/build-first-aid-index.py
  python scripts/build-first-aid-index.py --search "lyme treatment"
  python scripts/build-first-aid-index.py --topic "Lyme disease"
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

GAME_ROOT = Path(__file__).resolve().parents[1]
FA_DIR = GAME_ROOT / "reference" / "first-aid"
PDF_PATH = FA_DIR / "First_Aid_USMLE_Step_1_2025_35th_Edition.pdf"
INDEX_DIR = FA_DIR / "index"
MANIFEST_PATH = FA_DIR / "MANIFEST.json"

EXCERPT_LEN = 320
INDEX_PDF_START = 794
INDEX_PDF_END = 862


def topic_excerpt(text: str, label: str) -> str:
    if not text:
        return ""
    idx = text.lower().find(label.lower())
    chunk = text[idx : idx + EXCERPT_LEN] if idx >= 0 else text[:EXCERPT_LEN]
    if len(chunk) > EXCERPT_LEN:
        chunk = chunk[:EXCERPT_LEN] + "…"
    return chunk


def safe_print(text: str) -> None:
    sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))

INDEX_LINE_RE = re.compile(
    r"^(.+?),\s*(\d+(?:\s*[-\u2013]\s*\d+)?)\s*$"
)


def load_pdf_backend():
    try:
        import fitz  # PyMuPDF

        return "pymupdf", fitz
    except ImportError:
        pass
    try:
        from pypdf import PdfReader

        return "pypdf", PdfReader
    except ImportError:
        print("Install PyMuPDF or pypdf: pip install pymupdf", file=sys.stderr)
        sys.exit(1)


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_book_page_fitz(page) -> int | None:
    words = page.get_text("words")
    candidates: list[tuple[int, float, float]] = []
    for w in words:
        x0, y0, _x1, y1, token, *_rest = w
        if re.fullmatch(r"\d{1,3}", token) and y0 < 70 and x0 < 120:
            candidates.append((int(token), y0, y1 - y0))
    if candidates:
        candidates.sort(key=lambda c: (-c[2], c[1]))
        return candidates[0][0]
    lines = [ln.strip() for ln in (page.get_text() or "").splitlines() if ln.strip()]
    for line in lines[:15]:
        if re.fullmatch(r"\d{1,3}", line):
            return int(line)
    return None


def extract_section_head(text: str) -> str | None:
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if line in {
            "BIOCHEMISTRY",
            "MICROBIOLOGY",
            "IMMUNOLOGY",
            "PATHOLOGY",
            "PHARMACOLOGY",
            "HIGH-YIELD ORGAN SYSTEmS",
            "HIGH-YIELD ORGAN SYSTEMS",
        }:
            return line.replace("SYSTEmS", "SYSTEMS")
        if re.fullmatch(r"[A-Z][A-Z /&\-]{4,}", line) and "SECTION" not in line:
            return line
    return None


def parse_index_pages(pages_text: list[str]) -> dict[str, list[str]]:
    """topic label -> sorted unique book pages (from INDEX only)."""
    raw: dict[str, set[str]] = {}
    for text in pages_text:
        for line in text.splitlines():
            line = line.strip()
            if not line or len(line) > 90:
                continue
            match = INDEX_LINE_RE.match(line)
            if not match:
                continue
            label = match.group(1).strip()
            pages_raw = match.group(2).replace(" ", "")
            if re.search(r"\d{4}", pages_raw):
                continue
            if any(
                skip in label.lower()
                for skip in ("mcgraw", "kaplan", "wiley", "edition", "ed.", "by age")
            ):
                continue
            pages: list[str] = []
            if "-" in pages_raw or "\u2013" in pages_raw:
                parts = re.split(r"[-\u2013]", pages_raw)
                if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                    start, end = int(parts[0]), int(parts[1])
                    if end - start > 40:
                        continue
                    pages = [str(p) for p in range(start, end + 1)]
                else:
                    continue
            elif pages_raw.isdigit():
                pages = [pages_raw]
            else:
                continue
            key = re.sub(r"^\s*in\s+", "", label, flags=re.I).strip()
            if len(key) < 3:
                continue
            raw.setdefault(key, set()).update(pages)

    out: dict[str, list[str]] = {}
    for key, page_set in raw.items():
        out[key] = sorted(page_set, key=lambda p: int(p))
    return out


def slugify(label: str) -> str:
    s = label.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[-\s]+", "-", s).strip("-")
    return s or "topic"


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def build_index() -> dict:
    backend_name, backend = load_pdf_backend()
    if not PDF_PATH.is_file():
        print(f"PDF not found: {PDF_PATH}", file=sys.stderr)
        sys.exit(1)

    manifest = {}
    if MANIFEST_PATH.is_file():
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    pages_full: dict[str, dict] = {}
    page_map: dict[str, dict] = {}
    book_to_pdf: dict[str, int] = {}
    index_page_texts: list[str] = []

    if backend_name == "pymupdf":
        doc = backend.open(str(PDF_PATH))
        page_count = doc.page_count
        for pdf_index in range(page_count):
            page = doc[pdf_index]
            text = normalize_text(page.get_text() or "")
            book_page = extract_book_page_fitz(page)
            pdf_page1 = pdf_index + 1
            section = extract_section_head(text)
            entry = {
                "bookPage": book_page,
                "pdfIndex": pdf_index,
                "pdfPage1": pdf_page1,
                "section": section,
                "charCount": len(text),
                "text": text,
                "excerpt": text[:EXCERPT_LEN] + ("…" if len(text) > EXCERPT_LEN else ""),
            }
            if INDEX_PDF_START <= pdf_index <= INDEX_PDF_END:
                index_page_texts.append(text)
            if book_page is not None:
                key = str(book_page)
                pages_full[key] = entry
                page_map[key] = {k: v for k, v in entry.items() if k != "text"}
                book_to_pdf[key] = pdf_page1
        doc.close()
    else:
        reader = backend(str(PDF_PATH))
        page_count = len(reader.pages)
        for pdf_index, page in enumerate(reader.pages):
            text = normalize_text(page.extract_text() or "")
            pdf_page1 = pdf_index + 1
            section = extract_section_head(text)
            entry = {
                "bookPage": None,
                "pdfIndex": pdf_index,
                "pdfPage1": pdf_page1,
                "section": section,
                "charCount": len(text),
                "text": text,
                "excerpt": text[:EXCERPT_LEN] + ("…" if len(text) > EXCERPT_LEN else ""),
            }
            if INDEX_PDF_START <= pdf_index <= INDEX_PDF_END:
                index_page_texts.append(text)
            pages_full[str(pdf_page1)] = entry
            page_map[str(pdf_page1)] = {k: v for k, v in entry.items() if k != "text"}

    topics_raw = parse_index_pages(index_page_texts)
    topics: dict[str, dict] = {}
    for label, book_pages in sorted(topics_raw.items(), key=lambda x: x[0].lower()):
        excerpts = []
        for bp in book_pages[:3]:
            pe = pages_full.get(bp)
            if pe and pe.get("text"):
                excerpts.append(topic_excerpt(pe["text"], label))
        topics[slugify(label)] = {
            "label": label,
            "pages": book_pages,
            "pdfPage1": [book_to_pdf.get(bp) for bp in book_pages if bp in book_to_pdf],
            "excerpt": excerpts[0] if excerpts else None,
        }

    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    built_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    meta = {
        "builtAt": built_at,
        "backend": backend_name,
        "pdfPath": str(PDF_PATH),
        "pdfSha256": file_sha256(PDF_PATH),
        "pdfPageCount": page_count,
        "bookPagesIndexed": len(pages_full) if backend_name == "pymupdf" else 0,
        "topicCount": len(topics),
        "manifest": manifest.get("id"),
        "edition": manifest.get("edition"),
        "year": manifest.get("year"),
    }

    (INDEX_DIR / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    (INDEX_DIR / "page-map.json").write_text(
        json.dumps(page_map, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (INDEX_DIR / "topics.json").write_text(
        json.dumps(topics, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (INDEX_DIR / "pages.json").write_text(
        json.dumps(pages_full, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    return {
        "meta": meta,
        "topics": topics,
        "pages_full": pages_full,
        "page_map": page_map,
    }


def score_match(query: str, label: str, slug: str, blob: str) -> int:
    q = query.lower().strip()
    if not q:
        return 0
    tokens = [t for t in re.split(r"\s+", q) if t]
    if len(tokens) > 1:
        if not all(re.search(rf"\b{re.escape(t)}\b", blob, re.I) for t in tokens):
            return 0
        if all(re.search(rf"\b{re.escape(t)}\b", label, re.I) for t in tokens):
            return 180
        return 90
    if slug == slugify(query) or q == label.lower():
        return 200
    if re.search(rf"\b{re.escape(q)}\b", label, re.I):
        return 150
    if re.search(rf"\b{re.escape(q)}\b", blob, re.I):
        return 80
    return 0


def search_index(data: dict, query: str, limit: int = 8) -> list[dict]:
    q = query.lower().strip()
    if not q:
        return []
    hits: list[tuple[int, dict]] = []
    topics: dict = data["topics"]

    for slug, row in topics.items():
        label = row.get("label", "")
        blob = f"{label} {slug} {' '.join(row.get('pages', []))} {row.get('excerpt') or ''}"
        score = score_match(q, label, slug, blob)
        if score:
            hits.append((score, {"kind": "topic", "slug": slug, **row}))

    for book_page, row in data["pages_full"].items():
        text = row.get("text", "")
        score = score_match(q, "", "", text)
        if score:
            pos = text.lower().find(q)
            if pos < 0:
                m = re.search(rf"\b{re.escape(q)}\b", text, re.I)
                pos = m.start() if m else 0
            snippet = text[max(0, pos - 80) : pos + 180]
            hits.append(
                (
                    score,
                    {
                        "kind": "page",
                        "bookPage": book_page,
                        "pdfPage1": row.get("pdfPage1"),
                        "section": row.get("section"),
                        "snippet": snippet,
                    },
                )
            )

    hits.sort(key=lambda h: (-h[0], h[1].get("label", h[1].get("bookPage", ""))))
    seen = set()
    out = []
    for _score, item in hits:
        key = item.get("slug") or item.get("bookPage")
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
        if len(out) >= limit:
            break
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Build / search First Aid local JSON index")
    parser.add_argument("--search", "-s", metavar="QUERY", help="Search existing or fresh index")
    parser.add_argument("--topic", "-t", metavar="LABEL", help="Exact topic label lookup")
    parser.add_argument("--rebuild", action="store_true", help="Force rebuild before search")
    args = parser.parse_args()

    need_build = args.rebuild or not (INDEX_DIR / "pages.json").is_file()
    if need_build:
        safe_print(f"Building index from {PDF_PATH} ...")
        data = build_index()
        safe_print(
            f"Done - {data['meta']['bookPagesIndexed']} book pages, "
            f"{data['meta']['topicCount']} topics -> {INDEX_DIR}"
        )
    else:
        data = {
            "meta": json.loads((INDEX_DIR / "meta.json").read_text(encoding="utf-8")),
            "topics": json.loads((INDEX_DIR / "topics.json").read_text(encoding="utf-8")),
            "pages_full": json.loads((INDEX_DIR / "pages.json").read_text(encoding="utf-8")),
        }

    if args.topic:
        needle = args.topic.lower()
        for slug, row in data["topics"].items():
            if row.get("label", "").lower() == needle or slug == slugify(args.topic):
                safe_print(json.dumps(row, indent=2, ensure_ascii=False))
                bp = row["pages"][0] if row.get("pages") else None
                if bp and bp in data["pages_full"]:
                    safe_print("\n--- page text ---\n")
                    safe_print(data["pages_full"][bp].get("text", ""))
                return
        print(f"No topic match for: {args.topic}", file=sys.stderr)
        sys.exit(1)

    if args.search:
        results = search_index(data, args.search)
        if not results:
            print("No matches.")
            sys.exit(1)
        safe_print(json.dumps(results, indent=2, ensure_ascii=False))
        return

    if not need_build:
        print(f"Index already built ({data['meta'].get('builtAt')}). Use --rebuild or --search.")


if __name__ == "__main__":
    main()
