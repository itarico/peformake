# Professor do Italo

Sistema de ensino pessoal no padrão de tutoria de Oxford, baseado em ciência da aprendizagem.

| Arquivo | O que é |
|---|---|
| `SKILL.md` | O método: como o professor ensina, avalia e escolhe o próximo tema |
| `curriculo.md` | As 6 trilhas (marketing, inglês, vendas, finanças, IA, gestão) e os pontos cegos |
| `diario-de-aprendizagem.md` | Memória: aulas dadas, notas, fila de revisão espaçada |
| `aulas/` | Uma aula por semana, gerada automaticamente toda segunda |

## Rota de Estudos (página no celular)

https://claude.ai/artifact/QhwHiXPtMUHxowNuHahM4V. O código fica em `professor/app/rota-de-estudos.html`. É o plano de 1 hora por dia: você marca os blocos e escreve a anotação, e o professor lê isso toda segunda antes de montar a semana seguinte. A conversa continua no chat do Claude.

## Como usar

1. Toda segunda de manhã chega uma aula nova em `aulas/` e um aviso no celular.
2. Faça a aula (25–40 min), incluindo a checagem sem consultar.
3. Em qualquer conversa com o Claude, diga **"professor, aula NN entregue"** e mande suas respostas/tarefa. O professor corrige, desafia e atualiza o diário.
4. A qualquer momento: **"professor, me ensina X"** gera uma aula avulsa no mesmo formato.
