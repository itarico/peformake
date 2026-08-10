import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { toast } from 'sonner';
import { Plus, Pencil, Loader2, Users, Trash2, Mail, Phone, Lock, Eye, EyeOff, Globe, Briefcase, DollarSign } from 'lucide-react';
import { VList } from 'virtua';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { AppRole } from '@/types/database';
import { ImageUpload } from '@/components/ImageUpload';

interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: AppRole;
  roles: AppRole[];
  cost_per_art: number;
  monthly_cost: number | null;
  base_salary_percent: number | null;
  performance_salary_percent: number | null;
  payment_split_fixed: number | null;
  is_active: boolean;
  has_password_login: boolean;
  login_password: string | null;
  max_hours_per_art: number | null;
  avatar_url: string | null;
  job_title: string | null;
  show_on_landing: boolean;
  entity: 'peformake' | 'ellcazo';
}

export default function Team() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'designer' as AppRole,
    selectedRoles: ['designer'] as AppRole[],
    cost_per_art: '',
    monthly_cost: '',
    base_salary_percent: '60',
    performance_salary_percent: '40',
    login_password: '',
    max_hours_per_art: '48',
    avatar_url: '',
    job_title: '',
    show_on_landing: false,
    entity: 'peformake' as 'peformake' | 'ellcazo',
  });

  const { data: staffMembers, isLoading } = useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return data as StaffMember[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const primaryRole = data.selectedRoles[0] || data.role;
      const { data: staffData, error: staffError } = await supabase
        .from('staff_members')
        .insert({
          full_name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
          role: primaryRole,
          roles: data.selectedRoles,
          cost_per_art: parseFloat(data.cost_per_art) || 0,
          monthly_cost: parseFloat(data.monthly_cost) || 0,
          base_salary_percent: parseFloat(data.base_salary_percent) || 60,
          performance_salary_percent: parseFloat(data.performance_salary_percent) || 40,
          has_password_login: true,
          login_password: data.login_password,
          max_hours_per_art: data.selectedRoles.includes('designer') ? (parseInt(data.max_hours_per_art) || 48) : null,
          avatar_url: data.avatar_url || null,
          job_title: data.job_title || null,
          show_on_landing: data.show_on_landing,
          entity: data.entity,
        } as any)
        .select()
        .single();

      if (staffError) throw staffError;

      if (data.selectedRoles.includes('designer')) {
        await supabase.from('designers').insert({
          name: data.full_name,
          email: data.email || `${data.full_name.toLowerCase().replace(/\s+/g, '.')}@temp.com`,
          phone: data.phone || null,
          cost_per_art: parseFloat(data.cost_per_art) || 0,
          staff_member_id: staffData.id,
        });
      }

      // Audiovisual specific logic removed due to schema constraints
      // Standard staff_members table handles most roles directly now

      return staffData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      queryClient.invalidateQueries({ queryKey: ['designers'] });
      toast.success('Membro da equipe cadastrado!');
      resetForm();
    },
    onError: (error: any) => {
      if (error.message.includes('unique')) {
        toast.error('Já existe um membro com este nome');
      } else {
        toast.error('Erro ao cadastrar: ' + error.message);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const primaryRole = data.selectedRoles[0] || data.role;
      const { error } = await supabase
        .from('staff_members')
        .update({
          full_name: data.full_name,
          email: data.email || null,
          phone: data.phone || null,
          role: primaryRole,
          roles: data.selectedRoles,
          cost_per_art: parseFloat(data.cost_per_art) || 0,
          monthly_cost: parseFloat(data.monthly_cost) || 0,
          base_salary_percent: parseFloat(data.base_salary_percent) || 60,
          performance_salary_percent: parseFloat(data.performance_salary_percent) || 40,
          has_password_login: true,
          login_password: data.login_password,
          max_hours_per_art: data.selectedRoles.includes('designer') ? (parseInt(data.max_hours_per_art) || 48) : null,
          avatar_url: data.avatar_url || null,
          job_title: data.job_title || null,
          show_on_landing: data.show_on_landing,
          entity: data.entity,
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast.success('Membro atualizado!');
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('staff_members').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('clients').update({ social_media_staff_id: null }).eq('social_media_staff_id', id);
      await supabase.from('clients').update({ admin_staff_id: null } as any).eq('admin_staff_id', id);
      await supabase.from('designers').delete().eq('staff_member_id', id);
      const { error } = await supabase.from('staff_members').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      queryClient.invalidateQueries({ queryKey: ['designers'] });
      toast.success('Membro excluído com sucesso!');
    },
    onError: (error: any) => toast.error('Erro ao excluir: ' + error.message),
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const resetForm = () => {
    setFormData({ 
      full_name: '', email: '', phone: '', role: 'designer', 
      selectedRoles: ['designer'], cost_per_art: '', monthly_cost: '', 
      base_salary_percent: '60', performance_salary_percent: '40',
      login_password: '', max_hours_per_art: '48', avatar_url: '', 
      job_title: '', show_on_landing: false, entity: 'peformake' 
    });
    setShowPassword(false);
    setEditingMember(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (member: StaffMember) => {
    setEditingMember(member);
    setShowPassword(false);
    setFormData({
      full_name: member.full_name,
      email: member.email || '',
      phone: member.phone || '',
      role: member.role,
      selectedRoles: member.roles && member.roles.length > 0 ? member.roles : [member.role],
      cost_per_art: (member.cost_per_art || 0).toString(),
      monthly_cost: (member.monthly_cost || 0).toString(),
      base_salary_percent: (member.base_salary_percent || 60).toString(),
      performance_salary_percent: (member.performance_salary_percent || 40).toString(),
      login_password: member.login_password || '',
      max_hours_per_art: (member.max_hours_per_art || 48).toString(),
      avatar_url: member.avatar_url || '',
      job_title: member.job_title || '',
      show_on_landing: member.show_on_landing || false,
      entity: member.entity || 'peformake',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name) { toast.error('Nome é obrigatório'); return; }
    if (!formData.email) { toast.error('E-mail é obrigatório para login'); return; }
    if (!formData.login_password) { toast.error('Senha é obrigatória para login'); return; }
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getRoleLabel = (role: AppRole) => {
    const labels: Record<string, string> = { 
      admin: 'Administrador', 
      social_media: 'Social Media', 
      designer: 'Designer',
      traffic: 'Tráfego',
      sdr: 'SDR',
      leader: 'Head de Marketing',
      videomaker: 'Videomaker',
      editor: 'Editor',
      closer: 'Closer'
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = { 
      admin: 'default', 
      social_media: 'secondary', 
      designer: 'outline',
      traffic: 'secondary',
      sdr: 'outline',
      leader: 'default',
      videomaker: 'secondary',
      editor: 'outline',
      closer: 'default'
    };
    return variants[role] || 'outline';
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="hidden lg:block">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Equipe</h1>
          <p className="text-sm text-muted-foreground">Gerencie membros, contatos e acessos ao sistema.</p>
        </div>


        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Membro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMember ? 'Editar Membro' : 'Novo Membro da Equipe'}</DialogTitle>
              <DialogDescription>
                {editingMember ? 'Atualize as informações e credenciais de acesso.' : 'Cadastre um novo membro com dados de contato e acesso ao sistema.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                    <TabsTrigger value="roles">Funções</TabsTrigger>
                    <TabsTrigger value="finance">Financeiro & Acesso</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="w-full md:w-1/3 space-y-2">
                        <Label className="text-xs">Foto de Perfil</Label>
                        <ImageUpload
                          key={editingMember?.id || 'new-team-member'}
                          bucket="avatars"
                          folder={editingMember?.id || 'team-members'}
                          currentUrl={formData.avatar_url || undefined}
                          onUpload={(url) => setFormData((prev) => ({ ...prev, avatar_url: url }))}
                          onRemove={() => setFormData((prev) => ({ ...prev, avatar_url: '' }))}
                        />
                      </div>
                      
                      <div className="flex-1 w-full space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Nome Completo *</Label>
                          <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Nome e sobrenome" required autoFocus />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="job_title">Cargo / Título</Label>
                            <Input id="job_title" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} placeholder="Ex: Social Media Manager" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">WhatsApp</Label>
                            <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="entity">Operação Principal</Label>
                        <Select value={formData.entity} onValueChange={(v: any) => setFormData({ ...formData, entity: v })}>
                          <SelectTrigger id="entity"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="peformake">Peformake</SelectItem>
                            <SelectItem value="ellcazo">Ellcazo (Audiovisual)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 self-end h-[42px]">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-1.5 text-xs"><Globe className="h-3 w-3" /> Exibir no Site</Label>
                        </div>
                        <Switch checked={formData.show_on_landing} onCheckedChange={(v) => setFormData({ ...formData, show_on_landing: v })} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="roles" className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg border p-3 bg-muted/20">
                      {([
                        ['admin', 'Admin'], 
                        ['social_media', 'Social Media'], 
                        ['designer', 'Designer'], 
                        ['traffic', 'Tráfego'], 
                        ['sdr', 'SDR'],
                        ['closer', 'Closer'],
                        ['videomaker', 'Video'], 
                        ['editor', 'Editor'], 
                        ['leader', 'Head de Marketing']
                      ] as const).map(([value, label]) => (
                        <div key={value} className="flex items-center gap-2 hover:bg-muted/50 p-2 rounded transition-colors border border-transparent hover:border-border">
                          <Checkbox
                            id={`role-${value}`}
                            checked={formData.selectedRoles.includes(value as any)}
                            onCheckedChange={(checked) => {
                              setFormData((prev) => {
                                const next = checked
                                  ? [...prev.selectedRoles, value as AppRole]
                                  : prev.selectedRoles.filter((r) => r !== value);
                                return { ...prev, selectedRoles: next.length > 0 ? next : [value as AppRole], role: next[0] || (value as AppRole) };
                              });
                            }}
                          />
                          <Label htmlFor={`role-${value}`} className="text-xs font-semibold cursor-pointer flex-1">{label}</Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="finance" className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b pb-1">
                        <DollarSign className="h-3.5 w-3.5 text-primary" />
                        <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Configurações Financeiras</h4>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="monthly_cost" className="text-[10px]">Salário Fixo (R$)</Label>
                          <Input id="monthly_cost" type="number" step="0.01" value={formData.monthly_cost} onChange={(e) => setFormData({ ...formData, monthly_cost: e.target.value })} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="base_salary_percent" className="text-[10px]">Meta Fixa (%)</Label>
                          <Input id="base_salary_percent" type="number" value={formData.base_salary_percent} onChange={(e) => setFormData({ ...formData, base_salary_percent: e.target.value })} className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="performance_salary_percent" className="text-[10px]">Meta Variável (%)</Label>
                          <Input id="performance_salary_percent" type="number" value={formData.performance_salary_percent} onChange={(e) => setFormData({ ...formData, performance_salary_percent: e.target.value })} className="h-8 text-xs" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b pb-1">
                        <Lock className="h-3.5 w-3.5 text-primary" />
                        <h4 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Credenciais</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-[10px]">E-mail de Login *</Label>
                          <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-8 text-xs" required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="password" className="text-[10px]">Senha *</Label>
                          <div className="relative">
                            <Input id="password" type={showPassword ? 'text' : 'password'} value={formData.login_password} onChange={(e) => setFormData({ ...formData, login_password: e.target.value })} className="h-8 text-xs pr-8" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"><Eye className="h-3 w-3" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingMember ? 'Salvar Alterações' : 'Cadastrar Membro'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membros da Equipe</CardTitle>
          <CardDescription>{staffMembers?.length || 0} membro(s) cadastrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : staffMembers?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum membro cadastrado</h3>
              <p className="text-sm text-muted-foreground mt-1">Cadastre o primeiro membro da equipe</p>
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden h-[calc(100vh-350px)] min-h-[400px]">
                <VList className="space-y-4 pr-2">
                  {staffMembers?.map((member) => (
                    <Card key={member.id} className="p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <OptimizedAvatar 
                          src={member.avatar_url || undefined} 
                          fallback={member.full_name} 
                          className="h-10 w-10 shrink-0 border" 
                          size="md" 
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{member.full_name}</span>
                            {(member.roles && member.roles.length > 0 ? member.roles : [member.role]).map((r) => (
                              <Badge key={r} variant={getRoleBadgeVariant(r as AppRole)} className="text-xs">{getRoleLabel(r as AppRole)}</Badge>
                            ))}
                            {member.show_on_landing && <Badge variant="outline" className="text-xs">No site</Badge>}
                          </div>
                          {member.job_title && <p className="text-xs text-muted-foreground">{member.job_title}</p>}
                          <div className="text-sm text-muted-foreground space-y-0.5">
                            {member.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{member.email}</p>}
                            {member.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{member.phone}</p>}
                          </div>
                          {/* Custo/Arte removido conforme solicitação */}
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant={member.is_active ? 'default' : 'secondary'} className="cursor-pointer text-[10px]" onClick={() => toggleActiveMutation.mutate({ id: member.id, is_active: !member.is_active })}>
                            {member.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => handleEdit(member)}
                            aria-label={`Editar ${member.full_name}`}
                            title="Editar membro"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                aria-label={`Excluir ${member.full_name}`}
                                title="Excluir membro"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Membro</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja excluir "{member.full_name}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </Card>
                  ))}
                </VList>
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                       <TableHead>Site</TableHead>
                      <TableHead>Contato</TableHead>
                      {/* Coluna Custo/Arte removida */}
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffMembers?.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <OptimizedAvatar 
                              src={member.avatar_url || undefined} 
                              fallback={member.full_name} 
                              className="h-8 w-8 border" 
                              size="sm" 
                            />
                            <div>
                              <div>{member.full_name}</div>
                              {member.job_title && <div className="text-xs font-normal text-muted-foreground">{member.job_title}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(member.roles && member.roles.length > 0 ? member.roles : [member.role]).map((r) => (
                              <Badge key={r} variant={getRoleBadgeVariant(r as AppRole)}>{getRoleLabel(r as AppRole)}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.show_on_landing ? 'default' : 'outline'}>
                            {member.show_on_landing ? 'Ativo' : 'Oculto'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-0.5">
                            {member.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" />{member.email}</p>}
                            {member.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{member.phone}</p>}
                            {member.email && member.login_password && <Badge variant="secondary" className="text-[10px] mt-1">Credenciais ok</Badge>}
                            {!member.email && !member.phone && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        {/* Célula Custo/Arte removida */}
                        <TableCell>
                          <Badge variant={member.is_active ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleActiveMutation.mutate({ id: member.id, is_active: !member.is_active })}>
                            {member.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(member)}><Pencil className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Membro</AlertDialogTitle>
                                  <AlertDialogDescription>Tem certeza que deseja excluir "{member.full_name}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
