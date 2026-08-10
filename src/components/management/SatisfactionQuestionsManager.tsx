import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

const SERVICES = [
  { value: 'geral', label: 'Geral' },
  { value: 'design', label: 'Design' },
  { value: 'traffic', label: 'Tráfego Pago' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'consulting', label: 'Consultoria' },
  { value: 'audiovisual', label: 'Audiovisual' },
];

interface Q { id: string; question: string; service: string; display_order: number; is_active: boolean; }

export default function SatisfactionQuestionsManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<Q[]>([]);
  const [newQ, setNewQ] = useState('');
  const [newService, setNewService] = useState('geral');

  const load = async () => {
    const { data } = await supabase
      .from('satisfaction_questions')
      .select('*')
      .order('service').order('display_order');
    setItems((data as Q[]) || []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newQ.trim()) return;
    const order = items.filter(i => i.service === newService).length + 1;
    await supabase.from('satisfaction_questions').insert({ question: newQ, service: newService, display_order: order });
    setNewQ('');
    toast({ title: 'Pergunta adicionada' });
    load();
  };

  const toggleActive = async (q: Q) => {
    await supabase.from('satisfaction_questions').update({ is_active: !q.is_active }).eq('id', q.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover pergunta?')) return;
    await supabase.from('satisfaction_questions').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Label className="text-sm font-semibold">Nova pergunta</Label>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
            <Input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="Ex: A qualidade das artes está ok?" />
            <Select value={newService} onValueChange={setNewService}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      {SERVICES.map(svc => {
        const filtered = items.filter(i => i.service === svc.value);
        if (filtered.length === 0) return null;
        return (
          <div key={svc.value} className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground">{svc.label}</h3>
            {filtered.map(q => (
              <Card key={q.id}>
                <CardContent className="py-3 flex items-center gap-3">
                  <Switch checked={q.is_active} onCheckedChange={() => toggleActive(q)} />
                  <span className={`flex-1 text-sm ${!q.is_active && 'text-muted-foreground line-through'}`}>{q.question}</span>
                  <Badge variant="outline" className="text-xs">#{q.display_order}</Badge>
                  <Button size="icon" variant="ghost" onClick={() => remove(q.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
}
