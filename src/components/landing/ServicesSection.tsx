import { motion } from 'framer-motion';
import { Compass, Megaphone, Users, Palette, Video, Bot, Code, Printer, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const services = [
  { icon: Compass, name: 'Consultoria Estratégica', slug: 'consultoria-estrategica', detail: 'Análise estratégica, plano de ação e acompanhamento mensal para seu negócio crescer com direção.' },
  { icon: Megaphone, name: 'Tráfego Pago', slug: 'trafego-pago', detail: 'Gestão de anúncios no Google e Meta para atrair clientes e abastecer seu funil de vendas.' },
  { icon: Users, name: 'Social Media', slug: 'social-media', detail: 'Gestão completa das redes sociais com conteúdo que posiciona e gera autoridade.' },
  { icon: Palette, name: 'Design & Criativos', slug: 'design-criativos', detail: 'Artes profissionais, identidade visual e criativos que convertem.' },
  { icon: Video, name: 'Audiovisual', slug: 'audiovisual', detail: 'Roteiros, reels e produção audiovisual para destacar sua marca.' },
  { icon: Bot, name: 'CRM & Automação', slug: 'crm-automacao', detail: 'Atendimento automatizado via WhatsApp com IA para nunca perder uma venda.' },
  { icon: Code, name: 'Sites & Sistemas', slug: 'sites-sistemas', detail: 'Sites institucionais, landing pages, sistemas web e aplicações sob medida.' },
  { icon: Printer, name: 'Gráfico (Impresso)', slug: 'grafico-impresso', detail: 'Cartões de visita, banners, folders, embalagens e todo material gráfico impresso.' },
];

const ServicesSection = () => {
  return (
    <section id="servicos" className="relative py-32 md:py-40 bg-[hsl(210,20%,97%)] overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full border border-performake-accent/[0.06] hidden lg:block" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full border border-performake-accent/[0.04] hidden lg:block" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mb-6"
        >
          <h2 className="text-performake-accent text-[11px] font-medium uppercase tracking-[0.2em]">Soluções</h2>
          <h3 className="text-3xl md:text-5xl font-black text-[hsl(186,94%,7%)] mt-4 tracking-[-0.02em]">
            Tudo que seu negócio precisa
            <br className="hidden md:block" />
            para vender mais
          </h3>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-[hsl(184,14%,45%)] max-w-2xl mb-16 leading-relaxed text-lg font-light"
        >
          Vender mais, para mais pessoas, mais vezes e pelo maior valor.
        </motion.p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((svc, i) => (
            <Link to={`/servicos/${svc.slug}`} key={i} className="block">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 * i }}
                className="group relative bg-white rounded-2xl p-7 border border-transparent hover:border-performake-accent/20 transition-all duration-500 overflow-hidden h-full"
                whileHover={{ y: -4, boxShadow: '0 20px 60px -15px hsla(176,100%,50%,0.12)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-performake-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[hsl(186,94%,7%)] flex items-center justify-center shadow-lg shadow-[hsl(186,94%,7%)]/10 group-hover:shadow-performake-accent/20 transition-shadow duration-500">
                      <svc.icon size={20} className="text-performake-accent" strokeWidth={1.5} />
                    </div>
                    <ArrowUpRight size={16} className="text-[hsl(184,14%,80%)] group-hover:text-performake-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 mt-1" />
                  </div>
                  <h3 className="text-[hsl(186,94%,7%)] font-bold text-base mb-3">{svc.name}</h3>
                  <p className="text-[hsl(184,14%,50%)] text-sm leading-relaxed font-light">{svc.detail}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
