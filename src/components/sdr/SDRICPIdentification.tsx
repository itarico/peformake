import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, TrendingUp, CheckCircle2, AlertCircle, 
  HelpCircle, Building2, Users, DollarSign, 
  MessageSquare, Zap, ShieldCheck, Search,
  ArrowRight, Info
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ICP_PILLARS = [
  {
    title: 'Firmográfico',
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    description: 'A anatomia da empresa ideal.',
    criteria: ['Nicho: Saúde, Estética, Academias', 'Faturamento: R$ 30k a R$ 150k/mês', 'Time: 2 a 10 colaboradores']
  },
  {
    title: 'Tecnográfico',
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    description: 'Maturidade digital e ferramentas.',
    criteria: ['Possui Instagram Profissional', 'Investe em Anúncios (Facebook/Google)', 'Utiliza WhatsApp para Vendas']
  },
  {
    title: 'Psicográfico',
    icon: MessageSquare,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    description: 'Mentalidade e dores do dono.',
    criteria: ['Dono sobrecarregado (Eu-equipe)', 'Quer escala, mas não sabe como', 'Valoriza tempo sobre dinheiro']
  },
  {
    title: 'Comportamental',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    description: 'Sinais de prontidão de compra.',
    criteria: ['Responde em menos de 1h', 'Já tentou outras agências/gestores', 'Tem clareza do seu ticket médio']
  }
];

const ICP_PERSONAS = [
  {
    name: 'Doutor(a) Empresário(a)',
    role: 'Dono(a) de Clínica',
    pain: 'Muitos pacientes curiosos, poucos fechamentos de alto valor.',
    dream: 'Agenda lotada com procedimentos de alta margem.',
    match: '95%',
    image: 'https://images.unsplash.com/photo-1559839734-2b71f1536780?auto=format&fit=crop&q=80&w=200&h=200'
  },
  {
    name: 'Sócio Operacional',
    role: 'Dono de Academia/Box',
    pain: 'Taxa de cancelamento alta e dificuldade em atrair novos alunos.',
    dream: 'Recorrência previsível e time de vendas independente.',
    match: '85%',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=200&h=200'
  }
];

const SDRICPIdentification = () => {
  const [scores, setScores] = useState({
    budget: 0,
    authority: 0,
    need: 0,
    timeline: 0,
    fit: 0
  });

  const calculateTotal = () => {
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    return Math.min(100, (total / 50) * 100); // Max score is 50 in current setup
  };

  const getFitLevel = (score: number) => {
    if (score >= 80) return { label: 'ALTO FIT (HOT)', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 };
    if (score >= 50) return { label: 'MÉDIO FIT (WARM)', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Info };
    return { label: 'BAIXO FIT (COLD)', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle };
  };

  const totalScore = calculateTotal();
  const fitInfo = getFitLevel(totalScore);
  const FitIcon = fitInfo.icon;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          {/* Header Info */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Identificação de ICP</h2>
                <p className="text-muted-foreground">Definição estratégica do Ideal Customer Profile para a Peformake.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ICP_PILLARS.map((pillar) => (
                <Card key={pillar.title} className={`border-none shadow-sm hover:shadow-md transition-all overflow-hidden`}>
                  <div className={`h-1 w-full ${pillar.bg.replace('bg-', 'bg-')}`} style={{ backgroundColor: 'currentColor', color: pillar.color.replace('text-', '') }} />
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${pillar.bg} ${pillar.color}`}>
                        <pillar.icon className="h-4 w-4" />
                      </div>
                      <h4 className="font-black text-sm uppercase tracking-wider">{pillar.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 font-medium">{pillar.description}</p>
                    <ul className="space-y-2">
                      {pillar.criteria.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] font-bold text-slate-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary/40 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Personas Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Users className="h-4 w-4" /> Personas Mapeadas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ICP_PERSONAS.map((persona) => (
                <Card key={persona.name} className="overflow-hidden border-slate-100 bg-white group hover:border-primary/30 transition-all">
                  <CardContent className="p-0 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-32 h-32 sm:h-auto overflow-hidden">
                      <img src={persona.image} alt={persona.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-sm text-slate-900">{persona.name}</h4>
                          <Badge variant="secondary" className="text-[9px] font-bold uppercase py-0">{persona.role}</Badge>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[10px]">{persona.match} FIT</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] leading-tight text-slate-500">
                          <span className="font-bold text-red-500 uppercase mr-1">Dor:</span> {persona.pain}
                        </p>
                        <p className="text-[10px] leading-tight text-slate-500">
                          <span className="font-bold text-emerald-500 uppercase mr-1">Sonho:</span> {persona.dream}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* Fit Simulator - Fixed Sidebar style */}
        <div className="w-full lg:w-96 space-y-6">
          <Card className="border-none shadow-2xl bg-slate-900 text-white relative overflow-hidden ring-4 ring-primary/10">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Zap className="h-32 w-32 rotate-12 fill-white" />
            </div>
            
            <CardHeader className="pb-6 relative z-10">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" /> Lead Score 2.0
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium">Avalie o potencial de fechamento.</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8 relative z-10">
              <div className="space-y-6">
                {Object.entries(scores).map(([key, value]) => (
                  <div key={key} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {key === 'budget' ? 'Orçamento' : 
                         key === 'authority' ? 'Autoridade' : 
                         key === 'need' ? 'Necessidade' : 
                         key === 'timeline' ? 'Urgência' : 'Nicho Fit'}
                      </Label>
                      <span className="text-xs font-black text-primary">{value}/10</span>
                    </div>
                    <input 
                      type="range" min="0" max="10" step="1" 
                      value={value}
                      onChange={(e) => setScores({...scores, [key]: parseInt(e.target.value)})}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                ))}
              </div>

              <div className={`p-6 rounded-2xl border-2 transition-all duration-700 bg-white/5 border-white/10`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black tracking-widest uppercase ${fitInfo.color}`}>{fitInfo.label}</span>
                    <span className="text-4xl font-black text-white">{totalScore.toFixed(0)}%</span>
                  </div>
                  <div className={`p-3 rounded-2xl bg-white/10 ${fitInfo.color}`}>
                    <FitIcon className="h-8 w-8" />
                  </div>
                </div>
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden mb-4">
                  <div 
                    className={`h-full transition-all duration-1000 ${totalScore >= 80 ? 'bg-emerald-500' : totalScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                    style={{ width: `${totalScore}%` }} 
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                  {totalScore >= 80 ? 'Oportunidade de Ouro! Encaminhar para o Closer imediatamente.' : 
                   totalScore >= 50 ? 'Bom potencial. Iniciar cadência de prospecção ativa.' : 
                   'Baixo fit. Recomenda-se apenas nutrição por e-mail.'}
                </p>
              </div>

              <Button className="w-full h-12 gap-2 shadow-lg bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs">
                <Search className="h-4 w-4" /> Validar Perfil no CRM
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-dashed border-primary/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 leading-tight">
                <strong>Dica:</strong> Se o Lead Score for maior que 70%, o SDR deve tentar o agendamento no primeiro contato.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SDRICPIdentification;
