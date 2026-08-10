import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  diagnostico: 'Diagnóstico Estratégico',
  direcionamento: 'Direcionamento Mensal',
  plano_acao: 'Plano de Ação',
  sintese_mensal: 'Síntese Mensal',
  campanha: 'Estratégia de Campanha',
  audiovisual: 'Planejamento Audiovisual',
  design_grafico: 'Planejamento Design Gráfico',
  social_midia: 'Planejamento Social Media',
};

interface PortalAIAnalysesSectionProps {
  clientId: string;
}

export function PortalAIAnalysesSection({ clientId }: PortalAIAnalysesSectionProps) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['portal-ai-analyses', clientId, currentMonth, currentYear],
    queryFn: async () => {
      // Get consulting months for this client in the current month
      const { data: consultingMonths } = await supabase
        .from('consulting_months')
        .select('id')
        .eq('client_id', clientId)
        .eq('year', currentYear)
        .eq('month', currentMonth);

      if (!consultingMonths?.length) return [];

      const monthIds = consultingMonths.map(cm => cm.id);

      // Get framework instances for these months
      const { data: instances } = await supabase
        .from('framework_instances')
        .select('id, consulting_month_id')
        .in('consulting_month_id', monthIds);

      if (!instances?.length) return [];

      const instanceIds = instances.map(i => i.id);

      // Get AI analyses for these instances
      const { data: aiAnalyses, error } = await supabase
        .from('ai_analyses')
        .select('*')
        .in('instance_id', instanceIds)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      return aiAnalyses || [];
    },
  });

  const handleDownloadPDF = (analysis: any) => {
    const label = ANALYSIS_TYPE_LABELS[analysis.analysis_type] || analysis.analysis_type;
    const content = analysis.content || '';
    
    // Create a simple HTML for printing as PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${label}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.7; color: #1a1a2e; }
          h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
          h2, h3 { color: #334155; margin-top: 24px; }
          p { margin: 8px 0; }
          ul, ol { padding-left: 24px; }
          li { margin: 4px 0; }
          .meta { color: #94a3b8; font-size: 12px; margin-bottom: 24px; }
          strong { color: #1e293b; }
        </style>
      </head>
      <body>
        <h1>${label}</h1>
        <p class="meta">Gerado em ${format(new Date(analysis.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        <div>${content.replace(/\n/g, '<br/>').replace(/#{3}\s(.+)/g, '<h3>$1</h3>').replace(/#{2}\s(.+)/g, '<h2>$1</h2>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  if (isLoading) return null;
  if (analyses.length === 0) return null;

  const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Análises Estratégicas — {MONTH_NAMES[currentMonth - 1]} {currentYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {analyses.map((analysis: any) => {
            const label = ANALYSIS_TYPE_LABELS[analysis.analysis_type] || analysis.analysis_type;
            return (
              <div key={analysis.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(analysis.generated_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownloadPDF(analysis)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
