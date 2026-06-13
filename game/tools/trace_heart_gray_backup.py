"""Trace B&W heart backup: black regions -> SVG paths at 10% gray (#E6E6E6)."""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import vtracer
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

# Print-style 10% gray (10% black ink on white paper)
GRAY_10 = "#E6E6E6"

SRC_DEFAULT = (
    Path(__file__).resolve().parents[0].parent.parent
    / ".cursor/projects/c-Users-steve-ePCRs-automation/assets"
)
# Fallback: copy from workspace if user pasted path elsewhere
BACKUP_CANDIDATES = [
    ASSETS / "heart-anatomy-backup-bw.png",
]


def parse_svg_paths(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    paths: list[dict] = []
    for m in re.finditer(
        r'<path d="([^"]+)" fill="[^"]*" transform="translate\(([^)]+)\)"',
        text,
    ):
        d, tr = m.group(1), m.group(2)
        parts = [float(x.strip()) for x in tr.replace(",", " ").split()]
        paths.append({"d": d, "tx": parts[0], "ty": parts[1]})
    return paths


def svg_dims(path: Path) -> tuple[int, int]:
    text = path.read_text(encoding="utf-8")
    m = re.search(r'width="(\d+)" height="(\d+)"', text)
    if not m:
        m = re.search(r'viewBox="0 0 (\d+) (\d+)"', text)
    if not m:
        raise ValueError(f"Could not read SVG size from {path}")
    return int(m.group(1)), int(m.group(2))


def black_mask(src: Path, out: Path, threshold: int = 128) -> None:
    im = Image.open(src).convert("RGBA")
    mask = Image.new("L", im.size, 255)
    mp = mask.load()
    ip = im.load()
    assert mp is not None and ip is not None
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, a = ip[x, y]
            if a < 128:
                mp[x, y] = 255
            elif r < threshold and g < threshold and b < threshold:
                mp[x, y] = 0
            else:
                mp[x, y] = 255
    mask.save(out)


def recolor_svg(svg_path: Path, fill: str) -> None:
    text = svg_path.read_text(encoding="utf-8")
    if 'viewBox="' not in text:
        text = text.replace(
            'width="',
            'viewBox="0 0 PLACEHOLDER" '.replace("PLACEHOLDER", ""),
            1,
        )
    w, h = svg_dims(svg_path)
    if 'viewBox="' not in svg_path.read_text(encoding="utf-8"):
        text = svg_path.read_text(encoding="utf-8")
        text = re.sub(
            r'(<svg[^>]*width=")(\d+)(" height=")(\d+)(")',
            rf'\1\2\3\4 viewBox="0 0 \2 \4"\5',
            text,
            count=1,
        )
    text = svg_path.read_text(encoding="utf-8")
    if "viewBox" not in text:
        text = text.replace(
            f'width="{w}" height="{h}"',
            f'viewBox="0 0 {w} {h}" width="{w}" height="{h}"',
        )
    text = re.sub(r'fill="#[^"]*"', f'fill="{fill}"', text)
    text = re.sub(r'fill="black"', f'fill="{fill}"', text)
    svg_path.write_text(text, encoding="utf-8")


def trace_black_regions(src: Path, svg_out: Path) -> int:
    trace_png = ASSETS / "heart-gray-trace.png"
    black_mask(src, trace_png)
    vtracer.convert_image_to_svg_py(
        str(trace_png),
        str(svg_out),
        colormode="binary",
        hierarchical="stacked",
        mode="spline",
        filter_speckle=6,
        corner_threshold=60,
        length_threshold=4,
        path_precision=2,
    )
    recolor_svg(svg_out, GRAY_10)
    return len(parse_svg_paths(svg_out))


def build_payload(svg_path: Path) -> dict:
    w, h = svg_dims(svg_path)
    silhouette = parse_svg_paths(svg_path)
    return {
        "w": w,
        "h": h,
        "hc": {"x": round(w * 0.5), "y": round(h * 0.57)},
        "fill": GRAY_10,
        "silhouette": silhouette,
        "vessels": [],
    }


def write_js(payload: dict, js_path: Path) -> None:
    js_path.write_text("window.HEART_GRAY=" + json.dumps(payload, separators=(",", ":")) + ";\n", encoding="utf-8")


def main(src: Path | None = None) -> None:
    if src is None:
        for c in BACKUP_CANDIDATES:
            if c.exists():
                src = c
                break
        if src is None:
            raise SystemExit("Place backup PNG at assets/heart-anatomy-backup-bw.png")

    svg_out = ASSETS / "heart-anatomy-gray.svg"
    json_out = ASSETS / "heart-anatomy-gray-paths.json"
    js_out = ASSETS / "heart-anatomy-gray-data.js"

    n = trace_black_regions(src, svg_out)
    payload = build_payload(svg_out)
    json_out.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    write_js(payload, js_out)
    print(f"traced {n} paths -> {svg_out.name} fill={GRAY_10}")
    print(f"js -> {js_out.name} ({js_out.stat().st_size} bytes)")


if __name__ == "__main__":
    import sys

    src_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if src_path is None and BACKUP_CANDIDATES[0].exists():
        main()
    elif src_path:
        if not src_path.exists():
            raise SystemExit(f"Missing {src_path}")
        dest = ASSETS / "heart-anatomy-backup-bw.png"
        if src_path.resolve() != dest.resolve():
            shutil.copy2(src_path, dest)
        main(dest)
    else:
        main()
