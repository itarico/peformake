"""Baixa imagens do Wikimedia Commons (licença livre) e acrescenta em creditos-imagens.csv.
Uso: python baixar_imagens.py <pasta midia/img> "Arquivo.jpg=nome_local" ...   (8 s entre pedidos, respeita 429)"""
import sys, urllib.request, urllib.parse, json, pathlib, csv, time, re, html
D = pathlib.Path(sys.argv[1]); D.mkdir(parents=True, exist_ok=True)
UA = {'User-Agent': 'PorDentroBot/1.0 (canal educativo; uso com credito)'}
cred = D / 'creditos-imagens.csv'; novo = not cred.exists()
with open(cred, 'a', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    if novo: w.writerow(['arquivo', 'título no Commons', 'autor', 'licença', 'página', 'crédito na tela'])
    for par in sys.argv[2:]:
        tit, nome = par.split('=')
        q = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'titles': 'File:' + tit, 'prop': 'imageinfo',
            'iiprop': 'url|extmetadata', 'iiurlwidth': 1920, 'format': 'json'})
        p = next(iter(json.loads(urllib.request.urlopen(urllib.request.Request(q, headers=UA), timeout=60).read())['query']['pages'].values()))
        ii = p['imageinfo'][0]; m = ii['extmetadata']
        url = ii.get('thumburl') or ii['url']; ext = url.split('?')[0].rsplit('.', 1)[-1].lower()
        dest = D / f'{nome}.{ext}'
        for tent in range(4):
            try: dest.write_bytes(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()); break
            except urllib.error.HTTPError as e:
                if e.code != 429: raise
                time.sleep(int(e.headers.get('Retry-After', 60)))
        autor = re.sub('<[^>]+>', '', html.unescape(m.get('Artist', {}).get('value', ''))).strip()
        lic = m.get('LicenseShortName', {}).get('value', '')
        w.writerow([dest.name, tit, autor, lic, ii['descriptionurl'], f'{autor} · {lic} · Wikimedia Commons'])
        print(dest.name, lic, autor[:40]); time.sleep(8)
