# Modo de escolha: ranqueia as 117 estruturas para UM vídeo e diz por quê.
# Uso (da raiz do repo):
#   python acervo-audiovisual/ferramentas/escolher_estrutura.py --objetivo alcance --nicho gastronomia \
#          --tem fala,local,processo,produto,humor [--cliente VOVINA] [--regulado] [--usadas S70,S84] [--top 8]
#   --cliente lê o bloco "Entrada do motor" de video-tools/clientes/<cliente>.md quando --tem não vier.
# Nada é regra: o ranking é um ponto de partida para o roteirista decidir, com o porquê de cada nota.
import argparse, re, unicodedata, pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
EST = RAIZ / 'acervo-audiovisual' / 'ESTRUTURAS'
TAGS = ['fala', 'duas_pessoas', 'local', 'processo', 'produto', 'clientes', 'numeros', 'humor', 'edicao', 'diaria']

def sem_acento(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')

def lista(v):
    v = v.strip()
    return [x.strip(' "\'') for x in v.strip('[]').split(',') if x.strip(' "\'')] if v else []

def paginas():
    out = {}
    for p in EST.glob('S*.md'):
        t = p.read_text(encoding='utf-8').replace('\r\n', '\n')
        m = re.match(r'---\n(.*?)\n---\n', t, re.S)
        if not m:
            continue
        meta = {}
        for l in m.group(1).splitlines():
            if ':' in l:
                k, v = l.split(':', 1)
                meta[k.strip()] = v.strip()
        n = int(re.sub(r'\D', '', meta.get('codigo', p.stem)) or 0)
        out[n] = dict(arq=p.name, nome=meta.get('nome', ''), objetivo=sem_acento(meta.get('objetivo', '')),
                      funil=meta.get('funil', ''), exige=[x for x in lista(meta.get('exige', '')) if x in TAGS],
                      regulado=sem_acento(meta.get('regulado', '')), fichas=lista(meta.get('fichas', '')),
                      catalogo='catalogo' in sem_acento(meta.get('evidencia', '')))
    return out

def nichos():
    out = {}
    f = EST / 'NICHOS.md'
    for l in f.read_text(encoding='utf-8').splitlines():
        c = [x.strip() for x in l.strip().strip('|').split('|')]
        if len(c) >= 6 and re.fullmatch(r'[a-z0-9-]+', c[1] or '-') and c[1] not in ('chave',):
            out[c[1]] = dict(nome=c[0], tem=[x.strip() for x in c[2].split(',') if x.strip() in TAGS],
                             regulado=sem_acento(c[3]).startswith('sim'),
                             rendem=[int(x) for x in re.findall(r'S(\d+)', c[4])], cuidado=c[5])
    return out

def placar():
    out = []
    f = RAIZ / 'acervo-audiovisual' / 'PLACAR-ESTRUTURAS.md'
    for l in f.read_text(encoding='utf-8').splitlines():
        m = re.match(r'\|\s*(\d{4}-\d\d-\d\d)\s*\|\s*([^|]+?)\s*\|[^|]*\|\s*S(\d{1,3})\s*\|[^|]*\|\s*(\d+(?:[.,]\d+)?)\s*x', l)
        if m:
            out.append((m.group(1), m.group(2).strip().upper(), int(m.group(3)), float(m.group(4).replace(',', '.'))))
    return sorted(out, reverse=True)

def status(v):
    if not v:
        return 'testar'
    media = sum(v) / len(v)
    if len(v) >= 3 and media < 0.7:
        return 'evitar'
    if len(v) >= 2 and v[0] <= 0.7 and v[1] <= 0.7:
        return 'descansar'
    if len(v) == 1:
        return 'testar'
    return 'repetir' if media >= 1.2 else 'neutro'

def entrada_cliente(nome):
    for p in (RAIZ / 'video-tools' / 'clientes').glob('*.md'):
        if sem_acento(nome) in sem_acento(p.stem):
            t = p.read_text(encoding='utf-8')
            m = re.search(r'Entrada do motor(.*?)(?:\n## |\Z)', t, re.S)
            if m:
                tem = [k for k in TAGS if re.search(rf'\b{k}:\s*(sim|às vezes|as vezes)', m.group(1))]
                reg = bool(re.search(r'regulado:\s*sim', m.group(1)))
                return tem, reg, p.name
            return None, None, p.name
    return None, None, None

def main():
    a = argparse.ArgumentParser()
    a.add_argument('--objetivo', required=True, help='alcance, seguidores, salvar, autoridade, prova, conversao, lead, venda, comentario, conexao, retencao…')
    a.add_argument('--funil', default='', help='T, M ou F')
    a.add_argument('--nicho', default='', help='chave da tabela NICHOS.md')
    a.add_argument('--tem', default='', help='etiquetas que o cliente tem, separadas por vírgula')
    a.add_argument('--cliente', default='')
    a.add_argument('--regulado', action='store_true')
    a.add_argument('--usadas', default='', help='códigos usados no mês ou nos últimos vídeos (S70,S84)')
    a.add_argument('--top', type=int, default=8)
    x = a.parse_args()

    pg, ni, pl = paginas(), nichos(), placar()
    obj = sem_acento(x.objetivo)
    obj_alias = {'lead': 'conversao', 'venda': 'conversao', 'objecao': 'conversao', 'compartilhar': 'alcance'}
    objs = {obj, obj_alias.get(obj, obj)}
    nicho = ni.get(x.nicho)
    if x.nicho and not nicho:
        sys.exit(f'Nicho "{x.nicho}" não está em NICHOS.md. Chaves: {", ".join(sorted(ni))}')
    tem = [t for t in x.tem.split(',') if t.strip()] or None
    reg = x.regulado
    fonte_tem = '--tem'
    if x.cliente and tem is None:
        t_, r_, arq = entrada_cliente(x.cliente)
        if t_ is not None:
            tem, reg, fonte_tem = t_, reg or r_, f'ficha de entrada em {arq}'
    if tem is None and nicho:
        tem, fonte_tem = nicho['tem'], f'padrão do nicho {x.nicho} (confirme com a ficha de entrada)'
    if tem is None:
        tem, fonte_tem = [], 'nada informado: só entram estruturas sem exigência'
    if nicho and nicho['regulado']:
        reg = True
    usadas = {int(c) for c in re.findall(r'\d+', x.usadas)}
    cli = sem_acento(x.cliente).upper() if x.cliente else ''

    rank, fora = [], []
    for n, p in pg.items():
        falta = [e for e in p['exige'] if e not in tem]
        if falta:
            fora.append((n, p, 'falta ' + ', '.join(falta)))
            continue
        if reg and p['regulado'].startswith('nao'):
            fora.append((n, p, 'não serve para setor regulado'))
            continue
        nota, por = 0, []
        if any(o and o in p['objetivo'] for o in objs):
            nota += 30; por.append('serve ao objetivo +30')
        if x.funil and x.funil.upper() in p['funil']:
            nota += 10; por.append('funil +10')
        if nicho and n in nicho['rendem']:
            nota += 20; por.append(f'rende em {x.nicho} +20')
        v_cli = [f for d, c, s, f in pl if s == n and cli and sem_acento(c).upper() == cli]
        v_all = [f for d, c, s, f in pl if s == n]
        st = status(v_cli) if cli else None
        if st == 'descansar':
            fora.append((n, p, 'placar: descansar neste cliente (2 últimos ≤ 0,7x)'))
            continue
        if st == 'evitar':
            nota -= 30; por.append('placar: evitar −30')
        elif st == 'repetir':
            nota += 20; por.append('placar do cliente: repetir +20')
        elif st == 'neutro':
            nota += 5; por.append('placar do cliente: neutro +5')
        elif v_cli:
            nota += 10 if v_cli[0] >= 1.2 else 0
            if v_cli[0] >= 1.2:
                por.append(f'1 vídeo deste cliente a {v_cli[0]:.1f}x +10'.replace('.', ','))
        if v_all and not v_cli and status(v_all) == 'repetir':
            nota += 8; por.append('funcionou em outro cliente +8')
        if p['fichas'] and not p['catalogo']:
            b = min(10, 2 * len(p['fichas'])); nota += b; por.append(f'{len(p["fichas"])} exemplo(s) real(is) +{b}')
        else:
            por.append('sem exemplo real: aposta')
        if n in usadas:
            nota -= 15; por.append('já usada há pouco −15')
        if reg and p['regulado'].startswith('com'):
            nota -= 5; por.append('regulado: com cuidado −5')
        rank.append((nota, n, p, por))

    rank.sort(key=lambda r: (-r[0], r[1]))
    print(f'Objetivo: {x.objetivo} · nicho: {x.nicho or "—"} · cliente: {x.cliente or "—"} · regulado: {"sim" if reg else "não"}')
    print(f'O cliente tem: {", ".join(tem) or "nada"} ({fonte_tem})')
    if nicho:
        print(f'Cuidado do nicho: {nicho["cuidado"]}')
    print(f'\nMelhores {x.top} (de {len(rank)} possíveis; {len(fora)} fora da mesa):')
    for nota, n, p, por in rank[:x.top]:
        print(f'  {nota:>3}  S{n} {p["nome"]}  →  acervo-audiovisual/ESTRUTURAS/{p["arq"]}')
        print(f'       {"; ".join(por)}')
    print('\nEscolha uma, abra a página, e dê a nota da etapa 3 (ESTRUTURAS/AVALIACAO.md) antes de roteirizar.')
    perto = [f for f in fora if any(o in f[1]['objetivo'] for o in objs)][:6]
    if perto:
        print('\nServiriam ao objetivo, mas estão fora da mesa:')
        for n, p, motivo in perto:
            print(f'  S{n} {p["nome"]}: {motivo}')

if __name__ == '__main__':
    main()
