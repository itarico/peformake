import React, { useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  TrendingUp, Users, Clock, DollarSign, Target, PieChart, 
  ArrowUpRight, ArrowDownRight, Info, Search, Filter,
  Calendar, Briefcase, Zap
} from 'lucide-react';
import { differenceInMonths, format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import RetentionPanel from './RetentionPanel';

const CohortPanel = () => {
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['cohort-tab-clients'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('*');
      return data || [];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ['cohort-tab-events'],
    queryFn: async () => {
      const { data } = await supabase.from('client_events').select('*');
      return data || [];
    },
  });

  const { data: clientServices = [] } = useQuery({
    queryKey: ['cohort-tab-services'],
    queryFn: async () => {
      const { data } = await supabase.from('client_services').select('*').eq('is_active', true);
      return data || [];
    },
  });

  const getClientRevenue = (client: any) => {
    const services = clientServices.filter(cs => cs.client_id === client.id);
    if (services.length > 0) {
      return services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
    }
    return ((client.price_per_art || 0) * (client.arts_per_month || 0)) + (client.consulting_price_per_month || 0);
  };

  const getClientLT = (client: any) => {
    const joinDate = new Date(client.created_at);
    const churnEvent = events.find(e => e.client_id === client.id && e.event_type === 'churned');
    const endDate = churnEvent ? new Date(churnEvent.event_date) : new Date();
    return Math.max(1, differenceInMonths(endDate, joinDate));
  };

  const analysisData = useMemo(() => {
    if (!clients.length) return { niches: [], sizes: [], services: [], quarters: [], summary: {} };

    const nichesMap: Record<string, any> = {};
    const sizesMap: Record<string, any> = {
      'Pequeno (Até R$ 2k)': { label: 'Pequeno', clients: [] },
      'Médio (R$ 2k - R$ 5k)': { label: 'Médio', clients: [] },
      'Grande (Acima de R$ 5k)': { label: 'Grande', clients: [] }
    };
    const servicesMap: Record<string, any> = {
      'Design': { label: 'Design', clients: [] },
      'Consultoria': { label: 'Consultoria', clients: [] },
      'Audiovisual': { label: 'Audiovisual', clients: [] }
    };
    const quartersMap: Record<string, any> = {};

    clients.forEach(client => {
      const rev = getClientRevenue(client);
      const lt = getClientLT(client);
      const niche = client.business_segment || 'Outros';
      
      // Niche grouping
      if (!nichesMap[niche]) nichesMap[niche] = { label: niche, clients: [] };
      nichesMap[niche].clients.push({ rev, lt, name: client.name });

      // Size grouping
      if (rev < 2000) sizesMap['Pequeno (Até R$ 2k)'].clients.push({ rev, lt, name: client.name });
      else if (rev <= 5000) sizesMap['Médio (R$ 2k - R$ 5k)'].clients.push({ rev, lt, name: client.name });
      else sizesMap['Grande (Acima de R$ 5k)'].clients.push({ rev, lt, name: client.name });

      // Service grouping
      if (client.has_design_service) servicesMap['Design'].clients.push({ rev, lt, name: client.name });
      if (client.has_consulting_service) servicesMap['Consultoria'].clients.push({ rev, lt, name: client.name });
      if (client.has_audiovisual_service) servicesMap['Audiovisual'].clients.push({ rev, lt, name: client.name });

      // Quarter grouping
      const date = new Date(client.created_at);
      const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      if (!quartersMap[quarter]) quartersMap[quarter] = { label: quarter, clients: [] };
      quartersMap[quarter].clients.push({ rev, lt, name: client.name });
    });

    const processMap = (map: Record<string, any>) => {
      return Object.values(map).map(item => {
        const count = item.clients.length;
        const totalRev = item.clients.reduce((s: number, c: any) => s + c.rev, 0);
        const totalLT = item.clients.reduce((s: number, c: any) => s + c.lt, 0);
        const clientNames = item.clients.map((c: any) => c.name);
        return {
          label: item.label,
          count,
          percentage: (count / clients.length) * 100,
          avgLT: count > 0 ? totalLT / count : 0,
          totalRev,
          avgRev: count > 0 ? totalRev / count : 0,
          ltv: count > 0 ? (totalRev / count) * (totalLT / count) : 0,
          clientNames
        };
      }).sort((a, b) => b.totalRev - a.totalRev);
    };

    const niches = processMap(nichesMap);
    const avgLTOverall = niches.reduce((s, n) => s + n.avgLT * n.count, 0) / clients.length;
    const totalRevOverall = niches.reduce((s, n) => s + n.totalRev, 0);

    return {
      niches,
      sizes: processMap(sizesMap),
      services: processMap(servicesMap),
      quarters: processMap(quartersMap),
      summary: {
        avgLT: avgLTOverall,
        totalRev: totalRevOverall,
        bestNiche: niches[0]?.label || '—',
        activeCount: clients.filter(c => c.is_active).length
      }
    };
  }, [clients, events, clientServices]);

  if (loadingClients) {
    return <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const Section = ({ title, description, icon: Icon, data, id }: { title: string, description: string, icon: any, data: any[], id?: string }) => (
    <Card id={id} className="overflow-hidden border-2 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="bg-muted/30 py-4 px-6 border-b">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest">{description}</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold">
            {data.length} Grupos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow>
              <TableHead className="pl-6 text-[10px] font-black uppercase tracking-wider">Segmento</TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase tracking-wider">Base</TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase tracking-wider">Retenção</TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase tracking-wider">Ticket Médio</TableHead>
              <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-wider">Valor Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, idx) => (
              <TableRow key={idx} className="hover:bg-muted/5 group transition-colors">
                <TableCell className="font-black pl-6">
                  <div className="flex flex-col">
                    <span className="text-sm uppercase truncate max-w-[150px]">{item.label}</span>
                    <span className="text-[9px] text-muted-foreground font-bold">{item.percentage.toFixed(1)}% do total</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="font-black text-[10px] px-2 py-0 cursor-help">
                          {item.count}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px] text-[10px] font-medium p-3">
                        <div className="flex flex-col gap-1">
                          <p className="font-black border-b border-border pb-1 mb-1 uppercase tracking-tighter text-primary">Clientes no Segmento:</p>
                          {item.clientNames.slice(0, 15).map((name: string, i: number) => (
                            <span key={i} className="truncate">• {name}</span>
                          ))}
                          {item.clientNames.length > 15 && (
                            <span className="text-muted-foreground italic mt-1 font-bold">...e mais {item.clientNames.length - 15}</span>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-black text-foreground">{item.avgLT.toFixed(1)}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Meses</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-black text-primary">
                    R$ {item.avgRev.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-emerald-600">
                      R$ {item.totalRev.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase">
                      LTV: R$ {item.ltv.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="cohort" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-2 w-[400px]">
            <TabsTrigger value="cohort" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Cohort Analysis
            </TabsTrigger>
            <TabsTrigger value="retention" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Retenção & LTV
            </TabsTrigger>
          </TabsList>
          
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">Base Ativa:</span>
              <span className="text-sm font-black text-primary">{(analysisData as any).summary.activeCount}</span>
            </div>
          </div>
        </div>

        <TabsContent value="cohort" className="space-y-8 mt-0 outline-none">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Tempo Médio LT', value: `${(analysisData as any).summary.avgLT.toFixed(1)} meses`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Receita Total Agregada', value: `R$ ${(analysisData as any).summary.totalRev.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Nicho Mais Rentável', value: (analysisData as any).summary.bestNiche, icon: Target, color: 'text-primary', bg: 'bg-primary/5' },
              { label: 'Ticket Médio Geral', value: `R$ ${((analysisData as any).summary.totalRev / (clients.length || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50' }
            ].map((card, i) => (
              <Card key={i} className="border-none shadow-sm overflow-hidden">
                <CardContent className={`p-4 ${card.bg}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/80 dark:bg-black/20 ${card.color}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{card.label}</p>
                      <p className={`text-lg font-black ${card.color}`}>{card.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Section 
              id="niche-analysis"
              title="Performance por Nicho" 
              description="Qual setor do mercado retém por mais tempo?"
              icon={Target} 
              data={analysisData.niches} 
            />
            <Section 
              id="size-analysis"
              title="Análise por Tamanho" 
              description="Faixas de faturamento e comportamento de LT"
              icon={PieChart} 
              data={analysisData.sizes} 
            />
            <Section 
              id="service-analysis"
              title="Mix de Serviços" 
              description="Retenção baseada no tipo de entrega"
              icon={Briefcase} 
              data={analysisData.services} 
            />
            <Section 
              id="quarter-analysis"
              title="Cortes Temporais (Trimestre)" 
              description="Evolução da qualidade da base por período"
              icon={Calendar} 
              data={analysisData.quarters} 
            />
          </div>
        </TabsContent>

        <TabsContent value="retention" className="mt-0 outline-none">
          <RetentionPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default memo(CohortPanel);

