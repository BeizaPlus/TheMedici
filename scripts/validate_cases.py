#!/usr/bin/env python3
"""Validate CCS case bank — structure, clinical sense, screenshot cross-check."""

from __future__ import annotations

import argparse
import base64
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

try:
    import ollama
except ImportError:
    print("ERROR: pip install ollama")
    sys.exit(1)

ROOT = Path(r"C:\Users\steve\MeWorld")
DATA = ROOT / "data"
DEFAULT_CASES = Path(r"C:\Users\steve\Downloads\clinical-scene\data\cases.json")
SCREENSHOT_DIR = ROOT / "game" / "ccs_screenshots"
REPORT_FILE = DATA / "validation_report.json"
REVIEW_FILE = DATA / "cases_needing_review.json"
PROGRESS_FILE = DATA / "validation_progress.json"

TEXT_MODEL = "mistral"
VISION_MODEL = "llava"

GENERIC_DISTRACTOR_PHRASES = (
    "discharge paperwork",
    "outpatient referral",
    "insurance",
    "diet counseling handout",
)

PLACEHOLDER_PATTERNS = (
    r"^order\d+$",
    r"^reason$",
    r"^exact text",
    r"^null$",
    r"^n/?a$",
    r"^not specified",
    r"^unknown$",
    r"^todo$",
    r"^placeholder$",
    r"^example$",
)

STRUCTURE_FIELDS = (
    "id",
    "title",
    "diagnosis",
    "correct_orders",
    "correct_order_rationales",
    "hpi",
    "patient_voice.chief_complaint",
    "distractors",
    "distractors_not_generic",
)


def log(msg: str) -> None:
    print(msg, flush=True)


def load_json(path: Path, default: Any = None) -> Any:
    if not path.is_file():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def is_populated(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return False
        lower = text.lower()
        for pat in PLACEHOLDER_PATTERNS:
            if re.match(pat, lower, re.I):
                return False
        return True
    if isinstance(value, (list, dict)):
        return len(value) > 0
    return True


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        parts = []
        for key in ("history", "reason_for_visit", "text"):
            if value.get(key):
                parts.append(str(value[key]).strip())
        if not parts:
            parts = [str(v).strip() for v in value.values() if v]
        return " ".join(p for p in parts if p)
    return str(value).strip()


def order_label(item: Any) -> str:
    if isinstance(item, str):
        return item.strip()
    if isinstance(item, dict):
        return str(item.get("order") or item.get("label") or "").strip()
    return str(item).strip()


def order_rationale(item: Any, case: dict) -> str:
    if isinstance(item, dict):
        rat = item.get("rationale") or item.get("reason") or ""
        if rat:
            return str(rat).strip()
    label = order_label(item)
    answer_key = case.get("answer_key") or {}
    for bucket in (
        "correctly_ordered",
        "should_have_ordered",
        "treatment_correctly_ordered",
    ):
        for entry in answer_key.get(bucket) or []:
            if isinstance(entry, dict) and order_label(entry) == label:
                return str(entry.get("rationale") or "").strip()
    rationale_map = case.get("rationale") or case.get("order_details") or {}
    if isinstance(rationale_map, dict) and label in rationale_map:
        return str(rationale_map[label]).strip()
    return ""


def get_correct_orders(case: dict) -> list[Any]:
    orders = case.get("correct_orders")
    if orders:
        return list(orders)
    answer_key = case.get("answer_key") or {}
    merged: list[Any] = []
    for bucket in ("correctly_ordered", "treatment_correctly_ordered"):
        for entry in answer_key.get(bucket) or []:
            if entry and order_label(entry):
                merged.append(entry)
    return merged


def get_distractors(case: dict) -> list[Any]:
    distractors = case.get("distractors")
    if distractors is not None:
        return list(distractors)
    return []


def distractor_text(item: Any) -> str:
    if isinstance(item, str):
        return item.lower()
    if isinstance(item, dict):
        return " ".join(
            str(item.get(k, ""))
            for k in ("order", "label", "why_wrong", "reason")
        ).lower()
    return str(item).lower()


def structure_check(case: dict) -> dict[str, bool]:
    checks: dict[str, bool] = {}
    checks["id"] = is_populated(case.get("id"))
    checks["title"] = is_populated(case.get("title"))
    checks["diagnosis"] = is_populated(case.get("diagnosis"))

    correct_orders = get_correct_orders(case)
    checks["correct_orders"] = len(correct_orders) >= 3
    checks["correct_order_rationales"] = bool(correct_orders) and all(
        is_populated(order_rationale(o, case)) for o in correct_orders
    )

    hpi_text = normalize_text(case.get("hpi") or case.get("case_introduction"))
    checks["hpi"] = len(hpi_text) >= 50

    voice = case.get("patient_voice") or {}
    checks["patient_voice.chief_complaint"] = is_populated(voice.get("chief_complaint"))

    distractors = get_distractors(case)
    checks["distractors"] = len(distractors) == 4

    contaminated = False
    for item in distractors:
        text = distractor_text(item)
        if any(phrase in text for phrase in GENERIC_DISTRACTOR_PHRASES):
            contaminated = True
            break
    checks["distractors_not_generic"] = (not contaminated) if len(distractors) == 4 else True

    return checks


def structure_failures(checks: dict[str, bool]) -> list[str]:
    labels = {
        "id": "missing id",
        "title": "missing title",
        "diagnosis": "missing diagnosis",
        "correct_orders": "correct_orders < 3",
        "correct_order_rationales": "missing order rationales",
        "hpi": "hpi too short or missing",
        "patient_voice.chief_complaint": "missing patient_voice.chief_complaint",
        "distractors": "distractors != 4",
        "distractors_not_generic": "generic distractor contamination",
    }
    return [labels[k] for k, ok in checks.items() if not ok]


def detect_vision_model() -> str:
    result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
    installed = result.stdout.lower()
    for candidate in ("llava:34b", "llava:13b", "llava", "bakllava", "minicpm-v", "moondream"):
        if candidate in installed:
            return candidate
    return VISION_MODEL


def parse_json_response(raw: str) -> dict | None:
    if not raw:
        return None
    clean = raw.strip()
    clean = re.sub(r"^```(?:json)?\s*", "", clean, flags=re.I)
    clean = re.sub(r"\s*```$", "", clean)
    start = clean.find("{")
    end = clean.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(clean[start : end + 1])
    except json.JSONDecodeError:
        return None


def clinical_sense_check(case: dict, model: str) -> dict:
    title = case.get("title") or ""
    diagnosis = case.get("diagnosis") or ""
    correct_orders = [order_label(o) for o in get_correct_orders(case)]
    distractors = get_distractors(case)
    distractor_labels = [
        order_label(d) if isinstance(d, dict) else str(d)
        for d in distractors
    ]
    hpi = normalize_text(case.get("hpi") or case.get("case_introduction"))

    prompt = f"""You are a Step 3 CCS examiner.
Review this case entry and flag any problems:

Case: {title}
Diagnosis: {diagnosis}
Correct orders: {json.dumps(correct_orders)}
Distractors: {json.dumps(distractor_labels)}
HPI excerpt: {hpi[:600]}

Check:
1. Do the correct orders make clinical sense for this diagnosis?
2. Are the distractors actually wrong for this case or could they be correct?
3. Does the HPI match the diagnosis?
4. Are there any obvious errors?

Return JSON only:
{{
  "passes": true,
  "issues": [],
  "confidence": "high"
}}"""

    try:
        response = ollama.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0},
        )
        raw = response["message"]["content"]
    except Exception as exc:
        return {
            "passes": False,
            "issues": [f"ollama error: {exc}"],
            "confidence": "low",
            "raw_response": None,
        }

    parsed = parse_json_response(raw)
    if parsed is None:
        return {
            "passes": False,
            "issues": ["clinical check JSON parse failed"],
            "confidence": "low",
            "raw_response": raw[:2000],
        }

    parsed.setdefault("passes", False)
    parsed.setdefault("issues", [])
    parsed.setdefault("confidence", "low")
    return parsed


def normalize_diagnosis(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s/\-]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def diagnoses_match(a: str, b: str) -> bool:
    na = normalize_diagnosis(a)
    nb = normalize_diagnosis(b)
    if not na or not nb:
        return False
    if na == nb or na in nb or nb in na:
        return True
    return SequenceMatcher(None, na, nb).ratio() >= 0.72


def list_screenshots() -> dict[int, Path]:
    mapping: dict[int, Path] = {}
    for path in sorted(SCREENSHOT_DIR.glob("case_*.png")):
        match = re.match(r"case_(\d+)_", path.name, re.I)
        if match:
            mapping[int(match.group(1))] = path
    return mapping


def screenshot_diagnosis(path: Path, model: str) -> str | None:
    image_data = base64.b64encode(path.read_bytes()).decode()
    prompt = (
        "This is a CCS case review screenshot. "
        "Return JSON only: {\"diagnosis\": \"exact final diagnosis text from screenshot or empty string\"}"
    )
    try:
        response = ollama.chat(
            model=model,
            messages=[{"role": "user", "content": prompt, "images": [image_data]}],
            options={"temperature": 0},
        )
        raw = response["message"]["content"]
    except Exception:
        return None
    parsed = parse_json_response(raw)
    if not parsed:
        return None
    diag = parsed.get("diagnosis")
    return str(diag).strip() if diag else None


def grade_case(
    structure_ok: bool,
    structure_issues: list[str],
    clinical: dict | None,
    screenshot: dict | None,
) -> str:
    critical = {
        "missing id",
        "missing title",
        "missing diagnosis",
        "correct_orders < 3",
    }
    if any(issue in critical for issue in structure_issues):
        return "broken"

    if clinical and not clinical.get("passes") and clinical.get("confidence") == "low":
        return "broken"

    if screenshot and screenshot.get("status") == "mismatch":
        return "needs_review"

    if not structure_ok:
        return "needs_review"

    if clinical and not clinical.get("passes"):
        return "needs_review"

    if clinical and clinical.get("confidence") == "medium":
        return "needs_review"

    return "ready"


def priority_for(problems: list[str]) -> str:
    high_markers = (
        "missing diagnosis",
        "screenshot diagnosis mismatch",
        "clinical check failed",
        "generic distractor contamination",
        "correct_orders < 3",
    )
    if any(any(m in p for m in high_markers) for p in problems):
        return "high"
    if any("clinical" in p or "distractor" in p or "hpi" in p for p in problems):
        return "medium"
    return "low"


def print_summary(report: dict) -> None:
    s = report["summary"]
    log("")
    log("================================")
    log("CASE BANK VALIDATION REPORT")
    log("================================")
    log(f"Total cases: {s['total_cases']}")
    log("")
    log("STRUCTURE CHECKS:")
    log(f"  Pass: {s['structure_pass']}")
    log(f"  Fail: {s['structure_fail']}")
    if s["structure_issue_ids"]:
        log(f"  Issues: {s['structure_issue_ids']}")
    log("")
    log("CLINICAL SENSE CHECKS:")
    log(f"  High confidence: {s['clinical_high']}")
    log(f"  Medium confidence: {s['clinical_medium']}")
    log(f"  Low confidence: {s['clinical_low']}")
    log(f"  Failed: {s['clinical_failed']} - {s['clinical_failed_ids'] or 'none'}")
    log("")
    log("SCREENSHOT MISMATCHES:")
    log(f"  Matched: {s['screenshot_matched']}")
    log(f"  Mismatched: {s['screenshot_mismatched']} - {s['screenshot_mismatch_ids'] or 'none'}")
    log(f"  No screenshot: {s['screenshot_missing']}")
    log(f"  Skipped: {s['screenshot_skipped']}")
    log("")
    log("GENERIC DISTRACTOR CONTAMINATION:")
    log(f"  Clean: {s['distractor_clean']}")
    log(f"  Contaminated: {s['distractor_contaminated']} - {s['distractor_contaminated_ids'] or 'none'}")
    log("")
    log("OVERALL GRADE:")
    log(f"  Ready for app: {s['ready']} cases")
    log(f"  Needs review: {s['needs_review']} cases")
    log(f"  Broken: {s['broken']} cases")
    log("================================")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate CCS case bank")
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES)
    parser.add_argument("--structure-only", action="store_true")
    parser.add_argument("--skip-screenshots", action="store_true")
    parser.add_argument("--text-model", default=TEXT_MODEL)
    parser.add_argument("--vision-model", default=None)
    parser.add_argument("--case-ids", type=str, help="Comma-separated case ids")
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    payload = load_json(args.cases)
    if not payload or not payload.get("cases"):
        raise SystemExit(f"No cases found in {args.cases}")

    cases = payload["cases"]
    if args.case_ids:
        wanted = {int(x.strip()) for x in args.case_ids.split(",") if x.strip()}
        cases = [c for c in cases if c.get("id") in wanted]

    progress = load_json(PROGRESS_FILE, {"clinical": {}, "screenshots": {}}) if args.resume else {"clinical": {}, "screenshots": {}}
    vision_model = args.vision_model or detect_vision_model()
    screenshots = list_screenshots()

    per_case: list[dict] = []
    review_cases: list[dict] = []

    for case in sorted(cases, key=lambda c: c.get("id", 0)):
        case_id = case.get("id")
        checks = structure_check(case)
        structure_ok = all(checks.values())
        structure_issues = structure_failures(checks)

        clinical = None
        if not args.structure_only:
            key = str(case_id)
            if args.resume and key in progress.get("clinical", {}):
                clinical = progress["clinical"][key]
            else:
                clinical = clinical_sense_check(case, args.text_model)
                progress.setdefault("clinical", {})[key] = clinical
                save_json(PROGRESS_FILE, progress)

        screenshot_result = {"status": "skipped"}
        if not args.skip_screenshots and not args.structure_only:
            if case_id not in screenshots:
                screenshot_result = {"status": "no_screenshot"}
            else:
                key = str(case_id)
                if args.resume and key in progress.get("screenshots", {}):
                    screenshot_result = progress["screenshots"][key]
                else:
                    shot_diag = screenshot_diagnosis(screenshots[case_id], vision_model)
                    json_diag = case.get("diagnosis") or ""
                    if not shot_diag:
                        screenshot_result = {
                            "status": "unreadable",
                            "screenshot": screenshots[case_id].name,
                        }
                    elif diagnoses_match(json_diag, shot_diag):
                        screenshot_result = {
                            "status": "matched",
                            "screenshot": screenshots[case_id].name,
                            "screenshot_diagnosis": shot_diag,
                        }
                    else:
                        screenshot_result = {
                            "status": "mismatch",
                            "screenshot": screenshots[case_id].name,
                            "json_diagnosis": json_diag,
                            "screenshot_diagnosis": shot_diag,
                        }
                    progress.setdefault("screenshots", {})[key] = screenshot_result
                    save_json(PROGRESS_FILE, progress)

        overall = grade_case(structure_ok, structure_issues, clinical, screenshot_result)

        problems = list(structure_issues)
        if clinical:
            if not clinical.get("passes"):
                problems.append("clinical check failed")
            for issue in clinical.get("issues") or []:
                problems.append(f"clinical: {issue}")
            if clinical.get("confidence") == "low":
                problems.append("low confidence clinical check")
        if screenshot_result.get("status") == "mismatch":
            problems.append("screenshot diagnosis mismatch")
        if screenshot_result.get("status") == "unreadable":
            problems.append("screenshot unreadable")

        entry = {
            "id": case_id,
            "title": case.get("title"),
            "structure": checks,
            "structure_ok": structure_ok,
            "structure_issues": structure_issues,
            "clinical": clinical,
            "screenshot": screenshot_result,
            "overall_grade": overall,
            "problems": problems,
        }
        per_case.append(entry)

        if overall != "ready":
            review_cases.append(
                {
                    "id": case_id,
                    "title": case.get("title"),
                    "problems": problems,
                    "priority": priority_for(problems),
                    "overall_grade": overall,
                }
            )

    structure_pass = sum(1 for c in per_case if c["structure_ok"])
    clinical_failed_ids = [
        c["id"] for c in per_case if c.get("clinical") and not c["clinical"].get("passes")
    ]
    confidence_counts = {"high": 0, "medium": 0, "low": 0}
    for c in per_case:
        conf = (c.get("clinical") or {}).get("confidence")
        if conf in confidence_counts:
            confidence_counts[conf] += 1

    screenshot_matched = sum(1 for c in per_case if c["screenshot"].get("status") == "matched")
    screenshot_mismatched = sum(1 for c in per_case if c["screenshot"].get("status") == "mismatch")
    screenshot_missing = sum(1 for c in per_case if c["screenshot"].get("status") == "no_screenshot")
    screenshot_skipped = sum(1 for c in per_case if c["screenshot"].get("status") == "skipped")

    distractor_contaminated_ids = [
        c["id"]
        for c in per_case
        if c["structure"].get("distractors") and not c["structure"].get("distractors_not_generic")
    ]
    distractor_clean = sum(
        1
        for c in per_case
        if c["structure"].get("distractors") and c["structure"].get("distractors_not_generic")
    )

    ready = sum(1 for c in per_case if c["overall_grade"] == "ready")
    needs_review = sum(1 for c in per_case if c["overall_grade"] == "needs_review")
    broken = sum(1 for c in per_case if c["overall_grade"] == "broken")

    structure_issue_ids = [c["id"] for c in per_case if not c["structure_ok"]]
    screenshot_mismatch_ids = [
        c["id"] for c in per_case if c["screenshot"].get("status") == "mismatch"
    ]

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cases_file": str(args.cases),
        "models": {"text": args.text_model, "vision": vision_model},
        "summary": {
            "total_cases": len(per_case),
            "structure_pass": structure_pass,
            "structure_fail": len(per_case) - structure_pass,
            "structure_issue_ids": structure_issue_ids,
            "clinical_high": confidence_counts["high"],
            "clinical_medium": confidence_counts["medium"],
            "clinical_low": confidence_counts["low"],
            "clinical_failed": len(clinical_failed_ids),
            "clinical_failed_ids": clinical_failed_ids,
            "screenshot_matched": screenshot_matched,
            "screenshot_mismatched": screenshot_mismatched,
            "screenshot_mismatch_ids": screenshot_mismatch_ids,
            "screenshot_missing": screenshot_missing,
            "screenshot_skipped": screenshot_skipped,
            "distractor_clean": distractor_clean,
            "distractor_contaminated": len(distractor_contaminated_ids),
            "distractor_contaminated_ids": distractor_contaminated_ids,
            "ready": ready,
            "needs_review": needs_review,
            "broken": broken,
        },
        "cases": per_case,
    }

    save_json(REPORT_FILE, report)
    save_json(REVIEW_FILE, {"cases": review_cases})
    print_summary(report)
    log(f"\nSaved report -> {REPORT_FILE}")
    log(f"Saved review list -> {REVIEW_FILE}")


if __name__ == "__main__":
    main()
