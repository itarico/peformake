import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, TrendingUp, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  clientId: string;
}

export default function CrmMiniReport({ clientId }: Props) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalReceived: 0,
    avgResponseMinutes: 0,
    qualityScore: 0, // Mocked or calculated quality score
  });

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: messages, error } = await supabase
          .from('crm_messages')
          .select('direction, created_at, lead_id')
          .eq('client_id', clientId)
          .gte('created_at', weekAgo)
          .order('created_at');

        if (error) throw error;

        const sent = messages?.filter(m => m.direction === 'outbound').length || 0;
        const received = messages?.filter(m => m.direction === 'inbound').length || 0;

        // Avg response time
        let totalResponseMs = 0;
        let responseCount = 0;
        const sortedMsgs = (messages || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        for (let i = 0; i < sortedMsgs.length - 1; i++) {
          if (sortedMsgs[i].direction === 'inbound' && 
              sortedMsgs[i + 1].direction === 'outbound' && 
              sortedMsgs[i].lead_id === sortedMsgs[i + 1].lead_id) {
            const diff = new Date(sortedMsgs[i + 1].created_at).getTime() - new Date(sortedMsgs[i].created_at).getTime();
            // Only count responses under 24 hours to avoid skewing stats with very late replies
            if (diff < 24 * 60 * 60 * 1000) {
              totalResponseMs += diff;
              responseCount++;
            }
          }
        }
        
        const avgResponseMinutes = responseCount > 0 ? Math.round(totalResponseMs / responseCount / 60000) : 0;

        // Calculate a "Quality Score" based on response rate and time
        // 0-100 scale
        let score = 0;
        if (received > 0) {
          const responseRate = responseCount / received;
          const timeScore = avgResponseMinutes < 5 ? 100 : avgResponseMinutes < 30 ? 80 : avgResponseMinutes < 120 ? 60 : 40;
          score = Math.round((responseRate * 0.6 + (timeScore / 100) * 0.4) * 100);
        } else if (sent > 0) {
          score = 90; // Proactive
        }

        setStats({
          totalSent: sent,
          totalReceived: received,
          avgResponseMinutes,
          qualityScore: Math.min(100, score),
        });
      } catch (err) {
        console.error('Error loading CRM stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [clientId]);

  const formatTime = (minutes: number) => {
    if (minutes === 0) return '---';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const getQualityLabel = (score: number) => {
    if (score >= 90) return { label: 'Excelente', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    if (score >= 75) return { label: 'Muito Bom', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
    if (score >= 50) return { label: 'Regular', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
    return { label: 'Baixa', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted/20 rounded-xl border border-dashed">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Carregando métricas...</span>
      </div>
    );
  }

  const quality = getQualityLabel(stats.qualityScore);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      <Card className="bg-primary/5 border-primary/10 hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <div className="p-2 rounded-lg bg-primary/10 mb-2">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Total Mensagens</p>
          <p className="text-2xl font-black text-primary">{stats.totalSent + stats.totalReceived}</p>
          <div className="flex gap-2 mt-1 text-[9px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" /> {stats.totalSent} enviadas</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-2.5 w-2.5" /> {stats.totalReceived} recebidas</span>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <div className="p-2 rounded-lg bg-blue-500/10 mb-2">
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Tempo de Retorno</p>
          <p className="text-2xl font-black">{formatTime(stats.avgResponseMinutes)}</p>
          <p className="text-[9px] text-muted-foreground mt-1 font-medium">Média dos últimos 7 dias</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <div className="p-2 rounded-lg bg-emerald-500/10 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Qualidade Atendimento</p>
          <p className="text-2xl font-black text-emerald-600">{stats.qualityScore}%</p>
          <Badge variant="outline" className={`mt-1 text-[9px] uppercase font-bold ${quality.color}`}>
            {quality.label}
          </Badge>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-background to-muted/30">
        <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Resumo Operacional</p>
          <div className="space-y-1.5 w-full">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Status</span>
              <Badge className="bg-emerald-500 h-2 w-2 rounded-full p-0" title="Online" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Interações</span>
              <span className="font-bold">{stats.totalReceived > 0 ? ((stats.totalSent / stats.totalReceived) * 100).toFixed(0) : '100'}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Eficiência</span>
              <span className="font-bold">{stats.qualityScore > 80 ? 'Alta' : 'Normal'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
