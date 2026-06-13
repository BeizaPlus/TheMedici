"""Extract traced heart SVG paths into inline JS constants."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def parse_svg(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    paths = []
    for m in re.finditer(
        r'<path d="([^"]+)" fill="[^"]*" transform="translate\(([^)]+)\)"',
        text,
    ):
        d, tr = m.group(1), m.group(2)
        parts = [float(x.strip()) for x in tr.replace(",", " ").split()]
        paths.append({"d": d, "tx": parts[0], "ty": parts[1]})
    return paths


def main() -> None:
    heart = parse_svg(ASSETS / "heart-anatomy.svg")
    vessels = parse_svg(ASSETS / "heart-anatomy-vessels.svg")
    out = ASSETS / "heart-anatomy-paths.json"
    payload = {
        "w": 658,
        "h": 916,
        "hc": {"x": 329, "y": 520},
        "silhouette": heart,
        "vessels": vessels,
    }
    out.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"heart={len(heart)} vessels={len(vessels)} -> {out}")


if __name__ == "__main__":
    main()
