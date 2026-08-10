import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, MessageCircle, Compass, Megaphone, Users, Palette, Video, Bot, Code, Printer, Play, Quote, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import LandingNav from '@/components/landing/LandingNav';
import PortfolioCasesDisplay from '@/components/landing/PortfolioCasesDisplay';
import FooterCTA from '@/components/landing/FooterCTA';
import LeadCalculator from '@/components/landing/LeadCalculator';

const serviceData: Record<string, {
  name: string;
  icon: any;
  headline: string;
  description: string;
  benefits: string[];
  questions: Array<{ q: string; subtitle: string; options: string[]; allowManual?: boolean }>;
}> = {
  'consultoria-estrategica': {
    name: 'Consultoria Estratégica',
    icon: Compass,
    headline: 'Diagnóstico, plano de ação e acompanhamento mensal',
    description: 'Analisamos seu negócio, identificamos oportunidades e construímos um plano personalizado para você crescer com direção e resultados mensuráveis.',
    benefits: ['Diagnóstico completo do seu marketing', 'Plano de ação mensal personalizado', 'Reuniões de acompanhamento', 'Métricas e KPIs claros'],
    questions: [
      { q: 'Qual o principal desafio do seu negócio hoje?', subtitle: 'Queremos entender onde está o gargalo.', options: ['Falta de posicionamento claro', 'Não consigo escalar vendas', 'Não sei por onde começar no digital', 'Meu marketing não traz resultado'], allowManual: true },
      { q: 'Você já tem metas de faturamento definidas?', subtitle: 'Metas orientam toda a estratégia.', options: ['Sim, claras e mensuráveis', 'Tenho metas vagas', 'Não tenho metas definidas'] },
      { q: 'Qual o faturamento mensal da empresa?', subtitle: 'Ajuda a dimensionar a estratégia.', options: ['Até R$ 10 mil', 'R$ 10 mil a R$ 50 mil', 'R$ 50 mil a R$ 200 mil', 'Acima de R$ 200 mil'] },
      { q: 'Qual sua urgência para começar?', subtitle: 'Priorizamos conforme sua necessidade.', options: ['Imediata — preciso agora', 'Nos próximos 30 dias', 'Estou pesquisando opções'] },
    ],
  },
  'trafego-pago': {
    name: 'Tráfego Pago',
    icon: Megaphone,
    headline: 'Anúncios que geram clientes todos os dias',
    description: 'Gestão profissional de campanhas no Google e Meta Ads com estratégia, otimização contínua e relatórios claros.',
    benefits: ['Estratégia personalizada por plataforma', 'Otimização diária de campanhas', 'Relatórios semanais de performance', 'Funil de vendas estruturado'],
    questions: [
      { q: 'Você já investiu em anúncios pagos antes?', subtitle: 'Entender seu histórico é essencial.', options: ['Sim, com bons resultados', 'Sim, mas sem resultado', 'Nunca investi'], allowManual: true },
      { q: 'Qual plataforma te interessa mais?', subtitle: 'Cada plataforma tem um perfil de público.', options: ['Meta Ads (Instagram/Facebook)', 'Google Ads', 'Ambas', 'Não sei qual é melhor'], allowManual: true },
      { q: 'Qual seu orçamento mensal para anúncios?', subtitle: 'Investimento define alcance e velocidade.', options: ['Até R$ 1.000', 'R$ 1.000 a R$ 5.000', 'R$ 5.000 a R$ 20.000', 'Acima de R$ 20.000'] },
      { q: 'Qual seu principal objetivo com tráfego pago?', subtitle: 'Alinhamento é tudo.', options: ['Gerar leads/contatos', 'Vender direto pelo site', 'Fortalecer a marca', 'Lotar agenda de atendimentos'], allowManual: true },
    ],
  },
  'social-media': {
    name: 'Social Media',
    icon: Users,
    headline: 'Presença digital que gera autoridade e vendas',
    description: 'Gestão completa das suas redes sociais com conteúdo estratégico, calendário editorial e análise de resultados.',
    benefits: ['Calendário editorial mensal', 'Criação de conteúdo estratégico', 'Análise de métricas e engajamento', 'Posicionamento de autoridade'],
    questions: [
      { q: 'Qual rede social é mais importante para o seu negócio?', subtitle: 'Vamos focar onde seu cliente está.', options: ['Instagram', 'TikTok', 'LinkedIn', 'Todas igualmente'], allowManual: true },
      { q: 'Você já publica conteúdo regularmente?', subtitle: 'Consistência é fundamental.', options: ['Sim, diariamente', 'Sim, algumas vezes por semana', 'Esporadicamente', 'Quase nunca'] },
      { q: 'Quantos seguidores você tem hoje no Instagram?', subtitle: 'Nos ajuda a definir a estratégia de crescimento.', options: ['Menos de 1.000', '1.000 a 10.000', '10.000 a 50.000', 'Mais de 50.000'] },
      { q: 'O que você espera com a gestão de redes sociais?', subtitle: 'Cada objetivo demanda uma abordagem diferente.', options: ['Mais seguidores e engajamento', 'Gerar vendas', 'Posicionar como autoridade', 'Tudo isso'], allowManual: true },
    ],
  },
  'design-criativos': {
    name: 'Design & Criativos',
    icon: Palette,
    headline: 'Artes profissionais que convertem',
    description: 'Criação de artes para redes sociais, anúncios, identidade visual e materiais de alta conversão.',
    benefits: ['Artes personalizadas e on-brand', 'Criativos otimizados para conversão', 'Identidade visual profissional', 'Entrega rápida e organizada'],
    questions: [
      { q: 'Você já tem identidade visual definida?', subtitle: 'Logo, paleta de cores, tipografia...', options: ['Sim, completa', 'Parcialmente', 'Não tenho'], allowManual: true },
      { q: 'Que tipo de material você mais precisa?', subtitle: 'Cada material tem um objetivo.', options: ['Posts para redes sociais', 'Criativos para anúncios', 'Identidade visual completa', 'Apresentações e PDFs'], allowManual: true },
      { q: 'Qual a frequência de materiais que você precisa?', subtitle: 'Isso define o plano ideal.', options: ['Diária', 'Semanal', 'Mensal', 'Pontual'] },
      { q: 'Tem referências de marcas que admira visualmente?', subtitle: 'Referências ajudam a alinhar expectativas.', options: ['Sim, posso compartilhar', 'Tenho uma ideia', 'Não, preciso de sugestões'], allowManual: true },
    ],
  },
  'audiovisual': {
    name: 'Audiovisual',
    icon: Video,
    headline: 'Vídeos que conectam e vendem',
    description: 'Roteiros, edição de reels, vídeos institucionais e produção audiovisual completa para sua marca.',
    benefits: ['Roteiros estratégicos', 'Edição profissional de reels', 'Vídeos institucionais', 'Conteúdo para múltiplas plataformas'],
    questions: [
      { q: 'Que tipo de vídeo você precisa?', subtitle: 'Cada formato tem linguagem própria.', options: ['Reels / Shorts para Instagram', 'Vídeo institucional', 'Depoimentos de clientes', 'Vídeo de produto'], allowManual: true },
      { q: 'Você tem conteúdo gravado que precisa de edição?', subtitle: 'Podemos trabalhar com material existente.', options: ['Sim, tenho vídeos brutos', 'Tenho fotos que podem virar vídeo', 'Preciso gravar do zero'] },
      { q: 'Qual o objetivo principal dos vídeos?', subtitle: 'O objetivo define o tom e a narrativa.', options: ['Engajamento no Instagram', 'Conversão em vendas', 'Construir autoridade', 'Explicar produtos/serviços'], allowManual: true },
      { q: 'Com que frequência precisa de vídeos?', subtitle: 'Volume define o plano.', options: ['Diário', 'Semanal', 'Quinzenal', 'Mensal ou pontual'] },
    ],
  },
  'crm-automacao': {
    name: 'CRM & Automação',
    icon: Bot,
    headline: 'Nunca mais perca uma venda por falta de atendimento',
    description: 'Automatize o atendimento via WhatsApp com IA, qualifique leads e recupere oportunidades perdidas.',
    benefits: ['Bot inteligente no WhatsApp', 'Qualificação automática de leads', 'Recuperação de leads inativos', 'Dashboard de vendas em tempo real'],
    questions: [
      { q: 'Você usa WhatsApp para atender clientes?', subtitle: 'WhatsApp é o canal #1 no Brasil.', options: ['Sim, é meu principal canal', 'Sim, mas de forma desorganizada', 'Uso pouco', 'Não uso'] },
      { q: 'Quantos leads/contatos novos recebe por mês?', subtitle: 'Volume de leads define a complexidade.', options: ['Até 50', '50 a 200', '200 a 500', 'Mais de 500'] },
      { q: 'Você já usa algum CRM ou ferramenta de gestão?', subtitle: 'Saber o ponto de partida ajuda.', options: ['Sim, mas estou insatisfeito', 'Uso planilhas', 'Não uso nada', 'Uso mas quero melhorar'], allowManual: true },
      { q: 'O que mais te interessa em automação?', subtitle: 'Priorizamos suas necessidades.', options: ['Responder leads automaticamente', 'Qualificar leads por IA', 'Recuperar leads inativos', 'Tudo acima'], allowManual: true },
    ],
  },
  'sites-sistemas': {
    name: 'Sites & Sistemas',
    icon: Code,
    headline: 'Presença digital profissional e funcional',
    description: 'Sites institucionais, landing pages, sistemas web e aplicações sob medida para seu negócio.',
    benefits: ['Design moderno e responsivo', 'Otimizado para conversão', 'Integração com WhatsApp e CRM', 'Painel administrativo'],
    questions: [
      { q: 'Que tipo de projeto você precisa?', subtitle: 'Cada projeto tem complexidade diferente.', options: ['Site institucional', 'Landing page', 'Sistema web/aplicação', 'E-commerce'], allowManual: true },
      { q: 'Você já tem domínio e hospedagem?', subtitle: 'Podemos ajudar com isso também.', options: ['Sim, ambos', 'Tenho domínio apenas', 'Não tenho nada'] },
      { q: 'Qual funcionalidade mais importante?', subtitle: 'Nos ajuda a priorizar.', options: ['Formulário de contato/leads', 'Integração com WhatsApp', 'Painel administrativo', 'Pagamento online'], allowManual: true },
      { q: 'Qual seu prazo ideal de entrega?', subtitle: 'Planejamos conforme sua urgência.', options: ['Urgente (1-2 semanas)', '1 mês', '2-3 meses', 'Sem pressa'] },
    ],
  },
  'grafico-impresso': {
    name: 'Gráfico (Impresso)',
    icon: Printer,
    headline: 'Material impresso de alto impacto',
    description: 'Cartões de visita, banners, folders, embalagens e todo material gráfico impresso para sua marca.',
    benefits: ['Criação profissional', 'Arquivos prontos para impressão', 'Orçamento de gráfica integrado', 'Entrega rápida'],
    questions: [
      { q: 'Que tipo de material impresso você precisa?', subtitle: 'Cada peça tem especificações técnicas.', options: ['Cartão de visita', 'Banner / Faixa', 'Folder / Flyer', 'Embalagem / Rótulo'], allowManual: true },
      { q: 'Você já tem a identidade visual definida?', subtitle: 'Precisamos das cores e logo para produzir.', options: ['Sim, completa', 'Parcialmente', 'Preciso criar do zero'] },
      { q: 'Qual a quantidade estimada de impressão?', subtitle: 'Volume impacta custo e prazo.', options: ['Até 100 unidades', '100 a 500', '500 a 1.000', 'Mais de 1.000'], allowManual: true },
      { q: 'Você precisa de serviço de impressão também?', subtitle: 'Podemos cuidar de tudo.', options: ['Sim, criação + impressão', 'Só a arte/criação', 'Preciso de orçamento'] },
    ],
  },
};

type Stage = 'info' | 'quiz' | 'capture' | 'done';

const ServicePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const service = slug ? serviceData[slug] : null;

  const [stage, setStage] = useState<Stage>('info');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', message: '' });

  const { data: pageContent } = useQuery({
    queryKey: ['service-page-content', slug],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_page_content')
        .select('*')
        .eq('service_slug', slug!)
        .eq('is_active', true)
        .order('display_order');
      return data || [];
    },
    enabled: !!slug,
  });

  const images = pageContent?.filter((c: any) => c.content_type === 'image') || [];
  const videos = pageContent?.filter((c: any) => c.content_type === 'video') || [];
  const metrics = pageContent?.filter((c: any) => c.content_type === 'metric') || [];
  const testimonials = pageContent?.filter((c: any) => c.content_type === 'testimonial') || [];

  if (!service) {
    return (
      <div className="min-h-screen landing-page">
        <LandingNav />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Serviço não encontrado</h1>
            <button onClick={() => navigate('/servicos')} className="text-performake-accent hover:underline">Ver todos os serviços</button>
          </div>
        </div>
      </div>
    );
  }

  const questions = service.questions;
  const Icon = service.icon;
  const progress = stage === 'quiz' ? ((step + 1) / questions.length) * 100 : stage === 'capture' ? 100 : 0;

  const selectAnswer = (text: string) => {
    setAnswers(prev => ({ ...prev, [step]: text }));
    setShowManual(false);
    setManualInput('');
    if (step < questions.length - 1) {
      setTimeout(() => setStep(step + 1), 350);
    } else {
      setTimeout(() => setStage('capture'), 400);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.whatsapp) { toast.error('Preencha nome e WhatsApp.'); return; }
    setLoading(true);
    try {
      const answersText = Object.entries(answers).map(([qi, ans]) => `${questions[Number(qi)].q}: ${ans}`).join('\n');
      await supabase.from('service_requests').insert({
        name: form.name.trim(),
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim(),
        service_name: service.name,
        message: `${form.message}\n\n--- Respostas ---\n${answersText}`,
      });
      try {
        await supabase.functions.invoke('send-whatsapp-notification', {
          body: { event_type: 'service_request', data: { name: form.name, whatsapp: form.whatsapp, service_name: service.name, message: form.message } },
        });
      } catch {}
      setStage('done');
    } catch { toast.error('Erro ao enviar. Tente novamente.'); } finally { setLoading(false); }
  };

  // Get the first video or image for the hero
  const heroVideo = videos[0];
  const heroImage = images[0];
  const remainingImages = images.slice(heroVideo ? 0 : 1);

  return (
    <div className="min-h-screen overflow-x-hidden landing-page">
      <LandingNav />

      {/* HERO with media */}
      <section className="relative pt-28 pb-16 bg-performake-dark noise-overlay">
        <div className="absolute inset-0 bg-gradient-to-b from-performake-primary/10 via-transparent to-transparent" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
          <button onClick={() => navigate('/servicos')} className="text-white/30 hover:text-white text-sm flex items-center gap-2 transition-colors mb-8">
            <ArrowLeft size={14} /> Voltar
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-performake-accent/10 flex items-center justify-center">
              <Icon size={28} className="text-performake-accent" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-performake-accent text-xs font-medium uppercase tracking-[0.2em]">Serviço</span>
              <h1 className="text-3xl md:text-4xl font-black text-white">{service.name}</h1>
            </div>
          </div>
          <p className="text-white/40 text-lg mb-8 max-w-2xl leading-relaxed font-light">{service.description}</p>

          {/* Hero media - video or image */}
          {heroVideo && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="rounded-2xl overflow-hidden border border-white/[0.06] mb-8">
              <div className="aspect-video">
                {(() => {
                  const youtubeMatch = heroVideo.media_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                  const embedUrl = youtubeMatch ? `https://www.youtube.com/embed/${youtubeMatch[1]}` : heroVideo.media_url;
                  return <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />;
                })()}
              </div>
            </motion.div>
          )}

          {!heroVideo && heroImage && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="rounded-2xl overflow-hidden border border-white/[0.06] mb-8">
              <img src={heroImage.media_url} alt={heroImage.title || service.name} className="w-full aspect-video object-cover" />
            </motion.div>
          )}

          {/* Metrics */}
          {metrics.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {metrics.map((m: any, i: number) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                  className="text-center p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <p className="text-2xl md:text-3xl font-black text-performake-accent">{m.metric_value}</p>
                  <p className="text-xs text-white/40 mt-1">{m.metric_label}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Benefits */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {service.benefits.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className="flex items-center gap-3 text-white/60">
                <CheckCircle2 size={18} className="text-performake-accent shrink-0" />
                <span className="text-sm">{b}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CASES / PORTFOLIO */}
      <PortfolioCasesDisplay
        serviceTags={[service.name]}
        title={`Resultados em ${service.name}`}
        subtitle={`Cases reais de clientes com ${service.name}`}
      />

      {/* Additional images gallery */}
      {remainingImages.length > 0 && (
        <section className="bg-performake-dark py-16">
          <div className="max-w-5xl mx-auto px-6">
            <h3 className="text-lg font-bold text-white mb-6">Nossos trabalhos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {remainingImages.map((img: any) => (
                <div key={img.id} className="rounded-xl overflow-hidden border border-white/[0.06] group">
                  <img src={img.media_url} alt={img.title || ''} className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" />
                  {img.title && <p className="text-xs text-white/50 p-2 text-center">{img.title}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Additional videos */}
      {videos.length > 1 && (
        <section className="bg-performake-dark py-16">
          <div className="max-w-5xl mx-auto px-6">
            <h3 className="text-lg font-bold text-white mb-6">Veja na prática</h3>
            <div className="grid gap-4">
              {videos.slice(1).map((vid: any) => {
                const youtubeMatch = vid.media_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                const embedUrl = youtubeMatch ? `https://www.youtube.com/embed/${youtubeMatch[1]}` : vid.media_url;
                return (
                  <div key={vid.id} className="rounded-xl overflow-hidden border border-white/[0.06]">
                    <div className="aspect-video">
                      <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                    </div>
                    {vid.title && <p className="text-sm text-white/60 p-3">{vid.title}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-performake-dark py-16">
          <div className="max-w-5xl mx-auto px-6">
            <h3 className="text-lg font-bold text-white mb-6">O que dizem nossos clientes</h3>
            <div className="space-y-4">
              {testimonials.map((t: any) => (
                <div key={t.id} className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <Quote size={20} className="text-performake-accent/40 mb-2" />
                  <p className="text-white/60 text-sm italic leading-relaxed">{t.description}</p>
                  {t.metric_label && <p className="text-performake-accent text-xs font-semibold mt-3">— {t.metric_label}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* QUIZ / CTA SECTION */}
      <section className="bg-performake-dark py-20 noise-overlay">
        <div className="absolute inset-0 bg-gradient-to-b from-performake-primary/10 via-transparent to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {stage === 'info' && (
              <motion.div key="info-cta" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Interessado em {service.name}?</h2>
                <p className="text-white/40 mb-8">Responda algumas perguntas e receba uma proposta personalizada.</p>
                <motion.button
                  onClick={() => setStage('quiz')}
                  className="inline-flex items-center gap-3 bg-performake-accent text-performake-dark font-bold px-8 py-4 rounded-xl hover:bg-performake-accent/90 transition-colors text-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Solicitar este serviço <ArrowRight size={20} />
                </motion.button>
              </motion.div>
            )}

            {stage === 'quiz' && (
              <motion.div key={`quiz-${step}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto">
                <span className="text-performake-accent text-sm font-medium">{service.name}</span>
                <div className="mt-6 mb-10">
                  <div className="flex items-center justify-between text-xs text-white/30 mb-2">
                    <span>Pergunta {step + 1} de {questions.length}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-performake-accent/60 to-performake-accent rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                  </div>
                </div>
                <div className="flex items-start gap-4 mb-10">
                  <div className="w-10 h-10 rounded-full bg-performake-accent/10 flex items-center justify-center shrink-0 mt-1"><MessageCircle size={18} className="text-performake-accent" /></div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">{questions[step].q}</h2>
                    <p className="text-white/25 mt-2 text-sm font-light">{questions[step].subtitle}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {questions[step].options.map((opt, i) => (
                    <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                      onClick={() => selectAnswer(opt)}
                      className={`w-full text-left px-6 py-4 rounded-xl border transition-all duration-200 ${answers[step] === opt ? 'border-performake-accent bg-performake-accent/10 text-white' : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:border-white/20 hover:bg-white/[0.04]'}`}
                    >{opt}</motion.button>
                  ))}
                  {questions[step].allowManual && !showManual && (
                    <button onClick={() => setShowManual(true)} className="text-performake-accent/60 hover:text-performake-accent text-sm mt-2 transition-colors">Outra resposta...</button>
                  )}
                  {showManual && (
                    <div className="flex gap-2 mt-2">
                      <input value={manualInput} onChange={e => setManualInput(e.target.value)} placeholder="Escreva sua resposta" className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40" onKeyDown={e => e.key === 'Enter' && manualInput.trim() && selectAnswer(manualInput.trim())} />
                      <button onClick={() => manualInput.trim() && selectAnswer(manualInput.trim())} className="px-4 py-3 bg-performake-accent text-performake-dark rounded-lg font-medium text-sm">Enviar</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {stage === 'capture' && (
              <motion.div key="capture" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="max-w-lg mx-auto">
                <div className="text-center mb-10">
                  <CheckCircle2 size={48} className="text-performake-accent mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Ótimo! Quase lá</h2>
                  <p className="text-white/30 text-sm">Preencha seus dados e um especialista vai entrar em contato.</p>
                </div>
                <div className="space-y-4">
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Seu nome *" className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40" />
                  <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="WhatsApp * (com DDD)" className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40" />
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="E-mail (opcional)" className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40" />
                  <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Observação (opcional)" rows={3} className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40 resize-none" />
                  <motion.button onClick={handleSubmit} disabled={loading} className="w-full bg-performake-accent text-performake-dark font-bold py-4 rounded-xl hover:bg-performake-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <>Enviar solicitação <ArrowRight size={18} /></>}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {stage === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-lg mx-auto py-20">
                <CheckCircle2 size={64} className="text-performake-accent mx-auto mb-6" />
                <h2 className="text-3xl font-black text-white mb-4">Recebemos sua solicitação!</h2>
                <p className="text-white/40 text-lg mb-8">Um especialista vai entrar em contato pelo WhatsApp em breve.</p>
                <button onClick={() => navigate('/')} className="text-performake-accent hover:underline">Voltar ao início</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Lead Calculator for Tráfego Pago */}
      {slug === 'trafego-pago' && <LeadCalculator />}

      <FooterCTA />
    </div>
  );
};

export default ServicePage;
