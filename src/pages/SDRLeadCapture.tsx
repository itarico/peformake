import { useEffect, useState, memo, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Instagram, Phone, User, Mail, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import LandingNav from '@/components/landing/LandingNav';
import SEO from '@/components/SEO';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


interface FormState {
  contact_name: string;
  phone: string;
  email: string;
  instagram_handle: string;
  revenue: string;
  source: string;
}

const initialForm: FormState = {
  contact_name: '',
  phone: '',
  email: '',
  instagram_handle: '',
  revenue: '',
  source: 'Formulário Público',
};

const REVENUE_OPTIONS = [
  'Abaixo de R$ 20k',
  'R$ 20k - R$ 50k',
  'R$ 50k - R$ 100k',
  'Acima de R$ 100k'
] as const;

const sanitizeHandle = (raw: string) => {
  let h = raw.trim();
  if (!h) return '';
  h = h.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  h = h.replace(/^@/, '').replace(/\/$/, '').split('?')[0];
  return h;
};

export default function SDRLeadCapture() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: firstStageId } = useQuery({
    queryKey: ['sdr-first-stage'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sdr_pipeline_stages')
        .select('id')
        .eq('stage_order', 1)
        .maybeSingle();
      return data?.id || null;
    },
  });

  useEffect(() => {
    document.title = 'Acelere seu Crescimento | Peformake';
    // Allow scrolling if content overflows
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.contact_name.trim() || !form.phone.trim() || !form.revenue) {
      toast.error('Por favor, preencha nome, WhatsApp e faturamento.');
      return;
    }
    setLoading(true);
    try {
      const handle = sanitizeHandle(form.instagram_handle);
      
      // Auto-tiering based on revenue
      let leadTier: 'A' | 'B' | 'C' | 'Outro' = 'Outro';
      if (form.revenue === 'Acima de R$ 100k') leadTier = 'A';
      else if (form.revenue === 'R$ 20k - R$ 50k' || form.revenue === 'R$ 50k - R$ 100k') {
        // Correcting tiers: 50-100k is B, 20-50k is C
        if (form.revenue === 'R$ 50k - R$ 100k') leadTier = 'B';
        else leadTier = 'C';
      }
      else if (form.revenue === 'Abaixo de R$ 20k') leadTier = 'Outro'; // Desqualificado

      // Initial responses for qualification
      const initialContactResponses = {
        revenue: form.revenue,
        origin: form.source || 'Formulário Público',
        main_pain: 'Diagnóstico Inicial solicitado via formulário.',
        expectations: 'Receber análise estratégica.'
      };

      const { error } = await supabase.from('sdr_leads').insert({
        contact_name: form.contact_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        instagram_handle: handle || null,
        pain_point: `Faturamento atual: ${form.revenue}`,
        source: 'inbound',
        status: 'open',
        stage_id: firstStageId || null,
        sdr_staff_id: null,
        estimated_value: 0,
        qualification_score: 0,
        lead_tier: leadTier,
        initial_contact_responses: initialContactResponses,
      });
      if (error) throw error;

      try {
        await supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            type: 'sdr_new_lead',
            title: '🎯 Novo Lead SDR Recebido',
            message: `🔔 *NOVO LEAD!*\n\n👤 *Nome:* ${form.contact_name}\n📱 *WhatsApp:* ${form.phone}${handle ? `\n📷 *Instagram:* @${handle}` : ''}\n💰 *Faturamento:* ${form.revenue}\n\n🚀 *Ação:* Entre em contato em até 24h!`,
            target: 'staff',
          },
        });
      } catch (e) {
        console.error('Notification failed:', e);
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [form, firstStageId]);

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-performake-accent/10 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full text-center relative z-10"
        >
          <div className="w-24 h-24 rounded-3xl bg-performake-accent/20 flex items-center justify-center mx-auto mb-10 border border-performake-accent/30 rotate-3 shadow-2xl shadow-performake-accent/20">
            <CheckCircle2 size={48} className="text-performake-accent" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white mb-8 leading-[1.1] tracking-tight">
            Você já é parte do <span className="text-performake-accent">1%!</span>
          </h1>
          
          <div className="space-y-8 text-white/80 leading-relaxed mb-12 text-xl md:text-2xl font-light">
            <p>
              A maioria dos empresários apenas reclama. Você agiu. Ao buscar <span className="text-white font-black underline decoration-performake-accent underline-offset-8">Marketing de Alta Performance</span>, você acaba de deixar 90% da sua concorrência para trás.
            </p>
            <p>
              Estamos analisando seu perfil agora mesmo para entregar uma <span className="text-white font-medium">estratégia de escala agressiva</span>. Prepare-se para o próximo nível.
            </p>
          </div>
          
          <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 md:p-12 mb-10 backdrop-blur-xl relative overflow-hidden group text-left">
            <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp size={120} className="text-performake-accent" />
            </div>
            
            <h3 className="text-performake-accent font-black text-2xl mb-4 flex items-center gap-3 uppercase tracking-tighter">
              <Sparkles size={24} /> Próximos Passos
            </h3>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-performake-accent/20 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-[10px] font-bold text-performake-accent">01</span>
                </div>
                <p className="text-white/60 text-base">Fique atento ao seu <span className="text-white">WhatsApp</span>. Entraremos em contato em até 24h úteis.</p>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-performake-accent/20 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-[10px] font-bold text-performake-accent">02</span>
                </div>
                <p className="text-white/60 text-base">Prepare seus números. Vamos analisar <span className="text-white">o marketing e as vendas</span> do seu negócio.</p>
              </li>
            </ul>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-white/[0.05] hover:bg-white/[0.1] text-white py-4 rounded-2xl font-bold text-base transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              Voltar para o site
            </button>
          </div>
          
          <p className="text-white/30 text-xs uppercase tracking-[0.3em] font-medium">
            Performake © 2026 • Marketing de Alta Performance
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-performake-dark flex flex-col lg:overflow-hidden relative">
      <SEO 
        title="Escala de Vendas e Marketing de Performance | Performake"
        description="Garanta sua análise de marketing exclusiva. Descubra como escalar seu negócio e receba um plano de marketing real para vender todos os dias com a Performake."
      />
      <div className="hidden lg:block">
        <LandingNav />
      </div>

      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-performake-accent/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-performake-accent/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-center px-6 py-8 lg:pt-32 lg:pb-20 flex-1">
        
        {/* Left Side: Copy */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="order-1 lg:order-1 flex flex-col justify-center"
        >
          <div className="hidden lg:inline-flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-full px-4 py-1.5 mb-6 w-fit">
            <Sparkles size={14} className="text-performake-accent" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-performake-accent">Performake • Consultoria de Escala</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white leading-[0.95] md:leading-[0.85] tracking-tighter mb-4 lg:mb-8">
            Domine seu Mercado. <br />
            <span className="text-performake-accent">Escale suas Vendas.</span>
          </h1>
          
          <p className="text-base md:text-xl lg:text-2xl text-white/60 font-light leading-relaxed mb-6 lg:mb-10 max-w-lg">
            Sua empresa estagnada é lucro para a concorrência. Receba uma análise estratégica para destravar seu crescimento hoje.
          </p>

          <div className="flex flex-col space-y-3 lg:space-y-4">
            {useMemo(() => [
              "Diagnóstico de Vendas e Operação",
              "Escalabilidade com Marketing de Performance",
              "Ecossistemas de Conversão de Alto ROI"
            ], []).map((item, i) => (
              <div key={i} className="flex items-center gap-3 lg:gap-4 group">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-performake-accent/10 border border-performake-accent/20 flex items-center justify-center text-performake-accent group-hover:scale-110 transition-transform">
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-white/80 text-sm lg:text-base font-medium">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Side: Form (Mobile: Order 2) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[1.5rem] lg:rounded-[2rem] p-6 lg:p-10 shadow-2xl relative order-2 lg:order-2 w-full max-w-md mx-auto"
        >
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-performake-accent/20 blur-2xl rounded-full" />
          
          <div className="mb-4 lg:mb-10 text-center lg:text-left">
            <h3 className="text-lg lg:text-2xl font-black text-white mb-1">Receba seu Diagnóstico</h3>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Preencha para agendar sua análise estratégica.</p>
          </div>

          <div className="space-y-3 lg:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                icon={<User size={14} />}
                label="Nome"
                value={form.contact_name}
                onChange={(v) => setForm({ ...form, contact_name: v })}
                placeholder="Seu nome"
                autoComplete="name"
                name="name"
              />
              <Field
                icon={<Phone size={14} />}
                label="WhatsApp"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="(00) 00000-0000"
                type="tel"
                autoComplete="tel"
                name="tel"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field
                icon={<Instagram size={14} />}
                label="Instagram"
                value={form.instagram_handle}
                onChange={(v) => setForm({ ...form, instagram_handle: v })}
                placeholder="@seuinsta"
                name="instagram"
              />
              <Field
                icon={<Mail size={14} />}
                label="E-mail profissional"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="seu@email.com"
                type="email"
                autoComplete="email"
                name="email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest block mb-2 flex items-center gap-2">
                <TrendingUp size={14} className="text-performake-accent" />
                Qual o faturamento da sua empresa hoje?
              </label>
              <Select 
                value={form.revenue} 
                onValueChange={(v) => setForm({ ...form, revenue: v })}
              >
                <SelectTrigger className="w-full bg-white/[0.05] border-white/10 rounded-xl py-2.5 lg:py-7 text-white h-auto focus:ring-performake-accent/20">
                  <SelectValue placeholder="Qual o faturamento da sua empresa hoje?" />
                </SelectTrigger>
                <SelectContent className="bg-performake-dark border-white/10 text-white">
                  {REVENUE_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt} className="focus:bg-performake-accent/10 focus:text-performake-accent">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !form.contact_name.trim() || !form.phone.trim() || !form.revenue}
              className="w-full bg-performake-accent text-performake-dark py-3 lg:py-5 rounded-xl lg:rounded-[1.25rem] font-black text-xs lg:text-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 lg:gap-3 hover:scale-[1.01] shadow-xl shadow-performake-accent/20 mt-1"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>Quero meu Diagnóstico <ArrowRight size={18} /></>}
            </button>
            
            <p className="text-center text-[10px] text-white/20 uppercase tracking-[0.2em] font-medium">
              Suas informações estão 100% seguras conosco.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const Field = memo(function Field({
  icon, label, value, onChange, placeholder, type = 'text', autoComplete, name,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  name?: string;
}) {
  return (
    <div className="space-y-1.5 lg:space-y-2">
      <label className="text-white/40 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest block mb-0.5 flex items-center gap-2">
        <span className="text-performake-accent">{icon}</span>
        {label}
      </label>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-2.5 lg:py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40 transition-all text-sm"
      />
    </div>
  );
});