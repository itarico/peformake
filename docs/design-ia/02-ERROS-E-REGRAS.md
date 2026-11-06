# Erros já cometidos com IA criando design — e a regra que fica

Leia ANTES de gerar qualquer peça. Toda nova reprovação entra aqui.

## A. Erros reais da Performake (sessões anteriores)

| # | Erro | Onde | Regra |
|---|---|---|---|
| 1 | Botões/pílulas de CTA no post ("não é uma interface") | Leazi | Nunca botão em post. Contato = ícone + número |
| 2 | Recorte 100% do fundo, pessoa "solta" | Leazi, MF | Alternar recorte e foto inteira; fundo original esmaecido + color único; palavra gigante por trás interagindo |
| 3 | Print/frame de vídeo usado como foto | Leazi, MF | Só JPG/RAW. Nunca frame de vídeo |
| 4 | Todas as artes com a mesma fonte/layout/cor | Leazi, MF | Ler PSDs e Instagram do cliente; variar layout e cor na série |
| 5 | Arte que "não comunica nada" | Leazi | Oferta explícita para quem não conhece a campanha |
| 6 | Foto de ex-funcionário | Leazi, MF | Confirmar equipe atual antes de usar rosto |
| 7 | Muito texto, texto sobre o rosto, pessoa pequena, muita cor | Leazi v3 | Pouco texto, pessoa grande, nada sobre rosto, paleta restrita; copiar kit de referência quando houver |
| 8 | Cabeça/objeto cortado, faixa vazia, espaço morto no topo/rodapé | MF | Margem de segurança larga; nunca cortar cabeça |
| 9 | Fundo preto com produto escuro; azul sobre laranja | MF | Contraste ≥ 4,5:1; regras de cor do cliente |
| 10 | Logo dentro de círculo/ícone ("cara de IA") | MF | Logo limpa: branca no escuro, azul no claro |
| 11 | "Caixinha de texto" | MF | Texto de apoio solto, tipografia, abaixo do título |
| 12 | Copy sem sentido ("À vista, dinheiro, Pix"), imagem que não bate com o texto | MF | Gancho no slide 1, problema → solução; imagem 100% sincronizada com a copy |
| 13 | Telefone errado copiado de arte antiga; número sem o 9 | MD Prime, Will | Confirmar dados com o Italo/ficha, nunca com arte antiga |
| 14 | Arquivo sobrescrito (dois produtos com mesmo nome) | Will | Nome de arquivo único: `Cliente_Peca_NN_AAAA-MM-DD` |
| 15 | Texto pequeno, produto descentralizado | Will | Texto legível no celular; produto centralizado |
| 16 | Vídeo "editado por IA", texto que parece ícone, vídeo pequeno na tela | Will v1 | Estilo story com motion; incluir material-chave do cliente |
| 17 | Vídeo: silêncios, fala cortada ("primeira passão"), sem color/estabilização, legenda sobreposta | Leazi | Conferir por transcrição (Whisper); color e estabilização em todas as cenas |
| 18 | TTS pronunciando em inglês ("Black Friday") | MD Prime | Grafia fonética ("Bléqui") e conferir com Whisper |
| 19 | Escopo extrapolado (pediu só montagem, recebeu 34 artes) / gerou sem pedir | Leazi, MD Prime | Fazer só o pedido; perguntar antes de ampliar |
| 20 | Design ignorou identidade do cliente | Lease | Mostrar 3 propostas de identidade antes de produzir |
| 21 | Emojis/travessões em roteiros | Leazi | Sem emojis nem travessões nos entregáveis |
| 22 | "TA PRONTO?" "cade o arquivo?" | várias | Sempre informar caminho do arquivo e progresso |
| 23 | Migração SQL não aplicada → "não teve atualização nenhuma no site" | Lovable | Verificar em produção antes de dizer "pronto" |
| 24 | Push no GitHub 403 em toda sessão cloud | várias | Avisar uma vez; entregar por arquivo; corrigir conexão GitHub |
| 25 | Token colado no chat e salvo em texto | Reportei | Nunca pedir/colar segredos no chat |
| 26 | Marca de terceiros na imagem (bike "Kingbull") | Leazi | Remover marca de terceiros ou pedir autorização |
| 27 | Referência com publicidade enganosa | MD Prime | Aproveitar só o estilo, nunca a promessa |

## B. Erros comuns do mercado (pesquisa 2026)
- **Texto dentro da imagem gerada:** preço, telefone, endereço e CTA entram como camada de texto (Canva/Figma/HTML), nunca gerados pela IA.
- **Fora da marca:** falta de "memória de marca" → Brand Kit no Canva / variáveis no Figma por cliente.
- **AI slop em sites:** Inter + gradiente azul-roxo + hero vago + cards iguais. Usar fonte própria, foto real, estrutura por nicho.
- **Série inconsistente:** usar as mesmas imagens de referência; revisar mãos, rodas, logos de montadoras e armações em 100%.
- **Formato/zona segura:** Feed 1080×1350 (4:5) ou 1080×1440 (3:4, grade nova); Stories/Reels 1080×1920 com 14% em cima e ~35% embaixo livres.
- **Direitos:** não usar pessoa falsa como "cliente real"/depoimento; Conar responsabiliza toda a cadeia por conteúdo com IA; Meta rotula "AI info" via C2PA.

## C. Checklist QA (rodar em TODA peça antes de entregar)
1. Formato e zona segura certos para o destino
2. Texto: ortografia, telefone, preço, endereço conferidos na ficha
3. Uma ideia por peça, oferta clara, pouco texto
4. Pessoa/produto grande, nada cortado, nada sobre rosto
5. Cores/fontes do cliente; contraste ≥ 4,5:1; logo limpa
6. Foto real (JPG/RAW), sem frame de vídeo, sem ex-funcionário, sem marca de terceiros
7. Não parece IA (sem botão, sem caixinha, sem círculo na logo)
8. Nome de arquivo único e caminho informado
9. Rodar `design:design-critique` e só então mandar para aprovação interna
