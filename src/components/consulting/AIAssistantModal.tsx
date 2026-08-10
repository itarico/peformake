import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface AssistantQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
}

interface AIAssistantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworkId: string;
  instanceId: string;
  clientContext?: {
    business_description?: string;
    business_segment?: string;
    target_audience?: string;
  };
  onComplete: (answers: Record<string, string>) => void;
}

export function AIAssistantModal({
  open,
  onOpenChange,
  frameworkId,
  instanceId,
  clientContext,
  onComplete,
}: AIAssistantModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [userSelections, setUserSelections] = useState<Record<string, string | string[]>>({});
  const [generatedAnswers, setGeneratedAnswers] = useState<Record<string, string> | null>(null);

  // Fetch assistant questions for this framework
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ['assistant-questions', frameworkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('framework_assistant_questions')
        .select('id, question_text, question_type, options')
        .eq('framework_id', frameworkId)
        .order('question_order');

      if (error) throw error;
      return data as AssistantQuestion[];
    },
    enabled: open && !!frameworkId,
  });

  // Generate answers mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('consulting-ai-assistant', {
        body: {
          framework_instance_id: instanceId,
          assistant_answers: userSelections,
          client_context: clientContext,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate answers');
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data.generated_answers) {
        setGeneratedAnswers(data.generated_answers);
        toast.success('Respostas geradas pela IA!');
      }
    },
    onError: (error) => {
      console.error('Generate error:', error);
      toast.error('Erro ao gerar respostas. Tente novamente.');
    },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setUserSelections({});
      setGeneratedAnswers(null);
    }
  }, [open]);

  const currentQuestion = questions?.[currentStep];
  const totalSteps = questions?.length || 0;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const handleSingleSelect = (questionId: string, option: string) => {
    setUserSelections(prev => ({ ...prev, [questionId]: option }));
    
    // Auto-advance for single choice questions (not multiple choice)
    // Small delay to show the selection before advancing
    setTimeout(() => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }, 300);
  };

  const handleMultiSelect = (questionId: string, option: string, checked: boolean) => {
    setUserSelections(prev => {
      const current = (prev[questionId] as string[]) || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      } else {
        return { ...prev, [questionId]: current.filter(o => o !== option) };
      }
    });
    // No auto-advance for multiple choice - user needs to click "Próxima"
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
    if (generatedAnswers) {
      onComplete(generatedAnswers);
      onOpenChange(false);
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

  if (questionsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assistente IA</DialogTitle>
            <DialogDescription>
              Não há perguntas configuradas para este framework. Por favor, preencha manualmente.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistente IA
          </DialogTitle>
          <DialogDescription>
            Responda algumas perguntas simples e a IA gerará as respostas detalhadas para você
          </DialogDescription>
        </DialogHeader>

        {!generatedAnswers ? (
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
                    </div>
                  )}

                  {currentQuestion.question_type === 'multiple_choice' && (
                    <div className="grid gap-2">
                      {(currentQuestion.options as string[])?.map((option) => {
                        const isSelected = ((userSelections[currentQuestion.id] as string[]) || []).includes(option);
                        return (
                          <div
                            key={option}
                            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                            }`}
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
                      Gerar Respostas
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
            {/* Generated Answers Preview */}
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  Respostas Geradas
                </Badge>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-3">
                {Object.entries(generatedAnswers).map(([questionId, answer]) => (
                  <Card key={questionId} className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm whitespace-pre-wrap">{answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setGeneratedAnswers(null)}
                >
                  Refazer
                </Button>
                <Button onClick={handleApply}>
                  <Check className="h-4 w-4 mr-2" />
                  Aplicar Respostas
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
