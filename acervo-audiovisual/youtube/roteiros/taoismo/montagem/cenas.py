# Plano de cenas do Taoísmo: cada cena cobre um intervalo de frases da narração v2 (números de NARRACAO-PARA-GRAVAR.md).
# epoca = índice da barra de linha do tempo (0 c.500 a.C., 1 300 a.C., 2 168 a.C., 3 733, 4 1788, 5 anos 1970, 6 hoje).
A = 'assets/'
CENAS = [
 # Bloco 0 · abertura
 dict(f=(1, 1), tipo='video_cheio', clip='mapa3d_a', epoca=2),
 dict(f=(2, 2), tipo='foto_mesa', img=A+'tumba.jpg', img2=A+'caixao.jpg', data='CHANGSHA · 1973', titulo='Fechada há mais de dois mil anos', selo='墓',
      fonte='Câmara de Mawangdui, Museu de Hunan (CC0) · Caixão de laca, tumba 1 (CC BY-SA 4.0)', epoca=2),
 dict(f=(3, 4), tipo='video_cheio', clip='caligrafia-close', data='O LIVRO DO CAMINHO', titulo='Tao Te Ching'),
 dict(f=(5, 7), tipo='manuscrito_troca', img=A+'manuscrito.jpg', data='MAWANGDUI · 168 a.C.', titulo='De trás<br>para <span style="color:#B3261E">frente</span>', sub='o Te vinha antes do Tao', epoca=2),
 dict(f=(8, 9), tipo='frase_tinta', titulo='Cortado.<br>Reorganizado.<br>Reescrito.', tam=110, topo=300),
 dict(f=(10, 11), tipo='video_cheio', clip='rio-pedras', titulo='Mudar de forma<br>sem quebrar', tam=88),
 dict(f=(12, 12), tipo='frase_tinta', titulo='Quem escreveu<br>O que ensina<br>O que a ciência achou<br><span style="color:#B3261E">3 jeitos de usar</span>', tam=74, topo=260),
 # Bloco 1 · o Tao e o wu wei
 dict(f=(13, 13), tipo='capitulo', num='CAPÍTULO 1', titulo='O caminho', sub='o que é o Tao', han='道'),
 dict(f=(14, 19), tipo='video_cheio', clip='guilin-aereo', data='道 · DAO', titulo='Caminho', tam=120),
 dict(f=(20, 22), tipo='citacao', ref='TAO TE CHING · CAPÍTULO 1', texto='“O Tao de que se pode falar não é o Tao eterno.”', han='道可道，非常道'),
 dict(f=(23, 27), tipo='frase_tinta', titulo='Wu wei<br><span style="font-size:70px;font-style:italic;text-transform:none">agir sem forçar</span>', han='無為', tam=150, topo=430),
 dict(f=(28, 32), tipo='diagrama_wuwei'),
 dict(f=(33, 34), tipo='video_moldura', clip='rio-musgo', titulo='● A CHAVE DO VÍDEO: A ÁGUA'),
 # Bloco 2 · a lenda
 dict(f=(35, 35), tipo='capitulo', num='CAPÍTULO 2', titulo='A lenda', sub='do velho mestre', han='老', epoca=0),
 dict(f=(36, 38), tipo='pintura', img=A+'laozi_chen.jpg', titulo='Laozi', sub='“velho mestre”', pos='center 45%', pan=-50, epoca=0,
      fonte='Chen Hongshou, Laozi no búfalo (séc. XVII), Cleveland Museum of Art, domínio público'),
 dict(f=(39, 42), tipo='pintura', img=A+'laozi_rolo.jpg', titulo='Passo de Hangu', tam=110, pos='center 78%', pan=30, epoca=0,
      fonte='Atribuído a Chao Buzhi, Laozi no búfalo (dinastia Song), domínio público'),
 dict(f=(43, 46), tipo='linha_tempo', a='séc. VI a.C.', an='Laozi?', b='c. 100 a.C.', bn='Sima Qian', titulo='~400 anos', sub='entre o homem e o primeiro registro', epoca=0),
 dict(f=(47, 49), tipo='video_cheio', clip='caligrafia-homem', titulo='Uma voz<br>ou várias?', tam=100),
 dict(f=(50, 50), tipo='frase_tinta', titulo='Elas não são.', tam=150),
 # Bloco 3 · o livro vivo
 dict(f=(51, 51), tipo='capitulo', num='CAPÍTULO 3', titulo='O livro vivo', sub='bambu, seda e edição', han='書', epoca=1),
 dict(f=(52, 57), tipo='video_cheio', clip='bambu', data='GUODIAN · 1993', titulo='Tiras de bambu<br>c. 300 a.C.', tam=96, epoca=1),
 dict(f=(58, 62), tipo='foto_mesa', img=A+'painel_datas.jpg', img2=A+'manuscrito.jpg', data='MAWANGDUI · 168 a.C.', titulo='Te Tao Ching', tam=96, selo='德', lado='dir',
      fonte='Painel do Museu de Hunan (CC0) · Manuscrito B do Laozi em seda (domínio público)', epoca=2),
 dict(f=(63, 65), tipo='video_cheio', clip='templo-ceu-pequim', data='UNIVERSIDADE DE PEQUIM · 2009', titulo='Mais uma versão', tam=96, epoca=2),
 dict(f=(66, 70), tipo='frase_tinta', titulo='Falado · decorado<br>copiado · cortado<br><span style="color:#B3261E">reorganizado</span>', tam=100, topo=300),
 dict(f=(71, 72), tipo='video_cheio', clip='rio-musgo', titulo='Como a água', tam=120),
 dict(f=(73, 73), tipo='video_moldura', clip='caligrafia-tradicional', titulo='● INSCREVA-SE NO POR DENTRO'),
 dict(f=(74, 75), tipo='frase_tinta', titulo='Virou lei.', tam=160),
 # Bloco 4 · religião e lei
 dict(f=(76, 78), tipo='video_cheio', clip='incenso-templo', titulo='Religião<br>organizada', tam=110, epoca=3),
 dict(f=(79, 81), tipo='video_cheio', clip='incenso-cerimonia', data='SÉCULO II', titulo='Mestres Celestiais', tam=96, epoca=3),
 dict(f=(82, 83), tipo='frase_tinta', titulo='O taoísmo<br>chegou ao trono.', han='唐', tam=120, topo=470),
 dict(f=(84, 86), tipo='decreto', epoca=3),
 dict(f=(87, 88), tipo='frase_tinta', titulo='Demônios.<br>Catástrofes.<br><span style="color:#B3261E">Salvação.</span>', tam=110, topo=290),
 dict(f=(89, 90), tipo='yinyang', sub='filosofia · religião · medicina · política'),
 # Bloco 5 · Ocidente, Brasil e ciência
 dict(f=(91, 92), tipo='video_cheio', clip='mapa3d_b', epoca=4),
 dict(f=(93, 94), tipo='video_cheio', clip='taichi-chengdu', data='ANOS 1970 · O TAI CHI CHEGA A SÃO PAULO', titulo='Liu Pai Lin', tam=96, epoca=5),
 dict(f=(95, 95), tipo='frase_tinta', titulo='Funciona?', tam=170),
 dict(f=(96, 99), tipo='video_moldura', clip='taichi-velho', titulo='● O QUE A CIÊNCIA CONSEGUE TESTAR', epoca=6),
 dict(f=(100, 105), tipo='piramide', epoca=6),
 dict(f=(106, 107), tipo='video_cheio', clip='pressao', titulo='Complemento,<br>não substitui médico', tam=80, epoca=6),
 dict(f=(108, 109), tipo='video_cheio', clip='taichi-chengdu2', titulo='Sem levantar<br>da cadeira', tam=96),
 # Bloco 6 · a pílula
 dict(f=(110, 112), tipo='manuscrito_troca', img=A+'manuscrito.jpg', data='O ROLO DE TRÁS PARA FRENTE', titulo='Como a<br><span style="color:#B3261E">água</span>', sub='mudou de forma e chegou até você'),
 dict(f=(113, 113), tipo='frase_tinta', titulo='3 jeitos de usar<br>o wu wei amanhã', han='無為', tam=110, topo=470),
 dict(f=(114, 116), tipo='video_cheio', clip='multidao', data='UM', titulo='Isso depende de mim?', tam=96),
 dict(f=(117, 119), tipo='video_cheio', clip='canion-rio', data='DOIS', titulo='Bateu de frente?<br>Contorna.', tam=96),
 dict(f=(120, 121), tipo='video_cheio', clip='canion', data='TRÊS', titulo='Pouco, todo dia', tam=110),
 dict(f=(122, 122), tipo='video_cheio', clip='li-river'),
 dict(f=(123, 123), tipo='frase_tinta', titulo='É estratégia.', han='無為', tam=160, topo=470),
 dict(f=(124, 125), tipo='frase_tinta', titulo='Próximo vídeo:<br><span style="color:#B3261E">os estoicos</span>', tam=110, topo=360),
]
BLOCOS = [13, 35, 51, 76, 91, 110]  # frase que abre cada bloco: transição de tinta antes dela
