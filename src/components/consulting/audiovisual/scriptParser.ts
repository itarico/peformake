export interface ScriptLikeData {
  titulo?: string;
  gancho?: string;
  desenvolvimento?: string;
  cta?: string;
  legendaSugerida?: string;
  dicasGravacao?: string;
  observacoesEstrategicas?: string;
  estruturaUsada?: string;
  rawText?: string;
}

const TAG_ALIASES = {
  titulo: ['TITULO', 'TÍTULO'],
  gancho: ['GANCHO'],
  desenvolvimento: ['DESENVOLVIMENTO'],
  cta: ['CTA'],
  legendaSugerida: ['LEGENDA'],
  dicasGravacao: ['DICAS'],
  observacoesEstrategicas: ['OBSERVACOES', 'OBSERVAÇÕES'],
  estruturaUsada: ['ESTRUTURA'],
} as const;

const ALL_TAGS = Object.values(TAG_ALIASES).flat().join('|');

function cleanText(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/^[\s:：-]+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function readTaggedField(raw: string, tags: readonly string[]): string {
  for (const tag of tags) {
    const rx = new RegExp(
      `(?:^|\\n)\\s*(?:\\*\\*)?\\[?\\s*${tag}\\s*\\]?(?:\\*\\*)?\\s*(?:\\([^\\)\\n]*\\))?\\s*(?::|：|-)?\\s*([\\s\\S]*?)(?=\\n\\s*(?:\\*\\*)?\\[?\\s*(?:${ALL_TAGS})\\s*\\]?(?:\\*\\*)?\\s*(?:\\([^\\)\\n]*\\))?\\s*(?::|：|-)|$)`,
      'i',
    );

    const match = raw.match(rx);
    if (match?.[1]) {
      const cleaned = cleanText(match[1]);
      if (cleaned) return cleaned;
    }
  }
  return '';
}

export function extractScriptFields(rawText: string): ScriptLikeData {
  const raw = rawText.replace(/\r/g, '').trim();
  return {
    titulo: readTaggedField(raw, TAG_ALIASES.titulo),
    gancho: readTaggedField(raw, TAG_ALIASES.gancho),
    desenvolvimento: readTaggedField(raw, TAG_ALIASES.desenvolvimento),
    cta: readTaggedField(raw, TAG_ALIASES.cta),
    legendaSugerida: readTaggedField(raw, TAG_ALIASES.legendaSugerida),
    dicasGravacao: readTaggedField(raw, TAG_ALIASES.dicasGravacao),
    observacoesEstrategicas: readTaggedField(raw, TAG_ALIASES.observacoesEstrategicas),
    estruturaUsada: readTaggedField(raw, TAG_ALIASES.estruturaUsada),
    rawText: raw,
  };
}

function looksWeakTitle(title?: string): boolean {
  if (!title) return true;
  const cleaned = title.trim();
  if (cleaned.length < 4) return true;
  return /^(roteiro( do chat)?|novo roteiro|s)$/i.test(cleaned);
}

export function deriveScriptTitle(data: ScriptLikeData, tema?: string, clientName?: string): string {
  const parsedTitle = cleanText(data.titulo || '');
  if (!looksWeakTitle(parsedTitle)) return parsedTitle;

  if (tema?.trim() && tema.trim().length > 3) return tema.trim();

  const hook = cleanText(data.gancho || '');
  if (hook) {
    const snippet = hook.replace(/\[.*?\]/g, '').trim().split(/\s+/).slice(0, 8).join(' ');
    if (snippet.length > 8) return `${snippet}...`;
  }

  return clientName ? `Roteiro - ${clientName}` : 'Roteiro';
}

export function normalizeScriptData(data: ScriptLikeData, opts?: { tema?: string; clientName?: string }): ScriptLikeData {
  const fromRaw = data.rawText ? extractScriptFields(data.rawText) : {};

  const merged: ScriptLikeData = {
    ...fromRaw,
    ...data,
    titulo: data.titulo || fromRaw.titulo || '',
    gancho: data.gancho || fromRaw.gancho || '',
    desenvolvimento: data.desenvolvimento || fromRaw.desenvolvimento || '',
    cta: data.cta || fromRaw.cta || '',
    legendaSugerida: data.legendaSugerida || fromRaw.legendaSugerida || '',
    dicasGravacao: data.dicasGravacao || fromRaw.dicasGravacao || '',
    observacoesEstrategicas: data.observacoesEstrategicas || fromRaw.observacoesEstrategicas || '',
    estruturaUsada: data.estruturaUsada || fromRaw.estruturaUsada || '',
    rawText: data.rawText || fromRaw.rawText || '',
  };

  merged.titulo = deriveScriptTitle(merged, opts?.tema, opts?.clientName);
  return merged;
}
