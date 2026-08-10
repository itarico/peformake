import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2 } from 'lucide-react';

const AnimatedNumber = ({ value, suffix = '', isInView }: { value: string; suffix?: string; isInView: boolean }) => {
  const numericPart = value.replace(/[^0-9.]/g, '');
  const prefix = value.replace(/[0-9.]/g, '');
  const num = parseFloat(numericPart) || 0;
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => {
    if (num % 1 !== 0) return v.toFixed(1);
    return Math.round(v).toString();
  });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionVal, num, { duration: 2, ease: 'easeOut' });
      return controls.stop;
    }
  }, [isInView, num, motionVal]);

  useEffect(() => {
    return rounded.on('change', (v) => setDisplay(v));
  }, [rounded]);

  return <span>{prefix}{display}{suffix}</span>;
};

const PortfolioSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const { data: dbCases } = useQuery({
    queryKey: ['landing-portfolio'],
    queryFn: async () => {
      const { data } = await supabase.from('landing_portfolio_cases' as any).select('*').eq('is_active', true).order('display_order');
      return data as any[];
    },
  });

  const defaultCases = [
    { client_name: 'Clínica Estética', metric_value: '+380%', metric_label: 'leads qualificados', after_text: 'Leads qualificados triplicaram em 90 dias. O marketing passou de custo para o principal canal de aquisição.', progress: 85 },
    { client_name: 'E-commerce de Moda', metric_value: '5.8x', metric_label: 'ROAS alcançado', after_text: 'ROAS escalou de 1.2x para 5.8x. Cada real investido passou a gerar quase 6 de volta.', progress: 92 },
    { client_name: 'Escritório de Advocacia', metric_value: '45', metric_label: 'clientes/mês', after_text: '45 novos clientes/mês pelo digital. Antes dependiam 100% de indicação.', progress: 78 },
  ];

  const cases = dbCases && dbCases.length > 0 ? dbCases : defaultCases;

  return (
    <section id="resultados" className="relative py-32 md:py-40 bg-performake-dark noise-overlay">
      <div ref={ref} className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6"
        >
          <span className="text-performake-accent text-[11px] font-medium uppercase tracking-[0.2em]">Cases de sucesso</span>
          <h2 className="text-3xl md:text-5xl font-black text-white mt-4 tracking-[-0.02em]">
            Resultados acima da média
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-white/35 text-center max-w-xl mx-auto mb-20 leading-relaxed text-lg font-light"
        >
          Empresas reais que pararam de "tentar marketing" e começaram a vender de verdade.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6">
          {cases.map((c: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 * i }}
              className="glass-card-light rounded-2xl p-8 hover:bg-white/[0.05] transition-all duration-500 group"
            >
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle2 size={14} className="text-performake-accent/60" />
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Case verificado</span>
              </div>

              <div className="text-5xl font-black text-gradient-accent mb-1 tracking-tight">
                <AnimatedNumber value={c.metric_value} isInView={isInView} />
              </div>
              <div className="text-white/30 text-[11px] font-medium uppercase tracking-widest mb-6">{c.metric_label}</div>

              <div className="w-full h-1 bg-white/[0.06] rounded-full mb-6 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.progress || 80}%` }}
                  transition={{ duration: 1.5, delay: 0.3 + 0.15 * i, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-performake-accent/60 to-performake-accent rounded-full"
                />
              </div>

              <h3 className="text-white font-bold mb-3">{c.client_name}</h3>
              <p className="text-white/30 text-sm leading-relaxed font-light">{c.after_text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
