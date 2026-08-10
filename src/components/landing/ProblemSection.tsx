import { motion } from 'framer-motion';
import { TrendingDown, Target, BarChart3, Users } from 'lucide-react';

const problems = [
  { icon: TrendingDown, num: '01', title: 'Você investe, mas não vê retorno', desc: 'Gasta com tráfego, impulsiona posts, contrata freelancers — mas o caixa não muda.' },
  { icon: Target, num: '02', title: 'Seu marketing não gera vendas', desc: 'Produz conteúdo toda semana, mas os leads não aparecem e o telefone não toca.' },
  { icon: BarChart3, num: '03', title: 'Falta processo e previsibilidade', desc: 'Cada mês é uma surpresa. Sem funil, sem métricas, sem controle do que funciona.' },
  { icon: Users, num: '04', title: 'Você depende de indicação', desc: 'O digital deveria ser seu principal canal, mas ainda vive de boca a boca.' },
];

const ProblemSection = () => {
  return (
    <section className="relative py-32 md:py-40 bg-performake-dark noise-overlay">
      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mb-20"
        >
          <h2 className="text-performake-accent text-[11px] font-medium uppercase tracking-[0.2em]">O problema</h2>
          <h3 className="text-3xl md:text-5xl font-black text-white mt-4 tracking-[-0.02em] leading-[1.1]">
            Se marketing não gera venda,
            <br />
            <span className="text-gradient-accent">não é marketing.</span>
          </h3>
          <p className="text-white/35 mt-6 leading-relaxed text-lg font-light">
            A maioria das empresas trata marketing como custo, não como investimento. O resultado? Dinheiro jogado fora todo mês.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {problems.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * i }}
              className="group glass-card-light rounded-2xl p-8 hover:bg-white/[0.05] transition-all duration-500 hover:border-performake-accent/20"
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0">
                  <span className="text-performake-accent/30 text-[11px] font-mono font-bold">{p.num}</span>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <p.icon size={18} className="text-performake-accent/60" strokeWidth={1.5} />
                    <h3 className="text-lg font-bold text-white">{p.title}</h3>
                  </div>
                  <p className="text-white/35 leading-relaxed text-[15px] font-light">{p.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
