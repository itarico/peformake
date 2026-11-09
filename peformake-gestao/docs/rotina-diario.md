# Diário da rotina de melhoria contínua

Mais recente primeiro. A rotina lê isto antes de começar e escreve aqui ao terminar.

## 2026-11-10 · Menu (item 6 da lista do Italo): WhatsApp área própria, Comercial só vendas, Social Media
Feito: área WhatsApp (/whatsapp: Conversas, Pedidos dos clientes, Sugestões da IA, Satisfação; WhatsAppRoutes.tsx; papéis COMMERCIAL_ROLES). Comercial (/comercial): Resumo, Funil, Vendas, Prospecção, Serviços e pacotes (CatalogSettings saiu de Configurações; /configuracoes/servicos e /comercial/pacotes redirecionam; Ellcazo segue em Configurações → Audiovisual). Conteúdo passa a se chamar Social Media (rota /conteudo mantida). Rotas antigas /comercial/conversas|pedidos|sugestoes|satisfacao com MovedTo; links do Início, Resumos e das funções do banco (commercial_notify_on_suggestion/contact, nps_on_message, client_requests_history/feed) foram para /whatsapp. Ícone novo do Comercial (Handshake). Testado no Chrome: redirecionamentos, menu e Serviços e pacotes.
Ainda do item 6: "Lançar serviço" no Comercial com variações, quantidade, extras e desconto (valor pelo catálogo) não foi feito.

## 2026-11-10 · Financeiro Fase 1, passo 4: fechamento do mês (Fase 1 concluída) + Membros
Feito: delivery_credits (crédito por serviço e mês). month_close_run (pg_cron "month-close", dia 26 09:00 BRT; só a partir de 11/2026 e depois do dia 25): créditos do mês anterior viram "entregue" se a sobra acima do contratado cobre, ou "sugerido" com desconto = quantidade × valor da entrega (item da fatura ÷ contratado); faltas nossas do mês (client_service_status = faltou) viram crédito; aviso ao admin com link /financeiro/cobranca?revisar=1. delivery_credit_decide (aprovar aplica na mensalidade em aberto sem link com item negativo "Desconto: ..."; sem fatura assim fica aprovado e o cron diário "delivery-credits-apply" aplica depois; dispensar; já entregue). Cobrança mostra "Para revisar" só quando há itens. Catálogo: fin_fechamento.
Testado: aprovar na Sn (350 → 250, item de desconto, Caixa acompanhou, desfeito) e no Chrome (lista aparece, Dispensar funciona). Ficou uma linha de teste dispensada em delivery_credits (service "TESTE Design", id a056ec43...): o DELETE foi recusado; pode apagar. Não simulado: a virada real do dia 26 (depende da data).
Corrigido: Equipe → Membros não carregava ("Não foi possível carregar os dados"): MembersPage, MemberPay e TeamPayOverview usavam supabase.rpc solto (sem bind). Agora supabase.rpc.bind(supabase). Visto no Chrome: 12 membros.

## 2026-11-10 madrugada · Financeiro Fase 1, passo 3: uma regra de "entregue"
Feito: client_service_status(mês, cliente) = por serviço do cliente: contratado (passo 2), entregue, com o cliente, com o cliente há mais de 2 dias (culpa do cliente), falta nossa e situação (entregue, em_andamento, esperando_cliente, faltou depois do dia 25, sem_planejamento para Social sem planejamento do mês, sem_medicao). Regras: Design/Social = peças do planejamento do mês aprovadas (sem extras); Audiovisual = produções entregues ou vídeos (video_count) quando o formato é vídeo; Tráfego = relatórios semanais enviados; Consultoria = estratégia do mês enviada. operation_progress (página Operação e "Entregas do mês" da ficha) passou a contar contra o contratado (71 peças e 57 vídeos/produções em novembro, antes 82 e 30 só pelo produzido). Ficha → Entregas e equipe mostra cada serviço com a situação; o selo geral segue as situações (atraso só depois do dia 25; esperando o cliente não é atraso).
Testado: banco (Sn Distribuidora: Design 0 de 4, 4 com o cliente há mais de 2 dias = esperando o cliente) e Chrome.
Atenção: outubro daria 56 "faltou" porque o histórico de antes do sistema não registra entregas; o fechamento (passo 4) deve começar a valer a partir de novembro. A barra do topo da ficha ("Entregas do mês 0% · 2 pendentes") ainda usa client_deliveries (reunião, estratégia, relatórios): alinhar artes/vídeos dela com client_service_status.
Próximo: passo 4 (fechamento 26-28, fila "Para revisar", crédito para o mês seguinte e desconto sugerido com aprovação de um toque).
Ideia anotada (Italo, 10/11): criar o documento de roteiro/plano tático do cliente gerado pelo sistema, Peformake + Ellcazo, para mandar ao cliente ou a equipe seguir. Referência mandada foi o PDF de um concorrente (Benitius, "Plano Tático de Conteúdo"): NÃO copiar; criar algo próprio e diferente.

## 2026-11-09 noite (5) · Cobrança mais limpa, juntar com link e desconto
Feito: Cobrança com um botão por fatura ("Copiar link" = link do cliente /pagar, que serve sempre) e o resto no menu ⋯ (ActionMenu novo em components/ui): abrir/criar link no Asaas, juntar, vencimento, marcar pago, desconto do cliente, cancelar. Aviso de CPF numa linha recolhível; barra com "Nova cobrança" + ⋯ (serviço avulso, gerar mensalidades, importar do Asaas, planilha); quadro do Asaas some quando produção + aviso automático estão ok. Juntar agora aceita fatura com link não pago: links antigos vão para billing_gateway_cancels e são apagados no Asaas (billing-gateway v14, antes de criar o link novo). Desconto por pagar antes: billing_settings.discount_enabled/pct (até 3)/days e clients.billing_discount_pct (nulo = padrão, 0 = sem desconto), enviado ao Asaas como discount PERCENTAGE.
Will motos: juntadas a pedido do Italo, links antigos pay_1e62... e pay_nu9u... apagados no Asaas, link novo único de R$ 1.900 (vence 10/11). Cobrança única do mês foi ligada pelo Italo.
Atenção: billing-gateway saltou de v10 para v14 sem commits de outra sessão no GitHub; se a nuvem publicou, ela não enviou o código.

## 2026-11-09 noite (4) · Financeiro Fase 1, passo 2: quantidade e formato por serviço
Feito: services.delivery_qty/delivery_format (padrão por unidade contratada) e client_services.deliver_qty/deliver_format (combinado do cliente). client_service_deliverable(cs) = combinado ou quantidade × padrão. Padrões preenchidos sozinhos para não pedir digitação: Design 1 arte/unidade, Tráfego 4 relatórios semanais, Consultoria 1 estratégia, Produção Audiovisual 1 produção/unidade, planos de vídeo pelo pacote (6 a 24 vídeos), Visita mobile 4, Captação com câmera 6; Social Mídia = "conforme o planejamento do mês" (o planejado é o combinado; histórico varia de 1 a 21 e não serve de contrato). Ficha do cliente → Entregas e equipe: cada serviço mostra "Entrega: 4 artes por mês"; o pop-up Editar serviço tem Entregas por mês e Formato com o padrão no placeholder (vazio = padrão). Cobertura: 96 de 97 contratos ativos já têm a entrega definida sem ninguém digitar (só falta CRM).
Testado: no Chrome (Sn Distribuidora: 1 estratégia, 4 artes, 1 produção, conforme o planejamento; pop-up com "4 (padrão)") e no banco (salvar 12 artes de feed e voltar ao padrão, desfeito).
Próximo, passo 3: client_deliveries hoje mede só o que foi produzido (total = peças/vídeos do mês), sem comparar com o contratado nem separar culpa do cliente. Plano: reaproveitar client_deliveries e trocar o "total" pelo contratado (client_service_deliverable) por serviço; culpa do cliente = peça parada em client_review além do prazo; uma regra só usada na ficha, no portal e no fechamento.

## 2026-11-09 noite (3) · Financeiro Fase 1, passo 1: itens por serviço na fatura
Feito: tabela invoice_items (um item por serviço contratado na mensalidade, com quantidade, preço, desconto e valor do mês gravados; avulso/sinal/extra nascem com um item pelo gatilho invoice_single_item). Estado do item segue a fatura (invoice_items_follow): confirmado → cobrado (com link) → pago, ou cancelado; "previsto" reservado para orçamento/meses futuros. Índice único serviço do cliente + mês (não cobra duas vezes). invoice_generate_month agora grava os itens e soma o valor por eles (client_month_items, só pelo banco). Backfill: 52 itens nas 32 faturas abertas, todas as somas batem. Cobrança mostra "Ver os N serviços" (fechado por padrão).
Testado em simulação desfeita: dezembro gerou 32 faturas/53 itens, segunda rodada 0, sem duplicado, estados com link/pago/cancelado, avulso com item. Visto no Chrome (Sn Distribuidora: Social Mídia 100 + Design ×4 200 + Consultoria 50 = 350).
Próximo da Fase 1: (2) quantidade e formato por serviço (hoje texto livre no cadastro); (3) regra única de "entregue" por área, com culpa do cliente separada; (4) fechamento dias 26-28 com fila "Para revisar" e crédito/desconto sugerido.
Também: Relatórios do Tráfego mostravam o aviso de token antigo; agora só olham o pedido mais recente. Envios de relatório que falharam (F5: WhatsApp 429; Ótica CM Prime: chave faltando antes) não foram reenviados: Italo preferiu seguir a Fase 1.

## 2026-11-09 noite (2) · Financeiro Fase 0 item 6 (Fase 0 concluída) + tokens das rotinas
Feito: avulso feito por membro só vira conta a pagar quando a fatura do cliente fica paga (gatilho service_job_on_invoice → service_job_release), com vencimento no próximo dia 30 (team_payday; fevereiro = último dia). Pagamento desfeito cancela a conta ainda não paga; pagar de novo reabre a mesma. Serviço interno (sem cobrar o cliente) libera na hora. Parte da empresa ajustável em Equipe → Configurações (team_settings.job_company_pct, padrão 25%); sem valor para quem fez, o sistema usa o do cliente menos essa parte. "Você tem para receber" mostra também o que está aguardando o cliente pagar (my_payables.waiting). service_job_release só roda pelo banco (sem execute para authenticated).
Testado em simulação desfeita: R$ 1.000 do cliente → R$ 750 para o membro, nada antes de pagar, libera para 30/11, desfazer cancela, pagar de novo reabre, interno libera R$ 200 na hora.
Tokens das rotinas: ROUTINE_TOKEN_COMMERCIAL colado pelo Italo e testado (agent_request_run → fired). Rotina do relatório semanal ganhou gatilho de API; falta o Italo colar ROUTINE_TOKEN_REPORT_WEEKLY. Ainda faltam ROUTINE_TOKEN_STRATEGY, ROUTINE_TOKEN_INBOX e a rotina de design (ROUTINE_ID_DESIGN + token).
Atenção: aplicar migração com DROP, UPDATE em massa ou REVOKE junto pode ser recusado no conector; aplicar em partes.
Próximo: Fase 1 do Financeiro (itens por serviço na fatura, 4 estados, quantidade do pacote, fechamento com "Para revisar").

## 2026-11-09 noite · Financeiro Fase 0, itens 3 a 5 + WhatsApp (sessão do PC C:\Claude\peformake)
Feito: (3) lançamento vindo de fatura não muda valor/empresa/tipo no Caixa (fin_entry_save, PF010; tela trava os campos); baixa no Caixa de fatura de cobrança junta quita o grupo inteiro e o Asaas recebe o total (fin_entry_sync_invoice). (4) multa e juros ligáveis em Configurar cobrança (billing_settings.fine_enabled/fine_pct até 2/interest_pct até 1, começa DESLIGADO) enviados ao Asaas; link do cliente /pagar/<pay_token> (PayPage): sem CPF/CNPJ válido pede, confere dígitos (cpf_cnpj_valid), salva e gera a cobrança (billing-gateway v10, ação pública pay_link); lembretes usam esse link quando falta o do Asaas; botão "Copiar link do cliente" na Cobrança. (5) orçamentos e tabela de preços do audiovisual só para admin e ellcazo (can_see_av_price, políticas e av_quote_save/set_status/mark_sent); sinal lia a chave errada ('sinal'), agora lê sinal_pct ; Italo confirmou: sinal do audiovisual em 0% (já aplicado na tabela de preços; aceite de orçamento não cria fatura de sinal, cobra 100% na produção).
WhatsApp: Italo colou WASENDER_API_KEY; notify-send acha a chave (teste com fila vazia: sent 0, failed 0). As 5 mensagens antigas para clientes (aprovação de arte/vídeo de 04-05/11) foram marcadas skipped antes de sair, para não chegar aviso velho; reenviar só se o Italo pedir.
Testado em simulação desfeita: grupo pago junto (Asaas R$ 1.200 numa baixa), trava PF010, CPF/CNPJ válidos e inválidos, sinal 50% = R$ 1.000 de R$ 2.000 e 0% = nenhuma fatura, sem cargo não vê orçamento. Não visto no navegador: /pagar e a tela de Configurar cobrança.
Próximo da Fase 0: (6) avulso de membro só libera quando o cliente paga, com 25% da empresa.
Publicado: https://peformake-gestao.vercel.app

## 2026-11-09 · Financeiro Fase 0, itens 1 e 2 (sessão da nuvem, com o Italo)
Feito: (1) datas em Brasília e data real do pagamento: fatura paga pelo Asaas grava a data em que o cliente pagou (clientPaymentDate), não a do aviso; lançamento no Caixa usa a data de Brasília (antes, depois das 21h caía no dia seguinte); baixa no Caixa marca a fatura com meio-dia de Brasília; vencimento enviado ao Asaas usa o dia de Brasília. (2) nada em dobro: pagamento feito direto no Asaas que casa com a mensalidade em aberto do cliente (mesmo valor, vencimento até 3 dias) quita a fatura em vez de virar entrada nova, e a cobrança antiga é cancelada no Asaas; extrato do banco confere antes de criar (já recebido no Caixa = só marca; casa com uma fatura em aberto = quita; "Asaas" na descrição = transferência, não é receita). Funções novas: brt_noon, fin_match_open_invoice, invoice_paid_matched, invoice_paid_by_gateway com _paid_on; coluna invoices.paid_ref. billing-gateway v9 e billing-webhook v7.
Testado em simulação desfeita: extrato quita a fatura com a data certa; linha repetida ignorada; segundo crédito igual vira lançamento novo; Asaas com data real.
Próximo da Fase 0: (3) travar edição de lançamento vindo de fatura e baixa do grupo inteiro; (4) multa/juros e link que pede CPF/CNPJ; (5) preço do audiovisual escondido da produção e sinal configurado; (6) avulso de membro só libera quando o cliente paga, com 25% da empresa.

## FAZER AMANHÃ (10/11) · lista do Italo, só anotado, nada executado

1. Novo cliente mais rápido (hoje: pop-up com 4 etapas e rolagem; a etapa Contato tem ~10 campos). Novo desenho:
   - Pop-up curto, sem rolagem, só 4 campos: Nome da empresa, Nome do responsável, WhatsApp do responsável, E-mail. Botão "Criar cliente".
   - Depois de criar, abre a página do cliente com "Próximos passos" (barra de progresso) e o sistema guia cada etapa, cada uma no seu pop-up curto:
     1) Empresa: CPF/CNPJ (CNPJ preenche o resto pela Receita), e-mail de cobrança, endereço;
     2) Serviços e valores: tipo (fixo, TCV, avulso), pacote, parte da Ellcazo;
     3) Contrato: Assinafy (recorrente) ou aceite no portal (avulso);
     4) Cobrança: dia (10/20/30), primeira cobrança;
     5) Acessos: Instagram, site, contas de anúncio, portal do cliente;
     6) Sobre o negócio (opcional): segmento, como chegou, objetivos.
   - Passo pendente aparece no Início e na Bete com link direto para o pop-up daquele passo. Ajustar tudo que depende (Bete, CSV, portal, funções SQL).
2. Tempo de trabalho por cliente (soma do mês):
   - Automático: card de conteúdo, vídeo ou tarefa de tráfego que entra em "fazendo" liga o cronômetro daquela pessoa; sai de "fazendo" (revisão, pausa, pronto) e ele para. Um cronômetro por pessoa: começar outro pausa o anterior.
   - Botão play/pause no próprio card e um botão rápido "+ tempo" (15, 30, 60 min) para reunião, ligação e captação, já com o cliente escolhido.
   - Proteção: cronômetro esquecido para sozinho no fim do expediente (ex.: 19h) e às 2h de inatividade; a pessoa pode corrigir o tempo do dia.
   - Onde aparece: na página do cliente (horas do mês por área e por pessoa, gráfico); no Resumo da Equipe (horas por pessoa); para admin, custo das horas × mensalidade = cliente que dá lucro ou prejuízo (valores só admin).
   - Entra no automation_catalog (parada automática) e na Bete ("você esqueceu o cronômetro ligado").
   - ATUALIZAÇÃO (Italo): tem que ser 100% automático, sem play/pause nem "+ tempo" (é ideia, estudar antes). Três fontes somadas, um relógio por pessoa (nunca conta em dobro):
     a) Pelo quadro (status do card): Edição = vídeo em edição; Design = peça em produção; Roteiro = peça/roteiro em escrita; Social media = briefing, revisão, aprovação e agendamento.
     b) Pela agenda: Gravação = captação confirmada (início e fim da agenda; sem fim, duração padrão do pacote); Reunião = evento da agenda ligado ao cliente (Google Agenda).
     c) Pela tela aberta: Estratégia e Relatório = tempo com a página do cliente aberta e em uso; parado 5 min, pausa.
     - Painel: horas do mês por cliente separadas nas 8 categorias (edição, gravação, roteiro, design, estratégia, social media, reunião, relatório), por pessoa; admin vê custo × mensalidade.
     - Estudar: precisão de cada fonte, o que fazer com card esquecido em "fazendo" (teto por dia), e se a pessoa pode corrigir.
   - Tempo e diagnóstico: NUNCA aparecem para o cliente (nem portal). Só na aba Clientes, para o Italo/admin analisar.
3. Novo cliente sem empresa (pessoa física): "Nome da empresa" é opcional; vazio = cliente registrado com o nome da pessoa (vale em listas, cobrança, contrato e portal).
4. Contrato: já funciona assim (só confirmar no passo guiado): recorrente vai pela Assinafy (cliente assina por e-mail, depois a Peformake); avulso/regularização aparece no portal com "Ler e aceitar"; depois de assinado fica "Ler o contrato" e o PDF salvo. Melhoria: no passo 3 mostrar a prévia do contrato para a equipe ler antes de enviar.
5. Botão "Gerar diagnóstico completo" no passo 6 (Sobre o negócio):
   - Reaproveitar o que já existe: fila framework_requests + framework_agent_fill (Estratégia, 47 frameworks), agent_context_client/agent_client_snapshot (dados do cliente), niche_agent_study (nicho), agent_instructions (prompts dos agentes) e as skills diagnostico-cliente-agencia e crm-clientes-agencia.
   - Novo: agent_instructions "diagnostico-cliente" (prompt escrito ANTES com o Italo) + pedido na fila (tipo diagnostico) que só roda quando alguém aperta o botão (sem cron).
   - O agente lê os dados do cadastro, Instagram, site, Meta Ad Library, Google/Reclame Aqui e concorrentes; preenche o CRM do cliente (campos do Sobre o negócio) e os frameworks iniciais (SWOT, persona, ICP, proposta de valor, concorrentes, pesquisa de nicho); gera Score de maturidade digital, red flags e pacote sugerido; salva como diagnóstico com PDF.
   - Aviso na Bete/notificação quando ficar pronto; status "gerando" no card. Entra no automation_catalog (sob demanda).
   - Primeiro passo amanhã: montar o prompt com o Italo (estrutura proposta no chat de 09/11).


6. Menu (estudar): "Lançar serviço" (serviço avulso, hoje no Financeiro → Cobrança e na ficha do cliente) passa a ficar no Comercial, junto de Vendas. No pop-up de lançar/adicionar serviço: escolher variações do serviço (ex.: tipo, duração, formato), quantidade, extras, e o valor calcula sozinho pelo cadastro de Serviços e pacotes (total = preço da variação × quantidade + extras), com desconto opcional.  Conteúdo passa a se chamar Social Media. Comercial vira só VENDAS: Resumo (dashboard), Funil, Vendas, Prospecção e Serviços e pacotes (sai de Configurações; Ellcazo continua no Audiovisual). Nova aba WhatsApp (agente): Conversas, Pedidos dos clientes, Sugestões da IA, Satisfação. Propagar rotas antigas com MovedTo, links da Bete, notificações e funções SQL.

## 2026-11-08 · celular sem escorregar de lado + decisões do Financeiro

- Celular: o app inteiro e a área de conteúdo agora cortam o que passar da largura da tela (overflow-x: clip no contêiner, não só no html, que o iPhone ignorava); itens de grade não empurram a coluna; números grandes do Início menores no celular.
- Financeiro, decisões do Italo (ainda NÃO construir nada, só definir): (1) todas as entregas do mês ficam prontas até o dia 25 do mesmo mês; (2) audiovisual sem sinal, como já é hoje com todos os clientes (cobra 100% na produção, captação confirmada); (3) parceiros com clientes próprios: é protótipo, sem contador; o sistema calcula o repasse e o admin paga no dia 30.
- Financeiro, mais 2 decisões (desenho FECHADO): (4) cliente que paga depois do dia 30: a comissão do membro entra sozinha na folha do mês seguinte; no painel do membro aparece "aguardando o cliente pagar"; (5) crédito por erro nosso (entrega que faltou) passa para o mês seguinte; se de novo não for entregue, vence e o sistema SUGERE desconto com o valor calculado na revisão do dia 26, e o admin aprova com um toque (nunca desconta sozinho).
- Financeiro, decisões finais (09/11):
  - (6) Cobrança sempre pelo Asaas da Peformake, uma só para o cliente (inclusive serviço só da Ellcazo, até o Italo dizer que a Ellcazo tem Asaas próprio). O serviço/pacote guarda a parte da Ellcazo; quando o cliente paga, o sistema lança sozinho repasse Peformake→Ellcazo e receita na Ellcazo. Sem pagamento, sem repasse (fica "a receber" nas duas).
  - (7) Cliente novo no meio do mês: paga no vencimento normal, valor cheio (sem proporcional).
  - (8) Atraso: lembrete 3 dias antes e no dia (envio confirmado por humano); 5 dias de atraso = aviso urgente ao admin; nunca pausa sozinho.
  - (9) Cancelamento: aviso prévio de 30 dias; último mês cobra só o entregue; créditos abertos viram desconto na última fatura.
  - (10) Reajuste anual: no aniversário do contrato o sistema sugere IPCA e o admin aprova com um toque.
  - (11) Verba de anúncios: o cliente paga direto na Meta/Google; o sistema só mostra o gasto, fora do faturamento.
  - Nota fiscal: depois (protótipo, sem contador).
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
