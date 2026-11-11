# Estudo: Ellcazo como espaço próprio dentro do sistema (11/11/2026)

Só estudo, nada construído. Ideia do Italo (10/11): a Peformake (admin) vê tudo; quem é da Ellcazo entra e vê **só o que é da Ellcazo**. O item **Ellcazo** do menu abre normal, ou, com uma setinha ↗, abre uma guia nova só da Ellcazo, onde as abas viram o menu lateral. Quem é só da Ellcazo já entra direto nessa área.

Conclusão curta: **é viável e tem pouco conflito**, porque a base já existe (papel `ellcazo`, `unit` em quase todas as tabelas de dinheiro, `can_finance(unit)`). O trabalho de verdade está em três pontos: **cliente não tem empresa** (hoje é deduzida), **negócio do comercial não tem empresa** (hoje é adivinhada pelo texto) e **o filtro precisa estar no banco, não só na tela**.

## 1. O que já existe hoje (conferido no código e no banco, só leitura)

**Papéis** (`app_role`): admin, head_marketing, traffic_manager, social_media, designer, videomaker, editor, sdr, closer, **ellcazo**, parceiro.

**Funções que já separam as empresas:**
- `can_finance(_unit)`: `peformake` exige a área financeira da Peformake; `ellcazo` aceita admin **ou** o papel `ellcazo`. Já protege `fin_entries` e `invoices` (política de leitura `can_finance(unit)`).
- `can_see_av_price()`: admin ou ellcazo. Protege `av_quotes` (orçamentos).
- `can_access_av()`: protege `av_projects` e `photo_galleries`.
- `crm_sale_unit(texto)`: decide Ellcazo × Peformake **pela palavra** (foto, vídeo, captação, filmagem, drone, edição, reels...). É a "adivinhação" que o Italo quer trocar por um campo de verdade.

**Tabelas com `unit` (empresa) hoje:** `company_profiles`, `delivery_credits`, `fin_categories`, `fin_entries`, `fin_recurring`, `fin_rules`, `invoice_items`, `invoices`, `member_pay`, `service_jobs`, `services`.

**Tabelas SEM empresa:** `clients`, `client_contacts`, `client_services`, `client_meetings`, `crm_deals`, `av_projects`, `av_quotes`, `photo_galleries`, notificações, tarefas. Quase tudo de audiovisual é Ellcazo por natureza, mas isso **não está gravado em lugar nenhum**.

**Rotas hoje** (`src/App.tsx`): Financeiro (`/financeiro`, `/financeiro/cobranca`, `/financeiro/contratos`, `/financeiro/whatsapp`) já aceita `['admin','ellcazo']`; Audiovisual (`/audiovisual/*`, `RequireRole AV_ROLES`); Clientes (`TRAFFIC_ROLES`, ou seja, hoje quem é só Ellcazo **não vê clientes**); Comercial; Configurações (`SettingsLayout`).

**Interface:** `AppShell` (menu por papel via `menuForRoles` e abas via `SectionTabs`), `EllcazoMark` (marca visual), `MovedTo` para rotas antigas.

**Já desenhado nas migrações pendentes do Financeiro** (20261110200200, "quem recebe"): `clients.billing_receiver` (peformake/ellcazo), `invoices.gateway_account`, `invoice_receiver(fatura)`, `interco_transfers` (repasse entre empresas, só admin lê), `billing_settings.ellcazo_gateway` (manual/asaas). Receita fica com quem fez o serviço; cobrança junta só da mesma empresa (decisão de 10/11).

## 2. O que o Italo quer ver (regras de visão)

| Área | Quem é da Ellcazo vê | Quem é da Peformake (admin) vê |
|---|---|---|
| Clientes | Só clientes com serviço de audiovisual. Ficha enxuta: dados, contatos, projetos, fotos, faturas **da Ellcazo**. **Sem** serviços, valores, contrato, tráfego e metas da Peformake. | Todos, com tudo. |
| Comercial | Só leads e vendas da Ellcazo. | Tudo, com filtro por empresa. |
| Caixa e Cobrança | Só os da Ellcazo. **Sem Contratos.** | As duas empresas (já é assim). |
| Agenda, produção, orçamentos, fotos | Tudo do audiovisual. | Tudo. |
| Configurações gerais | Nada (só "minha conta"). | Tudo. |
| Equipe, automações, integrações | Nada. | Tudo. |

Nota: um cliente pode ter serviço das duas empresas (ex.: Transpetro com tráfego e captação). O usuário da Ellcazo vê o cliente, **mas só a parte da Ellcazo** (projetos, faturas e serviços de audiovisual).

## 3. O menu: item Ellcazo e guia própria

- **Item "Ellcazo" no menu lateral** (`menuForRoles`): abre `/ellcazo` normal, dentro do sistema, com as abas no topo (`SectionTabs`), como outros módulos. Para admin e para quem tem papel `ellcazo`.
- **Setinha ↗** no mesmo item: abre `/ellcazo` em **guia nova** (`target="_blank"`) já no **modo espaço Ellcazo**: sem o menu da Peformake, com um **menu lateral próprio** cujos itens são as abas (Início, Clientes, Comercial, Caixa, Cobrança, Agenda, Produção, Orçamentos, Fotos, Equipe da Ellcazo se houver, Minha conta). No celular, vira a barra de baixo, como o `AppShell` já faz.
- **Usuário só-Ellcazo** (papel `ellcazo` sem `admin`/outros): ao entrar, vai direto para `/ellcazo` no modo espaço, sem o item Ellcazo e sem a setinha (já está lá). Sem acesso às rotas da Peformake (some do menu **e** a rota barra, **e** o banco barra).
- **Quem é das duas** (ex.: admin ou alguém com papel Peformake + `ellcazo`): vê o item Ellcazo normal e a setinha.
- **Marca:** `EllcazoMark` no topo do espaço; cores e logo próprios, sem confundir com a Peformake (nunca "agência", regra de negócio vale para a Peformake; a Ellcazo é **produtora**).

## 4. Rotas e componentes a criar

Rotas novas, todas com `/ellcazo` na frente e **uma só implementação de tela** (as telas atuais são reaproveitadas com um filtro de empresa, não duplicadas):

| Rota | Mostra | Reaproveita |
|---|---|---|
| `/ellcazo` | Início do espaço: captações da semana, projetos atrasados, a receber, orçamentos abertos | `AvHome` + cartões novos |
| `/ellcazo/clientes`, `/ellcazo/clientes/:id` | Clientes com audiovisual; ficha enxuta | `ClientsPage`, `ClientDetailPage` com `espaco="ellcazo"` |
| `/ellcazo/comercial` | Leads e vendas da Ellcazo | páginas do Comercial com filtro |
| `/ellcazo/caixa`, `/ellcazo/cobranca` | Caixa e Cobrança só da Ellcazo (sem aba Contratos) | `FinancePage`, `BillingPage` com `unit="ellcazo"` fixo |
| `/ellcazo/agenda`, `/ellcazo/producao`, `/ellcazo/projeto/:id` | Agenda de captações, quadro, projeto | `AvAgenda`, `AvBoard`, `AvProjectPage` |
| `/ellcazo/orcamentos`, `/ellcazo/orcamentos/:id` | Orçamentos | `AvQuotesPage`, `AvQuoteEditor` |
| `/ellcazo/fotos`, `/ellcazo/fotos/:id` | Curadoria e galerias | `AvPhotosPage`, `AvGalleryPage` |
| `/ellcazo/conta`, `/ellcazo/notificacoes` | Conta e avisos do espaço | já existem |

**Rotas atuais ganham `MovedTo`** (regra do projeto) para o usuário só-Ellcazo que abrir um link antigo: `/audiovisual/*` → `/ellcazo/*`, `/financeiro` → `/ellcazo/caixa` (só para o papel `ellcazo`; admin continua nas rotas atuais). Nada quebra.

**Componentes de layout novos** (`src/components/layout`):
1. `EllcazoShell`: casca do espaço (menu lateral próprio, barra de baixo no celular, marca). Usa o mesmo `AppShell` por dentro, com `menu` e `base` trocados, para não manter duas cascas.
2. `SpaceProvider` / `useEspaco()`: diz em que espaço a tela está (`peformake` | `ellcazo`) e quais caminhos usar. Todas as telas reaproveitadas leem dele em vez de fixar `/audiovisual/...`.
3. `EllcazoMenu`: itens do espaço e a regra de quem vê a setinha.
4. `RequireSpace`: guarda de rota (`admin` ou `ellcazo`), com redirecionamento do só-Ellcazo.
5. `menuForRoles` (já existe): ganha o item Ellcazo com `externalTo` para a setinha.

O link `?mes=` e as abas atuais (`SectionTabs`) seguem funcionando dentro do espaço.

## 5. Filtro no BANCO (obrigatório): por tabela

A tela esconde, mas **quem manda é o banco**: se só a tela filtrar, qualquer pessoa da Ellcazo com o token consegue ler tudo pela API. Hoje as políticas são por "pode acessar tráfego/comercial/av". Proposta: uma função central e políticas por empresa.

**Peça central (nova):** `view_client_units(cliente) → text[]` (empresas que atendem aquele cliente), derivada de: serviço ativo em `client_services` com `services.is_audiovisual` (ou `services.unit`), projeto em `av_projects`, orçamento em `av_quotes`, faturas com `unit`, e uma **marca manual** `clients.units` para casos fora do padrão. E `can_see_client(cliente)`: admin e papéis da Peformake veem tudo; o papel `ellcazo` vê se `'ellcazo' = any(units)`.

| Tabela | Hoje | Mudança proposta |
|---|---|---|
| `clients` | `can_access_commercial()` ou `can_access_traffic()` | **Não dá para esconder colunas por RLS.** Criar visão `clients_ellcazo` (só colunas seguras: nome, contato, segmento, logo, instagram, site, aliases; sem NPS, motivo de perda, desconto, parceiro, canal, billing) e política nova de leitura para `ellcazo` **somente via essa visão** (sem acesso à tabela base). |
| `client_contacts` | por papel | Política: `ellcazo` vê se `can_see_client`. Esconder `gets_billing`/`gets_contract` não é necessário. |
| `client_services` | `can_access_traffic()` | Para `ellcazo`: só linhas cujo `service` é de audiovisual (`is_audiovisual`/`unit = 'ellcazo'`). Nada de preço da Peformake. |
| `services`, `service_options` | catálogo geral | `ellcazo` lê só o catálogo da Ellcazo (`unit = 'ellcazo'`). Preços: já só admin/ellcazo para AV (`can_see_av_price`). |
| `crm_deals` | `deal_visible(owner_id)` | **Falta a coluna empresa** (seção 6). Política: `ellcazo` vê só `unit = 'ellcazo'` (e dele mesmo). |
| `invoices`, `invoice_items`, `fin_entries`, `fin_recurring`, `fin_rules`, `fin_categories`, `service_jobs`, `member_pay` | `can_finance(unit)` (e `unit` nas tabelas) | **Já está certo.** Só conferir `member_pay` e `service_jobs` (devem aplicar `can_finance(unit)`). `interco_transfers` (repasse): só admin, como já desenhado. |
| `contracts` (e aceites) | financeiro/admin | Barrar o papel `ellcazo` (sem Contratos). |
| `av_projects`, `photo_galleries`, `av_quotes` | `can_access_av()` / `can_see_av_price()` | Já são da Ellcazo por natureza; o papel `ellcazo` precisa estar em `can_access_av()` (conferir). Para a **Peformake** (social media, designer) que usam audiovisual, nada muda. |
| `client_meetings`, tarefas, notificações | por papel | Para `ellcazo`: só ligadas a clientes que ele vê (`can_see_client`) e às suas. Notificações: já por usuário. |
| Metas, estratégia, tráfego, Bete, Equipe, acessos, automações, integrações | por papel | **Nenhuma política nova**: o papel `ellcazo` simplesmente não está nelas. Conferir uma por uma que `ellcazo` **não** entra por "qualquer autenticado". |
| Funções `security definer` (ex.: relatórios, `fin_wa_*`, `client_*`) | verificam papel | Revisar as que devolvem listas de clientes ou valores sem `can_see_client`/`can_finance`: é aqui que costuma vazar. |
| Storage (arquivos de cliente, `fin-whatsapp`, galerias) | por papel | Só os arquivos de clientes que o usuário vê; `fin-whatsapp` continua só admin (ou financeiro da Ellcazo, se o Italo quiser). |

**Teste obrigatório (autoteste):** criar um usuário de teste com **só** o papel `ellcazo` e conferir, com `select` real e em rollback (como o `selftest_run` do Financeiro): vê clientes de audiovisual e só eles; não lê `contracts`, `client_services` da Peformake, `crm_deals` da Peformake, `interco_transfers`, configurações; lê `invoices` só `unit='ellcazo'`.

## 6. O que falta (peças que não existem hoje)

1. **Empresa no negócio do comercial.** Hoje `crm_deals` não tem empresa e `crm_sale_unit(texto)` adivinha pelo nome do serviço. Proposta: `crm_deals.unit` (`peformake`|`ellcazo`), preenchido pelo serviço escolhido (`services.unit`), editável no pop-up do negócio (um seletor de duas bolinhas), com `crm_sale_unit` virando só **sugestão** para registros antigos. Migração de dados: preencher os existentes com a regra antiga e deixar marcado "sugerido" para o Italo revisar.
2. **Empresa do cliente.** Função `client_units` (derivada) e, se o Italo quiser, um campo manual para forçar (ex.: cliente só de foto avulsa sem serviço cadastrado).
3. **Visão `clients_ellcazo`** e a ficha enxuta no front (esconder abas: Serviços e valores, Contrato, Tráfego, Metas, Inteligência, Retenção).
4. **`services.unit`**: confirmar se a coluna já é "empresa" ou "unidade de medida" (existe `unit` e `delivery_unit` no catálogo); se não for empresa, criar `services.company`.
5. **Papel da Ellcazo mais fino (opcional):** hoje `ellcazo` é um papel só. Se a Ellcazo tiver gente que só filma (videomaker) e gente que cuida do caixa, pode-se manter `videomaker`/`editor` combinados com uma **marca de empresa por usuário** (`staff_members.unit`) em vez de multiplicar papéis. Decisão do Italo.
6. **Bete e avisos por espaço** (seção 8).
7. **Cobranças juntas e "quem recebe"** (seção 7).

## 7. Cobranças juntas e "quem recebe"

Já decidido em 10/11 e desenhado na migração **20261110200200** (ainda não aplicada):
- Cobrança junta **só da mesma empresa**. As 12 cobranças juntas Peformake+Ellcazo (vencem 30/11) são separadas pela 200200; **urgente até 25/11**, senão vão para o Asaas da Peformake no dia 25.
- `clients.billing_receiver`: padrão cada empresa cobra a sua; ou uma recebe tudo e repassa. Receita fica com quem fez o serviço; o repasse vira `interco_transfers` (feito com 1 toque; Pix só com OK do admin).
- Ellcazo cobra por padrão manual/Cora; Asaas da Ellcazo só com o segredo `ASAAS_API_KEY_ELLCAZO`.

**No espaço Ellcazo:**
- Cobrança mostra as faturas **da Ellcazo**, mesmo as que a Peformake recebe, com selo "recebida pela Peformake, a repassar" e o status do repasse (leitura). O **botão de repasse e o Pix ficam só para admin** (`interco_transfers` só admin).
- O campo "Quem recebe" no cliente é **só admin** (muda de onde sai o dinheiro).
- A pessoa da Ellcazo vê o valor das faturas da Ellcazo (já é assim com `can_finance('ellcazo')`), **nunca** das da Peformake do mesmo cliente.
- O pedido de cobrança conjunta deve mostrar a regra de forma simples: "Esta fatura é da Ellcazo; o dinheiro entra na conta da Peformake e será repassado".

## 8. Bete e avisos por espaço

A regra do projeto "tudo é conectado" pede que links e avisos sigam o espaço:
- **Bete** (`features/goals/coach.ts`, `chatNotices.ts`, `GoalsChat.tsx`, `BeteToday`): no espaço Ellcazo, só sugestões do audiovisual e da Ellcazo (captação amanhã, entrega atrasada, orçamento sem resposta, fatura da Ellcazo vencida) e links `/ellcazo/...`. Sem metas, tráfego ou clientes da Peformake.
- **Notificações** (`notify(...)`, `notifications.link`): os links gravados hoje apontam para `/audiovisual/...`, `/financeiro/...`. Duas opções: (a) **recomendada:** o front traduz o link conforme o espaço em que a pessoa está (um tradutor `linkNoEspaco(link, espaco)`), sem mexer nos dados gravados; (b) gravar o link já com `/ellcazo` para destinatário só-Ellcazo. A (a) evita reescrever funções SQL e dados antigos.
- **Quem recebe o aviso:** avisos de dinheiro da Peformake não vão para o papel `ellcazo`; avisos de faturas da Ellcazo vão para quem tem `can_finance('ellcazo')`. Conferir cada `notify(array(select user_id from user_roles where role = 'admin'), ...)` existente: hoje vão só para admin e continuam certos; os novos de audiovisual passam a incluir o papel `ellcazo`.
- **Automações:** a página Configurações → Automações continua só da Peformake. Automações da Ellcazo aparecem lá com selo da empresa (campo `unit` no `automation_catalog`), e **a Ellcazo não liga/desliga nada**.
- **Início:** quem é só Ellcazo vê o Início do espaço, não o `HomePage` geral.

## 9. Riscos de conflito e como evitar

| Risco | Como evitar |
|---|---|
| **Vazamento por API** (tela esconde, banco deixa) | Filtro no banco (seção 5) + teste com usuário só-Ellcazo antes de liberar. |
| **Cliente nas duas empresas** mostra dado da Peformake | Visão `clients_ellcazo` com colunas seguras; `client_services` e faturas filtradas por empresa; ficha enxuta. |
| **Duas implementações de cada tela** divergem com o tempo | Uma tela só, com `useEspaco()`; nada de copiar `FinancePage`/`ClientsPage`. |
| **Link antigo quebra** | `MovedTo` e tradutor de link por espaço; testes de rota. |
| **Conflito de edição entre sessões** (regra do projeto: nunca duas mexendo juntas) | Fazer por fases pequenas, cada uma com commit e diário; um agente por vez nas mesmas pastas (`App.tsx`, `AppShell`, `menu`, `FinancePage`). |
| **Financeiro ainda instável** | Não começar antes das migrações do Financeiro aplicadas e testadas (seção 10). |
| **`crm_sale_unit` por texto erra** | Campo `crm_deals.unit` real; texto vira só sugestão. |
| **Funções `security definer` que ignoram empresa** | Auditoria de todas as funções que listam clientes ou valores; o autoteste cobre. |
| **Papel `ellcazo` já é usado hoje** (ex.: Financeiro, orçamentos) | Não renomear nem remover; só acrescentar políticas. Conferir quem tem o papel hoje antes de ligar. |
| **Hoje o sistema é de teste** | Bom momento para mexer; mas permissões erradas viram problema real no lançamento. Teste de permissão é pré-requisito do domínio próprio. |
| **Vercel: 100 publicações/dia** | Juntar mudanças em lotes por fase. |

## 10. O que depende das migrações pendentes do Financeiro

As seis migrações aguardam o "pode aplicar" do Italo: 190300, 200000, 200100, 200200, 200300, 200400 (diário de 10 e 11/11).

| Item do espaço Ellcazo | Depende de | Observação |
|---|---|---|
| Cobrança da Ellcazo com "quem recebe", repasse e fatura separada | **200200** (billing_receiver, interco_transfers, gateway_account) | Também é a correção urgente de 25/11. |
| Ficha do cliente enxuta, permissões de clientes, `client_create` | **200100** (clientes e permissões) | Base de `can_see_client` e da visão de cliente. |
| Caixa da Ellcazo conferida, "A conferir", parciais | **200000** (correções de dinheiro) | Telas da Ellcazo herdam o comportamento. |
| Autoteste do usuário só-Ellcazo | **200300** (`selftest_run`) | O teste novo entra como cenário em rollback. |
| Catálogo de automações com selo de empresa | **200400** (automações fiéis) | |
| WhatsApp do financeiro por empresa (canal da Ellcazo) | **190300** e anteriores | Canal tem `default_unit`; segue valendo. |

**Pode começar sem esperar:** menu e rotas do espaço, `EllcazoShell`, `useEspaco`, `MovedTo`, Início da Ellcazo, `crm_deals.unit` e a visão de clientes (migração nova, independente). **Não deve ir para o ar antes:** qualquer política de banco nova em `invoices`/`fin_entries`/`clients` (conflita com as migrações pendentes que tocam as mesmas tabelas); aplicar depois delas, em ordem.

## 11. Fases

- **Fase 0 (pré-requisito):** aplicar e testar as seis migrações do Financeiro; conferir quem tem o papel `ellcazo` hoje.
- **Fase 1 (banco, sem mudar tela):** `crm_deals.unit` + preenchimento sugerido; `client_units`/`can_see_client`; visão `clients_ellcazo`; políticas por empresa nas tabelas da seção 5; teste do usuário só-Ellcazo (rollback). Nada muda para quem usa hoje.
- **Fase 2 (casca e rotas):** `EllcazoShell`, `useEspaco`, `RequireSpace`, item Ellcazo + setinha, redirecionamento do só-Ellcazo, `MovedTo`. Páginas do audiovisual já funcionam em `/ellcazo/...`.
- **Fase 3 (clientes e comercial):** ficha enxuta, lista filtrada, comercial com empresa e seletor no negócio.
- **Fase 4 (dinheiro):** Caixa e Cobrança da Ellcazo (sem Contratos), selo de repasse, "quem recebe" só admin.
- **Fase 5 (avisos e Bete):** Bete por espaço, tradutor de links, avisos por destinatário, Início do espaço.
- **Fase 6 (fechamento):** revisão de todas as funções `security definer`, teste final com usuário real da Ellcazo (convite), diário e documentos atualizados.

Cada fase termina com commit, push, entrada no diário e publicação em lote.

## 12. Decisões do Italo

1. Pessoas da Ellcazo têm **valores** das faturas da Ellcazo? (Hoje o papel `ellcazo` já vê; recomendado: sim, só da Ellcazo.)
2. Cliente nas duas empresas: a Ellcazo vê o cliente na ficha enxuta (recomendado) ou só os projetos?
3. Setinha ↗: abrir em guia nova com menu próprio (como descrito) e **lembrar** a escolha do usuário? Recomendado: sim.
4. Empresa do negócio no comercial: seletor de duas opções no negócio, preenchido pelo serviço (recomendado).
5. Quem é "só Ellcazo" hoje? Lista de pessoas e papéis para testar antes de ligar.
6. A Ellcazo vê o **repasse** entre empresas (leitura) ou só a Peformake? Recomendado: leitura, sem ação.
7. Ordem: começar só depois das migrações do Financeiro aplicadas (recomendado), ou adiantar a Fase 1 em paralelo?
