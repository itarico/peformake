import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Sparkles, Clock, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ANALYSIS_TYPE_LABELS, AnalysisType } from "@/types/consulting";
import { buildStandardPdfHtml, exportHtmlToPdf, pdfContentBlock } from "@/lib/pdfUtils";
import { toast } from "sonner";

// Helper function to format AI text - remove markdown symbols
const formatAIText = (text: string): string => {
  return text
    // Remove headers (# ## ### etc)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold (**text** or __text__)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic (*text* or _text_)
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove bullet points but keep the text
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    // Remove numbered lists formatting
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
interface Analysis {
  id: string;
  analysis_type: string;
  analysis_scope: string;
  content: string;
  model_used: string | null;
  generated_at: string;
}

interface AIAnalysisPanelProps {
  analyses: Analysis[];
  onComplete: () => void;
  isCompleted: boolean;
  isLoading: boolean;
  clientName?: string;
  monthLabel?: string;
}

export function AIAnalysisPanel({
  analyses,
  onComplete,
  isCompleted,
  isLoading,
  clientName,
  monthLabel,
}: AIAnalysisPanelProps) {
  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleExportPdf = async (analysis: Analysis) => {
    setExportingId(analysis.id);
    try {
      const label = ANALYSIS_TYPE_LABELS[analysis.analysis_type as AnalysisType] || analysis.analysis_type;
      const content = analysis.content || '';
      
      // Parse content
      let bodyHtml = '';
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null) {
          if (parsed.text && Object.keys(parsed).length === 1) {
            bodyHtml = pdfContentBlock(parsed.text);
          } else {
            bodyHtml = Object.entries(parsed)
              .filter(([key]) => key !== 'text')
              .map(([key, value]) => {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const valueStr = Array.isArray(value) 
                  ? value.map(v => `• ${String(v)}`).join('\n') 
                  : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
                return `<div style="margin-bottom:14px;"><h3 style="font-size:14px;font-weight:bold;color:#6366f1;margin:0 0 6px 0;">${formattedKey}</h3><p style="font-size:12px;color:#333;line-height:1.6;white-space:pre-wrap;margin:0;">${valueStr}</p></div>`;
              }).join('');
          }
        } else {
          bodyHtml = pdfContentBlock(String(parsed));
        }
      } catch {
        bodyHtml = pdfContentBlock(content);
      }

      const htmlContent = buildStandardPdfHtml({
        title: label,
        subtitle: monthLabel,
        clientName: clientName,
        body: bodyHtml,
      });

      await exportHtmlToPdf(htmlContent, `${analysis.analysis_type}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExportingId(null);
    }
  };
  if (analyses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhuma análise gerada ainda.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Responda todas as perguntas e clique em "Gerar Análise IA".
          </p>
        </CardContent>
      </Card>
    );
  }

  // Parse the content - it might be JSON or plain text
  const parseContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch {
      return { text: content };
    }
  };

  const renderContent = (content: string) => {
    const parsed = parseContent(content);
    
    // If it's plain text
    if (parsed.text && Object.keys(parsed).length === 1) {
      const formattedText = formatAIText(parsed.text);
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-line">
          {formattedText.split('\n\n').map((paragraph: string, i: number) => (
            <p key={i} className="mb-3 leading-relaxed">{paragraph}</p>
          ))}
        </div>
      );
    }

    // If it's structured content
    return (
      <div className="space-y-4">
        {Object.entries(parsed).map(([key, value]) => {
          if (key === 'text') return null;
          
          const label = key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
          
          return (
            <div key={key}>
              <h4 className="font-semibold text-sm text-primary mb-2">{label}</h4>
              {Array.isArray(value) ? (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {value.map((item, i) => (
                    <li key={i} className="text-muted-foreground">{String(item)}</li>
                  ))}
                </ul>
              ) : typeof value === 'object' && value !== null ? (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{String(value)}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {analyses.map((analysis, index) => (
        <Card key={analysis.id} id={`analysis-${analysis.id}`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {ANALYSIS_TYPE_LABELS[analysis.analysis_type as AnalysisType] || analysis.analysis_type}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(analysis.generated_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  {analysis.model_used && (
                    <>
                      <span>•</span>
                      <span>{analysis.model_used}</span>
                    </>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportingId === analysis.id}
                  onClick={() => handleExportPdf(analysis)}
                >
                  {exportingId === analysis.id ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-1 h-4 w-4" />
                  )}
                  PDF
                </Button>
                <Badge variant="outline" className="capitalize">
                  {analysis.analysis_scope}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderContent(analysis.content)}
          </CardContent>
        </Card>
      ))}

      {!isCompleted && analyses.length > 0 && (
        <>
          <Separator />
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={onComplete}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Concluir Framework
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
