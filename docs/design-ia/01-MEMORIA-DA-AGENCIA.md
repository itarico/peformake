# Memória da Agência — o que já foi feito (até 06/11/2026)

Fonte: leitura de 15 sessões anteriores do Claude, do banco `peformake-app` (Supabase `wkkzcjnxyylrqoolmmhi`), do Canva e das skills da conta.

## Quem é quem
- **Italo Ricardo** (Recife): dono da Performake (assessoria de marketing, "não somos agência, somos assessoria"), Ellcazo Studio (audiovisual), Gastromake, RaizFrame, operação Shopee.
- Fala por voz e pelo celular (Remote Control) → mensagens com erro de digitação. Quer respostas curtas, em português, **sem emojis nem travessões** nos entregáveis, terminando com pergunta objetiva / próximo passo.
- Quer autonomia ("vou confiar em você"), mas **aprovação antes de enviar ao cliente**.
- Tese do produto: **"Marketing com Recibo"** (anúncio → WhatsApp → venda em R$). Nunca tratar tráfego pago como vilão.

## Sistemas
| Sistema | Onde | Observação |
|---|---|---|
| App antigo (Lovable) | repo `itarico/peformake` | Este repositório |
| App novo **peformake-gestao** | `D:\ITALO\CLAUDE\Site\peformake-app`, Vercel `peformake-gestao`, Supabase `wkkzcjnxyylrqoolmmhi` | Fonte real dos clientes. Tem Placar da Equipe e o gerador "Pedir arte" (skill `design-gerador`, HTML→PNG via Playwright) |
| Site novo peformake.com | `Site/peformake-site` (Vite + GSAP + Lenis, fonte Archivo) | Em prévia |

**Regra:** sempre dizer de qual sistema é cada achado (já houve mistura).

## Clientes com DESIGN ativo (banco, 06/11/2026)
APM (Colégio Militar do Recife) · Brio Burguer · Cajá Limão (Tardezinha Bar) · Disalp · Fornario · Fuctura Soluções · Infinity Graff · MB Centrífugas · MF Máquinas · Natalia de Menudo · Restaurante do Vando · SN Distribuidora · Will Motos.
⚠️ **Campo `brand_style` vazio em todos** → nenhuma marca documentada no sistema.

Outros clientes citados nas sessões: Leazi Energia Solar (Feirão Solar BV), Óticas MD Prime (Carpina), F5 Multimarcas (Olinda), Clínica Acácia (case: 943 conversas a R$ 4,09), Lease, CIA Coffee.

## Entregas de design/vídeo já feitas
- **Leazi:** 6 vídeos + 23 motions (Remotion), quadros de estilo v1–v3 e "Kit BV". Pendente: aprovar Kit BV e produzir 10 artes; confirmar números (800 projetos/5 anos x +1.500/+7 anos) e WhatsApp.
- **MF Máquinas:** 30 artes / 56 arquivos de novembro (v4, Remotion + recorte BiRefNet de 110 produtos). Pendente aprovação v4 e upload em `content_items`.
- **Will Motos:** site Next.js + Supabase com leitura da OLX e **geração automática de artes** (Satori + sharp, Poppins/Montserrat); vídeos v2/v3 (cores Performake `#3C83F6`, `#1AF3FB`, `#0B1430`). Pendente: telefone sem o 9 na moldura ("81 9532-2630").
- **MD Prime:** pacote de criativos em PDF (radar de 35 anúncios, 11 roteiros, artes A1–A10), 16 vídeos por cidade. Estilo preto e dourado.
- **Canva:** séries de MB Centrífugas, MF Máquinas, Disalp, SN Distribuidora, Will Motos, Pizzaria do Vando, cartão fidelidade.

## Identidades conhecidas
| Cliente | Cores | Fontes | Regras |
|---|---|---|---|
| MF Máquinas | azul, branco, laranja (alternar); tema claro = creme + azul-escuro + laranja | Anton + Inter | sem fundo preto; nunca azul sobre laranja; logo sem círculo |
| Leazi | verde Leazi; no Feirão: azul BV + branco | Montserrat, Anton, Poppins (Unbounded no lugar de Akira) | seguir diagramação oficial do BV |
| MD Prime | preto + dourado | — | fala regional (Carpina/Zona da Mata) |
| Will Motos | cores Performake nos vídeos | Poppins, Montserrat | moto centralizada, texto grande |
| Performake | `#3C83F6`, `#1AF3FB`, `#0B1430` (app/vídeo); `#e94560`, `#00d4aa`, `#ffb800`, `#7c3aed` (entregáveis HTML) | Archivo (site) | fundo escuro, logo PFMK animado |

## Fluxo de entrega preferido
Drive > Clientes > [cliente] > 2026 > [Mês] > Vídeos Prontos → envio pelo **site** (sem Drive, decisão mais recente) e aprovação no WhatsApp privado + grupo do cliente (Wasender, limite 100 MB).
