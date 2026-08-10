import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AssistantQuestion {
  id: string;
  question: string;
  type: 'single_choice' | 'multiple_choice';
  options: string[];
}

interface BusinessContextAIButtonProps {
  clientName: string;
  onContextGenerated: (context: {
    business_description: string;
    business_segment: string;
    target_audience: string;
    main_competitors: string;
    value_proposition: string;
  }) => void;
}

const CONTEXT_QUESTIONS: AssistantQuestion[] = [
  {
    id: 'business_type',
    question: 'Qual o tipo de negócio?',
    type: 'single_choice',
    options: [
      'Produto físico',
      'Serviço presencial',
      'Serviço online',
      'E-commerce',
      'SaaS/Software',
      'Infoproduto',
      'Consultoria',
      'Varejo/Loja',
    ],
  },
  {
    id: 'business_area',
    question: 'Qual a área de atuação?',
    type: 'single_choice',
    options: [
      'Saúde/Bem-estar',
      'Beleza/Estética',
      'Moda/Vestuário',
      'Alimentação',
      'Educação',
      'Tecnologia',
      'Finanças',
      'Construção/Decoração',
      'Entretenimento',
      'Pets',
    ],
  },
  {
    id: 'differentials',
    question: 'Quais os principais diferenciais?',
    type: 'multiple_choice',
    options: [
      'Preço competitivo',
      'Qualidade superior',
      'Atendimento personalizado',
      'Exclusividade',
      'Conveniência/Praticidade',
      'Experiência/Tradição',
      'Inovação/Tecnologia',
      'Sustentabilidade',
    ],
  },
  {
    id: 'target_gender',
    question: 'Qual o gênero predominante do público?',
    type: 'single_choice',
    options: [
      'Feminino',
      'Masculino',
      'Equilibrado',
      'Não relevante',
    ],
  },
  {
    id: 'target_age',
    question: 'Qual a faixa etária principal?',
    type: 'single_choice',
    options: [
      '18-25 anos',
      '26-35 anos',
      '36-45 anos',
      '46-55 anos',
      '55+ anos',
      'Variada',
    ],
  },
  {
    id: 'target_class',
    question: 'Qual a classe socioeconômica?',
    type: 'single_choice',
    options: [
      'Classe A (alto poder aquisitivo)',
      'Classe B (médio-alto)',
      'Classe C (média)',
      'Classes D/E',
      'Variada',
    ],
  },
  {
    id: 'target_needs',
    question: 'O que o público busca resolver?',
    type: 'multiple_choice',
    options: [
      'Economizar tempo',
      'Economizar dinheiro',
      'Melhorar aparência',
      'Melhorar saúde',
      'Status/Reconhecimento',
      'Praticidade no dia a dia',
      'Segurança/Confiança',
      'Entretenimento/Lazer',
    ],
  },
  {
    id: 'competitors',
    question: 'Quem são os principais concorrentes?',
    type: 'single_choice',
    options: [
      'Pequenos negócios locais',
      'Grandes redes/franquias',
      'E-commerces/Marketplaces',
      'Profissionais autônomos',
      'Não tem concorrentes diretos',
    ],
  },
  {
    id: 'value_prop',
    question: 'Qual o principal motivo que leva clientes a escolherem?',
    type: 'single_choice',
    options: [
      'Melhor preço/custo-benefício',
      'Qualidade superior',
      'Atendimento excepcional',
      'Exclusividade/Diferenciação',
      'Conveniência/Localização',
      'Resultados comprovados',
    ],
  },
];

export function BusinessContextAIButton({
  clientName,
  onContextGenerated,
}: BusinessContextAIButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string | string[]>>({});
  const [generatedContext, setGeneratedContext] = useState<{
    business_description: string;
    business_segment: string;
    target_audience: string;
    main_competitors: string;
    value_proposition: string;
  } | null>(null);
  const [otherInputs, setOtherInputs] = useState<Record<string, string>>({});

  const currentQuestion = CONTEXT_QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / CONTEXT_QUESTIONS.length) * 100;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const answers: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(selections)) {
        if (Array.isArray(value)) {
          const items = value.map(v => v === 'Outro' ? otherInputs[key] || v : v);
          answers[key] = items.join(', ');
        } else {
          answers[key] = value === 'Outro' ? otherInputs[key] || value : value;
        }
      }

      const response = await supabase.functions.invoke('consulting-generate-context', {
        body: {
          client_name: clientName,
          answers,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar contexto');
      }

      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedContext({
        business_description: data.business_description,
        business_segment: data.business_segment,
        target_audience: data.target_audience,
        main_competitors: data.main_competitors || '',
        value_proposition: data.value_proposition || '',
      });
      toast.success('Contexto gerado com sucesso!');
    },
    onError: (error) => {
      console.error('Generate error:', error);
      toast.error('Erro ao gerar contexto. Tente novamente.');
    },
  });

  const handleOpen = () => {
    setIsOpen(true);
    setCurrentStep(0);
    setSelections({});
    setGeneratedContext(null);
    setOtherInputs({});
  };

  const handleSingleSelect = (option: string) => {
    setSelections(prev => ({
      ...prev,
      [currentQuestion.id]: option,
    }));

    // Auto-advance for single choice questions (except "Outro", which needs input)
    if (option !== 'Outro') {
      setTimeout(() => {
        if (currentStep < CONTEXT_QUESTIONS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          generateMutation.mutate();
        }
      }, 200);
    }
  };

  const handleMultiSelect = (option: string) => {
    const current = (selections[currentQuestion.id] as string[]) || [];
    const updated = current.includes(option)
      ? current.filter(o => o !== option)
      : [...current, option];
    setSelections(prev => ({
      ...prev,
      [currentQuestion.id]: updated,
    }));
  };

  const canProceed = () => {
    const selection = selections[currentQuestion.id];
    if (!selection) return false;
    if (Array.isArray(selection)) return selection.length > 0;
    return true;
  };

  const handleNext = () => {
    if (currentStep < CONTEXT_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      generateMutation.mutate();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleApply = () => {
    if (generatedContext) {
      onContextGenerated(generatedContext);
      setIsOpen(false);
      toast.success('Contexto aplicado!');
    }
  };

  const isSelected = (option: string) => {
    const selection = selections[currentQuestion.id];
    if (Array.isArray(selection)) {
      return selection.includes(option);
    }
    return selection === option;
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Preencher com IA
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Assistente de Contexto
            </DialogTitle>
            <DialogDescription>
              Responda algumas perguntas para gerar o contexto do negócio automaticamente
            </DialogDescription>
          </DialogHeader>

          {!generatedContext ? (
            <div className="space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Pergunta {currentStep + 1} de {CONTEXT_QUESTIONS.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Question */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">{currentQuestion.question}</h3>
                
                <div className="grid gap-2 max-h-[40vh] overflow-y-auto">
                  {[...currentQuestion.options, 'Outro'].map((option) => (
                    <div key={option}>
                      <button
                        onClick={() => {
                          if (currentQuestion.type === 'single_choice') {
                            handleSingleSelect(option);
                          } else {
                            handleMultiSelect(option);
                          }
                        }}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-lg border transition-all',
                          isSelected(option)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                              isSelected(option) ? 'border-primary bg-primary' : 'border-muted-foreground'
                            )}
                          >
                            {isSelected(option) && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <span>{option}</span>
                        </div>
                      </button>
                      
                      {/* Other input field */}
                      {option === 'Outro' && isSelected('Outro') && (
                        <input
                          type="text"
                          placeholder="Especifique..."
                          value={otherInputs[currentQuestion.id] || ''}
                          onChange={(e) => setOtherInputs(prev => ({
                            ...prev,
                            [currentQuestion.id]: e.target.value,
                          }))}
                          className="mt-2 w-full px-4 py-2 rounded-lg border border-border bg-background focus:border-primary focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : currentStep === CONTEXT_QUESTIONS.length - 1 ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Gerar Contexto
                    </>
                  ) : (
                    <>
                      Próxima
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4 p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição do Negócio</label>
                  <p className="mt-1 text-sm">{generatedContext.business_description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Segmento/Nicho</label>
                  <p className="mt-1 text-sm">{generatedContext.business_segment}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Público-alvo</label>
                  <p className="mt-1 text-sm">{generatedContext.target_audience}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Principais Concorrentes</label>
                  <p className="mt-1 text-sm">{generatedContext.main_competitors}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Proposta de Valor</label>
                  <p className="mt-1 text-sm">{generatedContext.value_proposition}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedContext(null);
                    setCurrentStep(0);
                  }}
                  className="flex-1"
                >
                  Refazer
                </Button>
                <Button onClick={handleApply} className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  Aplicar Contexto
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
