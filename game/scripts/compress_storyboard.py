from PIL import Image
import os

src = r"C:\Users\steve\MeWorld\game\docs\storyboards\U15-DKA-pancreas-genie-v2.png"
dst = r"C:\Users\steve\MeWorld\game\docs\storyboards\U15-DKA-genie-compressed.png"

img = Image.open(src)
# 832x1216 original — already good, just optimize compression
img.save(dst, optimize=True, compress_level=9)
size = os.path.getsize(dst)
print(f"Compressed: {size/1024/1024:.1f} MB ({img.width}x{img.height})")
