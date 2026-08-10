import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Pencil, Trash2, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  clientId: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role_label: string;
  is_active: boolean;
  max_active_leads: number;
  login_password: string | null;
}

const ROLE_OPTIONS = [
  { value: 'sdr', label: 'SDR (Pré-venda)' },
  { value: 'closer', label: 'Closer (Fechamento)' },
  { value: 'gerente', label: 'Gerente Comercial' },
  { value: 'suporte', label: 'Suporte' },
  { value: 'atendente', label: 'Atendente' },
];

export default function CrmTeamMembers({ clientId }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assignmentMode, setAssignmentMode] = useState('manual');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role_label: 'vendedor', max_active_leads: 50, login_password: '' });

  useEffect(() => { loadMembers(); loadAssignmentMode(); }, [clientId]);

  const loadMembers = async () => {
    const { data } = await supabase.from('crm_team_members').select('*').eq('client_id', clientId).order('created_at');
    setMembers((data || []) as TeamMember[]);
  };

  const loadAssignmentMode = async () => {
    const { data } = await supabase.from('clients').select('crm_assignment_mode').eq('id', clientId).single();
    if (data?.crm_assignment_mode) setAssignmentMode(data.crm_assignment_mode);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', role_label: 'vendedor', max_active_leads: 50, login_password: '' });
    setDialogOpen(true);
  };

  const openEdit = (mem: TeamMember) => {
    setEditing(mem);
    setForm({
      name: mem.name, email: mem.email || '', phone: mem.phone || '',
      role_label: mem.role_label, max_active_leads: mem.max_active_leads,
      login_password: mem.login_password || '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    const payload = {
      client_id: clientId, name: form.name.trim(),
      email: form.email.trim() || null, phone: form.phone.trim() || null,
      role_label: form.role_label, max_active_leads: form.max_active_leads,
      login_password: form.login_password.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from('crm_team_members').update(payload).eq('id', editing.id);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Membro atualizado!');
    } else {
      const { error } = await supabase.from('crm_team_members').insert(payload);
      if (error) { toast.error('Erro ao criar'); return; }
      toast.success('Membro adicionado!');
    }
    setDialogOpen(false);
    loadMembers();
  };

  const toggleActive = async (mem: TeamMember) => {
    await supabase.from('crm_team_members').update({ is_active: !mem.is_active }).eq('id', mem.id);
    loadMembers();
  };

  const deleteMember = async (id: string) => {
    if (!confirm('Remover este membro?')) return;
    await supabase.from('crm_team_members').delete().eq('id', id);
    toast.success('Membro removido');
    loadMembers();
  };

  const updateAssignmentMode = async (mode: string) => {
    setAssignmentMode(mode);
    await supabase.from('clients').update({ crm_assignment_mode: mode } as any).eq('id', clientId);
    toast.success('Modo de atribuição atualizado');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Equipe de Atendimento</h3>
          <Badge variant="outline" className="text-xs">{members.filter(m => m.is_active).length} ativos</Badge>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <UserPlus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>

      {/* Assignment mode */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-xs font-medium shrink-0">Modo de Atribuição:</Label>
            <Select value={assignmentMode} onValueChange={updateAssignmentMode}>
              <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
                <SelectItem value="capacity">Por Capacidade</SelectItem>
                <SelectItem value="flow">Via Fluxo</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground">
              {assignmentMode === 'manual' && 'Atribuição manual com sugestão inteligente'}
              {assignmentMode === 'round_robin' && 'Distribui leads igualmente entre membros'}
              {assignmentMode === 'capacity' && 'Atribui ao membro com menos leads ativos'}
              {assignmentMode === 'flow' && 'Atribuição definida no construtor de fluxos'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Members list */}
      <div className="grid gap-3">
        {members.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Nenhum membro cadastrado. Adicione membros da equipe para multi-atendimento.</CardContent></Card>
        ) : members.map(mem => (
          <Card key={mem.id} className={!mem.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{mem.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{mem.name}</span>
                  <Badge variant="outline" className="text-[10px]">{mem.role_label}</Badge>
                  {!mem.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                </div>
                <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
                  {mem.email && <span>{mem.email}</span>}
                  {mem.phone && <span>{mem.phone}</span>}
                  <span>Máx: {mem.max_active_leads} leads</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Switch checked={mem.is_active} onCheckedChange={() => toggleActive(mem)} />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(mem)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMember(mem.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Membro' : 'Novo Membro'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">E-mail</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label className="text-xs">Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Função</Label>
                <Select value={form.role_label} onValueChange={v => setForm(f => ({ ...f, role_label: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Máx. Leads Ativos</Label><Input type="number" value={form.max_active_leads} onChange={e => setForm(f => ({ ...f, max_active_leads: Number(e.target.value) }))} /></div>
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Shield className="h-3 w-3" /> Senha de Acesso</Label>
              <Input type="password" value={form.login_password} onChange={e => setForm(f => ({ ...f, login_password: e.target.value }))} placeholder="Opcional - para acesso ao chat" />
            </div>
            <Button className="w-full" onClick={save}>{editing ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
