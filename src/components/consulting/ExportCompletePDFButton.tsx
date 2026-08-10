import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import logoPfmk from '@/assets/logo-pfmk.png';
import { stripAIGreetings } from '@/lib/pdfUtils';

interface ExportCompletePDFButtonProps {
  clientName: string;
  monthName: string;
  year: number;
  analyses: {
    diagnostico?: string;
    sintese?: string;
    direcionamento?: string;
    plano_acao?: string;
  };
  frameworks?: Array<{
    name: string;
    summary: string;
  }>;
  research?: Array<{
    title: string;
    content: string;
  }>;
}

export function ExportCompletePDFButton({
  clientName,
  monthName,
  year,
  analyses,
  frameworks = [],
  research = [],
}: ExportCompletePDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const cleanContent = (content: string | undefined): string => {
    if (!content) return '';
    const stripped = stripAIGreetings(content);
    // Try to parse if it's JSON
    try {
      const parsed = JSON.parse(stripped);
      if (typeof parsed === 'object') {
        // Convert object to readable text
        return Object.entries(parsed)
          .filter(([key]) => !key.toLowerCase().includes('link') && !key.toLowerCase().includes('url'))
          .map(([key, value]) => {
            const formattedKey = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
            return `<strong>${formattedKey}:</strong> ${value}`;
          })
          .join('<br/><br/>');
      }
      return String(parsed);
    } catch {
      return stripped
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/\*\*/g, '')
        .replace(/\n/g, '<br/>');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const content = document.createElement('div');
      content.innerHTML = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333;">
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #6366f1;">
            <img src="${logoPfmk}" alt="PFMK" style="height: 60px; width: auto;" />
            <div style="text-align: right;">
              <h1 style="margin: 0; font-size: 28px; color: #1a1a1a;">Planejamento Estratégico</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">${monthName} ${year}</p>
            </div>
          </div>

          <!-- Client Info -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 8px 0; font-size: 22px;">Cliente: ${clientName}</h2>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Elaborado por: Italo Santos</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">Peformake - Agência de Marketing</p>
          </div>

          ${analyses.diagnostico ? `
          <!-- Diagnóstico -->
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1a1a1a; display: flex; align-items: center; gap: 10px;">
                <span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">01</span>
                DIAGNÓSTICO ESTRATÉGICO
              </h3>
              <div style="font-size: 14px; line-height: 1.7; color: #444;">
                ${cleanContent(analyses.diagnostico)}
              </div>
            </div>
          </div>
          ` : ''}

          ${analyses.sintese ? `
          <!-- Síntese -->
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 20px; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1a1a1a; display: flex; align-items: center; gap: 10px;">
                <span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">02</span>
                SÍNTESE MENSAL
              </h3>
              <div style="font-size: 14px; line-height: 1.7; color: #444;">
                ${cleanContent(analyses.sintese)}
              </div>
            </div>
          </div>
          ` : ''}

          ${analyses.direcionamento ? `
          <!-- Direcionamento -->
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1a1a1a; display: flex; align-items: center; gap: 10px;">
                <span style="background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">03</span>
                DIRECIONAMENTO
              </h3>
              <div style="font-size: 14px; line-height: 1.7; color: #444;">
                ${cleanContent(analyses.direcionamento)}
              </div>
            </div>
          </div>
          ` : ''}

          ${analyses.plano_acao ? `
          <!-- Plano de Ação -->
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <div style="background: #f8fafc; border-left: 4px solid #ef4444; padding: 20px; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1a1a1a; display: flex; align-items: center; gap: 10px;">
                <span style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">04</span>
                PLANO DE AÇÃO
              </h3>
              <div style="font-size: 14px; line-height: 1.7; color: #444;">
                ${cleanContent(analyses.plano_acao)}
              </div>
            </div>
          </div>
          ` : ''}

          ${frameworks.length > 0 ? `
          <!-- Frameworks -->
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <div style="background: #faf5ff; border-left: 4px solid #8b5cf6; padding: 20px; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1a1a1a;">
                FRAMEWORKS APLICADOS
              </h3>
              ${frameworks.map((f, i) => `
                <div style="margin-bottom: 15px; padding: 12px; background: white; border-radius: 8px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 15px; color: #6366f1;">${i + 1}. ${f.name}</h4>
                  <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.6;">${f.summary}</p>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          ${research.length > 0 ? `
          <!-- Pesquisas -->
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <div style="background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 20px; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1a1a1a;">
                PESQUISAS DE MERCADO
              </h3>
              ${research.slice(0, 5).map(r => `
                <div style="margin-bottom: 12px; padding: 10px; background: white; border-radius: 6px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #0d9488;">${r.title}</h4>
                  <p style="margin: 0; font-size: 12px; color: #555; line-height: 1.5;">${r.content.substring(0, 200)}${r.content.length > 200 ? '...' : ''}</p>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
            <img src="${logoPfmk}" alt="PFMK" style="height: 40px; width: auto; margin-bottom: 10px; opacity: 0.7;" />
            <p style="margin: 0; font-size: 11px; color: #888;">
              Documento elaborado por Italo Santos<br/>
              Peformake - Agência de Marketing<br/>
              ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      `;

      const opt = {
        margin: [10, 10, 15, 10],
        filename: `planejamento-${clientName.toLowerCase().replace(/\s+/g, '-')}-${monthName.toLowerCase()}-${year}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
      };

      await html2pdf().set(opt as any).from(content).save();
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const hasContent = analyses.diagnostico || analyses.sintese || analyses.direcionamento || analyses.plano_acao;

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting || !hasContent}
      variant="default"
      size="sm"
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Gerar PDF Completo
    </Button>
  );
}
