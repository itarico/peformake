"""Trata a mídia do Panem para a montagem (o tratamento fica gravado no arquivo, não em filtro CSS):
- fotos de arquivo: P&B de alto contraste, preto fechado (referência: corredor noir);
- satélite de Carajás: tratamento documental frio;
- vídeos de atmosfera (Pixabay): 1920x1080, 24 qps, sem som; fumaça e poeira em cinza (entram em modo tela, discretos).
Uso: python preparar_midia.py <midia> <saida assets>"""
import sys, pathlib, shutil, subprocess
from PIL import Image, ImageOps, ImageEnhance
MID, A = map(pathlib.Path, sys.argv[1:3]); (A / 'img').mkdir(parents=True, exist_ok=True); (A / 'video').mkdir(parents=True, exist_ok=True)

def cobrir(im, w=2112, h=1188):   # 10 % maior que a tela, para o zoom lento
    r = max(w / im.width, h / im.height); im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2; return im.crop((x, y, x + w, y + h))

def arquivo_pb(src, dst):
    im = ImageOps.grayscale(Image.open(src)); im = ImageOps.autocontrast(im, 1.5)
    im = im.point(lambda v: int(255 * (v / 255) ** 1.25)); im = ImageEnhance.Contrast(im).enhance(1.25)
    cobrir(im).convert('RGB').save(dst, quality=92)

if (MID / 'img' / 'coliseu.jpg').exists(): arquivo_pb(MID / 'img' / 'coliseu.jpg', A / 'img' / 'coliseu.jpg')   # Roma: a fala cita Roma
# vídeos reais de trabalho por distrito (pastas videos_reais/D12_PA, D11_..., Capital): 1920x1080, 24 qps, sem som, tom documental
import re as _re
(A / 'video' / 'real').mkdir(parents=True, exist_ok=True)
for pasta in sorted((MID / 'videos_reais').glob('*')):
    if not pasta.is_dir(): continue
    pref = 'CAP' if pasta.name.upper().startswith('CAP') else _re.match(r'(D\d+)', pasta.name.upper()).group(1) if _re.match(r'D\d+', pasta.name.upper()) else None
    if not pref: continue
    for i, v in enumerate(sorted(pasta.glob('*.mp4'))):
        dst = A / 'video' / 'real' / f'{pref}_{i:02d}.mp4'
        if dst.exists() and dst.stat().st_mtime > v.stat().st_mtime: continue
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(v), '-t', '14', '-an', '-vf',
                        'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,eq=saturation=0.72:contrast=1.06:brightness=-0.03',
                        '-c:v', 'libx264', '-crf', '21', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-g', '24', str(dst)], check=True)
        (A / 'video' / 'real' / f'{pref}_{i:02d}.txt').write_text(str(v), encoding='utf-8')
for nome in ['mineiros_sc', 'carvao_sc']:                 # mineiros de carvão de Santa Catarina (CC0)
    if (MID / 'img' / f'{nome}.jpg').exists(): arquivo_pb(MID / 'img' / f'{nome}.jpg', A / 'img' / f'{nome}.jpg')
# stills de divulgação dos filmes (até 5 s cada, com crédito): cor contida, contraste leve, no tamanho do quadro de película
for f in sorted((MID / 'filme').glob('*.jpg')):
    im = Image.open(f).convert('RGB'); im = ImageEnhance.Color(im).enhance(0.6); im = ImageEnhance.Contrast(im).enhance(1.08)
    cobrir(im, 1760, 880).save(A / 'img' / f'filme_{f.stem}.jpg', quality=92)
f = Image.open(MID / 'img' / 'carajas_satelite.jpg').convert('RGB')
f = ImageEnhance.Color(f).enhance(0.45); f = ImageEnhance.Contrast(f).enhance(1.12); f = ImageEnhance.Brightness(f).enhance(0.78)
r, g, b = f.split(); f = Image.merge('RGB', (r.point(lambda v: int(v * .95)), g, b.point(lambda v: min(255, int(v * 1.06 + 4)))))
cobrir(f).save(A / 'img' / 'carajas.jpg', quality=92)
for nome in ['lencois', 'pantanal', 'amazonia', 'sapucai']:   # arenas brasileiras (bloco V4): cor contida, tom documental
    if (MID / 'img' / f'{nome}.jpg').exists():
        f = Image.open(MID / 'img' / f'{nome}.jpg').convert('RGB')
        f = ImageEnhance.Color(f).enhance(0.62); f = ImageEnhance.Contrast(f).enhance(1.1); f = ImageEnhance.Brightness(f).enhance(0.85)
        cobrir(f).save(A / 'img' / f'{nome}.jpg', quality=92)
shutil.copy(MID / 'relevo' / 'relevo.png', A / 'img' / 'relevo.png')
p = Image.open(MID / 'tex' / 'Paper001.jpg').convert('RGB'); cobrir(p, 1920, 1080).save(A / 'img' / 'papel.jpg', quality=90)

VID = {'fumaca': ('fumaca.mp4', True, 0), 'poeira': ('poeira.mp4', True, 0), 'queima': ('queima1.mp4', False, 0), 'luz': ('poeira_luz.mp4', False, 0)}
for nome, (src, cinza, ini) in VID.items():
    vf = 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24' + (',format=gray' if cinza else '')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ini), '-i', str(MID / 'video' / src), '-t', '20', '-an', '-vf', vf,
                    '-c:v', 'libx264', '-crf', '23', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-g', '24', str(A / 'video' / f'{nome}.mp4')], check=True)
print('ok')
