#!/usr/bin/env python3
"""Extract case data from CCS review screenshots: Pytesseract OCR -> Ollama parse -> JSON."""

from __future__ import annotations

import argparse
import os
import hashlib
import json
import sys
import time
from pathlib import Path

try:
    import pytesseract
    from PIL import Image
except ImportError:
    print("ERROR: pip install pytesseract pillow")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("ERROR: pip install requests")
    sys.exit(1)

# Windows: winget installs Tesseract here; add to PATH for pytesseract.
_TESSERACT_DIR = Path(r"C:\Program Files\Tesseract-OCR")
if _TESSERACT_DIR.is_dir():
    os.environ["PATH"] = f"{_TESSERACT_DIR};{os.environ.get('PATH', '')}"
    pytesseract.pytesseract.tesseract_cmd = str(_TESSERACT_DIR / "tesseract.exe")

ROOT_DIR = Path(__file__).resolve().parent.parent
SCREENSHOT_DIR = ROOT_DIR / "game" / "ccs_screenshots"
TOPICS_FILE = SCREENSHOT_DIR / "ccs_topics.txt"
OUTPUT_FILE = ROOT_DIR / "game" / "data" / "ollama" / "cases.json"
STRUCTURED_CASE_DIR = ROOT_DIR / "game" / "data" / "ollama" / "cases"

TEXT_MODEL = "mistral"
OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"

FAILED_CASE_IDS = [
    145, 146, 148, 149, 150, 151, 152, 153, 154,
    156, 157, 159, 160, 161, 162, 163, 164, 165,
    166, 167, 168, 169, 170, 172, 173, 181,
]

NO_SCREENSHOT_IDS = [
    27, 37, 47, 53, 55, 59, 65, 70, 72, 83, 92,
    103, 108, 114, 116, 117, 121, 124, 128, 129,
    131, 132, 141, 144, 147, 155, 158, 171, 174,
    175, 176, 177, 178, 179, 180,
]

OLLAMA_PARSE_PROMPT = """You are processing raw OCR text from a medical simulation screenshot.

RAW OCR TEXT:
{ocr_text}

Do two things:

1. Extract these fields — only use words present in the OCR text above, null if absent:
- case_number (integer)
- title (string) — chief complaint / case name only (e.g. "Vaginal Itching", not "Case Diagnosis")
- location (ER / ICU / OBS / WARD / Inpatient)
- stacks (array of order cards — see rules below)
- vitals (hr, spo2, bp, rr, temp)

Title extraction:
- title = the chief complaint / case name only
- Look for the large bold text that is the actual medical condition name
- Ignore page titles, tab names, button labels (e.g. skip "Case Diagnosis")

2. Write hpi_narrative using this format:
"[Mr/Ms] X is a [age]-year-old [sex] with [PMH] who presents with [chief complaint].
[Onset, character, severity, associated symptoms, pertinent negatives].
[The clinical question this case forces you to answer]."
Base only on what the title and stack labels imply. No fabrication.

Return only valid JSON, no markdown, no explanation:
{{
  "case_number": {case_number},
  "title": null,
  "location": null,
  "hpi_raw": null,
  "hpi_narrative": null,
  "stacks": [],
  "vitals": {{"hr": null, "spo2": null, "bp": null, "rr": null, "temp": null}}
}}

For stacks — the screenshot shows order cards. Each card has:
- A status: "Correctly Ordered", "Should have Ordered", or "Optional"
- An order name: the actual clinical order text after the status

Extract ONLY the order name as the label. The status goes in the type field.
Reason text is NOT a stack — put it in the finding field of the preceding stack.

Rules:
- label = the clinical order name only (e.g. "CBC with differential")
- type = "correctlyOrdered" / "shouldHaveOrdered" / "optional" / null
- finding = the Reason text that follows this order, if present
- SKIP any label that is UI text: scores, percentages, dates,
  "Weight given", "Diagnosis Orders:", "Treatment Orders:",
  "Appropriate Disposition", "Your Score", "Completed"

Example input OCR:
"Correctly Ordered
Physical Exam: Abdomen
Reason: This is the patient's chief complaint"

Example output:
{{"label": "Physical Exam: Abdomen", "type": "correctlyOrdered",
 "finding": "This is the patient's chief complaint", "aliases": []}}"""

RETRY_SUFFIX = (
    "\n\nReturn ONLY a JSON object. No explanation. "
    "No markdown. Just the raw JSON starting with {"
)

EMPTY_PHYSICAL_EXAM = {
    "general": None,
    "cardiovascular": None,
    "respiratory": None,
    "abdominal": None,
    "neurological": None,
    "skin": None,
    "heent": None,
    "musculoskeletal": None,
    "genitourinary": None,
    "psychiatric": None,
}

EMPTY_VITALS = {
    "hr": None,
    "spo2": None,
    "bp": None,
    "rr": None,
    "temp": None,
}

GOLD_STANDARD_EXAMPLE = """
EXAMPLE OF A PERFECT EXTRACTION — use this as your quality target:

{
  "case_number": 105,
  "title": "Abdominal Pain",
  "specialty": "OB/GYN",
  "chief_complaint": "Abdominal Pain",
  "patient": "Female, 29",
  "location": "ER",
  "diagnosis": "Hemoperitoneum from a Ruptured Ovarian Cyst",
  "hpi_narrative": "Ms. X is a 29-year-old woman with no significant past medical history who presents to the emergency department with acute onset severe abdominal pain. The pain is diffuse, sharp, and came on suddenly, associated with nausea. She denies fever or vaginal bleeding. On arrival she is tachycardic with a dropping hematocrit, and imaging demonstrates hemoperitoneum. Ectopic pregnancy has not yet been excluded.",
  "physical_exam": {
    "general": "Patient in severe pain. General appearance examination warranted.",
    "cardiovascular": null,
    "respiratory": null,
    "abdominal": "Guarding and severe tenderness present. Abdomen is chief concern.",
    "neurological": null,
    "skin": null,
    "heent": null,
    "musculoskeletal": null,
    "genitourinary": "Genital exam indicated — genitalia part of differential for abdominal pain."
  },
  "stacks": [
    {
      "label": "Physical Exam: Genitalia",
      "type": "correctlyOrdered",
      "finding": "Genital area is part of the differential for abdominal pain.",
      "aliases": []
    },
    {
      "label": "Physical Exam: General Appearance",
      "type": "correctlyOrdered",
      "finding": "Patient having severe pain — appropriate to look at patient to help guide diagnosis.",
      "aliases": []
    },
    {
      "label": "CBC with differential",
      "type": "shouldHaveOrdered",
      "finding": "Important to check for blood loss — patient having symptoms of hemoperitoneum.",
      "aliases": []
    },
    {
      "label": "HCG beta urine qualitative / HCG beta serum qualitative",
      "type": "correctlyOrdered",
      "finding": "Necessary to differentiate ruptured ovarian cyst from ruptured ectopic pregnancy.",
      "aliases": []
    },
    {
      "label": "US abdomen / US pelvis transvaginal / CT abdomen pelvis with contrast",
      "type": "correctlyOrdered",
      "finding": "Ultrasound is study of choice. Will show ruptured ovarian cyst with hemoperitoneum.",
      "aliases": []
    },
    {
      "label": "Surgical consult / Obstetrics / Gynecology",
      "type": "correctlyOrdered",
      "finding": "Patient will require surgical intervention. Laparotomy indicated.",
      "aliases": []
    }
  ],
  "vitals": {
    "hr": "118",
    "spo2": null,
    "bp": "100/61",
    "rr": null,
    "temp": null
  }
}

WHAT MAKES THIS GOOD:
- title is the actual chief complaint, not UI text
- hpi_narrative has no brackets, no placeholders, reads like a real clinical presentation
- physical_exam only populates systems with actual findings — rest are null
- stacks have clean clinical labels, correct type, and finding = the reason from the case
- vitals only include values actually visible in the screenshot
- no UI noise: no scores, percentages, "Correctly Ordered" as a label, dates, metadata
"""


def ocr_screenshot(image_path: Path) -> str:
    """Pure OCR — returns raw text string only."""
    img = Image.open(image_path)
    return pytesseract.image_to_string(img)


def process_with_ollama(ocr_text: str, case_number: int, *, retry: bool = False) -> dict:
    """Ollama handles all parsing + HPI rewrite in one call."""
    prompt = f"""{GOLD_STANDARD_EXAMPLE}

Now extract the following case using the same quality standard.

RAW OCR TEXT:
{ocr_text}

Return only valid JSON matching the structure above. No markdown. No explanation."""
    if retry:
        prompt += RETRY_SUFFIX
    response = requests.post(
        OLLAMA_GENERATE_URL,
        json={"model": TEXT_MODEL, "prompt": prompt, "stream": False},
        timeout=300,
    )
    response.raise_for_status()
    raw = response.json().get("response", "")
    raw = raw.replace("```json", "").replace("```", "").strip()
    return parse_ocr_json(raw)


def validate_output(case_data: dict, ocr_text: str) -> list[str]:
    errors: list[str] = []
    _ = ocr_text

    raw = json.dumps(case_data)
    if "[object Object]" in raw:
        errors.append("Contains [object Object] — object not serialized correctly")

    hpi = case_data.get("hpi_narrative")
    if hpi and not isinstance(hpi, str):
        errors.append(f"hpi_narrative is {type(hpi)} not string")

    if hpi:
        bad_phrases = [
            "clinical pathway",
            "case focus",
            "setting:",
            "minute case",
            "initial vitals",
            "management plan",
            "weight given",
            "total score",
            "correctly ordered",
            "should have ordered",
            "[object",
            "object]",
        ]
        for phrase in bad_phrases:
            if phrase.lower() in hpi.lower():
                errors.append(f"hpi_narrative contains metadata: '{phrase}'")

    title = case_data.get("title", "") or ""
    bad_titles = [
        "case diagnosis",
        "your score",
        "diagnosis orders",
        "treatment orders",
        "weight given",
        "completed",
        "average first attempt",
    ]
    if title.lower() in bad_titles:
        errors.append(f"Title is UI text not case name: '{title}'")

    for stack in case_data.get("stacks", []):
        label = stack.get("label", "") if isinstance(stack, dict) else str(stack)
        noise = [
            "weight given",
            "total score",
            "%",
            "correctly ordered",
            "should have ordered",
            "optional order",
            "diagnosis orders",
            "treatment orders",
            "completed:",
            "your score",
            "average first attempt",
            "appropriate disposition",
        ]
        if any(n.lower() in label.lower() for n in noise):
            errors.append(f"Stack label is UI noise: '{label}'")
        if len(label.split()) > 6:
            errors.append(f"Stack label too long — likely explanatory text: '{label[:50]}...'")

    for stack in case_data.get("order_sets", []):
        label = stack.get("label", "") if isinstance(stack, dict) else str(stack)
        if len(label.split()) > 6:
            errors.append(f"Order set label too long — likely explanatory text: '{label[:50]}...'")

    if not case_data.get("title") and not case_data.get("stacks"):
        errors.append("Both title and stacks are empty — likely extraction failure")

    return errors


def extract_with_retry(ocr_text: str, case_number: int, max_retries: int = 3) -> tuple[dict | None, list[str]]:
    prompt_text = ocr_text
    case_data: dict | None = None
    errors: list[str] = []

    for attempt in range(1, max_retries + 1):
        print(f"  Attempt {attempt}/{max_retries}...")

        try:
            case_data = process_with_ollama(prompt_text, case_number)
        except json.JSONDecodeError as exc:
            print(f"  JSON parse failed: {exc}")
            errors = [f"JSON parse failed: {exc}"]
            if attempt < max_retries:
                time.sleep(2)
                continue
            return None, ["JSON parse failed after all retries"]
        except requests.RequestException as exc:
            print(f"  Ollama request failed: {exc}")
            errors = [f"Ollama request failed: {exc}"]
            if attempt < max_retries:
                time.sleep(2)
                continue
            return None, errors

        errors = validate_output(case_data, ocr_text)

        if not errors:
            print(f"  Passed validation on attempt {attempt}")
            return case_data, []

        print(f"  Validation errors on attempt {attempt}:")
        for err in errors:
            print(f"    - {err}")

        if attempt < max_retries:
            print("  Retrying with error context...")
            prompt_text = (
                ocr_text
                + "\n\nPREVIOUS ATTEMPT FAILED WITH THESE ERRORS — FIX THEM:\n"
                + "\n".join(f"- {e}" for e in errors)
            )
            time.sleep(2)

    print(f"  All {max_retries} attempts failed")
    return case_data, errors


def ollama_generate_json(prompt: str) -> dict:
    response = requests.post(
        OLLAMA_GENERATE_URL,
        json={"model": TEXT_MODEL, "prompt": prompt, "stream": False},
        timeout=300,
    )
    response.raise_for_status()
    raw = response.json().get("response", "")
    raw = raw.replace("```json", "").replace("```", "").strip()
    return parse_ocr_json(raw)


def reconstruct_case(case_data: dict) -> dict:
    """Use extracted stacks and metadata to reconstruct HPI and enrich fields."""
    stacks_summary = "\n".join(
        [
            f"- {s['label']} ({s.get('type', 'unknown')}): {s.get('finding', '')}"
            for s in case_data.get("stacks", [])
            if s.get("label")
            and (
                "correctly" in str(s.get("type", "")).lower()
                or "should" in str(s.get("type", "")).lower()
            )
        ]
    )

    prompt = f"""You are a senior clinician. Using ONLY the structured case data below,
reconstruct a complete clinical picture.

CASE DATA:
Case number: {case_data.get('case_number')}
Title / Chief complaint: {case_data.get('title')}
Location: {case_data.get('location')}
Diagnosis: {case_data.get('diagnosis')}

Ordered / Should have ordered:
{stacks_summary}

YOUR TASKS — return only valid JSON, no markdown:

1. hpi_narrative: Write a proper HPI in this exact format:
"[Mr/Ms] X is a [reasonable age based on case context]-year-old [sex]
with [relevant PMH inferred from case or 'no significant past medical history']
who presents with [chief complaint and key symptoms inferred from stacks].
[Onset, character, severity, associated symptoms, pertinent negatives —
inferred from what was ordered and found].
[The single clinical question this case forces you to answer]."
- Use reasonable clinical inferences from the stacks
- Do NOT use placeholder brackets in output — fill them with reasonable values
- Do NOT include metadata: no scores, no "High Yield", no "Review Later"

2. physical_exam: Extract system findings from any Physical Exam stacks.
Return as object with system keys, null if not present.

3. diagnosis: The final diagnosis if inferable from the data.

4. specialty: The medical specialty (Internal Medicine, OB/GYN, Emergency Medicine, etc.)

5. patient: Infer reasonable demographics from case context.

Return:
{{
  "hpi_narrative": "",
  "physical_exam": {{
    "general": null,
    "cardiovascular": null,
    "respiratory": null,
    "abdominal": null,
    "neurological": null,
    "skin": null,
    "heent": null,
    "musculoskeletal": null,
    "genitourinary": null,
    "psychiatric": null
  }},
  "diagnosis": null,
  "specialty": null,
  "patient": null
}}"""

    try:
        enriched = ollama_generate_json(prompt)
    except (json.JSONDecodeError, requests.RequestException) as exc:
        print(f"  Reconstruction parse failed: {exc}")
        return case_data

    hpi = enriched.get("hpi_narrative", "") or ""
    bad = [
        "[Mr/Ms]",
        "[age]",
        "[sex]",
        "[PMH]",
        "High Yield",
        "Review Later",
        "[object",
        "year-old with No Known",
        "Onset:",
        "Character:",
        "Severity:",
    ]
    if not isinstance(hpi, str) or any(b.lower() in hpi.lower() for b in bad):
        print("  HPI still contains placeholders or metadata — keeping previous/null")
        enriched["hpi_narrative"] = case_data.get("hpi_narrative")

    case_data["hpi_narrative"] = enriched.get("hpi_narrative")
    case_data["physical_exam"] = enriched.get("physical_exam", case_data.get("physical_exam"))
    case_data["diagnosis"] = enriched.get("diagnosis") or case_data.get("diagnosis")
    case_data["specialty"] = enriched.get("specialty") or case_data.get("specialty")
    case_data["patient"] = enriched.get("patient") or case_data.get("patient")
    return case_data


def refine_stacks(case_data: dict) -> dict:
    """LLM reviews each stack label; writes clean orderable actions to order_sets."""
    stacks = case_data.get("stacks") or []
    if not stacks:
        return case_data

    prompt = f"""You are reviewing extracted stack labels from a medical simulation.

A valid stack label is a specific orderable clinical action a physician can place:
- "Physical Exam: Abdomen" ✓
- "CBC with differential" ✓
- "CT abdomen with contrast" ✓
- "Ciprofloxacin 500mg PO" ✓
- "Surgical consult" ✓

An invalid stack label is explanatory text, guidelines, rationale, or UI noise:
- "Unnecessary imaging studies unless red flags are present" ✗ — guideline text
- "This is important because the patient has fever" ✗ — rationale
- "Weight given for total score: 40%" ✗ — UI noise
- "Correctly Ordered" ✗ — UI label
- "Treatment is with azithromycin or a fluoroquinolone" ✗ — explanation

CURRENT STACKS:
{json.dumps(stacks, indent=2)}

For each stack:
1. If the label is a valid orderable action — keep it unchanged
2. If the label is guideline/rationale text but contains an orderable action — extract just the order name
   Example: "Unnecessary imaging studies unless red flags..." → null (no clear single order)
   Example: "Treatment with ciprofloxacin or azithromycin" → "Ciprofloxacin / Azithromycin"
3. If the label is UI noise, explanation, or rationale with no extractable order — remove it (return null)

Return the refined stacks array. Nulls will be filtered out.
Return only valid JSON array, no markdown:
[{{"label": "...", "type": "...", "finding": "...", "aliases": []}}]"""

    try:
        response = requests.post(
            OLLAMA_GENERATE_URL,
            json={"model": TEXT_MODEL, "prompt": prompt, "stream": False},
            timeout=300,
        )
        response.raise_for_status()
        raw = response.json().get("response", "").replace("```json", "").replace("```", "").strip()
        refined = json.loads(raw)
        cleaned = [s for s in refined if s and s.get("label")]
        case_data["order_sets"] = normalize_stack_items(cleaned)
        print(
            f"  order_sets: {len(case_data['order_sets'])} clean orders "
            f"from {len(stacks)} raw stacks"
        )
        return case_data
    except (json.JSONDecodeError, requests.RequestException) as exc:
        print(f"  Refinement failed — order_sets not written: {exc}")
        return case_data


def self_review(case_data: dict, ocr_text: str) -> dict:
    """Ollama reviews its own output and scores confidence 0-100."""
    prompt = f"""{GOLD_STANDARD_EXAMPLE}

Compare this extracted case against the gold standard above.
Score it and list specific issues.

You are a strict medical data quality reviewer.

Review this extracted case data and score it 0-100 for accuracy and completeness.

ORIGINAL OCR TEXT:
{ocr_text[:2000]}

EXTRACTED CASE DATA:
{json.dumps(case_data, indent=2)[:3000]}

Score each dimension 0-100:
1. title_accuracy: Does title match the actual case chief complaint in OCR?
2. stacks_quality: Are stack labels clean clinical orders with no UI noise?
3. hpi_quality: Is HPI a proper clinical narrative with no placeholders or metadata?
4. physical_exam_quality: Are physical exam findings correctly extracted by system?
5. overall_confidence: Overall confidence this is ready to serve to a learner.

For each dimension below 90, list exactly what is wrong and what the correct value should be.

Return only valid JSON:
{{
  "scores": {{
    "title_accuracy": 0,
    "stacks_quality": 0,
    "hpi_quality": 0,
    "physical_exam_quality": 0,
    "overall_confidence": 0
  }},
  "issues": [
    {{"field": "field_name", "problem": "what is wrong", "fix": "what it should be"}}
  ],
  "ready": false
}}

Set ready: true only if overall_confidence >= 99."""

    try:
        return ollama_generate_json(prompt)
    except (json.JSONDecodeError, requests.RequestException):
        return {
            "scores": {"overall_confidence": 0},
            "issues": [{"field": "parse", "problem": "self-review parse failed", "fix": "retry"}],
            "ready": False,
        }


def apply_fixes(case_data: dict, issues: list, ocr_text: str) -> dict:
    """Ollama applies specific fixes identified in self-review."""
    issues_text = "\n".join(
        [f"- {i['field']}: {i['problem']} -> should be: {i['fix']}" for i in issues]
    )

    prompt = f"""You are fixing specific errors in extracted medical case data.

ORIGINAL OCR TEXT:
{ocr_text[:2000]}

CURRENT CASE DATA:
{json.dumps(case_data, indent=2)[:3000]}

SPECIFIC ISSUES TO FIX:
{issues_text}

Fix ONLY the listed issues. Do not change anything that is already correct.
Return the complete corrected case data as valid JSON only, no markdown."""

    try:
        return ollama_generate_json(prompt)
    except (json.JSONDecodeError, requests.RequestException):
        print("  Fix application parse failed — keeping previous version")
        return case_data


def process_case_with_confidence_loop(
    image_path: Path,
    case_number: int,
    max_rounds: int = 5,
) -> tuple[dict | None, str, bool]:
    print(f"\n{'=' * 50}")
    print(f"PROCESSING CASE {case_number}")
    print(f"{'=' * 50}")

    print("[1] OCR...")
    ocr_text = ocr_screenshot(image_path)
    print(f"    {len(ocr_text)} chars extracted")

    print("[2] Initial extraction...")
    case_data, errors = extract_with_retry(ocr_text, case_number)
    if case_data is None:
        return None, ocr_text, False

    if errors:
        print("    Initial extraction failed validation — attempting reconstruction anyway")
        case_data["_validation_errors"] = errors

    case_data = finalize_case_data(case_data, case_number)

    print("[3] Holistic reconstruction...")
    case_data = reconstruct_case(case_data)

    print("[3b] Stack label refinement...")
    case_data = refine_stacks(case_data)

    print("[4] Self-review loop (target: 99% confidence)...")
    for round_num in range(1, max_rounds + 1):
        print(f"\n  Round {round_num}/{max_rounds}:")

        review = self_review(case_data, ocr_text)
        scores = review.get("scores", {})
        issues = review.get("issues", [])
        confidence = scores.get("overall_confidence", 0)

        print(f"  Confidence: {confidence}%")
        print(
            f"  Scores: title={scores.get('title_accuracy')} "
            f"stacks={scores.get('stacks_quality')} hpi={scores.get('hpi_quality')}"
        )

        if review.get("ready") or confidence >= 99:
            print(f"  Confidence threshold met on round {round_num}")
            break

        if not issues:
            print("  No specific issues identified — stopping loop")
            break

        print(f"  Issues to fix ({len(issues)}):")
        for issue in issues:
            print(f"    - {issue.get('field')}: {issue.get('problem')}")

        print("  Applying fixes...")
        case_data = apply_fixes(case_data, issues, ocr_text)
        case_data = finalize_case_data(case_data, case_number)
        case_data[f"_confidence_after_round_{round_num}"] = confidence

        if round_num == max_rounds:
            print(f"  Max rounds reached. Final confidence: {confidence}%")

    final_review = self_review(case_data, ocr_text)
    final_confidence = final_review.get("scores", {}).get("overall_confidence", 0)

    case_data = {
        k: v
        for k, v in case_data.items()
        if not str(k).startswith("_confidence_after_round")
    }
    case_data["_final_confidence"] = final_confidence

    STRUCTURED_CASE_DIR.mkdir(parents=True, exist_ok=True)
    if final_confidence >= 99:
        output_path = STRUCTURED_CASE_DIR / f"case-{case_number}.json"
        print(f"\n[5] SERVING -> {output_path} (confidence: {final_confidence}%)")
        served = True
    else:
        output_path = STRUCTURED_CASE_DIR / f"case-{case_number}-NEEDS-REVIEW.json"
        case_data["_final_issues"] = final_review.get("issues", [])
        if errors:
            case_data["_validation_errors"] = errors
        print(f"\n[5] NEEDS REVIEW -> {output_path} (confidence: {final_confidence}%)")
        served = False

    output_path.write_text(json.dumps(case_data, indent=2) + "\n", encoding="utf-8")
    print(f"    Title:    {case_data.get('title')}")
    print(f"    Diagnosis:{case_data.get('diagnosis')}")
    print(f"    Stacks:   {len(case_data.get('stacks', []))}")
    print(f"    Orders:   {len(case_data.get('order_sets', []))}")
    hpi = str(case_data.get("hpi_narrative") or "")
    print(f"    HPI:      {hpi[:120]}...")

    return case_data, ocr_text, served


def finalize_case_data(case_data: dict, case_number: int) -> dict:
    case_data = dict(case_data)
    case_data["case_number"] = case_data.get("case_number") or case_number
    case_data["stacks"] = normalize_stack_items(case_data.get("stacks"))
    if case_data.get("order_sets") is not None:
        case_data["order_sets"] = normalize_stack_items(case_data.get("order_sets"))
    vitals = dict(EMPTY_VITALS)
    if isinstance(case_data.get("vitals"), dict):
        vitals.update(case_data["vitals"])
    case_data["vitals"] = vitals
    return case_data


def write_case_json(case_data: dict, case_number: int, errors: list[str]) -> Path:
    STRUCTURED_CASE_DIR.mkdir(parents=True, exist_ok=True)
    if errors:
        case_data = dict(case_data)
        case_data["_validation_errors"] = errors
        output_path = STRUCTURED_CASE_DIR / f"case-{case_number}-NEEDS-REVIEW.json"
        print(f"[3] NEEDS REVIEW -> {output_path}")
    else:
        output_path = STRUCTURED_CASE_DIR / f"case-{case_number}.json"
        print(f"[3] DONE -> {output_path}")

    output_path.write_text(json.dumps(case_data, indent=2) + "\n", encoding="utf-8")
    print(f"    Title:  {case_data.get('title')}")
    print(f"    Stacks: {len(case_data.get('stacks', []))}")
    hpi = str(case_data.get("hpi_narrative") or "")
    print(f"    HPI:    {hpi[:100]}...")
    return output_path


def process_case(image_path: Path, case_number: int) -> dict | None:
    case_data, _ocr_text, _served = process_case_with_confidence_loop(image_path, case_number)
    return case_data


def load_topics() -> dict[int, str]:
    topics: dict[int, str] = {}
    for line in TOPICS_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or "." not in line:
            continue
        num_part, _, rest = line.partition(".")
        if num_part.strip().isdigit():
            topics[int(num_part.strip())] = rest.strip()
    return topics


def list_screenshots() -> dict[int, Path]:
    mapping: dict[int, Path] = {}
    for path in sorted(SCREENSHOT_DIR.glob("case_*.png")):
        parts = path.stem.split("_")
        if len(parts) >= 2 and parts[1].isdigit():
            mapping[int(parts[1])] = path
    return mapping


def find_duplicate_screenshots(screenshots: dict[int, Path]) -> dict[int, int]:
    hashes: dict[str, int] = {}
    dupes: dict[int, int] = {}
    for case_id, path in sorted(screenshots.items()):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in hashes:
            dupes[case_id] = hashes[digest]
        else:
            hashes[digest] = case_id
    return dupes


def clean_json_text(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()
    return text


def parse_ocr_json(raw: str) -> dict:
    text = clean_json_text(raw)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        if start == -1:
            raise
        depth = 0
        for index, char in enumerate(text[start:], start):
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return json.loads(text[start : index + 1])
        raise


def normalize_stack_items(items: list | None) -> list[dict]:
    stacks: list[dict] = []
    seen: set[str] = set()
    for item in items or []:
        if isinstance(item, dict):
            label = str(item.get("label") or item.get("order") or "").strip()
            finding = item.get("finding")
            order_type = item.get("type")
        else:
            label = str(item or "").strip()
            finding = None
            order_type = None
        if not label or label.lower() in seen:
            continue
        stacks.append({
            "label": label,
            "aliases": item.get("aliases", []) if isinstance(item, dict) else [],
            "finding": finding,
            "type": order_type,
        })
        seen.add(label.lower())
    return stacks


def write_structured_case_json(
    ocr_text: str,
    case_number: int,
    *,
    ocr: dict | None = None,
    title: str | None = None,
    validation_errors: list[str] | None = None,
) -> Path:
    if ocr is None:
        case_data, validation_errors = extract_with_retry(ocr_text, case_number)
        if case_data is None:
            case_data = {"case_number": case_number, "title": title, "stacks": []}
            validation_errors = validation_errors or ["Extraction failed"]
    else:
        case_data = dict(ocr)
        if validation_errors is None:
            validation_errors = case_data.pop("_validation_errors", None)
        if validation_errors is None:
            validation_errors = validate_output(case_data, ocr_text)

    if title and not case_data.get("title"):
        case_data["title"] = title

    case_data = finalize_case_data(case_data, case_number)
    return write_case_json(case_data, case_number, validation_errors or [])


def extract_case_from_image(image_path: Path, case_number: int) -> tuple[dict | None, str]:
    case_data, ocr_text, _served = process_case_with_confidence_loop(image_path, case_number)
    return case_data, ocr_text


def extract_case_with_retry(image_path: Path, case_number: int) -> tuple[dict | None, str]:
    return extract_case_from_image(image_path, case_number)


def generate_patient_voice(title: str, diagnosis: str | None, case_summary: str | None) -> dict:
    topic = title or "something wrong"
    dx = diagnosis or "I don't know what's wrong"
    summary_hint = (case_summary or "")[:200]
    return {
        "chief_complaint": f"I need help — {topic.lower()}. I'm really scared.",
        "history": f"It's been getting worse. They said something about {dx.lower()}. {summary_hint[:80]}...",
        "pain": f"This {topic.lower()} won't let up and I'm afraid something bad is happening.",
    }


def ocr_to_case_entry(
    ocr: dict,
    case_id: int,
    title: str,
    *,
    status: str = "ok",
    raw_response: str | None = None,
) -> dict:
    raw_orders = ocr.get("order_sets") or ocr.get("stacks")
    stacks = normalize_stack_items(raw_orders)
    labels = [s["label"] for s in stacks]

    entry = {
        "id": case_id,
        "title": ocr.get("title") or title,
        "specialty": None,
        "diagnosis": None,
        "hpi": ocr.get("hpi_narrative") or ocr.get("hpi_raw"),
        "physical_exam": dict(EMPTY_PHYSICAL_EXAM),
        "vitals": {**EMPTY_VITALS, **(ocr.get("vitals") or {})},
        "correct_orders": labels,
        "should_have_ordered": [],
        "correctly_avoided": [],
        "case_summary": None,
        "stacks": normalize_stack_items(ocr.get("stacks")),
        "order_sets": normalize_stack_items(ocr.get("order_sets")) if ocr.get("order_sets") else stacks,
        "patient_voice": generate_patient_voice(ocr.get("title") or title, None, None),
        "incomplete": not bool(labels),
        "status": status,
        "location": ocr.get("location"),
        "extraction_notes": "Pytesseract OCR + Ollama parse from review screenshot.",
    }
    if raw_response is not None:
        entry["raw_response"] = raw_response
    return entry


def parse_error_entry(case_id: int, title: str, raw_response: str) -> dict:
    entry = ocr_to_case_entry({}, case_id, title, status="parse_error", raw_response=raw_response)
    entry["extraction_notes"] = "Ollama returned unparseable JSON after retry."
    return entry


def no_screenshot_entry(case_id: int, topic: str) -> dict:
    return {
        "id": case_id,
        "title": topic,
        "topic": topic,
        "specialty": None,
        "diagnosis": None,
        "hpi": None,
        "physical_exam": dict(EMPTY_PHYSICAL_EXAM),
        "vitals": dict(EMPTY_VITALS),
        "correct_orders": [],
        "should_have_ordered": [],
        "correctly_avoided": [],
        "case_summary": None,
        "stacks": [],
        "patient_voice": generate_patient_voice(topic, None, None),
        "incomplete": True,
        "status": "no_screenshot",
        "extraction_notes": "No screenshot in source folder. To be filled from Crush Step 3 CCS book.",
    }


def placeholder_case(case_id: int, title: str, *, duplicate_of: int | None = None) -> dict:
    entry = no_screenshot_entry(case_id, title)
    entry.pop("status", None)
    entry["status"] = "duplicate_screenshot"
    entry["duplicate_screenshot_of"] = duplicate_of
    entry["extraction_notes"] = f"Screenshot file is identical to case {duplicate_of}; re-capture needed."
    return entry


def is_failed_entry(case: dict) -> bool:
    notes = case.get("extraction_notes") or ""
    status = case.get("status")
    return (
        status == "parse_error"
        or "Extraction failed" in notes
        or (case.get("id") in FAILED_CASE_IDS and not case.get("correct_orders") and status != "no_screenshot")
    )


def load_cases_file() -> tuple[dict, list[dict]]:
    payload = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
    return payload, payload["cases"]


def save_cases(payload: dict) -> None:
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def mark_no_screenshot_cases(by_id: dict[int, dict], topics: dict[int, str]) -> int:
    updated = 0
    for case_id in NO_SCREENSHOT_IDS:
        topic = topics[case_id]
        by_id[case_id] = no_screenshot_entry(case_id, topic)
        updated += 1
    return updated


def resume_failed() -> None:
    topics = load_topics()
    screenshots = list_screenshots()
    payload, cases = load_cases_file()
    by_id = {case["id"]: case for case in cases}

    reprocessed: list[int] = []
    parse_errors: list[int] = []
    errors: list[str] = []

    for case_id in FAILED_CASE_IDS:
        title = topics[case_id]
        if case_id not in screenshots:
            errors.append(f"Case {case_id}: screenshot missing on disk")
            continue

        path = screenshots[case_id]
        print(f"Extracting case {case_id}: {path.name}...", flush=True)

        try:
            ocr, raw = extract_case_with_retry(path, case_id)
            if ocr is None:
                print(f"  JSON parse failed for case {case_id}", flush=True)
                by_id[case_id] = parse_error_entry(case_id, title, raw)
                parse_errors.append(case_id)
                errors.append(f"Case {case_id}: parse_error")
                continue

            by_id[case_id] = ocr_to_case_entry(ocr, case_id, title)
            reprocessed.append(case_id)
            print(f"  OK case {case_id}: {ocr.get('title', '?')}", flush=True)
        except Exception as exc:
            by_id[case_id] = parse_error_entry(case_id, title, str(exc))
            parse_errors.append(case_id)
            errors.append(f"Case {case_id}: {exc}")

    marked = mark_no_screenshot_cases(by_id, topics)
    payload["cases"] = [by_id[i] for i in sorted(by_id.keys())]
    save_cases(payload)

    statuses: dict[str, list[int]] = {}
    for case in payload["cases"]:
        status = case.get("status", "ok")
        statuses.setdefault(status, []).append(case["id"])

    print("\n=== PYTESSERACT + OLLAMA RESUME REPORT ===")
    print(f"Text model: {TEXT_MODEL}")
    print(f"Reprocessed: {len(reprocessed)} cases -> {', '.join(map(str, reprocessed)) or 'none'}")
    print(f"Parse errors ({len(parse_errors)}): {', '.join(map(str, parse_errors)) or 'none'}")
    print(f"No-screenshot marked: {marked} cases")
    print(f"Total cases in output: {len(payload['cases'])}")
    for status, ids in sorted(statuses.items()):
        print(f"  status={status}: {len(ids)}")
    if errors:
        print(f"Errors ({len(errors)}):")
        for err in errors:
            print(f"  - {err}")
    print(f"Saved: {OUTPUT_FILE}")


def extract_all() -> None:
    topics = load_topics()
    screenshots = list_screenshots()
    dupes = find_duplicate_screenshots(screenshots)

    cases: list[dict] = []
    errors: list[str] = []
    parse_errors: list[int] = []

    for case_id in sorted(topics.keys()):
        title = topics[case_id]

        if case_id in NO_SCREENSHOT_IDS or case_id not in screenshots:
            cases.append(no_screenshot_entry(case_id, title))
            continue

        if case_id in dupes:
            cases.append(placeholder_case(case_id, title, duplicate_of=dupes[case_id]))
            errors.append(f"Case {case_id}: duplicate screenshot of case {dupes[case_id]}")
            continue

        path = screenshots[case_id]
        print(f"Extracting case {case_id}: {path.name}...", flush=True)
        ocr, raw = extract_case_with_retry(path, case_id)
        if ocr is None:
            cases.append(parse_error_entry(case_id, title, raw))
            parse_errors.append(case_id)
            errors.append(f"Case {case_id}: parse_error")
            continue
        cases.append(ocr_to_case_entry(ocr, case_id, title))

    payload = {"cases": cases}
    save_cases(payload)

    print("\n=== PYTESSERACT + OLLAMA EXTRACTION REPORT ===")
    print(f"Text model: {TEXT_MODEL}")
    print(f"Total cases: {len(cases)}")
    print(f"Parse errors ({len(parse_errors)}): {', '.join(map(str, parse_errors)) or 'none'}")
    if errors:
        print("Errors:")
        for err in errors:
            print(f"  - {err}")
    print(f"Saved: {OUTPUT_FILE}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract CCS cases: Pytesseract OCR → Ollama/Mistral JSON",
    )
    parser.add_argument(
        "--mode",
        choices=["resume", "all", "one"],
        default="resume",
        help="resume = failed cases only; all = full re-extraction; one = single case",
    )
    parser.add_argument("--case-id", type=int, default=None, help="Case number for --mode one")
    args = parser.parse_args()

    if args.mode == "one":
        if args.case_id is None:
            print("ERROR: --case-id required for --mode one")
            sys.exit(1)
        screenshots = list_screenshots()
        if args.case_id not in screenshots:
            print(f"ERROR: no screenshot for case {args.case_id}")
            sys.exit(1)
        process_case(screenshots[args.case_id], args.case_id)
        return

    if args.mode == "resume":
        resume_failed()
    else:
        extract_all()


if __name__ == "__main__":
    main()
