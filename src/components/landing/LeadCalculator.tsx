import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

// Average CPL (cost per lead) by niche — realistic Brazilian market estimates
const nicheData: Record<string, { label: string; cplMin: number; cplMax: number; conversionRate: number }> = {
  gastronomia: { label: 'Gastronomia', cplMin: 3, cplMax: 8, conversionRate: 0.15 },
  ecommerce: { label: 'E-commerce', cplMin: 5, cplMax: 15, conversionRate: 0.08 },
  saude: { label: 'Saúde & Estética', cplMin: 8, cplMax: 25, conversionRate: 0.12 },
  educacao: { label: 'Educação', cplMin: 6, cplMax: 18, conversionRate: 0.10 },
  servicos: { label: 'Serviços Profissionais', cplMin: 10, cplMax: 30, conversionRate: 0.10 },
  imobiliario: { label: 'Imobiliário', cplMin: 15, cplMax: 50, conversionRate: 0.05 },
  advocacia: { label: 'Advocacia', cplMin: 12, cplMax: 35, conversionRate: 0.08 },
  fitness: { label: 'Fitness & Academias', cplMin: 4, cplMax: 12, conversionRate: 0.12 },
  varejo: { label: 'Varejo Local', cplMin: 3, cplMax: 10, conversionRate: 0.12 },
  outro: { label: 'Outro', cplMin: 8, cplMax: 25, conversionRate: 0.08 },
};

const LeadCalculator = () => {
  const [niche, setNiche] = useState('gastronomia');
  const [investment, setInvestment] = useState(1000);
  const [ticketMedio, setTicketMedio] = useState(100);

  const data = nicheData[niche];

  const results = useMemo(() => {
    const avgCpl = (data.cplMin + data.cplMax) / 2;
    const estimatedLeads = Math.round(investment / avgCpl);
    const estimatedClients = Math.round(estimatedLeads * data.conversionRate);
    const estimatedRevenue = estimatedClients * ticketMedio;
    const roi = investment > 0 ? ((estimatedRevenue - investment) / investment) * 100 : 0;

    return {
      leads: estimatedLeads,
      clients: estimatedClients,
      revenue: estimatedRevenue,
      roi: Math.round(roi),
      cplRange: `R$ ${data.cplMin} - R$ ${data.cplMax}`,
    };
  }, [niche, investment, ticketMedio, data]);

  return (
    <section className="relative py-20 md:py-28 bg-performake-dark noise-overlay">
      <div className="absolute inset-0 bg-gradient-to-b from-performake-accent/[0.03] to-transparent" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-performake-accent/[0.08] border border-performake-accent/20 rounded-full px-4 py-1.5 mb-6">
            <Calculator size={14} className="text-performake-accent" />
            <span className="text-performake-accent text-xs font-bold uppercase tracking-[0.15em]">Calculadora de leads</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-[-0.02em]">
            Simule o retorno do seu investimento
          </h2>
          <p className="text-white/35 mt-3 text-base font-light max-w-xl mx-auto">
            Escolha seu nicho, defina o investimento e veja quantos leads e vendas você pode gerar.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 space-y-8"
          >
            {/* Niche selector */}
            <div>
              <label className="text-white/50 text-xs font-medium uppercase tracking-wider mb-3 block">Área de atuação</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(nicheData).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setNiche(key)}
                    className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      niche === key
                        ? 'bg-performake-accent/15 border border-performake-accent/40 text-performake-accent'
                        : 'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/10'
                    }`}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Investment slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Investimento mensal</label>
                <span className="text-performake-accent font-bold text-lg">
                  R$ {investment.toLocaleString('pt-BR')}
                </span>
              </div>
              <Slider
                value={[investment]}
                onValueChange={([v]) => setInvestment(v)}
                min={200}
                max={30000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-white/20 mt-1">
                <span>R$ 200</span>
                <span>R$ 30.000</span>
              </div>
            </div>

            {/* Ticket médio slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-white/50 text-xs font-medium uppercase tracking-wider">Ticket médio do produto</label>
                <span className="text-performake-accent font-bold text-lg">
                  R$ {ticketMedio.toLocaleString('pt-BR')}
                </span>
              </div>
              <Slider
                value={[ticketMedio]}
                onValueChange={([v]) => setTicketMedio(v)}
                min={10}
                max={10000}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-white/20 mt-1">
                <span>R$ 10</span>
                <span>R$ 10.000</span>
              </div>
            </div>

            <div className="text-[11px] text-white/20 bg-white/[0.02] rounded-lg p-3">
              <strong className="text-white/30">CPL médio para {data.label}:</strong> {results.cplRange}
              <br />
              <strong className="text-white/30">Taxa de conversão estimada:</strong> {(data.conversionRate * 100).toFixed(0)}%
            </div>
          </motion.div>

          {/* Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <ResultCard
              icon={Users}
              label="Leads estimados"
              value={`${results.leads}`}
              subtitle="contatos qualificados/mês"
              color="text-blue-400"
              bgColor="bg-blue-400/10"
            />
            <ResultCard
              icon={TrendingUp}
              label="Clientes estimados"
              value={`${results.clients}`}
              subtitle="vendas fechadas/mês"
              color="text-emerald-400"
              bgColor="bg-emerald-400/10"
            />
            <ResultCard
              icon={DollarSign}
              label="Faturamento estimado"
              value={`R$ ${results.revenue.toLocaleString('pt-BR')}`}
              subtitle="receita mensal gerada"
              color="text-performake-accent"
              bgColor="bg-performake-accent/10"
            />
            <div className={`rounded-2xl border p-6 ${results.roi > 0 ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-red-500/30 bg-red-500/[0.05]'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-xs font-medium uppercase tracking-wider">ROI estimado</p>
                  <p className={`text-4xl font-black mt-1 ${results.roi > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {results.roi > 0 ? '+' : ''}{results.roi}%
                  </p>
                </div>
                <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${results.roi > 0 ? 'bg-emerald-400/20 text-emerald-300' : 'bg-red-400/20 text-red-300'}`}>
                  {results.roi > 100 ? 'Excelente' : results.roi > 50 ? 'Bom' : results.roi > 0 ? 'Positivo' : 'Negativo'}
                </div>
              </div>
              <p className="text-white/20 text-[11px] mt-3">
                * Valores estimados com base em médias do mercado brasileiro. Resultados reais podem variar.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const ResultCard = ({ icon: Icon, label, value, subtitle, color, bgColor }: {
  icon: any; label: string; value: string; subtitle: string; color: string; bgColor: string;
}) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 flex items-center gap-5">
    <div className={`w-14 h-14 rounded-xl ${bgColor} flex items-center justify-center shrink-0`}>
      <Icon size={24} className={color} />
    </div>
    <div>
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-black ${color} mt-0.5`}>{value}</p>
      <p className="text-white/20 text-[11px]">{subtitle}</p>
    </div>
  </div>
);

export default LeadCalculator;
