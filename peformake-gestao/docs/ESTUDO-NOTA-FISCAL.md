# Nota fiscal pelo sistema: o que dá para usar (24/11/2026)

Pedido do Italo: a Receita Federal publicou código no GitHub; ver o que serve para emitir nota dos clientes, da Peformake e da Ellcazo.

## O que a Receita publicou

Pela pesquisa feita em 24/11, o que está público são **calculadoras de imposto** (reforma tributária, CBS e IBS, e Simples Nacional).
Não é um emissor de nota. Serve para calcular e conferir imposto, não para emitir.

Uso possível aqui: mostrar no Financeiro a estimativa de imposto de cada fatura. Só vale a pena depois que a emissão existir.

## Como se emite nota de serviço (NFS-e)

A Peformake e a Ellcazo prestam serviço, então a nota é a **NFS-e**.
O caminho oficial é o emissor nacional da NFS-e: o sistema monta o documento (DPS), assina com o **certificado digital A1 do CNPJ** e envia.

O que isso exige:

1. Um certificado A1 de cada CNPJ que vai emitir (Peformake, Ellcazo e cada cliente que quiser emitir por aqui). O certificado é pago e vence todo ano.
2. O município do CNPJ precisa estar no padrão nacional. **A conferir** para a cidade da Peformake e de cada cliente.
3. O certificado é um segredo: fica guardado no Supabase, nunca no código nem em conversa.
4. Dados completos de quem recebe a nota (CPF ou CNPJ e endereço). Hoje 20 das 37 faturas de novembro são de cliente sem CPF/CNPJ.

Existem projetos abertos de terceiros que fazem esse envio e servem de referência de código. Não foram testados aqui.

## Três caminhos

| Caminho | Custo | Trabalho | Risco |
|---|---|---|---|
| A. Emitir direto no emissor nacional, com o A1 guardado no Supabase | só o certificado | alto (assinatura, envio, cancelamento, erros de cada cidade) | médio: depende da cidade estar no padrão nacional |
| B. Usar um serviço de emissão (conferir se o Asaas, que já cobra as faturas, emite NFS-e na nossa cidade e plano) | taxa por nota | baixo: a fatura paga já vira nota | baixo |
| C. Continuar emitindo por fora e só anexar a nota na fatura | zero | mínimo | nenhum, mas não poupa tempo |

## Recomendação

Começar pelo **B para a Peformake e a Ellcazo**: a cobrança já passa pelo Asaas, então a nota sai da mesma fatura, sem certificado novo no sistema.
Antes, conferir o preço por nota e se a cidade é atendida.

Emitir nota **em nome dos clientes** é outro produto: cada cliente teria de entregar o certificado dele. Só faz sentido se virar serviço cobrado.

## O que o Italo precisa decidir

1. Caminho A, B ou C para a Peformake e a Ellcazo.
2. Se emitir nota para clientes entra como serviço.
3. Completar CPF/CNPJ e endereço dos clientes (sem isso nenhuma nota sai).
