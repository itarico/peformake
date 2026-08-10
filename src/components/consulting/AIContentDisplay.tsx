import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, Check, FileDown, Loader2, Save, Eye, Code, 
  FileText, Sparkles, BookOpen, List, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
// html2pdf is now loaded dynamically via pdfUtils

interface Section {
  type: 'title' | 'subtitle' | 'text' | 'list' | 'highlight';
  content: string;
  items?: string[];
}

interface AIContentDisplayProps {
  content: string;
  title?: string;
  generatedAt?: Date;
  instanceId?: string;
  analysisType?: string;
  showSaveButton?: boolean;
  showExportOptions?: boolean;
  className?: string;
}

// Parse AI content into structured sections
function parseAIContent(text: string): Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [];
  let currentList: string[] = [];
  
  const flushList = () => {
    if (currentList.length > 0) {
      sections.push({ type: 'list', content: '', items: [...currentList] });
      currentList = [];
    }
  };
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    
    // Detect titles
    const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed);
    const startsWithHashes = /^#{1,6}\s+/.test(trimmed);
    const hasColonEnd = trimmed.endsWith(':') && trimmed.length < 80;
    const startsWithEquals = /^={2,}/.test(trimmed) || /={2,}$/.test(trimmed);
    
    if (startsWithHashes) {
      flushList();
      sections.push({
        type: 'title',
        content: trimmed.replace(/^#{1,6}\s+/, '').replace(/\*\*/g, '').trim()
      });
    } else if (isAllCaps || startsWithEquals) {
      flushList();
      const cleanedTitle = trimmed.replace(/^={2,}\s*/, '').replace(/\s*={2,}$/, '');
      sections.push({ type: 'title', content: cleanedTitle });
    } else if (/^\d+[\.\)]\s+[A-Z]/.test(trimmed) || hasColonEnd) {
      flushList();
      sections.push({
        type: 'subtitle',
        content: trimmed.replace(/\*\*/g, '').replace(/\*/g, '').trim()
      });
    } else if (/^[-*•]\s+/.test(trimmed)) {
      currentList.push(trimmed.replace(/^[-*•]\s+/, '').replace(/\*\*/g, '').trim());
    } else if (/^\d+[.)]\s+/.test(trimmed) && trimmed.length < 200) {
      currentList.push(trimmed.replace(/^\d+[.)]\s+/, '').replace(/\*\*/g, '').trim());
    } else {
      flushList();
      const processed = trimmed
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1');
      
      // Detect highlight patterns
      if (/^(?:Dica|Importante|Atenção|Nota|Observação)[:\s]/i.test(processed)) {
        sections.push({ type: 'highlight', content: processed });
      } else {
        sections.push({ type: 'text', content: processed });
      }
    }
  }
  
  flushList();
  return sections;
}

export function AIContentDisplay({
  content,
  title,
  generatedAt,
  instanceId,
  analysisType,
  showSaveButton = true,
  showExportOptions = true,
  className,
}: AIContentDisplayProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const sections = parseAIContent(content);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Conteúdo copiado!');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleExportPDF = async () => {
    const { buildStandardPdfHtml, exportHtmlToPdf, pdfContentBlock } = await import('@/lib/pdfUtils');
    const body = sections.map(section => {
      if (section.type === 'title') {
        return `<h3 style="margin-top: 18px; margin-bottom: 8px; font-size: 14px; font-weight: bold; color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px;">${section.content}</h3>`;
      } else if (section.type === 'subtitle') {
        return `<h3 style="color: #333; font-size: 13px; margin-top: 14px; font-weight: 600;">${section.content}</h3>`;
      } else if (section.type === 'list') {
        return `<ul style="margin: 10px 0; padding-left: 20px;">${section.items?.map(item => `<li style="margin: 4px 0; font-size: 12px; color: #444;">${item}</li>`).join('')}</ul>`;
      } else if (section.type === 'highlight') {
        return `<div style="background: #fef9ee; border-left: 3px solid #f59e0b; padding: 12px; margin: 12px 0; border-radius: 0 8px 8px 0; font-size: 12px; color: #333;">${section.content}</div>`;
      } else {
        return `<p style="margin: 6px 0; font-size: 12px; color: #333; line-height: 1.5;">${section.content}</p>`;
      }
    }).join('');

    const htmlContent = buildStandardPdfHtml({
      title: title || 'Análise de Conteúdo',
      subtitle: generatedAt ? `Gerado em: ${generatedAt.toLocaleString('pt-BR')}` : undefined,
      body,
    });
    
    try {
      await exportHtmlToPdf(htmlContent, `${(title || 'analise').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exportado!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    }
  };
  
  const handleExportMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'analise').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Markdown exportado!');
  };
  
  const handleSave = async () => {
    if (!instanceId || !analysisType) {
      toast.error('Não é possível salvar: ID ou tipo não definido');
      return;
    }
    
    setIsSaving(true);
    try {
      await supabase.from('ai_analyses').insert({
        instance_id: instanceId,
        analysis_type: analysisType,
        analysis_scope: 'content',
        content,
        model_used: 'gemini-3-flash-preview',
      });
      
      queryClient.invalidateQueries({ queryKey: ['ai-analyses'] });
      toast.success('Análise salva no histórico!');
    } catch (error) {
      toast.error('Erro ao salvar análise');
    } finally {
      setIsSaving(false);
    }
  };
  
  const renderFormattedContent = () => (
    <div className="space-y-3">
      {sections.map((section, i) => {
        switch (section.type) {
          case 'title':
            return (
              <h3 key={i} className="font-bold text-base text-foreground mt-5 first:mt-0 border-b border-border/50 pb-1">
                {section.content}
              </h3>
            );
          case 'subtitle':
            return (
              <p key={i} className="font-semibold text-sm text-foreground/90 mt-3">
                {section.content}
              </p>
            );
          case 'list':
            return (
              <ul key={i} className="list-disc list-inside space-y-1 pl-2">
                {section.items?.map((item, j) => (
                  <li key={j} className="text-sm text-muted-foreground">{item}</li>
                ))}
              </ul>
            );
          case 'highlight':
            return (
              <div key={i} className="bg-amber-500/10 border-l-4 border-amber-500 p-3 rounded-r text-sm">
                {section.content}
              </div>
            );
          default:
            return (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                {section.content}
              </p>
            );
        }
      })}
    </div>
  );
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{title || 'Conteúdo Gerado'}</CardTitle>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {generatedAt && (
          <Badge variant="outline" className="w-fit text-xs">
            Gerado em {generatedAt.toLocaleString('pt-BR')}
          </Badge>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'formatted' | 'raw')}>
              <TabsList className="h-8">
                <TabsTrigger value="formatted" className="text-xs gap-1 h-6">
                  <BookOpen className="h-3 w-3" />
                  Formatado
                </TabsTrigger>
                <TabsTrigger value="raw" className="text-xs gap-1 h-6">
                  <Code className="h-3 w-3" />
                  Original
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1">
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              
              {showExportOptions && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleExportPDF} className="h-7 text-xs gap-1">
                    <FileDown className="h-3 w-3" />
                    PDF
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleExportMarkdown} className="h-7 text-xs gap-1">
                    <FileText className="h-3 w-3" />
                    MD
                  </Button>
                </>
              )}
              
              {showSaveButton && instanceId && analysisType && (
                <Button variant="secondary" size="sm" onClick={handleSave} disabled={isSaving} className="h-7 text-xs gap-1">
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Salvar
                </Button>
              )}
            </div>
          </div>
          
          <Separator />
          
          <div className="bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto">
            {viewMode === 'formatted' ? (
              renderFormattedContent()
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                {content}
              </pre>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
