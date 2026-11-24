# Estudo: CRM do cliente no portal, Google Ads e situação do Financeiro (24/11/2026)

Pedido do Italo em 24/11. Só leitura e estudo: nada foi alterado no banco. Aguardando o "pode fazer".

## 1. Financeiro: conferência de 24/11 (leitura do banco)

**Funcionando**
- Rotinas agendadas do financeiro ligadas e sem nenhuma falha nos últimos 7 dias (mensalidade, cobrança, baixa, fechamento, lançamentos fixos).
- Mensalidade de novembro gerada: 37 faturas pendentes (35 vencem dia 30). Fatura paga sempre tem o lançamento no Caixa (0 sem lançamento).
- Nenhum lançamento sem categoria. Teste de tela do Caixa e dos pop-ups de contrato passou (computador e iPhone).

**Problemas reais**
1. **20 das 37 faturas pendentes são de clientes sem CPF/CNPJ.** A cobrança no Asaas só é criada 5 dias antes do vencimento
   (`billing_gateway_queue`), ou seja, a partir de 25/11. Sem CPF/CNPJ o Asaas recusa ("Cliente sem CPF/CNPJ cadastrado", já
   aconteceu em 2 faturas). Resolver: preencher o documento desses clientes antes do dia 25.
2. **As 11 faturas vencidas (R$ 5.800,00, a mais antiga de 30/06) não têm cobrança e nunca vão ter:** todas são de clientes sem
   documento, e a fila só pega fatura "pendente" (vencida fica de fora, a não ser em grupo). Decidir: cobrar, renegociar ou cancelar.
3. Lembrete de fatura e conferência do dia estão desligados (`reminders_enabled`, `sweep_enabled` = false). É escolha, não erro.
4. Asaas está em **produção** com cobrança automática ligada: a partir de 25/11 saem cobranças de verdade para os clientes com documento.

## 2. WhatsApp do financeiro e comandos no grupo

- O WhatsApp da Peformake está recebendo (2.663 mensagens nos últimos 7 dias). A leitura de lançamentos está **ligada**
  (`fin_wa_settings.enabled`), com o grupo "Despesas" e 1 pessoa liberada.
- **Nunca foi usado de verdade:** a última mensagem nesse grupo é de 11/11, um dia antes de ligarem a leitura; a caixa de entrada
  do financeiro está vazia e não existe nenhum lançamento vindo do WhatsApp. Falta o teste real: mandar `gasto 89,90 canva` no grupo.
- Resposta no grupo, reembolso e Pix estão desligados. Para "conversar" com o sistema, ligar **Resposta no grupo** (Configurações → Automações).
- Agendar, criar tarefa, cadastrar cliente, venda e "pagou" pelo grupo: **só existe o estudo** (`ESTUDO-WHATSAPP-COMANDOS.md` e
  `GUIA-COMANDOS-WHATSAPP.md`), nada construído. O plano já prevê gravar quem mandou o comando (pelo telefone em `fin_wa_people`),
  então a tarefa nasce vinculada a quem criou. Entra junto da tabela única de tarefas (`ARQUITETURA-TAREFAS.md`).

Ordem sugerida: (1) teste real do gasto no grupo; (2) ligar a resposta no grupo; (3) construir `tarefa` e `agendar`; (4) o resto.

## 3. CRM do cliente dentro do portal (com login)

**O que já existe**
- Portal por link, sem login (`/portal`).
- Login do cliente com e-mail e senha (função `portal-account`, em Clientes → Portal → acesso por login).
- A partir de 24/11: conversas com anúncio de origem (`wa_leads`) e vendas (`client_sales`), ainda aguardando a migração.

**Proposta**
- Área "Meu CRM" no portal, só para cliente com Tráfego e só depois do login (o resto do portal continua aberto pelo link).
- Uma tela, de cima para baixo:
  1. 4 números do mês com variação: investido, conversas, vendas, valor vendido (e custo por conversa).
  2. Gráfico diário: investimento × conversas × vendas.
  3. Anúncios que mais geraram conversa e venda (com a miniatura).
  4. Lista de conversas (nome, de qual anúncio veio, vendeu ou não). O cliente pode marcar "Vendeu" e o valor.
- Segurança: função do banco que só devolve dados do cliente dono do login; nada de valores da Peformake.
- Depende de: migração de Vendas aplicada e WhatsApp do cliente conectado.

**Decisões do Italo**: o cliente pode marcar venda sozinho? Ele vê o texto das conversas ou só o resumo?

## 4. Google Ads no sistema

**Hoje**: o Tráfego só lê a Meta (`ad_accounts`, `traffic_entities`, `traffic_daily_metrics`). Já existe ligação com contas Google
(`google-oauth`, `google_accounts`) usada para o Drive.

**Caminho (a confirmar na documentação do Google antes de construir)**
1. Acesso: conta de administrador (MCC) da Peformake com as contas dos clientes vinculadas e um token de desenvolvedor do Google Ads.
2. Leitura primeiro (igual fizemos na Meta): campanhas, gasto, cliques, conversões por dia, gravando nas mesmas tabelas com a
   coluna "rede" (meta | google). Painel, Campanhas, Saldo e Relatórios passam a somar as duas redes.
3. Vendas: mandar a venda marcada também para o Google (conversão offline), quando a conversa veio de anúncio do Google.
4. Ações (pausar, orçamento) só depois, com aprovação, como na Meta.

**Aula no Professor**: a rotina "Aula do Professor" está quebrada (o diário registra que ela aponta para branch e arquivos que não
existem). Precisa ser consertada antes de receber o conteúdo de Google Ads.
