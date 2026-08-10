import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAudiovisual } from './AudiovisualContext';
import {
  OBJETIVOS_ESTRATEGICOS,
  CANAIS_PUBLICACAO,
  DURACOES,
  TONS_EMOCIONAIS,
  ESTRATEGIAS_PERSUASIVAS,
  ESTAGIOS_FUNIL,
  ALL_ESTRUTURAS,
} from './constants';
import { 
  Target, Users, Map, MonitorPlay, Clock, Palette, Brain, Layout, 
  ChevronDown, Sparkles, Loader2, Check 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SimplifiedParametersSectionProps {
  disabled?: boolean;
}

export function SimplifiedParametersSection({ disabled }: SimplifiedParametersSectionProps) {
  const { 
    parameters, 
    setParameter, 
    autoDecide,
    strategicContext 
  } = useAudiovisual();

  const [isAutoFilling, setIsAutoFilling] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(['objetivo', 'publico']);

  // Extract context suggestions from strategic context
  const getContextSuggestion = (field: string): string | null => {
    if (!strategicContext) return null;

    const contextLower = strategicContext.toLowerCase();
    
    if (field === 'publicoAlvo') {
      const match = strategicContext.match(/Público-alvo:\s*([^\n]+)/i);
      return match ? match[1].trim() : null;
    }
    
    if (field === 'tema') {
      const match = strategicContext.match(/Foco.*?:\s*([^\n]+)/i);
      return match ? match[1].trim() : null;
    }

    return null;
  };

  const handleAutoFill = async (field: string) => {
    setIsAutoFilling(field);
    try {
      const result = await autoDecide(field, `
        Baseado no contexto estratégico completo, sugira o melhor valor para "${field}".
        Considere o tema: "${parameters.tema || 'não definido'}"
        Retorne apenas o valor, sem explicações.
      `);
      if (result) {
        setParameter(field as any, result);
        toast.success(`${field} preenchido automaticamente`);
      }
    } catch (error) {
      toast.error('Erro ao preencher automaticamente');
    } finally {
      setIsAutoFilling(null);
    }
  };

  const handleAutoFillAll = async () => {
    const fields = ['objetivo', 'publicoAlvo', 'estagioFunil', 'canal', 'duracao', 'tomEmocional'];
    
    for (const field of fields) {
      if (!parameters[field as keyof typeof parameters]) {
        await handleAutoFill(field);
      }
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleMultiSelect = (field: keyof typeof parameters, value: string) => {
    const current = parameters[field] ? parameters[field].split(', ').filter(Boolean) : [];
    
    if (current.includes(value)) {
      setParameter(field, current.filter(v => v !== value).join(', '));
    } else {
      setParameter(field, [...current, value].join(', '));
    }
  };

  const isSelected = (field: keyof typeof parameters, value: string) => {
    const current = parameters[field] ? parameters[field].split(', ') : [];
    return current.includes(value);
  };

  const ParameterSection = ({ 
    id, 
    title, 
    icon, 
    children,
    badge 
  }: { 
    id: string;
    title: string; 
    icon: React.ReactNode;
    children: React.ReactNode;
    badge?: string;
  }) => (
    <Collapsible 
      open={openSections.includes(id)} 
      onOpenChange={() => toggleSection(id)}
    >
      <CollapsibleTrigger className="w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{title}</span>
            {badge && <Badge variant="secondary" className="ml-2">{badge}</Badge>}
          </div>
          <ChevronDown className={cn(
            "h-5 w-5 transition-transform",
            openSections.includes(id) && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );

  const contextSuggestionPublico = getContextSuggestion('publicoAlvo');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Parâmetros do Vídeo</CardTitle>
            <CardDescription>
              Defina manualmente ou use IA para preencher automaticamente
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoFillAll}
            disabled={disabled || isAutoFilling !== null}
            className="gap-2"
          >
            {isAutoFilling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Auto-preencher
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Objetivo */}
        <ParameterSection
          id="objetivo"
          title="Objetivo Estratégico"
          icon={<Target className="h-5 w-5 text-primary" />}
          badge={parameters.objetivo}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {OBJETIVOS_ESTRATEGICOS.map((obj) => (
                <Badge
                  key={obj}
                  variant={parameters.objetivo === obj ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/80 transition-colors py-1.5 px-3"
                  onClick={() => !disabled && setParameter('objetivo', obj)}
                >
                  {obj}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ou digite um objetivo personalizado..."
                value={!OBJETIVOS_ESTRATEGICOS.includes(parameters.objetivo) ? parameters.objetivo : ''}
                onChange={(e) => setParameter('objetivo', e.target.value)}
                disabled={disabled}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleAutoFill('objetivo')}
                disabled={disabled || isAutoFilling === 'objetivo'}
              >
                {isAutoFilling === 'objetivo' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </ParameterSection>

        {/* Público-alvo */}
        <ParameterSection
          id="publico"
          title="Público-alvo"
          icon={<Users className="h-5 w-5 text-primary" />}
        >
          <div className="space-y-3">
            {contextSuggestionPublico && !parameters.publicoAlvo && (
              <div 
                className="p-3 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => setParameter('publicoAlvo', contextSuggestionPublico)}
              >
                <p className="text-xs text-primary font-medium mb-1">Sugestão do contexto:</p>
                <p className="text-sm">{contextSuggestionPublico}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder="Descreva o público-alvo: nicho, dores, objeções, desejos..."
                value={parameters.publicoAlvo}
                onChange={(e) => setParameter('publicoAlvo', e.target.value)}
                disabled={disabled}
                rows={3}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAutoFill('publicoAlvo')}
              disabled={disabled || isAutoFilling === 'publicoAlvo'}
              className="gap-2"
            >
              {isAutoFilling === 'publicoAlvo' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Gerar com IA
            </Button>
          </div>
        </ParameterSection>

        {/* Estágio do Funil */}
        <ParameterSection
          id="estagio"
          title="Estágio da Jornada"
          icon={<Map className="h-5 w-5 text-primary" />}
          badge={parameters.estagioFunil}
        >
          <div className="flex flex-wrap gap-2">
            {ESTAGIOS_FUNIL.map((estagio) => (
              <Badge
                key={estagio}
                variant={parameters.estagioFunil === estagio ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors py-1.5 px-3"
                onClick={() => !disabled && setParameter('estagioFunil', estagio)}
              >
                {estagio}
              </Badge>
            ))}
          </div>
        </ParameterSection>

        {/* Canal (Multi-select) */}
        <ParameterSection
          id="canal"
          title="Canais de Publicação"
          icon={<MonitorPlay className="h-5 w-5 text-primary" />}
          badge={parameters.canal ? `${parameters.canal.split(', ').length} selecionados` : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {CANAIS_PUBLICACAO.map((canal) => (
              <Badge
                key={canal}
                variant={isSelected('canal', canal) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors py-1.5 px-3"
                onClick={() => !disabled && handleMultiSelect('canal', canal)}
              >
                {isSelected('canal', canal) && <Check className="h-3 w-3 mr-1" />}
                {canal}
              </Badge>
            ))}
          </div>
        </ParameterSection>

        {/* Duração */}
        <ParameterSection
          id="duracao"
          title="Duração do Vídeo"
          icon={<Clock className="h-5 w-5 text-primary" />}
          badge={parameters.duracao}
        >
          <div className="flex flex-wrap gap-2">
            {DURACOES.map((duracao) => (
              <Badge
                key={duracao}
                variant={parameters.duracao === duracao ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors py-1.5 px-3"
                onClick={() => !disabled && setParameter('duracao', duracao)}
              >
                {duracao}
              </Badge>
            ))}
          </div>
        </ParameterSection>

        {/* Tom Emocional (Multi-select) */}
        <ParameterSection
          id="tom"
          title="Tom Emocional"
          icon={<Palette className="h-5 w-5 text-primary" />}
          badge={parameters.tomEmocional ? `${parameters.tomEmocional.split(', ').length} selecionados` : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {TONS_EMOCIONAIS.map((tom) => (
              <Badge
                key={tom}
                variant={isSelected('tomEmocional', tom) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors py-1.5 px-3"
                onClick={() => !disabled && handleMultiSelect('tomEmocional', tom)}
              >
                {isSelected('tomEmocional', tom) && <Check className="h-3 w-3 mr-1" />}
                {tom}
              </Badge>
            ))}
          </div>
        </ParameterSection>

        {/* Estratégias Persuasivas (Multi-select) */}
        <ParameterSection
          id="estrategias"
          title="Estratégias Persuasivas"
          icon={<Brain className="h-5 w-5 text-primary" />}
          badge={parameters.estrategiasPersuasivas ? `${parameters.estrategiasPersuasivas.split(', ').length} selecionados` : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {ESTRATEGIAS_PERSUASIVAS.map((estrategia) => (
              <Badge
                key={estrategia}
                variant={isSelected('estrategiasPersuasivas', estrategia) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/80 transition-colors py-1.5 px-3"
                onClick={() => !disabled && handleMultiSelect('estrategiasPersuasivas', estrategia)}
              >
                {isSelected('estrategiasPersuasivas', estrategia) && <Check className="h-3 w-3 mr-1" />}
                {estrategia}
              </Badge>
            ))}
          </div>
        </ParameterSection>

        {/* Estrutura Narrativa */}
        <ParameterSection
          id="estrutura"
          title="Estrutura Narrativa"
          icon={<Layout className="h-5 w-5 text-primary" />}
          badge={parameters.estruturaNarrativa}
        >
          <div className="space-y-4">
            {ALL_ESTRUTURAS.map((category) => (
              <div key={category.category} className="space-y-2">
                <Label className="text-sm text-muted-foreground">{category.category}</Label>
                <div className="grid gap-2">
                  {category.structures.map((struct) => (
                    <div
                      key={struct.name}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                        parameters.estruturaNarrativa === struct.name && "border-primary bg-primary/10"
                      )}
                      onClick={() => !disabled && setParameter('estruturaNarrativa', struct.name)}
                    >
                      <p className="font-medium text-sm">{struct.name}</p>
                      <p className="text-xs text-muted-foreground">{struct.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ParameterSection>
      </CardContent>
    </Card>
  );
}
