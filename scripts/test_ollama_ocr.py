#!/usr/bin/env python3
import base64
import json
from pathlib import Path

import ollama
from extract_cases_from_screenshots import OCR_PROMPT

path = Path(r"C:\Users\steve\MeWorld\game\ccs_screenshots\case_145_Facial_Pain.png")
image_data = base64.b64encode(path.read_bytes()).decode()
response = ollama.chat(
    model="llava",
    messages=[{"role": "user", "content": OCR_PROMPT, "images": [image_data]}],
)
raw = response["message"]["content"]
print("RAW LENGTH:", len(raw))
print(raw[:2000])
