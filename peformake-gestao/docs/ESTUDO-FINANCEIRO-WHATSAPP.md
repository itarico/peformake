# Estudo: lançamentos do Financeiro pelo WhatsApp (10/11/2026)

Só estudo, nada construído. Pedido do Italo: quem está num grupo do WhatsApp (hoje ele e o Vinícius) lança despesa e entrada por texto, áudio ou foto. O sistema entende sozinho, liga ao cliente ou serviço certo, nunca duplica, e tudo passa por uma revisão antes do fechamento do mês. Tudo configurável, nada fixo no código.
Grupo informado: link de convite `chat.whatsapp.com/LgTKlshaAVj71nK8Pg24FM`.

## 1. O que existe hoje (e por que não serve)

O cartão "Lançar pelo WhatsApp", no fim do Caixa, faz assim:
- **Canal:** só aceita mensagem privada, de números cadastrados um a um.
- **Formato:** só entende um formato fixo (`gasto 89,90 canva`).
- **Registro:** lança direto como pago, sem revisão.
- **Uso:** nunca foi usado (0 números, 0 lançamentos).
- **Áudio:** a transcrição está parada (0 de 387 áudios em 7 dias).

Esse cartão será substituído pela aba nova.

## 2. A aba nova: Financeiro → **Lançamentos WhatsApp**

Só admin configura. São três partes, cada edição num pop-up:

**a) Canais (de onde vem)**
- **+ Adicionar grupo:** cole o link de convite. O sistema acha o grupo, desde que o número da Peformake esteja nele, e mostra nome e foto para confirmar.
- **+ Adicionar número:** lançamento por mensagem privada, opcional.
- Em cada canal: empresa padrão (Peformake, Ellcazo ou "decidir pelo conteúdo"), ligado ou desligado, e o que aceita (despesa, entrada, ou os dois).

**b) Quem pode lançar**
- Por padrão, os membros do grupo que estão cadastrados na Equipe, ligados pelo telefone. Aparecem por foto, como em Editar equipe.
- Pessoa do grupo que não é da equipe: ignorada. Ela aparece em "Número desconhecido tentou lançar", com o botão "Liberar".
- Por pessoa, um limite opcional. Exemplo: acima de R$ 1.000, o lançamento sai marcado como "valor alto".

**c) Revisar** (a lista do dia a dia, ver seção 6)

## 3. O caminho de uma mensagem

```
mensagem no grupo (texto, áudio ou foto)
  → áudio vira texto · foto de comprovante vira texto (valor, data, quem recebeu)
  → leitor rápido por regras (formato simples "gasto 89,90 canva": sem IA, custo zero)
  → se não entendeu: agente leve (Haiku, centavos) lê e devolve
     {tipo, valor, data, fornecedor, descrição, empresa, cliente/serviço, categoria, quem pagou, confiança}
  → checagem de repetido (seção 5)
  → lançamento entra no Caixa marcado "via WhatsApp · a revisar"
  → resposta curta no grupo: "Anotado: despesa R$ 250,00 · combustível · Transpetro (captação de 08/11). Errado? Responda 'corrige' ou 'cancela'."
```

- A resposta no grupo é opcional (configurável) e precisa da chave do Wasender no servidor. É mensagem interna da equipe, nunca para cliente.
- Responder **na mesma mensagem** "corrige 230" ou "cancela" ajusta o lançamento. Não precisa abrir o sistema.

## 4. Atribuição inteligente

Na ordem, o sistema procura a que se refere o gasto:
1. **Cliente citado:** pelo nome ou apelido do cliente. Exemplo: "transpetro" → cliente Transpetro. Cada cliente pode ter apelidos ("TP", "Petro").
2. **Serviço ou projeto daquele cliente perto da data:**
   - captação ou projeto do audiovisual (`av_projects`) no dia ou até 3 dias antes ou depois;
   - serviço avulso (`service_jobs`);
   - entrega do mês.
   O gasto vira **custo daquele serviço**. Isso mostra a margem real do projeto: cobrou R$ 2.000, gastou R$ 250 de combustível e R$ 400 de freela.
3. **Sem cliente** ("comida para o escritório", "canva"): vira **despesa geral** com categoria (alimentação, ferramentas...), sem cliente.
4. **Quem gastou:** sempre fica registrado quem lançou e quem pagou. Se a pessoa disse "paguei do meu bolso", o valor vira **reembolso** para ela no próximo dia 30, junto com o pagamento da equipe.
5. **Empresa:** vem do serviço (projeto do audiovisual = Ellcazo), da palavra "ellcazo", ou do padrão do canal.
6. **Categoria:** pelas regras do Caixa (`fin_rules`). Toda correção feita na revisão vira regra nova, então o sistema aprende.
7. **Entrada ("o cliente X pagou 1.200"):** procura a fatura em aberto do cliente pelo valor. Fica "a revisar" com a fatura sugerida. **Nunca dá baixa sozinho:** quem dá baixa é a revisão ou o extrato/Asaas.

Cada atribuição mostra o motivo ("achei a captação da Transpetro de 08/11") e a confiança. Com confiança baixa, fica sem atribuição e aparece na revisão.

## 5. Nada em dobro (a parte mais importante)

| Situação | O que o sistema faz |
|---|---|
| Mesma mensagem chega duas vezes | Chave única pela mensagem (`wa:<id>`): um lançamento só. |
| 2 ou 3 pessoas lançam o mesmo gasto (grupo, celular, computador) | **Impressão digital:** empresa + tipo + valor igual + data com até 2 dias de diferença + fornecedor parecido. Se já existe lançamento assim, **não cria outro**: junta como "confirmado também por Vinícius". No grupo, responde: "Já tinha sido lançado por Italo às 14h (R$ 89,90 Canva). É outro gasto? Responda 'outro'." |
| Alguém lança no computador algo que já veio pelo WhatsApp | O pop-up de novo lançamento avisa antes de salvar: "Parece o mesmo do WhatsApp de ontem (R$ 250, Transpetro). É o mesmo?" Com os botões **É o mesmo** (não cria) e **É outro** (cria). |
| O extrato do banco é importado | A conciliação, que já existe, passa a casar também com os lançamentos do WhatsApp. O lançamento ganha o selo **"conferido no banco ✓"**, e nenhuma linha nova é criada. |
| Despesa fixa do mês (recorrente) | Casa com a recorrente prevista daquele mês em vez de criar outra. |
| Valor digitado errado e depois corrigido | É o mesmo lançamento, com histórico de quem mudou o quê. |

Resumo: **cada gasto real tem um lançamento só**, e as outras fontes (outra pessoa, computador, extrato) viram **confirmações** dele.

## 6. Revisão antes de fechar o mês

Na aba, **Revisar** mostra uma lista simples, com um cartão por lançamento:
- data e hora, quem lançou, valor, descrição;
- o áudio para ouvir e a foto do comprovante;
- a atribuição (cliente e serviço, ou "despesa geral"), com o motivo;
- a situação no banco: ✓ achado no extrato, ou ✗ ainda não apareceu;
- os botões **Confirmar · Editar · Descartar**.

Para não demorar:
- **"Confirmar todos os conferidos no banco"**: um toque confirma o que bateu com o extrato.
- Filtros: a revisar, valor alto, sem atribuição, possível repetido.
- O **fechamento do mês** (dias 26 a 28, que já existe) avisa: "8 lançamentos do WhatsApp para revisar".
- A Bete avisa uma vez por semana se houver pendentes, sem alarde.

Enquanto está "a revisar", o lançamento **aparece no Caixa e na previsão**, marcado. No Resumo do Financeiro ele conta em "dados a confirmar", e o selo de confiança cai um pouco até a revisão.

## 7. Inteligência extra (cruzando o sistema)

- **Margem por projeto e por cliente:** os gastos atribuídos entram no custo. O Resumo mostra "Transpetro: recebido R$ 2.000, custo R$ 650, sobra 67%".
- **Gasto fora do padrão:** "Combustível este mês 40% acima da média".
- **Fornecedor frequente:** sugere virar despesa fixa ("Canva todo mês: cadastrar como recorrente?").
- **No fim do mês:** o que foi lançado e não apareceu no extrato (pode ter sido pago em dinheiro ou noutra conta), e o que está no extrato e ninguém lançou.
- **Custo de serviço avulso:** liga ao avulso do membro (`service_jobs`) para a sobra real.

## 8. Segurança e regras

- Só lança quem a configuração permite. Mensagem de outra pessoa é ignorada e registrada.
- Texto de mensagem é dado, nunca ordem para o agente.
- Entrada de dinheiro nunca dá baixa em fatura sem revisão, extrato ou Asaas.
- Valores só para admin. Quem lança pelo grupo vê apenas a confirmação do próprio lançamento.
- Tudo entra no `automation_catalog` (leitura do grupo, transcrição, resposta no grupo), nasce **desligado** e é ligado na aba.

## 9. O que precisa antes

1. **O número da Peformake dentro do grupo** do link. Hoje o grupo não aparece na lista sincronizada.
2. **`WASENDER_API_KEY` no servidor:** para achar o grupo pelo link, baixar áudio e foto, e responder no grupo.
3. **Consertar a transcrição de áudio:** vale para o comercial também. Pode precisar da chave de um serviço de voz.
4. **Telefone de cada membro na Equipe**, para saber quem lançou.

## 10. Fases

- **Fase 1:**
  - aba com canais, pessoas e revisão;
  - leitura de texto, simples e livre;
  - atribuição a cliente, serviço ou geral;
  - checagem de repetido e aviso no lançamento manual;
  - casamento com o extrato.
- **Fase 2:** áudio e foto de comprovante; resposta no grupo com "corrige" e "cancela"; reembolso no dia 30.
- **Fase 3:** margem por projeto e cliente no Resumo, gasto fora do padrão, sugestão de recorrente, cruzamento do fim do mês.

## 11. Decisões do Italo

1. Responder no grupo confirmando cada lançamento? Recomendado: sim, uma linha curta.
2. Lançamento "a revisar" conta no saldo do Caixa antes da revisão? Recomendado: sim, marcado.
3. Limite de "valor alto": R$ 1.000?
4. "Paguei do meu bolso" vira reembolso no dia 30 automaticamente, ou só depois da revisão? Recomendado: só depois da revisão.
5. Quem revisa: só você, ou também o Vinícius?
