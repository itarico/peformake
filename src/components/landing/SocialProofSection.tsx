import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, Quote } from 'lucide-react';

const defaultTestimonials = [
  { name: 'Mariana C.', role: 'CEO — Clínica de Estética', text: 'Em 3 meses, triplicamos os agendamentos pelo Instagram. Eles entendem o negócio.', rating: 5 },
  { name: 'Rafael T.', role: 'Fundador — E-commerce', text: 'O ROAS saiu de 1.2x para quase 6x. Isso mudou tudo no nosso faturamento.', rating: 5 },
  { name: 'Ana Paula S.', role: 'Sócia — Escritório de Advocacia', text: 'Eu achava que marketing digital não funcionava para advogados. O problema era falta de estrutura.', rating: 5 },
];

const SocialProofSection = () => {
  const { data: dbTestimonials } = useQuery({
    queryKey: ['landing-testimonials'],
    queryFn: async () => {
      const { data } = await supabase.from('landing_testimonials' as any).select('*').eq('is_active', true).order('display_order');
      return data as any[];
    },
  });

  const testimonials = dbTestimonials && dbTestimonials.length > 0 ? dbTestimonials : defaultTestimonials;

  return (
    <section id="depoimentos" className="relative py-16 md:py-24 bg-performake-dark noise-overlay">
      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="text-performake-accent text-[11px] font-medium uppercase tracking-[0.2em]">Depoimentos</h2>
          <h3 className="text-3xl md:text-5xl font-black text-white mt-4 tracking-[-0.02em]">
            O que dizem nossos clientes
          </h3>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * i }}
              className="glass-card-light rounded-2xl p-6 flex flex-col hover:bg-white/[0.05] transition-all duration-500"
            >
              <Quote size={22} className="text-performake-accent/20 mb-4" />

              <div className="flex gap-1 mb-4">
                {[...Array(t.rating || 5)].map((_, si) => (
                  <Star key={si} size={13} className="fill-performake-accent text-performake-accent" />
                ))}
              </div>

              <p className="text-white/45 leading-relaxed flex-1 mb-6 text-sm font-light">
                "{t.text}"
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-performake-accent/10 flex items-center justify-center">
                  <span className="text-performake-accent font-bold text-sm">{t.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{t.name}</div>
                  <div className="text-white/30 text-xs mt-0.5">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
