import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, Loader2, Compass, Megaphone, Users, Palette, Video, Bot, MessageCircle, Code, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import LandingNav from '@/components/landing/LandingNav';
import FooterCTA from '@/components/landing/FooterCTA';
import SEO from '@/components/SEO';


const iconMap: Record<string, any> = {
  'Consultoria Estratégica': Compass,
  'Tráfego Pago': Megaphone,
  'Social Media': Users,
  'Design & Criativos': Palette,
  'Audiovisual': Video,
  'CRM & Automação': Bot,
  'Desenvolvimento de Sistemas & Sites': Code,
  'Gráfico (Impresso)': Printer,
};

// Perguntas personalizadas por serviço
const serviceQuestions: Record<string, Array<{
  q: string;
  subtitle: string;
  options: string[];
  allowManual?: boolean;
}>> = {
  'Consultoria Estratégica': [
    { q: 'Qual o principal desafio do seu negócio hoje?', subtitle: 'Queremos entender onde está o gargalo.', options: ['Falta de posicionamento claro', 'Não consigo escalar vendas', 'Não sei por onde começar no digital', 'Meu marketing não traz resultado'], allowManual: true },
    { q: 'Você já tem metas de faturamento definidas?', subtitle: 'Metas orientam toda a estratégia.', options: ['Sim, claras e mensuráveis', 'Tenho metas vagas', 'Não tenho metas definidas'] },
    { q: 'Qual o faturamento mensal da empresa?', subtitle: 'Ajuda a dimensionar a estratégia.', options: ['Até R$ 10 mil', 'R$ 10 mil a R$ 50 mil', 'R$ 50 mil a R$ 200 mil', 'Acima de R$ 200 mil'] },
    { q: 'Qual sua urgência para começar?', subtitle: 'Priorizamos conforme sua necessidade.', options: ['Imediata — preciso agora', 'Nos próximos 30 dias', 'Estou pesquisando opções'] },
  ],
  'Tráfego Pago': [
    { q: 'Você já investiu em anúncios pagos antes?', subtitle: 'Entender seu histórico é essencial.', options: ['Sim, com bons resultados', 'Sim, mas sem resultado', 'Nunca investi'], allowManual: true },
    { q: 'Qual plataforma te interessa mais?', subtitle: 'Cada plataforma tem um perfil de público.', options: ['Meta Ads (Instagram/Facebook)', 'Google Ads', 'Ambas', 'Não sei qual é melhor'], allowManual: true },
    { q: 'Qual seu orçamento mensal para anúncios?', subtitle: 'Investimento define alcance e velocidade.', options: ['Até R$ 1.000', 'R$ 1.000 a R$ 5.000', 'R$ 5.000 a R$ 20.000', 'Acima de R$ 20.000'] },
    { q: 'Qual seu principal objetivo com tráfego pago?', subtitle: 'Alinhamento é tudo.', options: ['Gerar leads/contatos', 'Vender direto pelo site', 'Fortalecer a marca', 'Lotar agenda de atendimentos'], allowManual: true },
  ],
  'Social Media': [
    { q: 'Qual rede social é mais importante para o seu negócio?', subtitle: 'Vamos focar onde seu cliente está.', options: ['Instagram', 'TikTok', 'LinkedIn', 'Todas igualmente'], allowManual: true },
    { q: 'Você já publica conteúdo regularmente?', subtitle: 'Consistência é fundamental.', options: ['Sim, diariamente', 'Sim, algumas vezes por semana', 'Esporadicamente', 'Quase nunca'] },
    { q: 'Quantos seguidores você tem hoje no Instagram?', subtitle: 'Nos ajuda a definir a estratégia de crescimento.', options: ['Menos de 1.000', '1.000 a 10.000', '10.000 a 50.000', 'Mais de 50.000'] },
    { q: 'O que você espera com a gestão de redes sociais?', subtitle: 'Cada objetivo demanda uma abordagem diferente.', options: ['Mais seguidores e engajamento', 'Gerar vendas', 'Posicionar como autoridade', 'Tudo isso'], allowManual: true },
  ],
  'Design & Criativos': [
    { q: 'Você já tem identidade visual definida?', subtitle: 'Logo, paleta de cores, tipografia...', options: ['Sim, completa', 'Parcialmente', 'Não tenho'], allowManual: true },
    { q: 'Que tipo de material você mais precisa?', subtitle: 'Cada material tem um objetivo.', options: ['Posts para redes sociais', 'Criativos para anúncios', 'Identidade visual completa', 'Apresentações e PDFs'], allowManual: true },
    { q: 'Qual a frequência de materiais que você precisa?', subtitle: 'Isso define o plano ideal.', options: ['Diária', 'Semanal', 'Mensal', 'Pontual'] },
    { q: 'Tem referências de marcas que admira visualmente?', subtitle: 'Referências ajudam a alinhar expectativas.', options: ['Sim, posso compartilhar', 'Tenho uma ideia', 'Não, preciso de sugestões'], allowManual: true },
  ],
  'Audiovisual': [
    { q: 'Que tipo de vídeo você precisa?', subtitle: 'Cada formato tem linguagem própria.', options: ['Reels / Shorts para Instagram', 'Vídeo institucional', 'Depoimentos de clientes', 'Vídeo de produto'], allowManual: true },
    { q: 'Você tem conteúdo gravado que precisa de edição?', subtitle: 'Podemos trabalhar com material existente.', options: ['Sim, tenho vídeos brutos', 'Tenho fotos que podem virar vídeo', 'Preciso gravar do zero'] },
    { q: 'Qual o objetivo principal dos vídeos?', subtitle: 'O objetivo define o tom e a narrativa.', options: ['Engajamento no Instagram', 'Conversão em vendas', 'Construir autoridade', 'Explicar produtos/serviços'], allowManual: true },
    { q: 'Com que frequência precisa de vídeos?', subtitle: 'Volume define o plano.', options: ['Diário', 'Semanal', 'Quinzenal', 'Mensal ou pontual'] },
  ],
  'CRM & Automação': [
    { q: 'Você usa WhatsApp para atender clientes?', subtitle: 'WhatsApp é o canal #1 no Brasil.', options: ['Sim, é meu principal canal', 'Sim, mas de forma desorganizada', 'Uso pouco', 'Não uso'] },
    { q: 'Quantos leads/contatos novos recebe por mês?', subtitle: 'Volume de leads define a complexidade.', options: ['Até 50', '50 a 200', '200 a 500', 'Mais de 500'] },
    { q: 'Você já usa algum CRM ou ferramenta de gestão?', subtitle: 'Saber o ponto de partida ajuda.', options: ['Sim, mas estou insatisfeito', 'Uso planilhas', 'Não uso nada', 'Uso mas quero melhorar'], allowManual: true },
    { q: 'O que mais te interessa em automação?', subtitle: 'Priorizamos suas necessidades.', options: ['Responder leads automaticamente', 'Qualificar leads por IA', 'Recuperar leads inativos', 'Tudo acima'], allowManual: true },
  ],
  'Desenvolvimento de Sistemas & Sites': [
    { q: 'Que tipo de projeto você precisa?', subtitle: 'Cada projeto tem complexidade diferente.', options: ['Site institucional', 'Landing page', 'Sistema web/aplicação', 'E-commerce'], allowManual: true },
    { q: 'Você já tem domínio e hospedagem?', subtitle: 'Podemos ajudar com isso também.', options: ['Sim, ambos', 'Tenho domínio apenas', 'Não tenho nada'] },
    { q: 'Qual funcionalidade mais importante?', subtitle: 'Nos ajuda a priorizar.', options: ['Formulário de contato/leads', 'Integração com WhatsApp', 'Painel administrativo', 'Pagamento online'], allowManual: true },
    { q: 'Qual seu prazo ideal de entrega?', subtitle: 'Planejamos conforme sua urgência.', options: ['Urgente (1-2 semanas)', '1 mês', '2-3 meses', 'Sem pressa'] },
  ],
  'Gráfico (Impresso)': [
    { q: 'Que tipo de material impresso você precisa?', subtitle: 'Cada peça tem especificações técnicas.', options: ['Cartão de visita', 'Banner / Faixa', 'Folder / Flyer', 'Embalagem / Rótulo'], allowManual: true },
    { q: 'Você já tem a identidade visual definida?', subtitle: 'Precisamos das cores e logo para produzir.', options: ['Sim, completa', 'Parcialmente', 'Preciso criar do zero'] },
    { q: 'Qual a quantidade estimada de impressão?', subtitle: 'Volume impacta custo e prazo.', options: ['Até 100 unidades', '100 a 500', '500 a 1.000', 'Mais de 1.000'], allowManual: true },
    { q: 'Você precisa de serviço de impressão também?', subtitle: 'Podemos cuidar de tudo.', options: ['Sim, criação + impressão', 'Só a arte/criação', 'Preciso de orçamento'] },
  ],
};

// Fallback for services not in the map
const defaultQuestions = [
  { q: 'Qual o principal objetivo com esse serviço?', subtitle: 'Isso nos ajuda a entender a prioridade do seu negócio.', options: ['Aumentar vendas', 'Melhorar posicionamento', 'Automatizar processos', 'Criar presença digital'], allowManual: true },
  { q: 'Qual o faturamento mensal da sua empresa hoje?', subtitle: 'Nos ajuda a dimensionar a estratégia ideal.', options: ['Até R$ 10 mil', 'R$ 10 mil a R$ 50 mil', 'R$ 50 mil a R$ 200 mil', 'Acima de R$ 200 mil'] },
  { q: 'Você já investe em marketing digital atualmente?', subtitle: 'Queremos entender seu histórico.', options: ['Sim, com equipe interna', 'Sim, com agência', 'Faço por conta própria', 'Ainda não invisto'], allowManual: true },
  { q: 'Qual sua urgência para começar?', subtitle: 'Assim priorizamos o atendimento.', options: ['Imediata — preciso agora', 'Nos próximos 30 dias', 'Estou pesquisando opções'] },
];

// Static service list (fallback if DB is empty)
const staticServices = [
  { id: 'consultoria', name: 'Consultoria Estratégica', description: 'Análise estratégica, plano de ação e acompanhamento mensal.' },
  { id: 'trafego', name: 'Tráfego Pago', description: 'Gestão de anúncios no Google e Meta Ads.' },
  { id: 'social', name: 'Social Media', description: 'Gestão completa de redes sociais.' },
  { id: 'design', name: 'Design & Criativos', description: 'Artes profissionais e identidade visual.' },
  { id: 'audiovisual', name: 'Audiovisual', description: 'Roteiros, reels e produção de vídeo.' },
  { id: 'crm', name: 'CRM & Automação', description: 'Atendimento automatizado via WhatsApp com IA.' },
  { id: 'dev', name: 'Desenvolvimento de Sistemas & Sites', description: 'Sites, landing pages e sistemas web.' },
  { id: 'grafico', name: 'Gráfico (Impresso)', description: 'Cartões, banners, folders e material impresso.' },
];

type Stage = 'list' | 'quiz' | 'capture' | 'done';

const Servicos = () => {
  const [stage, setStage] = useState<Stage>('list');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', message: '' });
  const navigate = useNavigate();

  const getQuestions = () => {
    if (!selectedService) return defaultQuestions;
    return serviceQuestions[selectedService.name] || defaultQuestions;
  };

  const questions = getQuestions();

  const selectService = (svc: any) => {
    setSelectedService(svc);
    setStage('quiz');
    setStep(0);
    setAnswers({});
  };

  const selectAnswer = (optionText: string) => {
    setAnswers((prev) => ({ ...prev, [step]: optionText }));
    setShowManual(false);
    setManualInput('');
    if (step < questions.length - 1) {
      setTimeout(() => setStep(step + 1), 350);
    } else {
      setTimeout(() => setStage('capture'), 400);
    }
  };

  const submitManual = () => {
    if (!manualInput.trim()) return;
    selectAnswer(manualInput.trim());
  };

  const handleSubmit = async () => {
    if (!form.name || !form.whatsapp) {
      toast.error('Preencha nome e WhatsApp.');
      return;
    }
    setLoading(true);
    try {
      const answersText = Object.entries(answers)
        .map(([qi, ans]) => `${questions[Number(qi)].q}: ${ans}`)
        .join('\n');

      await supabase.from('service_requests').insert({
        name: form.name.trim(),
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim(),
        service_id: selectedService?.id?.length === 36 ? selectedService.id : null,
        service_name: selectedService?.name || 'Não especificado',
        message: `${form.message}\n\n--- Respostas ---\n${answersText}`,
      });

      try {
        await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            event_type: 'service_request',
            data: { name: form.name, whatsapp: form.whatsapp, service_name: selectedService?.name, message: form.message },
          },
        });
      } catch (e) {
        console.error('WhatsApp notification failed:', e);
      }

      setStage('done');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const progress = stage === 'quiz' ? ((step + 1) / questions.length) * 100 : stage === 'capture' ? 100 : 0;

  return (
    <div className="min-h-screen overflow-x-hidden landing-page">
      <SEO 
        title="Serviços de Marketing e Consultoria"
        description="Conheça nossas soluções em Tráfego Pago, Social Media, Design, Audiovisual, CRM e muito mais. Estratégias sob medida para o crescimento do seu negócio."
      />
      <LandingNav />


      <section className="relative min-h-screen pt-28 pb-24 bg-performake-dark noise-overlay">
        <div className="absolute inset-0 bg-gradient-to-b from-performake-primary/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-performake-accent/[0.03] blur-[200px]" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
          {/* Back to home */}
          {stage === 'list' && (
            <button
              onClick={() => navigate('/')}
              className="text-white/30 hover:text-white text-sm flex items-center gap-2 transition-colors mb-8"
            >
              <ArrowLeft size={14} /> Voltar ao início
            </button>
          )}

          <AnimatePresence mode="wait">
            {/* SERVICE LIST */}
            {stage === 'list' && (
              <motion.div key="list" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6 }}>
                <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-3 bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-full px-5 py-2 mb-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-performake-accent animate-pulse" />
                    <span className="text-white/60 text-[11px] font-medium uppercase tracking-[0.2em]">Nossos serviços</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mt-4 tracking-[-0.02em] leading-[1.1]">
                    Soluções sob medida para
                    <br />
                    <span className="text-gradient-accent">o seu negócio</span>
                  </h1>
                  <p className="text-white/35 text-lg mt-6 max-w-2xl mx-auto leading-relaxed font-light">
                    Escolha o serviço e nosso especialista vai te guiar com perguntas personalizadas.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {staticServices.map((svc, i) => {
                    const Icon = iconMap[svc.name] || Compass;
                    return (
                      <motion.button
                        key={svc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.06 * i }}
                        onClick={() => selectService(svc)}
                        className="group text-left p-8 rounded-2xl glass-card-light hover:bg-white/[0.05] hover:border-performake-accent/20 transition-all duration-500"
                      >
                        <div className="w-12 h-12 rounded-xl bg-performake-accent/10 flex items-center justify-center mb-5 group-hover:bg-performake-accent/20 transition-colors duration-300">
                          <Icon size={22} className="text-performake-accent" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2 group-hover:text-performake-accent transition-colors">{svc.name}</h3>
                        {svc.description && (
                          <p className="text-white/30 text-sm leading-relaxed mb-6 font-light">{svc.description}</p>
                        )}
                        <span className="text-performake-accent text-sm font-medium inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                          Solicitar <ArrowRight size={14} />
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* QUIZ */}
            {stage === 'quiz' && (
              <motion.div key={`quiz-${step}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto">
                <button
                  onClick={() => step === 0 ? setStage('list') : setStep(step - 1)}
                  className="text-white/30 hover:text-white text-sm flex items-center gap-2 transition-colors mb-8"
                >
                  <ArrowLeft size={14} /> {step === 0 ? 'Voltar aos serviços' : 'Voltar'}
                </button>

                <span className="text-performake-accent text-sm font-medium">{selectedService?.name}</span>

                <div className="mt-6 mb-10">
                  <div className="flex items-center justify-between text-xs text-white/30 mb-2">
                    <span className="font-medium">Pergunta {step + 1} de {questions.length}</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-performake-accent/60 to-performake-accent rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                  </div>
                </div>

                <div className="flex items-start gap-4 mb-10">
                  <div className="w-10 h-10 rounded-full bg-performake-accent/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <MessageCircle size={18} className="text-performake-accent" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">{questions[step].q}</h2>
                    {questions[step].subtitle && <p className="text-white/25 mt-2 text-sm font-light">{questions[step].subtitle}</p>}
                  </div>
                </div>

                <div className="space-y-3 ml-14">
                  {questions[step].options.map((opt, oi) => {
                    const isSelected = answers[step] === opt;
                    return (
                      <motion.button
                        key={oi}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * oi }}
                        onClick={() => selectAnswer(opt)}
                        className={`w-full text-left p-5 rounded-xl border transition-all duration-300 flex items-center gap-4 ${
                          isSelected
                            ? 'border-performake-accent bg-performake-accent/10 text-white'
                            : 'border-white/[0.06] bg-white/[0.02] text-white/50 hover:border-performake-accent/30 hover:bg-white/[0.04] hover:text-white/70'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isSelected ? 'border-performake-accent bg-performake-accent scale-110' : 'border-white/20'
                        }`}>
                          {isSelected && <CheckCircle2 size={14} className="text-[hsl(186,94%,7%)]" />}
                        </span>
                        <span className="font-medium">{opt}</span>
                      </motion.button>
                    );
                  })}

                  {questions[step].allowManual && !showManual && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                      onClick={() => setShowManual(true)}
                      className="w-full text-left p-5 rounded-xl border border-dashed border-white/[0.08] text-white/25 hover:border-performake-accent/20 hover:text-white/40 transition-all duration-300 text-sm"
                    >
                      ✏️ Prefiro escrever minha resposta...
                    </motion.button>
                  )}

                  {showManual && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                      <input autoFocus value={manualInput} onChange={(e) => setManualInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitManual()}
                        placeholder="Digite sua resposta..."
                        className="w-full bg-white/[0.04] border border-white/[0.12] rounded-xl px-5 py-4 text-white placeholder:text-white/25 focus:outline-none focus:border-performake-accent/40 transition-colors"
                      />
                      <div className="flex gap-2">
                        <button onClick={submitManual} disabled={!manualInput.trim()} className="bg-performake-accent text-[hsl(186,94%,7%)] px-6 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 transition-opacity">Confirmar</button>
                        <button onClick={() => { setShowManual(false); setManualInput(''); }} className="text-white/30 hover:text-white/50 px-4 py-2.5 text-sm transition-colors">Cancelar</button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* CAPTURE */}
            {stage === 'capture' && (
              <motion.div key="capture" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6 }} className="max-w-md mx-auto text-center">
                <div className="w-16 h-16 rounded-2xl bg-performake-accent/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={32} className="text-performake-accent" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Ótimo! Quase lá.</h3>
                <p className="text-white/35 mb-10 font-light">
                  Preencha seus dados para receber uma proposta personalizada de <strong className="text-performake-accent">{selectedService?.name}</strong>.
                </p>

                <div className="space-y-4 text-left">
                  <div>
                    <label className="text-white/30 text-xs font-medium uppercase tracking-wider block mb-2">Nome *</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu nome"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40 transition-colors" />
                  </div>
                  <div>
                    <label className="text-white/30 text-xs font-medium uppercase tracking-wider block mb-2">WhatsApp *</label>
                    <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(00) 00000-0000"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40 transition-colors" />
                  </div>
                  <div>
                    <label className="text-white/30 text-xs font-medium uppercase tracking-wider block mb-2">Email</label>
                    <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" type="email"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40 transition-colors" />
                  </div>
                  <div>
                    <label className="text-white/30 text-xs font-medium uppercase tracking-wider block mb-2">Mensagem</label>
                    <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Conte um pouco sobre seu negócio..." rows={3}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40 transition-colors resize-none" />
                  </div>
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleSubmit} disabled={loading || !form.name || !form.whatsapp}
                    className="w-full bg-performake-accent text-[hsl(186,94%,7%)] py-4 rounded-xl font-bold text-lg shadow-2xl shadow-performake-accent/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
                    {loading ? <Loader2 size={20} className="animate-spin" /> : (<>Enviar solicitação <ArrowRight size={18} /></>)}
                  </motion.button>
                </div>

                <button onClick={() => { setStage('quiz'); setStep(questions.length - 1); }} className="mt-6 text-white/25 hover:text-white/50 text-sm flex items-center gap-2 transition-colors mx-auto">
                  <ArrowLeft size={14} /> Voltar
                </button>
              </motion.div>
            )}

            {/* DONE */}
            {stage === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="max-w-md mx-auto text-center py-20">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.5 }}
                  className="w-20 h-20 rounded-2xl bg-performake-accent/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} className="text-performake-accent" />
                </motion.div>
                <h3 className="text-3xl font-black text-white mb-3">Solicitação enviada!</h3>
                <p className="text-white/35 text-lg leading-relaxed font-light">
                  Nossa equipe entrará em contato pelo WhatsApp em breve com uma proposta personalizada.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <FooterCTA />
    </div>
  );
};

export default Servicos;
