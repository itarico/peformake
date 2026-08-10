import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, TrendingUp, Award, Loader2, MessageCircle, Phone, Download, CalendarDays, X, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Strategic questions with inline data capture
const quizSteps = [
  {
    id: 'contact_first',
    type: 'input' as const,
    q: 'Deixe seus dados para entrarmos em contato',
    subtitle: 'Preencha para receber seu diagnóstico personalizado.',
    fields: [
      { key: 'name', label: 'Seu nome', placeholder: 'Seu nome completo', required: true },
      { key: 'whatsapp', label: 'WhatsApp', placeholder: '(00) 00000-0000', required: true },
      { key: 'email', label: 'E-mail', placeholder: 'seu@email.com', required: true },
      { key: 'business_name', label: 'Nome do seu negócio', placeholder: 'Ex: Studio Bella', required: true },
    ],
  },
  {
    id: 'segment',
    type: 'choice' as const,
    q: 'Qual o segmento do seu negócio?',
    subtitle: 'Isso nos ajuda a personalizar a análise para o seu mercado.',
    options: ['Serviços profissionais', 'Produtos físicos / E-commerce', 'Infoprodutos / Digital', 'Alimentação / Gastronomia', 'Saúde / Estética / Beleza'],
    allowManual: true,
  },
  {
    id: 'revenue',
    type: 'choice' as const,
    q: 'Qual o faturamento mensal médio do seu negócio?',
    subtitle: 'Isso nos ajuda a recomendar o investimento ideal em marketing.',
    options: ['Até R$10.000', 'R$10.000 a R$50.000', 'R$50.000 a R$200.000', 'Acima de R$200.000'],
  },
  {
    id: 'digital_presence',
    type: 'choice' as const,
    q: 'Como está sua presença digital hoje?',
    subtitle: 'Vamos entender sua maturidade digital atual.',
    options: [
      'Tenho site + redes ativas + tráfego pago',
      'Tenho redes sociais mas sem estratégia',
      'Quase nenhuma presença digital',
    ],
  },
  {
    id: 'traffic',
    type: 'choice' as const,
    q: 'Você investe em tráfego pago (Google Ads, Meta Ads)?',
    subtitle: 'Tráfego pago é um dos pilares de aquisição de clientes.',
    options: [
      'Sim, com gestor ou agência (mais de R$2k/mês)',
      'Sim, faço eu mesmo (até R$2k/mês)',
      'Já tentei mas parei',
      'Nunca investi',
    ],
  },
  {
    id: 'funnel',
    type: 'choice' as const,
    q: 'Você tem um processo estruturado de vendas?',
    subtitle: 'Funil é o que transforma visitante em cliente pagante.',
    options: [
      'Sim, com CRM e funil definido',
      'Tenho um processo informal',
      'Vendo apenas quando o cliente me procura',
    ],
  },
  {
    id: 'biggest_challenge',
    type: 'choice' as const,
    q: 'Qual é o MAIOR desafio do seu marketing hoje?',
    subtitle: 'Saber onde dói mais nos ajuda a priorizar.',
    options: [
      'Atrair novos clientes',
      'Converter leads em vendas',
      'Reter clientes e aumentar ticket',
      'Não sei medir resultados',
    ],
    allowManual: true,
  },
  {
    id: 'online_presence',
    type: 'input' as const,
    q: 'Onde podemos te encontrar online?',
    subtitle: 'Isso nos permite analisar sua presença digital real.',
    fields: [
      { key: 'instagram', label: 'Instagram', placeholder: '@seuperfil', required: false },
      { key: 'website', label: 'Site', placeholder: 'www.seusite.com.br', required: false },
    ],
  },
];

const scoreMap: Record<number, number> = { 0: 3, 1: 2, 2: 1, 3: 0 };

const getLevel = (score: number, maxScore: number) => {
  const pct = score / maxScore;
  if (pct <= 0.35) return { level: 'Fase Inicial', icon: Sparkles, color: 'text-orange-400', bg: 'bg-orange-400/10', desc: 'Seu marketing tem grande potencial de crescimento. Com a estrutura certa, seus resultados podem ser transformados.' };
  if (pct <= 0.65) return { level: 'Em Evolução', icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-400/10', desc: 'Você já tem boas iniciativas. O próximo passo é integrar tudo e acelerar.' };
  return { level: 'Avançado', icon: Award, color: 'text-performake-accent', bg: 'bg-performake-accent/10', desc: 'Seu negócio tem base sólida. É hora de otimizar e escalar com análise e automação.' };
};

interface QuizDiagnosticoProps {
  autoStart?: boolean;
}

type Stage = 'intro' | 'quiz' | 'generating' | 'result';

const QuizDiagnostico = ({ autoStart = false }: QuizDiagnosticoProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const [stage, setStage] = useState<Stage>(autoStart ? 'quiz' : 'intro');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputFields, setInputFields] = useState<Record<string, string>>({});
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [diagnostic, setDiagnostic] = useState('');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [bookingSent, setBookingSent] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Load data from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    const phone = params.get('phone');
    const email = params.get('email');
    const company = params.get('company');

    if (name || phone || email || company) {
      setInputFields(prev => ({
        ...prev,
        name: name || prev.name || '',
        whatsapp: phone || prev.whatsapp || '',
        email: email || prev.email || '',
        business_name: company || prev.business_name || '',
      }));
      
      // If we have at least name and phone, we can skip to the second step
      if (name && phone && step === 0 && stage === 'quiz') {
        setStep(1);
      }
    }
  }, [stage]);

  const choiceSteps = quizSteps.filter(s => s.type === 'choice');
  const maxScore = choiceSteps.length * 3;

  const currentStep = quizSteps[step];
  const totalSteps = quizSteps.length;
  const progress = ((step + 1) / totalSteps) * 100;

  // Show booking popup 8s after result
  useEffect(() => {
    if (stage === 'result' && !bookingSent) {
      const timer = setTimeout(() => setShowBooking(true), 8000);
      return () => clearTimeout(timer);
    }
  }, [stage, bookingSent]);

  const handleInputNext = () => {
    const fields = (currentStep as any).fields;
    const requiredMissing = fields.some((f: any) => f.required && !inputFields[f.key]?.trim());
    if (requiredMissing) return;

    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      submitQuiz();
    }
  };

  const selectAnswer = (id: string, optionText: string) => {
    setAnswers(prev => ({ ...prev, [id]: optionText }));
    setShowManual(false);
    setManualInput('');
    if (step < totalSteps - 1) {
      setTimeout(() => setStep(step + 1), 350);
    } else {
      setTimeout(() => submitQuiz(), 400);
    }
  };

  const submitManual = (id: string) => {
    if (!manualInput.trim()) return;
    setAnswers(prev => ({ ...prev, [id]: manualInput.trim() }));
    setShowManual(false);
    setManualInput('');
    if (step < totalSteps - 1) {
      setTimeout(() => setStep(step + 1), 350);
    } else {
      setTimeout(() => submitQuiz(), 400);
    }
  };

  const calculateScore = () => {
    let total = 0;
    for (const cs of choiceSteps) {
      const answer = answers[cs.id];
      if (!answer || !cs.options) continue;
      const optIndex = cs.options.indexOf(answer);
      total += optIndex >= 0 ? (scoreMap[optIndex] ?? 0) : 1;
    }
    return total;
  };

  const submitQuiz = async () => {
    setLoading(true);
    const score = calculateScore();
    const levelInfo = getLevel(score, maxScore);
    setFinalScore(score);
    setStage('generating');

    const leadData = {
      name: inputFields.name || '',
      whatsapp: inputFields.whatsapp || '',
      email: inputFields.email || '',
      instagram_handle: inputFields.instagram || null,
      answers: { ...answers, business_name: inputFields.business_name, website: inputFields.website || null },
      score,
      level: levelInfo.level,
    };

    let savedLeadId: string | null = null;
    try {
      const { data } = await supabase.from('quiz_leads' as any).insert(leadData).select('id').single();
      savedLeadId = (data as any)?.id || null;
      setLeadId(savedLeadId);
    } catch (e) {
      console.error('Error saving quiz lead:', e);
    }

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('consulting-quiz-diagnostic', {
        body: { answers, name: inputFields.name, instagram_handle: inputFields.instagram, score, level: levelInfo.level, business_name: inputFields.business_name },
      });
      if (fnError) throw fnError;
      const aiDiagnostic = fnData?.diagnostic || '';
      const aiQualification = fnData?.qualification || '';
      setDiagnostic(aiDiagnostic);
      if (savedLeadId) {
        const updateData: Record<string, string> = {};
        if (aiDiagnostic) updateData.ai_diagnostic = aiDiagnostic;
        if (aiQualification) updateData.qualification = aiQualification;
        if (Object.keys(updateData).length > 0) {
          try { await supabase.from('quiz_leads' as any).update(updateData).eq('id', savedLeadId); } catch {}
        }
      }
      // Send auto WhatsApp notification to the lead
      if (savedLeadId && inputFields.whatsapp) {
        try {
          const cleanPhone = inputFields.whatsapp.replace(/\D/g, '');
          const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
          const callbackInfo = '';
          const whatsappMsg = `Olá ${inputFields.name}! 👋\n\nAqui é da *PEFORMAKE* — Performance & Marketing Estratégico.\n\nSeu diagnóstico de marketing já está pronto! 🎯\n\nGostaríamos de agendar uma reunião gratuita para analisar seu negócio em detalhes. Qual a melhor data e horário para conversarmos?`;
          await supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              type: 'quiz_lead_auto',
              title: 'Novo Lead - Diagnóstico',
              message: whatsappMsg,
              client_phone: fullPhone,
              target: 'lead',
            },
          });
        } catch (e) {
          console.error('Auto WhatsApp error:', e);
        }
        // Also notify internal team
        try {
          await supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              type: 'new_quiz_lead',
              title: 'Novo Lead do Diagnóstico',
              message: `🔔 *Novo Lead do Diagnóstico!*\n\n👤 ${inputFields.name}\n📱 ${inputFields.whatsapp}\n🏢 ${inputFields.business_name || 'N/A'}\n📊 Score: ${score}/33 (${levelInfo.level})\n\n${aiQualification ? '📋 ' + aiQualification.substring(0, 300) : ''}`,
              target: 'staff',
            },
          });
        } catch (e) {
          console.error('Admin notification error:', e);
        }
      }
    } catch (e) {
      console.error('AI diagnostic error:', e);
      setDiagnostic('');
    }

    setStage('result');
    setLoading(false);
  };

  const buildPdfHtml = () => {
    const info = getLevel(finalScore, maxScore);
    return `
      <div style="font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #00e5cc; padding-bottom: 20px;">
          <h1 style="font-size: 28px; font-weight: 900; color: #0d1b2a; margin: 0;">PEFORMAKE</h1>
          <p style="font-size: 12px; color: #666; margin: 5px 0 0;">Performance & Marketing Estratégico</p>
          <p style="font-size: 11px; color: #999; margin: 3px 0 0;">contato@peformake.com.br | peformake.com</p>
        </div>
        <h2 style="font-size: 22px; text-align: center; margin-bottom: 5px;">Diagnóstico de Marketing Digital</h2>
        <p style="text-align: center; color: #666; font-size: 14px; margin-bottom: 25px;">${inputFields.business_name || 'Negócio'} — ${inputFields.name || ''}</p>
        <div style="text-align: center; background: #f0fdf9; border: 1px solid #00e5cc44; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <p style="font-size: 16px; font-weight: 700; margin: 0;">Nível: <span style="color: #00b4a0;">${info.level}</span></p>
          <p style="font-size: 32px; font-weight: 900; color: #00b4a0; margin: 8px 0 0;">${finalScore}/${maxScore}</p>
        </div>
        <div style="font-size: 13px; line-height: 1.7;">
          ${diagnostic.replace(/## /g, '<h3 style="font-size: 16px; font-weight: 700; margin-top: 20px; margin-bottom: 8px; color: #0d1b2a;">').replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
        </div>
        <div style="margin-top: 30px; border-top: 2px solid #eee; padding-top: 15px; text-align: center; color: #999; font-size: 11px;">
          <p>© PEFORMAKE — Performance & Marketing Estratégico</p>
          <p>contato@peformake.com.br | WhatsApp: (00) 00000-0000</p>
        </div>
      </div>
    `;
  };

  const downloadPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const container = document.createElement('div');
    container.innerHTML = buildPdfHtml();
    document.body.appendChild(container);
    await (html2pdf as any)().set({
      margin: [10, 10, 10, 10],
      filename: `diagnostico-${inputFields.business_name || 'peformake'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(container).save();
    document.body.removeChild(container);
  };

  const submitBooking = async () => {
    if (!selectedDay || !selectedPeriod) return;
    if (leadId) {
      try {
        await supabase.from('quiz_leads' as any).update({
          wants_callback: true,
          preferred_callback_time: `${selectedDay} - ${selectedPeriod}`,
        }).eq('id', leadId);
      } catch {}
    }
    setBookingSent(true);
    setShowBooking(false);
  };

  const getNext7Days = () => {
    const days: { label: string; value: string }[] = [];
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        label: `${weekdays[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`,
        value: d.toISOString().split('T')[0],
      });
    }
    return days;
  };

  // Summarize diagnostic for display (first 3 sections only)
  const getSummarizedDiagnostic = () => {
    if (!diagnostic) return '';
    const sections = diagnostic.split(/(?=## )/);
    return sections.slice(0, 4).join('');
  };

  return (
    <section id="diagnostico" className="relative py-24 md:py-32 bg-performake-dark noise-overlay overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-performake-primary/15 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] rounded-full bg-performake-accent/[0.03] blur-[200px]" />

      <div ref={sectionRef} className="relative z-10 max-w-3xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {/* INTRO */}
          {stage === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-3 bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-full px-5 py-2 mb-8">
                <MessageCircle size={14} className="text-performake-accent" />
                <span className="text-white/60 text-[11px] font-medium uppercase tracking-[0.2em]">Diagnóstico gratuito</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white mt-4 mb-6 tracking-[-0.02em]">
                Descubra o nível do
                <br />
                <span className="text-gradient-accent">seu marketing</span>
              </h2>
              <p className="text-white/35 text-lg max-w-xl mx-auto mb-12 leading-relaxed font-light">
                Responda 7 perguntas estratégicas em menos de 2 minutos e receba um diagnóstico personalizado gerado por IA.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStage('quiz')}
                className="group bg-performake-accent text-[hsl(186,94%,7%)] px-10 py-4 rounded-xl font-bold text-lg shadow-2xl shadow-performake-accent/20 hover:shadow-performake-accent/30 transition-all duration-300 inline-flex items-center gap-3"
              >
                Começar diagnóstico
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>
          )}

          {/* QUIZ */}
          {stage === 'quiz' && currentStep && (
            <motion.div
              key={`quiz-${step}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5 }}
            >
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="text-white/30 hover:text-white text-sm flex items-center gap-2 transition-colors mb-8"
                >
                  <ArrowLeft size={14} /> Voltar
                </button>
              )}

              <div className="mb-10">
                <div className="flex items-center justify-between text-xs text-white/30 mb-2">
                  <span className="font-medium">Etapa {step + 1} de {totalSteps}</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-performake-accent/60 to-performake-accent rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="flex items-start gap-4 mb-10">
                <div className="w-10 h-10 rounded-full bg-performake-accent/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <MessageCircle size={18} className="text-performake-accent" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight">{currentStep.q}</h3>
                  {currentStep.subtitle && <p className="text-white/30 mt-2 text-sm font-light">{currentStep.subtitle}</p>}
                </div>
              </div>

              {/* INPUT TYPE */}
              {currentStep.type === 'input' && (
                <div className="ml-14 space-y-4">
                  {(currentStep as any).fields.map((field: any) => (
                    <div key={field.key}>
                      <label className="text-white/30 text-xs font-medium uppercase tracking-wider block mb-2">
                        {field.label} {field.required && '*'}
                      </label>
                      <input
                        value={inputFields[field.key] || ''}
                        onChange={(e) => setInputFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40 transition-colors"
                      />
                    </div>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleInputNext}
                    className="w-full bg-performake-accent text-[hsl(186,94%,7%)] py-4 rounded-xl font-bold text-lg shadow-2xl shadow-performake-accent/20 transition-all duration-300 flex items-center justify-center gap-2 mt-6"
                  >
                    {step === totalSteps - 1 ? 'Gerar meu diagnóstico com IA' : 'Continuar'}
                    <ArrowRight size={18} />
                  </motion.button>
                </div>
              )}

              {/* CHOICE TYPE */}
              {currentStep.type === 'choice' && (
                <div className="space-y-3 ml-14">
                  {currentStep.options!.map((opt, oi) => {
                    const isSelected = answers[currentStep.id] === opt;
                    return (
                      <motion.button
                        key={oi}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * oi }}
                        onClick={() => selectAnswer(currentStep.id, opt)}
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

                  {(currentStep as any).allowManual && !showManual && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      onClick={() => setShowManual(true)}
                      className="w-full text-left p-5 rounded-xl border border-dashed border-white/[0.08] text-white/25 hover:border-performake-accent/20 hover:text-white/40 transition-all duration-300 text-sm"
                    >
                      ✏️ Prefiro escrever minha resposta...
                    </motion.button>
                  )}

                  {showManual && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                      <input
                        autoFocus
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitManual(currentStep.id)}
                        placeholder="Digite sua resposta..."
                        className="w-full bg-white/[0.04] border border-white/[0.12] rounded-xl px-5 py-4 text-white placeholder:text-white/25 focus:outline-none focus:border-performake-accent/40 transition-colors"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => submitManual(currentStep.id)} disabled={!manualInput.trim()} className="bg-performake-accent text-[hsl(186,94%,7%)] px-6 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 transition-opacity">Confirmar</button>
                        <button onClick={() => { setShowManual(false); setManualInput(''); }} className="text-white/30 hover:text-white/50 px-4 py-2.5 text-sm transition-colors">Cancelar</button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* GENERATING */}
          {stage === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-16"
            >
              <motion.div
                className="w-24 h-24 rounded-full bg-performake-accent/10 flex items-center justify-center mx-auto mb-8"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <div className="w-20 h-20 rounded-full border-2 border-performake-accent/20 border-t-performake-accent animate-spin" />
              </motion.div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Gerando seu diagnóstico...</h3>
              <p className="text-white/30 font-light max-w-md mx-auto">
                Nossa IA está analisando suas respostas e criando um diagnóstico personalizado para <strong className="text-white/60">{inputFields.business_name || 'seu negócio'}</strong>.
              </p>
              <motion.div className="mt-8 h-1 max-w-xs mx-auto bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-performake-accent/40 to-performake-accent rounded-full"
                  animate={{ width: ['0%', '60%', '80%', '95%'] }}
                  transition={{ duration: 12, ease: 'easeOut' }}
                />
              </motion.div>
            </motion.div>
          )}

          {/* RESULT */}
          {stage === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            >
              {(() => {
                const info = getLevel(finalScore, maxScore);
                const Icon = info.icon;
                return (
                  <>
                    <div className="text-center mb-10">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, type: 'spring' }}
                        className={`w-20 h-20 rounded-2xl ${info.bg} flex items-center justify-center mx-auto mb-6`}
                      >
                        <Icon size={40} className={info.color} />
                      </motion.div>
                      <span className="text-performake-accent text-[11px] font-medium uppercase tracking-[0.2em]">Diagnóstico completo</span>
                      <h3 className="text-3xl md:text-4xl font-black text-white mt-4 mb-2 tracking-[-0.02em]">
                        {inputFields.business_name || 'Seu negócio'} está na fase: <span className={info.color}>{info.level}</span>
                      </h3>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-5xl font-black text-gradient-accent my-6"
                      >
                        {finalScore}/{maxScore}
                      </motion.div>

                      <div className="max-w-md mx-auto mb-8">
                        <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-orange-400 via-yellow-400 to-performake-accent rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(finalScore / maxScore) * 100}%` }}
                            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-white/25 mt-2">
                          <span>Fase Inicial</span>
                          <span>Em Evolução</span>
                          <span>Avançado</span>
                        </div>
                      </div>

                      <p className="text-white/50 text-lg max-w-lg mx-auto leading-relaxed font-light">{info.desc}</p>
                    </div>

                    {/* View & Download Buttons */}
                    {diagnostic && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                        className="mb-10"
                      >
                        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center mb-6">
                          <Sparkles size={32} className="text-performake-accent mx-auto mb-4" />
                          <h4 className="text-xl font-bold text-white mb-2">Seu diagnóstico está pronto!</h4>
                          <p className="text-white/40 font-light text-sm max-w-md mx-auto">
                            Preparamos uma análise personalizada completa do marketing digital do seu negócio. Visualize ou baixe o PDF.
                          </p>
                        </div>

                        <div className="flex justify-center gap-4">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowPdfPreview(true)}
                            className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.12] hover:border-performake-accent/40 hover:bg-performake-accent/10 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300"
                          >
                            <Eye size={18} className="text-performake-accent" />
                            Visualizar diagnóstico
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={downloadPDF}
                            className="flex items-center gap-2 bg-performake-accent text-[hsl(186,94%,7%)] px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-performake-accent/20"
                          >
                            <Download size={18} />
                            Baixar PDF
                          </motion.button>
                        </div>
                      </motion.div>
                    )}

                    {/* WhatsApp CTA */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, duration: 0.6 }}
                      className="bg-gradient-to-br from-performake-accent/10 to-performake-accent/5 border border-performake-accent/20 rounded-2xl p-8 text-center"
                    >
                      <Phone size={28} className="text-performake-accent mx-auto mb-4" />
                      <h4 className="text-xl font-bold text-white mb-2">Quer acelerar seus resultados?</h4>
                      <p className="text-white/40 font-light mb-6 max-w-md mx-auto">
                        Fale com um especialista da Peformake e descubra como transformar esse diagnóstico em ação.
                      </p>
                      <motion.a
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        href={`https://wa.me/5500000000000?text=${encodeURIComponent(`Olá! Fiz o diagnóstico da Peformake e meu negócio "${inputFields.business_name}" está na fase "${getLevel(finalScore, maxScore).level}". Quero saber mais!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-performake-accent text-[hsl(186,94%,7%)] px-8 py-3.5 rounded-xl font-bold shadow-xl shadow-performake-accent/20 hover:shadow-performake-accent/30 transition-all"
                      >
                        <MessageCircle size={18} /> Conversar no WhatsApp
                      </motion.a>
                    </motion.div>
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white text-black">
          <div dangerouslySetInnerHTML={{ __html: buildPdfHtml() }} />
          <div className="flex justify-end gap-3 mt-4 border-t pt-4">
            <button onClick={() => setShowPdfPreview(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-black transition-colors">Fechar</button>
            <button onClick={() => { downloadPDF(); setShowPdfPreview(false); }} className="px-5 py-2 bg-[#00e5cc] text-[#0d1b2a] rounded-lg font-semibold text-sm flex items-center gap-2">
              <Download size={16} /> Baixar PDF
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Popup */}
      <AnimatePresence>
        {showBooking && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)]"
          >
            <div className="bg-[hsl(186,94%,6%)] border border-performake-accent/30 rounded-2xl p-6 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-performake-accent" />
                  <h4 className="text-white font-bold text-sm">Vamos conversar?</h4>
                </div>
                <button onClick={() => setShowBooking(false)} className="text-white/30 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <p className="text-white/40 text-xs mb-4">Escolha o melhor dia e horário para falarmos sobre seu diagnóstico.</p>

              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {getNext7Days().map(day => (
                  <button
                    key={day.value}
                    onClick={() => setSelectedDay(day.value)}
                    className={`p-2 rounded-lg text-[10px] font-medium transition-all ${
                      selectedDay === day.value
                        ? 'bg-performake-accent text-[hsl(186,94%,7%)]'
                        : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {['Manhã', 'Tarde', 'Noite'].map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`p-2.5 rounded-lg text-xs font-medium transition-all ${
                      selectedPeriod === period
                        ? 'bg-performake-accent text-[hsl(186,94%,7%)]'
                        : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08]'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>

              <button
                onClick={submitBooking}
                disabled={!selectedDay || !selectedPeriod}
                className="w-full bg-performake-accent text-[hsl(186,94%,7%)] py-3 rounded-xl font-bold text-sm disabled:opacity-40 transition-all"
              >
                Confirmar horário
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default QuizDiagnostico;
