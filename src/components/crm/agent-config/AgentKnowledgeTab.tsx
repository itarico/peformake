import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, BookOpen, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { addCrmAgentKnowledge, deleteCrmAgentKnowledge } from '@/lib/crmConfigManager';

interface KnowledgeItem {
  id?: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
}

interface Props {
  clientId: string;
  agentType?: string;
  items: KnowledgeItem[];
  crisisKeywords: string;
  onChangeField: (field: string, value: any) => void;
  onReload: () => void;
}

const CATEGORIES = ['geral', 'entrega', 'garantia', 'pagamento', 'troca', 'política', 'técnico'];

export default function AgentKnowledgeTab({ clientId, agentType = 'support', items, crisisKeywords, onChangeField, onReload }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ question: '', answer: '', category: 'geral' });

  const addItem = async () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    try {
      await addCrmAgentKnowledge(clientId, agentType, {
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category,
        is_active: true,
      });
      toast.success('Adicionado!');
      setForm({ question: '', answer: '', category: 'geral' });
      onReload();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteCrmAgentKnowledge(id);
      toast.success('Removido!');
      onReload();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    }
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, KnowledgeItem[]>);

  return (
    <div className="space-y-4">
      {/* Crisis Keywords only for support */}
      {agentType === 'support' && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <Label className="text-sm font-semibold text-destructive">Palavras de Crise</Label>
            </div>
            <Input
              value={crisisKeywords}
              onChange={e => onChangeField('crisis_keywords', e.target.value)}
              placeholder="cancelamento,reclamação,procon,processar,reembolso"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">Separe por vírgula.</p>
          </CardContent>
        </Card>
      )}

      {/* Add FAQ */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Adicionar FAQ</Label>
          </div>
          <div className="space-y-2">
            <Input
              value={form.question}
              onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
              placeholder="Pergunta frequente do cliente..."
              className="text-sm"
            />
            <Textarea
              value={form.answer}
              onChange={e => setForm(p => ({ ...p, answer: e.target.value }))}
              placeholder="Resposta padrão do agente..."
              className="text-sm resize-none min-h-[80px]"
            />
            <div className="flex gap-2 items-center">
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="flex-1 text-sm border border-input rounded-md px-3 py-2 bg-background"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Button onClick={addItem} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ list grouped */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat}>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="capitalize text-xs">{cat}</Badge>
            <span className="text-xs text-muted-foreground">{catItems.length} item(s)</span>
          </div>
          <div className="space-y-2">
            {catItems.map((item, i) => (
              <Card key={item.id || i} className="border-border/50">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">❓ {item.question}</p>
                      <p className="text-xs text-muted-foreground">💬 {item.answer}</p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      onClick={() => item.id && deleteItem(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum FAQ cadastrado para este agente. Adicione acima para treinar.
        </div>
      )}
    </div>
  );
}
