import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogIn, ArrowRight, ChevronDown, UtensilsCrossed } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logoWhite from '@/assets/logo-white.png';

const LandingNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [metodoOpen, setMetodoOpen] = useState(false);
  const metodoRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (metodoRef.current && !metodoRef.current.contains(e.target as Node)) setMetodoOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const goHome = () => {
    setMobileOpen(false);
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    setMetodoOpen(false);
    if (location.pathname !== '/') {
      navigate('/#' + id);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const goTo = (path: string) => {
    setMobileOpen(false);
    setMetodoOpen(false);
    navigate(path);
  };

  const serviceLinks = [
    { label: 'Consultoria Estratégica', slug: 'consultoria-estrategica' },
    { label: 'Tráfego Pago', slug: 'trafego-pago' },
    { label: 'Social Media', slug: 'social-media' },
    { label: 'Design & Criativos', slug: 'design-criativos' },
    { label: 'Audiovisual', slug: 'audiovisual' },
    { label: 'CRM & Automação', slug: 'crm-automacao' },
    { label: 'Sites & Sistemas', slug: 'sites-sistemas' },
    { label: 'Gráfico (Impresso)', slug: 'grafico-impresso' },
  ];

  const [servicosOpen, setServicosOpen] = useState(false);
  const servicosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside2 = (e: MouseEvent) => {
      if (servicosRef.current && !servicosRef.current.contains(e.target as Node)) setServicosOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside2);
    return () => document.removeEventListener('mousedown', handleClickOutside2);
  }, []);

  const links = [
    { label: 'Resultados', action: () => scrollTo('resultados') },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        scrolled
          ? 'bg-[hsl(186,94%,5%)]/80 backdrop-blur-2xl border-b border-white/[0.04] shadow-2xl shadow-black/20'
          : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={goHome}
        >
          <img src={logoWhite} alt="Peformake" className="h-12 w-auto transition-transform duration-300 group-hover:scale-105" fetchPriority="high" />
          <span className="text-lg font-black tracking-tight text-white">PEFORMAKE</span>
        </div>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {/* Método dropdown */}
          <div className="relative" ref={metodoRef}>
            <button
              onClick={() => setMetodoOpen(!metodoOpen)}
              className="relative px-4 py-2 text-[13px] font-medium text-white/50 hover:text-white transition-colors duration-300 tracking-wide group flex items-center gap-1"
              aria-expanded={metodoOpen}
              aria-haspopup="true"
              aria-label="Menu Método"
            >
              Método
              <ChevronDown size={12} className={`transition-transform duration-200 ${metodoOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-performake-accent group-hover:w-3/4 transition-all duration-300" />
            </button>
            <AnimatePresence>
              {metodoOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-56 bg-[hsl(186,94%,5%)]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/40 z-50"
                >
                  <button
                    onClick={() => scrollTo('metodo')}
                    className="w-full text-left px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-3"
                    type="button"
                  >
                    <ArrowRight size={14} className="text-performake-accent" />
                    Método PEFORMAKE
                  </button>
                  <div className="h-px bg-white/[0.06]" />
                  <button
                    onClick={() => goTo('/gastronomia')}
                    className="w-full text-left px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-gastro-accent/10 transition-colors flex items-center gap-3"
                    type="button"
                  >
                    <UtensilsCrossed size={14} className="text-gastro-accent" />
                    <div>
                      <span className="block font-medium">Gastronomia</span>
                      <span className="block text-[10px] text-white/30">Método exclusivo para restaurantes</span>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Serviços dropdown */}
          <div className="relative" ref={servicosRef}>
            <button
              onClick={() => setServicosOpen(!servicosOpen)}
              className="relative px-4 py-2 text-[13px] font-medium text-white/50 hover:text-white transition-colors duration-300 tracking-wide group flex items-center gap-1"
              aria-expanded={servicosOpen}
              aria-haspopup="true"
              aria-label="Menu Serviços"
            >
              Serviços
              <ChevronDown size={12} className={`transition-transform duration-200 ${servicosOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-performake-accent group-hover:w-3/4 transition-all duration-300" />
            </button>
            <AnimatePresence>
              {servicosOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-[hsl(186,94%,5%)]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/40 z-50 max-h-[70vh] overflow-y-auto"
                >
                  {serviceLinks.map((sl, i) => (
                    <button
                      key={sl.slug}
                      onClick={() => goTo(`/servicos/${sl.slug}`)}
                      className="w-full text-left px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-3"
                      type="button"
                    >
                      <ArrowRight size={14} className="text-performake-accent" />
                      {sl.label}
                    </button>
                  ))}
                  <div className="h-px bg-white/[0.06]" />
                  <button
                    onClick={() => goTo('/servicos')}
                    className="w-full text-left px-4 py-3 text-sm text-performake-accent hover:bg-performake-accent/10 transition-colors flex items-center gap-3 font-medium"
                    type="button"
                  >
                    <ArrowRight size={14} aria-hidden="true" />
                    Ver todos os serviços
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {links.map((link) => (
            <button
              key={link.label}
              onClick={link.action}
              className="relative px-4 py-2 text-[13px] font-medium text-white/50 hover:text-white transition-colors duration-300 tracking-wide group"
              type="button"
            >
              {link.label}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-performake-accent group-hover:w-3/4 transition-all duration-300" />
            </button>
          ))}
          <div className="w-px h-5 bg-white/10 mx-3" />
          <button
            onClick={() => goTo('/captura-lead')}
            className="relative bg-performake-accent text-[hsl(186,94%,7%)] px-6 py-2.5 rounded-lg text-[13px] font-bold tracking-wide hover:shadow-lg hover:shadow-performake-accent/20 transition-all duration-300"
            type="button"
          >
            Quero Escalar Agora
          </button>
          <div className="w-px h-5 bg-white/10 mx-3" />
          <button
            onClick={() => goTo('/login')}
            className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.12] hover:border-performake-accent/40 hover:bg-performake-accent/10 px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white/70 hover:text-white transition-all duration-300 group"
            type="button"
          >
            <LogIn size={15} className="text-performake-accent" aria-hidden="true" />
            Entrar
          </button>
        </div>

        {/* Mobile */}
        <button 
          onClick={() => setMobileOpen(!mobileOpen)} 
          className="md:hidden text-white p-2"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[hsl(186,94%,5%)]/95 backdrop-blur-2xl border-t border-white/[0.04] px-6 py-6 space-y-1 overflow-hidden"
          >
            {/* Mobile: Método section */}
            <button
              onClick={() => scrollTo('metodo')}
              className="block w-full text-left text-white/60 hover:text-white py-3 text-sm font-medium transition-colors"
            >
              Método PEFORMAKE
            </button>
            <button
              onClick={() => goTo('/gastronomia')}
              className="block w-full text-left text-gastro-accent/80 hover:text-gastro-accent py-3 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <UtensilsCrossed size={14} /> Gastronomia
            </button>
            <div className="h-px bg-white/[0.06] my-1" />
            <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] py-2">Serviços</p>
            {serviceLinks.map((sl) => (
              <button
                key={sl.slug}
                onClick={() => goTo(`/servicos/${sl.slug}`)}
                className="block w-full text-left text-white/60 hover:text-white py-2.5 text-sm font-medium transition-colors pl-2"
              >
                {sl.label}
              </button>
            ))}
            <div className="h-px bg-white/[0.06] my-1" />
            {links.map((link) => (
              <button
                key={link.label}
                onClick={link.action}
                className="block w-full text-left text-white/60 hover:text-white py-3 text-sm font-medium transition-colors"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => goTo('/captura-lead')}
              className="block w-full border border-performake-accent text-performake-accent hover:bg-performake-accent hover:text-[hsl(186,94%,7%)] px-6 py-3.5 rounded-lg font-bold text-center text-sm mt-4 transition-all duration-300"
            >
              Quero Escalar Agora
            </button>
            <button
              onClick={() => goTo('/login')}
              className="w-full bg-white/[0.06] border border-white/[0.12] text-white py-3.5 rounded-lg text-sm font-bold mt-2 transition-all flex items-center justify-center gap-2"
            >
              <LogIn size={15} className="text-performake-accent" />
              Entrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default LandingNav;
