import { motion } from 'framer-motion';
import { Users, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';

import imgMetaAds from '@/assets/services/meta-ads.png';

const metrics = [
  {
    icon: Users,
    value: '4.400',
    label: 'leads gerados',
    description: 'Mais de 4 mil pessoas interessadas entraram em contato com esse cliente em apenas uma campanha.',
  },
  {
    icon: DollarSign,
    value: 'R$ 1,00',
    label: 'por lead',
    description: 'Cada pessoa interessada custou apenas 1 real. Isso é absurdamente barato para qualquer mercado.',
  },
  {
    icon: TrendingUp,
    value: '4.400x',
    label: 'oportunidades reais',
    description: 'Com R$ 4.400 investidos, esse cliente recebeu 4.400 oportunidades reais de venda. Esse é o poder de uma estratégia bem feita.',
  },
];

const ShowcaseSection = () => {
  return (
    <section className="relative py-28 md:py-40 overflow-hidden bg-performake-dark">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-performake-accent/[0.04] blur-[200px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-performake-accent text-[11px] font-medium uppercase tracking-[0.2em]">
            Caso real de cliente
          </h2>
          <h3 className="text-3xl md:text-5xl font-black text-white mt-4 tracking-[-0.02em]">
            Olha esse resultado absurdo
          </h3>
          <p className="text-white/40 text-lg mt-4 max-w-2xl mx-auto font-light">
            Não são promessas. São dados reais de uma campanha que nós criamos e gerenciamos.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl mx-auto mb-20"
          style={{ perspective: '1400px' }}
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
            className="rounded-2xl overflow-hidden ring-1 ring-white/[0.08] shadow-[0_40px_100px_-20px] shadow-performake-accent/15"
            style={{
              transform: 'rotateY(-8deg) rotateX(4deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="bg-[hsl(220,15%,10%)] px-5 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[hsl(0,70%,55%)]" />
                <div className="w-3 h-3 rounded-full bg-[hsl(45,80%,55%)]" />
                <div className="w-3 h-3 rounded-full bg-[hsl(130,50%,50%)]" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white/[0.06] rounded-lg h-6 max-w-[260px] mx-auto flex items-center justify-center">
                  <span className="text-white/20 text-[10px] tracking-wide">business.facebook.com/adsmanager</span>
                </div>
              </div>
            </div>

            <img
              src={imgMetaAds}
              alt="Dashboard Meta Ads mostrando resultado de campanha com custo por lead de R$ 1,00"
              className="w-full h-auto block"
            />
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 * i }}
              className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-performake-accent/10 flex items-center justify-center mx-auto mb-4">
                <metric.icon size={20} className="text-performake-accent" />
              </div>
              <p className="text-3xl md:text-4xl font-black text-white tracking-tight">
                {metric.value}
              </p>
              <p className="text-performake-accent text-sm font-semibold uppercase tracking-wider mt-1 mb-3">
                {metric.label}
              </p>
              <p className="text-white/40 text-sm font-light leading-relaxed">
                {metric.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center"
        >
          <a
            href="/diagnostico"
            className="inline-flex items-center gap-3 bg-performake-accent text-performake-dark font-bold px-8 py-4 rounded-xl text-lg hover:brightness-110 transition-all"
          >
            Quero resultados assim
            <ArrowRight size={20} />
          </a>
          <p className="text-white/30 text-sm mt-4 font-light">
            Análise Estratégica — descubra o potencial real do seu negócio
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ShowcaseSection;
