# Gera o mapa de estruturas a partir das fichas de acervo-audiovisual/virais/.
# Uso: python mapa_estruturas.py  (roda da raiz do repo ou de qualquer lugar)
# Saídas:
#   acervo-audiovisual/MAPA-ESTRUTURAS.md           (leitura humana e das sessões)
#   acervo-audiovisual/MAPA-ESTRUTURAS-COMPACTO.md (lido pelo agente da estratégia, M1/M2/M5 do roteiro-master)
#   peformake-gestao/supabase/functions/{strategy-cards,monthly-strategy}/estruturasProvadas.ts (resumo curto para as funções de IA)
import re, os, json, pathlib

RAIZ = pathlib.Path(__file__).resolve().parents[2]
VIRAIS = RAIZ / 'acervo-audiovisual' / 'virais'
EST_TS = RAIZ / 'peformake-gestao' / 'src' / 'features' / 'strategy' / 'brief' / 'estruturas.ts'

nomes = json.loads(re.search(r'=\s*(\{.*\})', EST_TS.read_text(encoding='utf-8'), re.S).group(1))

# Grupo do catálogo -> objetivo típico (ESTUDO-ROTEIRO-AUDIOVISUAL.md §3c, faixas de código)
GRUPOS = [
    (1, 11, 'Opinião e tese', 'autoridade, posicionamento'),
    (12, 20, 'Pergunta e entrevista', 'autoridade, humanizar'),
    (21, 28, 'UGC e cliente', 'prova, conversão'),
    (29, 38, 'Gancho visual e quebra', 'alcance'),
    (39, 49, 'História', 'alcance, conexão'),
    (50, 60, 'Educativo', 'salvar, autoridade'),
    (61, 69, 'Prova', 'conversão, objeção'),
    (70, 80, 'Humor e trend', 'alcance, seguidores'),
    (81, 90, 'Venda direta', 'conversão'),
    (91, 96, 'Série e recorrência', 'seguidores, retenção'),
    (97, 103, 'Reação e interação', 'alcance, comentário'),
    (104, 112, 'Sem rosto e processo', 'alcance, viabilidade'),
    (113, 117, 'Processo e bastidor', 'prova, alcance'),
]

def grupo(n):
    for a, b, nome, obj in GRUPOS:
        if a <= n <= b:
            return nome, obj
    return '?', '?'

def secao(txt, titulo):
    m = re.search(r'^## ' + titulo + r'[^\n]*\n(.*?)(?=^## |\Z)', txt, re.S | re.M)
    return m.group(1).strip() if m else ''

def num(s):
    return float(s.replace(',', '.'))

fichas = []
for p in sorted(VIRAIS.glob('*.md')):
    if p.name == 'README.md':
        continue
    t = p.read_text(encoding='utf-8')
    titulo = t.splitlines()[0].lstrip('# ').strip()
    curto = titulo.split(' · ')[0]
    m = re.search(r'· (@[\w.]+)', titulo)
    perfil = m.group(1) if m else '@' + p.stem[11:].rsplit('_', 1)[0]
    m = re.search(r'(\d+(?:[.,]\d+)?)\s*x a mediana', t)
    forca = num(m.group(1)) if m else None
    m = re.search(r'^\*\*Estruturas? do catálogo:\*\*(.*?)(?:\n\n|\n(?=Estilo))', t, re.S | re.M)
    est = ' '.join(m.group(1).split()) if m else ''
    codigos = []
    for c in re.findall(r'\bS(\d{1,3})\b', est):
        if c not in codigos and c in [k[1:] for k in nomes]:
            codigos.append(c)
    novo = re.search(r'S-novo:?\s*"?([^"(+.]+)', est)
    novo = novo.group(1).strip(' :') if novo else ''
    esq = secao(t, 'Esqueleto reutilizável') or secao(t, r'Estrutura \(o principal\)')
    molde = secao(t, 'Molde de fala')
    porque = secao(t, 'Por que funcionou')
    dificil = bool(re.search(r'difícil de repetir', t, re.I))
    fichas.append(dict(arq=p.name, titulo=curto, perfil=perfil, forca=forca, est=est, codigos=codigos,
                       novo=novo, esq=esq, molde=molde, porque=porque, dificil=dificil))

por_s = {}
for f in fichas:
    for i, c in enumerate(f['codigos']):
        por_s.setdefault(int(c), []).append((i == 0, f))
novos = [f for f in fichas if f['novo']]

def fx(f):
    return f"{f['forca']:.1f}".replace('.', ',') + 'x' if f['forca'] else 's/ mediana'

def chave(par):
    principal, f = par
    return (not principal, not f['esq'], -(f['forca'] or 0))

def itens(esq):
    """Quebra o esqueleto em passos (tempo, texto curto), aceite lista em linhas ou na mesma linha."""
    corrido = ' '.join(l.strip() for l in esq.splitlines() if l.strip())
    partes = re.split(r'(?:^|\s)\d{1,2}\.\s+(?=\*\*|[A-ZÁÉÍÓÚÂÊÔÃÕ"0-9])', corrido)
    saida = []
    for parte in partes:
        parte = parte.strip()
        if not parte:
            continue
        m = re.match(r'\*\*([^*]+)\*\*:?\s*(.*)', parte)
        tempo, resto = (m.group(1).strip(' :.'), m.group(2)) if m else ('', parte)
        resto = re.sub(r'\*\*|`', '', resto).strip(' :')
        frase = re.split(r'(?<=[a-zà-ú0-9)"])\.\s', resto)[0].strip()
        if len(frase) > 110:
            frase = frase[:107].rsplit(' ', 1)[0] + '…'
        saida.append((tempo, frase))
    return saida

def resumo_esq(esq, limite=6):
    return [(f'{t}: {x}' if t else x) for t, x in itens(esq)[:limite]]

# ---------- MAPA completo ----------
out = ['# Mapa de estruturas (gerado das fichas de virais)', '',
       'Gerado por `acervo-audiovisual/ferramentas/mapa_estruturas.py` a partir de `acervo-audiovisual/virais/`.',
       'Não editar à mão: escreva ou corrija a ficha e rode o script de novo.', '',
       f'{len(fichas)} fichas · {len(por_s)} códigos S com exemplo real · {len(novos)} candidatos a S-novo.', '',
       'Como usar (motor de roteiro, M2 curador e M5 roteirista):',
       '1. Escolha o código S pelo objetivo da vaga (tabela "Por objetivo").',
       '2. Abra a ficha mais forte daquele código e siga o esqueleto e o molde de fala com o conteúdo do cliente (MDD).',
       '3. Grave `data.estrutura` com o código e cite a ficha em `inspirado`.',
       '4. A força (Nx a mediana) mede o vídeo no perfil dele, não garante nada no nosso. A banca continua valendo.', '',
       '## Por objetivo', '', '| Grupo | Objetivo típico | Códigos com exemplo |', '|---|---|---|']
for a, b, nome, obj in GRUPOS:
    cs = [f'S{n} ({len(por_s[n])})' for n in range(a, b + 1) if n in por_s]
    out.append(f'| {nome} (S{a}–S{b}) | {obj} | {", ".join(cs) or "nenhum ainda"} |')
out += ['', '## Os mais fortes (força no perfil)', '']
for f in sorted([f for f in fichas if f['forca']], key=lambda f: -f['forca'])[:15]:
    cod = ' + '.join('S' + c for c in f['codigos']) or ('S-novo: ' + f['novo'])
    out.append(f"- **{fx(f)}** · {cod} · {f['titulo']} · {f['perfil']} · [ficha](virais/{f['arq']})")
out += ['', '## Por código', '']
for n in sorted(por_s):
    lista = sorted(por_s[n], key=chave)
    g, obj = grupo(n)
    out.append(f'### S{n} · {nomes.get("S"+str(n), "?")}  ({g}; {obj})')
    for principal, f in lista:
        papel = '' if principal else ' (secundária)'
        dif = ' · difícil de repetir' if f['dificil'] else ''
        out.append(f"- {fx(f)} · {f['titulo']} · {f['perfil']}{papel}{dif} · [ficha](virais/{f['arq']})")
    melhor = lista[0][1]
    esq = resumo_esq(melhor['esq'], 8)
    if esq:
        out.append(f"\nEsqueleto (da ficha mais forte, {melhor['perfil']}):")
        out += [f'  {i}. {l}' for i, l in enumerate(esq, 1)]
    out.append('')
out += ['## Candidatos a S-novo', '']
for f in sorted(novos, key=lambda f: -(f['forca'] or 0)):
    out.append(f"- **{f['novo']}** · {fx(f)} · {f['titulo']} · {f['perfil']} · [ficha](virais/{f['arq']})")
sem = [f'S{n} {nomes["S"+str(n)]}' for n in range(1, 118) if n not in por_s]
out += ['', f'## Códigos do catálogo ainda sem exemplo real ({len(sem)})', '', '; '.join(sem), '']
(RAIZ / 'acervo-audiovisual' / 'MAPA-ESTRUTURAS.md').write_text('\n'.join(out), encoding='utf-8')

# ---------- Compacto para o banco (agente da estratégia) ----------
c = ['# Acervo de estruturas provadas (gerado das fichas; não editar à mão)', '',
     'Fonte: acervo-audiovisual/MAPA-ESTRUTURAS.md e as fichas em acervo-audiovisual/virais/ (GitHub itarico/peformake).',
     'Uso: no M2 (curador), para cada vaga escolha um código S abaixo que sirva ao objetivo; prefira o de maior força.',
     'No M5 (roteirista), siga o esqueleto trocando tudo pelo conteúdo real do cliente (MDD). Grave data.estrutura com o',
     'código e cite a ficha em inspirado {link, numero}. Copie a mecânica, nunca a fala, a marca ou a imagem.',
     'Força = Nx a mediana do perfil de origem: mede o vídeo lá, não garante aqui. A banca (M9) continua valendo.', '']
for n in sorted(por_s):
    lista = sorted(por_s[n], key=chave)
    melhor = lista[0][1]
    g, obj = grupo(n)
    refs = '; '.join(f"{f['perfil']} {fx(f)} \"{f['titulo'][:70]}\"" for _, f in lista[:3])
    c.append(f'## S{n} {nomes.get("S"+str(n), "?")} · {obj}')
    c.append(f'Exemplos: {refs}. Ficha: virais/{melhor["arq"]}')
    for l in resumo_esq(melhor['esq'], 7):
        c.append(re.sub(r'\*\*', '', l)[:220])
    c.append('')
c.append('## S-novo (estruturas novas vistas no acervo)')
for f in sorted(novos, key=lambda f: -(f['forca'] or 0)):
    c.append(f"- {f['novo']} · {fx(f)} · {f['perfil']} · virais/{f['arq']}")
(RAIZ / 'acervo-audiovisual' / 'MAPA-ESTRUTURAS-COMPACTO.md').write_text('\n'.join(c), encoding='utf-8')

# ---------- Curto para as funções de IA ----------
top = []
vistos = set()
for f in sorted([f for f in fichas if f['forca'] and f['codigos'] and itens(f['esq'])], key=lambda f: -f['forca']):
    cod = f['codigos'][0]
    if cod in vistos:
        continue
    vistos.add(cod)
    passos = ' → '.join(re.split(r'[;(]', x)[0].strip()[:70] for _, x in itens(f['esq'])[:7])
    top.append(f"S{cod} {nomes['S'+cod]} ({fx(f)} em {f['perfil']}): {passos}")
    if len(top) >= 20:
        break
ts = ('// Gerado por acervo-audiovisual/ferramentas/mapa_estruturas.py a partir das fichas de virais. Não editar à mão.\n'
      '// Estruturas com exemplo real no acervo, uma por código, da mais forte para a menos forte.\n'
      'export const ESTRUTURAS_PROVADAS = ' + json.dumps('\n'.join('- ' + l for l in top), ensure_ascii=False) + '\n')
for fn in ('strategy-cards', 'monthly-strategy'):  # uma cópia por função (publicação simples, sem pasta compartilhada)
    (RAIZ / 'peformake-gestao' / 'supabase' / 'functions' / fn / 'estruturasProvadas.ts').write_text(ts, encoding='utf-8')
print(len(fichas), 'fichas;', len(por_s), 'códigos;', len(novos), 'S-novo;', len(top), 'no resumo curto')
