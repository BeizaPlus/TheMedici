#!/usr/bin/env python3
"""
Build CCS case bank — 100% local via Ollama (llava + mistral).
No Claude. No OpenAI. No API costs.
"""
from __future__ import annotations

import base64
import json
import re
import subprocess
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

try:
    import ollama
except ImportError:
    print("Install: pip install ollama")
    sys.exit(1)

ROOT = Path(r"C:\Users\steve\MeWorld")
DATA = ROOT / "data"
SOURCES = DATA / "sources"
CASES_DIR = DATA / "cases"
TOPICS_PATH = DATA / "ccs_topics.txt"
TOPICS_FALLBACK = ROOT / "game" / "ccs_screenshots" / "ccs_topics.txt"
SCREENSHOTS_DIR = ROOT / "game" / "ccs_screenshots"
MULTICARE_ROOT = Path(r"C:\Users\steve\Step 3\MultiCaRe")
PRESENTATIONS_DIR = Path(r"C:\Users\steve\Step 3\ccs_presentations")
PREPARED_CASES = ROOT / "game" / "src" / "data" / "preparedCases.json"
MD_OUT = DATA / "ccs_cases_master.md"
JSON_OUT = DATA / "ccs_cases_master.json"

TEXT_MODEL = "mistral"
VISION_MODEL = "llava"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

FETCH_URLS = {
    "fmgmatch": [
        "https://fmgmatch.com/usmle/step3/",
        "https://fmgmatch.com/usmle/step3/css-orders-guide.html",
        "https://fmgmatch.com/usmle/step3/60-seconds.html",
        "https://fmgmatch.com/usmle/step3/bonus-points.html",
        "https://fmgmatch.com/usmle/step3/red-flag-orders.html",
        "https://fmgmatch.com/usmle/step3/common-cases.html",
        "https://fmgmatch.com/usmle/step3/expanded-cases.html",
    ],
    "usmle_official": [
        "https://www.usmle.org/exam-resources/step-3-materials/"
        "step-3-test-question-formats/computer-based-case-simulations",
    ],
}


def log(msg: str) -> None:
    print(msg, flush=True)


def ensure_dirs() -> None:
    for d in (DATA, SOURCES, CASES_DIR):
        d.mkdir(parents=True, exist_ok=True)


def check_ollama_and_pull() -> None:
    log("\n=== STEP 1: CHECK OLLAMA + PULL MODELS ===")
    result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
    log(f"Installed models:\n{result.stdout}")
    installed = result.stdout.lower()
    for model in (VISION_MODEL, TEXT_MODEL):
        if model not in installed:
            log(f"Pulling {model}...")
            subprocess.run(["ollama", "pull", model], check=False)
        else:
            log(f"  {model} already installed")


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return re.sub(r"\n{3,}", "\n\n", soup.get_text("\n", strip=True))


def fetch_url(url: str) -> str:
    try:
        r = requests.get(url, headers=HEADERS, timeout=45)
        if "html" in r.headers.get("Content-Type", "").lower():
            return html_to_text(r.text)
        return r.text
    except Exception as e:
        return f"[FETCH ERROR] {url}: {e}"


def fetch_sources() -> dict[str, str]:
    log("\n=== STEP 2: FETCH FREE SOURCES ===")
    combined: dict[str, str] = {}
    for name, urls in FETCH_URLS.items():
        out_path = SOURCES / f"{name}_raw.txt"
        if out_path.exists() and out_path.stat().st_size > 500:
            text = out_path.read_text(encoding="utf-8", errors="ignore")
            log(f"  Using cached {name} ({len(text)} chars)")
            combined[name] = text
            continue
        parts = [f"=== {name} ===\n"]
        for url in urls:
            log(f"  Fetching {url}")
            parts.append(f"\n{'='*50}\nURL: {url}\n{'='*50}\n\n{fetch_url(url)}")
        text = "\n".join(parts)
        out_path.write_text(text, encoding="utf-8")
        combined[name] = text
        log(f"  Saved {out_path} ({len(text)} chars)")
    return combined


def parse_json_safe(raw: str, fallback: Any = None) -> Any:
    if not raw:
        return fallback
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
    return fallback


def ollama_chat(model: str, messages: list[dict], images: list[str] | None = None) -> str:
    kwargs: dict[str, Any] = {"model": model, "messages": messages}
    if images:
        kwargs["messages"] = [{**messages[0], "images": images}]
    response = ollama.chat(**kwargs)
    return response["message"]["content"]


def load_topics() -> list[tuple[int, str]]:
    path = TOPICS_PATH if TOPICS_PATH.exists() else TOPICS_FALLBACK
    if path == TOPICS_FALLBACK and path.exists():
        TOPICS_PATH.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
    topics: list[tuple[int, str]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\s*(\d+)\.\s*(.+?)\s*$", line)
        if m:
            topics.append((int(m.group(1)), m.group(2).strip()))
    return topics


def find_screenshot(case_id: int) -> Path | None:
    if not SCREENSHOTS_DIR.exists():
        return None
    patterns = [
        f"case_{case_id}_*.png",
        f"case_{case_id:03d}_*.png",
        f"case_{case_id}.png",
    ]
    for pat in patterns:
        matches = sorted(SCREENSHOTS_DIR.glob(pat))
        if matches:
            return matches[0]
    return None


def extract_from_screenshot(image_path: Path) -> dict[str, Any] | None:
    try:
        img_b64 = base64.b64encode(image_path.read_bytes()).decode()
        raw = ollama_chat(
            VISION_MODEL,
            [{
                "role": "user",
                "content": """Extract clinical data from this CCS case review screenshot.
Return JSON only, no markdown:
{
  "diagnosis": "",
  "correctly_ordered": [{"order":"","rationale":""}],
  "should_have_ordered": [{"order":"","rationale":""}],
  "correctly_avoided": [{"order":"","rationale":""}],
  "case_summary": ""
}""",
            }],
            images=[img_b64],
        )
        data = parse_json_safe(raw)
        if isinstance(data, dict):
            return data
    except Exception as e:
        log(f"    LLaVA error on {image_path.name}: {e}")
    return None


def extract_orders_from_text(source_text: str, topic: str, case_id: int) -> dict[str, Any] | None:
    try:
        raw = ollama_chat(
            TEXT_MODEL,
            [{
                "role": "user",
                "content": f"""You are a medical education extractor.
From the following USMLE Step 3 CCS prep material, extract the correct orders for case #{case_id} presenting with: {topic}

Return JSON only. No other text:
{{
  "diagnosis": "",
  "correct_orders": ["order1", "order2"],
  "should_avoid": ["order1"],
  "rationale": {{"order1": "reason"}}
}}

Source text:
{source_text[:4000]}""",
            }],
        )
        data = parse_json_safe(raw)
        if isinstance(data, dict) and data.get("correct_orders"):
            return data
    except Exception as e:
        log(f"    Mistral extract error case {case_id}: {e}")
    return None


def load_multicare_index() -> list[dict[str, Any]]:
    if not MULTICARE_ROOT.exists():
        return []
    records: list[dict[str, Any]] = []
    for path in MULTICARE_ROOT.rglob("*"):
        if path.suffix.lower() not in (".json", ".jsonl", ".txt"):
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
                records.append({"raw_text": text, "_path": str(path)})
        except Exception:
            continue
    return records


def find_multicare_match(diagnosis: str, topic: str, index: list[dict]) -> str | None:
    if not index:
        return None
    dx_tokens = set(re.sub(r"[^a-z0-9]+", " ", diagnosis.lower()).split())
    topic_tokens = set(re.sub(r"[^a-z0-9]+", " ", topic.lower()).split())
    best_text = None
    best_score = 0
    for rec in index:
        rec_text = json.dumps(rec).lower()
        rec_tokens = set(re.sub(r"[^a-z0-9]+", " ", rec_text).split())
        score = len(dx_tokens & rec_tokens) + len(topic_tokens & rec_tokens)
        if score > best_score:
            best_score = score
            best_text = rec.get("raw_text") or rec.get("hpi") or rec.get("history") or json.dumps(rec)[:3000]
    return best_text if best_score >= 2 else None


def reconstruct_hpi(multicare_text: str, diagnosis: str) -> dict[str, Any] | None:
    try:
        raw = ollama_chat(
            TEXT_MODEL,
            [{
                "role": "user",
                "content": f"""Using this real de-identified patient case as grounding material, write a 3-sentence clinical HPI for a patient with {diagnosis}.
Write in third person. Objective. Clinical.
Use only details from the source. Do not invent.

Source: {multicare_text[:2000]}

Return JSON only:
{{"hpi": "", "patient_voice": {{
  "chief_complaint": "",
  "history": "",
  "pain": ""
}}}}""",
            }],
        )
        data = parse_json_safe(raw)
        if isinstance(data, dict):
            return data
    except Exception as e:
        log(f"    HPI reconstruction error: {e}")
    return None


def generate_distractors(diagnosis: str, correct_orders: list[str]) -> list[dict] | None:
    try:
        raw = ollama_chat(
            TEXT_MODEL,
            [{
                "role": "user",
                "content": f"""Generate 4 clinically plausible but incorrect orders for a patient with {diagnosis}.
These should tempt a real medical student.
Correct orders for context: {correct_orders[:12]}

Return JSON only:
[
  {{"order": "", "why_wrong": ""}},
  {{"order": "", "why_wrong": ""}},
  {{"order": "", "why_wrong": ""}},
  {{"order": "", "why_wrong": ""}}
]""",
            }],
        )
        data = parse_json_safe(raw)
        if isinstance(data, list) and len(data) >= 1:
            return data
    except Exception as e:
        log(f"    Distractor generation error: {e}")
    return None


def load_prepared_case(case_id: int) -> dict[str, Any]:
    if not PREPARED_CASES.exists():
        return {}
    try:
        data = json.loads(PREPARED_CASES.read_text(encoding="utf-8"))
        key = str(case_id).zfill(3)
        return data.get("cases", {}).get(key) or data.get("cases", {}).get(str(case_id)) or {}
    except Exception:
        return {}


def load_presentation_hpi(topic: str) -> str | None:
    if not PRESENTATIONS_DIR.exists():
        return None
    topic_norm = topic.lower().replace(" ", "_")
    for f in PRESENTATIONS_DIR.glob("presentation_*.txt"):
        raw = f.read_text(encoding="utf-8", errors="ignore")
        title_m = re.search(r"Case \d+: (.+)", raw)
        if not title_m:
            continue
        if title_m.group(1).strip().lower() != topic.lower():
            continue
        history = re.search(r"--- Initial History ---\s*([\s\S]*?)$", raw)
        intro = re.search(r"--- Case Introduction ---\s*([\s\S]*?)(?=--- Initial Vital Signs ---)", raw)
        return (history.group(1).strip() if history else "") or (intro.group(1).strip() if intro else "")
    return None


def screenshot_to_case(screenshot_data: dict, case_id: int, topic: str) -> dict[str, Any]:
    correct_orders = []
    rationale: dict[str, str] = {}
    should_avoid = []

    for item in screenshot_data.get("correctly_ordered") or []:
        if isinstance(item, dict) and item.get("order"):
            correct_orders.append(item["order"])
            rationale[item["order"]] = item.get("rationale", "")
    for item in screenshot_data.get("should_have_ordered") or []:
        if isinstance(item, dict) and item.get("order"):
            if item["order"] not in correct_orders:
                correct_orders.append(item["order"])
            rationale[item["order"]] = item.get("rationale", "")
    for item in screenshot_data.get("correctly_avoided") or []:
        if isinstance(item, dict) and item.get("order"):
            should_avoid.append(item["order"])

    return {
        "id": case_id,
        "topic": topic,
        "diagnosis": screenshot_data.get("diagnosis") or "Unknown",
        "confidence": "exact",
        "source": "screenshot",
        "correct_orders": correct_orders,
        "should_avoid": should_avoid,
        "rationale": rationale,
        "hpi": screenshot_data.get("case_summary"),
        "physical_exam": None,
        "vitals": None,
        "patient_voice": None,
        "distractors": [],
        "complete": bool(correct_orders),
        "multicare_enriched": False,
        "extraction_method": "screenshot",
        "parse_error": False,
    }


def text_to_case(text_data: dict, case_id: int, topic: str) -> dict[str, Any]:
    orders = text_data.get("correct_orders") or []
    rat = text_data.get("rationale") or {}
    if isinstance(rat, list):
        rat = {str(i): str(v) for i, v in enumerate(rat)}
    return {
        "id": case_id,
        "topic": topic,
        "diagnosis": text_data.get("diagnosis") or "Unknown",
        "confidence": "strong" if orders else "inferred",
        "source": "fmgmatch+usmle",
        "correct_orders": orders,
        "should_avoid": text_data.get("should_avoid") or [],
        "rationale": rat,
        "hpi": None,
        "physical_exam": None,
        "vitals": None,
        "patient_voice": None,
        "distractors": [],
        "complete": bool(orders),
        "multicare_enriched": False,
        "extraction_method": "source_text",
        "parse_error": False,
    }


def is_bad_extraction(text: str | None) -> bool:
    if not text:
        return True
    t = text.lower()
    bad = ("too blurry", "unable to read", "cannot read", "not visible", "unclear", "can't determine")
    return any(b in t for b in bad)


def merge_prepared_fallback(case: dict, prepared: dict) -> None:
    if is_bad_extraction(case.get("diagnosis")) and prepared.get("diagnosis"):
        case["diagnosis"] = prepared["diagnosis"]
        case["source"] = "preparedCases"
    elif prepared.get("diagnosis") and case["diagnosis"] in ("Unknown", "", None):
        case["diagnosis"] = prepared["diagnosis"]
    if prepared.get("interventions") and (not case["correct_orders"] or is_bad_extraction(str(case.get("diagnosis")))):
        case["correct_orders"] = [i["label"] for i in prepared["interventions"] if i.get("label")]
        case["rationale"] = {i["label"]: i.get("why", "") for i in prepared["interventions"] if i.get("label")}
        case["source"] = "preparedCases" if case.get("source") == "screenshot" else case.get("source", "preparedCases")
        case["complete"] = True
    elif prepared.get("interventions") and not case["correct_orders"]:
        case["correct_orders"] = [i["label"] for i in prepared["interventions"] if i.get("label")]
        case["rationale"] = {i["label"]: i.get("why", "") for i in prepared["interventions"] if i.get("label")}
        case["source"] = case.get("source", "preparedCases")
        case["complete"] = True
    if prepared.get("exam") and not case["physical_exam"]:
        case["physical_exam"] = prepared["exam"]
    if prepared.get("vitalsText") and not case["vitals"]:
        case["vitals"] = prepared["vitalsText"]
    if is_bad_extraction(case.get("hpi")) or not case.get("hpi"):
        hpi = load_presentation_hpi(case["topic"])
        if hpi:
            case["hpi"] = hpi
            if case.get("source") and "presentation" not in case["source"]:
                case["source"] = f"{case['source']}+presentation"
            else:
                case["source"] = "presentation"


def build_markdown(cases: list[dict]) -> str:
    lines = ["# CCS Cases Master Reference", "", "*Built locally via Ollama (llava + mistral)*", ""]
    for c in cases:
        lines.append(f"## Case {c['id']} — {c['topic']}")
        lines.append(f"**Diagnosis:** {c.get('diagnosis', 'Unknown')}")
        lines.append(f"**Extraction:** {c.get('extraction_method', 'unknown')}")
        lines.append(f"**Source:** {c.get('source', 'none')}")
        if c.get("multicare_enriched"):
            lines.append("**MultiCaRe enriched:** true")
        if c.get("parse_error"):
            lines.append("**Parse error:** true")
        lines.append("")
        lines.append("### Correct Orders")
        for i, o in enumerate(c.get("correct_orders") or [], 1):
            lines.append(f"{i}. {o}")
        if not c.get("correct_orders"):
            lines.append("_No orders extracted._")
        lines.append("")
        lines.append("### Rationale")
        for k, v in (c.get("rationale") or {}).items():
            lines.append(f"- {k}: {v}")
        lines.append("")
        lines.append("### Should Avoid")
        for a in c.get("should_avoid") or []:
            lines.append(f"- {a}")
        if not c.get("should_avoid"):
            lines.append("_None documented._")
        lines.append("")
        if c.get("distractors"):
            lines.append("### Distractors")
            for d in c["distractors"]:
                if isinstance(d, dict):
                    lines.append(f"- {d.get('order', '?')}: {d.get('why_wrong', '')}")
            lines.append("")
        lines.append("---")
        lines.append("")
    return "\n".join(lines)


def save_outputs(cases: list[dict], stats: dict) -> None:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "builder": "ollama",
        "models": {"text": TEXT_MODEL, "vision": VISION_MODEL},
        "total_cases": len(cases),
        "stats": stats,
        "cases": cases,
    }
    JSON_OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    MD_OUT.write_text(build_markdown(cases), encoding="utf-8")


def process_all_cases(source_text: str, topics: list[tuple[int, str]]) -> tuple[list[dict], dict]:
    log("\n=== STEP 3–5: PROCESS ALL 181 TOPICS ===")
    multicare_index = load_multicare_index()
    if multicare_index:
        log(f"  MultiCaRe records loaded: {len(multicare_index)}")
    else:
        log(f"  MultiCaRe not found at {MULTICARE_ROOT}")

    cases: list[dict] = []
    stats = {
        "screenshot_extracted": 0,
        "source_text_extracted": 0,
        "multicare_enriched": 0,
        "distractors_generated": 0,
        "parse_errors": 0,
    }

    for idx, (case_id, topic) in enumerate(topics, start=1):
        log(f"\nCase {case_id}/181 — {topic}")
        case: dict[str, Any] | None = None
        parse_error = False

        screenshot = find_screenshot(case_id)
        if screenshot:
            log(f"  Screenshot: {screenshot.name}")
            shot_data = extract_from_screenshot(screenshot)
            if shot_data:
                case = screenshot_to_case(shot_data, case_id, topic)
                stats["screenshot_extracted"] += 1
            else:
                parse_error = True
        else:
            log("  No screenshot — using source text")

        if case is None:
            text_data = extract_orders_from_text(source_text, topic, case_id)
            if text_data:
                case = text_to_case(text_data, case_id, topic)
                stats["source_text_extracted"] += 1
            else:
                parse_error = True
                case = {
                    "id": case_id,
                    "topic": topic,
                    "diagnosis": "Unknown",
                    "confidence": "missing",
                    "source": "none",
                    "correct_orders": [],
                    "should_avoid": [],
                    "rationale": {},
                    "hpi": None,
                    "physical_exam": None,
                    "vitals": None,
                    "patient_voice": None,
                    "distractors": [],
                    "complete": False,
                    "multicare_enriched": False,
                    "extraction_method": "failed",
                    "parse_error": True,
                }

        if parse_error:
            stats["parse_errors"] += 1
        case["parse_error"] = parse_error

        prepared = load_prepared_case(case_id)
        merge_prepared_fallback(case, prepared)

        mc_text = find_multicare_match(case["diagnosis"], topic, multicare_index)
        if mc_text and not case.get("hpi"):
            hpi_data = reconstruct_hpi(mc_text, case["diagnosis"])
            if hpi_data:
                case["hpi"] = hpi_data.get("hpi")
                case["patient_voice"] = hpi_data.get("patient_voice")
                case["multicare_enriched"] = True
                stats["multicare_enriched"] += 1

        if case.get("correct_orders") and case["diagnosis"] != "Unknown":
            distractors = generate_distractors(case["diagnosis"], case["correct_orders"])
            if distractors:
                case["distractors"] = distractors
                stats["distractors_generated"] += 1

        cases.append(case)

        if idx % 10 == 0:
            save_outputs(cases, stats)
            log(f"  >> Progress saved ({idx}/181)")

    return cases, stats


def print_report(stats: dict) -> None:
    log("\n================================")
    log("CCS CASE BANK — OLLAMA BUILD")
    log("================================")
    log(f"Screenshot extracted:   {stats['screenshot_extracted']} / 181")
    log(f"Source text extracted:  {stats['source_text_extracted']} / 181")
    log(f"MultiCaRe enriched:     {stats['multicare_enriched']} / 181")
    log(f"Distractors generated:  {stats['distractors_generated']} / 181")
    log(f"Parse errors:           {stats['parse_errors']}")
    log("================================")
    log("Files saved:")
    log(str(JSON_OUT))
    log(str(MD_OUT))
    log("================================")


def main() -> int:
    ensure_dirs()
    check_ollama_and_pull()

    sources = fetch_sources()
    combined_source = "\n\n".join(sources.values())

    topics = load_topics()
    log(f"Loaded {len(topics)} topics")

    try:
        cases, stats = process_all_cases(combined_source, topics)
        save_outputs(cases, stats)
        print_report(stats)
        return 0
    except KeyboardInterrupt:
        log("\nInterrupted — partial progress may be saved.")
        return 1
    except Exception as e:
        log(f"\nFatal error: {e}\n{traceback.format_exc()}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
