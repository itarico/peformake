# Estudo: ler o WhatsApp do cliente de graça, sem o WaSender, com QR Code próprio

Pedido do Italo, 25/11/2026. Objetivo: o sistema só **lê** as conversas do WhatsApp do cliente (não envia nada) e
identifica quando houve **venda**, separando a que veio do tráfego da venda normal. Só estudo: nada foi construído,
contratado ou instalado. Complementa o `docs/ESTUDO-WHATSAPP-VENDAS-META.md` (19/11).

## Resposta curta

- **Dá para ler de graça, e o caminho certo é o oficial da Meta**: a API do WhatsApp com **coexistência**. O cliente
  continua usando o app WhatsApp Business no celular, e o sistema recebe uma cópia de cada mensagem que chega e que ele
  manda. **Receber mensagem não custa nada**, e o que o cliente manda pelo próprio app também não. Funciona no Brasil.
- **O QR Code próprio (Baileys, Evolution, WPPConnect, whatsapp-web.js) também é grátis no código**, mas precisa de um
  servidor ligado 24 h (a função do Supabase não segura conexão aberta), e **o WhatsApp diz que isso pode banir o número
  do cliente**. É o mesmo risco que o WaSender tem hoje.
- **Recomendação: virar Tech Provider da Meta e usar a coexistência oficial.** Custo da Meta: R$ 0 por mês para só ler.
  Roda no Supabase que já temos (o oficial manda as mensagens por webhook, sem conexão aberta). Manter o WaSender só
  como ponte até a Meta aprovar.

## 1. Opções de código aberto com QR Code

Todas ligam o número como se fosse o "WhatsApp Web" de mais um aparelho. Nenhuma é da Meta.

| Opção | Como funciona | O que precisa | Manutenção |
|---|---|---|---|
| **Baileys** | Biblioteca que fala direto com o protocolo do WhatsApp Web por WebSocket, sem navegador ([baileys.wiki](https://baileys.wiki/): "não é afiliada ao WhatsApp") | Servidor Node.js ligado o tempo todo | Alta: o WhatsApp muda o protocolo e a biblioteca precisa ser atualizada |
| **Evolution API** | API pronta (REST) em cima do Baileys; também tem modo Cloud API oficial ([theautomate.ai](https://theautomate.ai/blog/whatsapp-web-api/)) | Docker numa VPS; cerca de 1 GB de memória para começar ([impreza.host](https://impreza.host/servers/evolution-api-whatsapp-hosting/)), 4 GB se for crescer ([streethosting](https://streethosting.com.br/en/guides/vps/host-evolution-api-whatsapp-vps)) | Média: atualizar a imagem, banco, backup, reconectar sessão que cai |
| **WPPConnect** | Projeto brasileiro; usa um fork do Baileys ([GitHub](https://github.com/wppconnect-team/baileys)) | Servidor Node.js | Alta, como o Baileys |
| **whatsapp-web.js** | Abre o WhatsApp Web de verdade num navegador controlado (Puppeteer) | Mais memória: um navegador por número | Alta; o próprio projeto avisa que o número pode ser bloqueado ([theautomate.ai](https://theautomate.ai/blog/whatsapp-web-api/)) |

**Onde hospedar.** A edge function do Supabase não serve: ela roda por pedido e desliga, e essas bibliotecas precisam de
uma conexão aberta o tempo todo. Precisaria de uma VPS (Hostinger, Contabo, Hetzner etc.). Referência de preço: VPS da
Hostinger para Evolution a partir de € 5,49 a € 7,79/mês em contrato de 24 meses
([Hostinger](https://www.hostinger.com/pt/applications/evolution-api)); guia de 2026 cita VPS de US$ 10/mês
([StriqTech](https://striqtech.com/blog/evolution-api-whatsapp-self-hosted)). Quantos números cabem por servidor não
tem número oficial: **é estimativa**, e precisa de teste antes de prometer para 50 clientes.

**Custo escondido**: alguém da equipe vira dono do servidor (queda de sessão, atualização, backup, segurança). Cada
cliente desconectado é venda que o sistema deixa de ver.

## 2. Risco de banimento (conexão não oficial)

A Central de Ajuda do WhatsApp diz que usar app não oficial ou ligar a conta a versões não oficiais **quebra os Termos**
e a conta **pode ser banida temporária ou permanentemente**, ou ter restrições, inclusive a de ligar aparelhos
([FAQ: apps não oficiais](https://faq.whatsapp.com/1217634902127718)). A mensagem "Temporariamente banido" pode
significar uso de versão não oficial ou coleta de dados, o tal "scraping" ([FAQ](https://faq.whatsapp.com/1848531392146538)).
Só o WhatsApp bane ou desbane, e ele não dá suporte a app não oficial ([FAQ](https://faq.whatsapp.com/465883178708358)).

**Ler sem enviar diminui a chance**, porque o que mais derruba número é o envio em massa. Mas não zera: a conexão em si é
não autorizada, e nenhuma configuração das bibliotecas muda isso ([theautomate.ai](https://theautomate.ai/blog/whatsapp-web-api/)).
Não existe número público de quantos números caem só lendo; relatos de usuário existem, mas não são fonte confiável.

**Se o número cair**: o cliente fica sem o WhatsApp da empresa (atendimento e vendas param) até o WhatsApp liberar, se
liberar. No banimento permanente, ele perde o número no WhatsApp. **O prejuízo é do cliente, e a culpa recai sobre a
Peformake.** Hoje o WaSender tem o mesmo risco, porque também é conexão não oficial.

## 3. Rota oficial: API com coexistência

**O que é.** O cliente conecta o número que já usa no WhatsApp Business app à API oficial, e continua usando o app no
celular. A Meta chama de "Onboard WhatsApp Business app users"
([documentação](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users)).

**Lê as mensagens?** Sim, as duas pontas:
- Mensagem que o cliente do cliente manda: chega pelo webhook `messages`.
- Mensagem que o cliente responde pelo app ou por um aparelho ligado: chega pelo webhook `smb_message_echoes`
  ([referência](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/smb_message_echoes)).
- Na conexão, dá para puxar **os últimos 6 meses** de conversas individuais e os contatos (mesma documentação).

**O que não passa** (mesma documentação): grupos não são sincronizados; mensagem temporária, de visualização única e
localização em tempo real ficam desligadas nas conversas 1:1; listas de transmissão viram só leitura. O WhatsApp para
Windows sai como aparelho ligado. **Se o celular principal ficar uns 14 dias sem abrir o app, a conexão cai.** É
preciso app Business versão 2.24.17 ou mais nova.

**Brasil**: funciona com número brasileiro ([EasyCoexistence](https://easycoexistence.com/docs/whatsapp-coexistence-brazil);
[Messaging Me](https://messagingme.app/en/whatsapp-coexistence/) lista o Brasil entre os países liberados). Não achei
página da Meta com a lista de países; confirmar no primeiro cliente.

**Quanto custa só receber: R$ 0.** A Meta cobra por mensagem **entregue pela empresa**, e mensagem que o cliente recebe
não é cobrada ([SendPulse, com base na documentação da Meta](https://sendpulse.com/blog/whatsapp-service-message-pricing)).
Desde 1/10/2026 a Meta voltou a cobrar resposta de atendimento enviada **pela API**: 1.000 grátis por mês por número,
depois R$ 0,035 cada no Brasil ([Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages);
[valores em reais](https://easycoexistence.com/docs/whatsapp-coexistence-brazil)). Isso **não nos atinge**: o sistema só
lê, e o cliente responde pelo app, que é grátis (a mudança de preço não vale para o app Business, segundo a SendPulse).

**Quem pode conectar.** A documentação exige ser **Solution Partner ou Tech Provider**. Para virar Tech Provider
([passo a passo](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers)):
- verificação do negócio na Meta;
- App Review das permissões `whatsapp_business_messaging` e `whatsapp_business_management` (avançadas), com vídeo do
  app funcionando, ícone, política de privacidade e categoria;
- a página não cita taxa da Meta para ser Tech Provider;
- cada cliente conectado precisa ter cartão na conta dele do WhatsApp Business Platform (a cobrança, quando houver, é dele).

É **o mesmo caminho** que já está na fila do Instagram (App Review e verificação do negócio): dá para pedir as
permissões do WhatsApp no mesmo envio.

**Alternativa sem virar Tech Provider**: usar um parceiro oficial que já faz coexistência. Exemplo: 360dialog, € 49 por
número por mês no plano Regular ([Invent](https://www.useinvent.com/blog/360dialog-alternatives-whatsapp-api);
[360dialog](https://360dialog.com/pricing)). Para 10 clientes, € 490/mês; caro para só ler.

**Anúncio de clique para o WhatsApp.** Quando a conversa nasce de um anúncio, a primeira mensagem chega com o objeto
`referral`, trazendo `source_id` (o anúncio), `ctwa_clid` (o clique) e o título do anúncio
([referência de mensagens](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/text.md),
citada no estudo de 19/11). Com isso o sistema sabe **de qual anúncio e campanha veio a conversa** e, se virar venda,
pode avisar a Meta pela Conversions API para mensagens (evento `Purchase` com valor), o que melhora a otimização das
campanhas. Na conexão não oficial, o dado vem num campo interno (`externalAdReply`) sem garantia, e a devolução para a
Meta só funciona por um atalho não documentado.

## 4. LGPD

O sistema vai ler conversas de pessoas que nunca falaram com a Peformake (os clientes do nosso cliente).
- **Papéis**: o cliente é o **controlador** (decide por que os dados são tratados); a Peformake é **operadora** (trata em
  nome dele e segue as instruções dele) ([LGPD, art. 5º VI e VII, e art. 39](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)).
  Na rota oficial, a Meta também entra como operadora, nos [Termos de Tratamento de Dados do WhatsApp Business](https://www.whatsapp.com/legal/business-data-processing-terms?lang=pt).
- **Contrato**: incluir no contrato do cliente uma **cláusula de tratamento de dados** (ou um anexo). Ela diz para que
  servem os dados (medir vendas e o resultado do tráfego), o que é guardado, por quanto tempo, quem acessa, a segurança e
  a exclusão ao fim do contrato. Controlador e operador precisam manter registro das operações (art. 37), e o operador
  responde por dano se agir fora da lei ou das instruções (art. 42).
- **Base legal**: para o cliente, provavelmente **legítimo interesse** ou execução de contrato com o próprio comprador
  (art. 7º). Legítimo interesse exige usar só o necessário e manter registro (art. 10 e art. 37). Quem decide é o
  cliente, como controlador; vale validar com advogado.
- **Aviso ao comprador**: o cliente deve dizer na política de privacidade dele (e, se quiser, na mensagem automática do
  WhatsApp) que as conversas podem ser analisadas por parceiros para atendimento e medição.
- **Dado sensível**: clínica, saúde e similares (ex.: Acácia) recebem conversa com dado de saúde, que é sensível e tem
  regras mais duras (art. 11). Para esses clientes, guardar só o sinal de venda, não o texto.
- **Na prática do sistema**: guardar o mínimo (origem, data, valor e "venda sim ou não"), apagar o texto bruto depois de
  analisado (por exemplo, em 30 dias), acesso só para quem cuida do cliente e registro de quem viu o quê.

## 5. Como achar a venda na conversa e ligar ao que já existe

O app já tem a base: `wa_leads` (conversas do WhatsApp do cliente) e `client_sales` (vendas), na aba **Tráfego →
Vendas** (`SalesPage.tsx`, com QR do cliente, pixel e "Marcar venda").

Proposta, de forma simples e sem IA paga (a IA roda no agente do Claude, como já é regra):
1. **Origem**: a primeira mensagem guarda se veio de anúncio (`source_id`, `ctwa_clid`, casando com a campanha que já
   lemos da Meta) ou se é orgânica.
2. **Sinais de venda** em cada mensagem, que marcam a conversa como "venda provável":
   - imagem ou PDF de **comprovante de PIX** (o nome do arquivo ou o texto "comprovante", "pix", "transferência");
   - palavras de fechamento ("fechado", "pode mandar", "paguei", "fiz o pix", "quero esse");
   - **valor** escrito ("R$ 350", "350,00") perto dessas palavras;
   - do lado do cliente (mensagem ecoada do app): "pagamento confirmado", "pedido feito", envio de chave PIX ou link de pagamento.
3. **Confirmação humana**: a venda provável aparece em Tráfego → Vendas com o valor sugerido. Um toque confirma e grava
   em `client_sales`, com a origem (tráfego ou normal).
4. **Devolver para a Meta** (só na rota oficial): a venda confirmada vira evento `Purchase` com valor.
5. **Leitura do comprovante** (valor da imagem): o agente do Claude pode ler depois, em lote. Fica para uma segunda fase.

## 6. Custo por mês

Dólar a R$ 5,15 (taxa implícita na tabela da EasyCoexistence). Preço de VPS e capacidade por número são **estimativas**.

| Caminho | 10 clientes | 50 clientes | Risco de ban | Venda volta para a Meta |
|---|---|---|---|---|
| **WaSender (hoje)** | US$ 45 (plano Business, 10 sessões) ≈ R$ 232 | Sem plano de 50 na tabela; 5 planos Business seriam US$ 225 ≈ R$ 1.160 (conferir plano maior) | Sim | Só por atalho |
| **Conexão própria (Evolution/Baileys)** | VPS de ~US$ 10 ≈ R$ 52 + horas de manutenção | VPS maior ou duas, ~US$ 20–40 ≈ R$ 100–210 + manutenção (estimativa) | Sim, igual | Só por atalho |
| **Parceiro oficial (360dialog)** | € 490 | € 2.450 | Não | Sim |
| **Oficial próprio (Tech Provider + coexistência)** | **R$ 0 de Meta** (só leitura) + Supabase que já pagamos | **R$ 0 de Meta** + Supabase | Não | Sim |

Preço do WaSender: [tabela](https://wasenderapi.com/pricing), conferida no estudo de 19/11.

## Recomendação

1. **Agora**: continuar com o WaSender só nos clientes-piloto (o que já está pronto), sabendo do risco de ban. **Não**
   montar servidor próprio com Baileys ou Evolution: tem o mesmo risco, dá trabalho de manutenção e não resolve a volta
   da venda para a Meta.
2. **Em paralelo**: pedir na Meta a verificação do negócio e o App Review para **Tech Provider**, com as permissões
   `whatsapp_business_messaging` e `whatsapp_business_management`, no mesmo envio do Instagram.
3. **Quando aprovar**: botão "Conectar WhatsApp" no sistema (fluxo oficial da Meta, o Embedded Signup, no lugar do QR).
   O cliente entra com o Facebook, escolhe o número e continua no app. Webhook numa edge function do Supabase
   (`messages` e `smb_message_echoes`), regra de venda provável e devolução para a Meta. Desligar o WaSender.
4. **Antes de ligar qualquer cliente**: cláusula de tratamento de dados no contrato e aviso na política do cliente.

## Precisa do Italo

- OK para incluir as permissões do WhatsApp (Tech Provider) no pedido de App Review e verificação do negócio da Meta.
- OK para a cláusula de tratamento de dados (LGPD) nos contratos (sugiro revisão de um advogado).
- Escolher 1 cliente-piloto para testar a coexistência quando a Meta aprovar.
