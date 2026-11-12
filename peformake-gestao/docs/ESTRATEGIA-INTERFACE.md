# Estratégia: interface organizada (13/11/2026)

Pedido do Italo: "ajustar a interface de Estratégia para ficar organizado e funcional, hoje tá uma bagunça".
Capturas antes/depois (iPhone 13 e 1366x800) ficaram na pasta de rascunho da sessão (`estrategia-ui/antes-*.png` e `depois-*.png`).

## O que estava bagunçado

| Onde | Problema |
|---|---|
| Lista da Consultoria | Cada linha só mostrava o diagnóstico. Plano do mês e perguntas apareciam escondidos no subtítulo ("estratégia: 30 para aprovar") ou não apareciam. A ação da linha era genérica ("Revisar", "Abrir") e "Abrir" aparecia até quando o plano esperava aprovação. |
| Dentro do cliente | Dois a três botões "principais" brigando: "Revisar apresentação" (cartão), "Revisar em slides" (aba Plano) e "Aprovar semana" (painel), mais um "⋯" solto numa linha só dele. |
| Diagnóstico | A capa da apresentação ocupava meia tela no celular, com o status repetido duas vezes (cabeçalho e cartão) e "Falta: 30 slides…" repetindo o "0 de 30 revisados". |
| Abas do cliente | "Plano do mês •" truncado ("Plano do m…") no celular; o ponto não dizia quanto faltava. |
| Plano do mês | O status do diagnóstico ("Pronto para revisar") aparecia no topo da aba do plano, confundindo com o status do plano. "Revisar em slides" era um botão solto, fora do cabeçalho. |
| Tráfego / Social / Audiovisual | Sem atalho para a guia de revisão em slides (só a Consultoria tinha). |
| Link público do audiovisual | Mostrava slides que a equipe recusou na revisão. |
| Ação adicionada na revisão do plano | Entrava no meio da semana e podia nem aparecer (a semana mostra só 4 destaques). |

## Como ficou

- **Lista = uma linha por cliente**: nome + `Diagnóstico · Plano · Perguntas`, cada um com bolinha (verde pronto, azul revisar, laranja falta) e 1 a 3 palavras. **Uma ação por linha, a próxima coisa a fazer**, na ordem do que trava: Informar CNPJ → Revisar diagnóstico (abre a guia em aba nova) → Ver respostas → Revisar plano de dezembro (guia do plano em aba nova) → Enviar diagnóstico → Mandar perguntas → Abrir. A lista começa por quem tem revisão. O resto fica no "⋯".
- **Dentro do cliente**: cabeçalho com nome, as 3 partes (no computador) e **1 botão principal** "Revisar em slides" (diagnóstico ou plano, conforme a aba) + "⋯". Abas curtas com número do que pede ação (`Plano 27`, `Perguntas 3`).
- **Diagnóstico**: cartão-resumo (capa pequena, progresso, o que falta) + "Ver detalhes" (fontes e frameworks). Sem a apresentação grande na página.
- **Plano do mês**: as seções por área continuam como filtro; "Aprovar semana" fica discreto (contorno) porque o principal é o "Revisar em slides"; apresentação, PDF, enviar, refazer e rever a semana no "⋯".
- **Tráfego, Social media e Audiovisual**: cada cliente ganhou "Revisar em slides", abrindo `/revisao/plano/:cliente/:mes?area=…` já filtrado na área.
- **Abas do topo Tráfego e Social media: ficam.** São a porta de entrada de quem é da área (só veem a parte deles, e de todo cliente com tráfego ou social, não só de quem tem Consultoria) e guardam o histórico antigo e os relatórios. Nenhuma rota mudou, então não houve `MovedTo` nem link da Bete ou do banco para trocar (conferido no código e em `pg_proc`).

## Revisão completada

- Link público do audiovisual esconde os slides recusados e usa o texto editado: a revisão vem por `monthly_av_public_review(token)` (função à parte, para não mexer em `monthly_av_public` do modo gravação). A chave do slide do audiovisual passou a seguir o vídeo (id da ação), porque o link público só tem os vídeos aprovados e a guia tem todos.
- A guia de revisão do audiovisual mostra as falas editadas no set (`monthly_av_takes.text_override`), como o "Ver roteiro" e o PDF.
- Ação adicionada na revisão do plano ganha slide próprio ("Semana N · ideia nova"), na guia, na prévia e no link público (`monthly_public` manda `added`).

Migração: `supabase/migrations/20261117120000_estrategia_interface.sql`.
