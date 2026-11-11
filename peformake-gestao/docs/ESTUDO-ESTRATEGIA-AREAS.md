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
