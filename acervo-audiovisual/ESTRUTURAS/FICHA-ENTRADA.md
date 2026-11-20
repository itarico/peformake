# Ficha de entrada do cliente (o que ele consegue gravar)

Responder uma vez por cliente e guardar em `video-tools/clientes/<cliente>.md`, na seção "Entrada do motor". Ela não
escolhe o vídeo: só tira da mesa o que o cliente **não consegue** fazer, para o roteirista escolher entre o que é possível.
Revisar a cada trimestre ou quando algo mudar (contratou alguém que fala bem, abriu loja nova, liberou humor).

## As 10 perguntas (sim / não / às vezes)

| # | Pergunta | Etiqueta que libera |
|---|---|---|
| 1 | Tem alguém da marca que fala bem na câmera (dono, técnico, apresentador)? | `fala` |
| 2 | Dá para juntar 2 ou mais pessoas para atuar uma cena? | `duas_pessoas` |
| 3 | O lugar (loja, fábrica, cozinha, consultório, obra) é filmável e pode aparecer? | `local` |
| 4 | Existe um processo visual: algo sendo feito, montado, consertado, transformado? | `processo` |
| 5 | O produto é bonito ou interessante de ver na mão, em close? | `produto` |
| 6 | Algum cliente real topa aparecer ou dar depoimento (com autorização escrita)? | `clientes` |
| 7 | Há números ou resultados reais que podem ir para a tela? | `numeros` |
| 8 | A marca aceita humor? (e até onde: leve, esquete, autoironia) | `humor` |
| 9 | O pacote do mês inclui edição/motion forte? | `edicao` |
| 10 | O pacote inclui diária de gravação profissional? | `diaria` |

E duas marcações fora da lista:
- **Setor regulado** (saúde, estética, advocacia, finanças, conselho de classe): sim / não. Se sim, só entram estruturas
  com `regulado: sim` ou `com cuidado`, e as "com cuidado" passam pelas regras do conselho (sem promessa, sem "o melhor",
  sem antes/depois proibido, sem preço quando a classe proíbe).
- **Nunca aparece:** pessoas, lugares ou assuntos que não podem ir ao vídeo (ex.: um sócio que não quer aparecer).

## Como o motor usa
1. Uma estrutura entra na mesa quando **todas** as etiquetas do `exige` dela estão "sim" (ou "às vezes", com nota).
2. Dentro do que sobrou, escolhe pelo **objetivo do vídeo** (alcance, seguidores, salvar, prova, lead, venda) e pelo funil.
3. Prefere o que o **placar** diz que funcionou para este cliente ou para um cliente parecido; evita o que está em
   descanso. Ver `PLACAR-ESTRUTURAS.md`.
4. Pelo menos uma estrutura nova por mês, para o perfil não virar fórmula (regra de variedade do motor).

## Exemplo de preenchimento (inventado)
```
Entrada do motor (revisada em 2026-11-20)
fala: sim (dono)          duas_pessoas: às vezes (equipe pequena)   local: sim (oficina)
processo: sim (conserto)  produto: sim                              clientes: não
numeros: às vezes         humor: sim, leve                          edicao: não   diaria: não
regulado: não             nunca aparece: fachada do vizinho
```
Com isso saem da mesa as estruturas que pedem `clientes`, `edicao` ou `diaria`, e ficam, por exemplo, tutorial,
antes e depois, só as mãos, do zero ao pronto e o esquete leve.
