"""Busca vídeos com licença livre no Wikimedia Commons (muitos são da TV Brasil/NBR, CC BY 3.0) por distrito.
Pausa de 10 s entre buscas e respeita o 429. Saída: candidatos.json. Uso: python buscar_videos.py <saida.json>"""
import urllib.request, json, urllib.parse, time, sys
H = {'User-Agent': 'PorDentroBot/1.0 (canal educativo; uso com credito)'}
Q = {
 'D12 PA mineração': ['mineração Pará', 'Carajás', 'Parauapebas', 'minério de ferro Pará'],
 'D11 Nordeste fruta': ['manga Petrolina', 'fruticultura São Francisco', 'uva Petrolina', 'irrigação Juazeiro', 'cana-de-açúcar Pernambuco'],
 'D10 pecuária': ['pecuária Goiás', 'gado Mato Grosso do Sul', 'rebanho bovino', 'frigorífico'],
 'D9 grãos': ['soja Mato Grosso', 'colheita de soja', 'arroz Rio Grande do Sul', 'safra de grãos'],
 'D8 têxtil': ['indústria têxtil', 'confecção Santa Catarina', 'tecelagem'],
 'D7 madeira': ['floresta plantada', 'reflorestamento Paraná', 'eucalipto', 'tilápia'],
 'D6 transporte': ['Estrada de Ferro Carajás', 'porto de Itaqui', 'São Luís porto', 'trem minério Maranhão'],
 'D5 energia': ['pré-sal', 'plataforma de petróleo', 'Petrobras plataforma', 'Maricá'],
 'D4 pesca': ['camarão', 'carcinicultura', 'pesca Ceará', 'Rio Grande do Norte pesca'],
 'D3 tecnologia': ['Zona Franca de Manaus', 'Polo Industrial de Manaus', 'fábrica Manaus'],
 'D2 pedra': ['minério Minas Gerais', 'Itabira', 'colheita de café', 'café Espírito Santo'],
 'D1 luxo': ['Avenida Paulista', 'bolsa de valores São Paulo', 'Faria Lima'],
 'Capital': ['Esplanada dos Ministérios', 'Brasília Congresso'],
}
out = {}
for dist, termos in Q.items():
    out[dist] = []
    for s in termos:
        q = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'generator': 'search', 'gsrsearch': s + ' filetype:video',
            'gsrnamespace': 6, 'gsrlimit': 8, 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'format': 'json'})
        for tent in range(5):
            try:
                d = json.loads(urllib.request.urlopen(urllib.request.Request(q, headers=H), timeout=30).read()); break
            except urllib.error.HTTPError as e:
                if e.code != 429: raise
                time.sleep(int(e.headers.get('Retry-After', 60)) + 5)
        for p in d.get('query', {}).get('pages', {}).values():
            ii = p['imageinfo'][0]; m = ii['extmetadata']
            out[dist].append({'busca': s, 'titulo': p['title'][5:], 'dur': round(ii.get('duration', 0)), 'w': ii.get('width'), 'lic': m.get('LicenseShortName', {}).get('value'),
                              'pagina': ii['descriptionurl'], 'url': ii['url'], 'desc': m.get('ImageDescription', {}).get('value', '')[:300]})
        time.sleep(10)
    json.dump(out, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(dist, len(out[dist]), flush=True)
