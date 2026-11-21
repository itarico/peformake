"""Extrai a fala do ROTEIRO-v2.md em frases numeradas (um take por linha).
Saída: falas.json [{n, bloco, sub, texto}] usado pela narração, pela voz-guia e pelas cenas."""
import re, json, sys, pathlib
aqui = pathlib.Path(__file__).resolve().parent
src = (aqui.parent / 'ROTEIRO-v3.md').read_text(encoding='utf-8')
fala = src.split('## Fala (palavra por palavra)')[1].split('**Contagem:**')[0]
bloco = sub = None; out = []
for ln in fala.splitlines():
    m = re.match(r'### (\S+) · (.+?) \(', ln)
    if m: bloco, sub = m.group(1), m.group(2); continue
    m = re.match(r'\*\*(Distrito \d+[^*]*)\*\*', ln)
    if m: sub = m.group(1); continue
    if ln.startswith('**Três aberturas'): bloco = None
    if not ln.startswith('> ') or bloco is None: continue
    t = ln[2:].strip()
    # quebra em frases, mantendo [pausa] colado à frase anterior
    partes = re.split(r'(?<=[.?!])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ*"])', t)
    for p in partes:
        p = p.strip()
        if p: out.append({'bloco': bloco, 'sub': sub, 'texto': p})
for i, o in enumerate(out, 1): o['n'] = i
json.dump(out, open(aqui / 'falas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out), 'frases', sum(len(re.sub(r'\[.*?\]|\*', '', o['texto']).split()) for o in out), 'palavras')
