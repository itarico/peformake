import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAudiovisual, VideoParameters } from './AudiovisualContext';
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
  ArrowRight, ArrowLeft, Check, Target, Users, MonitorPlay, 
  Clock, Palette, Brain, Layout, Sparkles, Loader2, Video,
  ChevronRight, RotateCcw, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AudiovisualWizardProps {
  disabled?: boolean;
  onComplete?: () => void;
}

interface WizardStep {
  id: keyof VideoParameters | 'intro' | 'review';
  title: string;
  description: string;
  icon: React.ReactNode;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'intro', title: 'Início', description: 'O que você quer criar?', icon: <Video className="h-5 w-5" /> },
  { id: 'objetivo', title: 'Objetivo', description: 'Qual o objetivo estratégico?', icon: <Target className="h-5 w-5" /> },
  { id: 'publicoAlvo', title: 'Público', description: 'Quem vai assistir?', icon: <Users className="h-5 w-5" /> },
  { id: 'estagioFunil', title: 'Jornada', description: 'Em qual estágio do funil?', icon: <ChevronRight className="h-5 w-5" /> },
  { id: 'canal', title: 'Canal', description: 'Onde será publicado?', icon: <MonitorPlay className="h-5 w-5" /> },
  { id: 'duracao', title: 'Duração', description: 'Quanto tempo de vídeo?', icon: <Clock className="h-5 w-5" /> },
  { id: 'tomEmocional', title: 'Tom', description: 'Qual tom emocional?', icon: <Palette className="h-5 w-5" /> },
  { id: 'estrategiasPersuasivas', title: 'Estratégias', description: 'Quais gatilhos usar?', icon: <Brain className="h-5 w-5" /> },
  { id: 'estruturaNarrativa', title: 'Estrutura', description: 'Como será o roteiro?', icon: <Layout className="h-5 w-5" /> },
  { id: 'review', title: 'Revisar', description: 'Confirme os parâmetros', icon: <Check className="h-5 w-5" /> },
];

export function AudiovisualWizard({ disabled, onComplete }: AudiovisualWizardProps) {
  const { parameters, setParameter, autoDecide, strategicContext } = useAudiovisual();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const step = WIZARD_STEPS[currentStep];
  const progress = ((currentStep) / (WIZARD_STEPS.length - 1)) * 100;

  const canAdvance = () => {
    if (step.id === 'intro' || step.id === 'review') return true;
    const value = parameters[step.id as keyof VideoParameters];
    return value && value.trim().length > 0;
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    toast.success('Parâmetros definidos! Agora você pode gerar roteiros.');
    onComplete?.();
  };

  const handleReset = () => {
    Object.keys(parameters).forEach(key => {
      setParameter(key as keyof VideoParameters, '');
    });
    setCurrentStep(0);
  };

  const handleAutoFillAll = async () => {
    setIsAutoFilling(true);
    try {
      const fields: (keyof VideoParameters)[] = [
        'objetivo', 'publicoAlvo', 'estagioFunil', 'canal', 
        'duracao', 'tomEmocional', 'estruturaNarrativa'
      ];
      
      for (const field of fields) {
        if (!parameters[field]) {
          const result = await autoDecide(field, `
            Baseado no contexto estratégico e no tema "${parameters.tema || 'não definido'}",
            sugira o melhor valor para ${field}.
          `);
          if (result) {
            setParameter(field, result);
          }
        }
      }
      
      toast.success('Parâmetros preenchidos automaticamente!');
      setCurrentStep(WIZARD_STEPS.length - 1); // Go to review
    } catch (error) {
      toast.error('Erro ao preencher automaticamente');
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleSelectOption = (value: string) => {
    if (step.id === 'intro' || step.id === 'review') return;
    setParameter(step.id as keyof VideoParameters, value);
    // Auto-advance after selection
    setTimeout(() => handleNext(), 300);
  };

  const handleMultiSelect = (value: string) => {
    if (step.id === 'intro' || step.id === 'review') return;
    const key = step.id as keyof VideoParameters;
    const current = parameters[key] ? parameters[key].split(', ').filter(Boolean) : [];
    
    if (current.includes(value)) {
      setParameter(key, current.filter(v => v !== value).join(', '));
    } else {
      setParameter(key, [...current, value].join(', '));
    }
  };

  const isSelected = (value: string) => {
    if (step.id === 'intro' || step.id === 'review') return false;
    const current = parameters[step.id as keyof VideoParameters];
    if (!current) return false;
    return current.split(', ').includes(value);
  };

  // Get recommended options based on previous selections
  const getRecommendations = (): string[] => {
    const recommendations: string[] = [];
    
    switch (step.id) {
      case 'estruturaNarrativa':
        // Recommend structure based on duration
        if (parameters.duracao?.includes('15s') || parameters.duracao?.includes('30s')) {
          recommendations.push('Gancho → Insight', 'Pergunta → Resposta');
        } else if (parameters.duracao?.includes('60s') || parameters.duracao?.includes('90s')) {
          recommendations.push('Gancho → Dor → Solução', 'História → Aprendizado → Aplicação');
        } else if (parameters.duracao?.includes('minutos')) {
          recommendations.push('Jornada do Herói', 'Análise → Diagnóstico → Estratégia → Execução → Resultado');
        }
        break;
      case 'tomEmocional':
        // Recommend tone based on objective
        if (parameters.objetivo?.includes('Autoridade')) {
          recommendations.push('Técnico', 'Autoridade Silenciosa');
        } else if (parameters.objetivo?.includes('Engajamento')) {
          recommendations.push('Provocativo', 'Humorístico');
        } else if (parameters.objetivo?.includes('Conversão')) {
          recommendations.push('Urgente', 'Emocional');
        }
        break;
    }
    
    return recommendations;
  };

  const renderStepContent = () => {
    const recommendations = getRecommendations();

    switch (step.id) {
      case 'intro':
        return (
          <div className="space-y-6 text-center py-8">
            <div className="p-4 bg-primary/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
              <Video className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Criador de Roteiros</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Vamos criar um roteiro passo a passo. A IA vai te ajudar a escolher 
                os melhores parâmetros baseado no contexto do cliente.
              </p>
            </div>
            
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button onClick={handleNext} className="w-full gap-2" size="lg">
                Começar Passo a Passo
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleAutoFillAll}
                disabled={isAutoFilling}
                className="w-full gap-2"
              >
                {isAutoFilling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preenchendo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    IA Preencher Tudo
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'objetivo':
        return (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {OBJETIVOS_ESTRATEGICOS.map((obj) => (
                <div
                  key={obj}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                    isSelected(obj) && "border-primary bg-primary/10"
                  )}
                  onClick={() => handleSelectOption(obj)}
                >
                  <div className="flex items-center gap-3">
                    {isSelected(obj) && <Check className="h-5 w-5 text-primary" />}
                    <span className="font-medium">{obj}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'publicoAlvo':
        return (
          <div className="space-y-4">
            <Textarea
              value={parameters.publicoAlvo}
              onChange={(e) => setParameter('publicoAlvo', e.target.value)}
              placeholder="Descreva quem vai assistir: idade, dores, desejos, objeções..."
              className="min-h-[120px]"
              disabled={disabled}
            />
            <p className="text-sm text-muted-foreground">
              Quanto mais específico, melhor será o roteiro gerado.
            </p>
          </div>
        );

      case 'estagioFunil':
        return (
          <div className="space-y-4">
            <div className="grid gap-3">
              {ESTAGIOS_FUNIL.map((estagio, i) => (
                <div
                  key={estagio}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                    isSelected(estagio) && "border-primary bg-primary/10"
                  )}
                  onClick={() => handleSelectOption(estagio)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      isSelected(estagio) ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {i + 1}
                    </div>
                    <span className="font-medium">{estagio}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'canal':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2">
              Selecione um ou mais canais onde o vídeo será publicado:
            </p>
            <div className="flex flex-wrap gap-2">
              {CANAIS_PUBLICACAO.map((canal) => (
                <Badge
                  key={canal}
                  variant={isSelected(canal) ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer py-2.5 px-4 text-sm transition-all hover:bg-primary/80",
                    isSelected(canal) && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => handleMultiSelect(canal)}
                >
                  {isSelected(canal) && <Check className="h-3 w-3 mr-1.5" />}
                  {canal}
                </Badge>
              ))}
            </div>
          </div>
        );

      case 'duracao':
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {DURACOES.map((duracao) => (
                <div
                  key={duracao}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 text-center",
                    isSelected(duracao) && "border-primary bg-primary/10"
                  )}
                  onClick={() => handleSelectOption(duracao)}
                >
                  <Clock className={cn(
                    "h-6 w-6 mx-auto mb-2",
                    isSelected(duracao) ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="font-medium">{duracao}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              A duração influencia diretamente a estrutura do roteiro.
            </p>
          </div>
        );

      case 'tomEmocional':
        return (
          <div className="space-y-4">
            {recommendations.length > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-xs text-primary font-medium mb-2">
                  Recomendado para {parameters.objetivo}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommendations.map((rec) => (
                    <Badge key={rec} variant="default" className="bg-primary">
                      {rec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {TONS_EMOCIONAIS.map((tom) => (
                <Badge
                  key={tom}
                  variant={isSelected(tom) ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer py-2 px-3 transition-all hover:bg-primary/80",
                    isSelected(tom) && "ring-2 ring-primary ring-offset-2",
                    recommendations.includes(tom) && !isSelected(tom) && "border-primary/50"
                  )}
                  onClick={() => handleMultiSelect(tom)}
                >
                  {isSelected(tom) && <Check className="h-3 w-3 mr-1" />}
                  {tom}
                </Badge>
              ))}
            </div>
          </div>
        );

      case 'estrategiasPersuasivas':
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ESTRATEGIAS_PERSUASIVAS.map((estrategia) => (
                <Badge
                  key={estrategia}
                  variant={isSelected(estrategia) ? 'default' : 'outline'}
                  className={cn(
                    "cursor-pointer py-2 px-3 transition-all hover:bg-primary/80",
                    isSelected(estrategia) && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => handleMultiSelect(estrategia)}
                >
                  {isSelected(estrategia) && <Check className="h-3 w-3 mr-1" />}
                  {estrategia}
                </Badge>
              ))}
            </div>
          </div>
        );

      case 'estruturaNarrativa':
        return (
          <div className="space-y-6">
            {recommendations.length > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-xs text-primary font-medium mb-2">
                  Recomendado para vídeos de {parameters.duracao}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommendations.map((rec) => (
                    <Badge key={rec} variant="default" className="bg-primary">
                      {rec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {ALL_ESTRUTURAS.map((category) => (
              <div key={category.category} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{category.category}</p>
                <div className="grid gap-2">
                  {category.structures.map((struct) => (
                    <div
                      key={struct.name}
                      className={cn(
                        "p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                        isSelected(struct.name) && "border-primary bg-primary/10",
                        recommendations.includes(struct.name) && "border-primary/30"
                      )}
                      onClick={() => handleSelectOption(struct.name)}
                    >
                      <div className="flex items-start gap-2">
                        {isSelected(struct.name) && <Check className="h-4 w-4 text-primary mt-0.5" />}
                        <div>
                          <p className="font-medium text-sm">{struct.name}</p>
                          <p className="text-xs text-muted-foreground">{struct.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="grid gap-3">
              {WIZARD_STEPS.filter(s => s.id !== 'intro' && s.id !== 'review').map((s) => {
                const value = parameters[s.id as keyof VideoParameters];
                return (
                  <div key={s.id} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="text-primary">{s.icon}</div>
                      <div>
                        <p className="text-sm font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {value || 'Não definido'}
                        </p>
                      </div>
                    </div>
                    {value ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <Badge variant="outline" className="text-xs">Opcional</Badge>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Recomeçar
              </Button>
              <Button onClick={handleComplete} className="flex-1 gap-2">
                <Check className="h-4 w-4" />
                Confirmar e Gerar Roteiros
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              {step.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
              <CardDescription>{step.description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline">
            {currentStep + 1} / {WIZARD_STEPS.length}
          </Badge>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        {/* Step indicators */}
        <div className="flex justify-between mt-2">
          {WIZARD_STEPS.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {renderStepContent()}
        
        {/* Navigation */}
        {step.id !== 'intro' && step.id !== 'review' && (
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            
            <Button onClick={handleNext} disabled={!canAdvance()}>
              {currentStep === WIZARD_STEPS.length - 2 ? 'Revisar' : 'Próximo'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
