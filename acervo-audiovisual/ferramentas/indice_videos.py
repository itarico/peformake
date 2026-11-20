# Gera acervo-audiovisual/INDICE-VIDEOS.md: todos os vídeos estudados que estão no Git, por fonte.
# Uso: python acervo-audiovisual/ferramentas/indice_videos.py (da raiz do repo)
import json, re
from pathlib import Path
RAIZ = Path(__file__).resolve().parents[2]
EP = RAIZ / 'video-tools' / 'estudos-perfis'
VIR = RAIZ / 'acervo-audiovisual' / 'virais'
NOMES = {'salvos': 'Salvos do Italo (Instagram)', 'tutoriais': 'Tutoriais (Instagram)', 'trafego': 'Tráfego',
         'estilos-instagram': 'Estilos avulsos (Instagram)', 'youtube-na': 'YouTube · tutoriais avulsos de edição com IA'}

def info_titulo(d):
    for j in sorted(d.glob('*.info.json')):
        try:
            x = json.loads(j.read_text(encoding='utf-8'))
            return x.get('title') or '', x.get('webpage_url') or '', x.get('uploader') or x.get('channel') or ''
        except Exception:
            pass
    return '', '', ''

def linha_analise(a):
    t = a.read_text(encoding='utf-8', errors='ignore').splitlines()
    url = next((l.split('URL:', 1)[1].strip() for l in t[:6] if l.startswith('URL:')), '')
    dur = next((re.search(r'([\d.]+) s', l).group(1) for l in t[:8] if l.startswith('Formato') and re.search(r'([\d.]+) s', l)), '')
    data = next((l.split(':', 1)[1].strip() for l in t[:6] if l.startswith('Data:')), '')
    cur = next((l.split('·')[0].replace('Curtidas:', '').strip() for l in t[:6] if l.startswith('Curtidas')), '')
    return url, data, dur, cur

out = ['# Índice de todos os vídeos estudados', '',
       'Gerado por `acervo-audiovisual/ferramentas/indice_videos.py`. Não editar à mão.',
       'Cada linha aponta para a pasta com `analise.md` (ritmo, cortes, som), `transcricao.txt` e, quando existe, a ficha de',
       'engenharia reversa em `acervo-audiovisual/virais/`. Os vídeos em si ficam no HD (`D:/PEFORMAKE/REFERENCIAS`).', '']
fichas = {}
for f in VIR.glob('*.md'):
    m = re.match(r'\d{4}-\d{2}-\d{2}_(.+)_([A-Za-z0-9_-]{9,})\.md$', f.name)
    if m:
        fichas[m.group(2)] = f.name
total = 0
resumo = []
blocos = []
for d in sorted(p for p in EP.iterdir() if p.is_dir() and p.name != 'pesquisa'):
    linhas = []
    if d.name.startswith('youtube'):
        for v in sorted(p for p in d.rglob('*') if p.is_dir() and (any(p.glob('*.info.json')) or (p / 'transcricao.txt').exists())):
            tit, url, canal = info_titulo(v)
            url = url or (f'https://www.youtube.com/watch?v={v.name}' if re.fullmatch(r'[A-Za-z0-9_-]{11}', v.name) else '')
            nome = tit or v.name.replace('_', ' ')
            rel = v.relative_to(RAIZ).as_posix()
            linhas.append(f'| {nome[:90]} | {canal} | {url} | `{rel}` |')
        cab = ['| Vídeo | Canal | Link | Pasta |', '|---|---|---|---|']
    else:
        for a in sorted(d.rglob('analise.md')):
            url, data, dur, cur = linha_analise(a)
            cod = a.parent.name
            fic = f'[ficha](virais/{fichas[cod]})' if cod in fichas else ''
            rel = a.parent.relative_to(RAIZ).as_posix()
            linhas.append(f'| {data} | {url or cod} | {dur} | {cur} | {fic} | `{rel}` |')
        cab = ['| Data | Link | Duração (s) | Curtidas | Engenharia reversa | Pasta |', '|---|---|---|---|---|---|']
    if not linhas:
        continue
    titulo = NOMES.get(d.name, ('YouTube · ' + d.name[8:].replace('-', ' ')) if d.name.startswith('youtube') else '@' + d.name)
    total += len(linhas)
    resumo.append(f'| {titulo} | {len(linhas)} |')
    blocos += [f'## {titulo} ({len(linhas)})', ''] + cab + linhas + ['']
usadas = set()
for b in blocos:
    for m in re.finditer(r'virais/([^)]+)\)', b):
        usadas.add(m.group(1))
sobra = sorted(set(fichas.values()) - usadas)
if sobra:
    total += len(sobra)
    resumo.append(f'| Só com ficha de engenharia reversa (perfis avulsos) | {len(sobra)} |')
    blocos += [f'## Só com ficha de engenharia reversa ({len(sobra)})', '', '| Ficha |', '|---|'] + [f'| [{n[:-3]}](virais/{n}) |' for n in sobra] + ['']
out += [f'**Total: {total} vídeos** · {len(fichas)} com ficha de engenharia reversa (`virais/`).', '',
        '| Fonte | Vídeos |', '|---|---|'] + resumo + [''] + blocos
(RAIZ / 'acervo-audiovisual' / 'INDICE-VIDEOS.md').write_text('\n'.join(out), encoding='utf-8')
print(total, len(fichas)); print('\n'.join(resumo))
