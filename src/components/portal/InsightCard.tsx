import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InsightCardProps {
  title: string;
  icon: React.ReactNode;
  content: any;
  type: 'diagnostico' | 'sintese' | 'plano_acao' | 'generic';
  className?: string;
}

export function InsightCard({ title, icon, content, type, className }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textContent = typeof content === 'string' 
      ? content 
      : content.text || JSON.stringify(content, null, 2);
    
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    if (typeof content === 'string') {
      return (
        <div className="prose prose-sm max-w-none text-foreground">
          <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
        </div>
      );
    }

    if (content.text) {
      return (
        <div className="prose prose-sm max-w-none text-foreground">
          <div dangerouslySetInnerHTML={{ __html: content.text.replace(/\n/g, '<br/>') }} />
        </div>
      );
    }

    // Handle structured content
    if (type === 'diagnostico') {
      return (
        <div className="space-y-4">
          {content.forcas && (
            <div className="p-3 bg-green-500/10 rounded-lg">
              <p className="text-xs font-semibold text-green-600 mb-1">Forças</p>
              <p className="text-sm">{content.forcas}</p>
            </div>
          )}
          {content.fraquezas && (
            <div className="p-3 bg-red-500/10 rounded-lg">
              <p className="text-xs font-semibold text-red-600 mb-1">Fraquezas</p>
              <p className="text-sm">{content.fraquezas}</p>
            </div>
          )}
          {content.oportunidades && (
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <p className="text-xs font-semibold text-blue-600 mb-1">Oportunidades</p>
              <p className="text-sm">{content.oportunidades}</p>
            </div>
          )}
          {content.ameacas && (
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <p className="text-xs font-semibold text-yellow-600 mb-1">Ameaças</p>
              <p className="text-sm">{content.ameacas}</p>
            </div>
          )}
          {content.resumo && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-semibold mb-1">Resumo</p>
              <p className="text-sm text-muted-foreground">{content.resumo}</p>
            </div>
          )}
        </div>
      );
    }

    if (type === 'plano_acao') {
      const acoes = content.acoes || content.items || [];
      if (Array.isArray(acoes) && acoes.length > 0) {
        return (
          <div className="space-y-2">
            {acoes.map((acao: any, index: number) => (
              <div key={index} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{typeof acao === 'string' ? acao : acao.titulo || acao.descricao}</p>
                  {acao.prazo && <p className="text-xs text-muted-foreground mt-1">Prazo: {acao.prazo}</p>}
                  {acao.responsavel && <p className="text-xs text-muted-foreground">Responsável: {acao.responsavel}</p>}
                </div>
              </div>
            ))}
          </div>
        );
      }
    }

    // Generic JSON display
    return (
      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  };

  const getPreviewText = () => {
    if (typeof content === 'string') {
      return content.substring(0, 150) + (content.length > 150 ? '...' : '');
    }
    if (content.text) {
      return content.text.substring(0, 150) + (content.text.length > 150 ? '...' : '');
    }
    if (content.resumo) {
      return content.resumo.substring(0, 150) + (content.resumo.length > 150 ? '...' : '');
    }
    return 'Clique para ver detalhes';
  };

  const getCardColor = () => {
    switch (type) {
      case 'diagnostico': return 'border-l-4 border-l-blue-500';
      case 'sintese': return 'border-l-4 border-l-purple-500';
      case 'plano_acao': return 'border-l-4 border-l-green-500';
      default: return '';
    }
  };

  return (
    <Card className={cn(getCardColor(), className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {icon}
                {title}
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
            
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copiar
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
