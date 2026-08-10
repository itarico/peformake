import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Palette, BookOpen, Zap } from 'lucide-react';

const CountUp = ({ target, isInView }: { target: number; isInView: boolean }) => {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v).toString());
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionVal, target, { duration: 2.5, ease: 'easeOut' as const });
      return controls.stop;
    }
  }, [isInView, target, motionVal]);

  useEffect(() => {
    return rounded.on('change', (v) => setDisplay(v));
  }, [rounded]);

  return <>{display}</>;
};

const ClientsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const { data: stats } = useQuery({
    queryKey: ['landing-real-stats'],
    queryFn: async () => {
      const [clientsRes, artsRes, consultingRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('arts').select('id', { count: 'exact', head: true }),
        supabase.from('consulting_months').select('id', { count: 'exact', head: true }),
      ]);

      return {
        activeClients: clientsRes.count || 0,
        totalArts: artsRes.count || 0,
        consultingMonths: consultingRes.count || 0,
      };
    },
  });

  const metrics = [
    { icon: Users, value: stats?.activeClients || 0, suffix: '+', label: 'Clientes ativos', color: 'hsl(176,100%,50%)' },
    { icon: Palette, value: stats?.totalArts || 0, suffix: '+', label: 'Artes entregues', color: 'hsl(200,100%,60%)' },
    { icon: BookOpen, value: stats?.consultingMonths || 0, suffix: '+', label: 'Meses de consultoria', color: 'hsl(280,80%,65%)' },
  ];

  return (
    <section className="relative py-24 bg-white overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(hsl(186,94%,7%) 1px, transparent 1px), linear-gradient(90deg, hsl(186,94%,7%) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-8">
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 * i }}
              className="text-center relative group"
            >
              <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-[hsl(186,94%,7%)] shadow-lg shadow-[hsl(186,94%,7%)]/20 group-hover:shadow-performake-accent/20 transition-shadow duration-500">
                <m.icon size={22} className="text-performake-accent" strokeWidth={1.5} />
              </div>
              <div className="text-4xl md:text-5xl font-black text-[hsl(186,94%,7%)] tracking-tight">
                <CountUp target={m.value} isInView={isInView} />{m.suffix}
              </div>
              <h2 className="text-[hsl(184,14%,55%)] text-xs mt-3 font-medium uppercase tracking-widest">{m.label}</h2>

              {i < metrics.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-16 bg-[hsl(210,20%,90%)] hidden md:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientsSection;
