/**
 * CrmWebhookConfig — Configuração de webhooks por cliente
 * Visual mais limpo e profissional
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Webhook, TestTube, Loader2, ExternalLink, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props { clientId: string; }

interface FlowWebhook {
  id: string; name: string; url: string;
  headers: Record<string, string>; payload_template: Record<string, any>; is_active: boolean;
}

export default function CrmWebhookConfig({ clientId }: Props) {
  const [webhooks, setWebhooks] = useState<FlowWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWh, setEditingWh] = useState<FlowWebhook | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', headers: '{}', payload_template: '{\n  "nome": "{{nome}}",\n  "telefone": "{{telefone}}",\n  "interesse": "{{interesse}}"\n}' });
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; status?: number } | null>(null);

  useEffect(() => { loadWebhooks(); }, [clientId]);

  const loadWebhooks = async () => {
    const { data } = await supabase.from('crm_flow_webhooks').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    setWebhooks((data as FlowWebhook[]) || []);
    setLoading(false);
  };

  const saveWebhook = async (isNew: boolean) => {
    try {
      const headers = JSON.parse(form.headers);
      const payload_template = JSON.parse(form.payload_template);
      if (isNew) {
        await supabase.from('crm_flow_webhooks').insert({ client_id: clientId, name: form.name, url: form.url, headers, payload_template });
      } else if (editingWh) {
        await supabase.from('crm_flow_webhooks').update({ name: form.name, url: form.url, headers, payload_template }).eq('id', editingWh.id);
      }
      toast.success(isNew ? 'Webhook criado!' : 'Webhook atualizado!');
      setShowCreate(false); setEditingWh(null); loadWebhooks();
    } catch (e: any) { toast.error('JSON inválido: ' + e.message); }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Excluir webhook?')) return;
    await supabase.from('crm_flow_webhooks').delete().eq('id', id);
    loadWebhooks(); toast.success('Webhook excluído');
  };

  const toggleWebhook = async (wh: FlowWebhook) => {
    await supabase.from('crm_flow_webhooks').update({ is_active: !wh.is_active }).eq('id', wh.id);
    loadWebhooks();
  };

  const testWebhook = async (wh: FlowWebhook) => {
    setTesting(wh.id); setTestResult(null);
    try {
      const sampleVars: Record<string, string> = { nome: 'João Teste', telefone: '81999999999', interesse: 'alto', tipo_negocio: 'Restaurante', faturamento: '50000', origem: 'simulador' };
      const payload: any = {};
      for (const [k, v] of Object.entries(wh.payload_template || {})) {
        payload[k] = typeof v === 'string' ? v.replace(/\{\{(\w+)\}\}/g, (_, key) => sampleVars[key] || `{{${key}}}`) : v;
      }
      const res = await fetch(wh.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(wh.headers || {}) }, body: JSON.stringify(payload) });
      setTestResult({ id: wh.id, ok: res.ok, status: res.status });
      toast.success(`Teste enviado! Status: ${res.status}`);
    } catch (e: any) {
      setTestResult({ id: wh.id, ok: false });
      toast.error('Erro: ' + e.message);
    }
    setTesting(null);
  };

  const openEditor = (wh?: FlowWebhook) => {
    if (wh) {
      setForm({ name: wh.name, url: wh.url, headers: JSON.stringify(wh.headers || {}, null, 2), payload_template: JSON.stringify(wh.payload_template || {}, null, 2) });
      setEditingWh(wh);
    } else {
      setForm({ name: '', url: '', headers: '{}', payload_template: '{\n  "nome": "{{nome}}",\n  "telefone": "{{telefone}}",\n  "interesse": "{{interesse}}"\n}' });
      setShowCreate(true);
    }
  };

  const isEditing = showCreate || !!editingWh;

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Webhooks</h2>
          <p className="text-xs text-muted-foreground">Envie dados coletados nos fluxos para sistemas externos</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => openEditor()}>
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : webhooks.length === 0 && !isEditing ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Webhook className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-medium">Nenhum webhook configurado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Webhooks enviam dados coletados nos fluxos para seu CRM externo, planilha ou API.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {webhooks.map(wh => {
            const result = testResult?.id === wh.id ? testResult : null;
            return (
              <Card key={wh.id} className="group hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${wh.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Webhook className={`h-5 w-5 ${wh.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{wh.name}</p>
                        <Badge variant={wh.is_active ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                          {wh.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {result && (
                          <Badge variant={result.ok ? 'default' : 'destructive'} className="text-[10px] h-4 px-1.5 gap-0.5">
                            {result.ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                            {result.status || 'Erro'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <ExternalLink className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <p className="text-[10px] text-muted-foreground truncate font-mono">{wh.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={wh.is_active} onCheckedChange={() => toggleWebhook(wh)} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => testWebhook(wh)} disabled={testing === wh.id}>
                        {testing === wh.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditor(wh)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteWebhook(wh.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor */}
      <Dialog open={isEditing} onOpenChange={() => { setShowCreate(false); setEditingWh(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWh ? 'Editar Webhook' : 'Novo Webhook'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium">Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: CRM Principal, Planilha Google" />
            </div>
            <div>
              <Label className="text-xs font-medium">URL do Webhook</Label>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://api.exemplo.com/webhook" className="font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs font-medium">Headers (JSON)</Label>
              <Textarea value={form.headers} onChange={e => setForm(f => ({ ...f, headers: e.target.value }))} rows={2} className="font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs font-medium">
                Payload Template <span className="text-muted-foreground">(use {"{{variavel}}"} para dados dinâmicos)</span>
              </Label>
              <Textarea value={form.payload_template} onChange={e => setForm(f => ({ ...f, payload_template: e.target.value }))} rows={6} className="font-mono text-xs" />
              <p className="text-[10px] text-muted-foreground mt-1">
                Variáveis disponíveis: nome, telefone, email, interesse, cidade, empresa, faturamento
              </p>
            </div>
            <Button onClick={() => saveWebhook(!editingWh)} className="w-full" disabled={!form.name.trim() || !form.url.trim()}>
              {editingWh ? 'Salvar Alterações' : 'Criar Webhook'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
