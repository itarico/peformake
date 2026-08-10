import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-performake-dark">
      {/* Single ambient glow - simplified for performance */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-performake-accent/[0.04] blur-[150px]" />
      
      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-performake-accent/20 to-transparent" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-16 transform-gpu">
        {/* Badge */}
        <div className="mb-10">
          <span className="inline-flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-full px-5 py-2">
            <Sparkles size={12} className="text-performake-accent" />
            <span className="text-white/60 text-[11px] font-medium uppercase tracking-[0.2em]">
              Assessoria de marketing digital
            </span>
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black text-white leading-[0.95] mb-8 tracking-[-0.03em]">
          Marketing é
          <br />
          <span className="text-gradient-accent">venda.</span>
        </h1>

        <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-6 leading-relaxed font-light">
          Existe um método para que sua empresa nunca pare de vender.
          <br className="hidden md:block" />
          Se você não seguí-lo, ela não vai sair do lugar.
        </p>

        <p className="text-sm text-white/25 mb-14 font-light">
          Estruturamos, posicionamos e escalamos empresas com estratégia, execução e dados.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Button
            onClick={() => navigate('/captura-lead')}
            className="group bg-performake-accent text-[hsl(186,94%,7%)] px-10 py-7 rounded-xl font-bold text-base shadow-2xl shadow-performake-accent/20 transition-all duration-300 hover:shadow-performake-accent/30 active:scale-95 hover:bg-performake-accent/90"
            type="button"
          >
            <span className="flex items-center gap-3">
              Quero escalar meu negócio
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </span>
          </Button>
          <a
            href="https://wa.me/5500000000000?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20a%20assessoria%20de%20marketing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white px-8 py-4 font-medium transition-all duration-300 text-base border border-white/[0.06] rounded-xl hover:border-white/[0.15] hover:bg-white/[0.03] inline-flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.597-.768-6.399-2.073l-.447-.338-3.104 1.04 1.04-3.104-.338-.447A9.958 9.958 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
            Falar no WhatsApp
          </a>
        </div>

        {/* Inline social proof */}
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {[
            { value: '+200', label: 'empresas atendidas' },
            { value: '+R$50M', label: 'gerados em vendas' },
            { value: '+10', label: 'anos de mercado' },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl font-black text-white/80">{stat.value}</span>
              <span className="text-[11px] text-white/30 uppercase tracking-wider leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown size={20} className="text-white/20" />
      </div>
    </section>
  );
};

export default HeroSection;
