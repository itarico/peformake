# Estudo: conectar o Instagram do cliente (ver dados e programar reels e stories) — 24/11/2026

Pedido do Italo: ligar o Instagram do cliente ao sistema e ao Claude, ver os dados e, se der, programar stories e reels,
do jeito mais fácil, sem atrapalhar o cliente e sem custo alto. Só estudo: nada foi configurado na Meta nem alterado no sistema.
Fontes: documentação oficial da Meta lida em 24/11 ([visão geral](https://developers.facebook.com/docs/instagram-platform/overview),
[publicação de conteúdo](https://developers.facebook.com/docs/instagram-platform/content-publishing)).

## O que a Meta permite, de graça (API oficial do Instagram)
- **Publicar por API**: imagem (só JPEG), vídeo, **Reels**, **Stories** e carrossel (até 20 itens). Sem filtros e sem etiqueta de produto.
- **Programar**: a API não tem "data futura". Quem programa é o nosso sistema: guarda a data e publica na hora (rotina agendada).
- **Limite**: 100 publicações por API a cada 24 h por conta (num trecho da mesma página aparece 50; tratar como 50).
- **Arquivo**: precisa estar num link público na hora de publicar (o nosso armazenamento com link assinado serve).
- **Conta**: precisa ser profissional (comercial ou criador).
- **Dados**: alcance, curtidas, seguidores, posts, pela permissão de insights.
- **Token**: de longa duração vale 60 dias e é renovável.

## Dois jeitos de ligar a conta
| | Login do Instagram | Login do Facebook |
|---|---|---|
| Precisa de Página do Facebook | não | sim |
| Como o cliente autoriza | entra com o Instagram dele e aceita | já acontece quando ele dá acesso à Página/Instagram no Gerenciador (como faz para anúncios) |
| Permissões | `instagram_business_basic`, `instagram_business_content_publish` (+ comentários, mensagens) | `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `pages_read_engagement` |

## O ponto que decide o custo e o prazo: nível de acesso
- **Acesso padrão**: sem revisão da Meta. Vale para contas **que a gente gerencia** (com papel no nosso app ou no nosso portfólio empresarial).
- **Acesso avançado**: para contas de terceiros sem vínculo. Exige **Revisão do App e Verificação da Empresa**.

Como a Peformake já recebe o Instagram e a Página do cliente como parceira no Gerenciador de Negócios (para anunciar),
o caminho mais barato é o **Login do Facebook com acesso padrão**: nada muda para o cliente e não precisa de revisão.
**A confirmar na prática** com uma conta de teste: se o ativo compartilhado como parceiro basta para o acesso padrão.

## Caminhos comparados
| Caminho | Custo | Ver dados | Programar reels/stories | Esforço | Risco |
|---|---|---|---|---|---|
| **A. API oficial, app da Peformake** | R$ 0 | sim | sim (o sistema agenda) | médio (tela + rotina) | baixo, mas **o app está bloqueado desde 04/11** |
| **B. Reportei (já contratado)** | já pago | sim, hoje, no Claude (10 clientes ligados) | não | zero | nenhum |
| **C. Meta Business Suite** | R$ 0 | sim | sim, à mão | zero | nenhum |
| **D. Ferramenta paga (mLabs, Metricool)** | mensalidade | sim | sim | baixo | dependência |

## Recomendação
1. **Agora, sem construir nada**: dados pelo Reportei (já funciona aqui no Claude) e, para o que o Reportei não traz, pelo conector
   de anúncios (lista os posts, reels e stories das contas ligadas às contas de anúncio).
2. **Destino**: caminho A. Aba no Social Media "Agendar" → escolhe a arte/vídeo aprovado, a data e a legenda → o sistema publica na hora.
   A arte aprovada pelo cliente vira publicação com 1 toque (hoje a social media marca "publicado" à mão).
3. **Antes de A**: resolver o bloqueio do app da Meta (a Graph API está bloqueada desde 04/11; o motivo não está registrado nos documentos).
   Não criar um app novo para contornar: isso pode ser lido como burlar restrição e pôr a conta em risco.

## Sobre configurar pelo navegador
O Italo autorizou clicar e aceitar permissões na Meta, com a condição de não derrubar o Facebook dele. Em 24/11 o navegador do
Claude não estava logado na Meta (o painel de apps abriu como "Página não encontrada"), então nada foi clicado.
Primeiro passo quando houver login: **só olhar** o motivo do bloqueio do app (Painel do app → Qualidade da conta / Alertas).
Nunca: criar segundo app, trocar e-mail/senha, remover administradores, pedir revisão sem os dados da empresa certos.

## Precisa do Italo
1. Entrar na Meta no navegador do Claude (ou autorizar o uso do Chrome dele) para eu ver o motivo do bloqueio do app.
2. Confirmar se a Verificação da Empresa da Peformake já foi feita no Gerenciador.
3. Escolher um cliente-piloto com Instagram profissional já compartilhado com a Peformake.
