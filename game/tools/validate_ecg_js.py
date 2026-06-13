import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HTML = Path(r"C:\Users\steve\MeWorld\game\ecg-vector-lab.html")
html = HTML.read_text(encoding="utf-8")
scripts = re.findall(r"<script(?:[^>]*)>([\s\S]*?)</script>", html)
main = next((s for s in scripts if s.lstrip().startswith("(function(){")), scripts[-1])
if not main.strip():
    print("FAIL no inline script found", file=sys.stderr)
    sys.exit(1)

tmpdir = Path(tempfile.mkdtemp(prefix="ecg-lab-js-"))
body_path = tmpdir / "body.js"
probe_path = tmpdir / "probe.js"
body_path.write_text(main, encoding="utf-8")
probe_path.write_text(
    "const fs=require('fs');\n"
    + "new Function(fs.readFileSync(" + json.dumps(str(body_path)) + ",'utf8'));\n",
    encoding="utf-8",
)
result = subprocess.run(["node", str(probe_path)], capture_output=True, text=True)
for p in (body_path, probe_path):
    p.unlink(missing_ok=True)
tmpdir.rmdir()
if result.returncode != 0:
    print("FAIL JS parse", result.stderr.strip() or result.stdout.strip(), file=sys.stderr)
    sys.exit(1)
print("JS OK")
