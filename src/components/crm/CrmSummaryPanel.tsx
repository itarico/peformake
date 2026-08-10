import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, Calendar, MessageSquare, DollarSign, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface Props {
  clientId: string;
}

export default function CrmSummaryPanel({ clientId }: Props) {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [result, setResult] = useState<any>(null);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-conversation-summary', {
        body: { client_id: clientId, period },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      toast.error('Erro ao gerar resumo: ' + (e.message || 'tente novamente'));
    }
    setLoading(false);
  };

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Resumo Inteligente de Conversas</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={period === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('week')}
              >
                <Calendar className="h-3.5 w-3.5 mr-1" />
                Semana
              </Button>
              <Button
                variant={period === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('month')}
              >
                <Calendar className="h-3.5 w-3.5 mr-1" />
                Mês
              </Button>
              <Button onClick={generateSummary} disabled={loading} size="sm" className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {result ? 'Atualizar' : 'Gerar Resumo'}
              </Button>
            </div>
          </div>
        </CardHeader>

        {!result && !loading && (
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecione o período e clique em "Gerar Resumo" para obter uma análise completa das conversas do CRM.</p>
            </div>
          </CardContent>
        )}

        {loading && (
          <CardContent>
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">Analisando conversas...</p>
            </div>
          </CardContent>
        )}
      </Card>

      {result && !loading && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Users className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                <p className="text-xs text-muted-foreground">Leads Ativos</p>
                <p className="text-xl font-bold">{result.stats?.total_leads || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <MessageSquare className="h-4 w-4 mx-auto mb-1 text-green-600" />
                <p className="text-xs text-muted-foreground">Mensagens</p>
                <p className="text-xl font-bold">{result.stats?.total_messages || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <DollarSign className="h-4 w-4 mx-auto mb-1 text-amber-600" />
                <p className="text-xs text-muted-foreground">Vendas</p>
                <p className="text-xl font-bold">{result.stats?.total_sales || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <DollarSign className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                <p className="text-xs text-muted-foreground">Faturamento</p>
                <p className="text-xl font-bold">R$ {(result.stats?.sales_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
              </CardContent>
            </Card>
          </div>

          {/* AI Summary */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Análise de IA — {result.period}</CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {new Date(result.generated_at).toLocaleString('pt-BR')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{result.summary}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
