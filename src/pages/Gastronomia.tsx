import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Loader2, MessageCircle, UtensilsCrossed, TrendingUp, Smartphone, Megaphone, Video, Palette, ShoppingBag, Star, Flame, ChefHat, Shield, Zap, Target, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import LandingNav from '@/components/landing/LandingNav';
import PortfolioCasesDisplay from '@/components/landing/PortfolioCasesDisplay';
import SEO from '@/components/SEO';


// ─── Method pillars (updated with systemic results) ───
const pillars = [
  {
    num: '01',
    title: 'Fundação Operacional',
    subtitle: 'Instalação do Ativo Digital',
    desc: 'Construímos o seu canal de vendas proprietário para que você seja o dono dos dados e do tráfego, não os aplicativos. Seu negócio precisa de um Protótipo de Franquia digital.',
    icon: Smartphone,
  },
  {
    num: '02',
    title: 'Máquina de Aquisição',
    subtitle: 'Atração de "Multidões Famintas"',
    desc: 'Campanhas geolocalizadas que maximizam o ROI focando no seu Resultado Sonhado e reduzindo o custo de aquisição (CAC). Clientes certos, na hora certa, perto de você.',
    icon: Target,
  },
  {
    num: '03',
    title: 'Fábrica de Desejo',
    subtitle: 'Documentar, Não Criar',
    desc: 'Transformamos sua rotina de cozinha em uma máquina de mídia que gera desejo orgânico e autoridade local sem exigir horas da sua equipe. Autenticidade que vende.',
    icon: Video,
  },
  {
    num: '04',
    title: 'Loop de Retenção',
    subtitle: 'Sistema de Recompra e LTV',
    desc: 'Automação baseada em inteligência de dados para garantir que cada cliente novo se torne um "regular" fervoroso, maximizando o lucro por mesa.',
    icon: TrendingUp,
  },
];

// ─── Services offered ───
const gastroServices = [
  { icon: ShoppingBag, title: 'Delivery Próprio', desc: 'Sistema de delivery sem taxas abusivas de marketplace. Seus dados, seu lucro.' },
  { icon: Palette, title: 'Cardápio Estratégico', desc: 'Cardápio visual com precificação estratégica e engenharia de menu profissional.' },
  { icon: Megaphone, title: 'Tráfego Pago Local', desc: 'Anúncios geolocalizados para atrair multidões famintas na sua região.' },
  { icon: Video, title: 'Audiovisual Gastronômico', desc: 'Conteúdo magnético que documenta sua rotina e gera desejo orgânico.' },
  { icon: Palette, title: 'Identidade Visual', desc: 'Branding completo para seu restaurante se destacar e criar autoridade.' },
  { icon: Smartphone, title: 'CRM & WhatsApp', desc: 'Atendimento automatizado e sistema de recompra inteligente.' },
];

// ─── Quiz questions (qualification-based) ───
const quizQuestions = [
  {
    q: 'Qual o faturamento mensal atual do seu restaurante?',
    subtitle: 'Precisamos entender seu patamar para dimensionar a estratégia ideal.',
    options: [
      'Menos de R$ 30 mil',
      'Entre R$ 30 mil e R$ 100 mil',
      'Acima de R$ 100 mil',
    ],
    scores: [1, 3, 5],
    qualificationNote: ['bait', 'ideal', 'vip'],
  },
  {
    q: 'Quanto da sua venda hoje depende de apps como iFood/Rappi?',
    subtitle: 'Vamos medir seu nível de dependência de marketplaces.',
    options: [
      'Menos de 20%',
      'Entre 20% e 50%',
      'Mais de 50%',
    ],
    scores: [2, 3, 5],
    qualificationNote: ['baixa-dependencia', 'media-dependencia', 'dor-massiva'],
  },
  {
    q: 'Você possui um Manual de Operações (SOP) escrito para sua equipe?',
    subtitle: 'Processos documentados são a base para escalar.',
    options: [
      'Sim, tudo é processado',
      'Algumas coisas, mas muito depende de mim',
      'Não, o restaurante só funciona se eu estiver lá',
    ],
    scores: [5, 3, 1],
    qualificationNote: ['processado', 'parcial', 'dependente'],
  },
  {
    q: 'Se dobrarmos seus pedidos amanhã, sua cozinha e logística aguentam?',
    subtitle: 'Capacidade operacional define o ritmo da escala.',
    options: [
      'Sim, estamos ociosos e prontos para o volume',
      'Aguentam com alguns ajustes',
      'Não, já estamos no limite',
    ],
    scores: [5, 3, 1],
    qualificationNote: ['pronto', 'ajustes', 'gargalo'],
  },
  {
    q: 'Qual sua disposição para investir em tráfego pago mensalmente?',
    subtitle: 'O investimento em anúncios define a velocidade dos resultados.',
    options: [
      'R$ 0 a R$ 1.000',
      'R$ 1.000 a R$ 5.000',
      'Acima de R$ 5.000',
    ],
    scores: [1, 3, 5],
    qualificationNote: ['baixo', 'ideal', 'agressivo'],
  },
];

const getGastroQualification = (totalScore: number) => {
  if (totalScore >= 20) return { level: 'Alta Maturidade', color: 'text-green-400', desc: 'Seu negócio tem base sólida para escala agressiva. Você é o perfil ideal para o Sistema de Aceleração Gastronômica.' };
  if (totalScore >= 12) return { level: 'Maturidade Intermediária', color: 'text-yellow-400', desc: 'Seu restaurante tem potencial real. Com os ajustes certos nos pilares, é possível triplicar as vendas diretas.' };
  return { level: 'Fase de Estruturação', color: 'text-orange-400', desc: 'Antes de escalar, precisamos construir sua fundação operacional. O Pilar 01 (Protótipo de Franquia) é prioridade.' };
};

const Gastronomia = () => {
  const navigate = useNavigate();
  const [quizStarted, setQuizStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answerScores, setAnswerScores] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', business_name: '' });
  const [stage, setStage] = useState<'quiz' | 'capture' | 'done'>('quiz');

  // Fetch gastro clients for logos
  const { data: gastroClients } = useQuery({
    queryKey: ['gastro-clients-real'],
    queryFn: async () => {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .ilike('business_segment', '%gastro%');
      return clients || [];
    },
    staleTime: 1000 * 60 * 30,
  });

  const progress = ((step + 1) / quizQuestions.length) * 100;

  const selectAnswer = (text: string, optIndex: number) => {
    setAnswers(prev => ({ ...prev, [step]: text }));
    setAnswerScores(prev => ({ ...prev, [step]: quizQuestions[step].scores[optIndex] }));
    if (step < quizQuestions.length - 1) {
      setTimeout(() => setStep(step + 1), 350);
    } else {
      setTimeout(() => setStage('capture'), 400);
    }
  };

  const totalScore = Object.values(answerScores).reduce((a, b) => a + b, 0);
  const qualification = getGastroQualification(totalScore);

  const handleSubmit = async () => {
    if (!form.name || !form.whatsapp) { toast.error('Preencha nome e WhatsApp.'); return; }
    setLoading(true);
    try {
      const answersText = Object.entries(answers).map(([qi, ans]) => `${quizQuestions[Number(qi)].q}: ${ans}`).join('\n');
      await supabase.from('service_requests').insert({
        name: form.name.trim(),
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim(),
        service_name: 'Gastronomia — Sistema de Aceleração',
        message: `Negócio: ${form.business_name}\nScore: ${totalScore}/25 (${qualification.level})\n\n--- Respostas ---\n${answersText}`,
      });
      try {
        await supabase.functions.invoke('send-whatsapp-notification', {
          body: { event_type: 'service_request', data: { name: form.name, whatsapp: form.whatsapp, service_name: 'Gastronomia', message: `Negócio: ${form.business_name} | Score: ${totalScore}/25 (${qualification.level})` } },
        });
      } catch {}
      setStage('done');
    } catch { toast.error('Erro ao enviar. Tente novamente.'); } finally { setLoading(false); }
  };

  const scrollToQuiz = () => {
    setQuizStarted(true);
    setTimeout(() => {
      document.getElementById('quiz-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <SEO 
        title="Marketing para Restaurantes e Gastronomia"
        description="Aceleração de vendas para restaurantes. Triplique suas vendas diretas e elimine taxas de marketplace com o Sistema de Aceleração Gastronômica."
      />
      <LandingNav />


      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center bg-gastro-dark overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gastro-accent/[0.04] via-transparent to-gastro-primary/20" />
        <div className="absolute top-20 right-10 w-80 h-80 rounded-full bg-gastro-accent/[0.03] blur-[120px]" />
        <div className="absolute bottom-10 left-10 w-60 h-60 rounded-full bg-gastro-accent/[0.05] blur-[100px]" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 pt-32 pb-20 w-full">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-3 bg-gastro-accent/[0.08] backdrop-blur-sm border border-gastro-accent/20 rounded-full px-5 py-2 mb-8">
              <Flame size={16} className="text-gastro-accent" />
              <span className="text-gastro-accent text-xs font-bold uppercase tracking-[0.2em]">Sistema de Aceleração Gastronômica</span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-gastro-text leading-[1.08] tracking-[-0.03em] max-w-5xl">
              Como Restaurantes de Alta Performance{' '}
              <span className="text-gastro-accent">Triplicam as Vendas Diretas</span>{' '}
              e Eliminam Taxas de Marketplace em 90 dias
            </h1>
            <p className="text-white/60 text-sm mt-4 max-w-xl italic">
              Sem depender de sorte ou tecnologia complexa.
            </p>

            <p className="text-gastro-muted text-lg md:text-xl mt-8 max-w-3xl leading-relaxed font-light">
              Pare de dar 30% da sua margem para marketplaces. Implementamos o{' '}
              <span className="text-gastro-accent font-semibold">Protótipo de Franquia</span> na sua operação,
              transformando seu marketing em um ativo que funciona sozinho, atraindo clientes que voltam sempre
              por causa da sua <span className="text-gastro-accent font-semibold">Hospitalidade Não Razoável</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-12">
              <motion.button
                onClick={() => document.getElementById('method-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-3 bg-gastro-accent text-gastro-darker font-black px-10 py-5 rounded-xl text-lg hover:brightness-110 transition-all shadow-xl shadow-gastro-accent/20"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <ChefHat size={22} /> Conhecer o sistema <ArrowRight size={20} />
              </motion.button>
              <motion.button
                onClick={scrollToQuiz}
                className="inline-flex items-center justify-center gap-3 border-2 border-gastro-accent/30 text-gastro-accent font-bold px-10 py-5 rounded-xl text-lg hover:bg-gastro-accent/10 transition-all"
                whileHover={{ scale: 1.02 }}
              >
                Quero triplicar minhas vendas
              </motion.button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-6 mt-16 pt-8 border-t border-white/[0.06]">
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gastro-accent/20 border-2 border-gastro-dark flex items-center justify-center">
                    <UtensilsCrossed size={14} className="text-gastro-accent" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map(i => <Star key={i} size={14} className="text-gastro-accent fill-gastro-accent" />)}
                </div>
                <p className="text-gastro-muted text-xs mt-0.5">Sistema validado em restaurantes de alta performance</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── GASTRO CLIENT LOGOS ─── */}
      {gastroClients && gastroClients.length > 0 && (
        <section className="bg-gastro-darker py-16 border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-center text-gastro-accent text-xs font-bold uppercase tracking-[0.2em] mb-8">Clientes do nicho gastronômico</p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {gastroClients.map((c: any) => (
                <div key={c.id} className="flex flex-col items-center gap-2">
                  {c.logo_url ? (
                    <div className="w-16 h-16 rounded-full border-2 border-gastro-accent/20 overflow-hidden bg-white/5 flex items-center justify-center p-0.5">
                      <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover rounded-full" loading="lazy" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gastro-accent/10 flex items-center justify-center border-2 border-gastro-accent/20">
                      <span className="text-gastro-accent font-black text-xl">{c.name.charAt(0)}</span>
                    </div>
                  )}
                  <span className="text-gastro-muted text-[10px] font-medium">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── METHOD ─── */}
      <section id="method-section" className="relative bg-gastro-darker py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gastro-accent/[0.02] to-transparent" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="text-gastro-accent text-xs font-bold uppercase tracking-[0.2em]">O Sistema</span>
            <h2 className="text-3xl md:text-5xl font-black text-gastro-text mt-4 tracking-[-0.02em]">
              4 pilares para <span className="text-gastro-accent">triplicar</span> suas vendas diretas
            </h2>
            <p className="text-gastro-muted mt-4 text-lg max-w-2xl font-light">
              Um sistema completo que transforma seu restaurante em uma máquina de aquisição, conversão e retenção — sem depender de marketplaces.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 mt-14">
            {pillars.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="relative bg-white/[0.03] backdrop-blur-sm border border-gastro-accent/10 rounded-2xl p-8 hover:border-gastro-accent/30 transition-all duration-500 group"
              >
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-gastro-accent/30 text-5xl font-black">{p.num}</span>
                  <div className="w-12 h-12 rounded-xl bg-gastro-accent/10 flex items-center justify-center group-hover:bg-gastro-accent/20 transition-colors">
                    <p.icon size={22} className="text-gastro-accent" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="text-gastro-text font-bold text-xl mb-1">{p.title}</h3>
                <p className="text-gastro-accent text-sm font-semibold mb-3">{p.subtitle}</p>
                <p className="text-gastro-muted text-sm leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICES ─── */}
      <section className="relative bg-gastro-dark py-24 md:py-32 overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-gastro-accent text-xs font-bold uppercase tracking-[0.2em]">O que entregamos</span>
            <h2 className="text-3xl md:text-5xl font-black text-gastro-text mt-4 tracking-[-0.02em]">
              Tudo que seu restaurante precisa
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
            {gastroServices.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 * i }}
                className="bg-white/[0.03] border border-gastro-accent/10 rounded-2xl p-7 hover:border-gastro-accent/25 transition-all duration-500"
              >
                <div className="w-12 h-12 rounded-xl bg-gastro-accent/10 flex items-center justify-center mb-5">
                  <s.icon size={22} className="text-gastro-accent" strokeWidth={1.5} />
                </div>
                <h3 className="text-gastro-text font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-gastro-muted text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GUARANTEE SECTION ─── */}
      <section className="relative bg-gastro-darker py-20 md:py-28 overflow-hidden border-t border-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-b from-gastro-accent/[0.03] to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gastro-accent/10 border border-gastro-accent/20 mb-8">
              <Shield size={36} className="text-gastro-accent" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gastro-text mb-6 tracking-[-0.02em]">
              Nossa Garantia <span className="text-gastro-accent">"Feel Stupid Saying No"</span>
            </h2>
            <p className="text-gastro-muted text-lg md:text-xl leading-relaxed max-w-3xl mx-auto font-light">
              Se não entregarmos resultados tangíveis e mensuráveis nos primeiros 90 dias,{' '}
              <span className="text-gastro-accent font-semibold">trabalhamos de graça</span>{' '}
              até você atingir a meta. O risco é 100% nosso.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-10">
              <div className="flex items-center gap-2 text-gastro-muted text-sm">
                <Zap size={16} className="text-gastro-accent" />
                <span>Risco zero para você</span>
              </div>
              <div className="flex items-center gap-2 text-gastro-muted text-sm">
                <BarChart3 size={16} className="text-gastro-accent" />
                <span>Resultados mensuráveis</span>
              </div>
              <div className="flex items-center gap-2 text-gastro-muted text-sm">
                <Target size={16} className="text-gastro-accent" />
                <span>Metas claras desde o dia 1</span>
              </div>
            </div>
            <motion.button
              onClick={scrollToQuiz}
              className="mt-12 inline-flex items-center gap-3 bg-gastro-accent text-gastro-darker font-black px-10 py-5 rounded-xl text-lg hover:brightness-110 transition-all shadow-xl shadow-gastro-accent/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Quero resultados garantidos <ArrowRight size={20} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ─── PORTFOLIO / RESULTS ─── */}
      <PortfolioCasesDisplay
        niche="gastronomia"
        variant="gastro"
        title="Resultados na gastronomia"
        subtitle="Clientes reais do nosso Sistema de Aceleração Gastronômica"
      />

      {/* ─── QUIZ / CTA SECTION ─── */}
      <section id="quiz-section" className="relative bg-gastro-darker py-24 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-gastro-accent/[0.02] to-transparent" />
        <div className="relative z-10 max-w-2xl mx-auto px-6">

          {!quizStarted && stage === 'quiz' && (
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
              <ChefHat size={48} className="text-gastro-accent mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-black text-gastro-text mb-4">
                Descubra o nível de maturidade do seu restaurante
              </h2>
              <p className="text-gastro-muted text-lg mb-10 max-w-lg mx-auto font-light">
                Responda 5 perguntas estratégicas e descubra se seu negócio está pronto para triplicar as vendas diretas.
              </p>
              <motion.button
                onClick={() => setQuizStarted(true)}
                className="inline-flex items-center gap-3 bg-gastro-accent text-gastro-darker font-black px-10 py-5 rounded-xl text-lg hover:brightness-110 transition-all shadow-xl shadow-gastro-accent/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Começar qualificação <ArrowRight size={20} />
              </motion.button>
            </motion.div>
          )}

          {quizStarted && stage === 'quiz' && (
            <AnimatePresence mode="wait">
              <motion.div key={`q-${step}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.5 }}>
                <span className="text-gastro-accent text-sm font-medium">Gastronomia — Qualificação de Maturidade</span>
                <div className="mt-6 mb-10">
                  <div className="flex items-center justify-between text-xs text-gastro-muted mb-2">
                    <span>Pergunta {step + 1} de {quizQuestions.length}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-gastro-accent/60 to-gastro-accent rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                  </div>
                </div>

                <div className="flex items-start gap-4 mb-10">
                  <div className="w-10 h-10 rounded-full bg-gastro-accent/10 flex items-center justify-center shrink-0 mt-1">
                    <MessageCircle size={18} className="text-gastro-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gastro-text leading-tight">{quizQuestions[step].q}</h2>
                    <p className="text-gastro-muted mt-2 text-sm font-light">{quizQuestions[step].subtitle}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {quizQuestions[step].options.map((opt, i) => (
                    <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                      onClick={() => selectAnswer(opt, i)}
                      className={`w-full text-left px-6 py-4 rounded-xl border transition-all duration-200 ${answers[step] === opt ? 'border-gastro-accent bg-gastro-accent/10 text-gastro-text' : 'border-white/[0.06] bg-white/[0.02] text-gastro-muted hover:border-gastro-accent/30 hover:bg-white/[0.04]'}`}
                    >{opt}</motion.button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {stage === 'capture' && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="text-center mb-10">
                <CheckCircle2 size={48} className="text-gastro-accent mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gastro-text mb-2">Resultado: {qualification.level}</h2>
                <p className="text-gastro-muted text-sm max-w-md mx-auto">{qualification.desc}</p>
                <div className="mt-4 inline-flex items-center gap-2 bg-gastro-accent/10 border border-gastro-accent/20 rounded-full px-4 py-2">
                  <BarChart3 size={14} className="text-gastro-accent" />
                  <span className={`text-sm font-bold ${qualification.color}`}>Score: {totalScore}/25</span>
                </div>
              </div>
              <p className="text-gastro-muted text-sm text-center mb-6">Preencha seus dados e um especialista vai montar uma estratégia exclusiva para seu restaurante.</p>
              <div className="space-y-4">
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Seu nome *" className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-gastro-text placeholder:text-gastro-muted/40 focus:outline-none focus:border-gastro-accent/40" />
                <input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="Nome do restaurante / negócio" className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-gastro-text placeholder:text-gastro-muted/40 focus:outline-none focus:border-gastro-accent/40" />
                <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="WhatsApp * (com DDD)" className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-gastro-text placeholder:text-gastro-muted/40 focus:outline-none focus:border-gastro-accent/40" />
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="E-mail (opcional)" className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-gastro-text placeholder:text-gastro-muted/40 focus:outline-none focus:border-gastro-accent/40" />
                <motion.button onClick={handleSubmit} disabled={loading} className="w-full bg-gastro-accent text-gastro-darker font-bold py-4 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-gastro-accent/20" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <>Receber minha estratégia <ArrowRight size={18} /></>}
                </motion.button>
              </div>
            </motion.div>
          )}

          {stage === 'done' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <CheckCircle2 size={64} className="text-gastro-accent mx-auto mb-6" />
              <h2 className="text-3xl font-black text-gastro-text mb-4">Recebemos sua solicitação!</h2>
              <p className="text-gastro-muted text-lg mb-8">Um especialista em gastronomia vai entrar em contato pelo WhatsApp em breve com uma estratégia personalizada.</p>
              <button onClick={() => navigate('/')} className="text-gastro-accent hover:underline font-medium">Voltar ao início</button>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Gastronomia;
