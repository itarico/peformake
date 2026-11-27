# Estudo: "50 Ganchos Virais" (@lucureau) cruzado com a nossa camada de gancho G1 a G12

**Status:** dado para estudo, não regra. Serve para ampliar o repertório de abertura e gerar hipóteses de teste. Nada aqui muda o G1 a G12 nem o método de escolha do `MOTOR.md` sem passar pelo placar (`PLACAR-ESTRUTURAS.md`).
**Fonte:** guia em PDF "50 Ganchos mais virais de 2026" de @lucureau. O original fica só no PC: `C:\Users\User\Downloads\@lucureau - 50 Ganchos Virais.pdf`. O repositório é público, então este arquivo não reproduz as frases do guia: cita pelo número (nº 1 a 50) e resume com palavras nossas.
**Data do estudo:** 27/11/2026.

## 1. O que o guia traz
- 50 moldes de frase de abertura para Reels, TikTok e Shorts, em 8 grupos por gatilho: curiosidade (nº 1 a 10), contrarian (11 a 17), medo e aversão à perda (18 a 24), prova e autoridade (25 a 30), pergunta direta (31 a 35), identificação (36 a 40), número e lista (41 a 45), tendência e gancho visual (46 a 50).
- Cada molde tem uma linha de "por que funciona" e cada grupo tem uma dica de uso.
- Afirmações numéricas **sem fonte no guia** (não usar como dado): "71% decidem nos 3 primeiros segundos", "listas negativas performam até 40% melhor", "o cérebro reage 2x mais forte à perda". A ideia geral da aversão à perda vem da economia comportamental (Kahneman e Tversky), mas os números do guia não têm fonte citada.

## 2. Cruzamento com G1 a G12 (`video-tools/estilos/estudo_narrativas.md` §2)

| Nº no guia | Ideia (resumo nosso) | Nosso código | Observação |
|---|---|---|---|
| 1, 3, 5 | "ninguém conta", segredo, assunto escondido | G11 Confissão/segredo | já temos; no acervo o "ninguém te conta" funciona melhor no MEIO do vídeo |
| 2, 7, 8, 23, 35 | descoberta, "o que acontece quando", fato surpreendente, por que não funciona | G7 Curiosidade/pergunta | 23 e 35 são G7 apontando para uma dor: variação útil |
| 4, 12, 13, 17, 47 | invalida o que a pessoa sabe, prática "morreu" | G5 Contraintuitivo | exige prova logo depois (o próprio guia avisa) |
| 9 | a empresa grande esconde algo | G9 Inimigo + G11 | cuidado jurídico e de marca; evitar com concorrente de cliente |
| 10, 16 | "eu estava errado", "parei de fazer e melhorou" | G5 + confissão pessoal | bom para dono ou especialista que admite erro |
| 14, 31, 33 | opinião controversa, "só eu acho?" | G8 Polêmica/resposta | gera comentário; dosar |
| 6, 28 | testei por um período, gastei para você não gastar | G12 Desafio + G4 Prova | pede prova real gravada |
| 15, 25, 26 | sem a objeção, de ruim para bom em um prazo | G1 Desejo | casa com depoimento de cliente |
| 27, 30 | anos de experiência, números reais | G4 Prova/número | o número tem que ser específico e verdadeiro |
| 21, 46, 48 | urgência de ano, algoritmo mudou, acabou de sair | G3 Novidade | validade curta; datar no card |
| 49, 50 | ação brusca, objeto entrando no quadro | G2 (versão visual) | funciona sem som; liga com a skill `edicao-motion` e as transições |
| **18, 19, 20, 22, 24** | alerta: pare agora, maior erro, está perdendo, pode arruinar, sinais de problema | **sem código** | candidato **G13 Alerta/erro** (ver §3) |
| **36, 37, 38, 39, 40** | se você é tal pessoa, POV, isso é para você, lembrete | **sem código** | candidato **G14 Chamada de público/identificação** |
| **24, 29, 41 a 45** | N sinais, N regras, N coisas, N passos, N erros, ranking, N hacks | **G4 só em parte** | candidato **G15 Lista anunciada** (G4 é prova com número, não lista) |
| **32, 34** | cenário hipotético, "quem mais faz isso?" | **G7 em parte** | candidato **G16 Pergunta para comentar** |

## 3. Candidatos para testar (não oficiais)
Só viram código no `MOTOR.md` depois de testados em vídeo real e registrados no placar.

| Candidato | O que é | Exemplo adaptado para cliente (nosso) | Onde testar primeiro |
|---|---|---|---|
| G13 Alerta/erro | aponta um erro que o público comete ou uma perda que está sofrendo | "Se você guarda o molho aberto na geladeira desse jeito, está jogando dinheiro fora." (Disalp) | B2B, serviços técnicos, saúde (sem prometer cura) |
| G14 Chamada de público | escolhe o público no primeiro segundo ("se você é...", POV) | "Se você tem pizzaria e o molho talha no forno, esse vídeo é seu." | nicho muito definido, anúncio |
| G15 Lista anunciada | promete um número de itens e entrega em ordem | "3 sinais de que o seu fornecedor de hortifrúti está te enrolando." | conteúdo para salvar, educação |
| G16 Pergunta para comentar | pergunta que a pessoa responde mentalmente e depois nos comentários | "Quem mais já pediu hambúrguer e chegou frio?" (repetir no fim como CTA) | perfil que precisa de comentário (alcance orgânico) |
| (G2 visual) | já existe: reforçar a versão sem fala, por ação ou objeto | produto caindo na mesa, mão tirando o lanche da embalagem | food, varejo, produto |

## 4. O que muda na prática (sugestões, não regra)
1. **Combinar 3 camadas na abertura**: frase (verbal) + texto na tela + ação ou som. Já é o que fazemos no Estilo Motion; o guia reforça. Na legenda, a frase do gancho vira o pico (`lm_*` da skill `legendas-video`).
2. **Número específico vence número redondo** (dica do guia, coerente com o nosso G4): "38 toneladas por dia" e não "muito tomate".
3. **Gancho de medo ou de contrarian só com entrega**: a resposta ou a prova vem antes da metade do vídeo, senão vira isca vazia. Para o canal Por Dentro vale a premissa da casa: fato com fonte.
4. **Pergunta no início e repetida no CTA** (G16) para puxar comentário.
5. **Antídoto de clichê**: esses moldes estão muito usados. Passar sempre pelo filtro `nem-parece-ia` e trocar o molde genérico por um detalhe do cliente.

## 5. Onde este estudo entra (ligações feitas)
- `MOTOR.md`, camada Gancho: aponta para cá como repertório externo para testar.
- `video-tools/estilos/estudo_narrativas.md` §2: nota abaixo da tabela G1 a G12 com os candidatos G13 a G16.
- Skill `roteiro-retencao` (abertura dos 30 s e ganchos dos Shorts): consulta opcional.
- Skill `mdd`: o motor autoral continua decidindo; este estudo é só repertório para o caçador de assuntos e a abertura.

## 6. Próximo passo de estudo
Testar G13 a G16 em 2 ou 3 vídeos de clientes diferentes, anotar retenção aos 3 s e taxa de comentário no placar, e só então decidir se viram código oficial.
