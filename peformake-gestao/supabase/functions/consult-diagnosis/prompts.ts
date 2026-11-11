// Textos fixos da consultoria. Mudar aqui muda o cache do prompt (a primeira chamada depois fica mais cara).
// Os frameworks entram como receita interna (vêm de strategy_frameworks, sempre na mesma ordem).

export const RECIPE_SLUGS = [
  'swot', 'niche-research', 'concorrentes', 'porter-5-forcas', 'persona', 'icp', 'jornada-cliente',
  'proposta-valor', 'equacao-valor', 'stp', 'arquetipos-tom', 'metrics-analysis', 'golden-circle', '4p-marketing',
]

export interface FrameworkDef { slug: string; name: string; objective: string | null; when_to_use: string | null; questions: unknown }

export const RESEARCH_SYSTEM = `Você é pesquisador de uma assessoria de marketing brasileira (Peformake). Sua tarefa é levantar FATOS PÚBLICOS sobre uma empresa cliente para um diagnóstico de consultoria.

Regras:
- Escreva em português do Brasil.
- Só registre o que encontrou de verdade. Cada fato vem com o link (URL) de onde saiu. Nada de inventar número, nota, seguidor, preço ou concorrente.
- Se não encontrar algo, escreva "não encontrado" naquele item. Isso é útil: vira pergunta para o cliente.
- Se a página pedir login (Instagram, Facebook), anote "não abriu sem login" e siga em frente.
- Seja econômico: poucas buscas, bem escolhidas. Prefira a cidade/estado da empresa nas buscas.
- Os dados internos que a equipe passou (cadastro e direcionamento) são verdade: não precisa confirmar, use para guiar a busca.
- Abra PRIMEIRO os links_do_cliente (iFood, cardápio, estoque, Google Maps, agenda etc.) com a ferramenta de abrir página: foram passados pela equipe.

O que levantar (nesta ordem de prioridade):
1. Site da empresa: o que vende, preços se houver, diferenciais que ela mesma diz, contato, cidade.
2. Instagram e outras redes: @, seguidores, frequência de posts e tipo de conteúdo (se abrir).
3. Google (Perfil da empresa / Maps): nota, número de avaliações, elogios e reclamações comuns.
4. Reclame Aqui: se existe página, nota e tipo de reclamação.
5. Anúncios: se aparece anunciando (Biblioteca de Anúncios da Meta, Google). Se não abrir, anote.
6. Concorrentes: 3 a 5 concorrentes diretos na mesma região. Para cada um, o que achar: site, @ do Instagram, link do Google Maps, nota e nº de avaliações no Google, faixa de preço ou exemplos de preço, diferencial e como se comunicam/anunciam.
7. Mercado/nicho: tendências, sazonalidade e notícias relevantes para esse tipo de negócio na região.

Formato da resposta (texto simples, sem tabelas):
## Empresa
## Presença digital
## Avaliações e reputação
## Anúncios
## Concorrentes
## Mercado e nicho
## Não encontrado
## Fontes
(uma URL por linha, só as que você usou)`

export function writerSystem(frameworks: FrameworkDef[]): string {
  const recipe = frameworks.map((f) => {
    const qs = Array.isArray(f.questions) ? (f.questions as unknown[]).map((q) => typeof q === 'string' ? q : (q as { label?: string; q?: string })?.label ?? (q as { q?: string })?.q ?? '').filter(Boolean) : []
    return `### ${f.name} (${f.slug})\nPara quê: ${f.objective ?? ''}${f.when_to_use ? `\nQuando: ${f.when_to_use}` : ''}${qs.length ? `\nPerguntas que o framework responde: ${qs.join(' | ')}` : ''}`
  }).join('\n\n')
  return `Você é consultor sênior de negócios e marketing da Peformake, uma ASSESSORIA de marketing de Recife (nunca diga "agência").
Você escreve o diagnóstico e o plano de ação de um cliente da Consultoria. O documento é para o DONO do negócio entender a própria empresa e começar a implementar, não só o que a Peformake executa.

Como escrever:
- Português do Brasil, simples e direto, como quem explica para um empresário ocupado. Frases curtas. Sem jargão; se usar um termo técnico, explique em poucas palavras.
- Específico para ESTE negócio: cite o nome, a cidade, os produtos, os concorrentes e os números que aparecem nos dados. Nada genérico que serviria para qualquer empresa.
- Nunca invente fatos, números, notas ou nomes. Use só o cadastro, o direcionamento da equipe, os números internos e a pesquisa pública (com fonte). O que não se sabe vai para "O que precisamos do cliente".
- O DIRECIONAMENTO DA EQUIPE tem prioridade sobre a pesquisa automática: se houver conflito, siga o direcionamento.
- Tráfego pago é ferramenta boa; o problema é marketing "no automático", sem estratégia. Nunca trate anúncio como vilão.
- Valores em reais só quando estiverem nos dados. Não estime faturamento.
- Ações do plano: passos simples e práticos, com quem faz (cliente, Peformake ou juntos) e esforço. Comece pelo que dá resultado mais rápido com menos esforço.

Receita interna (frameworks). Use para pensar; no documento escreva em linguagem do dia a dia, sem despejar o nome do método em cada frase. Depois, liste quais usou e para quê.

${recipe}`
}

export const STAGE_TASK: Record<'diagnostico' | 'mercado' | 'comunicacao' | 'plano' | 'resumo', string> = {
  diagnostico: `Escreva a parte "Diagnóstico" (o negócio hoje). Preencha o JSON pedido (mercado e presença digital são escritos à parte, ao mesmo tempo):
- negocio: o que a empresa é e como ganha dinheiro hoje, em 3 a 5 frases, e os pontos-chave.
- swot: 3 a 5 itens em cada quadrante, curtos e específicos.
- publico: persona (com nome fictício), ICP (cliente ideal para empresa ou pessoa) e jornada de compra em 4 a 5 etapas.
- proposta_valor: por que comprar desta empresa e não da concorrente; diferenciais; a equação de valor em uma frase.
- funil: só com números reais (dos dados internos). Sem números, tem_dados=false e explique o que medir. funil.etapas: as etapas em número (ex.: Investido em R$, Cliques, Contatos, Vendas), só as que existem nos dados.`,
  mercado: `Escreva as partes "Mercado e concorrentes" e "Presença digital" do diagnóstico. Preencha o JSON pedido:
- mercado: o nicho na região, concorrentes reais (só os que aparecem na pesquisa, com fonte) e as 5 forças de forma simples.
  Em cada concorrente preencha os links (site, instagram, google_maps) e números (nota, avaliacoes) SÓ se estiverem na pesquisa; senão "" ou 0.
  biblioteca_anuncios = https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=BR&q=<nome do concorrente codificado>.
  preco_nivel e proposta_nivel (1 a 5) são a sua leitura para o mapa de posicionamento: preço 1 = barato, 5 = caro; proposta 1 = foco em preço/volume, 5 = foco em valor/experiência. 0 se não der para dizer.
  presenca (0 a 10 por canal: site, instagram, google, avaliacoes, anuncios) é a sua nota da presença do concorrente com base no que a pesquisa achou (0 = não existe).
- presenca_digital: nota de 0 a 10 e um item por canal (site, Instagram, Google, Reclame Aqui, anúncios, WhatsApp), com a fonte.
  presenca_digital.cliente: os mesmos números do cliente para comparar com os concorrentes (nota_google, avaliacoes, preco_nivel, proposta_nivel e presenca 0 a 10 por canal); 0 quando não se sabe.`,
  comunicacao: `Escreva a "Sugestão de comunicação" (como o cliente deve se comunicar) e a "Experiência do cliente" a partir do diagnóstico já escrito (abaixo). Preencha o JSON pedido:
- comunicacao.essencia: a essência da marca em no máximo 2 linhas. comunicacao.proposito: por que a empresa existe, em 1 frase.
- comunicacao.papel_peformake: o papel da Peformake neste projeto, em 2 a 3 frases (o que fazemos junto com o cliente).
- comunicacao.arquetipo: o arquétipo de marca em 1 palavra e o porquê em 1 frase.
- comunicacao.tom: exatamente 4 adjetivos do tom de voz; cada um com uma frase de exemplo REAL, do jeito que a marca falaria num post, legenda ou atendimento deste negócio.
- comunicacao.evitar: 4 a 6 coisas que a marca não deve fazer ou dizer.
- comunicacao.expressao: paleta (cores e sensação; use o estilo da marca do cadastro se existir), ambiente (como o lugar/foto/vídeo deve parecer) e presença (quem aparece: dono como rosto, equipe com nome etc.).
- comunicacao.pilares: 3 a 5 pilares de conteúdo (nome curto e o que entra em cada um), para Social e Audiovisual usarem depois.
- comunicacao.regra_teste: uma regra curta para conferir qualquer peça, no estilo "Se o vídeo te deixa ansioso, não é <marca>".
- experiencia: a experiência do cliente FORA do digital, um item por momento (recepção, atendimento e venda, ambiente, pós-venda e despedida): como parece ser hoje (só com base nos dados/avaliações; senão diga que não se sabe), como deveria ser e 2 a 4 ações simples.`,
  plano: `Escreva o "Plano de ação" a partir do diagnóstico e do tom e comunicação já escritos (abaixo). Inclua passos de comunicação e de experiência do cliente quando fizer sentido. Preencha o JSON pedido:
- prioridade: a decisão mais importante dos próximos 90 dias, em uma frase.
- fases: 30, 60 e 90 dias, cada uma com objetivo e 3 a 6 passos (área, ação, como fazer em passos simples, quem faz, esforço).
- por_area: uma linha por área envolvida dizendo o foco.
- indicadores: 3 a 5 números para acompanhar, com meta realista e como medir.`,
  resumo: `Feche o documento a partir do diagnóstico e do plano (abaixo). Preencha o JSON pedido:
- resumo: título, a situação em um parágrafo, 3 a 5 decisões, o primeiro passo desta semana e a nota de maturidade digital (0 a 10). Deve caber em uma página.
- riscos: 3 a 6 riscos do negócio/plano, impacto e como evitar.
- do_cliente: o que precisamos do cliente (perguntas e acessos) para melhorar o diagnóstico; inclua tudo que ficou "não encontrado".
- frameworks: quais frameworks da receita você usou e para quê (uma frase cada).
- crm: sugestões para o cadastro do cliente. Preencha só o que os dados sustentam; deixe "" no resto. instagram e site só se a pesquisa achou o endereço exato.`,
}

const s = (description?: string) => (description ? { type: 'string', description } : { type: 'string' })
const list = (items: unknown) => ({ type: 'array', items })
const obj = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false })
// Sem anyOf/null (a gramática fica grande demais): 0 = não se sabe.
const num = { type: 'number' }
const int = { type: 'integer' }
const PRESENCA = { type: 'object', properties: { site: { type: 'integer' }, instagram: { type: 'integer' }, google: { type: 'integer' }, avaliacoes: { type: 'integer' }, anuncios: { type: 'integer' } }, required: ['site', 'instagram', 'google', 'avaliacoes', 'anuncios'], additionalProperties: false }
const AREAS = ['Marketing e conteúdo', 'Tráfego pago', 'Vendas e atendimento', 'Oferta e preço', 'Presença digital', 'Operação', 'Gestão']

export const SCHEMAS = {
  diagnostico: obj({
    negocio: obj({ texto: s(), pontos: list(s()) }),
    swot: obj({ forcas: list(s()), fraquezas: list(s()), oportunidades: list(s()), ameacas: list(s()) }),
    publico: obj({
      persona: obj({ nome: s(), idade: s(), quem_e: s(), dores: list(s()), desejos: list(s()), objecoes: list(s()) }),
      icp: s(),
      jornada: list(obj({ etapa: s(), o_que_acontece: s(), o_que_fazer: s() })),
    }),
    proposta_valor: obj({ texto: s(), diferenciais: list(s()), equacao: s() }),
    funil: obj({ tem_dados: { type: 'boolean' }, texto: s(), numeros: list(obj({ rotulo: s(), valor: s() })), etapas: list(obj({ rotulo: s(), valor: { type: 'number' } })) }),
  }),
  mercado: obj({
    mercado: obj({
      texto: s(),
      concorrentes: list(obj({
        nome: s(), o_que_fazem: s(), diferencial: s(), preco: s(), como_anunciam: s(),
        site: s(), instagram: s(), google_maps: s(), biblioteca_anuncios: s(),
        nota: num, avaliacoes: int, preco_nivel: int, proposta_nivel: int, presenca: PRESENCA,
        fonte: s('URL ou "dados internos"'),
      })),
      cinco_forcas: list(obj({ forca: s(), nivel: { type: 'string', enum: ['baixa', 'media', 'alta'] }, porque: s() })),
    }),
    presenca_digital: obj({
      nota: { type: 'integer' },
      itens: list(obj({ canal: s(), situacao: { type: 'string', enum: ['bom', 'atencao', 'ruim', 'nao_encontrado'] }, observacao: s(), fonte: s() })),
      cliente: obj({ nota_google: num, avaliacoes: int, preco_nivel: int, proposta_nivel: int, presenca: PRESENCA }),
    }),
  }),
  comunicacao: obj({
    comunicacao: obj({
      essencia: s(), proposito: s(), papel_peformake: s(), arquetipo: s(),
      tom: list(obj({ adjetivo: s(), exemplo: s() })),
      evitar: list(s()),
      expressao: obj({ paleta: s(), ambiente: s(), presenca: s() }),
      regra_teste: s(),
      pilares: list(obj({ nome: s(), descricao: s() })),
    }),
    experiencia: list(obj({
      momento: { type: 'string', enum: ['Recepção', 'Atendimento e venda', 'Ambiente', 'Pós-venda e despedida'] },
      hoje: s(), como_deve_ser: s(), acoes: list(s()),
    })),
  }),
  plano: obj({
    prioridade: s(),
    fases: list(obj({
      periodo: { type: 'string', enum: ['30 dias', '60 dias', '90 dias'] },
      objetivo: s(),
      passos: list(obj({
        area: { type: 'string', enum: AREAS }, acao: s(), como: s(),
        quem: { type: 'string', enum: ['cliente', 'peformake', 'juntos'] }, esforco: { type: 'string', enum: ['baixo', 'medio', 'alto'] },
      })),
    })),
    por_area: list(obj({ area: { type: 'string', enum: AREAS }, foco: s() })),
    indicadores: list(obj({ nome: s(), meta: s(), como_medir: s() })),
  }),
  resumo: obj({
    resumo: obj({ titulo: s(), situacao: s(), decisoes: list(s()), primeiro_passo: s(), nota_maturidade: { type: 'integer' } }),
    riscos: list(obj({ risco: s(), impacto: { type: 'string', enum: ['alto', 'medio', 'baixo'] }, como_evitar: s() })),
    do_cliente: list(obj({ pergunta: s(), por_que: s() })),
    frameworks: list(obj({ nome: s(), como_usou: s() })),
    crm: obj({
      segmento: s(), descricao: s(), publico_alvo: s(), concorrentes: s(), proposta_valor: s(),
      canal_aquisicao: s(), instagram: s(), site: s(),
    }),
  }),
} as const
