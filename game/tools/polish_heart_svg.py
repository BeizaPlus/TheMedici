from pathlib import Path

p = Path(__file__).resolve().parents[1] / "assets" / "heart-anatomy.svg"
t = p.read_text(encoding="utf-8")
if 'viewBox="0 0 658 916"' not in t:
    t = t.replace(
        'width="658" height="916"',
        'viewBox="0 0 658 916" width="658" height="916"',
    )
t = t.replace('fill="#000000"', 'fill="#8B1524"')
p.write_text(t, encoding="utf-8")
print("updated", p)
