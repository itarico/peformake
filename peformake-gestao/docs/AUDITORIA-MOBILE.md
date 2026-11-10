# Auditoria mobile (iPhone 13, 10/11/2026)

Feita por captura de 60 rotas no ambiente de teste com admin falso. O banco devolveu vazio, então listas e pop-ups com dados foram avaliados pelo código. Nenhuma rolagem lateral encontrada (exceto /tv, esperado).

## Notas
Início/Bete 7 · Navegação 8 · Clientes 6 (cadastro 5) · Comercial 6 · WhatsApp 6 · Social 7 · Audiovisual 6 · Tráfego 5 · Financeiro 4 · Equipe 6 · Configurações/Automações 4 · Portal 6 · Site/login 7 (estimado).

## Régua do Italo (print de Clientes, 10/11)
Antes do primeiro cliente apareciam título, subtítulo, botão grande, abas, 4 alertas, busca, ordenação, 5 filtros, 2 seletores e contador, e a Bete cobria o canto. Regra para todo o sistema no celular:
- título numa linha, com ações em ícone (busca, +);
- sem textos explicativos;
- busca única, e filtros e ordenação em "Filtros (n)" numa folha que sobe de baixo;
- alertas numa linha só, e os zerados somem;
- a Bete nunca cobre conteúdo;
- o primeiro item de conteúdo aparece no primeiro terço da tela.

## 10 problemas
1. Financeiro: o cabeçalho ocupa metade da tela antes do conteúdo.
2. Financeiro: a aba Caixa fica sublinhada junto com Cobrança (falta `end` no NavLink de /financeiro).
3. Caixa: 5 botões e muitos filtros; falta um "+ Despesa" fixo embaixo.
4. Caixa: lançamento com seletor de categoria, valor e botão na mesma linha (quebra). Correção: cartão de 2 linhas.
5. Toques menores que 44px em muitos lugares (chips 36px, setas de mês 40px, fechar do pop-up 40px, Bete 44x24).
6. Folha "Mais" rola por dentro e corta "Minha conta".
7. A 5ª aba de baixo é Estratégia (rara); Financeiro e WhatsApp ficam a 2 toques. Correção: abas por perfil.
8. /clientes/novo é uma página longa. Correção: pop-up por etapas (o pop-up de 4 campos já existe na lista; conferir a rota antiga).
9. Início: vários cartões de erro empilhados quando não há dados. Correção: erro compacto numa linha.
10. A Bete pequena e encostada pode cobrir conteúdo.

## O que manter, simplificar e deixar só no computador
- **Manter:** barra de baixo, Início, Social (quadro e calendário), agenda do Audiovisual, Notificações, Conta, Placar, pop-ups, páginas públicas (pagar, orçamento, galeria).
- **Simplificar:**
  - Caixa em cartões, com ação principal fixa;
  - Tráfego com 3 abas mais "Mais";
  - Clientes em lista mínima;
  - WhatsApp com resposta em 1 toque;
  - Cobrança em cartões com a ação visível;
  - Configurações em lista.
- **Só no computador** (no celular, só ver e ligar/desligar): importar extrato, Membros e permissões, Integrações, Inteligência, Metas (configuração), catálogo de serviços, Estratégia (nichos e estudos), editor completo de orçamento, catálogo de Automações.

## 10 melhorias (até 3 toques)
1. "+" fixo para despesa ou receita, com foto do recibo.
2. "Precisa de você" no topo do Início.
3. Aprovar arte direto da notificação.
4. Responder cliente com sugestão pronta e confirmação.
5. Marcar como paga ou reenviar a cobrança direto no cartão.
6. Barra de baixo por perfil e "Mais" em grade.
7. Busca global no topo.
8. Voz em qualquer pop-up.
9. No máximo 3 filtros visíveis, lembrando a última aba.
10. 3 números do dia no Início, cada um abrindo a lista certa.

Capturas em scratchpad/mobile-audit (da sessão da nuvem, temporárias).

## Medição: onde termina cabeçalho e filtros (iPhone 13, tela de 664px, sem dados)
Meta: o primeiro item aparece antes de 35% da tela (~230px). Sem dados, os números são o mínimo; com dados, sobem.
Na meta: Início 20%, Notificações 25%, Orçamentos AV 23%.
Fora da meta:
- Clientes, WhatsApp e Tráfego: 43%.
- Funil: 50%.
- Produção AV: 51%.
- Placar: 57%.
- Quadro e Calendário do Social: 64%.
- Operação: 64%.
- Agenda AV: 75%.
- Automações: 83%.
- Prospecção: 89%.
- **Cobrança e Contratos: a tela inteira (100% ou mais).**

## Padrão único no celular (aplicar em todas)
1. Uma linha de topo de ~48px: título pequeno, "+" e "Filtros (n)". Subtítulo escondido (hidden md:block no SectionHeader).
2. Uma só busca, de 44px.
3. Filtros, ordenação, empresa e situação numa folha que sobe de baixo, aberta por "Filtros (n)".
4. Alertas: uma linha rolável só com os maiores que zero.
5. Abas coladas no topo. Com mais de 4, mostrar 3 e "Mais".
6. Financeiro: empresa e mês numa linha; Configurar, Planilha, Contas fixas e Importar no menu "⋯"; "+" fixo.
7. Bete: não cobre conteúdo. Bolha de 48px só quando houver algo urgente; +64px de espaço no fim das listas.
8. Teste que mede esses números a cada entrega (script head.js da auditoria; levar para o repositório no autoteste).
