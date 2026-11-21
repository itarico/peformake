# Gera v80/creditos-imagens.csv (arquivo, fonte, url, autor, licenca, tempo de uso no v80) e v80/descricao-creditos.txt
# (texto pronto para a descricao do YouTube). O tempo de uso sai de v80/linha_v80.json.
import csv, json, pathlib, urllib.parse
V80 = pathlib.Path(__file__).resolve().parent.parent
C = 'https://commons.wikimedia.org/wiki/File:'
M = {  # id: (titulo no Commons ou URL, autor, licenca)
 '01_laozi_boi_zhang_lu': ('Zhang Lu-Laozi Riding an Ox.jpg', 'Zhang Lu (dinastia Ming), Museu do Palácio Nacional', 'domínio público'),
 '02_confucio_laozi_han': ('Rock painting-Confucius Meeting Lao Tzu (Rubbing).jpg', 'anônimo, dinastia Han', 'domínio público'),
 '03_sima_qian': ('Sima Qian (painted portrait).jpg', 'anônimo', 'domínio público'),
 '04_fan_kuan_montanhas': ('Fan Kuan - Travelers Among Mountains and Streams - Google Art Project.jpg', 'Fan Kuan, c. 1000', 'domínio público'),
 '05a_ma_yuan_nuvens': ('Ma Yuan - Water Album - Clouds Rising from the Green Sea.jpg', 'Ma Yuan, c. 1200', 'domínio público'),
 '05b_ma_yuan_yangzi': ('Ma Yuan - Water Album - Ten Thousand Riplets on the Yangzi.jpg', 'Ma Yuan, c. 1200', 'domínio público'),
 '05c_ma_yuan_cheia': ('Ma Yuan - Water Album - The Waving Surface of the Autumn Flood.jpg', 'Ma Yuan, c. 1200', 'domínio público'),
 '05d_ma_yuan_rio_amarelo': ('Ma Yuan - Water Album - The Yellow River Breaches its Course.jpg', 'Ma Yuan, c. 1200', 'domínio público'),
 '06_tiras_bambu': ('Warring States or Han Bamboo Slips of Daoist Text (9974128735).jpg', 'Gary Todd', 'CC0'),
 '07_daode_tianzun': ('The Three Purities, one of three - Daode Tianzun.jpg', 'anônimo, dinastia Ming', 'domínio público'),
 '08_zhang_daoling': ('張道陵.jpg', 'anônimo', 'domínio público'),
 '09_talismas': ('Taoist numismatic charms with Taoist magic writing from the Qin Ding Qian Lu 01.jpg', 'anônimo, antes de 1911', 'domínio público'),
 '10_xuanzong_fuga_shu': ("南宋 佚名 明皇幸蜀圖 軸-Emperor Xuanzong's Flight to Shu MET DP247677.jpg", 'anônimo, séc. XII, Metropolitan Museum of Art', 'CC0'),
 '11_xuanzong_caligrafia': ('唐玄宗鶺鴒頌 卷.png', 'imperador Xuanzong de Tang, 719', 'CC0'),
 '12_dunhuang_mural': ('Mogao Caves, cave 159 musicians.jpg', 'anônimo, dinastia Tang', 'domínio público'),
 '13_dunhuang_foto': ('Dunhuang Mogao Ku 2013.12.31 12-30-18.jpg', 'Zhangzhugang', 'CC BY-SA 4.0'),
 '14_hua_yi_tu': ('Hua yi tu. LOC 2006458643.jpg', 'anônimo, gravado em 1136, Biblioteca do Congresso dos EUA', 'domínio público'),
 'A1_camara_de_cima': ('Coffin Chamber Viewed from Above (10113075253).jpg', 'Gary Todd', 'CC0'),
 'A2_camara_externa': ('Outer Coffin Chamber of Mawangdui Tomb -1 (10112905075).jpg', 'Gary Todd', 'CC0'),
 'A3_caixao_xin_zhui': ('Coffin of Xin Zhui, Western Han dynasty, Hunan Museum.jpg', 'Huangdan2060', 'CC0'),
 'A4a_laca': ('Mawangdui Lacquer 1.jpg', 'Flazaza', 'CC BY-SA 4.0'),
 'A4b_laca': ('Mawangdui Lacquer 4.jpg', 'Flazaza', 'CC BY-SA 4.0'),
 'A5a_etiquetas': ('Mawangdui Wooden Labels.jpg', 'Gary Todd', 'CC0'),
 'A5b_dinheiro_seda': ('Mawangdui Silk Funerary Money.jpg', 'Gary Todd', 'CC0'),
 'A6_seda_em_t': ('T-shaped Painting on Silk - Google Art Project.jpg', 'anônimo, c. 168 a.C.', 'domínio público'),
 'A7a_laozi_seda_p1': ('長沙馬王堆漢墓簡帛集成 第一冊 老子甲本 圖版.pdf', 'cópia em seda, 168 a.C.', 'domínio público'),
 'A7b_laozi_seda_p2': ('長沙馬王堆漢墓簡帛集成 第一冊 老子甲本 圖版.pdf', 'cópia em seda, 168 a.C.', 'domínio público'),
 'G02_estrada': ('Empty Highway (186536221).jpeg', 'Bogdan Gerasymenko', 'CC0'),
 'G03_broto': ('Young seedling of tomato emerging from soil - India.jpg', 'Ksheera Piraati', 'CC BY 4.0'),
 'G04_luar_ma_yuan': ('Clevelandart 1997.89.jpg', 'Ma Yuan, 1189, Cleveland Museum of Art', 'domínio público'),
 'G08_batalha_han': ('Battle at the Bridge, West Wall, Stone Chamber 1.jpg', 'anônimo, séc. II', 'domínio público'),
 'G09a_hangu_antigo': ('亜細亜大観 09 053 "函谷古關 （河南省靈寳縣）".jpg', 'Black Dragon Society', 'domínio público'),
 'G09b_hangu_2018': ('Hangu Pass.jpg', 'Flaumfeder', 'CC BY-SA 4.0'),
 'G10_shiji_tang': ('『史記』唐写本.jpg', 'copista anônimo da dinastia Tang', 'CC BY 4.0'),
 'G11a_letrados': ('The Eighteen Scholars by an anonymous Ming artist 1.jpg', 'anônimo, dinastia Ming', 'domínio público'),
 'G11b_letrados': ('The Eighteen Scholars by an anonymous Ming artist 2.jpg', 'anônimo, dinastia Ming', 'domínio público'),
 'G11c_letrados': ('The Eighteen Scholars by an anonymous Ming artist 3.jpg', 'anônimo, dinastia Ming', 'domínio público'),
 'G11d_letrados': ('The Eighteen Scholars by an anonymous Ming artist 4.jpg', 'anônimo, dinastia Ming', 'domínio público'),
 'G12a_guodian_taiyi': ('TaiYiShengShui1.jpg', 'Sharkman', 'CC BY-SA 3.0'),
 'G12b_tiras_bambu': ('Warring States Bamboo Slips (10160718806).jpg', 'Gary Todd', 'CC0'),
 'G13_universidade_pequim': ('West Gate of Peking University original.JPG', '維基小霸王', 'CC BY-SA 3.0'),
 'G14_mercado_antiguidades': ('Panjiayuan Market Beijing China.jpg', 'Ben Tilley', 'CC BY-SA 3.0'),
 'G15_sacerdotes_baiyun': ('Taoist Priests in White Cloud Temple Beijing Qing Dynasty.jpg', 'anônimo, c. 1900', 'domínio público'),
 'G17_rio_qingming': ('Along the River During the Qingming Festival (Qing Court Version) 04a.jpg', 'cinco pintores da corte Qing', 'CC BY-SA 4.0'),
 'G19a_jesuitas_kircher': ('Matteo Ricci and Xu Guangqi from Athanasius Kircher (3756759).jpg', 'Athanasius Kircher, 1667', 'domínio público'),
 'G19b_royal_society': ('A meeting of the Royal Society at Somerset House in the Stra Wellcome V0013855.jpg', 'Wellcome Collection', 'CC BY 4.0'),
 'G21_paulista_1970': ('Avenida Paulista 1970.jpg', 'autor desconhecido', 'domínio público'),
 'G22_laboratorio': ('A group of scientists working in a laboratory Esculab.jpg', 'Esculab', 'CC0'),
 'G23_marco_aurelio': ('Head Marcus Aurelius archmus Heraklion.jpg', 'Jebulon', 'CC0'),
 'X_tumba': ('Mawangdui Tomb Owners & Their Burial Dates (10112879225).jpg', 'Gary Todd', 'CC0'),
 'X_painel_datas': ('Mawangdui Tomb Owners & Their Burial Dates (10112879225).jpg', 'Gary Todd', 'CC0'),
 'X_caixao': ('Lacquer Coffin Unearthed from the 2nd-century-BC Han Tomb No.1 at Mawangdui 2011-07.JPG', '猫猫的日记本', 'CC BY-SA 4.0'),
 'X_manuscrito': ('Mawangdui LaoTsu Ms2.JPG', 'manuscrito em seda, 168 a.C.', 'domínio público'),
 'M_laotsu_ms2': ('Mawangdui LaoTsu Ms2.JPG', 'manuscrito em seda, 168 a.C.', 'domínio público'),
 'X_laozi_chen': ('Chen Hongshou - Paintings after Ancient Masters, Laozi Riding an Ox - 1979.27.1.2 - Cleveland Museum of Art.jpg', 'Chen Hongshou, Cleveland Museum of Art', 'CC0'),
 'X_laozi_rolo': ('宋晁補之老子騎牛圖.jpg', 'atribuído a Chao Buzhi, dinastia Song', 'domínio público'),
 'X_laca': ('Lacquer food case with cloud design, Mawangdui, Changsha, Hunan, Hunan Museum.jpg', 'ver página', 'ver página'),
 'M_caixa_laca': ('Lacquer food case with cloud design, Mawangdui, Changsha, Hunan, Hunan Museum.jpg', 'ver página', 'ver página'),
 'X_sitio': ('Han Tombs at Mawangdui (10112914825).jpg', 'Gary Todd', 'CC0'),
 'M_tumbas_han': ('Han Tombs at Mawangdui (10112914825).jpg', 'Gary Todd', 'CC0'),
 'M_bambu_mwd': ('Mawangdui Han Bamboo Slips (10113191283).jpg', 'Gary Todd', 'CC0'),
 'M_guodian_jia': ('郭店楚简《老子甲》.jpg', 'ver página', 'ver página'),
 'M_shu_long': ('Journey to Shu; Long.jpg', 'ver página', 'ver página'),
 'M_liberdade_sp': ('Liberdade of Sao Paulo.jpg', 'ver página', 'ver página'),
 'M_esfigmo': ('2020 Sfigmomanometr elektroniczny.jpg', 'ver página', 'ver página'),
 'M_daoyin': ('Daoyin tu - chart for leading and guiding people in exercise Wellcome L0040263.jpg', 'Wellcome Collection', 'CC BY 4.0'),
 'M_qigong': ('Qigong taiji meditation.jpg', 'ver página', 'ver página'),
}
linha = json.loads((V80 / 'linha_v80.json').read_text(encoding='utf-8'))
uso = {}
for p in linha['planos']:
    b = p.get('base', '')
    if b.startswith('camadas/'):
        cid = b[8:-9]; uso.setdefault(cid, []).append(f"{int(p['t0'] // 60)}:{p['t0'] % 60:04.1f}")
RM = 'http://www.rmhb.com.cn/yxsj/sy/202502/t20250206_800391454.html'
imp = {'P1_escavacao_tumba1': (RM, 'Escavação da tumba 1 de Mawangdui: Museu de Hunan (湖南博物院), via China Pictorial'),
       'P2_escavacao_tumba3': (RM, 'Escavação da tumba 3: Museu de Hunan, via China Pictorial'),
       'P3_arqueologos_1972': ('https://www.globaltimes.cn/page/202409/1319668.shtml', 'Arqueólogos em Mawangdui, 1972: cortesia de CITIC Publishing Group, via Global Times'),
       'P4_poco_reconstruido': (RM, 'Poço da tumba 1 reconstruído: foto de Xu Xun / China Pictorial'),
       'P5_caixao_preto': (RM, 'Caixão de laca preta: Museu de Hunan, via China Pictorial'),
       'P6_caixao_vermelho': (RM, 'Caixão de laca vermelha: Museu de Hunan, via China Pictorial'),
       'P7_laozi_seda_b': (RM, 'Laozi em seda, versão B: Museu de Hunan, via China Pictorial')}
pex = {pathlib.Path(l['arquivo']).stem: l for l in csv.DictReader(open(V80 / 'creditos-imagens-pexels.csv', encoding='utf-8'))}
rows = []
for f in sorted((V80 / 'imagens').iterdir()):
    cid = f.stem; t = ' '.join(uso.get(cid, [])) or 'não usada'
    if cid in M:
        tit, aut, lic = M[cid]; rows.append([f.name, 'Wikimedia Commons', C + urllib.parse.quote(tit.replace(' ', '_')), aut, lic, t])
    elif cid in pex: rows.append([f.name, 'Pexels', pex[cid]['url'], 'ver página', 'Licença Pexels', t])
    elif cid.startswith('P'): rows.append([f.name, 'imprensa', imp[cid][0], imp[cid][1], 'não livre: animada, até 5 s, crédito na descrição (decisão do Italo, 21/11/2026)', t])
    else: rows.append([f.name, '?', '', '', '', t])
with open(V80 / 'creditos-imagens.csv', 'w', encoding='utf-8', newline='') as fh:
    w = csv.writer(fh); w.writerow(['arquivo', 'fonte', 'url', 'autor', 'licenca', 'tempo de uso no v80']); w.writerows(rows)
usadas = [r for r in rows if r[5] != 'não usada']
txt = ['Imagens e créditos', '']
for r in usadas:
    if r[1] == 'imprensa': txt.append(f'- {r[3]}')
    elif 'BY' in r[4] or r[1] == 'Pexels': txt.append(f'- {pathlib.Path(r[0]).stem.split("_", 1)[-1].replace("_", " ")}: {r[3]}, {r[4]}, {r[1]}')
txt += ['- Pinturas, gravuras e manuscritos antigos: domínio público (Wikimedia Commons, Metropolitan Museum, Cleveland Museum of Art, Biblioteca do Congresso dos EUA).',
        '- Fotos CC0: Gary Todd, Huangdan2060, Jebulon, Esculab e outros (Wikimedia Commons).', '- Vídeos: Pexels (licença Pexels).',
        '- Música e efeitos sonoros: Pixabay (licença Pixabay).']
(V80 / 'descricao-creditos.txt').write_text('\n'.join(txt), encoding='utf-8')
print(len(rows), 'imagens;', len(usadas), 'usadas;', sum(r[1] == '?' for r in rows), 'sem fonte')
