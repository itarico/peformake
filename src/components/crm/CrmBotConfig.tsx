import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Save, Clock, Loader2, Info, UserCheck, ShieldAlert, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { saveCrmBotConfig } from '@/lib/crmConfigManager';

interface Props {
  clientId: string;
  clientName: string;
}

interface BotRule {
  id: string;
  condition: string;
  action: string;
  value: string;
}

const PERSONA_PRESETS = [
  { label: 'Assistente de Vendas', value: 'Assistente de Vendas Profissional e Simpático' },
  { label: 'Consultor', value: 'Consultor Especialista no Segmento' },
  { label: 'Atendente', value: 'Atendente Virtual Educado e Prestativo' },
  { label: 'Personalizado', value: '' },
];

const RULE_CONDITIONS = [
  { value: 'keyword_detected', label: 'Palavra-chave detectada' },
  { value: 'no_response_minutes', label: 'Sem resposta por X minutos' },
  { value: 'lead_status_is', label: 'Status do lead é' },
  { value: 'message_count_above', label: 'Nº de mensagens acima de' },
  { value: 'outside_business_hours', label: 'Fora do horário comercial' },
];

const RULE_ACTIONS = [
  { value: 'pause_bot', label: 'Pausar bot' },
  { value: 'activate_bot', label: 'Ativar bot' },
  { value: 'move_stage', label: 'Mover estágio do lead' },
  { value: 'send_notification', label: 'Enviar notificação' },
  { value: 'add_tag', label: 'Adicionar etiqueta' },
];

export default function CrmBotConfig({ clientId, clientName }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isEnabled, setIsEnabled] = useState(false);
  const [autoRespondOnNew, setAutoRespondOnNew] = useState(true);
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [businessHoursStart, setBusinessHoursStart] = useState('08:00');
  const [businessHoursEnd, setBusinessHoursEnd] = useState('18:00');
  const [persona, setPersona] = useState('Assistente de Vendas Profissional e Simpático');
  const [instructions, setInstructions] = useState('');
  const [humanTakeoverMinutes, setHumanTakeoverMinutes] = useState(30);
  const [botRules, setBotRules] = useState<BotRule[]>([]);

  useEffect(() => { loadConfig(); }, [clientId]);

  const loadConfig = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('crm_bot_configs')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    if (data) {
      setIsEnabled(data.is_enabled);
      setAutoRespondOnNew(data.auto_respond_on_new);
      setBusinessHoursOnly(data.business_hours_only);
      setBusinessHoursStart(data.business_hours_start || '08:00');
      setBusinessHoursEnd(data.business_hours_end || '18:00');
      setPersona(data.persona || 'Assistente de Vendas Profissional e Simpático');
      setInstructions(data.instructions || '');
      setHumanTakeoverMinutes((data as any).human_takeover_minutes ?? 30);
      setBotRules(((data as any).bot_rules as BotRule[]) || []);
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    const upsertData = {
      client_id: clientId,
      is_enabled: isEnabled,
      auto_respond_on_new: autoRespondOnNew,
      business_hours_only: businessHoursOnly,
      business_hours_start: businessHoursOnly ? businessHoursStart : null,
      business_hours_end: businessHoursOnly ? businessHoursEnd : null,
      persona,
      instructions: instructions || null,
      human_takeover_minutes: humanTakeoverMinutes,
      bot_rules: botRules,
    };

    try {
      await saveCrmBotConfig(clientId, upsertData);
      toast.success('Configurações do bot salvas!');
      await loadConfig();
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    setBotRules(prev => [...prev, {
      id: crypto.randomUUID(),
      condition: 'keyword_detected',
      action: 'pause_bot',
      value: '',
    }]);
  };

  const updateRule = (id: string, field: keyof BotRule, val: string) => {
    setBotRules(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const removeRule = (id: string) => {
    setBotRules(prev => prev.filter(r => r.id !== id));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Enable/Disable */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Bot de Resposta Automática (IA)</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              <Badge variant={isEnabled ? 'default' : 'secondary'}>
                {isEnabled ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Quando ativo, o bot responde automaticamente mensagens recebidas no WhatsApp deste cliente.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Human Takeover Control */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-semibold">Controle de Intervenção Humana</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Quando um humano responde manualmente no chat, o bot fica inativo pelo tempo configurado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Tempo de inatividade do bot após resposta humana</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={1440}
                value={humanTakeoverMinutes}
                onChange={e => setHumanTakeoverMinutes(parseInt(e.target.value) || 0)}
                className="text-sm w-24"
              />
              <span className="text-sm text-muted-foreground">minutos</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              0 = bot volta imediatamente | 30 = padrão | 1440 = 24 horas
            </p>
          </div>
          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Ao pausar um lead individualmente no chat, o bot não responde independente desta configuração.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Persona */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Persona do Bot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PERSONA_PRESETS.filter(p => p.value).map(preset => (
              <button key={preset.label} onClick={() => setPersona(preset.value)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  persona === preset.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                }`}>
                {preset.label}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nome/papel do bot</Label>
            <Input value={persona} onChange={e => setPersona(e.target.value)}
              placeholder="Ex: Consultora de Beleza da Loja X" className="text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Instruções Especiais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              O bot tem acesso automático aos produtos, histórico e segmento. Use para instruções extras.
            </p>
          </div>
          <Textarea value={instructions} onChange={e => setInstructions(e.target.value)}
            placeholder="Ex: Sempre ofereça 10% de desconto na primeira compra."
            className="text-sm resize-none min-h-[80px]" />
        </CardContent>
      </Card>

      {/* Bot Rules */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Regras de Automação</CardTitle>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addRule}>
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
          </div>
          <CardDescription className="text-xs">
            Defina condições que acionam ações automáticas do bot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {botRules.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhuma regra configurada.</p>
          ) : (
            botRules.map(rule => (
              <div key={rule.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Se</Label>
                    <Select value={rule.condition} onValueChange={v => updateRule(rule.id, 'condition', v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase">Então</Label>
                    <Select value={rule.action} onValueChange={v => updateRule(rule.id, 'action', v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 mt-4" onClick={() => removeRule(rule.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <Input value={rule.value} onChange={e => updateRule(rule.id, 'value', e.target.value)}
                  placeholder="Valor (ex: palavra-chave, minutos, status...)" className="text-xs h-7" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Business hours */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Horário de Atendimento</CardTitle>
            </div>
            <Switch checked={businessHoursOnly} onCheckedChange={setBusinessHoursOnly} />
          </div>
          <CardDescription className="text-xs">
            {businessHoursOnly ? 'Bot responde apenas no horário configurado' : 'Bot responde 24 horas por dia'}
          </CardDescription>
        </CardHeader>
        {businessHoursOnly && (
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Início</Label>
                <Input type="time" value={businessHoursStart} onChange={e => setBusinessHoursStart(e.target.value)} className="text-sm" />
              </div>
              <span className="text-muted-foreground mt-5">até</span>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Fim</Label>
                <Input type="time" value={businessHoursEnd} onChange={e => setBusinessHoursEnd(e.target.value)} className="text-sm" />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Auto-respond on new */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Responder novos leads automaticamente</p>
              <p className="text-xs text-muted-foreground">Bot envia saudação quando um novo contato aparece</p>
            </div>
            <Switch checked={autoRespondOnNew} onCheckedChange={setAutoRespondOnNew} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar Configurações
      </Button>
    </div>
  );
}
