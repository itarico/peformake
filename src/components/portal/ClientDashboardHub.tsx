import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Image as ImageIcon, 
  MessageCircle, 
  ArrowUpRight, 
  CalendarDays, 
  Zap,
  Target,
  FileText,
  MousePointerClick,
  Video
} from 'lucide-react';
import { MySquad } from './MySquad';

interface ClientDashboardHubProps {
  clientId: string;
  clientName: string;
  onTabChange: (tab: string) => void;
  metrics: {
    pendingArts: number;
    approvedArts: number;
    totalArts: number;
  };
}

export function ClientDashboardHub({ clientId, clientName, onTabChange, metrics }: ClientDashboardHubProps) {
  // Fetch recent traffic summary if available
  const { data: trafficSummary } = useQuery({
    queryKey: ['portal-dashboard-traffic', clientId],
    queryFn: async () => {
      const now = new Date();
      const { data } = await supabase
        .from('traffic_campaigns')
        .select('*')
        .eq('client_id', clientId)
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear());
      
      if (!data || data.length === 0) return null;
      
      return {
        investment: data.reduce((a, c) => a + (c.investment || 0), 0),
        leads: data.reduce((a, c) => a + (c.leads || 0), 0),
        reach: data.reduce((a, c) => a + (c.reach || 0), 0),
      };
    },
  });

  // Fetch recent planning focus
  const { data: activeFocus } = useQuery({
    queryKey: ['portal-active-focus', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('consulting_months')
        .select('monthly_focus, month, year')
        .eq('client_id', clientId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Welcome Card */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="overflow-hidden border-none bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white shadow-xl relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-3xl" />
            
            <CardContent className="p-8 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-3 py-1 text-xs font-bold uppercase tracking-wider mb-2">
                    Painel Geral
                  </Badge>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
                    Central de Crescimento <br />
                    <span className="text-white/80">Sua Equipe</span>
                  </h2>
                  <p className="text-white/70 max-w-sm text-sm sm:text-base font-medium">
                    Seu marketing centralizado, transparente e focado em resultados reais.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={() => onTabChange('artes')}
                    className="bg-white text-primary hover:bg-white/90 font-bold px-6 h-12 rounded-xl shadow-lg shadow-black/10"
                  >
                    Ver Artes
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => onTabChange('crm')}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold h-12 rounded-xl backdrop-blur-sm"
                  >
                    Acessar CRM
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricSummaryCard 
              icon={ImageIcon} 
              label="Artes Mensais" 
              value={`${metrics.approvedArts}/${metrics.totalArts}`}
              trend={metrics.approvedArts >= metrics.totalArts ? "Concluído" : "Em progresso"}
              color="blue"
              onClick={() => onTabChange('artes')}
            />
            <MetricSummaryCard 
              icon={Target} 
              label="Novos Leads" 
              value={trafficSummary?.leads.toString() || "0"}
              trend="+12% este mês" 
              color="green"
              onClick={() => onTabChange('trafego')}
            />
            <MetricSummaryCard 
              icon={BarChart3} 
              label="Alcance" 
              value={trafficSummary ? (trafficSummary.reach > 1000 ? `${(trafficSummary.reach/1000).toFixed(1)}k` : trafficSummary.reach) : "---"}
              trend="Alcance Total"
              color="purple"
              onClick={() => onTabChange('trafego')}
            />
            <MetricSummaryCard 
              icon={Zap} 
              label="Atividades" 
              value={metrics.pendingArts.toString()}
              trend="Pendentes"
              color="orange"
              onClick={() => onTabChange('artes')}
            />
          </div>

          {/* Active Focus Section */}
          <Card className="border-primary/10 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-primary/5">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Foco Estratégico do Mês
              </CardTitle>
              <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                {activeFocus ? `${activeFocus.month}/${activeFocus.year}` : 'Atual'}
              </Badge>
            </CardHeader>
            <CardContent className="p-6">
              {activeFocus?.monthly_focus ? (
                <div className="space-y-4">
                  <p className="text-foreground/90 font-medium leading-relaxed">
                    "{activeFocus.monthly_focus}"
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="link" onClick={() => onTabChange('planejamento')} className="text-primary p-0 h-auto font-bold flex items-center gap-1">
                      Ver planejamento detalhado <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">Nenhum foco definido para este mês ainda.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <MySquad clientId={clientId} />
          
          <Card className="border-none bg-primary/5 shadow-none overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary/70">Atalhos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              <QuickLinkButton icon={ImageIcon} label="Minhas Artes" onClick={() => onTabChange('artes')} />
              <QuickLinkButton icon={BarChart3} label="Resultados de Tráfego" onClick={() => onTabChange('trafego')} />
              <QuickLinkButton icon={MessageCircle} label="Acessar CRM" onClick={() => onTabChange('crm')} />
              <QuickLinkButton icon={Video} label="Audiovisual / Vídeos" onClick={() => onTabChange('audiovisual')} />
              <QuickLinkButton icon={FileText} label="Estratégia e Planejamento" onClick={() => onTabChange('planejamento')} />
              <QuickLinkButton icon={MousePointerClick} label="Atualizar Briefing" onClick={() => onTabChange('quiz')} />
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 border-primary/20 bg-transparent">
            <CardContent className="p-6 text-center">
              <h4 className="font-bold text-sm mb-2">Precisa de algo mais?</h4>
              <p className="text-xs text-muted-foreground mb-4">Estamos prontos para escalar o seu negócio em novas frentes.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-primary/20 hover:bg-primary/5 text-primary font-bold"
                onClick={() => window.open('https://wa.me/5581985672212', '_blank')}
              >
                Solicitar Upgrade
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricSummaryCard({ icon: Icon, label, value, trend, color, onClick }: any) {
  const colors: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    green: "text-emerald-600 bg-emerald-50 border-emerald-100",
    purple: "text-purple-600 bg-purple-50 border-purple-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
  };

  return (
    <Card 
      onClick={onClick}
      className="cursor-pointer hover:shadow-md transition-all border-none bg-card hover:bg-accent/5 overflow-hidden relative group"
    >
      <div className="p-4 relative z-10">
        <div className={`p-2 w-fit rounded-lg mb-3 ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate mb-1">{label}</p>
        <p className="text-xl font-black group-hover:text-primary transition-colors">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1 font-medium">{trend}</p>
      </div>
      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="h-3 w-3 text-primary" />
      </div>
    </Card>
  );
}

function QuickLinkButton({ icon: Icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-all group text-sm font-medium text-foreground/80 hover:text-primary"
    >
      <div className="p-1.5 rounded-md bg-white group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      <span className="truncate">{label}</span>
      <ArrowUpRight className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
    </button>
  );
}
