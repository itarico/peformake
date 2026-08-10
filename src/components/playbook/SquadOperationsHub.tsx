import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const STAGE_LABEL: Record<string, string> = {
  data_collection: 'Coleta',
  growth_class: 'Growth Class',
  feedback_call_21d: 'Feedback 21d',
  monthly_meeting: 'Reunião Mensal',
  new_implementation: 'Nova Impl.',
  quarterly_meeting: 'Trimestral',
};

interface ClientRow {
  id: string;
  name: string;
  stages: { stage_key: string; status: string; scheduled_at: string | null }[];
  done: number;
  total: number;
  overdue: number;
}

export default function SquadOperationsHub() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: clients } = await supabase
        .from('clients').select('id,name').eq('is_active', true).order('name');
      const { data: stages } = await supabase
        .from('client_journey_stages').select('client_id, stage_key, status, scheduled_at');
      const now = new Date();
      const result = (clients || []).map(c => {
        const cs = (stages || []).filter(s => s.client_id === c.id);
        const done = cs.filter(s => s.status === 'completed').length;
        const overdue = cs.filter(s => s.status !== 'completed' && s.scheduled_at && new Date(s.scheduled_at) < now).length;
        return { id: c.id, name: c.name, stages: cs, done, total: cs.length, overdue };
      });
      setRows(result);
      setLoading(false);
    })();
  }, []);

  const totalClients = rows.length;
  const fullyOnboarded = rows.filter(r => r.done >= 2).length; // coleta + growth class
  const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0);
  const avgAdherence = totalClients ? Math.round(rows.reduce((s, r) => s + (r.done / Math.max(r.total, 1)), 0) / totalClients * 100) : 0;

  if (loading) return <div className="text-center text-sm text-muted-foreground py-8">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Users className="h-3.5 w-3.5" /> Clientes Ativos</div>
          <div className="text-2xl font-bold">{totalClients}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Onboarding OK</div>
          <div className="text-2xl font-bold text-green-500">{fullyOnboarded}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Activity className="h-3.5 w-3.5 text-primary" /> Aderência Média</div>
          <div className="text-2xl font-bold text-primary">{avgAdherence}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Etapas Atrasadas</div>
          <div className="text-2xl font-bold text-red-500">{totalOverdue}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Aderência ao Playbook por Cliente</h3>
            <Link to="/playbook" className="text-xs text-primary hover:underline">Ver Playbook</Link>
          </div>
        </div>
        <div className="divide-y">
          {rows.map(r => (
            <div key={r.id} className="p-3 hover:bg-muted/20 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{r.name}</span>
                <div className="flex items-center gap-2">
                  {r.overdue > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5 bg-red-500/10 text-red-500 border-red-500/30">
                      <Clock className="h-3 w-3 mr-1" />{r.overdue} atrasadas
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{r.done}/{r.total}</span>
                </div>
              </div>
              <div className="flex gap-1">
                {r.stages.sort((a,b) => a.stage_key.localeCompare(b.stage_key)).map((s, i) => (
                  <div
                    key={i}
                    title={`${STAGE_LABEL[s.stage_key]} - ${s.status}`}
                    className={`flex-1 h-2 rounded-sm ${
                      s.status === 'completed' ? 'bg-green-500' :
                      s.status === 'in_progress' ? 'bg-blue-500' :
                      s.scheduled_at && new Date(s.scheduled_at) < new Date() ? 'bg-red-500/60' :
                      'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum cliente ativo.</div>}
        </div>
      </Card>
    </div>
  );
}
