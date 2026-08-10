import { motion } from 'framer-motion';
import { Award, Users, Briefcase } from 'lucide-react';
import italo1 from '@/assets/italo-1.jpeg';

const credentials = [
  { icon: Award, label: '+10 anos de experiência' },
  { icon: Users, label: '+200 empresas atendidas' },
  { icon: Briefcase, label: 'Estrategista de marketing' },
];

const FounderSection = () => {
  return (
    <section className="relative py-32 md:py-40 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={italo1}
                alt="Ítalo Ricardo — Fundador da Peformake"
                className="w-full aspect-[3/4] object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(186,94%,7%)]/60 via-transparent to-transparent" />
            </div>
            
            <div className="absolute -bottom-6 -right-6 bg-[hsl(186,94%,7%)] text-white px-6 py-4 rounded-2xl shadow-2xl shadow-black/20">
              <div className="text-2xl font-black text-gradient-accent leading-none">+10</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-1">anos</div>
            </div>

            <div className="absolute -top-4 -left-4 w-24 h-24 border border-performake-accent/20 rounded-2xl hidden lg:block" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h2 className="text-performake-accent text-[11px] font-medium uppercase tracking-[0.2em]">
              Quem está por trás
            </h2>
            <h3 className="text-3xl md:text-5xl font-black text-[hsl(186,94%,7%)] mt-4 mb-8 tracking-[-0.02em]">
              Ítalo Ricardo
            </h3>

            <div className="relative mb-8 pl-6 border-l-2 border-performake-accent/30">
              <span className="absolute -top-4 -left-2 text-6xl text-performake-accent/10 font-serif leading-none">"</span>
              <p className="text-[hsl(184,14%,35%)] italic text-lg leading-relaxed font-light">
                Meu trabalho é transformar marketing desorganizado em algo que realmente gera resultado.
              </p>
            </div>

            <div className="space-y-5 text-[hsl(184,14%,42%)] leading-[1.8] text-[15px] font-light mb-10">
              <p>
                Com mais de 10 anos de experiência, Ítalo trabalha ajudando empresas a saírem do marketing desorganizado e transformarem isso em algo que realmente gera resultado.
              </p>
              <p>
                Seu foco não é só criar conteúdo ou rodar campanhas, mas <span className="text-[hsl(186,94%,7%)] font-semibold">estruturar o que está por trás: oferta, posicionamento e direção.</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              {credentials.map((cred, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-[hsl(210,20%,97%)] rounded-xl px-4 py-3">
                  <cred.icon size={16} className="text-performake-accent" strokeWidth={1.5} />
                  <span className="text-[hsl(186,94%,7%)] text-sm font-medium">{cred.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-[hsl(210,20%,93%)]">
              <div className="text-[hsl(186,94%,7%)] font-bold text-sm">Ítalo Ricardo</div>
              <div className="text-[hsl(184,14%,55%)] text-xs mt-0.5">Fundador & Estrategista — Peformake</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FounderSection;
