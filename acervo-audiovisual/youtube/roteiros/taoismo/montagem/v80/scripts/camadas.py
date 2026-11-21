# Separa cada imagem em camadas para a camera 2.5D do v80:
#   <id>_fundo.jpg  fundo com a figura apagada (preenchimento por inpaint), para mover devagar e desfocado
#   <id>_figura.png figura recortada (rembg), com alfa, para mover mais rapido e nitida na frente
#   <id>_base.jpg   a imagem inteira, reduzida a no maximo 3000 px (para planos sem recorte)
# Uso: python camadas.py [ids...]   (sem argumento: todas as imagens de v80/imagens que ainda nao tem camadas)
import pathlib, sys
import cv2, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
V80 = pathlib.Path(__file__).resolve().parent.parent
SRC, DST = V80 / 'imagens', V80 / 'camadas'
DST.mkdir(exist_ok=True)
SEM_RECORTE = ('mapa', 'hua_yi', 'estrada', 'arroz', 'livraria', 'rio_qingming', 'paulista', 'universidade', 'mercado',
               'dunhuang_foto', 'hangu_2018', 'tiras', 'guodian', 'talismas', 'caligrafia', 'shiji', 'seda_p', 'laozi_seda',
               'etiquetas', 'dinheiro', 'ma_yuan', 'fan_kuan', 'camara', 'poco', 'escavacao', 'luar')
_sessao = None
def recorta(im):
    global _sessao
    from rembg import new_session, remove
    if _sessao is None: _sessao = new_session('isnet-general-use')
    return remove(im, session=_sessao)
def faz(p):
    cid = p.stem
    if (DST / f'{cid}_base.jpg').exists(): return
    im = Image.open(p).convert('RGB')
    if max(im.size) > 3000: im.thumbnail((3000, 3000), Image.LANCZOS)
    im.save(DST / f'{cid}_base.jpg', quality=92)
    if any(k in cid for k in SEM_RECORTE): print('base', cid, im.size, flush=True); return
    fig = recorta(im)
    a = np.array(fig)[:, :, 3]
    if (a > 128).mean() < .02 or (a > 128).mean() > .85:  # recorte vazio ou pegou quase tudo: fica so a base
        print('sem figura', cid, round((a > 128).mean(), 3), flush=True); return
    fig.save(DST / f'{cid}_figura.png')
    m = cv2.dilate((a > 40).astype(np.uint8) * 255, np.ones((25, 25), np.uint8))
    bgr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    pequeno = cv2.resize(bgr, None, fx=.5, fy=.5); mp = cv2.resize(m, None, fx=.5, fy=.5)
    cheio = cv2.resize(cv2.inpaint(pequeno, mp, 9, cv2.INPAINT_TELEA), (bgr.shape[1], bgr.shape[0]))
    fundo = np.where(m[:, :, None] > 0, cheio, bgr)
    cv2.imwrite(str(DST / f'{cid}_fundo.jpg'), fundo, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print('camadas', cid, im.size, round((a > 128).mean(), 3), flush=True)
alvos = sys.argv[1:] or [p.stem for p in sorted(SRC.iterdir()) if p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.tif', '.tiff')]
for cid in alvos:
    p = next(SRC.glob(cid + '.*'))
    try: faz(p)
    except Exception as e: print('erro', cid, e, flush=True)
