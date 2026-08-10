import { cn } from '@/lib/utils';

/**
 * Removes markdown formatting and cleans AI-generated text
 */
export function cleanAIText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Clean up bullet points
    .replace(/^[-*+]\s+/gm, '• ')
    // Remove code blocks
    .replace(/```[^`]*```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Clean extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parses content that might be JSON or plain text
 */
export function parseContent(content: string): Record<string, any> {
  if (!content) return { text: '' };
  
  try {
    const parsed = JSON.parse(content);
    // If it's an object, clean all text values
    if (typeof parsed === 'object' && parsed !== null) {
      return cleanObjectText(parsed);
    }
    return parsed;
  } catch {
    return { text: cleanAIText(content) };
  }
}

function cleanObjectText(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      cleaned[key] = cleanAIText(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item => 
        typeof item === 'string' ? cleanAIText(item) : 
        typeof item === 'object' ? cleanObjectText(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanObjectText(value);
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

interface FormattedTextProps {
  content: string;
  className?: string;
}

/**
 * Renders formatted text with proper paragraph breaks
 */
export function FormattedText({ content, className }: FormattedTextProps) {
  const cleaned = cleanAIText(content);
  const paragraphs = cleaned.split('\n\n').filter(Boolean);
  
  return (
    <div className={cn('space-y-3', className)}>
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph.split('\n');
        
        return (
          <div key={index} className="space-y-1">
            {lines.map((line, lineIndex) => {
              const trimmed = line.trim();
              if (!trimmed) return null;
              
              // Check if it's a list item
              if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                return (
                  <div key={lineIndex} className="flex gap-2 pl-2">
                    <span className="text-primary">•</span>
                    <span className="text-sm text-muted-foreground">{trimmed.replace(/^[•-]\s*/, '')}</span>
                  </div>
                );
              }
              
              // Check if it's a numbered item
              const numberedMatch = trimmed.match(/^(\d+)[.)]\s*(.+)/);
              if (numberedMatch) {
                return (
                  <div key={lineIndex} className="flex gap-2 pl-2">
                    <span className="text-primary font-medium min-w-[20px]">{numberedMatch[1]}.</span>
                    <span className="text-sm text-muted-foreground">{numberedMatch[2]}</span>
                  </div>
                );
              }
              
              // Check if it looks like a title (all caps or ends with :)
              const isTitle = trimmed === trimmed.toUpperCase() && trimmed.length > 3;
              const isSubtitle = trimmed.endsWith(':');
              
              if (isTitle) {
                return (
                  <h4 key={lineIndex} className="font-semibold text-foreground text-sm uppercase tracking-wide mt-2">
                    {trimmed}
                  </h4>
                );
              }
              
              if (isSubtitle) {
                return (
                  <p key={lineIndex} className="font-medium text-foreground text-sm mt-1">
                    {trimmed}
                  </p>
                );
              }
              
              return (
                <p key={lineIndex} className="text-sm text-muted-foreground leading-relaxed">
                  {trimmed}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

interface HighlightBlockProps {
  label: string;
  content: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

const HIGHLIGHT_VARIANTS = {
  success: 'bg-green-500/10 border-l-green-500 text-green-700 dark:text-green-400',
  warning: 'bg-yellow-500/10 border-l-yellow-500 text-yellow-700 dark:text-yellow-400',
  danger: 'bg-red-500/10 border-l-red-500 text-red-700 dark:text-red-400',
  info: 'bg-blue-500/10 border-l-blue-500 text-blue-700 dark:text-blue-400',
  neutral: 'bg-muted border-l-muted-foreground text-muted-foreground',
};

export function HighlightBlock({ label, content, variant }: HighlightBlockProps) {
  return (
    <div className={cn('p-3 rounded-r-lg border-l-4', HIGHLIGHT_VARIANTS[variant])}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm">{cleanAIText(content)}</p>
    </div>
  );
}
