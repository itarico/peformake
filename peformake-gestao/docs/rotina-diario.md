# Diário da rotina de melhoria contínua

Mais recente primeiro. A rotina lê isto antes de começar e escreve aqui ao terminar.

## 2026-11-08 · celular sem escorregar de lado + decisões do Financeiro

- Celular: o app inteiro e a área de conteúdo agora cortam o que passar da largura da tela (overflow-x: clip no contêiner, não só no html, que o iPhone ignorava); itens de grade não empurram a coluna; números grandes do Início menores no celular.
- Financeiro, decisões do Italo (ainda NÃO construir nada, só definir): (1) todas as entregas do mês ficam prontas até o dia 25 do mesmo mês; (2) audiovisual sem sinal, como já é hoje com todos os clientes (cobra 100% na produção, captação confirmada); (3) parceiros com clientes próprios: é protótipo, sem contador; o sistema calcula o repasse e o admin paga no dia 30.
- Pendente: ver no iPhone se o Início ficou travado; aguardar o ok para começar a Fase 0 do Financeiro.

## 2026-11-08 · desenho do Financeiro (estudo, nada construído)
Questionário com 64 decisões (respondido com as recomendações; o Italo pode mudar): https://claude.ai/artifact/LYgE7bU9eMBzuYHQ7EQKG3
Desenho final com 39 conflitos e solução, e fases 0 a 5: https://claude.ai/artifact/BrnawfeK3mAjtEj3RykjyC
Fase 0 (correções urgentes): fuso/data real do Asaas; conciliação Asaas e extrato com faturas; travar edição de lançamento inv:; baixa do grupo inteiro; multa/juros/CPF no link; preço AV oculto da produção; sinal_pct; avulso de membro só libera quando o cliente paga, com 25% da empresa.

## 2026-11-08 noite (2) · sessão do PC
Feito: automações em pop-up por área (AutomationsLink = ícone ⚡ com contador de problemas; Configurações mostra só sistema+WhatsApp; Comercial mostra comercial+WhatsApp); central saiu do menu de Configurações (rota /configuracoes/automacoes continua). Correções da revisão por função: can_finance(ellcazo) aceita a função ellcazo; can_access_av/can_manage_av e AV_ROLES incluem ellcazo; services legível por todos; my_day.leads lê crm_deals; social_from_request → /conteudo/redes; 6 avisos cadastrados em notification_rules; Configurações do head sem Integrações/Serviços/Orçamento.
Esperando o Italo decidir: quem vê valores (comercial: negociações e vendas; vídeo: orçamentos e fotos; tráfego: gasto com anúncios; cada um: os próprios ganhos). Sugestão: liberar tráfego e próprios ganhos; comercial e vídeo só admin.
Pendente de convite: 9 membros sem login.

## 2026-11-08 noite · sessão do PC
Feito: remuneração por membro (member_pay, member_pay_goals, member_ote, team_pay_overview; gatilho/teto em team_settings) em Equipe → Membros (aba Remuneração) e Equipe → Configurações. Leads da equipe no Funil do Comercial (crm_deals com lead manual; RLS deal_visible: dono, admin/head veem todos). Ellcazo com o verde da logo (#72B52F) e marca em blocos. Logos de clientes coloridas no site.
Limite conhecido: metas da variável medem o resultado da área toda, não só o da pessoa.
Fila: auditoria de permissões por função (em andamento); Minha conta (telefone, e-mail, senha, foto, Pix/conta/CPF protegidos; Modo TV para Configurações; tirar Ver site); resumos com gráficos por área; Operação no menu; Metas; Inteligência; Login novo; botão Planilha com opção PDF.

## 2026-11-08 tarde · sessão do PC
Feito: Configurações com menu lateral em grupos (celular: lista), Ellcazo · Audiovisual com destaque (Produção, Orçamento, Serviços e pacotes), resumo de cada automação. Equipe → Membros (substitui Acessos): adicionar/editar em pop-up, convite por e-mail, master (profiles.is_master) protegido. Cobrança: botão Vencimento (só esta ou todo mês).
Fila do Italo (ordem combinada): 1) Equipe → Configurações com perfil de cada membro (salário, OTE, metas da variável) e regras gerais; leads da equipe vão para Comercial (Kanban de todos, cada um vê os seus, admin vê todos). 2) Resumos com gráficos (pizza, velocímetro) em Financeiro, Conteúdo, Audiovisual, Comercial e Equipe (produtividade). 3) Metas mais fácil. 4) Inteligência com outro visual. 5) Login novo (frases animadas, personagens que seguem o mouse, Google só se já estiver ligado).

## 2026-11-08 · sessão do PC (pedidos do Italo)
Feito: cobrança única do mês (Financeiro → Cobrança: botão "Juntar com as outras", cartão da cobrança única, Separar; chave "Cobrança única do mês" em Configurar cobrança, começa DESLIGADA). Grupo divide o mesmo link do Asaas; pago, todas as faturas viram pagas e cada empresa segue com a sua parte.
Feito: serviço avulso com quem executa (ficha do cliente → Financeiro → "Serviço avulso" e Cobrança): cria a fatura do cliente + conta a pagar da pessoa (Caixa, categoria Equipe) + cartão "Você tem para receber" no Início dela. staff_members.skills aprende a função.
Corrigido: Configurações → Notificações caía com mensagem da fila sem telefone. Ícone da aba arredondado.
Fila do Italo (próximo): Configurações sem rolagem lateral + resumo em cada automação + Audiovisual (Ellcazo) agrupado com destaque; Acessos (botão Adicionar/pop-up, master e admins em destaque, sem desmarcar admin); Metas mais fácil; Inteligência com outro visual; marcar funções (apresentadora) no cadastro do membro.

## 2026-11-07 20h · sessão da nuvem (pedido do Italo pelo celular)
Corrigido: no iPhone o menu de baixo ficava solto no meio da tela (overflow-x hidden no html e no body fazia o body rolar). Agora só `html { overflow-x: clip }`; conferido que nada escorrega de lado em 360/390/768 px.
Antes, nesta sessão: central de Automações (Configurações → Automações), e-mail do cliente opcional, botão "Mudar vencimento" no Financeiro do cliente (fatura em aberto sem link acompanha o dia novo), Bete numa conversa só.
Atenção: um deploy desta sessão saiu antes do push e tirou do ar por alguns minutos as mudanças do PC (ícone e "assessoria"); refeito depois do pull. Publicado: https://peformake-gestao.vercel.app · Commits: 004e9b4

## 2026-11-07 16h30 · auditoria das tarefas automáticas (sessão do PC)
Pausada: melhoria contínua (sem push e sem Supabase); central de Automações atualizada.
Achados (prioridade):
1. Leitura da Meta desligada e a leitura do servidor bloqueada ("API access blocked") desde 05/11; última leitura 06/11 22:03. Painel, Portal e análise usam dado velho; ações aprovadas não chegam à Meta.
2. Análise diária ignora 3 de 8 contas (Disalp, MF Máquinas, Ótica CM) porque olha status_read_at, que a leitura via MCP não preenche.
3. Relatório semanal/mensal: PDF do sistema 07:15, IA escreve 08:00 (invertido); catálogo diz 06:00. CM Prime (maior gasto) ficou sem relatório da semana 26/10–01/11. Mensal deixa o último dia do mês de fora.
4. Comercial: segredo ROUTINE_TOKEN_COMMERCIAL faltando (64 disparos "no_token" em 48h; o cron mostra verde). 13 grupos de WhatsApp sem cliente nunca são lidos.
5. Caixa de mensagens do Tráfego: filtro deixa passar aprovação de post, gravação e envio de vídeo como card; pedido de pausa virou tarefa comum em vez de proposta de ação.
6. Estrategistas: período do semanal diferente do relatório; o mensal vai sobrescrever no dia 15 as 8 estratégias de dezembro em rascunho; perfis de clientes errados (Cajá Limão descreve outro negócio). Horários do catálogo divergem.
7. Fora do sistema: Faxina do PC usa C:\Users\User (o certo é C:\Users\intal; C: 93% cheio); Aula do Professor aponta para branch e arquivos que não existem; Radar de Design sem permissão de push.

## 2026-11-07 15h (Brasília) · sessão do PC
Mudança de casa: o trabalho principal passa para a sessão do PC (pasta `Desktop\APP PEFORMAKE`), que o Italo usa também pelo celular pelo Controle Remoto. A nuvem fica de reserva. Regra nova no CLAUDE.md: "Onde se trabalha e como sincronizar".
Corrigido: ícone da aba era o raio padrão do Vite; agora é a logo PFMK.
Refeito: troca "agência" → "assessoria" (o commit 0f964c1 da nuvem foi publicado na Vercel mas nunca chegou ao GitHub).
Publicado: https://peformake-gestao.vercel.app · Commits: 8ece613
Recuperado: a rodada da rotina das 15:39 deixou no Início (Negócio, Entregas do mês e Meu dia) o aviso com "Tentar de novo" quando o carregamento falha. Ela publicou, mas o push foi recusado (403); a mudança foi refeita aqui e enviada.
Problema da rotina: as rodadas de hoje não conseguem dar push (itarico/peformake fora das fontes autorizadas da rotina) e não têm o MCP do Supabase. Enquanto isso não for corrigido, a rotina não deve publicar.

## Fila inicial (07/11/2026)

Precisa do Italo:
- CPF/CNPJ de 31 clientes (sem isso o Asaas não gera a cobrança a partir de 25/11).
- Segredo `WASENDER_API_KEY` no Supabase (lembretes de cobrança e avisos não saem).
- Ligar os 4 conectores (ADS, ADS - ACÁCIA, ADS- F5, Supabase) na rotina do Tráfego.
- Dados das empresas e modelo de contrato da Peformake.
- Decidir: ligar o login dele ao cadastro "Italo" na equipe e o responsável automático das tarefas do Tráfego.

Pendente para a rotina:
- Área do cliente: lista e ficha com menos abas, o essencial primeiro.
- Tráfego: Painel com um cartão por cliente contra a meta; caixa única "Alertas e sugestões"; 32 cards antigos do WhatsApp fora do padrão.
- Financeiro: editar datas e meses no "Novo contrato"; conferir extrato contra o que já foi pago; contas fixas.
- Cartões compactos no Design e no Audiovisual; portal do cliente.
- Descobrir qual função estourou `WORKER_RESOURCE_LIMIT` em 07/11 01:24 (Brasília).
- Catálogo Will Motos → anúncios: migrar do token bloqueado para a rotina oficial da Meta (só com aprovação).

## Bete (prioridade alta, nesta ordem)
1. Atualização ao vivo: aviso urgente novo muda a abinha sem recarregar (ligar a Bete ao tempo real que o sistema já tem).
2. Resumo das 8h: "Bom dia. Hoje: X urgentes, Y para hoje. O mais importante: …" (no sino; push só quando existir).
3. Horário de silêncio (20h–7h) para o que não for urgente; agrupar avisos parecidos ("3 peças aprovadas hoje").
4. "Pergunte à Bete": campo no fim da aba Hoje com respostas do sistema (quem está devendo, quanto entrou, como está a meta).
5. Ações sem sair da Bete: aprovar peça, mudar status de tarefa, aprovar pausa de anúncio (aprovação já existe).
6. Arrastar para o lado no celular: direita = feito, esquerda = adiar para amanhã.
7. Medir uso (resolvido, adiado, ignorado) e cortar o que todo mundo ignora.
8. Push no celular pelo app instalado (precisa de chave VAPID: o Italo cola no Supabase; peça no diário).

## Ideias de mercado (pesquisa 07/11/2026) — fazer na ordem, uma por vez, sempre terminando

1. Relatório mensal com texto de IA no portal (o que aconteceu, por quê, próximo passo) + comentário do cliente no gráfico. Ref.: AgencyAnalytics, Swydo, Reportei Studio.
2. WhatsApp (Comercial → Conversas): resposta sugerida por IA + resumo da conversa; humano sempre aperta enviar. Ref.: Kommo Copilot, RD Station.
3. Aprovação de peça com clique na imagem para comentar e versões (v1, v2…), começando por imagem. Ref.: Filestage, Frame.io, mLabs.
4. Lucro por cliente (Peformake × Ellcazo): receita − custo da equipe − custos diretos, só admin; tempo estimado a partir do que a equipe já faz (cards movidos, peças aprovadas). Ref.: Productive.io, Teamwork.
5. Caixa de "Hoje" única (aprovações, atrasos, WhatsApp sem resposta) + barra de busca rápida (Ctrl+K / lupa no celular) + atualizações otimistas. Ref.: Linear, Notion.
6. Alerta de anúncio fora do normal (custo por resultado/ROAS mudou de repente) virando tarefa — só leitura na Meta. Ref.: Swydo Alerts.
7. Previsão de caixa de 90 dias (contratos + orçamentos pela chance de fechar + histórico de atraso). Ref.: Productive.io.
8. Briefing → tarefas: colar/ditar o briefing e o sistema monta a lista com datas para confirmar. Ref.: Teamwork AI Project Wizard.
9. Checklist mensal por serviço com datas relativas ("relatório dia 5", "planejamento dia 20"). Ref.: HoneyBook.
10. "Ver como o cliente" no portal + linha do tempo do cliente (aprovações, faturas, arquivos, contrato). Ref.: HoneyBook.
11. Funil atualizado pela conversa: IA sugere mover o lead de etapa ("pediu orçamento"). Ref.: Kommo, SleekFlow.
12. Lembrete de lead parado com mensagem pronta (automação nasce desligada, humano envia). Ref.: Kommo Salesbot.
13. Pré-checagem por IA antes da peça ir ao cliente (ortografia, CTA, tom, palavras proibidas do cliente). Ref.: Filestage.
14. Bete com ações confirmadas ("crie as tarefas do cliente X", "quais faturas atrasaram?"). Ref.: ClickUp Brain, Productive.
15. Reunião (áudio) → resumo, decisões e tarefas no quadro. Ref.: Productive AI Notetaker.
16. Galeria de fotos: favoritos, listas e observações de edição por foto. Ref.: Pixieset.
17. Aviso de consumo do escopo do mês por cliente (80% usado com 50% do mês). Ref.: Teamwork.
Já existe algo parecido (melhorar, não refazer): saúde do cliente, relatórios do tráfego, galeria, alertas de tráfego.
