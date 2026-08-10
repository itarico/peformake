import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ContentCategorySelector, ContentCategory } from './ContentCategorySelector';

// DISABLED: Content category selector - now each framework generates its own specific content
// Keywords detection is no longer used as frameworks are now specific to their content type
// const CONTENT_KEYWORDS = [
//   'ideias', 'conteúdo', 'posts', 'publicações', 'temas', 
//   'sugestões', 'criativo', 'campanha', 'calendário', 'pauta'
// ];

interface AssistantQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  allow_other: boolean;
}

interface QuestionAIButtonProps {
  questionId: string;
  questionText: string;
  frameworkId: string;
  instanceId: string;
  clientContext?: {
    business_description?: string;
    business_segment?: string;
    target_audience?: string;
  };
  currentAnswer?: string;
  onAnswerGenerated: (answer: string) => void;
  disabled?: boolean;
}

export function QuestionAIButton({
  questionId,
  questionText,
  frameworkId,
  instanceId,
  clientContext,
  currentAnswer,
  onAnswerGenerated,
  disabled = false,
}: QuestionAIButtonProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [userSelections, setUserSelections] = useState<Record<string, string | string[]>>({});
  const [otherInputs, setOtherInputs] = useState<Record<string, string>>({});
  const [generatedAnswer, setGeneratedAnswer] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  // DISABLED: Category selector is no longer used
  // Each framework now generates its own specific content type directly
  const isContentQuestion = false;

  // Fetch assistant questions for this specific guided question
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['assistant-questions', frameworkId, questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('framework_assistant_questions')
        .select('id, question_text, question_type, options, allow_other')
        .eq('framework_id', frameworkId)
        .eq('target_question_id', questionId)
        .order('question_order');

      if (error) throw error;
      return data as AssistantQuestion[];
    },
    enabled: open && !!frameworkId && !!questionId,
  });

  // Generate answer mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      // Combine selections with "other" inputs
      const finalAnswers: Record<string, string | string[]> = {};
      
      for (const [qId, answer] of Object.entries(userSelections)) {
        if (Array.isArray(answer)) {
          // For multiple choice, replace "Outro" with the actual input
          const finalOptions = answer.map(opt => 
            opt === 'Outro' && otherInputs[qId] ? otherInputs[qId] : opt
          ).filter(opt => opt !== 'Outro' || otherInputs[qId]);
          finalAnswers[qId] = finalOptions;
        } else {
          // For single choice, use the "other" input if "Outro" was selected
          finalAnswers[qId] = answer === 'Outro' && otherInputs[qId] ? otherInputs[qId] : answer;
        }
      }

      const response = await supabase.functions.invoke('consulting-ai-assistant', {
        body: {
          framework_instance_id: instanceId,
          target_question_id: questionId,
          assistant_answers: finalAnswers,
          client_context: clientContext,
          content_category: selectedCategory, // Pass the selected category
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate answer');
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.generated_answer) {
        setGeneratedAnswer(data.generated_answer);
        toast.success('Resposta gerada pela IA!');
      }
    },
    onError: (error) => {
      console.error('Generate error:', error);
      toast.error('Erro ao gerar resposta. Tente novamente.');
    },
  });

  const handleOpen = () => {
    // If it's a content question, show category selector first
    if (isContentQuestion) {
      setShowCategorySelector(true);
    } else {
      setOpen(true);
    }
    setCurrentStep(0);
    setUserSelections({});
    setOtherInputs({});
    setGeneratedAnswer(null);
    setSelectedCategory(null);
  };

  const handleCategorySelect = (category: ContentCategory) => {
    setSelectedCategory(category);
    setShowCategorySelector(false);
    setOpen(true);
  };

  const currentQuestion = questions?.[currentStep];
  const totalSteps = questions?.length || 0;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const handleSingleSelect = (qId: string, option: string) => {
    setUserSelections(prev => ({ ...prev, [qId]: option }));
  };

  const handleMultiSelect = (qId: string, option: string, checked: boolean) => {
    setUserSelections(prev => {
      const current = (prev[qId] as string[]) || [];
      if (checked) {
        return { ...prev, [qId]: [...current, option] };
      } else {
        return { ...prev, [qId]: current.filter(o => o !== option) };
      }
    });
  };

  const handleOtherInput = (qId: string, value: string) => {
    setOtherInputs(prev => ({ ...prev, [qId]: value }));
  };

  const canProceed = () => {
    if (!currentQuestion) return false;
    const answer = userSelections[currentQuestion.id];
    if (currentQuestion.question_type === 'multiple_choice') {
      return Array.isArray(answer) && answer.length > 0;
    }
    return !!answer;
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleApply = () => {
    if (generatedAnswer) {
      onAnswerGenerated(generatedAnswer);
      setOpen(false);
      toast.success('Resposta aplicada!');
    }
  };

  const isLastStep = currentStep === totalSteps - 1;
  const allAnswered = questions?.every(q => {
    const answer = userSelections[q.id];
    if (q.question_type === 'multiple_choice') {
      return Array.isArray(answer) && answer.length > 0;
    }
    return !!answer;
  });

  // Check if "Outro" is selected for current question
  const isOtherSelected = () => {
    if (!currentQuestion) return false;
    const answer = userSelections[currentQuestion.id];
    if (Array.isArray(answer)) {
      return answer.includes('Outro');
    }
    return answer === 'Outro';
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        disabled={disabled}
        className="shrink-0 text-primary hover:bg-primary/10 h-8 w-8"
        title="Preencher com IA"
      >
        <Sparkles className="h-4 w-4" />
      </Button>

      {/* Category Selector Modal - shown first for content questions */}
      <ContentCategorySelector
        open={showCategorySelector}
        onOpenChange={setShowCategorySelector}
        onSelect={handleCategorySelect}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Assistente IA
            </DialogTitle>
            <DialogDescription className="text-left">
              <span className="font-medium text-foreground">{questionText}</span>
              {selectedCategory && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                  {selectedCategory === 'video' && '🎬 Vídeo'}
                  {selectedCategory === 'artes' && '🎨 Artes'}
                  {selectedCategory === 'social_media' && '📱 Social Media'}
                  {selectedCategory === 'trafego' && '🎯 Tráfego'}
                  {selectedCategory === 'todos' && '✨ Todos'}
                </span>
              )}
              <br />
              Responda algumas perguntas para gerar uma resposta detalhada
            </DialogDescription>
          </DialogHeader>

          {questionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !questions || questions.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground mb-4">
                Não há perguntas do assistente configuradas para esta pergunta.
              </p>
              <Button onClick={() => setOpen(false)}>Fechar</Button>
            </div>
          ) : !generatedAnswer ? (
            <>
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Pergunta {currentStep + 1} de {totalSteps}</span>
                  <span>{Math.round(progress)}% completo</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Current Question */}
              {currentQuestion && (
                <Card className="mt-4">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-4">{currentQuestion.question_text}</h3>

                    {currentQuestion.question_type === 'single_choice' && (
                      <div className="grid gap-2">
                        {(currentQuestion.options as string[])?.map((option) => (
                          <Button
                            key={option}
                            variant={userSelections[currentQuestion.id] === option ? 'default' : 'outline'}
                            className="justify-start h-auto py-3 px-4"
                            onClick={() => handleSingleSelect(currentQuestion.id, option)}
                          >
                            {userSelections[currentQuestion.id] === option && (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            {option}
                          </Button>
                        ))}
                        
                        {/* Outro option */}
                        {currentQuestion.allow_other && (
                          <Button
                            variant={userSelections[currentQuestion.id] === 'Outro' ? 'default' : 'outline'}
                            className="justify-start h-auto py-3 px-4"
                            onClick={() => handleSingleSelect(currentQuestion.id, 'Outro')}
                          >
                            {userSelections[currentQuestion.id] === 'Outro' && (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            Outro (especificar)
                          </Button>
                        )}
                      </div>
                    )}

                    {currentQuestion.question_type === 'multiple_choice' && (
                      <div className="grid gap-2">
                        {(currentQuestion.options as string[])?.map((option) => {
                          const isSelected = ((userSelections[currentQuestion.id] as string[]) || []).includes(option);
                          return (
                            <div
                              key={option}
                              className={cn(
                                "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted"
                              )}
                              onClick={() => handleMultiSelect(currentQuestion.id, option, !isSelected)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => 
                                  handleMultiSelect(currentQuestion.id, option, checked as boolean)
                                }
                              />
                              <span>{option}</span>
                            </div>
                          );
                        })}
                        
                        {/* Outro option */}
                        {currentQuestion.allow_other && (
                          <div
                            className={cn(
                              "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              ((userSelections[currentQuestion.id] as string[]) || []).includes('Outro') 
                                ? "bg-primary/10 border-primary" 
                                : "hover:bg-muted"
                            )}
                            onClick={() => {
                              const current = (userSelections[currentQuestion.id] as string[]) || [];
                              const isSelected = current.includes('Outro');
                              handleMultiSelect(currentQuestion.id, 'Outro', !isSelected);
                            }}
                          >
                            <Checkbox
                              checked={((userSelections[currentQuestion.id] as string[]) || []).includes('Outro')}
                              onCheckedChange={(checked) => 
                                handleMultiSelect(currentQuestion.id, 'Outro', checked as boolean)
                              }
                            />
                            <span>Outro (especificar)</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* "Other" input field */}
                    {isOtherSelected() && (
                      <div className="mt-4 space-y-2">
                        <Label htmlFor="other-input">Especifique:</Label>
                        <Input
                          id="other-input"
                          placeholder="Digite sua resposta personalizada..."
                          value={otherInputs[currentQuestion.id] || ''}
                          onChange={(e) => handleOtherInput(currentQuestion.id, e.target.value)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>

                {isLastStep ? (
                  <Button
                    onClick={handleGenerate}
                    disabled={!allAnswered || generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Gerar Resposta
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Generated Answer Preview */}
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Resposta Gerada
                  </div>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{generatedAnswer}</p>
                  </CardContent>
                </Card>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setGeneratedAnswer(null)}
                  >
                    Refazer
                  </Button>
                  <Button onClick={handleApply}>
                    <Check className="h-4 w-4 mr-2" />
                    Aplicar Resposta
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}