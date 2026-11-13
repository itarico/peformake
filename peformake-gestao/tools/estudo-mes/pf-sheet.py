import sys, glob
from PIL import Image
pref, out = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(pref + '-*.png'))
sel = [int(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else None
if sel: fs = [f for f in fs if int(f[-6:-4]) in sel]
w, h = 666, 375
rows = (len(fs) + 1) // 2
S = Image.new('RGB', (w * 2, h * rows), 'white')
for i, f in enumerate(fs):
    S.paste(Image.open(f).convert('RGB').resize((w, h)), ((i % 2) * w, (i // 2) * h))
S.save(out, quality=85)
