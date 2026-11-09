# Plano: contrato automático por cliente

Objetivo: fechou o cliente, o contrato nasce sozinho, montado com os serviços que ele contratou, e a Peformake acompanha cada contrato do rascunho à renovação num lugar só.

## Atualização 09/11/2026 (pedido do Italo): contrato montado por blocos, sem subir arquivo

"O próprio sistema gera o contrato automaticamente; eu só habilito ou desabilito o que quero, ou preencho os campos com as regras já predefinidas."

**Como fica:**
1. **Biblioteca de blocos** (`contract_clauses`), cada bloco com título, texto e campos `{{...}}`:
   - **Base (sempre ligados):** partes, objeto, valor e pagamento, prazo, rescisão, LGPD, foro.
   - **Por serviço (ligam sozinhos quando o cliente tem o serviço):** Tráfego (verba paga direto às plataformas), Social Mídia, Design (revisões), Audiovisual (gravação, remarcação, uso de imagem), Consultoria, Site, CRM.
   - **Opcionais (chave liga/desliga):** multa e juros, fidelidade com multa de saída, reajuste anual, desconto por pagar antes, uso de imagem do cliente no portfólio, exclusividade.
2. **Campos já preenchidos pelas regras do sistema** (ninguém digita): dados do cliente (CNPJ busca na Receita), serviços, quantidade de entregas por mês e valores (itens da fatura e o passo 2 da Fase 1), dia de cobrança (10/20/30), meses de contrato, multa 2% e juros 1% ao mês (Configurar cobrança), entregas até o dia 25, crédito por erro nosso, aviso prévio de 30 dias, reajuste pelo IPCA no aniversário, verba de anúncios fora do valor.
3. **Uma tela só:** pop-up com a prévia do contrato ao lado e a lista de blocos com chave e os poucos campos editáveis (já com o padrão). Botão Enviar: Assinafy (recorrente) ou aceite no portal (avulso).
4. **Contrato e sistema falam a mesma língua:** o que está no contrato vira regra do Financeiro (vencimento, multa, aviso prévio, reajuste). Mudou serviço ou preço depois de assinado: aditivo gerado sozinho.

**Achados na leitura (09/11):**
- O modelo atual diz "atraso superior a 7 dias permite suspender os serviços", e a decisão de 08/11 é "nunca pausa sozinho, só avisa": o texto tem que mudar.
- Os dados das empresas (Peformake e Ellcazo: CNPJ, endereço, representante) estão vazios em `company_profiles`: sem isso nenhum contrato sai.
- Nenhum contrato foi gerado ainda; o modelo atual tem cerca de 1.700 caracteres, sem cláusula por serviço.

## O que já existe (e fica)

- Assinafy ligado em produção (10 documentos/mês grátis, R$ 1 cada extra). Funções `contract-sign` e `contract-webhook` no ar.
- Tabela `contract_templates` com 2 modelos (marketing recorrente e audiovisual Ellcazo) e `contract_render`, que troca `{{cliente_nome}}`, `{{servicos}}`, `{{valor_mensal}}`, `{{meses}}`, `{{inicio}}` etc.
- `contract_create(cliente, modelo)` gera o rascunho; se falta CPF/CNPJ, fica "aguardando dados" e o cliente preenche pelo portal (`portal_contract_data`).
- Bloco Contrato na ficha do cliente e modelos em Configurações.

## Situação hoje (06/11/2026)

- 32 clientes ativos, **nenhum** com CPF/CNPJ cadastrado. Sem isso nenhum contrato pode ser enviado.
- Contratos cadastrados: 36 MRR, 1 TCV, 10 avulsos.
- 33 serviços no catálogo (Tráfego, Social Mídia, Design, planos de vídeo, eventos, site, CRM...).
- Nenhum contrato gerado ainda.

## Regras fixas

1. Um contrato por cliente **por empresa**: quem tem serviço Peformake e Ellcazo recebe dois (o faturamento já é separado).
2. Recorrente (MRR/TCV) assina pela Assinafy. Avulso usa o aceite eletrônico da proposta (não gasta a cota).
3. Nada sai para o cliente sem um administrador revisar e clicar em Enviar.
4. Mudou serviço ou preço de contrato assinado: gera **aditivo**, não um contrato novo.

## Fases

### Fase 1. Modelos montáveis (base + cláusula por serviço)
- Modelo **base** por empresa (Peformake, Ellcazo): partes, pagamento, prazo, rescisão, LGPD, foro.
- Nova tabela `contract_clauses`: uma cláusula por serviço do catálogo, com escopo, entregas, prazos, número de revisões e regras próprias (ex.: Tráfego: verba de mídia paga direto às plataformas; Audiovisual: gravação, remarcação, direito de uso; Site: hospedagem e manutenção).
- Novas variáveis: `{{escopo_servicos}}` (junta as cláusulas dos serviços ativos), `{{tabela_valores}}` (serviço, quantidade, preço, desconto, total), `{{taxa_implantacao}}`, `{{empresa_contratada}}`.
- Editor em Configurações → Contratos com **pré-visualização usando um cliente real**.

### Fase 2. Gatilho de fechamento
- Quando o cliente é fechado (conversão do lead em `member_lead_convert`, cadastro de cliente novo com serviço recorrente, ou proposta aceita), o sistema cria o rascunho sozinho, separado por empresa.
- Aviso para o admin: "Contrato de X pronto para revisar" (ou "esperando dados do cliente").

### Fase 3. Coleta automática dos dados do cliente
- Faltou CPF/CNPJ, razão social, endereço ou e-mail de cobrança: o cliente recebe pelo WhatsApp o link do portal para preencher.
- Preencheu: o contrato é remontado com os dados e volta para o admin revisar.
- Lembrete automático em 2 e 5 dias se não preencher.

### Fase 4. Revisão e envio
- Tela de revisão com o texto final, os valores e um contador da cota do mês (ex.: "3 de 10 usados").
- Editar antes de enviar, se precisar. Enviar: Assinafy manda o link para o cliente e para o Italo.

### Fase 5. Central de Contratos
- Lista de todos os clientes com a situação: sem contrato, aguardando dados, para revisar, enviado (há quantos dias), assinado, vence em 30 dias, vencido.
- Filtros e números no topo. Lembrete automático de assinatura em 3 e 7 dias.
- PDF assinado guardado na pasta do cliente (`client-files`) e disponível no portal.

### Fase 6. Aditivos e renovação
- Mudança de serviço ou preço em contrato assinado: rascunho de aditivo só com a mudança.
- 30 dias antes do fim: aviso de renovação (a renovação automática já está no texto).

### Fase 7. Ligação com a cobrança
- Contrato assinado: data de início confirmada e primeira cobrança criada no Asaas (depende da chave do Asaas).

## Ordem sugerida

| Entrega | Fases | Resultado |
|---|---|---|
| 1 | 1 + 3 | Modelos por serviço prontos e dados dos clientes sendo coletados |
| 2 | 2 + 4 | Fechou o cliente, o contrato aparece pronto para revisar e enviar |
| 3 | 5 | Controle de todos os contratos num lugar só |
| 4 | 6 + 7 | Aditivos, renovação e cobrança automática |

## Decisões pendentes (Italo)

1. O que conta como "fechou": converter o lead no Comercial, cadastrar cliente novo, ou aceitar a proposta?
2. Texto jurídico das cláusulas por serviço: o Claude redige a partir dos modelos atuais e o Italo (ou advogado) valida?
3. Os 32 clientes ativos sem contrato no sistema: regularizar pela Assinafy (cerca de 4 meses na cota grátis, ou plano Standard de R$ 39,90 com 250/mês) ou por aceite eletrônico no portal (grátis)?
