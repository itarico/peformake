import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { addCrmAgentQuestion, deleteCrmAgentQuestion, updateCrmAgentQuestion } from '@/lib/crmConfigManager';

interface Question {
  id?: string;
  question_text: string;
  is_required: boolean;
  score_weight: number;
  question_order: number;
}

interface Props {
  clientId: string;
  agentType: string;
  questions: Question[];
  onReload: () => void;
}

export default function AgentQuestionsTab({ clientId, agentType, questions, onReload }: Props) {
  const [saving, setSaving] = useState(false);
  const [newQ, setNewQ] = useState('');

  const addQuestion = async () => {
    if (!newQ.trim()) return;
    setSaving(true);
    try {
      await addCrmAgentQuestion(clientId, agentType, {
        question_text: newQ.trim(),
        question_order: questions.length + 1,
        is_required: true,
        score_weight: 10,
      });
      toast.success('Pergunta adicionada!');
      setNewQ('');
      onReload();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      await deleteCrmAgentQuestion(id);
      toast.success('Removida!');
      onReload();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  const updateQuestion = async (id: string, field: string, value: any) => {
    try {
      await updateCrmAgentQuestion(id, { [field]: value });
      onReload();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  const agentLabels: Record<string, string> = {
    sdr: 'qualificação do lead',
    sales: 'fechamento de venda',
    recovery: 'reengajamento do lead',
    support: 'suporte ao cliente',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <p className="text-xs text-muted-foreground">
          Defina as perguntas que o agente <strong>deve fazer obrigatoriamente</strong> para {agentLabels[agentType] || 'atender o lead'}.
          O sistema calculará um score baseado nas respostas.
        </p>
      </div>

      {/* Add new */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <Label className="text-sm font-semibold">Nova Pergunta</Label>
          <div className="flex gap-2">
            <Input
              value={newQ}
              onChange={e => setNewQ(e.target.value)}
              placeholder="Ex: Qual é o faturamento mensal da empresa?"
              className="text-sm"
              onKeyDown={e => e.key === 'Enter' && addQuestion()}
            />
            <Button onClick={addQuestion} disabled={saving || !newQ.trim()} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions list */}
      <div className="space-y-2">
        {questions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma pergunta cadastrada. Adicione acima.
          </div>
        )}
        {questions.map((q, i) => (
          <Card key={q.id || i} className="border-border/60">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium flex-1">{i + 1}. {q.question_text}</p>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => q.id && deleteQuestion(q.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={q.is_required}
                        onCheckedChange={v => q.id && updateQuestion(q.id, 'is_required', v)}
                        className="scale-75"
                      />
                      <Label className="text-xs">Obrigatória</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Peso no score:</Label>
                      <Badge variant="secondary" className="text-xs">{q.score_weight}pts</Badge>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-5 w-5 text-xs"
                          onClick={() => q.id && updateQuestion(q.id, 'score_weight', Math.max(0, (q.score_weight || 10) - 5))}>-</Button>
                        <Button variant="outline" size="icon" className="h-5 w-5 text-xs"
                          onClick={() => q.id && updateQuestion(q.id, 'score_weight', Math.min(50, (q.score_weight || 10) + 5))}>+</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
