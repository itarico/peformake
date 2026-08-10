import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import type { ChatParam } from './types';

interface ChatParamsPanelProps {
  params: ChatParam[];
  selectedParams: Record<string, string>;
  showParams: boolean;
  onToggleParams: () => void;
  onParamSelect: (key: string, value: string) => void;
  paramCount: number;
}

export function ChatParamsPanel({
  params, selectedParams, showParams, onToggleParams, onParamSelect, paramCount,
}: ChatParamsPanelProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggleParams}
        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Zap className="h-4 w-4 text-primary" />
          Parâmetros Estratégicos
          {paramCount > 0 && (
            <Badge variant="secondary" className="text-xs">{paramCount} selecionado{paramCount > 1 ? 's' : ''}</Badge>
          )}
        </div>
        {showParams ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showParams && (
        <div className="p-3 space-y-3 bg-background">
          {params.map((param) => (
            <div key={param.key}>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{param.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {param.options.map((opt) => (
                  <Button
                    key={opt}
                    variant={selectedParams[param.key] === opt ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => onParamSelect(param.key, opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
