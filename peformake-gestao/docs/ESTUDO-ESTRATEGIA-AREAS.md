# Estudo: Estratégia por área (Consultoria, Tráfego, Social Media, Audiovisual) · 11/11/2026

Pedido do Italo: cada área separada, mas todas conversando; cada uma pede o obrigatório do cliente antes de gerar;
o sistema não se baseia só nos dados automáticos, existe uma área de **direcionamento do cliente**; área para
**gerar roteiro**; **1 geração por dia por cliente**. Gerado pela API do Claude (não por rotinas).

## 1. Como as áreas conversam: o "contexto do cliente"
Cada área tem o seu gerador, mas todas leem a mesma base, montada pelo sistema a cada geração:

| Fonte | O que entra |
|---|---|
| Ficha | Negócio, público, diferencial, concorrentes (preenchidos e aprovados, inclusive os "sugeridos pela IA") |
| Consultoria | Diagnóstico e plano de ação aprovados (o "norte" de todas as áreas) |
| Direcionamento | O que a equipe escreveu do cliente (permanente e do mês). **Tem prioridade sobre o resto** |
| Resultados | Tráfego (gasto, resultados, custo), entregas de social e audiovisual, conversas do WhatsApp |
| Outras áreas | O que as outras áreas já geraram no mês (ex.: a oferta do tráfego entra na pauta do social e no roteiro) |

Fluxo: **Consultoria** dá o norte → **Tráfego** define oferta e verba do mês → **Social** monta a pauta com a mesma
oferta e datas → **Audiovisual** escreve os roteiros que a pauta e os anúncios pedem → os resultados voltam para todas.

## 2. Direcionamento do cliente (para não depender só do automático)
Um lugar só por cliente (na ficha e no topo de cada área), em duas partes:

- **Permanente** (vale sempre): tom de voz, o que nunca fazer, produtos principais, observações. Texto livre ou áudio
  (transcrito, como no WhatsApp).
- **Do mês** (curto, com "Repetir o do mês passado" em 1 toque):
  - **Comum a todas as áreas (obrigatório):** objetivo do mês, oferta/produto em foco, datas importantes.
  - **Por área (obrigatório só o essencial):**
    - Tráfego: verba do mês.
    - Social: quantidade de peças (vem do contrato; só confirma) e temas a evitar (opcional).
    - Audiovisual: vídeos do mês (vem do contrato) e data da captação, se já marcada.
    - Consultoria: nada mensal; só CNPJ e Instagram/site na entrada.

Regra de ouro: **o que o sistema já sabe vem preenchido** (contrato, mês passado, datas sazonais do nicho). A equipe só
confirma ou ajusta. Sem o obrigatório, o botão "Gerar" mostra o que falta e abre o pop-up direto nele.

Hoje o tráfego já pede 7 campos de direcionamento até o dia 14 (client_monthly_plans). Proposta: virar a parte
"comum + tráfego" deste direcionamento único, sem perder o que já existe.

## 3. Cada área
| Área | O que gera | Quando | Obrigatório antes |
|---|---|---|---|
| **Consultoria** | Diagnóstico + plano de ação 30/60/90 (Fase 1, em construção) | Ao ativar a Consultoria; revisão a cada trimestre | CNPJ e Instagram/site |
| **Tráfego** | Plano do mês (campanhas, públicos, criativos pedidos, verba) | Dia 15 (como hoje), ou no botão | Direcionamento do mês + verba |
| **Social Media** | Estratégia do mês + pauta (temas, formatos, calendário) | Dia 15, ou no botão | Direcionamento do mês |
| **Audiovisual** | **Roteiros** (gancho, cenas, falas, legenda, chamada) | No botão "Gerar roteiro" | Objetivo do vídeo e formato (reels, anúncio, institucional) |

Cada geração vem para **revisão** (aprovar, refazer, editar). Nada vai ao cliente sem uma pessoa confirmar.

## 4. Gerar roteiro (Audiovisual)
- Botão "Gerar roteiro" no cliente (e no projeto de vídeo, onde o roteiro já existe e já tem PDF e aprovação).
- Pede só: objetivo do vídeo, formato e duração (com sugestão pré-marcada pela pauta do mês).
- Usa: tom de voz, oferta do tráfego, pauta do social, referências do nicho, o que já funcionou com o cliente.
- Sai pronto para o fluxo atual: Roteiro → aprovação (equipe ou cliente no portal) → Aguardando captação.

## 5. Limite: 1 geração por dia por cliente
- Gravado no banco, não só na tela. Ao bater o limite: "Próxima geração liberada amanhã".
- Conta tudo: gerar, refazer seção, refazer roteiro.
- **Dúvida para o Italo:** o limite é **por cliente em cada área** (ex.: no mesmo dia, 1 roteiro + 1 plano de tráfego)
  ou **1 por cliente no dia somando todas as áreas**? Recomendação: por área, senão um roteiro trava o plano do mês.
- Trava de gasto geral: US$ 90 por mês (já na Fase 1).

## 6. Custo estimado (preços de 11/11/2026)
- Diagnóstico da consultoria (Opus): US$ 0,40 a 1 por cliente, poucas vezes.
- Plano do mês de tráfego e de social (Sonnet): ~US$ 0,05 a 0,15 cada.
- Roteiro (Sonnet): ~US$ 0,02 a 0,05 cada.
- 30 clientes com tudo no mês: estimativa de US$ 15 a 30. Valores reais medidos depois de ligado.

## 7. Ordem sugerida
1. Consultoria (em construção) com a base comum: contexto, direcionamento, limite diário e registro de custo.
2. Gerar roteiro (Audiovisual): rápido de entregar e usado todo dia.
3. Direcionamento único do mês e o plano de Tráfego passando para a API (alivia o plano do Claude do Italo).
4. Social: estratégia + pauta do mês ligadas ao tráfego e aos roteiros.

## 8. Decisões do Italo
1. Limite diário por área ou somando todas as áreas?
2. Os campos obrigatórios do mês estão bons (objetivo, oferta em foco, datas; + verba no tráfego)?
3. O direcionamento fica na ficha do cliente e aparece no topo de cada área. Ok?
4. Ordem: roteiro antes do tráfego/social?

## 9. Referência: plano tático da Benitius (docs/referencias/benitius-plano-tatico-de-conteudo.pdf)
Modelo de entrega que o Italo quer no diagnóstico e nos planos (tom e comunicação). Blocos a reaproveitar:
- **Essência e propósito** em 2 linhas, e o "papel" da Peformake no projeto em 1 página.
- **Tom de voz**: 4 adjetivos, cada um com uma frase de exemplo real + lista do que evitar.
- **Expressão de marca**: paleta, ambiente, presença (dono como rosto, equipe com nome).
- **Linguagem de vídeo**: regras simples de gravação (câmera parada, planos longos, luz) e uma regra-teste
  ("Se o vídeo te deixa ansioso, não é Benitius").
- **Experiência do cliente fora do digital** (recepção, venda consultiva, ambiente, despedida): é consultoria de verdade.
- **Linha editorial**: pilares com frequência semanal; **calendário dia a dia**; **banco de pautas** para nunca travar.
- **Roteiros** no formato "Quem fala / Quem grava", com referência.
Destino: Consultoria (seção "Tom e comunicação" + "Experiência do cliente"), Social (linha editorial, calendário,
banco de pautas) e Audiovisual (roteiros "Quem fala / Quem grava", linguagem de vídeo).

## 10. Medir o trabalho da social media (pedido do Italo, a decidir)
Hoje a entrega de social conta "peças planejadas aprovadas". Proposta de medida em 3 partes, sem trabalho extra:
1. **Entrega** (o que foi combinado): pauta do mês feita até o dia X, peças aprovadas / planejadas, publicadas no dia certo
   (lido do Instagram pela conta ligada), stories por semana.
2. **Agilidade**: tempo do briefing até a peça pronta, ajustes pedidos por peça, peças atrasadas.
3. **Resultado** (do perfil, sem culpar só a social): alcance, engajamento por post, seguidores ganhos, mensagens
   recebidas pelo Instagram, comparado com o mês anterior; nota do cliente no portal.
Vira uma nota mensal por cliente e por pessoa, com o detalhe atrás de "Ver detalhes".

## 11. Perguntas inteligentes ao cliente (ideia do Italo, 11/11 noite, por áudio)
- **Link progressivo para o cliente**: uma pergunta por vez, no celular, sem login (como o link de pagamento). Usado:
  - **na entrada** (Consultoria/diagnóstico): empresa, objetivo, público, oferta etc. O que ele responde soma com a busca automática;
  - **todo mês** (estratégia mensal de Consultoria, Tráfego, Social, Audiovisual, Vendas): perguntas do mês.
- **Perguntas inteligentes e retroalimentadas**: não são fixas. O sistema gera as perguntas do mês a partir do que ele
  respondeu antes, da estratégia aplicada, dos resultados (o que deu certo/errado), da sazonalidade e de tudo que já sabe.
  Não pergunta o que já sabe.
- **Fila de perguntas por cliente** (uma "basinha"): sempre que o sistema identificar que precisa de 1, 2 ou 3 informações,
  cria a linha na fila. A equipe toca em "Enviar" e o cliente recebe o link (envio confirmado por humano, regra do WhatsApp).
  Respondeu: alimenta a ficha, o diagnóstico e as próximas gerações. Pacotes ("packs") por mês e por área.
- **Antes do PDF**: a apresentação aparece na interface para ajustar o que a IA errou, ver de onde veio cada dado e
  responder dúvidas; depois de aprovar, PDF e link público vivo (em construção na Fase 1.1).
- Base já pedida ao agente: tabela genérica de perguntas/respostas por cliente e área.

## 12. Acompanhamento da consultoria (histórico e evolução)
- A aba Consultoria guarda, por cliente e por mês: diagnóstico, estratégia do mês, o que foi feito, respostas do cliente.
- **Linha do tempo da evolução** (indicadores antes/depois) e o sistema verificando **se o plano foi aplicado ou não**
  (passos do plano com situação: feito, em andamento, não feito, e por quê), usando entregas, tráfego, conversas e respostas.
- O que não foi aplicado volta como ponto da próxima estratégia ou pergunta ao cliente.

## 13. Aba Vendas (nova área de estratégia)
- Estratégia de vendas para o cliente: funil comercial, roteiro de atendimento no WhatsApp, oferta e objeções,
  follow-up, metas e conversão (cruza com os contatos que o tráfego gera e com as conversas).
- Mesmo padrão: direcionamento + perguntas do mês + geração 1/dia + revisão + apresentação.

## Ordem sugerida (atualizada)
1. Consultoria 1.1 (em construção: edição, apresentação vertical/paisagem, PDF só após aprovar, link público vivo, portal).
2. Fila de perguntas + link progressivo do cliente (base para todas as áreas).
3. Acompanhamento mensal da consultoria (histórico, plano aplicado ou não).
4. Roteiro (Audiovisual) → Tráfego → Social → Vendas, todos com perguntas do mês.

## 14. Estratégia de TRÁFEGO: como está hoje e a proposta "só tráfego" (11/11 noite)
### Hoje
- Direcionamento em 4 etapas até o dia 14 (meta, ofertas, datas e verba, o que evitar); geração no dia 15 por uma ROTINA
  do Claude Code fora do sistema (estrategista-mensal); "Gerar agora" só põe pedido na fila; sem limite diário nem custo
  registrado; 4 pedidos ficaram presos em "na fila" (05 a 09/11) sem aviso de falha.
- Saída: resumo + pesquisa + 12 a 30 itens aprovados um a um. Só 64 de 244 itens são de tráfego; o resto é interno (62),
  cliente (51), design (29), audiovisual (21), social (17): roteiros, conteúdo, artes, pedidos ao cliente, reunião.
- Dados: métricas diárias por conta só desde 01/10 (~6 semanas) e por campanha/conjunto/anúncio desde 04/10; 291
  anúncios (231 com miniatura); 17 relatórios semanais; sem Google Ads, sem conversões por evento, sem vendas do CRM;
  Graph API da Meta bloqueada desde 04/11 (saldo manual), leitura de anúncios segue pelo conector.
- Alerta: 8 estratégias de dezembro em rascunho podem ser sobrescritas pela rotina no dia 15.

### Proposta: Tráfego no mesmo molde da Consultoria
- **Só tráfego pago.** Itens de outras áreas viram **pedidos** automáticos para Design/Audiovisual/Social/Consultoria
  (com a quantidade e o motivo), e não itens para o gestor de tráfego revisar.
- **Entradas:** direcionamento do mês (o mesmo de todas as áreas + verba) e perguntas do mês ao cliente (fila/link).
- **Motor (edge function, Opus, 1/dia, custo registrado), em etapas:**
  1. Leitura do histórico: o que deu certo e errado por campanha, público, posicionamento e **criativo** (miniatura, gasto,
     resultado, custo por resultado), quantos criativos subimos e quanto duraram.
  2. Concorrentes e mercado: Biblioteca de Anúncios dos concorrentes, ofertas e ganchos que eles repetem.
  3. Tendências globais e do nicho que dá para trazer (busca na web).
  4. Ofertas de tráfego (isca, condição, urgência real), alinhadas à Consultoria e às datas do mês.
  5. Canais além da Meta quando fizer sentido: Google (Pesquisa, Maps/Perfil da Empresa, YouTube), outros; com verba de
     teste e motivo. Sem integração do Google Ads, entra como recomendação de teste.
  6. Plano do mês pronto para aplicar: estrutura de campanhas, públicos, verba por campanha e por semana, criativos
     pedidos (formato, ângulo, gancho), testes A/B, metas e KPIs (custo por contato, contatos, vendas), calendário
     semanal e critérios de corte/escala.
- **Saída:** apresentação em abas editável (Resumo, O que aprendemos, Concorrentes, Ofertas, Plano, Criativos pedidos,
  Metas, Riscos, Do cliente), gráficos (evolução, custo por resultado, ranking de criativos, verba por campanha, funil),
  aprovação → PDF vertical/paisagem → link público vivo → portal. Pedidos para outras áreas só saem após aprovar.
- **Acompanhamento:** relatório semanal compara com o plano (o que foi aplicado, metas) e alimenta o mês seguinte.
- **Limites honestos:** só ~6 semanas de histórico (melhora a cada mês), sem Google Ads e sem vendas reais; para ligar o
  Google Ads é preciso o developer token (ESTUDO-MCPS-APIS.md) ou um conector (ex.: Windsor).
- **Custo estimado:** ~US$ 1,5 por cliente/mês (Opus) → ~US$ 15 a 20/mês para os clientes de tráfego.

### 14.1 Reforço do Italo: estrategista digital de verdade, 100% voltado a resultado
- O tráfego também cobre **criativo e vídeo, mas voltados ao anúncio**: melhor forma de comunicação no nicho, estilos de
  vídeo que estão performando (gancho, duração, formato, UGC, depoimento, oferta direta), tipos de venda que dão certo no
  nicho (ex.: WhatsApp direto, agendamento, cupom, oferta relâmpago), referências de anúncios vencedores (Biblioteca de
  Anúncios) com link. Os pedidos de criativo saem para Design/Audiovisual já com esse briefing de performance.

## 15. Portal do cliente com código no WhatsApp (pedido do Italo)
- Hoje: o portal abre por um link pessoal (#token); quem tiver o link entra.
- Proposta: o cliente abre o portal → toca "Receber código" → o sistema manda no WhatsApp dele (número do cadastro) um
  **código de 4 dígitos** numa mensagem curta só com o código (fácil de copiar com toque longo; botão "copiar código" só
  existe na API oficial do WhatsApp, não na Wasender) → ele digita → **acesso liberado por 24 horas naquele aparelho**.
- Segurança: código vale 10 minutos, no máximo 5 tentativas, guardado só como hash; novo código no máximo a cada 1 minuto;
  registro de acessos.
- Exceção à regra "envio ao cliente sempre confirmado por humano": o código é pedido pelo próprio cliente. Precisa do OK do Italo.
