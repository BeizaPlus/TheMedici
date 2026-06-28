#!/usr/bin/env python3
"""Merge ccs_cases_master.json fields into preparedCases.json schema."""

from __future__ import annotations

import argparse
import json
import re
from copy import deepcopy
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "data" / "ccs_cases_master.json"
DEST_PATH = ROOT / "game" / "src" / "data" / "preparedCases.json"
TEST_OUTPUT_PATH = ROOT / "scripts" / "migration_test_output.json"
PROGRESS_PATH = ROOT / "scripts" / "migration_progress.json"

PLACEHOLDER_RE = re.compile(r"^(unknown|r\d+-b\d+|a\d+-d\d+)$", re.I)

ZONE_RULES = [
    (re.compile(r"oxygen|o2|pulse ox|monitor|telemetry|ecg|ekg|x-?ray|cxr|ct |mri|imaging|ultrasound|peak flow|abg", re.I), "zone-monitor"),
    (re.compile(r"iv fluid|fluid bolus|normal saline|lactated|transfusion|insulin|heparin|ppi|antibiotic|magnesium|steroid|nebul|epinephrine|lorazepam|morphine|nitro|aspirin|statin|beta-?block|vasopress|pressor|drip", re.I), "zone-iv-bag"),
    (re.compile(r"iv access|large-?bore|central line|needle|decompression|medication|meds|injection|tpa|thrombol|intubat|tube thorac|thoracostomy|splint|pain control", re.I), "zone-arm"),
    (re.compile(r"cbc|bmp|cmp|lab|troponin|culture|type & cross|crossmatch|hCG|pregnancy|glucose|lactate|coag|ua\b|urinalysis|blood draw|std|naat", re.I), "zone-blood"),
    (re.compile(r"admit|icu|ccu|telemetry ward|disposition|consult|ed\b|emergency department|or\b|surgery|gi consult|neuro|ob consult|cardiology|ortho|ent|psych", re.I), "zone-icu"),
    (re.compile(r"abdominal exam|pelvic exam|physical exam|exam\b|neuro exam|rectal", re.I), "zone-custom-1"),
]


def is_bad(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return True
        if PLACEHOLDER_RE.match(text):
            return True
    if isinstance(value, (list, dict)) and len(value) == 0:
        return True
    return False


def pick_num(text: str, pattern: str, fallback=None):
    m = re.search(pattern, text or "", re.I)
    if not m or not m.group(1):
        return fallback
    try:
        n = float(m.group(1))
        return n if n == int(n) else n
    except ValueError:
        return fallback


def parse_vitals_text(vitals_text: str) -> dict:
    t = vitals_text or ""
    temp = pick_num(t, r"Temperature:\s*\n+\s*([\d.]+)") or pick_num(t, r"(?:temp(?:erature)?)[^\d]{0,8}(\d{2,3}(?:\.\d)?)") or 37.0
    hr = pick_num(t, r"Pulse:\s*\n+\s*(\d{2,3})") or pick_num(t, r"(?:heart rate|hr|pulse)[^\d]{0,8}(\d{2,3})") or 100
    rr = pick_num(t, r"Respiratory rate:\s*\n+\s*(\d{1,2})") or pick_num(t, r"(?:resp(?:iratory)? rate|rr)[^\d]{0,8}(\d{1,2})") or 18
    bp_match = re.search(r"(?:bp|blood pressure)[^\d]{0,8}(\d{2,3})\s*/\s*(\d{2,3})", t, re.I)
    sbp = pick_num(t, r"systolic:\s*\n+\s*(\d{2,3})") or (float(bp_match.group(1)) if bp_match else 110)
    dbp = pick_num(t, r"diastolic:\s*\n+\s*(\d{2,3})") or (float(bp_match.group(2)) if bp_match else 70)
    spo2 = pick_num(t, r"(?:spo2|o2 sat(?:uration)?)[^\d]{0,8}(\d{2,3})") or 96
    lactate = pick_num(t, r"lactate[^\d]{0,8}(\d(?:\.\d)?)") or 1.8
    return {
        "sbp": int(sbp),
        "dbp": int(dbp),
        "hr": int(hr),
        "rr": int(rr),
        "temp": round(float(temp), 1),
        "spo2": int(spo2),
        "lactate": round(float(lactate), 1),
    }


def infer_zone(label: str) -> str:
    for pattern, zone in ZONE_RULES:
        if pattern.search(label):
            return zone
    return "zone-arm"


def slugify(label: str, idx: int) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")[:40]
    return base or f"order-{idx}"


def orders_to_interventions(orders: list, rationale: dict | None, case_id: int) -> list:
    out = []
    for idx, order in enumerate(orders or []):
        if isinstance(order, str):
            label = order.strip()
            why = (rationale or {}).get(label, "Required for this case presentation.")
        elif isinstance(order, dict):
            label = (order.get("order") or order.get("label") or "").strip()
            why = order.get("rationale") or order.get("why") or (rationale or {}).get(label, "Required for this case presentation.")
        else:
            continue
        if is_bad(label):
            continue
        out.append(
            {
                "id": slugify(label, idx),
                "label": label,
                "correct_zone": infer_zone(label),
                "why": why,
                "guideline": "ACEP",
            }
        )
    return out


def distractors_to_decoys(distractors: list, case_id: int) -> list:
    out = []
    for idx, item in enumerate(distractors or []):
        if isinstance(item, str):
            label = item.strip()
            why = "Incorrect for this presentation."
        elif isinstance(item, dict):
            label = (item.get("order") or "").strip()
            why = item.get("why_wrong") or item.get("why") or "Incorrect for this presentation."
        else:
            continue
        if is_bad(label):
            continue
        out.append(
            {
                "id": f"decoy-bank-{case_id}-{idx}",
                "label": label,
                "why": why,
                "correct_zone": "zone-custom-2",
            }
        )
    return out


def normalize_case_id(value) -> str:
    try:
        return str(int(value)).zfill(3)
    except (TypeError, ValueError):
        return str(value).zfill(3)


def source_by_id(source_doc: dict) -> dict[str, dict]:
    out = {}
    for case in source_doc.get("cases", []):
        if case.get("id") is None:
            continue
        out[normalize_case_id(case["id"])] = case
    return out


def merge_narrative_hpi(existing: dict, hpi: str) -> tuple[dict, bool]:
    if is_bad(hpi) or len(hpi.strip()) <= 50:
        return existing, False
    merged = deepcopy(existing)
    narrative = merged.setdefault("narrative", {})
    changed = False
    for audience in ("doctor", "patient"):
        block = narrative.setdefault(audience, {})
        for level in ("easy", "standard", "hard"):
            entry = block.setdefault(level, {})
            if entry.get("hpi") != hpi:
                entry["hpi"] = hpi
                changed = True
            if audience == "doctor" and level == "standard" and entry.get("intro") != hpi[:240]:
                if is_bad(entry.get("intro")) or len(str(entry.get("intro") or "")) < 80:
                    entry["intro"] = hpi[:240]
                    changed = True
    return merged, changed


def merge_case(existing: dict, new: dict, stats: dict) -> dict:
    merged = deepcopy(existing)
    case_num = int(new.get("id") or existing.get("id") or 0)

    def set_if(field: str, value):
        if is_bad(value):
            stats["kept"] += 1
            return
        if merged.get(field) != value:
            merged[field] = value
            stats["updated"] += 1

    title = new.get("topic") or new.get("title")
    set_if("title", title)

    set_if("diagnosis", new.get("diagnosis"))

    if not is_bad(new.get("hpi")) and len(str(new.get("hpi")).strip()) > 50:
        merged, hpi_changed = merge_narrative_hpi(merged, new["hpi"].strip())
        if hpi_changed:
            stats["updated"] += 1
        merged["vitalsText"] = re.sub(r"\s+", " ", str(new.get("vitals") or merged.get("vitalsText") or "")).strip()
        merged["hasSourceIntro"] = True
    else:
        stats["kept"] += 1

    if isinstance(new.get("physical_exam"), list) and len(new["physical_exam"]) > 0:
        merged["exam"] = new["physical_exam"]
        stats["updated"] += 1

    if isinstance(new.get("vitals"), str) and not is_bad(new.get("vitals")):
        parsed = parse_vitals_text(new["vitals"])
        if parsed:
            merged["vitals"] = parsed
            merged["vitalsSource"] = "ccs_master"
            merged["vitalsText"] = re.sub(r"\s+", " ", new["vitals"]).strip()
            stats["updated"] += 1

    if isinstance(new.get("correct_orders"), list) and len(new["correct_orders"]) > 0:
        interventions = orders_to_interventions(new["correct_orders"], new.get("rationale") or {}, case_num)
        if interventions:
            merged["interventions"] = interventions
            merged["interventionIds"] = [iv["id"] for iv in interventions]
            merged["playbookKey"] = f"case-bank-{case_num}"
            stats["updated"] += 1

    if isinstance(new.get("distractors"), list) and len(new["distractors"]) > 0:
        decoys = distractors_to_decoys(new["distractors"], case_num)
        if decoys:
            merged["decoys"] = decoys
            stats["updated"] += 1

    if not is_bad(new.get("patient_voice")):
        merged["patientVoice"] = new["patient_voice"]
        stats["updated"] += 1

    summary = new.get("case_summary")
    if not is_bad(summary) and len(str(summary).strip()) > 100:
        merged["summary"] = str(summary).strip()
        stats["updated"] += 1

    if not is_bad(new.get("source")):
        merged["caseBankSource"] = new["source"]
        stats["updated"] += 1

    return merged


def case_summary(case: dict) -> str:
    hpi = (
        case.get("narrative", {})
        .get("doctor", {})
        .get("standard", {})
        .get("hpi", "")
    )
    return f"diagnosis=[{(case.get('diagnosis') or '')[:60]}] hpi=[{len(hpi)} chars]"


def run_migration(case_ids: list[int] | None = None, save_dest: bool = False, progress_every: int = 10):
    source_doc = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    dest_doc = json.loads(DEST_PATH.read_text(encoding="utf-8"))
    src_map = source_by_id(source_doc)
    cases = dest_doc.setdefault("cases", {})

    ids = [normalize_case_id(i) for i in case_ids] if case_ids else sorted(cases.keys(), key=lambda x: int(x))
    stats = {"updated": 0, "kept": 0, "processed": 0, "skipped": [], "failed": []}
    output_cases = {}

    for idx, case_id in enumerate(ids, start=1):
        existing = cases.get(case_id)
        new = src_map.get(case_id)
        if not existing:
            stats["skipped"].append({"id": case_id, "reason": "missing in preparedCases"})
            continue
        if not new:
            stats["skipped"].append({"id": case_id, "reason": "missing in source"})
            output_cases[case_id] = existing
            continue
        try:
            before = case_summary(existing)
            merged = merge_case(existing, new, stats)
            after = case_summary(merged)
            print(f"Case {int(case_id)} — BEFORE: {before}")
            print(f"Case {int(case_id)} — AFTER:  {after}")
            output_cases[case_id] = merged
            stats["processed"] += 1
        except Exception as exc:  # noqa: BLE001
            stats["failed"].append({"id": case_id, "error": str(exc)})
            output_cases[case_id] = existing
            continue

        if save_dest and progress_every and idx % progress_every == 0:
            partial = deepcopy(dest_doc)
            partial["cases"].update(output_cases)
            partial["migrationProgressAt"] = datetime.now().isoformat()
            PROGRESS_PATH.write_text(json.dumps(partial, indent=2), encoding="utf-8")
            print(f"Progress saved ({idx}/{len(ids)})")

    if save_dest:
        final = deepcopy(dest_doc)
        for case_id, merged in output_cases.items():
            final["cases"][case_id] = merged
        final["builtAt"] = datetime.now().isoformat()
        final["migratedAt"] = datetime.now().isoformat()
        final["migrationSource"] = str(SOURCE_PATH)
        DEST_PATH.write_text(json.dumps(final, indent=2), encoding="utf-8")

    return output_cases, stats


def main():
    parser = argparse.ArgumentParser(description="Migrate ccs_cases_master into preparedCases.json")
    parser.add_argument("--test", action="store_true", help="Run 5-case test only")
    parser.add_argument("--all", action="store_true", help="Migrate all cases and save preparedCases.json")
    parser.add_argument("--ids", type=str, help="Comma-separated case ids")
    args = parser.parse_args()

    if args.all:
        _, stats = run_migration(save_dest=True, progress_every=10)
        print("\n================================")
        print("MIGRATION COMPLETE")
        print("================================")
        print(f"Cases processed:      {stats['processed']}")
        print(f"Fields updated:       {stats['updated']}")
        print(f"Fields kept from old: {stats['kept']}")
        print(f"Skipped (bad data):   {len(stats['skipped'])}")
        print(f"Failed cases:         {stats['failed']}")
        print("================================")
        return

    if args.ids:
        ids = [int(x.strip()) for x in args.ids.split(",") if x.strip()]
    elif args.test:
        ids = [1, 2, 35, 121, 143]
    else:
        parser.error("Use --test, --all, or --ids")

    output_cases, stats = run_migration(case_ids=ids, save_dest=False)
    TEST_OUTPUT_PATH.write_text(
        json.dumps({"testedAt": datetime.now().isoformat(), "caseIds": ids, "cases": output_cases, "stats": stats}, indent=2),
        encoding="utf-8",
    )
    print(f"\nTest output saved -> {TEST_OUTPUT_PATH}")
    print("Waiting for Master confirmation before running all 181.")


if __name__ == "__main__":
    main()
