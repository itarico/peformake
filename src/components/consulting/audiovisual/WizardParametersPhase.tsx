import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useAudiovisual, VideoParameters } from './AudiovisualContext';
import {
  OBJETIVOS_ESTRATEGICOS, CANAIS_PUBLICACAO, DURACOES,
  TONS_EMOCIONAIS, ESTRATEGIAS_PERSUASIVAS, ESTAGIOS_FUNIL, ALL_ESTRUTURAS,
} from './constants';
import {
  Target, Users, ChevronRight, MonitorPlay, Clock, Palette,
  Brain, Layout, Sparkles, Loader2, Check, ChevronDown, ChevronUp,
  Zap, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WizardParametersPhaseProps { disabled?: boolean; }

interface ParamConfig {
  key: keyof VideoParameters; label: string; icon: React.ReactNode;
  type: 'select' | 'multi' | 'text' | 'structures'; options?: string[]; placeholder?: string;
}

const PARAM_CONFIGS: ParamConfig[] = [
  { key: 'objetivo', label: 'Objetivo Estratégico', icon: <Target className="h-4 w-4" />, type: 'select', options: OBJETIVOS_ESTRATEGICOS },
  { key: 'publicoAlvo', label: 'Público-Alvo', icon: <Users className="h-4 w-4" />, type: 'text', placeholder: 'Descreva: idade, dores, desejos, objeções...' },
  { key: 'estagioFunil', label: 'Estágio do Funil', icon: <ChevronRight className="h-4 w-4" />, type: 'select', options: ESTAGIOS_FUNIL },
  { key: 'canal', label: 'Canal / Plataforma', icon: <MonitorPlay className="h-4 w-4" />, type: 'multi', options: CANAIS_PUBLICACAO },
  { key: 'duracao', label: 'Duração do Vídeo', icon: <Clock className="h-4 w-4" />, type: 'select', options: DURACOES },
  { key: 'tomEmocional', label: 'Tom Emocional', icon: <Palette className="h-4 w-4" />, type: 'multi', options: TONS_EMOCIONAIS },
  { key: 'estrategiasPersuasivas', label: 'Estratégias Persuasivas', icon: <Brain className="h-4 w-4" />, type: 'multi', options: ESTRATEGIAS_PERSUASIVAS },
  { key: 'estruturaNarrativa', label: 'Estrutura Narrativa', icon: <Layout className="h-4 w-4" />, type: 'structures' },
  { key: 'cta', label: 'CTA (Chamada para Ação)', icon: <MessageSquare className="h-4 w-4" />, type: 'text', placeholder: 'Ex: Comenta "EU QUERO"' },
];

export function WizardParametersPhase({ disabled }: WizardParametersPhaseProps) {
  const { parameters, setParameter, autoDecide, batchFillParams } = useAudiovisual();
  const [expandedParam, setExpandedParam] = useState<string | null>(null);
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const definedCount = PARAM_CONFIGS.filter(p => parameters[p.key]?.trim()).length;
  const progress = (definedCount / PARAM_CONFIGS.length) * 100;

  const handleSelect = (key: keyof VideoParameters, value: string) => setParameter(key, value);

  const handleMultiToggle = (key: keyof VideoParameters, value: string) => {
    const current = parameters[key] ? parameters[key].split(', ').filter(Boolean) : [];
    if (current.includes(value)) setParameter(key, current.filter(v => v !== value).join(', '));
    else setParameter(key, [...current, value].join(', '));
  };

  const isSelected = (key: keyof VideoParameters, value: string) => {
    return parameters[key]?.split(', ').includes(value) || false;
  };

  const handleAIFill = async (key: keyof VideoParameters) => {
    setLoadingField(key);
    try {
      const result = await autoDecide(key, `Tema: "${parameters.tema || 'não definido'}". Sugira o melhor valor para ${key}.`);
      if (result) { setParameter(key, result); toast.success(`${key} preenchido!`); }
    } catch { toast.error('Erro ao gerar com IA'); }
    finally { setLoadingField(null); }
  };

  const handleAutoFillAll = async () => {
    setIsAutoFilling(true);
    try {
      await batchFillParams();
      toast.success('Parâmetros preenchidos pela IA!');
    } catch { toast.error('Erro ao preencher automaticamente'); }
    finally { setIsAutoFilling(false); }
  };

  const renderOptions = (config: ParamConfig) => {
    if (config.type === 'text') {
      return <Textarea value={parameters[config.key]} onChange={(e) => setParameter(config.key, e.target.value)} placeholder={config.placeholder} className="min-h-[80px] mt-2" disabled={disabled} />;
    }
    if (config.type === 'structures') {
      return (
        <div className="mt-2 space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {ALL_ESTRUTURAS.map((category) => (
            <div key={category.category} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{category.category}</p>
              <div className="grid gap-1">
                {category.structures.map((struct) => (
                  <div key={struct.name} className={cn("px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm hover:border-primary/50", isSelected(config.key, struct.name) && "border-primary bg-primary/10")} onClick={() => handleSelect(config.key, struct.name)}>
                    <div className="flex items-center gap-2">
                      {isSelected(config.key, struct.name) && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      <div><span className="font-medium">{struct.name}</span><span className="text-xs text-muted-foreground ml-2">{struct.description}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    const options = config.options || [];
    const isMulti = config.type === 'multi';
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {options.map((option) => (
          <Badge key={option} variant={isSelected(config.key, option) ? 'default' : 'outline'} className={cn("cursor-pointer py-1.5 px-3 text-xs transition-all hover:bg-primary/80", isSelected(config.key, option) && "ring-1 ring-primary ring-offset-1")} onClick={() => isMulti ? handleMultiToggle(config.key, option) : handleSelect(config.key, option)}>
            {isSelected(config.key, option) && <Check className="h-3 w-3 mr-1" />}{option}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Parâmetros do Roteiro</h3>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1"><Check className="h-3 w-3" />{definedCount}/{PARAM_CONFIGS.length}</Badge>
            <Button variant="outline" size="sm" onClick={handleAutoFillAll} disabled={isAutoFilling || disabled} className="gap-1.5 text-xs">
              {isAutoFilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              IA Preencher Tudo
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />

        {parameters.tema && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs font-medium text-primary mb-1">Tema Definido</p>
            <p className="text-sm">{parameters.tema}</p>
          </div>
        )}

        <div className="space-y-1">
          {PARAM_CONFIGS.map((config) => {
            const value = parameters[config.key];
            const isExpanded = expandedParam === config.key;
            const isLoading = loadingField === config.key;
            return (
              <div key={config.key} className="border rounded-lg overflow-hidden transition-all">
                <div className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors", isExpanded && "bg-muted/30")} onClick={() => setExpandedParam(isExpanded ? null : config.key)}>
                  <div className={cn("shrink-0", value?.trim() ? "text-primary" : "text-muted-foreground")}>{config.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{config.label}</p>
                    {value?.trim() ? <p className="text-xs text-muted-foreground truncate">{value}</p> : <p className="text-xs text-muted-foreground/50">Não definido</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={isLoading || disabled} onClick={(e) => { e.stopPropagation(); handleAIFill(config.key); }} title="Preencher com IA">
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                    </Button>
                    {value?.trim() ? <Check className="h-4 w-4 text-green-500" /> : isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                {isExpanded && <div className="px-3 pb-3 border-t bg-muted/10">{renderOptions(config)}</div>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
