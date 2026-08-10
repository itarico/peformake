import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  ClipboardList,
  Send,
  Lock,
  CalendarDays,
  Target
} from 'lucide-react';
import { PortalAIButton } from './PortalAIButton';

// Slugs de frameworks base que o cliente pode responder
const BASE_FRAMEWORK_SLUGS = [
  'swot',
  'stp', 
  'persona',
  'gap-analysis',
  '5w2h',
];

interface Framework {
  id: string;
  name: string;
  slug: string;
  objective: string;
}

interface FrameworkQuestion {
  id: string;
  question_text: string;
  field_type: string;
  placeholder: string | null;
  question_order: number;
}

interface ClientQuizProps {
  clientId: string;
  clientData?: {
    name: string;
    business_description?: string | null;
    business_segment?: string | null;
    target_audience?: string | null;
  } | null;
}

export function ClientQuiz({ clientId, clientData }: ClientQuizProps) {
  const queryClient = useQueryClient();
  const [currentFrameworkIndex, setCurrentFrameworkIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [monthlyFocus, setMonthlyFocus] = useState('');

  // Check if today is day 15 or later (allow updates)
  const today = new Date();
  const isUpdateDay = today.getDate() >= 15;

  // Fetch frameworks base
  const { data: frameworks, isLoading: loadingFrameworks } = useQuery({
    queryKey: ['portal-base-frameworks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('frameworks')
        .select('id, name, slug, objective')
        .in('slug', BASE_FRAMEWORK_SLUGS)
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as Framework[];
    },
  });

  // Fetch consulting months for client
  const { data: consultingMonths } = useQuery({
    queryKey: ['portal-consulting-months', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consulting_months')
        .select('id, month, year, notes, monthly_focus')
        .eq('client_id', clientId)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const currentConsultingMonth = consultingMonths?.[0];

  // Load monthly focus from dedicated column
  useEffect(() => {
    if (currentConsultingMonth?.monthly_focus) {
      setMonthlyFocus(currentConsultingMonth.monthly_focus);
    }
  }, [currentConsultingMonth?.monthly_focus]);

  // Fetch existing framework instances for this client's consulting months
  const { data: existingInstances } = useQuery({
    queryKey: ['portal-framework-instances', currentConsultingMonth?.id],
    queryFn: async () => {
      if (!currentConsultingMonth?.id) return [];
      
      const { data, error } = await supabase
        .from('framework_instances')
        .select(`
          id,
          framework_id,
          status,
          completed_at,
          frameworks(slug, name)
        `)
        .eq('consulting_month_id', currentConsultingMonth.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentConsultingMonth?.id,
  });

  // Check which frameworks are completed and when
  const completedFrameworks = useMemo(() => {
    return existingInstances?.filter((i: any) => i.status === 'completed') || [];
  }, [existingInstances]);

  // Filter frameworks that haven't been completed yet OR can be edited (day 15+)
  const pendingFrameworks = useMemo(() => {
    if (!frameworks) return [];
    
    return frameworks.filter(f => {
      const instance = existingInstances?.find((i: any) => i.framework_id === f.id);
      // Show if not completed, OR if it's update day (15th+)
      return !instance || instance.status !== 'completed' || isUpdateDay;
    });
  }, [frameworks, existingInstances, isUpdateDay]);

  const allCompleted = frameworks?.length > 0 && 
    completedFrameworks.length >= frameworks.length && 
    !isUpdateDay;

  const currentFramework = pendingFrameworks[currentFrameworkIndex];

  // Fetch questions for current framework
  const { data: questions, isLoading: loadingQuestions } = useQuery({
    queryKey: ['portal-framework-questions', currentFramework?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('framework_questions')
        .select('*')
        .eq('framework_id', currentFramework?.id)
        .order('question_order');
      
      if (error) throw error;
      return data as FrameworkQuestion[];
    },
    enabled: !!currentFramework?.id,
  });

  // Fetch existing answers if there's an instance
  const currentInstance = existingInstances?.find((i: any) => i.framework_id === currentFramework?.id);

  const { data: existingAnswers } = useQuery({
    queryKey: ['portal-framework-answers', currentInstance?.id],
    queryFn: async () => {
      if (!currentInstance?.id) return [];
      
      const { data, error } = await supabase
        .from('framework_answers')
        .select('question_id, answer_text')
        .eq('instance_id', currentInstance.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentInstance?.id,
  });

  // Load existing answers into state
  useEffect(() => {
    if (existingAnswers && currentFramework?.id) {
      const frameworkAnswers: Record<string, string> = {};
      existingAnswers.forEach(a => {
        if (a.answer_text) {
          frameworkAnswers[a.question_id] = a.answer_text;
        }
      });
      if (Object.keys(frameworkAnswers).length > 0) {
        setAnswers(prev => ({
          ...prev,
          [currentFramework.id]: frameworkAnswers,
        }));
      }
    }
  }, [existingAnswers, currentFramework?.id]);

  const currentQuestion = questions?.[currentQuestionIndex];
  const totalQuestions = questions?.length || 0;
  const currentAnswer = currentFramework?.id && currentQuestion?.id 
    ? answers[currentFramework.id]?.[currentQuestion.id] || ''
    : '';

  const handleAnswerChange = (value: string) => {
    if (!currentFramework?.id || !currentQuestion?.id) return;
    
    setAnswers(prev => ({
      ...prev,
      [currentFramework.id]: {
        ...prev[currentFramework.id],
        [currentQuestion.id]: value,
      },
    }));
  };

  const saveMonthlyFocusMutation = useMutation({
    mutationFn: async (focus: string) => {
      // Save to NEXT month's consulting_months
      const now = new Date();
      let nextMonth = now.getMonth() + 2; // getMonth is 0-indexed, +2 for next month
      let nextYear = now.getFullYear();
      if (nextMonth > 12) { nextMonth -= 12; nextYear++; }

      // Try to find next month's consulting_months
      const { data: nextCM } = await supabase
        .from('consulting_months')
        .select('id')
        .eq('client_id', clientId)
        .eq('year', nextYear)
        .eq('month', nextMonth)
        .maybeSingle();

      if (nextCM?.id) {
        const { error } = await supabase
          .from('consulting_months')
          .update({ monthly_focus: focus })
          .eq('id', nextCM.id);
        if (error) throw error;
      } else {
        // Create next month entry if it doesn't exist
        const { error } = await supabase
          .from('consulting_months')
          .insert({ client_id: clientId, year: nextYear, month: nextMonth, monthly_focus: focus });
        if (error) throw error;
      }

      // Also save to current month if it exists (for reference)
      if (currentConsultingMonth?.id) {
        await supabase
          .from('consulting_months')
          .update({ monthly_focus: focus })
          .eq('id', currentConsultingMonth.id);
      }
    },
    onSuccess: () => {
      toast.success('Foco do próximo mês salvo com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['portal-consulting-months'] });
    },
  });

  const saveFrameworkAnswers = useMutation({
    mutationFn: async () => {
      if (!currentFramework?.id || !currentConsultingMonth?.id) {
        throw new Error('Dados necessários não encontrados');
      }

      setIsSaving(true);
      const frameworkAnswers = answers[currentFramework.id] || {};
      
      // Create or get instance
      let instanceId = currentInstance?.id;
      
      if (!instanceId) {
        const { data: newInstance, error: instanceError } = await supabase
          .from('framework_instances')
          .insert({
            consulting_month_id: currentConsultingMonth.id,
            framework_id: currentFramework.id,
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        
        if (instanceError) throw instanceError;
        instanceId = newInstance.id;
      } else {
        // Update existing instance to completed
        await supabase
          .from('framework_instances')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('id', instanceId);
      }

      // Save all answers
      for (const [questionId, answerText] of Object.entries(frameworkAnswers)) {
        const { error } = await supabase
          .from('framework_answers')
          .upsert({
            instance_id: instanceId,
            question_id: questionId,
            answer_text: answerText,
          }, { onConflict: 'instance_id,question_id' });
        
        if (error) throw error;
      }

      // Create notification for staff
      await supabase
        .from('notifications')
        .insert({
          client_id: clientId,
          title: 'Quiz preenchido pelo cliente',
          message: `O cliente completou o framework ${currentFramework.name}`,
          type: 'quiz_completed',
        });

      return instanceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-framework-instances'] });
      toast.success('Respostas salvas com sucesso!');
      
      // Move to next framework
      if (currentFrameworkIndex < pendingFrameworks.length - 1) {
        setCurrentFrameworkIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    saveFrameworkAnswers.mutate();
  };

  const progress = totalQuestions > 0 
    ? ((currentQuestionIndex + 1) / totalQuestions) * 100 
    : 0;

  const answeredCount = currentFramework?.id 
    ? Object.values(answers[currentFramework.id] || {}).filter(a => a.trim()).length 
    : 0;

  // Loading state
  if (loadingFrameworks) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // No consulting month available
  if (!currentConsultingMonth) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum período de consultoria ativo encontrado.
          </p>
        </CardContent>
      </Card>
    );
  }

  // All completed and not update day
  if (allCompleted) {
    return (
      <div className="space-y-6">
        {/* Monthly Focus Card */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Foco do Próximo Mês
            </CardTitle>
            <CardDescription>
              O que você gostaria de abordar ou focar no próximo mês?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={monthlyFocus}
              onChange={(e) => setMonthlyFocus(e.target.value)}
              placeholder="Ex: Lançamento de novo produto, campanha de natal, foco em engajamento..."
              rows={3}
            />
            <Button 
              onClick={() => saveMonthlyFocusMutation.mutate(monthlyFocus)}
              disabled={saveMonthlyFocusMutation.isPending}
            >
              {saveMonthlyFocusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Foco
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Parabéns!</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Você já respondeu todos os questionários base. Nossa equipe utilizará essas informações para criar sua estratégia personalizada.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Você poderá atualizar suas respostas a partir do dia 15 de cada mês</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No pending frameworks (edge case)
  if (pendingFrameworks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum questionário disponível no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Focus Card */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Foco do Próximo Mês
          </CardTitle>
          <CardDescription>
            O que você gostaria de abordar ou focar no próximo mês?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={monthlyFocus}
            onChange={(e) => setMonthlyFocus(e.target.value)}
            placeholder="Ex: Lançamento de novo produto, campanha de natal, foco em engajamento..."
            rows={3}
          />
          <Button 
            onClick={() => saveMonthlyFocusMutation.mutate(monthlyFocus)}
            disabled={saveMonthlyFocusMutation.isPending}
            size="sm"
          >
            {saveMonthlyFocusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Foco
          </Button>
        </CardContent>
      </Card>

      {/* Update notice if day 15+ */}
      {isUpdateDay && completedFrameworks.length > 0 && (
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="py-4">
            <p className="text-sm text-primary flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <strong>Período de atualização:</strong> Você pode revisar e atualizar suas respostas para o planejamento do próximo mês.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Framework selector */}
      <div className="flex flex-wrap gap-2">
        {pendingFrameworks.map((f, index) => {
          const isCompleted = completedFrameworks.some((c: any) => c.framework_id === f.id);
          return (
            <Badge 
              key={f.id}
              variant={index === currentFrameworkIndex ? "default" : "outline"}
              className={`cursor-pointer transition-colors ${
                index === currentFrameworkIndex ? '' : 'hover:bg-primary/10'
              } ${isCompleted ? 'border-green-500' : ''}`}
              onClick={() => {
                setCurrentFrameworkIndex(index);
                setCurrentQuestionIndex(0);
              }}
            >
              {isCompleted && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {f.name}
            </Badge>
          );
        })}
      </div>

      {/* Main question card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  {currentFramework?.slug?.toUpperCase() || 'FRAMEWORK'}
                </Badge>
              </div>
              <CardTitle className="text-xl">{currentFramework?.name}</CardTitle>
              <CardDescription className="mt-1">
                {currentFramework?.objective}
              </CardDescription>
            </div>
            <Badge variant="outline">
              {answeredCount}/{totalQuestions} respondidas
            </Badge>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>

        {loadingQuestions ? (
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        ) : currentQuestion ? (
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                  {currentQuestionIndex + 1}
                </span>
                <div className="flex-1 space-y-3">
                  <h3 className="text-lg font-medium leading-relaxed">
                    {currentQuestion.question_text}
                  </h3>
                  
                  {/* AI Suggestion Button */}
                  {clientData && currentQuestion.field_type !== 'number' && (
                    <PortalAIButton
                      questionId={currentQuestion.id}
                      questionText={currentQuestion.question_text}
                      frameworkName={currentFramework?.name || ''}
                      clientContext={{
                        name: clientData.name,
                        business_description: clientData.business_description || '',
                        business_segment: clientData.business_segment || '',
                        target_audience: clientData.target_audience || '',
                      }}
                      onSuggestionGenerated={(text) => handleAnswerChange(text)}
                    />
                  )}
                </div>
              </div>

              <div className="pl-11">
                {currentQuestion.field_type === 'number' ? (
                  <Input
                    type="number"
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder={currentQuestion.placeholder || 'Digite o valor...'}
                    className="max-w-xs text-lg"
                  />
                ) : (
                  <Textarea
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder={currentQuestion.placeholder || 'Digite sua resposta...'}
                    rows={5}
                    className="resize-none text-base"
                  />
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground">
                Pergunta {currentQuestionIndex + 1} de {totalQuestions}
              </span>

              {currentQuestionIndex === totalQuestions - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSaving || answeredCount === 0}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Enviar Respostas
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Próxima
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        ) : (
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhuma pergunta encontrada</p>
          </CardContent>
        )}
      </Card>

      {/* Tips card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Dica:</strong> Responda com o máximo de detalhes possível. Suas respostas nos ajudam a criar uma estratégia mais personalizada e eficaz para o seu negócio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
