import json
import re
from pathlib import Path

import ollama

p = Path(r"C:\Users\steve\MeWorld\data\ccs_cases_master.json")
d = json.loads(p.read_text(encoding="utf-8"))
c = next(x for x in d["cases"] if x["id"] == 136)
raw = ollama.chat(
    model="mistral",
    messages=[{
        "role": "user",
        "content": (
            "USMLE Step 3 CCS: Shortness of Breath. "
            'Return JSON only: {"diagnosis":"","correct_orders":[],"rationale":{}}'
        ),
    }],
)["message"]["content"]
clean = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
data = json.loads(re.search(r"\{[\s\S]*\}", clean).group())
c["diagnosis"] = data.get("diagnosis") or "COPD Exacerbation"
if data.get("correct_orders"):
    c["correct_orders"] = data["correct_orders"]
if data.get("rationale"):
    c["rationale"] = data["rationale"]
c["complete"] = True
c.setdefault("enrichment_sources", []).append("mistral")
d["complete"] = sum(1 for x in d["cases"] if x.get("complete"))
d["partial"] = 181 - d["complete"]
p.write_text(json.dumps(d, indent=2), encoding="utf-8")
print("Fixed case 136:", c["diagnosis"], len(c["correct_orders"]), "orders")
