import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Eye, EyeOff, Save, Copy, Users, Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- Staff Credentials ---
function StaffCredentials() {
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff-credentials'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_members')
        .select('id, full_name, email, role, is_active, login_password, has_password_login')
        .order('full_name');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, email, password }: { id: string; email: string; password: string }) => {
      const updates: any = { email: email.trim() };
      if (password.trim()) {
        updates.login_password = password.trim();
        updates.has_password_login = true;
      }
      const { error } = await supabase.from('staff_members').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-credentials'] });
      setEditId(null);
      toast.success('Credenciais salvas!');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const startEdit = (member: any) => {
    setEditId(member.id);
    setEditEmail(member.email || '');
    setEditPassword('');
  };

  const copyCredentials = (email: string, password: string, name: string) => {
    const text = `Olá ${name}!\n\nSuas credenciais de acesso:\nE-mail: ${email}\nSenha: ${password}\n\nAcesse: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    toast.success('Credenciais copiadas para a área de transferência! ✅');
  };

  const filteredStaff = (staff || []).filter(s => s.is_active && s.full_name.toLowerCase().includes(search.toLowerCase()));

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    social_media: 'Social Media',
    designer: 'Designer',
  };

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Membros da Equipe</CardTitle>
        <CardDescription>Defina e-mail e senha de acesso para cada membro</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          placeholder="Buscar membro..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-3 h-8 text-xs"
        />
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>}
          {filteredStaff.map(member => (
            <div key={member.id} className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{member.full_name}</p>
                  <Badge variant="secondary" className="text-[10px]">{roleLabels[member.role] || member.role}</Badge>
                </div>
                {editId !== member.id && (
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-muted-foreground">{member.email || '—sem e-mail—'}</p>
                    <p className="text-xs text-muted-foreground">
                      Senha: {member.login_password ? (
                        showPasswords[member.id] ? member.login_password : '••••••'
                      ) : '—não definida—'}
                    </p>
                    {member.login_password && (
                      <button onClick={() => setShowPasswords(p => ({ ...p, [member.id]: !p[member.id] }))} className="text-muted-foreground hover:text-foreground">
                        {showPasswords[member.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {editId === member.id ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    className="w-48 h-8 text-xs"
                    placeholder="E-mail"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                  />
                  <Input
                    className="w-36 h-8 text-xs"
                    placeholder="Nova senha"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    disabled={!editEmail.trim()}
                    onClick={() => saveMutation.mutate({ id: member.id, email: editEmail, password: editPassword })}
                  >
                    <Save className="h-3 w-3 mr-1" /> Salvar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditId(null)}>Cancelar</Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => startEdit(member)}>
                    Editar
                  </Button>
                  {member.email && member.login_password && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => copyCredentials(member.email!, member.login_password, member.full_name)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
          {filteredStaff.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {search ? 'Nenhum resultado encontrado.' : 'Nenhum membro ativo.'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Client Credentials ---
function ClientCredentials() {
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const { data: clients, isLoading } = useQuery({
    queryKey: ['client-credentials'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, email, portal_password, is_active')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, email, password }: { id: string; email: string; password: string }) => {
      const updates: any = {};
      if (email.trim()) updates.email = email.trim();
      if (password.trim()) updates.portal_password = password.trim();
      const { error } = await supabase.from('clients').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-credentials'] });
      setEditId(null);
      toast.success('Credenciais do cliente salvas!');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const startEdit = (client: any) => {
    setEditId(client.id);
    setEditEmail(client.email || '');
    setEditPassword('');
  };

  const copyCredentials = (email: string, password: string, name: string) => {
    const text = `Olá ${name}!\n\nSuas credenciais do portal:\nE-mail: ${email}\nSenha: ${password}\n\nAcesse: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    toast.success('Credenciais copiadas para a área de transferência! ✅');
  };

  const filteredClients = (clients || []).filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Clientes</CardTitle>
        <CardDescription>Defina e-mail e senha de acesso ao portal para cada cliente</CardDescription>
      </CardHeader>
      <CardContent>
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-3 h-8 text-xs"
        />
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>}
          {filteredClients.map(client => (
            <div key={client.id} className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{client.name}</p>
                {editId !== client.id && (
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-muted-foreground">{client.email || '—sem e-mail—'}</p>
                    <p className="text-xs text-muted-foreground">
                      Senha: {client.portal_password ? (
                        showPasswords[client.id] ? client.portal_password : '••••••'
                      ) : '—não definida—'}
                    </p>
                    {client.portal_password && (
                      <button onClick={() => setShowPasswords(p => ({ ...p, [client.id]: !p[client.id] }))} className="text-muted-foreground hover:text-foreground">
                        {showPasswords[client.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {editId === client.id ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    className="w-48 h-8 text-xs"
                    placeholder="E-mail"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                  />
                  <Input
                    className="w-36 h-8 text-xs"
                    placeholder="Nova senha"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    disabled={!editEmail.trim() && !editPassword.trim()}
                    onClick={() => saveMutation.mutate({ id: client.id, email: editEmail, password: editPassword })}
                  >
                    <Save className="h-3 w-3 mr-1" /> Salvar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditId(null)}>Cancelar</Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => startEdit(client)}>
                    Editar
                  </Button>
                  {client.email && client.portal_password && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => copyCredentials(client.email!, client.portal_password!, client.name)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
          {filteredClients.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {search ? 'Nenhum resultado encontrado.' : 'Nenhum cliente ativo.'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Credentials Panel ---
export default function CredentialsPanel() {
  return (
    <Tabs defaultValue="staff" className="space-y-4">
      <TabsList>
        <TabsTrigger value="staff" className="flex items-center gap-1.5 text-xs">
          <Users className="h-3.5 w-3.5" />
          <span>Membros</span>
        </TabsTrigger>
        <TabsTrigger value="clients" className="flex items-center gap-1.5 text-xs">
          <Building2 className="h-3.5 w-3.5" />
          <span>Clientes</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="staff">
        <StaffCredentials />
      </TabsContent>
      <TabsContent value="clients">
        <ClientCredentials />
      </TabsContent>
    </Tabs>
  );
}
