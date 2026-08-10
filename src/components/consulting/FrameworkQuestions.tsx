import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuestionAIButton } from "./QuestionAIButton";

interface Question {
  id: string;
  question_order: number;
  question_text: string;
  field_type: string;
  placeholder: string | null;
  is_required: boolean;
}

interface FrameworkQuestionsProps {
  questions: Question[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  disabled?: boolean;
  frameworkId?: string;
  instanceId?: string;
  clientContext?: {
    business_description?: string;
    business_segment?: string;
    target_audience?: string;
  };
  isMetricsFramework?: boolean;
}

export function FrameworkQuestions({
  questions,
  answers,
  onAnswerChange,
  disabled = false,
  frameworkId,
  instanceId,
  clientContext,
  isMetricsFramework = false,
}: FrameworkQuestionsProps) {
  const handleAIAnswerGenerated = (questionId: string, answer: string) => {
    onAnswerChange(questionId, answer);
  };

  return (
    <div className="space-y-4">
      {questions.map((question, index) => {
        const answer = answers[question.id] || '';
        const isAnswered = answer.trim().length > 0;

        return (
          <Card key={question.id} className={isAnswered ? 'border-primary/30' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-medium flex items-start gap-2">
                  <span className="bg-primary/10 text-primary text-sm font-semibold rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <span>{question.question_text}</span>
                </CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  {frameworkId && instanceId && !disabled && !isMetricsFramework && (
                    <QuestionAIButton
                      questionId={question.id}
                      questionText={question.question_text}
                      frameworkId={frameworkId}
                      instanceId={instanceId}
                      clientContext={clientContext}
                      currentAnswer={answer}
                      onAnswerGenerated={(generatedAnswer) => handleAIAnswerGenerated(question.id, generatedAnswer)}
                      disabled={disabled}
                    />
                  )}
                  {isAnswered && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Respondida
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {question.field_type === 'number' ? (
                <Input
                  type="number"
                  value={answer}
                  onChange={(e) => onAnswerChange(question.id, e.target.value)}
                  placeholder={question.placeholder || ''}
                  disabled={disabled}
                  className="max-w-xs"
                />
              ) : (
                <Textarea
                  value={answer}
                  onChange={(e) => onAnswerChange(question.id, e.target.value)}
                  placeholder={question.placeholder || 'Digite sua resposta...'}
                  disabled={disabled}
                  rows={4}
                  className="resize-none"
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
