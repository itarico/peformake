// Centralized PDF generation utilities - Peformake standard
import logoPfmk from '@/assets/logo-pfmk.png';

const DATE_STR = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

export function pdfHeader(title: string, subtitle?: string): string {
  return `<div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333;">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #6366f1;">
      <img src="${logoPfmk}" alt="PFMK" style="height: 50px; width: auto;" />
      <div style="text-align: right;">
        <h1 style="margin: 0; font-size: 22px; color: #1a1a1a;">${title}</h1>
        ${subtitle ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${subtitle}</p>` : ''}
      </div>
    </div>`;
}

export function pdfClientBlock(clientName: string, extra?: string): string {
  return `
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 18px; border-radius: 10px; margin-bottom: 25px;">
      <h2 style="margin: 0 0 6px 0; font-size: 18px;">Cliente: ${clientName || 'Cliente'}</h2>
      <p style="margin: 0; font-size: 13px; opacity: 0.9;">Elaborado por: Italo Santos • Peformake</p>
      ${extra ? `<p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.7;">${extra}</p>` : ''}
    </div>`;
}

export function pdfFooter(): string {
  return `
    <div style="margin-top: 40px; padding-top: 15px; border-top: 2px solid #e5e7eb; text-align: center;">
      <img src="${logoPfmk}" alt="PFMK" style="height: 35px; width: auto; margin-bottom: 8px; opacity: 0.7;" />
      <p style="margin: 0; font-size: 10px; color: #888;">
        Documento elaborado por Italo Santos<br/>
        Peformake - Agência de Marketing<br/>
        ${DATE_STR()}
      </p>
    </div>
  </div>`;
}

export function pdfSectionTitle(text: string, badge?: string, color?: string): string {
  const c = color || '#6366f1';
  return `<div style="margin-top: 20px; margin-bottom: 10px; padding: 10px 14px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 8px; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
    ${badge ? `<span style="background: rgba(255,255,255,0.25); padding: 2px 8px; border-radius: 4px; font-size: 11px;">${badge}</span>` : ''}
    ${text}
  </div>`;
}

export function pdfColoredSection(label: string, content: string, color: string, bgColor: string): string {
  return `
    <div style="margin-bottom: 14px; border-left: 3px solid ${color}; padding: 12px 16px; background: ${bgColor}; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 0.5px;">${label}</p>
      <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #333; white-space: pre-wrap;">${cleanInlineHtml(content)}</p>
    </div>`;
}

export function stripAIGreetings(text: string): string {
  const greetingPatterns = [
    /^(Excelente|Perfeito|Com certeza|Claro|Ótimo|Certo|Entendido|Maravilha|Fantástico|Muito bem|Pronto)[.!,]\s*/i,
    /^(Como seu consultor|Aqui está|Preparei|Seguem|Vamos lá|Segue abaixo)[^.]*[.!]\s*/i,
    /^(Aqui está o planejamento|Como seu consultor de marketing)[^.]*[.!]\s*/i,
    /seguindo (todas as|rigorosamente|suas) (suas )?diretrizes[^.]*[.!]\s*/i,
    /pronto para execução[^.]*[.!]\s*/i,
  ];
  const lines = text.split('\n');
  // Strip greeting lines from the first 5 lines only
  let startIdx = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) { startIdx = i + 1; continue; }
    let isGreeting = false;
    for (const p of greetingPatterns) {
      if (p.test(trimmed)) { isGreeting = true; break; }
    }
    if (isGreeting || trimmed.length < 10) { startIdx = i + 1; continue; }
    break;
  }
  return lines.slice(startIdx).join('\n').trim();
}

export function pdfContentBlock(content: string): string {
  const cleaned = stripAIGreetings(content);
  const lines = cleaned.split('\n');
  let html = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { html += '<br/>'; continue; }
    
    const isArteTitle = /^(ARTE|ROTEIRO)\s*\d+/i.test(trimmed);
    const isHashTitle = /^#{1,3}\s+/.test(trimmed);
    const isMainTitle = (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed) && !trimmed.startsWith('-') && !trimmed.startsWith('•'));
    
    if (isArteTitle) {
      html += `<div style="margin-top: 20px; margin-bottom: 8px; padding: 10px 14px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 8px; font-size: 15px; font-weight: bold;">${trimmed.replace(/\*\*/g, '')}</div>`;
    } else if (isMainTitle || isHashTitle) {
      const clean = trimmed.replace(/^#{1,3}\s+/, '').replace(/\*\*/g, '').replace(/^={2,}\s*/, '').replace(/\s*={2,}$/, '');
      html += `<h3 style="margin-top: 18px; margin-bottom: 8px; font-size: 14px; font-weight: bold; color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px;">${clean}</h3>`;
    } else if (/^(HEADLINE|SUBTÍTULO|CTA|Legenda|Formato|Objetivo|Plataforma|Descrição para o designer|Referências de estilo):/i.test(trimmed)) {
      const parts = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (parts) {
        html += `<p style="margin: 4px 0; font-size: 13px;"><strong style="color: #6366f1;">${parts[1]}:</strong> ${parts[2]}</p>`;
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      html += `<p style="margin: 2px 0 2px 16px; font-size: 12px; color: #444;">• ${trimmed.replace(/^[-•]\s+/, '').replace(/\*\*/g, '')}</p>`;
    } else {
      html += `<p style="margin: 3px 0; font-size: 12px; color: #333; line-height: 1.5;">${trimmed.replace(/\*\*/g, '')}</p>`;
    }
  }
  return html;
}

export function cleanInlineHtml(text: string): string {
  return text
    .replace(/^#+\s*/, '')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]/g, '<span style="color:#888;font-style:italic;font-size:13px;">[$1]</span>');
}

export const PDF_OPTIONS = (filename: string) => ({
  margin: [10, 10, 15, 10],
  filename,
  image: { type: 'jpeg' as const, quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true },
  jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
  pagebreak: { mode: ['css'] as const, avoid: ['div'] },
});

/** Generate a full PDF document HTML string */
export function buildStandardPdfHtml(opts: {
  title: string;
  subtitle?: string;
  clientName?: string;
  clientExtra?: string;
  body: string;
}): string {
  let html = pdfHeader(opts.title, opts.subtitle);
  if (opts.clientName) {
    html += pdfClientBlock(opts.clientName, opts.clientExtra);
  }
  html += opts.body;
  html += pdfFooter();
  return html;
}

/** Helper: export HTML string as PDF using html2pdf.js */
export async function exportHtmlToPdf(htmlContent: string, filename: string): Promise<void> {
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  document.body.appendChild(container);
  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;
    await html2pdf().set(PDF_OPTIONS(filename) as any).from(container).save();
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    throw new Error('Não foi possível gerar o arquivo PDF. Tente novamente.');
  } finally {
    document.body.removeChild(container);
  }
}
