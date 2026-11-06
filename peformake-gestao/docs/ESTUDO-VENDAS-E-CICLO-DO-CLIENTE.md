# Estudo: vendas lançadas, tipos de cobrança e ciclo de vida do cliente

Baseado em como a Peformake e a Ellcazo trabalham de verdade (06/11/2026). Objetivo: tudo sincronizado (venda, produção, cliente, financeiro e portal), sem lançar a mesma coisa duas vezes e sem poluição.

---

## Parte 1. Os 4 jeitos de um cliente pagar

Hoje o sistema só conhece Fixo, TCV e Avulso. Na vida real existe um quarto jeito, o da **Partem**: ela não paga um valor cheio, paga **cada captação executada**. Chamaremos de **Por execução**.

| Tipo | Exemplo | Como paga | Entra na carteira recorrente? |
|---|---|---|---|
| **Fixo mensal** | Ótica com social + tráfego | Mensalidade igual todo mês | Sim (MRR) |
| **TCV** | Contrato de 12 meses fechado por valor total | Valor total em parcelas | Sim (valor do contrato) |
| **Por execução** | Partem, produção terceirizada: 20 captações no mês | Soma do que foi executado no mês (medição) | Não é MRR. Aparece como "recorrente variável", com média dos últimos 3 meses |
| **Avulso** | Institucional pontual, evento | Cada serviço uma vez (sinal + entrega) | Não. Fica na base, valor = último serviço |

Regra: o tipo fica na ficha do cliente (já existe o seletor Fixo/TCV/Avulso; entra "Por execução").

## Parte 2. Vendas: o "caixa" de lançamentos

### O problema
Hoje um serviço avulso ou por execução precisa ser lembrado em três lugares: no serviço do cliente, na produção (Audiovisual ou Design) e no financeiro. É aí que nasce o erro.

### A solução: um lançamento só
**Vendas** (Comercial → Vendas, e também um botão "Lançar" dentro do cliente e dentro de cada área) registra:

| Campo | Exemplo |
|---|---|
| Cliente | Partem |
| Empresa | Ellcazo |
| Serviço do catálogo | Captação com câmera |
| Quantidade | 1 (ou 20 de uma vez) |
| Valor unitário | vem do catálogo; dá para ajustar (com aviso se estiver abaixo ou acima da média) |
| Data de execução | uma data, ou "distribuir no mês" |
| Observação | local, briefing curto |

### O que um lançamento faz sozinho
1. **Produção:** cria a tarefa na área certa (uma captação vira um projeto no Audiovisual, uma arte vira peça no Design), já com cliente, data e responsável padrão.
2. **Cliente:** aparece na ficha (aba Entregas) e no **portal** como "Captação 3 de 20 em novembro", com o status de cada uma.
3. **Financeiro:** conforme o tipo do cliente:
   - **Avulso:** gera a cobrança daquele serviço (ou sinal e restante).
   - **Por execução:** não cobra na hora. Soma na **medição do mês** e, no fechamento, vira **uma fatura** com a lista do que foi executado.
   - **Fixo e TCV:** se o serviço já está no plano, não gera cobrança; se é extra, entra como **extra** na próxima mensalidade.
4. **Inteligência:** alimenta "o que o cliente mais compra", porte e faixa de preço.

### Lançar 20 de uma vez
"Quantidade 20" com "distribuir no mês" cria 20 itens sem data fixa (aparecem em "Para agendar" do Audiovisual só para esse cliente). Cada um é agendado quando a data for combinada. Cancelar um item o tira da medição automaticamente.

### Ciclo de cada item lançado
`vendido → agendado → executado → entregue → faturado → pago`
A produção mexe nas etapas do meio; o financeiro, no fim. Ninguém lança de novo.

### Fechamento da medição (por execução)
Último dia útil do mês: o sistema monta a fatura com tudo que foi **executado** no mês. O admin confere e aprova antes de sair (por enquanto). Sai como um link do Asaas para o cliente, com a lista anexada.

---

## Parte 3. Ciclo de vida do cliente

```
Lead → Cliente ativo → (Pausado) → Perdido → Recuperação (3 tentativas) → Reativado
                                                         ↘ sem retorno em 6 meses → Arquivado
```

### Pausado (temporário) x Perdido (cancelou)
- **Pausado:** o cliente pediu um tempo e tem data para voltar. Nada é cobrado nem produzido; volta sozinho na data, com aviso.
- **Perdido:** cancelou. Motivo obrigatório (já existe).

### O que "congela" quando o cliente é perdido
- Sai de todas as contas: carteira, MRR, saúde, temperatura, upsell, sugestões de agenda e de conteúdo, régua de cobrança de novas faturas.
- Portal desativado, leitura de anúncios desligada (já acontece).
- **Pendências continuam visíveis** numa aba própria **Perdidos**, com outros dados: fatura em aberto (a régua de cobrança continua só para o que já era devido), entrega em aberto, contrato e motivo da saída.

### Recuperação em 3 tentativas
Ao ser marcado como perdido, o cliente entra no **Comercial → Recuperação** com 3 tentativas agendadas:

| Tentativa | Quando | Abordagem sugerida (o sistema monta com os dados dele) |
|---|---|---|
| 1 | 30 dias depois | "Como está o negócio?" + um resultado que ele teve com a gente |
| 2 | 90 dias depois | Oferta de volta com condição (ex.: sem taxa de implantação) baseada no motivo da saída |
| 3 | 150 dias depois | Novidade da Peformake (case novo, serviço novo) e convite para um diagnóstico |

Cada tentativa vira tarefa para o responsável comercial, com o resultado registrado (sem resposta, não agora, voltou). Se voltar: **Reativar** devolve o cliente com o histórico, e o tempo fora fica registrado.

### Depois de 6 meses sem voltar
**Recomendação: arquivar, não apagar.** Apagar de vez destrói o histórico que alimenta retenção, motivos de saída, LTV e a inteligência de preço. O arquivado some de todas as telas e listas e não pode ser editado, mas os números históricos continuam certos. Para atender a LGPD, os dados pessoais de contato (telefone, e-mail, endereço) são apagados; ficam o nome da empresa, o setor e os valores.

---

## Decisões do Italo

1. Criar o tipo **Por execução** (Partem) separado do TCV? (recomendado: sim)
2. Por execução: fatura **uma vez por mês** com a medição (recomendado) ou **a cada captação**?
3. Medição do mês sai **automática** ou com **aprovação** do admin antes? (recomendado: aprovação no começo)
4. Serviço extra de cliente fixo: entra na **próxima mensalidade** (recomendado) ou cobra **na hora**?
5. Criar o **Pausado** além do Perdido?
6. Após 6 meses: **arquivar** com dados pessoais apagados (recomendado) ou **apagar tudo** de vez?
7. Intervalo das 3 tentativas de recuperação: 30, 90 e 150 dias está bom?
