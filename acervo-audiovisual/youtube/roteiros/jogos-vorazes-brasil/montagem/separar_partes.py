"""Separa o projeto em N projetos (um por index_parteK.html), cada um só com as cenas e os arquivos que usa.
O render paralelo do OpenMotion guarda todos os quadros no Temp; em partes cabe no disco. Depois: juntar_partes.py.
Uso: python separar_partes.py <projeto> -> <projeto>_p1.zip ... <projeto>_pN.zip"""
import sys, pathlib, shutil, re
P = pathlib.Path(sys.argv[1])
for idx in sorted(P.glob('index_parte*.html')):
    k = re.search(r'(\d+)', idx.stem).group(1); D = P.parent / f'{P.name}_p{k}'
    if D.exists(): shutil.rmtree(D)
    (D / 'compositions').mkdir(parents=True)
    html = idx.read_text(encoding='utf-8'); (D / 'index.html').write_text(html, encoding='utf-8')
    usados = {'assets/gsap.min.js'} | {f.relative_to(P).as_posix() for f in (P / 'assets' / 'fonts').glob('*')}
    for comp in re.findall(r'compositions/[\w-]+\.html', html):
        txt = (P / comp).read_text(encoding='utf-8'); (D / comp).write_text(txt, encoding='utf-8')
        usados |= set(re.findall(r'assets/[\w./\[\],-]+\.(?:jpg|png|mp4|ttf)', txt))
    for u in usados:
        (D / u).parent.mkdir(parents=True, exist_ok=True); shutil.copy(P / u, D / u)
    shutil.make_archive(str(D), 'zip', str(D)); shutil.rmtree(D)
    print(D.name + '.zip', len(usados), 'arquivos', round((D.parent / (D.name + '.zip')).stat().st_size / 1e6), 'MB')
