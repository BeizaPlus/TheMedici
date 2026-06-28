#!/usr/bin/env python3
"""Re-extract one CCS case from screenshot via Ollama (llava). Updates data/cases/case_N.json."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_ccs_case_bank_ollama import (  # noqa: E402
    CASES_DIR,
    find_screenshot,
    extract_from_screenshot,
    screenshot_to_case,
    generate_distractors,
    load_presentation_hpi,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("case_id", type=int, help="CCS case number (e.g. 58)")
    parser.add_argument("--topic", default="Shortness of Breath")
    args = parser.parse_args()

    shot = find_screenshot(args.case_id)
    if not shot:
        print(f"No screenshot for case {args.case_id}", file=sys.stderr)
        sys.exit(1)

    print(f"Extracting case {args.case_id} from {shot.name} ...")
    shot_data = extract_from_screenshot(shot)
    if not shot_data:
        print("Ollama vision extraction failed", file=sys.stderr)
        sys.exit(1)

    case = screenshot_to_case(shot_data, args.case_id, args.topic)
    if not case.get("hpi"):
        hpi = load_presentation_hpi(args.topic)
        if hpi:
            case["hpi"] = hpi
            case["source"] = f"{case.get('source', 'screenshot')}+presentation"

    if case.get("correct_orders") and case.get("diagnosis") not in (None, "", "Unknown"):
        distractors = generate_distractors(case["diagnosis"], case["correct_orders"])
        if distractors:
            case["distractors"] = distractors

    out = CASES_DIR / f"case_{args.case_id}.json"
    out.write_text(json.dumps(case, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out}")
    print(f"  diagnosis: {case.get('diagnosis')}")
    print(f"  orders: {len(case.get('correct_orders') or [])}")
    print(f"  should_avoid: {len(case.get('should_avoid') or [])}")
    print(f"  distractors: {len(case.get('distractors') or [])}")


if __name__ == "__main__":
    main()
