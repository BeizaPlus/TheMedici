#!/usr/bin/env python3
"""
Enrich partial CCS cases only — fmgmatch bundles, llava screenshots, mistral fill.
Skips cases already marked complete: true.
"""
from __future__ import annotations

import base64
import json
import re
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import ollama

ROOT = Path(r"C:\Users\steve\MeWorld")
DATA = ROOT / "data"
JSON_OUT = DATA / "ccs_cases_master.json"
MD_OUT = DATA / "ccs_cases_master.md"
FMGMATCH_RAW = DATA / "sources" / "fmgmatch_raw.txt"
TOPICS_PATH = DATA / "ccs_topics.txt"
SCREENSHOTS_DIR = ROOT / "game" / "ccs_screenshots"
PREPARED_CASES = ROOT / "game" / "src" / "data" / "preparedCases.json"
PRESENTATIONS_DIR = Path(r"C:\Users\steve\Step 3\ccs_presentations")

TEXT_MODEL = "mistral"
VISION_MODEL = "llava"

SKIP_HEADERS = re.compile(
    r"^(Cardiology|Pulmonary|Neurology|GI|Infectious|OB|Pediatrics|Trauma|"
    r"Initial|Diagnostics|Medical|Disposition|Monitoring|Treatment|Fluid|"
    r"Additional|Consultation|Why|Search|Filter|Total|Cases|Specialties|Exam|"
    r"Key|USMLE|Logout|Home|Common|Expanded|OB / GYN|GI / Hepatic|Trauma / MSK)",
    re.I,
)


def log(msg: str) -> None:
    print(msg, flush=True)


def parse_json_safe(raw: str, fallback: Any = None) -> Any:
    if not raw:
        return fallback
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
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


def ollama_chat(model: str, content: str, images: list[str] | None = None) -> str:
    msg: dict[str, Any] = {"role": "user", "content": content}
    if images:
        msg["images"] = images
    return ollama.chat(model=model, messages=[msg])["message"]["content"]


def load_topics() -> list[tuple[int, str]]:
    topics: list[tuple[int, str]] = []
    for line in TOPICS_PATH.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\s*(\d+)\.\s*(.+?)\s*$", line)
        if m:
            topics.append((int(m.group(1)), m.group(2).strip()))
    return topics


def load_prepared(case_id: int) -> dict[str, Any]:
    if not PREPARED_CASES.exists():
        return {}
    data = json.loads(PREPARED_CASES.read_text(encoding="utf-8"))
    key = str(case_id).zfill(3)
    return data.get("cases", {}).get(key) or data.get("cases", {}).get(str(case_id)) or {}


def load_presentation_hpi(topic: str) -> str | None:
    if not PRESENTATIONS_DIR.exists():
        return None
    for f in PRESENTATIONS_DIR.glob("presentation_*.txt"):
        raw = f.read_text(encoding="utf-8", errors="ignore")
        title_m = re.search(r"Case \d+: (.+)", raw)
        if title_m and title_m.group(1).strip().lower() == topic.lower():
            history = re.search(r"--- Initial History ---\s*([\s\S]*?)$", raw)
            intro = re.search(r"--- Case Introduction ---\s*([\s\S]*?)(?=--- Initial Vital Signs ---)", raw)
            return (history.group(1).strip() if history else "") or (intro.group(1).strip() if intro else "")
    return None


def as_text(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, dict):
        return val.get("name") or val.get("diagnosis") or val.get("label") or json.dumps(val)
    return str(val)


def is_bad(text: str | None) -> bool:
    if not text:
        return True
    t = as_text(text).lower()
    return any(x in t for x in ("too blurry", "unable to read", "cannot read", "not visible", "unclear"))


def bootstrap_cases(existing: list[dict], topics: list[tuple[int, str]]) -> list[dict]:
    by_id = {c["id"]: c for c in existing}
    cases: list[dict] = []
    for case_id, topic in topics:
        if case_id in by_id:
            cases.append(by_id[case_id])
            continue
        prep = load_prepared(case_id)
        orders = [i["label"] for i in prep.get("interventions", []) if i.get("label")]
        rat = {i["label"]: i.get("why", "") for i in prep.get("interventions", []) if i.get("label")}
        diagnosis = prep.get("diagnosis") or "Unknown"
        complete = bool(orders and diagnosis != "Unknown")
        cases.append({
            "id": case_id,
            "topic": topic,
            "diagnosis": diagnosis,
            "confidence": "inferred" if orders else "missing",
            "source": "preparedCases" if orders else "none",
            "correct_orders": orders,
            "should_avoid": [],
            "rationale": rat,
            "hpi": load_presentation_hpi(topic),
            "physical_exam": prep.get("exam"),
            "vitals": prep.get("vitalsText") or None,
            "patient_voice": None,
            "complete": complete,
            "screenshot_processed": False,
            "enrichment_sources": [],
        })
    cases.sort(key=lambda c: c["id"])
    return cases


def parse_fmgmatch_bundles(text: str) -> list[dict[str, Any]]:
    bundles: list[dict[str, Any]] = []
    current_name = ""
    current_orders: list[str] = []

    def flush() -> None:
        nonlocal current_name, current_orders
        if current_name and current_orders:
            bundles.append({
                "name": current_name,
                "orders": current_orders[:],
                "text": f"{current_name}: " + "; ".join(current_orders),
            })
        current_name = ""
        current_orders = []

    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("=") or line.startswith("URL:"):
            continue
        if SKIP_HEADERS.match(line):
            flush()
            continue
        if re.match(r"^[A-Z][A-Za-z0-9 /\-()]+$", line) and len(line) < 90 and not line.startswith("📌"):
            flush()
            current_name = line
            continue
        if current_name and len(line) > 2 and not line.startswith("📌"):
            current_orders.append(line)
    flush()

    seen: set[str] = set()
    unique: list[dict] = []
    for b in bundles:
        key = b["name"].lower()
        if key not in seen and len(b["orders"]) >= 2:
            seen.add(key)
            unique.append(b)
    return unique


def find_screenshot(case_id: int) -> Path | None:
    if not SCREENSHOTS_DIR.exists():
        return None
    for pat in (f"case_{case_id}_*.png", f"case_{case_id:03d}_*.png"):
        matches = sorted(SCREENSHOTS_DIR.glob(pat))
        if matches:
            return matches[0]
    return None


def apply_orders(case: dict, data: dict, source: str, replace: bool = False) -> bool:
    orders = data.get("correct_orders") or []
    if not orders:
        for key in ("correctly_ordered", "should_have_ordered"):
            for item in data.get(key) or []:
                if isinstance(item, dict) and item.get("order"):
                    orders.append(item["order"])
    if not orders:
        return False

    rat = data.get("rationale") or {}
    if isinstance(rat, list):
        rat = {}
    for item in data.get("correctly_ordered") or []:
        if isinstance(item, dict) and item.get("order"):
            rat[item["order"]] = item.get("rationale", rat.get(item["order"], ""))
    for item in data.get("should_have_ordered") or []:
        if isinstance(item, dict) and item.get("order"):
            rat[item["order"]] = item.get("rationale", rat.get(item["order"], ""))

    if replace or not case.get("correct_orders"):
        case["correct_orders"] = orders
        case["rationale"] = rat
    else:
        case["correct_orders"] = list(dict.fromkeys(orders + (case.get("correct_orders") or [])))
        case["rationale"] = {**rat, **(case.get("rationale") or {})}
    if data.get("should_avoid"):
        case["should_avoid"] = list(dict.fromkeys((case.get("should_avoid") or []) + data["should_avoid"]))
    if data.get("diagnosis") and not is_bad(data["diagnosis"]) and case["diagnosis"] in ("Unknown", None, ""):
        case["diagnosis"] = as_text(data["diagnosis"])
    if source not in case.get("enrichment_sources", []):
        case.setdefault("enrichment_sources", []).append(source)
    case["source"] = source if case.get("source") in (None, "none", "") else f"{case['source']}+{source}"
    return True


def enrich_fmgmatch(case: dict, bundles: list[dict]) -> bool:
    bundle_list = "\n".join(f"- {b['name']}: {b['text'][:200]}" for b in bundles[:45])
    prompt = f"""Match this USMLE Step 3 CCS case to the best FMGMatch order bundle.

Case ID: {case['id']}
Topic (chief complaint): {case['topic']}
Diagnosis: {case['diagnosis']}

Available bundles:
{bundle_list}

Return JSON only:
{{
  "bundle_name": "exact name from list or closest match",
  "correct_orders": ["order1", "order2"],
  "should_avoid": ["order1"],
  "rationale": {{"order1": "reason"}}
}}"""
    raw = ollama_chat(TEXT_MODEL, prompt)
    data = parse_json_safe(raw)
    if not isinstance(data, dict):
        return False

    if data.get("bundle_name"):
        for b in bundles:
            if b["name"].lower() in data["bundle_name"].lower() or data["bundle_name"].lower() in b["name"].lower():
                if not data.get("correct_orders"):
                    data["correct_orders"] = b["orders"]
                break
    return apply_orders(case, data, "fmgmatch", replace=True)


def enrich_screenshot(case: dict, screenshot: Path) -> bool:
    img_b64 = base64.b64encode(screenshot.read_bytes()).decode()
    raw = ollama_chat(
        VISION_MODEL,
        """Extract clinical orders from this CCS case review screenshot.
Return JSON only:
{
  "diagnosis": "",
  "correct_orders": ["order1"],
  "should_avoid": ["order1"],
  "rationale": {"order1": "reason"},
  "correctly_ordered": [{"order":"","rationale":""}],
  "should_have_ordered": [{"order":"","rationale":""}]
}""",
        images=[img_b64],
    )
    data = parse_json_safe(raw)
    case["screenshot_processed"] = True
    if not isinstance(data, dict):
        return False
    if is_bad(data.get("diagnosis")):
        data.pop("diagnosis", None)
    return apply_orders(case, data, "screenshot")


def enrich_mistral_knowledge(case: dict) -> bool:
    prompt = f"""What are the correct USMLE Step 3 CCS orders for a patient presenting with {case['topic']} diagnosed as {case['diagnosis']}?

If diagnosis is unknown, infer the most likely diagnosis for this chief complaint in a CCS exam.
Include stabilization, diagnostics, treatment, consults, and disposition in correct sequence.
Return JSON only:
{{
  "diagnosis": "most likely diagnosis",
  "correct_orders": ["order1", "order2"],
  "should_avoid": ["order1"],
  "rationale": {{"order1": "reason"}}
}}"""
    raw = ollama_chat(TEXT_MODEL, prompt)
    data = parse_json_safe(raw)
    if not isinstance(data, dict):
        return False
    if data.get("diagnosis") and not is_bad(data["diagnosis"]):
        if case.get("diagnosis") in ("Unknown", None, ""):
            case["diagnosis"] = as_text(data["diagnosis"])
    return apply_orders(case, data, "mistral", replace=not case.get("correct_orders"))


def mark_complete(case: dict) -> None:
    case["complete"] = bool(case.get("correct_orders") and case.get("diagnosis") not in ("Unknown", None, ""))


def build_markdown(cases: list[dict]) -> str:
    lines = ["# CCS Cases Master Reference", "", "*Partial-case enrichment via Ollama*", ""]
    for c in cases:
        lines += [
            f"## Case {c['id']} — {c['topic']}",
            f"**Diagnosis:** {c.get('diagnosis', 'Unknown')}",
            f"**Complete:** {c.get('complete', False)}",
            f"**Source:** {c.get('source', 'none')}",
            f"**Enrichment:** {', '.join(c.get('enrichment_sources') or []) or 'none'}",
            "",
            "### Correct Orders",
        ]
        for i, o in enumerate(c.get("correct_orders") or [], 1):
            lines.append(f"{i}. {o}")
        if not c.get("correct_orders"):
            lines.append("_No orders._")
        lines += ["", "### Rationale"]
        for k, v in (c.get("rationale") or {}).items():
            lines.append(f"- {k}: {v}")
        lines += ["", "### Should Avoid"]
        for a in c.get("should_avoid") or []:
            lines.append(f"- {a}")
        if not c.get("should_avoid"):
            lines.append("_None._")
        lines += ["", "---", ""]
    return "\n".join(lines)


def save_all(cases: list[dict], stats: dict) -> None:
    complete = sum(1 for c in cases if c.get("complete"))
    partial = len(cases) - complete
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "builder": "ollama-partial-enrichment",
        "models": {"text": TEXT_MODEL, "vision": VISION_MODEL},
        "total_cases": len(cases),
        "complete": complete,
        "partial": partial,
        "enrichment_stats": stats,
        "cases": cases,
    }
    JSON_OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    MD_OUT.write_text(build_markdown(cases), encoding="utf-8")


def main() -> int:
    log("=== PARTIAL CASE ENRICHMENT ===")

    topics = load_topics()
    existing: list[dict] = []
    if JSON_OUT.exists():
        data = json.loads(JSON_OUT.read_text(encoding="utf-8"))
        existing = data.get("cases", [])

    cases = bootstrap_cases(existing, topics)
    partial = [c for c in cases if not c.get("complete")]
    log(f"Total cases: {len(cases)} | Partial to enrich: {len(partial)} | Skipping complete: {len(cases) - len(partial)}")

    fmg_text = FMGMATCH_RAW.read_text(encoding="utf-8", errors="ignore")
    bundles = parse_fmgmatch_bundles(fmg_text)
    log(f"Parsed {len(bundles)} FMGMatch bundles")

    stats = {
        "processed": 0,
        "skipped_complete": len(cases) - len(partial),
        "fmgmatch_filled": 0,
        "screenshot_filled": 0,
        "mistral_filled": 0,
        "still_partial": 0,
        "errors": 0,
    }

    for i, case in enumerate(partial, start=1):
        case_id = case["id"]
        log(f"\n[{i}/{len(partial)}] Case {case_id} — {case['topic']} ({case.get('diagnosis')})")

        try:
            # Source 1 — FMGMatch bundle match (always for partial cases)
            if enrich_fmgmatch(case, bundles):
                stats["fmgmatch_filled"] += 1
                log("  + fmgmatch")

            # Source 2 — LLaVA screenshot (if not yet processed)
            shot = find_screenshot(case_id)
            if shot and not case.get("screenshot_processed"):
                log(f"  llava: {shot.name}")
                if enrich_screenshot(case, shot):
                    stats["screenshot_filled"] += 1
                    log("  + screenshot")
            elif shot and case.get("screenshot_processed"):
                log("  screenshot already processed")

            # Source 3 — Mistral knowledge if still missing orders OR diagnosis
            needs_orders = not case.get("correct_orders")
            needs_dx = case.get("diagnosis") in ("Unknown", None, "")
            if needs_orders or needs_dx:
                log("  mistral knowledge fill")
                if enrich_mistral_knowledge(case):
                    stats["mistral_filled"] += 1
                    log("  + mistral")

            mark_complete(case)
            stats["processed"] += 1

        except Exception as e:
            stats["errors"] += 1
            log(f"  ERROR: {e}")
            log(traceback.format_exc())

        if i % 10 == 0:
            save_all(cases, stats)
            log(f"  >> Saved progress ({i}/{len(partial)} partial processed)")

    stats["still_partial"] = sum(1 for c in cases if not c.get("complete"))
    save_all(cases, stats)

    log("\n================================")
    log("PARTIAL CASE ENRICHMENT REPORT")
    log("================================")
    log(f"Skipped (already complete): {stats['skipped_complete']}")
    log(f"Partial processed:          {stats['processed']}")
    log(f"FMGMatch filled:            {stats['fmgmatch_filled']}")
    log(f"Screenshot filled:          {stats['screenshot_filled']}")
    log(f"Mistral knowledge filled:   {stats['mistral_filled']}")
    log(f"Still partial:              {stats['still_partial']}")
    log(f"Errors:                     {stats['errors']}")
    log(f"Complete now:               {sum(1 for c in cases if c.get('complete'))} / {len(cases)}")
    log("================================")
    log(f"Saved: {JSON_OUT}")
    log(f"Saved: {MD_OUT}")
    log("================================")
    return 0


if __name__ == "__main__":
    sys.exit(main())
