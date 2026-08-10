import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Pencil, Bot, Globe, Sparkles, Plus, Loader2, ChevronDown 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type InputMode = 'manual' | 'ai' | 'firecrawl' | 'ai_firecrawl' | 'custom';

interface SmartInputFieldProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  onGenerateWithAI?: () => Promise<string>;
  onSearchWithFirecrawl?: () => Promise<string>;
  onAutoDecide?: () => Promise<string>;
  options?: string[];
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  multiSelect?: boolean;
  className?: string;
}

export function SmartInputField({
  label,
  description,
  value,
  onChange,
  onGenerateWithAI,
  onSearchWithFirecrawl,
  onAutoDecide,
  options = [],
  placeholder,
  disabled = false,
  isLoading = false,
  multiSelect = false,
  className,
}: SmartInputFieldProps) {
  const [activeMode, setActiveMode] = useState<InputMode>('manual');
  const [generating, setGenerating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const selectedValues = multiSelect 
    ? value.split(',').map(v => v.trim()).filter(Boolean) 
    : [value].filter(Boolean);

  const handleModeAction = async (mode: InputMode) => {
    setActiveMode(mode);
    setGenerating(true);

    try {
      let result = '';
      switch (mode) {
        case 'ai':
          if (onGenerateWithAI) result = await onGenerateWithAI();
          break;
        case 'firecrawl':
          if (onSearchWithFirecrawl) result = await onSearchWithFirecrawl();
          break;
        case 'ai_firecrawl':
          if (onAutoDecide) result = await onAutoDecide();
          break;
      }
      if (result) onChange(result);
    } catch (error) {
      console.error('Error generating:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleOptionToggle = (option: string) => {
    if (multiSelect) {
      const current = new Set(selectedValues);
      if (current.has(option)) {
        current.delete(option);
      } else {
        current.add(option);
      }
      onChange(Array.from(current).join(', '));
    } else {
      onChange(option);
    }
    setShowOptions(false);
  };

  const handleAddCustom = () => {
    if (!customValue.trim()) return;
    if (multiSelect) {
      const current = new Set(selectedValues);
      current.add(customValue.trim());
      onChange(Array.from(current).join(', '));
    } else {
      onChange(customValue.trim());
    }
    setCustomValue('');
    setShowOptions(false);
  };

  const getModeIcon = (mode: InputMode) => {
    switch (mode) {
      case 'manual': return <Pencil className="h-3.5 w-3.5" />;
      case 'ai': return <Bot className="h-3.5 w-3.5" />;
      case 'firecrawl': return <Globe className="h-3.5 w-3.5" />;
      case 'ai_firecrawl': return <Sparkles className="h-3.5 w-3.5" />;
      case 'custom': return <Plus className="h-3.5 w-3.5" />;
    }
  };

  const getModeLabel = (mode: InputMode) => {
    switch (mode) {
      case 'manual': return 'Manual';
      case 'ai': return 'IA';
      case 'firecrawl': return 'Firecrawl';
      case 'ai_firecrawl': return 'Auto';
      case 'custom': return 'Personalizado';
    }
  };

  return (
    <Card className={cn("p-4 space-y-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <label className="font-medium text-sm">{label}</label>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>

        {/* Mode selector buttons */}
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <Button
            variant={activeMode === 'manual' ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setActiveMode('manual')}
            disabled={disabled || generating}
          >
            {getModeIcon('manual')}
            <span className="ml-1 hidden sm:inline">Manual</span>
          </Button>

          {onGenerateWithAI && (
            <Button
              variant={activeMode === 'ai' ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => handleModeAction('ai')}
              disabled={disabled || generating}
            >
              {generating && activeMode === 'ai' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                getModeIcon('ai')
              )}
              <span className="ml-1 hidden sm:inline">IA</span>
            </Button>
          )}

          {onSearchWithFirecrawl && (
            <Button
              variant={activeMode === 'firecrawl' ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => handleModeAction('firecrawl')}
              disabled={disabled || generating}
            >
              {generating && activeMode === 'firecrawl' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                getModeIcon('firecrawl')
              )}
              <span className="ml-1 hidden sm:inline">Web</span>
            </Button>
          )}

          {onAutoDecide && (
            <Button
              variant={activeMode === 'ai_firecrawl' ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs bg-gradient-to-r from-primary to-purple-600 text-white border-0"
              onClick={() => handleModeAction('ai_firecrawl')}
              disabled={disabled || generating}
            >
              {generating && activeMode === 'ai_firecrawl' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                getModeIcon('ai_firecrawl')
              )}
              <span className="ml-1 hidden sm:inline">Auto</span>
            </Button>
          )}
        </div>
      </div>

      {/* Options grid */}
      {options.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {options.slice(0, showOptions ? undefined : 6).map((option) => (
              <Badge
                key={option}
                variant={selectedValues.includes(option) ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer hover:bg-primary/90 transition-colors text-xs py-1 px-2",
                  selectedValues.includes(option) && "bg-primary text-primary-foreground"
                )}
                onClick={() => !disabled && handleOptionToggle(option)}
              >
                {option}
              </Badge>
            ))}
            
            {options.length > 6 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setShowOptions(!showOptions)}
              >
                {showOptions ? 'Menos' : `+${options.length - 6} mais`}
                <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", showOptions && "rotate-180")} />
              </Button>
            )}
          </div>

          {/* Custom input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Adicionar outro..."
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              className="flex-1 h-8 px-3 text-sm border rounded-md bg-background"
              disabled={disabled}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleAddCustom}
              disabled={disabled || !customValue.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Free text area - show always when no options, or when selected values exist */}
      {options.length === 0 && (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `Digite seu(s) ${label.toLowerCase()}...`}
          className="min-h-[80px] text-sm resize-y"
          disabled={disabled || generating}
        />
      )}

      {/* Show current value if using options */}
      {options.length > 0 && value && (
        <div className="p-2 bg-muted/30 rounded text-sm">
          <span className="font-medium">Selecionado: </span>{value}
        </div>
      )}

      {/* Loading state */}
      {generating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {activeMode === 'ai' && 'Gerando com IA...'}
            {activeMode === 'firecrawl' && 'Pesquisando na web...'}
            {activeMode === 'ai_firecrawl' && 'IA + Web decidindo...'}
          </span>
        </div>
      )}
    </Card>
  );
}
