// Shared formatting utilities for audiovisual module
import {
  pdfHeader,
  pdfClientBlock,
  pdfFooter,
  cleanInlineHtml,
} from '@/lib/pdfUtils';

// ── Text parsing helpers ──────────────────────────────────────────

export function FormattedTextToElements(text: string): { type: 'header' | 'space' | 'caps' | 'text'; content: string }[] {
  const lines = text.split('\n');
  const elements: { type: 'header' | 'space' | 'caps' | 'text'; content: string }[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headerMatch) { elements.push({ type: 'header', content: headerMatch[1] }); continue; }
    if (line.trim() === '') { elements.push({ type: 'space', content: '' }); continue; }
    if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\d:–—-]{4,}$/.test(line.trim()) && line.trim().length < 60) {
      elements.push({ type: 'caps', content: line.trim() }); continue;
    }
    elements.push({ type: 'text', content: line });
  }
  return elements;
}

export function cleanInlineText(text: string): string {
  return text.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\*/g, '');
}

export function formatTextToHtml(text: string): string {
  return text.split('\n').map(line => {
    const hm = line.match(/^#{1,4}\s+(.+)/);
    if (hm) return `<p style="font-weight:700;margin-top:14px;margin-bottom:4px;font-size:15px;">${cleanInlineHtml(hm[1])}</p>`;
    if (line.trim() === '') return '<br/>';
    if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\d:–—-]{4,}$/.test(line.trim()) && line.trim().length < 60) {
      return `<p style="font-weight:700;margin-top:14px;margin-bottom:4px;font-size:15px;text-transform:uppercase;letter-spacing:0.5px;">${line.trim()}</p>`;
    }
    return `<p style="margin:2px 0;line-height:1.8;">${cleanInlineHtml(line)}</p>`;
  }).join('');
}

// cleanInlineHtml is imported from pdfUtils and used internally; also re-exported for compatibility
export { cleanInlineHtml };

// ── Section config ────────────────────────────────────────────────

const SECTION_LABELS: Record<string, { label: string; color: string; isNarration: boolean }> = {
  gancho:                  { label: 'GANCHO (0-3s)',              color: '#6366f1', isNarration: true },
  desenvolvimento:         { label: 'DESENVOLVIMENTO',           color: '#6366f1', isNarration: true },
  cta:                     { label: 'CTA FINAL',                 color: '#6366f1', isNarration: true },
  legendaSugerida:         { label: 'LEGENDA SUGERIDA',          color: '#6366f1', isNarration: false },
  dicasGravacao:           { label: 'DICAS DE GRAVAÇÃO',         color: '#6366f1', isNarration: false },
  observacoesEstrategicas: { label: 'OBSERVAÇÕES ESTRATÉGICAS',  color: '#6366f1', isNarration: false },
};

function formatContent(text: string): string {
  return text.split('\n').map(l => {
    const trimmed = l.trim();
    if (!trimmed) return '';
    return cleanInlineHtml(trimmed);
  }).filter((l, i, arr) => !(l === '' && (i === 0 || arr[i - 1] === ''))).join('<br/>');
}

function buildSectionBlock(key: string, content: string): string {
  const cfg = SECTION_LABELS[key] || { label: key.toUpperCase(), color: '#6366f1', isNarration: false };
  const formatted = formatContent(content);
  const textStyle = cfg.isNarration
    ? 'font-weight: 600; font-size: 12px; line-height: 1.6; color: #1a1a1a;'
    : 'font-size: 12px; line-height: 1.6; color: #444;';
  return `
    <div style="margin-bottom: 8px; border-left: 3px solid ${cfg.color}; padding: 6px 12px; page-break-inside: avoid;">
      <p style="margin: 0 0 3px 0; font-size: 10px; font-weight: 700; color: ${cfg.color}; letter-spacing: 0.5px;">${cfg.label}</p>
      <p style="margin: 0; ${textStyle}">${formatted}</p>
    </div>`;
}

// ── Script number badge ───────────────────────────────────────────

function scriptTitleBlock(index: number, title: string, estrutura?: string): string {
  return `
    <div style="${index > 0 ? 'page-break-before: always;' : ''} margin-top: 0; margin-bottom: 10px; page-break-after: avoid;">
      <div style="padding: 10px 14px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 8px; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 10px;">
        <span style="background: rgba(255,255,255,0.25); padding: 2px 10px; border-radius: 5px; font-size: 11px; font-weight: 800;">${String(index + 1).padStart(2, '0')}</span>
        <span>${cleanInlineText(title)}</span>
      </div>
      ${estrutura ? `<p style="margin: 4px 0 0 4px; font-size: 10px; color: #888;"><strong style="color: #6366f1;">Estrutura:</strong> ${estrutura}</p>` : ''}
    </div>`;
}

// ── Date helper ───────────────────────────────────────────────────

const dateStr = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

// ── Build complete script PDF ─────────────────────────────────────

export function buildScriptPdfHtml(
  scripts: Array<{
    titulo?: string;
    gancho?: string;
    desenvolvimento?: string;
    cta?: string;
    legendaSugerida?: string;
    dicasGravacao?: string;
    observacoesEstrategicas?: string;
    estruturaUsada?: string;
    rawText?: string;
  }>,
  clientName?: string
): string {
  const name = clientName || 'Cliente';
  let html = pdfHeader(`Roteiro Completo — ${name}`, 'Planejamento de Vídeo');
  html += pdfClientBlock(name, `${scripts.length} roteiro(s) • ${dateStr()}`);

  // Summary index
  if (scripts.length > 1) {
    html += `<div style="margin-bottom: 16px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid;">
      <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">📋 Índice</p>
      ${scripts.map((s, i) => `<p style="margin: 2px 0; font-size: 10px; color: #334155;"><strong style="color: #6366f1;">${String(i + 1).padStart(2, '0')}.</strong> ${cleanInlineText(s.titulo || `Roteiro ${i + 1}`)}</p>`).join('')}
    </div>`;
  }

  scripts.forEach((script, index) => {
    const title = script.titulo || `Roteiro ${index + 1}`;
    html += scriptTitleBlock(index, title, script.estruturaUsada);

    // Always use structured fields — never rawText
    html += '<div style="margin-bottom: 16px;">';
    if (script.gancho) html += buildSectionBlock('gancho', script.gancho);
    if (script.desenvolvimento) html += buildSectionBlock('desenvolvimento', script.desenvolvimento);
    if (script.cta) html += buildSectionBlock('cta', script.cta);
    if (script.legendaSugerida) html += buildSectionBlock('legendaSugerida', script.legendaSugerida);
    if (script.dicasGravacao) html += buildSectionBlock('dicasGravacao', script.dicasGravacao);
    if (script.observacoesEstrategicas) html += buildSectionBlock('observacoesEstrategicas', script.observacoesEstrategicas);
    html += '</div>';
  });

  html += pdfFooter();
  return html;
}

// ── Segmented PDF (narração / captação / edição) ──────────────────

const SEGMENT_CONFIG = {
  narracao: {
    title: 'Guia de Narração',
    subtitle: 'Texto para locução / fala do apresentador',
    fields: ['gancho', 'desenvolvimento', 'cta'] as const,
  },
  captacao: {
    title: 'Guia de Captação',
    subtitle: 'Orientações para o cinegrafista / operador de câmera',
    fields: ['dicasGravacao', 'observacoesEstrategicas'] as const,
  },
  edicao: {
    title: 'Guia de Edição',
    subtitle: 'Orientações para o editor de vídeo',
    fields: ['legendaSugerida', 'estruturaUsada', 'observacoesEstrategicas'] as const,
  },
};

export function buildSegmentedPdfHtml(
  scripts: Array<{
    titulo?: string;
    gancho?: string;
    desenvolvimento?: string;
    cta?: string;
    legendaSugerida?: string;
    dicasGravacao?: string;
    observacoesEstrategicas?: string;
    estruturaUsada?: string;
  }>,
  segment: 'narracao' | 'captacao' | 'edicao',
  clientName?: string
): string {
  const config = SEGMENT_CONFIG[segment];
  const name = clientName || 'Cliente';

  let html = pdfHeader(`${config.title} — ${name}`, config.subtitle);
  html += pdfClientBlock(name, `${scripts.length} roteiro(s) • ${dateStr()}`);

  scripts.forEach((script, index) => {
    const title = script.titulo || `Roteiro ${index + 1}`;
    html += scriptTitleBlock(index, title);

    html += '<div style="margin-bottom: 16px;">';
    for (const field of config.fields) {
      const value = script[field as keyof typeof script];
      if (value) {
        html += buildSectionBlock(field, value);
      }
    }
    html += '</div>';
  });

  html += pdfFooter();
  return html;
}
