import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { buildStandardPdfHtml, exportHtmlToPdf } from '@/lib/pdfUtils';

interface PDFExportButtonProps {
  contentId: string;
  filename: string;
  title?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function PDFExportButton({
  contentId,
  filename,
  title = "Baixar PDF",
  variant = "outline",
  size = "sm",
  className,
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    const element = document.getElementById(contentId);
    if (!element) {
      toast.error("Conteúdo não encontrado para exportar");
      return;
    }

    setIsExporting(true);

    try {
      // Dynamic import to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default;

      const options = {
        margin: [15, 15, 15, 15],
        filename: `${filename}-${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(options as any).from(element).save();
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant={variant}
      size={size}
      className={className}
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {title}
        </>
      )}
    </Button>
  );
}

interface ExportAnswersPDFButtonProps {
  questions: Array<{
    id: string;
    question_order: number;
    question_text: string;
  }>;
  answers: Record<string, string>;
  frameworkName: string;
  clientName?: string;
  monthYear?: string;
}

export function ExportAnswersPDFButton({
  questions,
  answers,
  frameworkName,
  clientName,
  monthYear,
}: ExportAnswersPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const html2pdf = (await import('html2pdf.js')).default;

      // Create HTML content
      const answeredQuestions = questions.filter(q => answers[q.id]?.trim());
      
      const questionsBody = answeredQuestions.map((q) => `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px;">
            <span style="background: rgba(99,102,241,0.15); color: #6366f1; font-weight: bold; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0;">${q.question_order}</span>
            <h3 style="color: #1a1a1a; font-size: 14px; font-weight: 600; margin: 0; line-height: 1.4;">${q.question_text}</h3>
          </div>
          <div style="background: #f8fafc; border-left: 3px solid #6366f1; padding: 12px 15px; margin-left: 34px; border-radius: 0 8px 8px 0;">
            <p style="color: #333; font-size: 13px; margin: 0; white-space: pre-wrap; line-height: 1.6;">${answers[q.id] || ''}</p>
          </div>
        </div>
      `).join('');

      const htmlContent = buildStandardPdfHtml({
        title: frameworkName,
        subtitle: monthYear || undefined,
        clientName: clientName || undefined,
        body: questionsBody,
      });

      await exportHtmlToPdf(htmlContent, `${frameworkName.toLowerCase().replace(/\s+/g, '-')}-respostas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("PDF das respostas exportado com sucesso!");
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      size="sm"
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Exportar Respostas PDF
        </>
      )}
    </Button>
  );
}
