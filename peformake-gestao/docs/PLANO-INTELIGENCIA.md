# Plano: sistema inteligente (por parâmetros, sem IA)

Princípio: o sistema **observa** o que já é registrado no dia a dia, **compara** com uma régua que o Italo define, e **sugere a próxima ação** no lugar onde a pessoa já está. Nada de relatório para ler: um aviso curto, com o botão da ação.

Cada sinal tem 4 partes: **de onde vem o dado**, **a regra**, **onde aparece** e **qual ação sugere**. Os limites (3 meses, 5 meses, 4 dias...) ficam em **Configurações → Inteligência**, editáveis, e começam com o valor sugerido.

## 1. O que já está no ar (06/11/2026)

| Sinal | Onde aparece |
|---|---|
| Temperatura do cliente (quente, morno, esfriando, sem dados) | Lista de clientes e Visão geral |
| Relacionamento ruim, sem avaliação, contrato vencendo ou vencido, sem equipe, sem serviço | Atenção na lista e "O que fazer agora" |
| Upsell na hora certa e próximo serviço por afinidade | Atenção e "O que fazer agora" |
| Porte da empresa (Receita ou estimado pelo valor) | Visão geral |
| Faixa de preço por serviço, nicho e porte | Banco pronto; entra na tela com Vendas e Orçamentos |
| Aprovação parada há mais de 4 dias e fatura atrasada | Descontam da temperatura e viram ação |

## 2. Catálogo de sinais propostos

### A. Cliente sem comprar (avulso, TCV e por execução)
| Dado | Regra sugerida | Onde | Ação |
|---|---|---|---|
| Data do último serviço lançado ou executado | **3 meses** sem serviço: aviso "parado há 3 meses" | Atenção, Comercial | Botão "Oferecer algo" (usa o próximo serviço por afinidade) |
| Idem | **5 meses** sem serviço: habilita "Marcar como perdido" com motivo "Inatividade" | Ficha do cliente | Ao marcar, entra na Recuperação (3 tentativas) |
| Frequência média de compra do próprio cliente | Se ele costuma comprar a cada 45 dias e já passou 1,5x isso: aviso antes dos 3 meses | Atenção | "Está na hora do pedido de sempre" |

### B. Entregas do mês (dentro do próprio mês)
| Dado | Regra sugerida | Onde | Ação |
|---|---|---|---|
| Itens do plano do mês x entregues, e dias que faltam | **Ritmo**: entregue / combinado < dias passados / dias do mês - 15 pontos → "atrasando" | Operação, Início, ficha do cliente | Abrir o quadro já filtrado no cliente |
| Prazo de cada peça ou vídeo | Vence em 2 dias e não saiu da produção → amarelo; passou → vermelho | Quadros de Design e Audiovisual | Avisar o responsável |
| Captação sem data marcada até o dia 10 (só fixos) | "Gravação não marcada" | Audiovisual → Para agendar | Agendar |

### C. Tempos médios (estamos demorando?)
| Medida | Como mede | Onde |
|---|---|---|
| Tempo de produção de uma arte | criação → enviada para o cliente | Painel de Design, por designer e por cliente |
| Tempo de aprovação do cliente | enviada → aprovada (`approved_at`) | Ficha do cliente (cliente que demora a aprovar) |
| Captação até entrega do vídeo | `shoot_at` → `delivered_at` | Painel de Audiovisual, por editor |
| Roteiro até aprovação | `script_sent_at` → `script_approved_at` | Audiovisual |
| Reuniões | agendada x realizada, remarcações, tempo desde a última | Ficha do cliente, Estratégia |
| Resposta no WhatsApp | mensagem do cliente → primeira resposta da equipe | Comercial e ficha do cliente |

Cada medida mostra **a média dos últimos 90 dias** e **a tendência** (melhorando ou piorando). Quando passa da meta (ex.: arte > 3 dias úteis), vira aviso para o responsável e para o head.

### D. Contratos e cobrança
| Dado | Regra sugerida | Ação |
|---|---|---|
| Contrato enviado (`sent_at`) sem assinatura | 3 dias: lembrete ao cliente; 7 dias: aviso ao admin | Reenviar ou ligar |
| Contrato vencendo | 30 dias antes: conversa de renovação; 60 dias: preparar proposta | Gerar renovação |
| Faturas | Régua D-1 a D+7 (pronta, desligada) | Já planejado no Asaas |
| Cliente que sempre paga atrasado | 2 dos últimos 3 pagamentos atrasados → sinal "pagador lento" | Sugerir boleto antecipado ou cartão recorrente |

### E. Equipe e capacidade
| Dado | Regra | Ação |
|---|---|---|
| Itens abertos por pessoa x média | Pessoa com o dobro da média da equipe → sobrecarga | Sugerir redistribuir |
| Retrabalho (`revision_count`) | Média de ajustes por designer ou editor e por cliente | Cliente que pede muito ajuste: alinhar briefing |

### F. Comercial
| Dado | Regra | Ação |
|---|---|---|
| Proposta enviada sem resposta | 3 e 7 dias | Lembrete ao vendedor |
| Lead sem contato | 24 h | Aviso ao SDR |
| Taxa de fechamento por origem e por nicho | Média móvel | Mostrar onde vale investir |

## 3. Onde tudo aparece (sem poluição)
1. **Início**: no máximo 5 ações do dia, as mais importantes primeiro, para cada cargo.
2. **Ficha do cliente → "O que fazer agora"**: até 4 ações daquele cliente.
3. **Coluna Atenção** na lista de clientes e **atalhos** com contagem.
4. **Painel de cada área**: os tempos médios e quem está atrasando.
5. **Notificação** só para o que tem prazo (contrato parado, entrega vencendo, fatura atrasada).

## 4. Fases
| Fase | Entrega |
|---|---|
| 1 | Configurações → Inteligência (réguas editáveis) + cliente sem comprar (A) + contrato parado (D) |
| 2 | Ritmo das entregas no mês (B) + tempos médios de Design e Audiovisual (C) |
| 3 | Tempo de aprovação e de resposta do cliente na temperatura + pagador lento |
| 4 | Capacidade da equipe e retrabalho (E) |
| 5 | Comercial (F) e Início com as 5 ações do dia por cargo |

## 5. Decisões do Italo
1. Réguas iniciais: **3 meses** aviso e **5 meses** sugerir perda para quem não compra. OK?
2. Meta de entrega: arte em **3 dias úteis**, vídeo em **5 dias úteis** após a captação. OK?
3. Contrato sem assinatura: lembrete em **3 dias** e aviso em **7**. OK?
4. Quem recebe os avisos de atraso de entrega: só o responsável, ou também o head?
