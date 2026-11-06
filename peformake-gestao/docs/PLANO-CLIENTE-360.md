# Plano: cliente 360° (dossiê, Drive, cofre, metas, reuniões e indicação)

Estudo de 06/11/2026. Ideias do Italo organizadas em entregas, com o que já existe, o que falta e as decisões.

## 1. Porte da empresa (como funciona)
- **Com CNPJ:** vem da Receita (BrasilAPI). ME e MEI = micro; EPP = pequena; "demais" (fatura acima de R$ 4,8 milhões por ano) = média; com capital social acima de R$ 10 milhões = grande. Publicado em 06/11.
- **Sem CNPJ:** estimado pelo que o cliente paga por mês à Peformake (até R$ 1.500 micro, até R$ 4.000 pequena, até R$ 10.000 média, acima grande). É só uma estimativa e aparece marcada assim.
- Hoje **nenhum cliente ativo tem CNPJ cadastrado**, por isso todos aparecem como "estimado". Basta abrir Editar → Empresa e clicar em Buscar.

## 2. Dossiê do cliente (botão "Contexto completo")
Um botão na ficha abre um **pop-up com abas**, salvo e atualizado sob demanda, para qualquer pessoa da equipe entender o cliente em 2 minutos:

| Aba | Conteúdo | Fonte |
|---|---|---|
| Resumo | Diagrama: negócio → público → oferta → canais → diferencial; porte, nicho, tempo de casa, temperatura | Cadastro + Receita + inteligência |
| Presença digital | Site, Instagram, Google Meu Negócio, links, frequência de posts, seguidores | Busca na web (Firecrawl) |
| Marketing | Posicionamento, mensagens, o que funciona hoje, pontos fracos | Site e redes do cliente |
| Design | Paleta, fontes e estilo do Instagram (o "brand style" já existe no cadastro) | Instagram |
| Tráfego | Anúncios ativos na Biblioteca de Anúncios da Meta; resultados das contas que gerimos | Meta Ad Library + leitura de contas |
| Concorrentes | 3 a 5 concorrentes locais, o que anunciam, avaliações no Google | Busca na web |

Como é feito: uma função no servidor coleta os dados públicos (site, redes, Biblioteca de Anúncios, Google) e organiza em blocos curtos. É a skill de **diagnóstico 360°** que já existe, agora dentro do sistema. Precisa de uma chave do **Firecrawl** (ou outra ferramenta de busca) no Supabase. Atualização: no botão "Atualizar" e automática a cada trimestre (junto do estudo por nicho).

## 3. Google Drive automático
**Situação:** a conta Google da Ellcazo está ligada só com **leitura** do Drive (e agenda). Para criar pastas, ela precisa ser **religada com permissão de escrita** (Configurações → Integrações → Google → Reconectar).

| O quê | Como |
|---|---|
| Clientes que já existem | O sistema procura dentro de "Clientes" a pasta com o nome do cliente e liga sozinho (dá para corrigir na mão). Hoje só 1 de 32 está ligado. |
| Cliente novo | Cria `Clientes/<Nome do cliente>` ao cadastrar. |
| Pastas do mês | Cria `<Cliente>/<AAAA-MM>` **só quando houver serviço no mês** (primeiro lançamento, peça ou captação). |
| Dentro do mês | `Artes`, `Vídeos`, `Fotos`, `Relatórios` (o relatório de tráfego em PDF já cai aqui). |
| Na ficha do cliente | Aba Arquivos mostra os meses e, em cada um, artes, vídeos, fotos e relatórios, com link direto. |

## 4. Acesso privado (senhas)
**Discordo de guardar senhas numa pasta do Drive:** o Drive não foi feito para isso, qualquer pessoa com acesso à pasta vê tudo, não há registro de quem abriu, e um link compartilhado por engano expõe todas as senhas.

**Recomendação:** um **Cofre** dentro do sistema, na ficha do cliente:
- senha guardada criptografada no banco (Supabase Vault);
- só admin, head e social media do cliente veem;
- cada vez que alguém revela uma senha, fica registrado quem e quando;
- a senha aparece só ao clicar em "Mostrar" e some em 30 segundos.

Alternativa pronta: Bitwarden ou 1Password com um cofre por cliente.

## 5. Metas sugeridas e progresso por cliente
Todo dia 25, o sistema sugere as metas do mês seguinte para cada cliente, cruzando:
- **objetivo** do cliente (vender, gerar leads, marca), registrado na estratégia;
- **histórico** de 3 meses (leads, custo por lead, conversas, alcance) das contas de anúncio;
- **média do nicho** entre os seus clientes do mesmo segmento;
- **o que entregamos** (peças, vídeos, campanhas).

Regra: meta = média dos últimos 3 meses + crescimento padrão do nicho (configurável), nunca abaixo do último mês. O head aprova ou ajusta. O progresso aparece na Visão geral do cliente e no portal. As metas de tráfego já existem (`traffic_goals`) e servem de base.

## 6. Reuniões ligadas à estratégia
A tabela `client_meetings` existe, mas está vazia. Proposta: aba **Reuniões** na ficha, com tipos **mensal** (estratégia do mês), **trimestral** (resultado e renovação) e **pontual**. Cada reunião tem:
- pauta montada sozinha com os números do período, as metas e as pendências;
- anotações e **gravação de áudio** (com transcrição, como no WhatsApp);
- decisões que viram tarefas nas áreas.

A estratégia do mês (dia 15) e a do trimestre puxam a última reunião. Sem reunião há mais de 45 dias, o cliente ganha um alerta.

## 7. Indicação direta pelos clientes
Já existe a comissão para **membros** que trazem clientes. Para **clientes** que indicam:

| Ponto | Proposta |
|---|---|
| Como indica | Botão "Indicar um amigo" no **portal** e link próprio do cliente (`/indicacao/<código>`) para mandar no WhatsApp |
| Onde cai | Comercial → Leads, com a origem "Indicação de <cliente>" |
| Benefício (escolher) | (a) desconto na mensalidade enquanto o indicado for cliente; (b) 1 mês grátis de um serviço; (c) crédito em serviço avulso (ex.: uma captação) |
| Quando vale | Só quando o indicado **paga a primeira fatura**; para quem indica, só se estiver **em dia** |
| Controle | Painel de indicações: quem indicou, status, benefício liberado; aparece na ficha e no portal |
| Inteligência | Pedir indicação na hora certa: cliente **quente** e com avaliação boa recebe o convite (não o insatisfeito) |

## 8. Ordem sugerida
1. Drive: ligar as pastas existentes (só leitura já basta) e mostrá-las na ficha.
2. Reuniões com pauta automática e áudio.
3. Cofre de acessos.
4. Indicação pelo portal.
5. Metas sugeridas.
6. Dossiê com busca na web (precisa da chave de busca).

## Decisões do Italo
1. Reconectar o Google da Ellcazo com **escrita no Drive** para criar pastas?
2. Senhas no **Cofre do sistema** (recomendado) ou no Drive?
3. Benefício da indicação: **desconto**, **mês grátis** ou **crédito em serviço**? Quanto?
4. Dossiê: liberar uma chave do **Firecrawl** (ou outra ferramenta de busca) para buscar na web?
5. Meta padrão de crescimento por mês: **5%** sobre a média de 3 meses?

## 9. Melhores clientes (ranking) e o que fazer com ele
Publicado em 06/11: nota de 0 a 100 por cliente com valor, serviços, temperatura, avaliação e notas das entregas, tempo de casa e pagamento em dia. Selos Diamante (80+), Ouro (65+) e Prata (50+); a lista abre com os melhores primeiro.

Ideias para usar (estudo):
| Ação | Para quem | Como |
|---|---|---|
| "Cliente do mês" no portal | Top 1 do mês | Selo no portal + post de agradecimento (se o cliente topar) |
| Benefício do mês | Diamante | Um extra no mês seguinte: 1 criativo, 1 vídeo curto ou relatório estratégico |
| Brinde | Diamante e Ouro no aniversário de contrato | Kit da Peformake ou presente do nicho |
| Prioridade | Diamante | Fila prioritária no Design e Audiovisual e resposta mais rápida |
| Desconto na renovação | Ouro e Diamante que renovam 12 meses | 5% a 10% na renovação, nunca no meio do contrato |
| Pedido de indicação | Diamante e Ouro quentes | Convite de indicação no portal na hora certa |
| Alerta de queda | Quem cai de selo | Aviso ao head: "caiu de Ouro para Prata, ver por quê" |

## 10. Buscar a empresa pelo nome (sem saber o CNPJ)
- **Pelo número** (CNPJ): BrasilAPI (grátis, em uso), ReceitaWS (grátis, 3 por minuto), CNPJ.ws (grátis com limite) e OpenCNPJ.
- **Pelo nome**: não há API oficial grátis. Caminhos:
  1. **Base aberta da Receita** (grátis): a Receita publica todas as empresas do Brasil. Dá para carregar só as de Pernambuco num índice próprio e buscar pelo nome enquanto digita. É o melhor caminho: grátis, rápido e sem limite. Custo: espaço no banco (cerca de 1 a 2 GB só para PE; o plano grátis do Supabase tem 500 MB, então seria preciso o plano pago ou um banco separado).
  2. **Busca na web** (Firecrawl): procura "nome + cidade + CNPJ" e lê o número em sites públicos. Funciona sem banco extra, mas gasta créditos e pode errar em nomes comuns; o sistema sempre mostra a opção para confirmar.
  3. **Serviços pagos** com busca por nome: Casa dos Dados, Econodata, CNPJá (planos mensais).
- **CPF**: não existe consulta pública (LGPD). O sistema só confere se o número é válido; nome e endereço vêm do próprio cliente (portal) ou de serviços pagos com consentimento (ex.: Serpro).
- **Porte para o orçamento**: com o CNPJ, a Receita dá o porte oficial na hora. Para refinar (treinar), cruzar o porte com o que cada cliente aceitou pagar em orçamentos e o faturamento que ele informa no diagnóstico.
