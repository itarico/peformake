import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Copy, Check, Target, TrendingUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { parseContent, FormattedText, HighlightBlock, cleanAIText } from './ContentFormatter';

type AnalysisType = 'diagnostico' | 'sintese' | 'plano_acao';

interface StrategicAnalysisCardProps {
  type: AnalysisType;
  content: string;
  className?: string;
}

const CARD_CONFIG: Record<AnalysisType, { title: string; icon: React.ReactNode; accent: string }> = {
  diagnostico: {
    title: 'Diagnóstico Estratégico',
    icon: <Target className="h-5 w-5" />,
    accent: 'border-l-blue-500',
  },
  sintese: {
    title: 'Síntese do Mês',
    icon: <TrendingUp className="h-5 w-5" />,
    accent: 'border-l-purple-500',
  },
  plano_acao: {
    title: 'Plano de Ação',
    icon: <CheckCircle2 className="h-5 w-5" />,
    accent: 'border-l-green-500',
  },
};

export function StrategicAnalysisCard({ type, content, className }: StrategicAnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const config = CARD_CONFIG[type];
  const parsed = parseContent(content);

  const handleCopy = async () => {
    const text = typeof parsed === 'string' ? parsed : parsed.text || JSON.stringify(parsed, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getPreviewText = () => {
    if (parsed.text) {
      return parsed.text.substring(0, 120) + (parsed.text.length > 120 ? '...' : '');
    }
    if (parsed.resumo) {
      return parsed.resumo.substring(0, 120) + (parsed.resumo.length > 120 ? '...' : '');
    }
    return 'Clique para ver detalhes';
  };

  const renderContent = () => {
    // Handle SWOT-style diagnostic
    if (type === 'diagnostico') {
      const hasSWOT = parsed.forcas || parsed.fraquezas || parsed.oportunidades || parsed.ameacas;
      
      if (hasSWOT) {
        return (
          <div className="space-y-3">
            {parsed.forcas && <HighlightBlock label="Forças" content={parsed.forcas} variant="success" />}
            {parsed.fraquezas && <HighlightBlock label="Fraquezas" content={parsed.fraquezas} variant="danger" />}
            {parsed.oportunidades && <HighlightBlock label="Oportunidades" content={parsed.oportunidades} variant="info" />}
            {parsed.ameacas && <HighlightBlock label="Ameaças" content={parsed.ameacas} variant="warning" />}
            {parsed.resumo && <HighlightBlock label="Resumo" content={parsed.resumo} variant="neutral" />}
          </div>
        );
      }
    }

    // Handle action plan
    if (type === 'plano_acao') {
      const acoes = parsed.acoes || parsed.items || [];
      
      if (Array.isArray(acoes) && acoes.length > 0) {
        return (
          <div className="space-y-2">
            {acoes.map((acao: any, index: number) => (
              <div key={index} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  {index + 1}
                </span>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {typeof acao === 'string' ? cleanAIText(acao) : cleanAIText(acao.titulo || acao.descricao || '')}
                  </p>
                  {acao.prazo && (
                    <p className="text-xs text-muted-foreground">📅 Prazo: {acao.prazo}</p>
                  )}
                  {acao.responsavel && (
                    <p className="text-xs text-muted-foreground">👤 Responsável: {acao.responsavel}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }
    }

    // Default: formatted text
    return <FormattedText content={parsed.text || content} />;
  };

  return (
    <Card className={cn('border-l-4', config.accent, className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {config.icon}
                {config.title}
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            {!isExpanded && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                {getPreviewText()}
              </p>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {renderContent()}
            
            <div className="flex justify-end pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                Copiar
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
