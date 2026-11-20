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

# ---------- Gramática por estrutura (acervo-audiovisual/ESTRUTURAS/S__.md): a fonte do esqueleto ----------
GRAM_DIR = RAIZ / 'acervo-audiovisual' / 'ESTRUTURAS'
TAGS = ['fala', 'duas_pessoas', 'local', 'processo', 'produto', 'clientes', 'numeros', 'humor', 'edicao', 'diaria']

def lista_yaml(v):
    v = v.strip()
    if v.startswith('['):
        return [x.strip(' "\'') for x in v.strip('[]').split(',') if x.strip(' "\'')]
    return [v] if v else []

gram = {}
for g in sorted(GRAM_DIR.glob('S*.md')):
    t = g.read_text(encoding='utf-8')
    m = re.match(r'---\n(.*?)\n---\n', t.replace('\r\n', '\n'), re.S)
    t = t.replace('\r\n', '\n')
    if not m:
        continue
    meta = {}
    for l in m.group(1).splitlines():
        if ':' in l:
            k, v = l.split(':', 1)
            meta[k.strip()] = v.strip()
    corpo = t[m.end():]
    blocos = []
    for l in secao(corpo, 'Blocos').splitlines():
        c = [x.strip() for x in l.strip().strip('|').split('|')]
        if len(c) >= 3 and re.match(r'\d', c[0]):
            blocos.append((c[0], c[1], re.sub(r'\*\*', '', c[2])))
    publico = {}
    for l in secao(corpo, 'Evidência').splitlines():
        c = [x.strip() for x in l.strip().strip('|').split('|')]
        if len(c) >= 3 and c[0] and not c[0].startswith(('Ficha', '---')):
            arq = re.search(r'(\d{4}-\d\d-\d\d_[^)\s\]]+?)(?:\.md)?(?:\]|\)|$|\s)', c[0])
            if arq:
                publico[arq.group(1) + '.md'] = c[2]
    try:
        n = int(meta.get('codigo', g.stem)[1:])
    except ValueError:
        continue
    gram[n] = dict(arq=g.name, nome=meta.get('nome', ''), objetivo=meta.get('objetivo', ''),
                   funil=meta.get('funil', ''), exige=[x for x in lista_yaml(meta.get('exige', '')) if x in TAGS],
                   regulado=meta.get('regulado', ''), duracao=meta.get('duracao', ''),
                   apelidos=lista_yaml(meta.get('apelidos', '')), mecanismo=' '.join(secao(corpo, 'Mecanismo').split()),
                   errado=[l.strip('- ').strip() for l in secao(corpo, 'Dá errado quando').splitlines() if l.strip().startswith('-')],
                   blocos=blocos, publico=publico)

def pub(f):
    for n in f['codigos']:
        x = gram.get(int(n), {}).get('publico', {}).get(f['arq'])
        if x:
            return x
    return ''

def fx_pub(f):
    p_ = pub(f)
    return fx(f) + (f' (público: {p_})' if p_ else '')

def blocos_txt(n, limite=8):
    g_ = gram.get(n)
    if not g_:
        return []
    return [f'{a}% · {b}: {c}'[:220] for a, b, c in g_['blocos'][:limite]]

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

# ---------- Placar: o resultado dos NOSSOS vídeos publicados (auto-aprimoramento) ----------
placar = {}
PLACAR = RAIZ / 'acervo-audiovisual' / 'PLACAR-ESTRUTURAS.md'
if PLACAR.exists():
    for l in PLACAR.read_text(encoding='utf-8').splitlines():
        m = re.match(r'\|\s*(\d{4}-\d\d-\d\d)\s*\|\s*([^|]+?)\s*\|[^|]*\|\s*S(\d{1,3})\s*\|[^|]*\|\s*(\d+(?:[.,]\d+)?)\s*x', l)
        if m:
            placar.setdefault(int(m.group(3)), []).append((m.group(1), m.group(2), num(m.group(4))))
for n in placar:  # mais recente primeiro (o status "descansar" olha os 2 últimos)
    placar[n] = [(c_, x) for d_, c_, x in sorted(placar[n], reverse=True)]

def status_lista(v):
    """v = [(cliente, força)] na ordem do arquivo (mais recente primeiro)."""
    if not v:
        return 'testar'
    media = sum(x for _, x in v) / len(v)
    if len(v) >= 3 and media < 0.7:
        return 'evitar'
    if len(v) >= 2 and v[0][1] <= 0.7 and v[1][1] <= 0.7:
        return 'descansar'
    if len(v) <= 1:
        return 'testar'
    if media >= 1.2:
        return 'repetir'
    return 'neutro'

def placar_txt(n):
    v = placar.get(n)
    if not v:
        return ''
    media = sum(x for _, x in v) / len(v)
    por_cli = {}
    for c_, x in v:
        por_cli.setdefault(c_, []).append((c_, x))
    cli = '; '.join(f'{c_} {len(l)} vídeo(s) → {status_lista(l)}' for c_, l in sorted(por_cli.items()))
    return f'nosso placar: {len(v)} vídeo(s), média {media:.1f}x'.replace('.', ',') + f' · status {status_lista(v)} ({cli})'

# ---------- MAPA completo ----------
out = ['# Mapa de estruturas (gerado das fichas de virais)', '',
       'Gerado por `acervo-audiovisual/ferramentas/mapa_estruturas.py` a partir de `acervo-audiovisual/virais/`.',
       'Não editar à mão: escreva ou corrija a ficha e rode o script de novo.', '',
       f'{len(fichas)} fichas · {len(por_s)} códigos S com exemplo real · {len(novos)} candidatos a S-novo.', '',
       'Porta de entrada: `acervo-audiovisual/MOTOR.md`. Como usar (motor de roteiro, M2 curador e M5 roteirista):',
       '1. Tire da mesa o que o cliente não consegue gravar (`ESTRUTURAS/FICHA-ENTRADA.md` e a tabela "Por exigência").',
       '2. Escolha o código S pelo objetivo da vaga ("Por objetivo"), preferindo o status do placar (repetir > neutro > testar).',
       '3. Siga a **gramática** do código (`ESTRUTURAS/S__.md`: blocos em % da duração), com o conteúdo do cliente (MDD).',
       '   As fichas são prova e inspiração, não molde. Grave `data.estrutura` antes de gravar e cite a ficha em `inspirado`.',
       '4. A força (Nx a mediana) mede o vídeo no perfil dele e vem com o público daquele perfil: força num perfil de',
       '   editores falando para editores não vale o mesmo para um negócio comum. A banca continua valendo.', '',
       f'{len(gram)} códigos com gramática escrita. Apelidos (M, H, V, E) em `ESTRUTURAS/EQUIVALENCIAS.md`.', '',
       '## Por objetivo', '', '| Grupo | Objetivo típico | Códigos com exemplo |', '|---|---|---|']
for a, b, nome, obj in GRUPOS:
    cs = [f'S{n} ({len(por_s[n])})' for n in range(a, b + 1) if n in por_s]
    out.append(f'| {nome} (S{a}–S{b}) | {obj} | {", ".join(cs) or "nenhum ainda"} |')
out += ['', '## Por exigência (o que o cliente precisa ter)', '',
        'Uma estrutura entra na mesa quando o cliente tem tudo o que ela exige (`ESTRUTURAS/FICHA-ENTRADA.md`).', '',
        '| Código | Exige | Funil | Regulado | Duração |', '|---|---|---|---|---|']
for n in sorted(gram):
    g_ = gram[n]
    out.append(f"| [S{n} {g_['nome'] or nomes.get('S'+str(n), '?')}](ESTRUTURAS/{g_['arq']}) | {', '.join(g_['exige']) or 'nada especial'} | {g_['funil']} | {g_['regulado']} | {g_['duracao']} |")
out += ['', '## Nosso placar (vídeos publicados de clientes)', '',
        'De `PLACAR-ESTRUTURAS.md`. Vale mais que a força nos perfis de fora: é o que funcionou com o nosso público.', '']
for n in sorted(placar, key=lambda n: -sum(x for _, x in placar[n]) / len(placar[n])):
    out.append(f'- S{n} {nomes.get("S"+str(n), "?")}: {placar_txt(n)}')
if not placar:
    out.append('- (vazio)')
out += ['', '## Os mais fortes (força no perfil de origem, com o público dele)', '',
        'Força alta num perfil de editores ou criadores mede o interesse DESSE público. Leia junto com a coluna público.', '']
for f in sorted([f for f in fichas if f['forca']], key=lambda f: -f['forca'])[:15]:
    cod = ' + '.join('S' + c for c in f['codigos']) or ('S-novo: ' + f['novo'])
    out.append(f"- **{fx_pub(f)}** · {cod} · {f['titulo']} · {f['perfil']} · [ficha](virais/{f['arq']})")
out += ['', '## Por código', '']
for n in sorted(por_s):
    lista = sorted(por_s[n], key=chave)
    g, obj = grupo(n)
    out.append(f'### S{n} · {nomes.get("S"+str(n), "?")}  ({g}; {obj})')
    if placar_txt(n):
        out.append(f'**{placar_txt(n).capitalize()}**')
    for principal, f in lista:
        papel = '' if principal else ' (secundária)'
        dif = ' · difícil de repetir' if f['dificil'] else ''
        out.append(f"- {fx_pub(f)} · {f['titulo']} · {f['perfil']}{papel}{dif} · [ficha](virais/{f['arq']})")
    g_ = gram.get(n)
    if g_:
        out.append(f"\n**Gramática** ([ESTRUTURAS/{g_['arq']}](ESTRUTURAS/{g_['arq']})) · exige: {', '.join(g_['exige']) or 'nada especial'}"
                   f" · funil {g_['funil']} · regulado: {g_['regulado']}")
        if g_['mecanismo']:
            out.append(f"Mecanismo: {g_['mecanismo']}")
        out += [f'  {i}. {l}' for i, l in enumerate(blocos_txt(n), 1)]
    else:
        melhor = lista[0][1]
        esq = resumo_esq(melhor['esq'], 8)
        if esq:
            out.append(f"\nSem gramática escrita ainda. Esqueleto de UM vídeo ({melhor['perfil']}), só como pista:")
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
     'Uso: no M2 (curador), para cada vaga escolha um código S abaixo que sirva ao objetivo E que o cliente consiga gravar',
     '(campo "exige" contra a ficha de entrada do cliente). Prefira o status do placar: repetir > neutro > testar;',
     'descansar = não usar naquele cliente por 30 dias; evitar = só com motivo no card.',
     'No M5 (roteirista), siga os blocos da gramática (em % da duração) com o conteúdo real do cliente (MDD). Grave',
     'data.estrutura com o código e cite a ficha em inspirado {link, numero}. Copie a mecânica, nunca a fala, a marca ou a imagem.',
     'Força = Nx a mediana do perfil de origem, com o público daquele perfil: não garante aqui. A banca (M9) continua valendo.',
     '', '## Nosso placar']
for n in sorted(placar, key=lambda n: -sum(x for _, x in placar[n]) / len(placar[n])):
    c.append(f'- S{n} {nomes.get("S"+str(n), "?")}: {placar_txt(n)}')
c.append('')
for n in sorted(por_s):
    lista = sorted(por_s[n], key=chave)
    melhor = lista[0][1]
    g, obj = grupo(n)
    refs = '; '.join(f"{f['perfil']} {fx_pub(f)} \"{f['titulo'][:70]}\"" for _, f in lista[:3])
    g_ = gram.get(n)
    c.append(f'## S{n} {nomes.get("S"+str(n), "?")} · {obj}')
    if g_:
        c.append(f"Exige: {', '.join(g_['exige']) or 'nada especial'} · funil {g_['funil']} · regulado: {g_['regulado']} · {g_['duracao']}")
        if g_['mecanismo']:
            c.append(f"Mecanismo: {g_['mecanismo'][:400]}")
    c.append(f'Exemplos: {refs}. Ficha: virais/{melhor["arq"]}')
    if placar_txt(n):
        c.append(placar_txt(n).capitalize())
    if g_:
        c += blocos_txt(n, 7)
        if g_['errado']:
            c.append('Dá errado quando: ' + '; '.join(x[:120] for x in g_['errado'][:3]))
    else:
        c.append('(sem gramática escrita; esqueleto de um vídeo só, como pista)')
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
    g_ = gram.get(int(cod))
    if g_ and g_['blocos']:
        passos = ' → '.join(f"{b} ({a}%)" for a, b, _ in g_['blocos'][:8])
        ex = f"exige {', '.join(g_['exige']) or 'nada especial'}"
    else:
        passos = ' → '.join(re.split(r'[;(]', x)[0].strip()[:70] for _, x in itens(f['esq'])[:7])
        ex = 'sem gramática'
    top.append(f"S{cod} {nomes['S'+cod]} ({fx_pub(f)} em {f['perfil']}; {ex}): {passos}")
    if len(top) >= 20:
        break
ts = ('// Gerado por acervo-audiovisual/ferramentas/mapa_estruturas.py a partir das fichas de virais. Não editar à mão.\n'
      '// Estruturas com exemplo real no acervo, uma por código, da mais forte para a menos forte.\n'
      'export const ESTRUTURAS_PROVADAS = ' + json.dumps('\n'.join(['- ' + l for l in top] + (
          ['Nosso placar (vídeos publicados de clientes; vale mais que a força de fora): ' + '; '.join(
              f'S{n} {placar_txt(n)}' for n in sorted(placar, key=lambda n: -sum(x for _, x in placar[n]) / len(placar[n])))]
          if placar else [])), ensure_ascii=False) + '\n')
for fn in ('strategy-cards', 'monthly-strategy'):  # uma cópia por função (publicação simples, sem pasta compartilhada)
    (RAIZ / 'peformake-gestao' / 'supabase' / 'functions' / fn / 'estruturasProvadas.ts').write_text(ts, encoding='utf-8')
# ---------- Equivalências: um código principal (S), o resto são apelidos ----------
eq = ['# Equivalências de códigos (gerado; não editar à mão)', '',
      'O código principal de estrutura é o S. Os outros códigos que você encontrar em documentos antigos são apelidos:',
      'M = modelos de roteiro (`.claude/skills/roteiro-narrativa/MODELOS.md`, `estudo_narrativas.md`, `estudo_mavic.md`),',
      'H/V = humor e venda invisível (`estudo_mavic.md`), G = gancho (`estudo_narrativas.md`), E = estilo de edição',
      '(`video-tools/estilos/catalogo_estilos.md`). Fonte: campo `apelidos` de cada `ESTRUTURAS/S__.md`.', '',
      '## Por estrutura', '', '| Estrutura | Apelidos |', '|---|---|']
inv = {}
for n in sorted(gram):
    ap = gram[n]['apelidos']
    eq.append(f"| [S{n} {gram[n]['nome'] or nomes.get('S'+str(n), '?')}]({gram[n]['arq']}) | {', '.join(ap) or '—'} |")
    for a in ap:
        inv.setdefault(a, []).append(f'S{n}')
def ordem(k):
    m_ = re.match(r'([A-Z]+)(\d+)', k)
    return (m_.group(1), int(m_.group(2))) if m_ else (k, 0)
eq += ['', '## Por apelido (achou um código antigo? vá para o S)', '', '| Apelido | Estrutura(s) |', '|---|---|']
eq += [f'| {a} | {", ".join(v)} |' for a, v in sorted(inv.items(), key=lambda kv: ordem(kv[0]))]
(GRAM_DIR / 'EQUIVALENCIAS.md').write_text('\n'.join(eq) + '\n', encoding='utf-8')

# ---------- Em cada página: os vídeos estudados (link, números, viralizou?, nota de referência) ----------
INI, FIM = '<!-- videos:inicio (gerado pelo mapa_estruturas.py; não editar à mão) -->', '<!-- videos:fim -->'

def numeros_ficha(arq):
    t = (VIRAIS / arq).read_text(encoding='utf-8')
    cab = ' '.join(t.splitlines()[1:8])
    url = re.search(r'https?://\S+?(?=[\s·)]|$)', cab)
    def n_(pad):
        m_ = re.search(r'([\d.]+)\s*' + pad, cab)
        return m_.group(1) if m_ else '—'
    vi = 'não públicas' if re.search(r'visualizações não públicas', cab) else n_('visualizações')
    return (url.group(0) if url else ''), n_('curtidas'), n_('comentários'), vi

def viralizou(f):
    if not f['forca']:
        return 'sem mediana'
    x = f['forca']
    return 'sim, muito (10x+)' if x >= 10 else 'sim (3x+)' if x >= 3 else 'acima do normal' if x >= 1.5 else 'não'

def nota_ref(f, principal, publico):
    x = f['forca']
    pf = 1 if not x else 5 if x >= 50 else 4 if x >= 10 else 3 if x >= 5 else 2 if x >= 3 else 1 if x >= 1.5 else 0
    pp = 3 if principal else 1
    pu = sem = publico.lower()
    pb = 2 if any(k in sem for k in ('negócio local', 'marca/empresa', 'marca')) else 1 if any(
        k in sem for k in ('marketing', 'lifestyle', 'pessoal', 'fé')) else 0
    return pf + pp + pb

placar_linhas = []
if PLACAR.exists():
    for l in PLACAR.read_text(encoding='utf-8').splitlines():
        c_ = [x.strip() for x in l.strip().strip('|').split('|')]
        if len(c_) >= 6 and re.match(r'\d{4}-\d\d-\d\d', c_[0]) and re.match(r'S\d+', c_[3]):
            placar_linhas.append(c_)

for n, g_ in gram.items():
    pth = GRAM_DIR / g_['arq']
    t = pth.read_text(encoding='utf-8')
    ls = ['## Vídeos estudados', INI, '',
          'Nota de referência (0–10) = força no perfil de origem (até 5) + papel da estrutura no vídeo (principal 3,',
          'secundária 1) + público parecido com o de um negócio comum (até 2). Mede quanto o vídeo serve de exemplo para',
          'esta estrutura, não a qualidade do vídeo. Viralizou = força contra a mediana do próprio perfil (3x+ = sim).', '']
    lista_s = sorted(por_s.get(n, []), key=chave)
    if lista_s:
        ls += ['| Vídeo | Perfil | Curtidas · comentários · views | Força | Viralizou? | Nota ref. | Ficha |', '|---|---|---|---|---|---|---|']
        for principal, f in lista_s:
            url, cu, co, vi = numeros_ficha(f['arq'])
            pub_ = g_['publico'].get(f['arq'], '')
            ls.append(f"| {url and f'[{f['titulo'][:60]}]({url})' or f['titulo'][:60]} | {f['perfil']} | {cu} · {co} · {vi} | {fx(f)} | "
                      f"{viralizou(f)} | **{nota_ref(f, principal, pub_)}** {'' if principal else '(secundária)'} | [ficha](../virais/{f['arq']}) |")
    else:
        ls.append('Nenhum vídeo estudado ainda nesta estrutura (página feita do catálogo).')
    nossos = [c_ for c_ in placar_linhas if c_[3] == f'S{n}']
    if nossos:
        ls += ['', '**Nossos vídeos publicados com esta estrutura** (placar):', '',
               '| Data | Cliente | Vídeo | Views | Força | Nota |', '|---|---|---|---|---|---|']
        ls += [f'| {c_[0]} | {c_[1]} | {c_[2]} | {c_[4]} | {c_[5]} | {c_[6] if len(c_) > 6 else ""} |' for c_ in nossos]
    ls += ['', FIM]
    bloco = '\n'.join(ls)
    if INI in t:
        t = re.sub(r'## Vídeos estudados\n' + re.escape(INI) + r'.*?' + re.escape(FIM), lambda _: bloco, t, flags=re.S)
    else:
        t = t.rstrip() + '\n\n' + bloco + '\n'
    pth.write_text(t, encoding='utf-8')

print(len(gram), 'gramáticas;', len(fichas), 'fichas;', len(por_s), 'códigos;', len(novos), 'S-novo;', len(top), 'no resumo curto')
