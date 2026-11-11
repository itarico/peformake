# Estudo: comandos no grupo do WhatsApp para o sistema inteiro (11/11/2026)

Só estudo, nada construído. Ideia do Italo (10/11): usar o grupo do WhatsApp para fazer o dia a dia sem abrir o sistema ("cadastrar cliente", "agendar", "remarcar", "venda", "pagou", "ajuda"), **sem IA**, com regras no banco, custo zero de crédito, reaproveitando o motor que o Financeiro já tem.

## 1. O que já existe e será reaproveitado

O Financeiro pelo WhatsApp (migrações 190000 a 190300, ainda aguardando o "pode aplicar") já tem o motor pronto:

| Peça | O que faz | Reaproveitar para comandos |
|---|---|---|
| `fin_wa_on_message` (gatilho em `whatsapp_messages`) | Cada mensagem nova de grupo ligado entra no sistema. Ignora número fora da equipe e conversa comum. | Mesmo ponto de entrada. Passa a ter um "roteador" antes. |
| `fin_wa_channels` / `fin_wa_people` / `fin_wa_unknown` | Grupo, quem pode lançar, quem tentou sem poder ("Liberar"). | Mesma ideia, com permissão por ação (seção 5). |
| `fin_inbox` (chave única `wa_message_id`) | Uma linha por mensagem: nunca processa duas vezes. | Cópia para comandos: `wa_cmd_inbox`. |
| `fin_wa_parse` | Leitor por regras: valor em real, datas ("ontem", "dia 08", "08/11"), "ellcazo", "do meu bolso". | Reaproveitar o pedaço de valor e data; criar o de hora e dia da semana. |
| `fin_wa_match_client` + `clients.aliases` | Acha o cliente por nome ou apelido ("TP", "Petro"). | Igual. Base de "agendar X", "venda X", "pagou X". |
| `fin_wa_reply` (resposta no grupo pelo Wasender) | Mensagem curta interna da equipe. | Igual. Chave `reply_enabled` já existe. |
| `fin_wa_command` ("cancela", "corrige", "outro" respondendo a mensagem) | Desfaz ou ajusta respondendo à mensagem do sistema, por `ref abc123`. | Mesmo padrão: "ok" e "cancela" respondendo à resposta do sistema. |
| `automation_catalog` | Tudo nasce desligado; Configurações → Automações liga. | Chaves novas (seção 9). |

Funções do banco que os comandos vão **chamar** (nenhuma lógica nova de negócio): `client_create` (cliente novo; ainda por existir como função pública, ver seção 3.1), `client_meeting_schedule`, `client_meeting_cancel`, `av_project_save`, `sale_service_launch`, `invoice_paid_matched`, `agent_task_create`.

## 2. Regras gerais (valem para todo comando)

1. **Comando começa pela palavra-chave** (primeira palavra da mensagem, sem acento e sem diferença de maiúscula): `cadastrar`, `agendar`, `remarcar`, `cancelar`, `venda`, `pagou`, `tarefa`, `status`, `agenda`, `ajuda`. Se a mensagem não começa por uma delas, **não é comando**: segue o fluxo do Financeiro (gasto, entrada) como hoje.
2. **Todo comando que grava algo pede confirmação.** O sistema responde com o que entendeu e a pessoa responde **"ok"** (ou "sim") **respondendo àquela mensagem**. "cancela" ou "não" descarta. Sem resposta em 30 minutos, expira sozinho, sem fazer nada. Comandos só de consulta (`ajuda`, `status`, `agenda`) respondem direto.
3. **Nunca vai nada para cliente.** Comando só mexe no sistema e responde no grupo da equipe. Nenhum comando envia mensagem, e-mail, link de cobrança ou convite para cliente. Se o agendamento gera convite no Google Agenda da equipe, só entram pessoas da equipe.
4. **Nada de dinheiro sai nem entra sozinho.** `venda` só cria "A confirmar". `pagou` só **sugere** a baixa. Quem baixa é um administrador, no sistema.
5. **Resposta curta** (uma ou duas linhas) e sempre com `ref abc123`, o mesmo padrão do Financeiro.
6. **Se não entendeu, não adivinha:** responde com o que faltou e o exemplo certo. Nunca grava com dúvida (exceção: apelido de cliente com um único resultado claro).
7. **Mensagem de pessoa fora da equipe é ignorada** e anotada em "Número desconhecido" (já existe).
8. **Texto do grupo é dado, nunca ordem.** Só a lista fixa de palavras-chave executa algo.

## 3. Os comandos

Convenções dos exemplos: `X` = nome ou apelido de cliente. Aceita maiúscula, minúscula, sem acento, vírgulas e "e". Hora: `14h`, `14:30`, `14h30`, `às 14`. Dia: `hoje`, `amanhã`, `segunda`...`domingo` (sempre o próximo), `dia 15`, `15/11`, `15/11/2026`. Valor: `900`, `900,00`, `1.200`, `1,5 mil`, `R$ 900`.

### 3.1 Cadastrar cliente

**Sintaxe:** `cadastrar cliente NOME [, telefone N] [, email E] [, empresa peformake|ellcazo] [, segmento S]`

Exemplos:
- `cadastrar cliente Padaria Bom Pão, tel 81 99999-0000`
- `novo cliente Studio Lu 81999990000 ellcazo`
- `cliente novo Clínica Aurora, contato Dra. Ana 81 98888-1111, email ana@aurora.com`

Variações aceitas: `cadastrar`, `cadastra`, `novo cliente`, `cliente novo`, `criar cliente`. Telefone com ou sem DDD/55/traços (usa `fin_phone_key`). "Contato Fulana" vira contato em `client_contacts`.

**O que o sistema faz:** confere se já existe cliente com nome ou apelido parecido (usa `fin_client_key`, que ignora Ltda/ME). Se existe, **não cria**: "Já existe Padaria Bom Pão (ativo desde 03/2026). Quer abrir a ficha? [link]". Se não existe, mostra o resumo e pede "ok". Ao confirmar, cria o cliente com `is_active = true`, `source = 'whatsapp'` e anota quem cadastrou.

**Tabela/função:** `clients` + `client_contacts`, via `client_create` (a ficha nova do sistema já chama essa função quando existir; a migração 200100 a prepara). Se ela ainda não estiver aplicada, o comando fica desligado, sem inventar caminho paralelo.

**Pede confirmação:** sempre.
**Resposta:** `Cliente criado: Padaria Bom Pão (Peformake). Falta: CPF/CNPJ, serviços. Ficha: /clientes/ID · ref a1b2c3`
**Erros comuns:** sem nome ("cadastrar cliente") → "Faltou o nome. Ex.: cadastrar cliente Padaria Bom Pão, tel 81 99999-0000". Telefone inválido → cadastra sem telefone e avisa "telefone não entendi, complete na ficha".
**Anti-duplicidade:** a trava de nome parecido, mais a chave da mensagem (`wa_message_id`). Se alguém repetir o mesmo comando em até 10 min com mesmo nome, responde "já cadastrado agora há pouco".
**Limite honesto:** só os campos simples. Serviços, valores, contrato, CPF/CNPJ e "quem recebe" ficam para a ficha (pop-up por etapas).

### 3.2 Agendar (captação ou reunião)

**Sintaxe:** `agendar [captação|reunião] X [dia] [hora] [, local L] [, com NOME]`

Exemplos:
- `agendar captação Transpetro sexta 14h`
- `agendar captação Padaria Bom Pão dia 15 9h30, local Boa Viagem, com Vinícius`
- `agendar reunião Studio Lu amanhã 10h`
- `marcar reunião Clínica Aurora 18/11 15h`

Variações: `agendar`, `agenda`, `marcar`, `marca`. Sem a palavra captação/reunião: se o cliente tem serviço de audiovisual ativo e a pessoa é do audiovisual → pergunta "captação ou reunião?" (não adivinha). `gravação`, `filmagem`, `ensaio` valem como captação. Duração padrão: 2 h captação, 1 h reunião, ou `por 3h`.

**O que o sistema faz:**
- **Captação:** cria o projeto no audiovisual (`av_projects`, `kind` de captação, `shoot_at`, `shoot_duration_min`, `location`, `videomaker_id` se "com Fulano"), via `av_project_save`. O Google Agenda, o link de captação do videomaker e o aviso já existentes seguem o fluxo de sempre.
- **Reunião:** `client_meeting_schedule(cliente, data, tipo, pauta)` (a mesma do botão do sistema).
- **Conflito de agenda:** antes de confirmar, olha se o videomaker já tem captação no horário (`av_projects.shoot_at` ± duração) ou se há reunião no mesmo horário. Se tiver: "Atenção: Vinícius já tem captação 14h–16h (Fuctura). Agendar mesmo assim? ok".

**Permissão:** captação: admin, head_marketing, ellcazo, videomaker. Reunião: admin, head_marketing, sdr, closer, traffic_manager.
**Pede confirmação:** sempre.
**Resposta:** `Agendado: captação Transpetro, sex 14/11 14h-16h, Boa Viagem. Videomaker: Vinícius. ref d4e5f6. Errou? Responda "remarcar" ou "cancelar".`
**Erros comuns:** sem dia ou hora → "Faltou quando. Ex.: agendar captação Transpetro sexta 14h". Data no passado → "Essa data já passou. Quis dizer 21/11?". Cliente não achado → lista até 3 parecidos ("Quis dizer: Transpetro, Trans Sul?").
**Anti-duplicidade:** mesmo cliente + mesmo tipo + mesmo horário (±30 min) = "Já existe captação da Transpetro nesse horário" e não cria outra. Mesma mensagem processada uma vez só.
**Limite honesto:** frases soltas ("semana que vem, de manhã, depois do almoço") não são entendidas: pede dia e hora exatos. "Daqui a duas sextas" idem.

### 3.3 Remarcar

**Sintaxe:** `remarcar [captação|reunião] X para [dia] [hora]`

Exemplos: `remarcar captação Transpetro para segunda 9h` · `remarcar Studio Lu para 20/11 15h` · `adiar reunião Clínica Aurora para amanhã 11h`

Variações: `remarcar`, `adiar`, `mudar`, `passar para`. Também funciona **respondendo à mensagem do agendamento** só com `remarcar segunda 9h` (acha pelo `ref`, sem dizer o cliente).

**O que faz:** muda só a data e a hora do compromisso futuro mais próximo daquele cliente (guarda a hora antiga no histórico). Captação: `av_project_save` (com o controle de edição simultânea que ele já tem, `_expected_updated_at`). Reunião: `client_meeting_save`.
**Ambiguidade:** se o cliente tem 2 ou mais compromissos futuros, **lista numerada** ("1) captação sex 14h, 2) reunião ter 10h. Responda o número") e não age sem resposta.
**Pede confirmação:** sim, mostrando "de sex 14h para seg 9h".
**Resposta:** `Remarcado: Transpetro de sex 14h para seg 17/11 9h. ref d4e5f6.`
**Erros comuns:** nada para remarcar → "Não achei compromisso futuro da Transpetro." Captação já feita ou com check-in → recusa: "Essa captação já aconteceu."
**Anti-duplicidade:** se a nova data/hora é igual à atual, responde "já está nesse horário".
**Importante:** remarcar **não avisa o cliente**. A mensagem ao cliente continua sendo ação humana no sistema (regra do projeto).

### 3.4 Cancelar agendamento

**Sintaxe:** `cancelar [captação|reunião] X` (ou respondendo à mensagem do agendamento: `cancelar agendamento`)

Exemplos: `cancelar captação Transpetro` · `cancelar reunião Studio Lu` · `desmarcar Clínica Aurora`

Para não confundir com o "cancela" do Financeiro (que desfaz um lançamento): **a palavra sozinha, "cancela", respondendo a uma mensagem do sistema, age sobre aquela mensagem** (lançamento ou comando pendente). Para cancelar um agendamento é preciso dizer `cancelar agendamento`, `cancelar captação`, `cancelar reunião` ou `desmarcar`.

**O que faz:** captação: marca o projeto como cancelado/volta para "sem data" (não apaga; regra "excluir pede confirmação" do projeto), tira do Google Agenda. Reunião: `client_meeting_cancel`.
**Pede confirmação:** sempre, e **é o único comando que também exige que a pessoa seja quem criou ou um admin/head**.
**Resposta:** `Cancelado: captação Transpetro de sex 14h. O projeto continua na produção como "sem data". ref d4e5f6.`
**Anti-duplicidade/erros:** mesmo padrão do remarcar (lista numerada se houver mais de um).

### 3.5 Lançar venda

**Sintaxe:** `venda X SERVIÇO [variação] [VALOR] [mensal|avulso|único] [x QUANTIDADE]`

Exemplos:
- `venda Padaria Bom Pão gestão de tráfego 1500 mensal`
- `venda Studio Lu reels 4 vídeos 2.400 avulso`
- `venda Clínica Aurora social media`  (sem valor: usa o preço do catálogo)
- `vendi Transpetro captação x2 1800`

Variações: `venda`, `vendi`, `vendemos`, `fechou`, `fechei`. O serviço é procurado no catálogo (`services`, `service_options`) por palavras (`fin_norm`): "tráfego" → Gestão de tráfego. Se a palavra bate com mais de um, lista numerada.

**O que faz:** chama `sale_service_launch`, que já existe e já cuida de variações, quantidade, descontos, empresa (a `crm_sale_unit` decide Ellcazo ou Peformake pelo texto do serviço) e fatura. **A venda entra em "A confirmar"** (o mesmo estado da venda feita no comercial): nenhum link de cobrança sai, nenhuma fatura é paga, o administrador confirma depois no Comercial/Financeiro. Se `mensal`, vira serviço recorrente do cliente (`client_services`) só depois da confirmação do administrador.

**Permissão:** admin, sdr, closer (a mesma da função). **Valor:** quem não é admin **não vê preços do catálogo na resposta**: se omitir o valor, a resposta diz "valor do catálogo" sem número; se digitar o valor, ele é o valor informado e fica registrado "informado por NOME".
**Pede confirmação:** sempre (mostra cliente, serviço, valor, mensal/avulso, empresa).
**Resposta:** `Venda anotada em "A confirmar": Padaria Bom Pão · Gestão de tráfego · R$ 1.500 mensal (Peformake). Um admin confirma no sistema. ref 7a8b9c.` (para não admin, sem o valor se veio do catálogo)
**Erros comuns:** cliente não existe → "Padaria não está cadastrada. Quer cadastrar? Responda 'cadastrar cliente Padaria ...'". Serviço não achado → mostra 3 sugestões. Dois valores na frase ("1500 e 2400") → pergunta qual.
**Anti-duplicidade:** mesmo cliente + mesmo serviço + mesmo valor em 24 h → "Já lançei essa venda hoje às 10h. É outra? Responda 'outra'." (mesmo padrão do `outro` do Financeiro).
**Limite honesto:** desconto, parcelamento, entrada, contrato, data de início e combinação de vários serviços numa frase **não** são entendidos. Vira um comando por serviço; o resto no pop-up do sistema.

### 3.6 Pagou (sugerir baixa)

**Sintaxe:** `pagou X [VALOR] [dia]`

Exemplos: `pagou Padaria Bom Pão 1500` · `pagou transpetro 900 ontem` · `Studio Lu pagou` (sem valor: procura a fatura em aberto mais antiga)

Variações: `pagou`, `pagaram`, `caiu o pix da X`, `recebi da X`. Este comando é diferente do "entrada" do Financeiro (que lança dinheiro recebido): aqui o foco é **achar a fatura**.

**O que faz:** procura em `invoices` as faturas em aberto do cliente (`pendente`/`atrasada`), por valor igual (ou parcial) e proximidade da data. Mostra a candidata: "Fatura de R$ 1.500 vence 10/11 (Padaria Bom Pão). É essa? ok". Ao confirmar, **não baixa**: cria uma sugestão na área **"A conferir"** do Caixa (a mesma que o extrato e o Asaas usam, com "É essa / Não é"). A baixa de verdade é feita por administrador, no sistema, pela `invoice_paid_matched`.
**Permissão:** admin, quem tem `can_finance`, e pessoas marcadas em "Pode sugerir pagamento" (por pessoa).
**Pede confirmação:** sempre.
**Resposta:** `Sugestão registrada em "A conferir": Padaria Bom Pão pagou R$ 1.500 (fatura de 10/11). Falta um admin dar baixa. ref 3c4d5e.`
**Erros:** nenhuma fatura em aberto → "Sem fatura em aberto da Padaria. Quer lançar como entrada avulsa? Responda 'entrada 1500 padaria'". Valor diferente do da fatura → mostra "fatura é 1.500, você disse 900: parcial?" e registra como **parcial sugerido**.
**Anti-duplicidade:** uma sugestão por fatura; repetir o comando só avisa "já sugerido por Italo". Se a fatura já foi baixada pelo Asaas/extrato, responde "já está paga".
**Segurança:** a mensagem **não confirma pagamento**, só aponta. Valores só são mostrados no grupo se o grupo for o do financeiro (admin); em grupo de equipe ampla, responde só "sugestão registrada".

### 3.7 Ajuda

**Sintaxe:** `ajuda` · `ajuda agendar` · `comandos` · `?`

Responde a lista curta dos comandos que **a pessoa que perguntou** pode usar (por permissão) com 1 exemplo cada. `ajuda venda` mostra só aquele comando com 3 exemplos. É o único comando que qualquer pessoa da equipe pode usar sem permissão extra (membro ativo ligado pelo telefone).

### 3.8 Outros comandos úteis e seguros (propostos)

Todos de baixo risco; os de consulta não gravam nada.

| Comando | O que faz | Grava? | Observação |
|---|---|---|---|
| `agenda` / `agenda hoje` / `agenda sexta` / `agenda minha` | Lista captações e reuniões do dia (de `av_projects.shoot_at` e `client_meetings`), 1 linha cada. | Não | O mais usado no dia a dia, resposta direta. |
| `tarefa X: texto [para NOME] [até sexta]` | Cria tarefa (`agent_task_create`), ligada ao cliente, com responsável e prazo. Ex.: `tarefa Transpetro: enviar roteiro para Vinícius até quinta`. | Sim (confirma) | Sem "para", fica para quem pediu. Auto-atribuição por `task_auto_assign` quando existir regra. |
| `status X` | Resumo de uma linha do cliente: ativo/perdido, próximos compromissos, tarefas abertas, "tem fatura em atraso: sim/não". | Não | **Nunca mostra valores** (só admin vê dinheiro). Admin pode usar `status X valores`. |
| `contato X` | Devolve nome e telefone dos contatos do cliente (`client_contacts`). | Não | Só quem já vê o cliente no sistema. |
| `lead NOME telefone [serviço]` | Cria lead no comercial (`crm_deals`, etapa inicial, dono = quem mandou). | Sim (confirma) | Para quem encontra um possível cliente na rua. |
| `nota X: texto` | Anota observação na ficha do cliente (histórico). | Sim (confirma) | Útil depois de reunião. |
| `desfazer` | Desfaz o último comando **seu** nos últimos 10 min (se ainda reversível). | Sim | Só o que a própria pessoa fez. |

Ficam **de fora de propósito** (arriscados): excluir cliente, enviar mensagem ao cliente, emitir cobrança, dar baixa, mudar valor de contrato, mexer em permissões, ligar/desligar automações.

## 4. Como o sistema decide se é comando ou Financeiro

Um **roteador** novo roda dentro do mesmo gatilho que já existe (sem duplicar a leitura de mensagens):

1. Mensagem de grupo ligado, de pessoa da equipe, não enviada pelo próprio número do sistema.
2. Normaliza (`fin_norm`) e olha a **primeira palavra**. Está na lista de comandos? → fila de comandos (`wa_cmd_inbox`).
3. Não está? → fluxo do Financeiro, sem mudança.
4. Respostas "ok", "sim", "não", "cancela", "remarcar ..." **a uma mensagem do sistema** (achada por `stanzaId` ou pelo `ref`) são tratadas como continuação do comando daquela mensagem; o `ref` já funciona assim hoje.

Conflitos de palavra: "pagou" (comando) × "entrada" (financeiro) e "cancela" (financeiro) × "cancelar agendamento" (comando) estão separados pelas regras da seção 3.4 e 3.6. Se houver dúvida, o sistema pergunta em vez de agir.

**Um grupo só ou dois?** Recomendado: **começar no grupo que já existe** (Italo e Vinícius) e, quando funcionar, criar um grupo "Peformake · comandos" para a equipe toda. Motivo: o grupo do financeiro tem valores e só admin deveria ver. Por canal há um interruptor "aceita comandos" e outro "aceita financeiro" (coluna nova em `fin_wa_channels` ou tabela `wa_cmd_channels`).

## 5. Permissões por pessoa e por ação

Duas camadas, **as duas precisam permitir**:

1. **Papel do usuário** (a regra do próprio sistema, já existente): o comando executa a função do banco **como o usuário da pessoa** (via ligação telefone → `staff_members` → usuário), então as funções `has_role`, `can_finance`, `can_see_av_price` valem do mesmo jeito que na tela. O que a pessoa não pode fazer no sistema ela não faz pelo WhatsApp.
2. **Chave por pessoa e por ação** (nova tabela `wa_cmd_people`: pessoa, ação, liga/desliga). Aparece em Configurações → WhatsApp → Comandos, por foto (como Editar equipe), com um interruptor por comando. Nasce tudo desligado, menos `ajuda`.

Sugestão inicial (o Italo ajusta):

| Ação | Papéis que o sistema já aceita | Sugestão de liberar |
|---|---|---|
| ajuda, agenda, status, contato | qualquer membro ativo | todos |
| cadastrar cliente | admin, head_marketing, sdr, closer | Italo, Vinícius |
| agendar/remarcar/cancelar captação | admin, head_marketing, ellcazo, videomaker | Italo, Vinícius, videomakers |
| agendar/remarcar/cancelar reunião | admin, head_marketing, sdr, closer, traffic_manager | quem atende cliente |
| venda | admin, sdr, closer | Italo, comerciais |
| pagou | admin, can_finance | só Italo (e quem ele indicar) |
| tarefa, nota, lead | membros da equipe | todos |

Cancelar e remarcar: só quem criou o compromisso, ou admin/head.
Valores: só admin vê números na resposta; os outros recebem a resposta sem dinheiro.

## 6. Anti-duplicidade (resumo)

- **Mesma mensagem:** `wa_message_id` único (igual ao `fin_inbox`).
- **Mesmo comando repetido por engano:** impressão digital por tipo (cliente + ação + data/hora ou valor) numa janela curta; responde "já feito às HH:MM".
- **Respostas "ok" duplas:** o comando muda de estado (`pendente` → `feito`) com trava de linha (`for update`); o segundo "ok" recebe "já está feito".
- **Cliente:** nome parecido bloqueia cadastro em dobro.
- **Agenda:** mesmo cliente/horário não cria dois compromissos.
- **Venda e pagou:** janela de 24 h; uma sugestão por fatura.

## 7. Como nada vai para cliente

- Nenhuma função de envio ao cliente é chamada por comando: sem `billing-gateway` de cobrança, sem e-mail de portal, sem WhatsApp para número de cliente, sem convite de agenda externo.
- O comando só escreve nas tabelas internas e responde **no grupo da equipe** (chave `reply_enabled`).
- O número do cliente **nunca** vira destino: respostas só vão ao `chat_jid` do canal cadastrado.
- Automações que já existem e que podem mexer com cliente (lembretes, cobrança automática, "arte pronta") continuam do jeito que estão e com as chaves que já têm; comando não as liga.
- Em ações com efeito indireto (ex.: remarcar captação que dispara aviso ao cliente em alguma automação futura), a confirmação mostra "este aviso sai para o cliente? não" e a regra do projeto prevalece: envio ao cliente sempre confirmado por humano.

## 8. Limites honestos (o que regras não entendem)

Sem IA, o leitor é uma lista de palavras e padrões. Ele **não** entende:
- frases livres ou longas ("fecha com a Padaria a gestão por 1500 e mais uma arte, começando mês que vem");
- datas vagas ("semana que vem", "depois do feriado", "no fim do mês") e horas vagas ("de tarde");
- nomes de cliente muito diferentes do cadastrado (erro de digitação forte, nome em áudio mal transcrito). Apelidos resolvem muito: vale cadastrar os principais em `clients.aliases`;
- vários comandos numa mensagem só (um por mensagem);
- áudio: só passa se a transcrição estiver ligada (TRANSCRIBE_API_KEY). Na primeira fase, comando é **só texto**; áudio vira texto e entra pelo mesmo leitor depois;
- correções por conversa ("não, era sexta") sem responder à mensagem do sistema.

Quando não entende, o sistema **responde o que faltou e dá o exemplo**, nunca grava errado em silêncio. Uma segunda fase opcional (fora do escopo deste estudo, com custo) poderia usar IA leve só para os casos "não entendi", sempre com confirmação. Não está proposta agora.

Mensagem padrão de "não entendi":
`Não entendi. Tente assim: agendar captação Transpetro sexta 14h. Digite "ajuda" para ver todos.`

## 9. Chaves desligadas (`automation_catalog`) e tabelas novas

Todas nascem **desligadas** e entram em Configurações → Automações, módulo "WhatsApp" (nova linha de módulo ou dentro de `financeiro`, a decidir):

| key | O que liga | Risco |
|---|---|---|
| `wa_cmd_leitura` | Chave geral: ler comandos nos canais que aceitam | baixo |
| `wa_cmd_resposta` | Responder no grupo (usa também `reply_enabled`) | baixo |
| `wa_cmd_cliente` | cadastrar cliente | baixo |
| `wa_cmd_agenda` | agendar, remarcar, cancelar agendamento | médio (mexe na agenda) |
| `wa_cmd_venda` | venda (entra só em "A confirmar") | médio |
| `wa_cmd_pagou` | sugerir baixa | médio (financeiro) |
| `wa_cmd_consulta` | ajuda, agenda, status, contato | baixo |
| `wa_cmd_extras` | tarefa, nota, lead | baixo |

Tabelas novas (todas com RLS só admin lê/edita, como as do Financeiro): `wa_cmd_settings` (chaves), `wa_cmd_people` (pessoa × ação), `wa_cmd_inbox` (uma linha por mensagem: texto, comando, dados lidos, estado `pendente|feito|expirou|cancelado|erro`, `ref`, quem, resultado, ligação com o registro criado). Funções: `wa_cmd_route` (roteador), `wa_cmd_parse_*` (um leitor por comando, testável com `select` sem enviar nada), `wa_cmd_run` (executa depois do "ok"), `wa_cmd_expire` (limpa pendentes vencidos).

Tudo que for criado ou mudado precisa seguir a regra "mudou um lugar, ajuste todos": catálogo de automações, `docs/rotina-melhoria-continua.md`, a tela Configurações → WhatsApp e o guia fixado no grupo.

## 10. Fases de construção

Antes de tudo: **aplicar e testar o Financeiro pelo WhatsApp** (migrações 190300 em diante) e ter o número no grupo, a chave do Wasender e os telefones na Equipe. Sem isso o motor não roda.

- **Fase 0 (base):** `wa_cmd_inbox`, roteador dentro do gatilho existente, `ajuda`, resposta no grupo, fluxo "responder ok / cancela" e expiração. Tela Configurações → WhatsApp → Comandos (chaves e pessoas). Testes automáticos dos leitores (como `fin_wa_parse`). Sem gravar nada além da própria caixa.
- **Fase 1 (baixo risco):** `agenda`, `status`, `contato` (só leitura), `cadastrar cliente`, `tarefa`, `nota`.
- **Fase 2 (agenda):** `agendar`, `remarcar`, `cancelar agendamento`, com conflito de horário e lista numerada.
- **Fase 3 (comercial e dinheiro):** `venda` (A confirmar), `pagou` (sugestão no A conferir), `lead`, `desfazer`.
- **Fase 4:** áudio entrando pelo mesmo leitor, grupo da equipe toda, ajuste de apelidos a partir dos "não entendi" mais frequentes (lista na tela).

Cada fase só é ligada depois de usar 1 semana em teste por Italo e Vinícius, com as chaves ligadas uma a uma.

## 11. Decisões do Italo

1. Grupo: começar no que já existe (Italo e Vinícius) ou criar logo um grupo da equipe? Recomendado: começar no atual.
2. Todo comando que grava pede "ok"? Recomendado: sim (pode afrouxar `cadastrar cliente` e `tarefa` depois).
3. Quem pode `pagou`: só você? Recomendado: sim.
4. Venda: o vendedor vê o valor do catálogo na resposta? Recomendado: não.
5. Quais comandos extras entram (agenda, status, tarefa, nota, lead)? Recomendado: agenda e status primeiro.
6. Remarcar/cancelar: só quem criou ou admin? Recomendado: sim.
7. Guia fixado no grupo: ver `GUIA-COMANDOS-WHATSAPP.md` e `.pdf` (exemplos prontos; vale só depois que cada comando for ligado).
