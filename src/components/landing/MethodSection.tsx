import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

const steps = [
  { phase: '01', title: 'Aquisição', desc: 'Atrair a atenção do público certo com tráfego pago e conteúdo estratégico.' },
  { phase: '02', title: 'Engajamento', desc: 'Construir confiança e interesse com posicionamento e autoridade.' },
  { phase: '03', title: 'Monetização', desc: 'Converter atenção em vendas com funis, ofertas e automações.' },
  { phase: '04', title: 'Retenção', desc: 'Manter clientes comprando com relacionamento e reativação.' },
];

const MethodSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!isInView) return;
    const timers: NodeJS.Timeout[] = [];
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveStep(i), 800 + i * 900));
    });
    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  const lightProgress = isInView ? Math.min((activeStep + 1) / steps.length, 1) : 0;

  return (
    <section id="metodo" className="relative py-32 md:py-40 bg-white overflow-hidden">
      <div ref={ref} className="max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-6"
        >
          <h2 className="text-performake-accent text-[11px] font-medium uppercase tracking-[0.2em]">O método</h2>
          <h3 className="text-3xl md:text-5xl font-black text-[hsl(186,94%,7%)] mt-4 tracking-[-0.02em]">
            Existe um método para que sua empresa
            <br className="hidden md:block" />
            nunca pare de vender
          </h3>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[hsl(184,14%,45%)] text-center max-w-2xl mx-auto mb-24 leading-relaxed text-lg font-light"
        >
          O Método Peformake transforma marketing em um processo previsível de geração de receita.
        </motion.p>

        {/* Desktop layout */}
        <div className="relative hidden md:block">
          <div className="absolute top-[28px] left-[12.5%] right-[12.5%] h-[2px] bg-[hsl(210,20%,93%)] rounded-full" />

          <motion.div
            className="absolute top-[28px] left-[12.5%] h-[2px] rounded-full origin-left"
            style={{
              background: 'linear-gradient(90deg, hsl(176,100%,50%), hsl(176,100%,70%))',
              boxShadow: '0 0 12px 3px hsla(176,100%,50%,0.4), 0 0 30px 6px hsla(176,100%,50%,0.15)',
              width: '75%',
            }}
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: lightProgress } : { scaleX: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {activeStep >= 0 && activeStep < steps.length && (
            <motion.div
              className="absolute top-[22px] w-3 h-3 rounded-full"
              style={{
                background: 'hsl(176,100%,60%)',
                boxShadow: '0 0 16px 6px hsla(176,100%,50%,0.5), 0 0 40px 10px hsla(176,100%,50%,0.2)',
                left: `calc(12.5% + ${(activeStep / (steps.length - 1)) * 75}%)`,
                transform: 'translateX(-50%)',
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}

          <div className="grid grid-cols-4 gap-6">
            {steps.map((step, i) => {
              const isActive = i <= activeStep;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.15 * i }}
                  className="relative text-center group"
                >
                  <motion.div
                    className="relative inline-flex items-center justify-center w-14 h-14 rounded-full mb-8 transition-all duration-700"
                    animate={isActive ? {
                      backgroundColor: 'hsl(186,94%,7%)',
                      boxShadow: '0 0 20px 4px hsla(176,100%,50%,0.25), 0 0 40px 8px hsla(176,100%,50%,0.1)',
                    } : {
                      backgroundColor: 'hsl(210,20%,95%)',
                      boxShadow: '0 0 0 0 transparent',
                    }}
                    transition={{ duration: 0.6 }}
                  >
                    <motion.span
                      className="text-sm font-bold"
                      animate={isActive ? { color: 'hsl(176,100%,50%)' } : { color: 'hsl(184,14%,55%)' }}
                      transition={{ duration: 0.5 }}
                    >
                      {step.phase}
                    </motion.span>
                    
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-performake-accent/30"
                        animate={{ scale: [1, 1.4, 1.4], opacity: [0.6, 0, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      />
                    )}
                  </motion.div>

                  <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[120px] font-black text-[hsl(186,94%,7%)]/[0.03] leading-none pointer-events-none select-none">
                    {step.phase}
                  </div>

                  <h3 className="text-xl font-bold text-[hsl(186,94%,7%)] mb-3 relative">{step.title}</h3>
                  <p className="text-[hsl(184,14%,45%)] text-sm leading-relaxed font-light relative">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile layout - vertical */}
        <div className="md:hidden relative pl-10">
          <div className="absolute left-[18px] top-0 bottom-0 w-[2px] bg-[hsl(210,20%,93%)] rounded-full" />

          <motion.div
            className="absolute left-[18px] top-0 w-[2px] rounded-full"
            style={{
              background: 'linear-gradient(180deg, hsl(176,100%,50%), hsl(176,100%,70%))',
              boxShadow: '0 0 12px 3px hsla(176,100%,50%,0.4)',
            }}
            initial={{ height: 0 }}
            animate={isInView ? { height: `${lightProgress * 100}%` } : { height: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          <div className="space-y-12">
            {steps.map((step, i) => {
              const isActive = i <= activeStep;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 * i }}
                  className="relative"
                >
                  <motion.div
                    className="absolute -left-10 top-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700"
                    animate={isActive ? {
                      backgroundColor: 'hsl(186,94%,7%)',
                      boxShadow: '0 0 16px 4px hsla(176,100%,50%,0.3)',
                    } : {
                      backgroundColor: 'hsl(210,20%,95%)',
                      boxShadow: 'none',
                    }}
                  >
                    <motion.span
                      className="text-xs font-bold"
                      animate={isActive ? { color: 'hsl(176,100%,50%)' } : { color: 'hsl(184,14%,55%)' }}
                    >
                      {step.phase}
                    </motion.span>
                  </motion.div>

                  <h3 className="text-lg font-bold text-[hsl(186,94%,7%)] mb-2">{step.title}</h3>
                  <p className="text-[hsl(184,14%,45%)] text-sm leading-relaxed font-light">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MethodSection;
