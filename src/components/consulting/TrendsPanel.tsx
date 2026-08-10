import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Loader2, Sparkles, RefreshCw, Copy, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrendsPanelProps {
  monthId: string;
  clientContext?: {
    business_description?: string;
    business_segment?: string;
    target_audience?: string;
    main_competitors?: string;
    value_proposition?: string;
  };
  consultingMonth?: {
    year: number;
    month: number;
  };
  disabled?: boolean;
}

export function TrendsPanel({ monthId, clientContext, consultingMonth, disabled }: TrendsPanelProps) {
  const [trendContent, setTrendContent] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const monthName = consultingMonth ? monthNames[consultingMonth.month - 1] : 'Mês Atual';
      const year = consultingMonth?.year || new Date().getFullYear();

      const response = await supabase.functions.invoke('consulting-content-analysis', {
        body: {
          consulting_month_id: monthId,
          content_category: 'trends_diy',
          client_context: clientContext,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar tendências');
      }

      return response.data.analysis;
    },
    onSuccess: (content) => {
      setTrendContent(content);
      setGeneratedAt(new Date());
      toast.success('Tendências geradas!');
    },
    onError: (error) => {
      console.error('Error:', error);
      toast.error('Erro ao gerar tendências');
    },
  });

  const handleCopy = async () => {
    if (!trendContent) return;
    await navigator.clipboard.writeText(trendContent);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPdf = async () => {
    if (!trendContent) return;
    setIsExportingPdf(true);

    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const monthName = consultingMonth ? monthNames[consultingMonth.month - 1] : 'Mês Atual';
      const year = consultingMonth?.year || new Date().getFullYear();

      const { buildStandardPdfHtml, exportHtmlToPdf, pdfContentBlock } = await import('@/lib/pdfUtils');
      const htmlContent = buildStandardPdfHtml({
        title: 'Tendências & Conteúdo DIY',
        subtitle: `${monthName} de ${year}`,
        body: `<div style="margin-bottom: 20px;">${pdfContentBlock(trendContent)}</div>`,
      });

      await exportHtmlToPdf(htmlContent, `tendencias-diy-${monthName.toLowerCase()}-${year}.pdf`);

      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Format content for display
  const formatContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      
      const isTitle = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed);
      const isSubtitle = /^\d+[\.\)]/.test(trimmed) || trimmed.endsWith(':');
      
      if (isTitle) {
        return (
          <h3 key={i} className="font-bold text-base text-foreground mt-4 first:mt-0 border-b border-border/50 pb-1">
            {trimmed}
          </h3>
        );
      } else if (isSubtitle) {
        return (
          <p key={i} className="font-semibold text-sm text-foreground/90 mt-2">
            {trimmed.replace(/\*\*/g, '')}
          </p>
        );
      } else {
        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed pl-1">
            {trimmed.replace(/\*\*/g, '').replace(/^[-*+]\s+/, '• ')}
          </p>
        );
      }
    }).filter(Boolean);
  };

  return (
    <Card className="border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-pink-500">
          <TrendingUp className="h-5 w-5" />
          Tendências & Conteúdo DIY
        </CardTitle>
        <CardDescription>
          Ideias de trends, vídeos que o cliente pode gravar sozinho, stories interativos e conteúdo viral do momento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-end">
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={disabled || generateMutation.isPending}
            className="gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : trendContent ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerar
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Tendências
              </>
            )}
          </Button>
        </div>

        {trendContent ? (
          <div className="space-y-3">
            <Separator />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                Gerado em {generatedAt?.toLocaleTimeString('pt-BR')}
              </Badge>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="gap-2"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Baixar PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 max-h-[500px] overflow-y-auto space-y-1">
              {formatContent(trendContent)}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Clique em "Gerar Tendências" para criar ideias de conteúdo viral</p>
            <p className="text-sm mt-1">Vídeos DIY, trends do momento, stories e mais</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
