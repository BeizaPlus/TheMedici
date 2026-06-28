#!/usr/bin/env python3
"""
Build CCS case bank: fetch sources, Ollama extraction, topic matching, MultiCaRe enrichment.
"""
from __future__ import annotations

import base64
import json
import re
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import ollama
import requests
from bs4 import BeautifulSoup

ROOT = Path(r"C:\Users\steve\MeWorld")
DATA = ROOT / "data"
SOURCES = DATA / "sources"
CASES_DIR = DATA / "cases"
TOPICS_SRC = ROOT / "game" / "ccs_screenshots" / "ccs_topics.txt"
TOPICS_DST = DATA / "ccs_topics.txt"
MD_OUT = DATA / "ccs_cases_master.md"
JSON_OUT = DATA / "ccs_cases_master.json"
PROGRESS_JSON = DATA / "ccs_cases_progress.json"
MULTICARE_CANDIDATES = [
    Path(r"C:\Users\steve\Step 3\MultiCaRe"),
    Path(r"C:\Users\steve\Downloads\MultiCaRe"),
    Path(r"C:\Users\steve\MultiCaRe"),
]
MULTICARE_ROOT: Path | None = None
SCREENSHOTS_DIR = ROOT / "game" / "ccs_screenshots"
PREPARED_CASES = ROOT / "game" / "src" / "data" / "preparedCases.json"
PLAYBOOKS = ROOT / "game" / "src" / "data" / "playbooks.json"
PRESENTATIONS_DIR = Path(r"C:\Users\steve\Step 3\ccs_presentations")

TOPIC_TO_BUNDLE_KEYWORDS: dict[str, list[str]] = {
    "chest pain": ["acs", "nstemi", "stemi", "pulmonary embolism", "chf", "atrial fibrillation"],
    "altered mental status": ["meningitis", "seizure", "status epilepticus", "stroke", "tia"],
    "pelvic pain": ["ectopic", "preeclampsia", "preterm"],
    "abdominal pain": ["appendicitis", "cholecystitis", "pancreatitis", "diverticulitis", "gi bleed"],
    "headache": ["meningitis", "stroke", "tia"],
    "shortness of breath": ["copd", "asthma", "pneumonia", "pe ", "pulmonary embolism", "chf"],
    "cough": ["pneumonia", "copd", "asthma"],
    "burning during urination": ["sepsis", "cellulitis"],
    "pain in legs": ["pe ", "pulmonary embolism", "cellulitis"],
    "palpitations": ["atrial fibrillation", "acs"],
    "found unconscious": ["seizure", "stroke", "meningitis"],
    "unresponsive": ["seizure", "stroke", "meningitis"],
    "seizure": ["seizure", "status epilepticus"],
    "seizures": ["seizure", "status epilepticus"],
    "vaginal bleeding": ["ectopic", "preeclampsia"],
    "yellow baby": ["febrile infant"],
    "fever": ["sepsis", "meningitis", "pneumonia", "febrile infant"],
    "diarrhea": ["sepsis", "pancreatitis"],
    "hematemesis": ["upper gi bleed", "gi bleed"],
    "back pain": ["spinal cord compression"],
    "knee pain": ["fracture"],
    "leg pain": ["pe ", "cellulitis", "fracture"],
    "animal bite": ["cellulitis"],
    "drowning": ["pneumonia", "sepsis"],
    "hanging": ["sepsis"],
}

TEXT_MODEL = "mistral"
VISION_MODEL = "llava"
EXTRACT_SYSTEM = """You are a medical education data extractor.
Extract every clinical case or condition mentioned.
For each one output JSON with:
- condition/diagnosis name
- chief complaint
- correct orders (as a list)
- should avoid orders (if mentioned)
- key rationale (one sentence per order)
- source: which document this came from
Output only valid JSON array. Nothing else."""

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

FMGMATCH_BASE = "https://fmgmatch.com/usmle/step3/"
FMGMATCH_PAGES = [
    "https://fmgmatch.com/usmle/step3/",
    "https://fmgmatch.com/usmle/step3/css-orders-guide.html",
    "https://fmgmatch.com/usmle/step3/60-seconds.html",
    "https://fmgmatch.com/usmle/step3/bonus-points.html",
    "https://fmgmatch.com/usmle/step3/red-flag-orders.html",
    "https://fmgmatch.com/usmle/step3/common-cases.html",
    "https://fmgmatch.com/usmle/step3/expanded-cases.html",
]


def log(msg: str) -> None:
    print(msg, flush=True)


def call_llm(prompt: str) -> str:
    response = ollama.chat(
        model=TEXT_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response["message"]["content"]
    clean = raw.replace("```json", "").replace("```", "").strip()
    return clean


def parse_json_safe(raw: str, fallback: Any = None) -> Any:
    if not raw:
        return fallback
    cleaned = raw.strip().replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
        if m:
            try:
                return json.loads(m.group(1))
            except json.JSONDecodeError:
                pass
    return fallback


def resolve_multicare_root() -> Path | None:
    global MULTICARE_ROOT
    log("\n=== MULTICARE PATH CHECK ===")
    for path in MULTICARE_CANDIDATES:
        exists = path.exists()
        log(f"  {path} : {'FOUND' if exists else 'not found'}")
        if exists and MULTICARE_ROOT is None:
            MULTICARE_ROOT = path
    if MULTICARE_ROOT:
        log(f"  Using MultiCaRe at: {MULTICARE_ROOT}")
        return MULTICARE_ROOT
    log("  MultiCaRe not found at any candidate path.")
    log("  Install command:")
    log("    pip install multiversity --break-system-packages")
    log("  Then download dataset:")
    log("    from multiversity.multicare_dataset import MedicalDatasetCreator")
    log("    Save to C:\\Users\\steve\\Step 3\\MultiCaRe\\")
    return None


def ensure_dirs() -> None:
    for d in (DATA, SOURCES, CASES_DIR):
        d.mkdir(parents=True, exist_ok=True)


def copy_topics() -> list[str]:
    src = TOPICS_SRC if TOPICS_SRC.exists() else TOPICS_DST
    if TOPICS_SRC.exists():
        TOPICS_DST.write_text(TOPICS_SRC.read_text(encoding="utf-8"), encoding="utf-8")
    topics: list[str] = []
    for line in src.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\s*(\d+)\.\s*(.+?)\s*$", line)
        if m:
            topics.append(m.group(2).strip())
    if len(topics) != 181:
        log(f"WARNING: expected 181 topics, got {len(topics)}")
    return topics


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return re.sub(r"\n{3,}", "\n\n", soup.get_text("\n", strip=True))


def fetch_url(url: str, timeout: int = 45) -> tuple[str, str]:
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        text = html_to_text(r.text) if "html" in r.headers.get("Content-Type", "").lower() else r.text
        return text, f"HTTP {r.status_code}"
    except Exception as e:
        return f"[FETCH ERROR] {url}: {e}", "error"


def fetch_fmgmatch() -> str:
    parts = [f"=== FMGMatch Step 3 CCS ===\nFetched: {datetime.now(timezone.utc).isoformat()}\n"]
    for url in FMGMATCH_PAGES:
        log(f"  Fetching {url}")
        text, status = fetch_url(url)
        parts.append(f"\n\n{'='*60}\nURL: {url}\nSTATUS: {status}\n{'='*60}\n\n{text}")
        time.sleep(0.5)
    return "\n".join(parts)


def fetch_studocu() -> str:
    url = (
        "https://www.studocu.com/row/document/cairo-university/medicine/"
        "ccs-cases-notes-pdf-usmle-step-3-key-clinical-insights-and-guidelines/128226776"
    )
    log(f"  Fetching Studocu: {url}")
    text, status = fetch_url(url)
    return f"URL: {url}\nSTATUS: {status}\n\n{text}"


def fetch_usmle_official() -> str:
    url = "https://www.usmle.org/exam-resources/step-3-materials/step-3-test-question-formats/computer-based-case-simulations"
    log(f"  Fetching USMLE official: {url}")
    text, status = fetch_url(url)
    return f"URL: {url}\nSTATUS: {status}\n\n{text}"


def search_reddit_queries() -> str:
    queries = [
        "USMLE Step 3 CCS all cases answer key",
        "Step 3 CCS cases complete list orders PDF",
    ]
    parts = [f"=== Reddit / Web search results ===\nFetched: {datetime.now(timezone.utc).isoformat()}\n"]
    seen_urls: set[str] = set()

    for q in queries:
        parts.append(f"\n\n{'='*60}\nQUERY: {q}\n{'='*60}\n")
        # Reddit JSON search
        try:
            r = requests.get(
                "https://www.reddit.com/search.json",
                params={"q": q, "limit": 15, "sort": "relevance"},
                headers={**HEADERS, "Accept": "application/json"},
                timeout=30,
            )
            if r.status_code == 200:
                data = r.json()
                for child in data.get("data", {}).get("children", []):
                    post = child.get("data", {})
                    url = f"https://www.reddit.com{post.get('permalink', '')}"
                    title = post.get("title", "")
                    selftext = post.get("selftext", "")
                    parts.append(f"\n--- POST: {title}\nURL: {url}\n{selftext}\n")
                    seen_urls.add(url)
            else:
                parts.append(f"Reddit search HTTP {r.status_code}\n")
        except Exception as e:
            parts.append(f"Reddit search error: {e}\n")

        # DuckDuckGo HTML fallback
        try:
            r = requests.post(
                "https://html.duckduckgo.com/html/",
                data={"q": f"site:reddit.com {q}"},
                headers=HEADERS,
                timeout=30,
            )
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "lxml")
                for a in soup.select("a.result__a")[:10]:
                    href = a.get("href", "")
                    title = a.get_text(strip=True)
                    if href and href not in seen_urls:
                        parts.append(f"\n--- LINK: {title}\nURL: {href}\n")
                        seen_urls.add(href)
                        try:
                            page_text, st = fetch_url(href)
                            if len(page_text) > 200:
                                parts.append(page_text[:8000])
                        except Exception:
                            pass
                        time.sleep(0.3)
        except Exception as e:
            parts.append(f"DuckDuckGo search error: {e}\n")

    return "\n".join(parts)


def fetch_all_sources() -> dict[str, Path]:
    log("\n=== STEP 1: FETCH FREE SOURCES ===")
    mapping = {
        "fmgmatch": SOURCES / "fmgmatch_raw.txt",
        "studocu": SOURCES / "studocu_raw.txt",
        "reddit": SOURCES / "reddit_raw.txt",
        "usmle_official": SOURCES / "usmle_official_raw.txt",
    }
    fetchers = {
        "fmgmatch": fetch_fmgmatch,
        "studocu": fetch_studocu,
        "reddit": search_reddit_queries,
        "usmle_official": fetch_usmle_official,
    }
    for name, path in mapping.items():
        if path.exists() and path.stat().st_size > 500:
            log(f"  Skipping {name} (already cached: {path.stat().st_size} bytes)")
            continue
        log(f"Fetching source {name}...")
        try:
            content = fetchers[name]()
            path.write_text(content, encoding="utf-8")
            log(f"  Saved {path} ({len(content)} chars)")
        except Exception as e:
            err = f"[FETCH FAILED] {name}: {e}\n{traceback.format_exc()}"
            path.write_text(err, encoding="utf-8")
            log(f"  FAILED {name}: {e}")
    return mapping


def chunk_text(text: str, max_chars: int = 90000) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        if end < len(text):
            break_at = text.rfind("\n\n", start, end)
            if break_at > start + max_chars // 2:
                end = break_at
        chunks.append(text[start:end])
        start = end
    return chunks


def parse_json_array(raw: str) -> list[dict[str, Any]]:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            for key in ("cases", "data", "results"):
                if key in data and isinstance(data[key], list):
                    return data[key]
            return [data]
    except json.JSONDecodeError:
        pass
    match = re.search(r"\[\s*\{[\s\S]*\}\s*\]", raw)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return []


def extract_with_ollama(source_name: str, text: str) -> list[dict[str, Any]]:
    all_cases: list[dict[str, Any]] = []
    chunks = chunk_text(text)
    for i, chunk in enumerate(chunks):
        log(f"    Ollama extract {source_name} chunk {i+1}/{len(chunks)} ({len(chunk)} chars)")
        try:
            prompt = (
                f"{EXTRACT_SYSTEM}\n\n"
                f"Source document: {source_name} (part {i+1}/{len(chunks)})\n\n"
                f"Extract all clinical cases/conditions from this text:\n\n{chunk}"
            )
            raw = call_llm(prompt)
            cases = parse_json_array(raw)
            for c in cases:
                c.setdefault("source", source_name)
            all_cases.extend(cases)
            log(f"      Extracted {len(cases)} cases from chunk")
        except Exception as e:
            log(f"      Ollama error on {source_name} chunk {i+1}: {e}")
        time.sleep(0.3)
    return all_cases


def extract_all_sources(source_paths: dict[str, Path]) -> list[dict[str, Any]]:
    log("\n=== STEP 2: OLLAMA EXTRACTION ===")
    cache_path = SOURCES / "all_extracted_cases.json"
    if cache_path.exists():
        try:
            cached = json.loads(cache_path.read_text(encoding="utf-8"))
            if isinstance(cached, list) and len(cached) > 0:
                log(f"  Using cached extraction ({len(cached)} cases)")
                return cached
        except Exception:
            pass

    all_cases: list[dict[str, Any]] = []

    for name, path in source_paths.items():
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if len(text.strip()) < 100 or text.startswith("[FETCH FAILED]"):
            log(f"  Skipping extraction for {name} (insufficient content)")
            continue
        per_source_cache = SOURCES / f"{name}_extracted.json"
        if per_source_cache.exists():
            try:
                cases = json.loads(per_source_cache.read_text(encoding="utf-8"))
                log(f"  Loaded cached {name}: {len(cases)} cases")
                all_cases.extend(cases)
                continue
            except Exception:
                pass
        log(f"  Extracting from {name}...")
        cases = extract_with_ollama(name, text)
        per_source_cache.write_text(json.dumps(cases, indent=2), encoding="utf-8")
        all_cases.extend(cases)

    structured = parse_fmgmatch_bundles(source_paths.get("fmgmatch"))
    all_cases.extend(structured)
    playbook_cases = load_playbook_cases()
    all_cases.extend(playbook_cases)

    if not all_cases:
        log("  Ollama returned nothing — regex fallback")
        all_cases = regex_fallback_extract(source_paths)

    cache_path.write_text(json.dumps(all_cases, indent=2), encoding="utf-8")
    log(f"  Total extracted cases: {len(all_cases)}")
    return all_cases


def parse_fmgmatch_bundles(fmg_path: Path | None) -> list[dict[str, Any]]:
    if not fmg_path or not fmg_path.exists():
        return []
    text = fmg_path.read_text(encoding="utf-8", errors="ignore")
    cases: list[dict[str, Any]] = []
    # Match "Diagnosis Name\norder1\norder2..." blocks in common/expanded pages
    bundle_section = re.search(
        r"expanded-cases\.html[\s\S]*?(?=Why This Expanded List Helps|$)", text, re.I
    )
    common_section = re.search(
        r"common-cases\.html[\s\S]*?(?=Why This List Matters|$)", text, re.I
    )
    for section in filter(None, [common_section, bundle_section]):
        body = section.group(0)
        parts = re.split(r"\n(?=[A-Z][A-Za-z0-9 /\-()]+(?:\n|$))", body)
        current_title = ""
        current_orders: list[str] = []
        for line in body.splitlines():
            line = line.strip()
            if not line or line.startswith("URL:") or line.startswith("="):
                continue
            if re.match(r"^(Cardiology|Pulmonary|Neurology|GI|Infectious|OB|Pediatrics|Trauma|Initial|Diagnostics|Medical|Disposition|Monitoring|Treatment|Fluid|Additional|Consultation|Why|Search|Filter|Total|Cases|Specialties|Exam|Key|USMLE|Logout|Home)", line):
                if current_title and current_orders:
                    cases.append(_bundle_case(current_title, current_orders))
                current_title = ""
                current_orders = []
                continue
            if re.match(r"^[A-Z][A-Za-z0-9 /\-()]+$", line) and len(line) < 80 and not line.startswith("📌"):
                if current_title and current_orders:
                    cases.append(_bundle_case(current_title, current_orders))
                current_title = line
                current_orders = []
            elif current_title and len(line) > 2 and not line.startswith("📌"):
                current_orders.append(line)
        if current_title and current_orders:
            cases.append(_bundle_case(current_title, current_orders))
    # Deduplicate by diagnosis
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for c in cases:
        key = norm(case_field(c, "condition/diagnosis name", "diagnosis"))
        if key and key not in seen:
            seen.add(key)
            unique.append(c)
    log(f"  Parsed {len(unique)} fmgmatch bundle cases")
    return unique


def _bundle_case(title: str, orders: list[str]) -> dict[str, Any]:
    rationale = {o: f"Standard bundle step for {title}" for o in orders[:15]}
    cc = title.split("/")[0].strip()
    return {
        "condition/diagnosis name": title,
        "chief complaint": cc,
        "correct orders": orders,
        "should avoid orders": [],
        "key rationale": rationale,
        "source": "fmgmatch",
    }


def load_playbook_cases() -> list[dict[str, Any]]:
    if not PLAYBOOKS.exists():
        return []
    data = json.loads(PLAYBOOKS.read_text(encoding="utf-8"))
    cases: list[dict[str, Any]] = []
    for topic, pb in data.get("presentations", {}).items():
        interventions = pb.get("interventions", [])
        orders = [i["label"] for i in interventions if i.get("label")]
        rationale = {i["label"]: i.get("why", "") for i in interventions if i.get("label")}
        cases.append(
            {
                "condition/diagnosis name": topic,
                "chief complaint": topic,
                "correct orders": orders,
                "should avoid orders": [],
                "key rationale": rationale,
                "source": "playbooks",
            }
        )
    log(f"  Loaded {len(cases)} playbook presentation cases")
    return cases


def load_prepared_by_id() -> dict[int, dict[str, Any]]:
    out: dict[int, dict[str, Any]] = {}
    if not PREPARED_CASES.exists():
        return out
    data = json.loads(PREPARED_CASES.read_text(encoding="utf-8"))
    for cid, case in data.get("cases", {}).items():
        out[int(cid)] = case
    return out


def regex_fallback_extract(source_paths: dict[str, Path]) -> list[dict[str, Any]]:
    """Parse fmgmatch expanded/common cases when API unavailable."""
    cases: list[dict[str, Any]] = []
    fmg = source_paths.get("fmgmatch")
    if not fmg or not fmg.exists():
        return cases
    text = fmg.read_text(encoding="utf-8", errors="ignore")
    # Pattern: case headers with orders lists
    blocks = re.split(r"\n(?=[A-Z][A-Za-z /\-()]+(?:Case|Syndrome|Pneumonia|Infarction|Pain|Emergency))\n", text)
    for block in blocks:
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if len(lines) < 2:
            continue
        title = lines[0][:120]
        orders = []
        avoid = []
        rationale: dict[str, str] = {}
        for line in lines[1:]:
            if re.match(r"^[-•*\d]", line) or re.search(r"order|exam|lab|x-?ray|ecg|ct|mri|consult", line, re.I):
                order = re.sub(r"^[-•*\d.)]+\s*", "", line).strip()
                if order and len(order) > 3:
                    orders.append(order)
                    rationale[order] = f"Recommended for {title}"
            if re.search(r"avoid|do not|contraind", line, re.I):
                avoid.append(re.sub(r"^[-•*\d.)]+\s*", "", line).strip())
        if orders or re.search(r"case|pain|syndrome|emergency", title, re.I):
            cases.append(
                {
                    "condition/diagnosis name": title,
                    "chief complaint": title.split("—")[0].split("-")[0].strip(),
                    "correct orders": orders[:20],
                    "should avoid orders": avoid[:10],
                    "key rationale": rationale,
                    "source": "fmgmatch",
                }
            )
    return cases


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def topic_tokens(topic: str) -> set[str]:
    stop = {"and", "in", "of", "the", "with", "during", "to", "a", "an"}
    return {t for t in norm(topic).split() if t not in stop and len(t) > 2}


def case_field(case: dict, *keys: str) -> str:
    for k in keys:
        if k in case and case[k]:
            return str(case[k])
        for ck, cv in case.items():
            if ck.lower().replace("_", " ") == k.lower().replace("_", " "):
                return str(cv)
    return ""


def score_match(topic: str, case: dict) -> tuple[str, float]:
    topic_n = norm(topic)
    topic_toks = topic_tokens(topic)
    diagnosis = norm(case_field(case, "condition/diagnosis name", "diagnosis", "condition"))
    complaint = norm(case_field(case, "chief complaint", "presentation", "topic"))
    combined = f"{diagnosis} {complaint}"

    if topic_n in diagnosis or topic_n in complaint:
        return "exact", 1.0
    if all(t in combined for t in topic_toks if len(t) > 4):
        return "exact", 0.95
    overlap = len(topic_toks & set(combined.split()))
    ratio = overlap / max(len(topic_toks), 1)
    if ratio >= 0.7:
        return "strong", 0.7 + ratio * 0.2
    if ratio >= 0.4 or any(t in combined for t in topic_toks):
        return "inferred", 0.3 + ratio * 0.3
    return "missing", 0.0


def orders_list(case: dict) -> list[str]:
    for k in ("correct orders", "correct_orders", "orders"):
        v = case.get(k)
        if isinstance(v, list):
            return [str(x) for x in v]
        if isinstance(v, str) and v.strip():
            return [v.strip()]
    return []


def avoid_list(case: dict) -> list[str]:
    for k in ("should avoid orders", "should_avoid", "avoid"):
        v = case.get(k)
        if isinstance(v, list):
            return [str(x) for x in v]
        if isinstance(v, str) and v.strip():
            return [v.strip()]
    return []


def rationale_dict(case: dict) -> dict[str, str]:
    r = case.get("key rationale") or case.get("rationale") or {}
    if isinstance(r, dict):
        return {str(k): str(v) for k, v in r.items()}
    if isinstance(r, list):
        out = {}
        for item in r:
            if isinstance(item, str) and ":" in item:
                k, v = item.split(":", 1)
                out[k.strip()] = v.strip()
        return out
    if isinstance(r, str):
        return {"general": r}
    return {}


def load_presentations() -> dict[str, dict[str, str]]:
    pres: dict[str, dict[str, str]] = {}
    if not PRESENTATIONS_DIR.exists():
        return pres
    for f in PRESENTATIONS_DIR.glob("presentation_*.txt"):
        raw = f.read_text(encoding="utf-8", errors="ignore")
        title_m = re.search(r"Case \d+: (.+)", raw)
        if not title_m:
            continue
        title = title_m.group(1).strip()
        intro = re.search(r"--- Case Introduction ---\s*([\s\S]*?)(?=--- Initial Vital Signs ---)", raw)
        vitals = re.search(r"--- Initial Vital Signs ---\s*([\s\S]*?)(?=--- Initial History ---)", raw)
        history = re.search(r"--- Initial History ---\s*([\s\S]*?)$", raw)
        pres[title.lower()] = {
            "hpi": (history.group(1).strip() if history else "") or (intro.group(1).strip() if intro else ""),
            "vitals": vitals.group(1).strip() if vitals else "",
            "intro": intro.group(1).strip() if intro else "",
        }
    return pres


def load_prepared_diagnoses() -> dict[int, str]:
    out: dict[int, str] = {}
    if not PREPARED_CASES.exists():
        return out
    try:
        data = json.loads(PREPARED_CASES.read_text(encoding="utf-8"))
        for cid, case in data.get("cases", {}).items():
            dx = case.get("diagnosis")
            if dx:
                out[int(cid)] = dx
    except Exception:
        pass
    return out


def match_bundle_by_topic(topic: str, extracted: list[dict[str, Any]]) -> tuple[dict | None, str, float]:
    topic_l = norm(topic)
    keywords = TOPIC_TO_BUNDLE_KEYWORDS.get(topic_l, [topic_l.split()[0]] if topic_l else [])
    best: dict | None = None
    best_score = 0.0
    for ex in extracted:
        dx = norm(case_field(ex, "condition/diagnosis name", "diagnosis"))
        cc = norm(case_field(ex, "chief complaint", "presentation"))
        combined = f"{dx} {cc}"
        for kw in keywords:
            if kw in combined:
                score = 0.75 + len(kw) * 0.01
                if score > best_score:
                    best_score = score
                    best = ex
        conf, score = score_match(topic, ex)
        if score > best_score:
            best_score = score
            best = ex
    if best and best_score >= 0.95:
        return best, "exact", best_score
    if best and best_score >= 0.7:
        return best, "strong", best_score
    if best and best_score >= 0.35:
        return best, "inferred", best_score
    return None, "missing", 0.0


def build_cases(
    topics: list[str],
    extracted: list[dict[str, Any]],
    prepared_by_id: dict[int, dict[str, Any]],
    presentations: dict[str, dict[str, str]],
) -> list[dict[str, Any]]:
    log("\n=== STEP 3 & 4: MATCH TOPICS AND BUILD CASE BANK ===")
    cases: list[dict[str, Any]] = []

    for idx, topic in enumerate(topics, start=1):
        prepared = prepared_by_id.get(idx, {})
        prepared_diagnosis = prepared.get("diagnosis")
        best_case, best_conf, best_score = match_bundle_by_topic(topic, extracted)

        # Match by prepared diagnosis name in extracted pool
        if prepared_diagnosis:
            for ex in extracted:
                dx = norm(case_field(ex, "condition/diagnosis name", "diagnosis"))
                if norm(prepared_diagnosis) in dx or dx in norm(prepared_diagnosis):
                    best_case = ex
                    best_conf = "strong"
                    best_score = 0.88
                    break

        # Playbook exact topic match
        if best_conf == "missing":
            for ex in extracted:
                if ex.get("source") == "playbooks" and norm(case_field(ex, "chief complaint")) == norm(topic):
                    best_case = ex
                    best_conf = "exact"
                    best_score = 1.0
                    break

        diagnosis = prepared_diagnosis or case_field(best_case or {}, "condition/diagnosis name", "diagnosis") or "Unknown"
        source = case_field(best_case or {}, "source") or ("preparedCases" if prepared_diagnosis else "none")
        correct = orders_list(best_case or {})
        avoid = avoid_list(best_case or {})
        rat = rationale_dict(best_case or {})

        # Enrich orders from prepared case interventions
        if prepared.get("interventions"):
            prep_orders = [i["label"] for i in prepared["interventions"] if i.get("label")]
            prep_rat = {i["label"]: i.get("why", "") for i in prepared["interventions"] if i.get("label")}
            if prep_orders:
                if source == "none":
                    source = "preparedCases"
                if best_conf == "missing":
                    best_conf = "inferred"
                merged_orders = list(dict.fromkeys(prep_orders + correct))
                correct = merged_orders
                rat = {**prep_rat, **rat}

        pres = presentations.get(topic.lower(), {})
        hpi = pres.get("hpi") or pres.get("intro") or None
        vitals = pres.get("vitals") or prepared.get("vitalsText") or None
        physical_exam = prepared.get("exam")

        complete = bool(correct and diagnosis != "Unknown" and best_conf != "missing")

        case_obj = {
            "id": idx,
            "topic": topic,
            "diagnosis": diagnosis,
            "confidence": best_conf,
            "source": source,
            "correct_orders": correct,
            "should_avoid": avoid,
            "rationale": rat,
            "hpi": hpi,
            "physical_exam": physical_exam,
            "vitals": vitals,
            "patient_voice": None,
            "complete": complete,
            "multicare_enriched": False,
            "enrichment_source": None,
        }
        cases.append(case_obj)

        if idx % 10 == 0:
            save_progress(cases, topics)
            log(f"  Progress saved at case {idx}/181")

    return cases


def save_progress(cases: list[dict], topics: list[str]) -> None:
    payload = build_json_payload(cases)
    PROGRESS_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    MD_OUT.write_text(build_markdown(cases), encoding="utf-8")
    JSON_OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def build_json_payload(cases: list[dict]) -> dict:
    conf_counts = {"exact": 0, "strong": 0, "inferred": 0, "missing": 0}
    complete = partial = missing = 0
    for c in cases:
        conf_counts[c["confidence"]] = conf_counts.get(c["confidence"], 0) + 1
        if c["complete"]:
            complete += 1
        elif c["confidence"] == "missing":
            missing += 1
        else:
            partial += 1
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_cases": len(cases),
        "complete": complete,
        "partial": partial,
        "missing": missing,
        "confidence_counts": conf_counts,
        "multicare_enriched": sum(1 for c in cases if c.get("multicare_enriched")),
        "cases": cases,
    }


def build_markdown(cases: list[dict]) -> str:
    lines = ["# CCS Cases Master Reference", ""]
    for c in cases:
        lines.append(f"## Case {c['id']} — {c['topic']}")
        lines.append(f"**Diagnosis:** {c['diagnosis']}")
        lines.append(f"**Match confidence:** {c['confidence']}")
        lines.append(f"**Source:** {c['source']}")
        if c.get("multicare_enriched"):
            lines.append("**MultiCaRe enriched:** true")
        lines.append("")
        lines.append("### Correct Orders")
        if c["correct_orders"]:
            for i, o in enumerate(c["correct_orders"], 1):
                lines.append(f"{i}. {o}")
        else:
            lines.append("_No orders extracted — flagged for manual review._")
        lines.append("")
        lines.append("### Rationale")
        if c["rationale"]:
            for k, v in c["rationale"].items():
                lines.append(f"- {k}: {v}")
        else:
            lines.append("_No rationale available._")
        lines.append("")
        lines.append("### Should Avoid")
        if c["should_avoid"]:
            for a in c["should_avoid"]:
                lines.append(f"- {a}")
        else:
            lines.append("_None documented._")
        lines.append("")
        lines.append("---")
        lines.append("")
    return "\n".join(lines)


def load_multicare_index() -> list[dict[str, Any]]:
    root = resolve_multicare_root()
    if not root:
        return []
    records: list[dict[str, Any]] = []
    for path in root.rglob("*"):
        if path.suffix.lower() not in (".json", ".jsonl", ".csv", ".txt"):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
            if path.suffix.lower() == ".jsonl":
                for line in text.splitlines():
                    if line.strip():
                        records.append(json.loads(line))
            elif path.suffix.lower() == ".json":
                data = json.loads(text)
                if isinstance(data, list):
                    records.extend(data)
                elif isinstance(data, dict):
                    for key in ("cases", "data", "records"):
                        if key in data and isinstance(data[key], list):
                            records.extend(data[key])
                            break
                    else:
                        records.append(data)
            else:
                records.append({"raw_text": text, "_path": str(path)})
        except Exception:
            continue
    return records


def enrich_multicare(cases: list[dict]) -> int:
    log("\n=== STEP 5: MULTICARE ENRICHMENT ===")
    index = load_multicare_index()
    if not index:
        return 0

    enriched = 0
    for case in cases:
        if case.get("hpi") and case.get("physical_exam"):
            continue
        dx_tokens = set(norm(case.get("diagnosis", "")).split())
        topic_tokens_set = topic_tokens(case.get("topic", ""))
        best = None
        best_score = 0
        for rec in index:
            rec_text = json.dumps(rec).lower()
            score = len(dx_tokens & set(rec_text.split())) + len(topic_tokens_set & set(rec_text.split()))
            if score > best_score:
                best_score = score
                best = rec
        if best and best_score >= 2:
            case["hpi"] = case.get("hpi") or best.get("hpi") or best.get("history") or best.get("raw_text")
            case["physical_exam"] = case.get("physical_exam") or best.get("physical_exam") or best.get("exam")
            case["multicare_enriched"] = True
            case["enrichment_source"] = "multicare"
            enriched += 1
    log(f"  MultiCaRe enriched: {enriched} cases")
    return enriched


def find_screenshot(case_id: int) -> Path | None:
    if not SCREENSHOTS_DIR.exists():
        return None
    for pat in (f"case_{case_id}_*.png", f"case_{case_id:03d}_*.png"):
        matches = sorted(SCREENSHOTS_DIR.glob(pat))
        if matches:
            return matches[0]
    return None


def extract_screenshot_llava(image_path: Path) -> dict[str, Any] | None:
    try:
        img_b64 = base64.b64encode(image_path.read_bytes()).decode()
        raw = ollama.chat(
            model=VISION_MODEL,
            messages=[{
                "role": "user",
                "content": """Extract clinical data from this CCS case review screenshot.
Return JSON only:
{
  "diagnosis": "",
  "correct_orders": ["order1"],
  "should_avoid": ["order1"],
  "rationale": {"order1": "reason"},
  "hpi": "",
  "physical_exam": {},
  "vitals": {},
  "patient_voice": {}
}""",
                "images": [img_b64],
            }],
        )["message"]["content"]
        return parse_json_safe(raw.replace("```json", "").replace("```", "").strip())
    except Exception as e:
        log(f"    LLaVA error: {e}")
        return None


def mistral_fill_case(topic: str, diagnosis: str) -> dict[str, Any] | None:
    prompt = f"""You are a Step 3 CCS expert.
For a patient presenting with {topic}
diagnosed as {diagnosis}:

Return JSON only:
{{
  "correct_orders": [
    {{"order": "", "rationale": "", "guideline": ""}}
  ],
  "should_have_ordered": [],
  "correctly_avoided": [],
  "distractors": [
    {{"order": "", "why_wrong": ""}}
  ],
  "hpi": "3 sentence clinical HPI",
  "physical_exam": {{
    "general": "",
    "cardiovascular": null,
    "respiratory": null,
    "abdomen": null,
    "neuro": null,
    "skin": null
  }},
  "vitals": {{
    "hr": null, "spo2": null,
    "bp_systolic": null, "bp_diastolic": null,
    "rr": null, "temp": null
  }},
  "patient_voice": {{
    "chief_complaint": "",
    "history": "",
    "pain": ""
  }}
}}"""
    return parse_json_safe(call_llm(prompt))


def apply_enrichment_data(case: dict, data: dict, source: str) -> None:
    orders_raw = data.get("correct_orders") or []
    orders: list[str] = []
    rationale: dict[str, str] = case.get("rationale") or {}
    for item in orders_raw:
        if isinstance(item, dict) and item.get("order"):
            orders.append(item["order"])
            rationale[item["order"]] = item.get("rationale") or item.get("guideline") or ""
        elif isinstance(item, str):
            orders.append(item)
    if orders:
        case["correct_orders"] = orders
    case["rationale"] = rationale
    if data.get("should_have_ordered"):
        case["should_have_ordered"] = data["should_have_ordered"]
    if data.get("correctly_avoided"):
        case["should_avoid"] = data.get("correctly_avoided") or data.get("should_avoid") or []
    if data.get("distractors"):
        case["distractors"] = data["distractors"]
    if data.get("diagnosis") and case.get("diagnosis") in ("Unknown", None, ""):
        case["diagnosis"] = str(data["diagnosis"])
    if data.get("hpi") and not case.get("hpi"):
        case["hpi"] = data["hpi"]
    if data.get("physical_exam") and not case.get("physical_exam"):
        case["physical_exam"] = data["physical_exam"]
    if data.get("vitals") and not case.get("vitals"):
        case["vitals"] = data["vitals"]
    if data.get("patient_voice") and not case.get("patient_voice"):
        case["patient_voice"] = data["patient_voice"]
    case["enrichment_source"] = source


def mark_case_complete(case: dict) -> None:
    case["complete"] = bool(
        case.get("correct_orders")
        and case.get("diagnosis") not in ("Unknown", None, "")
    )


def enrich_partial_cases(cases: list[dict]) -> dict[str, int]:
    log("\n=== ENRICH PARTIAL CASES ===")
    stats = {"screenshot": 0, "mistral": 0, "multicare": 0, "processed": 0}
    partial = [c for c in cases if not c.get("complete")]
    log(f"  Partial cases to enrich: {len(partial)}")

    multicare_index = load_multicare_index()

    for i, case in enumerate(partial, start=1):
        case_id = case["id"]
        topic = case["topic"]
        diagnosis = case.get("diagnosis") or "Unknown"
        log(f"  [{i}/{len(partial)}] Case {case_id} — {topic}")

        try:
            shot = find_screenshot(case_id)
            if shot:
                log(f"    LLaVA: {shot.name}")
                data = extract_screenshot_llava(shot)
                if data:
                    apply_enrichment_data(case, data, "screenshot")
                    stats["screenshot"] += 1

            if not case.get("correct_orders") or diagnosis == "Unknown":
                dx = case.get("diagnosis") or topic
                data = mistral_fill_case(topic, dx)
                if data:
                    apply_enrichment_data(case, data, "mistral")
                    stats["mistral"] += 1

            if multicare_index and (not case.get("hpi") or not case.get("physical_exam")):
                dx_tokens = set(norm(case.get("diagnosis", "")).split())
                topic_toks = topic_tokens(topic)
                best, best_score = None, 0
                for rec in multicare_index:
                    rec_text = json.dumps(rec).lower()
                    score = len(dx_tokens & set(rec_text.split())) + len(topic_toks & set(rec_text.split()))
                    if score > best_score:
                        best_score, best = score, rec
                if best and best_score >= 2:
                    if not case.get("hpi"):
                        case["hpi"] = best.get("hpi") or best.get("history") or best.get("raw_text")
                    if not case.get("physical_exam"):
                        case["physical_exam"] = best.get("physical_exam") or best.get("exam")
                    case["multicare_enriched"] = True
                    case["enrichment_source"] = "multicare"
                    stats["multicare"] += 1

            mark_case_complete(case)
            stats["processed"] += 1
        except Exception as e:
            log(f"    ERROR case {case_id}: {e}")

        if i % 10 == 0:
            save_progress(cases, [c["topic"] for c in cases])
            log(f"    >> Progress saved ({i}/{len(partial)})")

    return stats


def export_individual_cases(cases: list[dict]) -> int:
    log("\n=== EXPORT INDIVIDUAL CASE FILES ===")
    CASES_DIR.mkdir(parents=True, exist_ok=True)
    for case in cases:
        out = CASES_DIR / f"case_{case['id']}.json"
        out.write_text(json.dumps(case, indent=2), encoding="utf-8")
    log(f"  Exported {len(cases)} files to {CASES_DIR}")
    return len(cases)


def load_existing_master() -> list[dict] | None:
    if not JSON_OUT.exists():
        return None
    try:
        data = json.loads(JSON_OUT.read_text(encoding="utf-8"))
        cases = data.get("cases")
        if isinstance(cases, list) and len(cases) >= 1:
            return cases
    except Exception:
        pass
    return None


def print_enrichment_report(cases: list[dict], enrich_stats: dict[str, int]) -> None:
    complete = sum(1 for c in cases if c.get("complete"))
    partial = len(cases) - complete
    log("\n================================")
    log("ENRICHMENT RUN COMPLETE")
    log("================================")
    log(f"Complete cases:     {complete} / {len(cases)}")
    log(f"Screenshot OCR:     {enrich_stats.get('screenshot', 0)} cases")
    log(f"Mistral filled:     {enrich_stats.get('mistral', 0)} cases")
    log(f"MultiCaRe:          {enrich_stats.get('multicare', 0)} cases")
    log(f"Still partial:      {partial} cases")
    log("================================")
    log(f"Master JSON: {JSON_OUT}")
    log(f"Master MD:   {MD_OUT}")
    log(f"Case files:  {CASES_DIR}\\case_{{id}}.json")
    log("================================")


def print_report(payload: dict) -> None:
    cc = payload.get("confidence_counts", {})
    log("\n=============================")
    log("CCS CASE BANK BUILD REPORT")
    log("=============================")
    log(f"Total cases: {payload['total_cases']}")
    log(f"Exact match: {cc.get('exact', 0)}")
    log(f"Strong match: {cc.get('strong', 0)}")
    log(f"Inferred: {cc.get('inferred', 0)}")
    log(f"Missing: {cc.get('missing', 0)}")
    log(f"MultiCaRe enriched: {payload.get('multicare_enriched', 0)}")
    log("=============================")
    log("Files saved:")
    log(f"- {MD_OUT}")
    log(f"- {JSON_OUT}")
    log("=============================")


def main() -> int:
    ensure_dirs()
    resolve_multicare_root()

    existing = load_existing_master()
    enrich_stats = {"screenshot": 0, "mistral": 0, "multicare": 0, "processed": 0}

    if existing and len(existing) == 181:
        log(f"Loaded existing master with {len(existing)} cases")
        cases = existing
        enrich_stats = enrich_partial_cases(cases)
    else:
        topics = copy_topics()
        log(f"Loaded {len(topics)} CCS topics")
        source_paths = fetch_all_sources()
        extracted = extract_all_sources(source_paths)
        prepared_by_id = load_prepared_by_id()
        presentations = load_presentations()
        cases = build_cases(topics, extracted, prepared_by_id, presentations)
        enrich_multicare(cases)
        enrich_stats = enrich_partial_cases(cases)

    export_individual_cases(cases)

    payload = build_json_payload(cases)
    payload["enrichment_stats"] = enrich_stats
    payload["builder"] = "ollama"
    payload["models"] = {"text": TEXT_MODEL, "vision": VISION_MODEL}
    MD_OUT.write_text(build_markdown(cases), encoding="utf-8")
    JSON_OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    if PROGRESS_JSON.exists():
        PROGRESS_JSON.unlink()

    print_enrichment_report(cases, enrich_stats)
    return 0


if __name__ == "__main__":
    sys.exit(main())
