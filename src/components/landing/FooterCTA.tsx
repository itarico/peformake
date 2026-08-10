import { useState } from 'react';
import { Instagram, MessageCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logoWhite from '@/assets/logo-white.png';

const footerServices = [
  { label: 'Consultoria Estratégica', slug: 'consultoria-estrategica' },
  { label: 'Tráfego Pago', slug: 'trafego-pago' },
  { label: 'Social Media', slug: 'social-media' },
  { label: 'Design & Criativos', slug: 'design-criativos' },
  { label: 'Audiovisual', slug: 'audiovisual' },
  { label: 'CRM & Automação', slug: 'crm-automacao' },
  { label: 'Sites & Sistemas', slug: 'sites-sistemas' },
  { label: 'Gráfico (Impresso)', slug: 'grafico-impresso' },
];

const FooterCTA = () => {
  const navigate = useNavigate();
  const [servicesOpen, setServicesOpen] = useState(false);

  return (
    <>
      {/* CTA Band */}
      <section className="relative py-24 md:py-32 bg-[hsl(186,94%,7%)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-performake-accent/[0.06] via-transparent to-[hsl(280,60%,30%)]/[0.04]" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute -right-32 -top-32 w-96 h-96 rounded-full border border-performake-accent/[0.08] hidden lg:block"
        />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-3xl md:text-5xl font-black text-white tracking-[-0.02em] mb-6"
          >
            Pronto para parar de
            <br />
            <span className="text-gradient-accent">tentar marketing?</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-white/35 text-lg mb-10 font-light"
          >
            Receba uma análise estratégica personalizada e descubra os gargalos que impedem sua empresa de escalar.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: '0 0 50px 10px hsla(176,100%,50%,0.25)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/captura-lead')}
              className="inline-flex items-center gap-3 bg-performake-accent text-[hsl(186,94%,7%)] font-bold px-10 py-5 rounded-xl text-lg shadow-2xl shadow-performake-accent/30 transition-all duration-300"
            >
              Garantir minha análise estratégica
              <ArrowRight size={20} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(186,94%,4%)] py-16">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate('/')}>
                <img src={logoWhite} alt="Peformake" className="h-10 w-auto" />
                <span className="text-lg font-black text-white tracking-tight">PEFORMAKE</span>
              </div>
              <p className="text-white/25 text-sm leading-relaxed max-w-xs font-light">
                Assessoria de marketing digital com foco em resultados mensuráveis e crescimento sustentável.
              </p>
            </div>

            <div>
              <h4 className="text-white/50 text-[11px] font-medium uppercase tracking-[0.2em] mb-5">Navegação</h4>
              <div className="space-y-3">
                <a href="/#metodo" className="block text-white/30 hover:text-white text-sm transition-colors font-light">Método</a>
                <a href="/servicos" className="block text-white/30 hover:text-white text-sm transition-colors font-light">Serviços</a>
                <button onClick={() => navigate('/captura-lead')} className="block text-white/30 hover:text-white text-sm transition-colors font-light">Análise Estratégica</button>
              </div>
            </div>

            {/* Services with hover/click dropdown */}
            <div>
              <div
                className="relative"
                onMouseEnter={() => setServicesOpen(true)}
                onMouseLeave={() => setServicesOpen(false)}
              >
                <button
                  onClick={() => setServicesOpen(!servicesOpen)}
                  className="text-white/50 text-[11px] font-medium uppercase tracking-[0.2em] mb-5 flex items-center gap-1.5 hover:text-white/70 transition-colors"
                >
                  Serviços <ChevronDown size={12} className={`transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {servicesOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      {footerServices.map((s) => (
                        <button
                          key={s.slug}
                          onClick={() => { navigate(`/servicos/${s.slug}`); setServicesOpen(false); }}
                          className="block text-white/30 hover:text-performake-accent text-sm transition-colors font-light w-full text-left"
                        >
                          {s.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div>
              <h4 className="text-white/50 text-[11px] font-medium uppercase tracking-[0.2em] mb-5">Social</h4>
              <div className="flex items-center gap-3">
                <a href="https://instagram.com/peformake" target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-performake-accent hover:border-performake-accent/30 transition-all duration-300">
                  <Instagram size={16} />
                </a>
                <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-performake-accent hover:border-performake-accent/30 transition-all duration-300">
                  <MessageCircle size={16} />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.04] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-white/20 text-[11px] font-light">
              © {new Date().getFullYear()} Peformake. Todos os direitos reservados.
            </div>
            <div className="flex items-center gap-6 text-white/20 text-[11px] font-light">
              <a href="/terms" className="hover:text-white/40 transition-colors">Termos</a>
              <a href="/privacy" className="hover:text-white/40 transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default FooterCTA;
