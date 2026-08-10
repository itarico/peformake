import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  format, 
  startOfMonth, 
  subMonths,
  eachMonthOfInterval,
  isAfter,
  endOfMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Filter, Info, TrendingUp, Users, Clock, DollarSign } from 'lucide-react';
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from '@/components/ui/tooltip';

interface CohortAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CohortAnalysisDialog = ({ open, onOpenChange }: CohortAnalysisDialogProps) => {
  const [nicheFilter, setNicheFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  const { data: clients = [] } = useQuery({
    queryKey: ['cohort-clients'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('*');
      return data || [];
    },
    enabled: open,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['cohort-events'],
    queryFn: async () => {
      const { data } = await supabase.from('client_events').select('*');
      return data || [];
    },
    enabled: open,
  });

  const { data: clientServices = [] } = useQuery({
    queryKey: ['cohort-client-services'],
    queryFn: async () => {
      const { data } = await supabase.from('client_services').select('*, services(name, slug)');
      return data || [];
    },
    enabled: open,
  });

  const cohorts = useMemo(() => {
    if (!clients.length) return [];

    const now = new Date();
    const twelveMonthsAgo = subMonths(now, 12);
    const months = eachMonthOfInterval({
      start: twelveMonthsAgo,
      end: now
    }).reverse();

    return months.map(cohortMonth => {
      const cohortStart = startOfMonth(cohortMonth);
      const cohortEnd = endOfMonth(cohortMonth);

      // Clients who joined in this cohort month
      const cohortClients = clients.filter(client => {
        const joinDate = new Date(client.created_at);
        const joinEvent = events.find(e => e.client_id === client.id && e.event_type === 'joined');
        const effectiveJoinDate = joinEvent ? new Date(joinEvent.event_date) : joinDate;
        
        const isSameMonth = effectiveJoinDate >= cohortStart && effectiveJoinDate <= cohortEnd;
        if (!isSameMonth) return false;

        // Apply filters
        if (nicheFilter !== 'all' && client.business_segment !== nicheFilter) return false;
        
        const services = clientServices.filter(cs => cs.client_id === client.id);
        const monthlyRevenue = services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0) || 
                              ((client.price_per_art || 0) * (client.arts_per_month || 0)) + (client.consulting_price_per_month || 0);

        if (sizeFilter === 'small' && monthlyRevenue >= 2000) return false;
        if (sizeFilter === 'medium' && (monthlyRevenue < 2000 || monthlyRevenue > 5000)) return false;
        if (sizeFilter === 'large' && monthlyRevenue <= 5000) return false;

        if (serviceFilter === 'design' && !client.has_design_service) return false;
        if (serviceFilter === 'consulting' && !client.has_consulting_service) return false;
        if (serviceFilter === 'audiovisual' && !client.has_audiovisual_service) return false;

        return true;
      });

      const clientNames = cohortClients.map(c => c.name);

      const retentionData = Array.from({ length: 13 }, (_, i) => {
        if (cohortClients.length === 0) return null;
        
        const targetMonth = startOfMonth(new Date(cohortStart.getFullYear(), cohortStart.getMonth() + i, 1));
        if (isAfter(targetMonth, now)) return null;

        const retainedCount = cohortClients.filter(client => {
          const churnEvent = events.find(e => e.client_id === client.id && e.event_type === 'churned');
          if (!churnEvent) return true;
          
          const churnDate = new Date(churnEvent.event_date);
          return isAfter(churnDate, targetMonth);
        }).length;

        return {
          month: i,
          count: retainedCount,
          percentage: (retainedCount / cohortClients.length) * 100
        };
      });

      return {
        month: cohortMonth,
        clientsCount: cohortClients.length,
        clientNames,
        retention: retentionData
      };
    }).filter(c => c.clientsCount > 0);
  }, [clients, events, clientServices, nicheFilter, sizeFilter, serviceFilter, open]);

  const niches = useMemo(() => {
    const n = new Set<string>();
    clients.forEach(c => {
      if (c.business_segment) n.add(c.business_segment);
    });
    return Array.from(n).sort();
  }, [clients]);

  const getHeatmapColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-emerald-500 text-white';
    if (percentage >= 75) return 'bg-emerald-400 text-white';
    if (percentage >= 60) return 'bg-emerald-300 text-emerald-900';
    if (percentage >= 45) return 'bg-amber-200 text-amber-900';
    if (percentage >= 30) return 'bg-amber-300 text-amber-900';
    if (percentage >= 15) return 'bg-orange-400 text-white';
    return 'bg-red-500 text-white';
  };

  const avgRetentionByMonth = useMemo(() => {
    const sums = Array(13).fill(0);
    const counts = Array(13).fill(0);

    cohorts.forEach(c => {
      c.retention.forEach((r, i) => {
        if (r !== null) {
          sums[i] += r.percentage;
          counts[i]++;
        }
      });
    });

    return sums.map((sum, i) => counts[i] > 0 ? sum / counts[i] : null);
  }, [cohorts]);

  const ltvByPermanence = useMemo(() => {
    const totalRev = clients.reduce((sum, c) => {
      const services = clientServices.filter(cs => cs.client_id === c.id);
      return sum + (services.reduce((s, serv) => s + (serv.price || 0) * (serv.quantity || 1), 0) || 
                   ((c.price_per_art || 0) * (c.arts_per_month || 0)) + (c.consulting_price_per_month || 0));
    }, 0);
    const avgTicket = clients.length > 0 ? totalRev / clients.length : 0;
    
    return avgRetentionByMonth.map((ret, i) => {
      if (ret === null) return null;
      return avgTicket * (i + 1) * (ret / 100);
    });
  }, [clients, clientServices, avgRetentionByMonth]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Análise de Cohort & Retenção
              </DialogTitle>
              <DialogDescription>
                Analise a retenção e o valor do tempo de vida do cliente por período e segmento.
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-6 mb-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" /> Nicho
              </label>
              <Select value={nicheFilter} onValueChange={setNicheFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Todos os Nichos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Nichos</SelectItem>
                  {niches.map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Tamanho (Faturamento)
              </label>
              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Todos os Tamanhos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tamanhos</SelectItem>
                  <SelectItem value="small">Pequeno (Até R$ 2k)</SelectItem>
                  <SelectItem value="medium">Médio (R$ 2k - R$ 5k)</SelectItem>
                  <SelectItem value="large">Grande (Acima de R$ 5k)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Serviço Principal
              </label>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Todos os Serviços" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Serviços</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="consulting">Consultoria</SelectItem>
                  <SelectItem value="audiovisual">Audiovisual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 pt-0">
          <div className="space-y-8">
            <Card className="border-none shadow-none bg-muted/30">
              <div className="p-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="w-[150px] font-bold">Cohort</TableHead>
                      <TableHead className="w-[100px] text-center font-bold">Clientes</TableHead>
                      {Array.from({ length: 13 }).map((_, i) => (
                        <TableHead key={i} className="text-center font-bold min-w-[60px]">
                          M{i}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohorts.map((cohort, idx) => (
                      <TableRow key={idx} className="hover:bg-transparent border-none h-12">
                        <TableCell className="font-medium">
                          {format(cohort.month, 'MMM/yy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="font-mono cursor-help">
                                  {cohort.clientsCount}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[200px] text-[10px] font-medium p-3">
                                <div className="flex flex-col gap-1">
                                  <p className="font-black border-b border-border pb-1 mb-1 uppercase tracking-tighter text-primary">Clientes do Período:</p>
                                  {(cohort as any).clientNames.slice(0, 15).map((name: string, i: number) => (
                                    <span key={i} className="truncate">• {name}</span>
                                  ))}
                                  {(cohort as any).clientNames.length > 15 && (
                                    <span className="text-muted-foreground italic mt-1 font-bold">...e mais {(cohort as any).clientNames.length - 15}</span>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        {cohort.retention.map((r, i) => (
                          <TableCell 
                            key={i} 
                            className={`text-center p-0 h-12 transition-all`}
                          >
                            {r !== null ? (
                              <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${getHeatmapColor(r.percentage)}`}>
                                {Math.round(r.percentage)}%
                              </div>
                            ) : (
                              <div className="w-full h-full bg-background/50" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}

                    <TableRow className="hover:bg-transparent border-t-2 border-muted h-12 mt-4 bg-primary/5">
                      <TableCell className="font-bold text-primary text-xs">Média Retenção</TableCell>
                      <TableCell className="text-center">-</TableCell>
                      {avgRetentionByMonth.map((avg, i) => (
                        <TableCell key={i} className="text-center p-0 h-12">
                          {avg !== null ? (
                            <div className="w-full h-full flex items-center justify-center text-[11px] font-black border-l border-muted">
                              {Math.round(avg)}%
                            </div>
                          ) : null}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Projeção LTV removida */}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
              <div className="p-4 rounded-xl border bg-card space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Permanência Média</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {avgRetentionByMonth.filter(r => r !== null && r > 50).length} meses
                  </span>
                  <span className="text-xs text-muted-foreground">(Retenção &gt; 50%)</span>
                </div>
              </div>

              {/* Card LTV removido */}

              <div className="p-4 rounded-xl border bg-card space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span className="text-sm font-medium">Saúde do Cohort</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={avgRetentionByMonth[3] && avgRetentionByMonth[3] > 70 ? "secondary" : "destructive"}>
                    {avgRetentionByMonth[3] && avgRetentionByMonth[3] > 70 ? "Alta Retenção Inicial" : "Atenção no Onboarding"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CohortAnalysisDialog;
