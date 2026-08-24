import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole, Designer } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Users as UsersIcon, Shield, Pencil, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface UserWithRoles extends Profile {
  user_roles: { role: AppRole }[];
  designer?: Designer | null;
}

export default function Users() {
  const { isAdmin, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDesignerDialogOpen, setIsEditDesignerDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Designer form data
  const [designerFormData, setDesignerFormData] = useState({
    phone: '',
    cost_per_art: '',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch designers to get linked info
      const { data: designers, error: designersError } = await supabase
        .from('designers')
        .select('*');

      if (designersError) throw designersError;

      // Combine profiles with their roles and designer info
      return (profiles as Profile[]).map(profile => {
        const linkedDesigner = (designers as Designer[]).find(d => d.user_id === profile.user_id);
        return {
          ...profile,
          user_roles: (roles as { user_id: string; role: AppRole }[])
            .filter(r => r.user_id === profile.user_id)
            .map(r => ({ role: r.role })),
          designer: linkedDesigner || null,
        };
      }) as UserWithRoles[];
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      role, 
      userName,
      userEmail,
      designerData 
    }: { 
      userId: string; 
      role: AppRole; 
      userName: string;
      userEmail: string;
      designerData?: { phone: string; cost_per_art: string };
    }) => {
      // Add role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: role as any });

      if (roleError) throw roleError;

      // If designer role, create designer record linked to user
      if (role === 'designer') {
        const { error: designerError } = await supabase
          .from('designers')
          .insert({
            user_id: userId,
            name: userName,
            email: userEmail,
            phone: designerData?.phone || null,
            cost_per_art: parseFloat(designerData?.cost_per_art || '0') || 0,
          });

        if (designerError) throw designerError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Função atribuída com sucesso!');
      resetDialog();
    },
    onError: (error: any) => {
      if (error.message.includes('duplicate')) {
        toast.error('Este usuário já possui esta função');
      } else {
        toast.error('Erro ao atribuir função: ' + error.message);
      }
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;

      // If removing designer role, delete designer record
      if (role === 'designer') {
        const { error: designerError } = await supabase
          .from('designers')
          .delete()
          .eq('user_id', userId);

        if (designerError) throw designerError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Função removida!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover função: ' + error.message);
    },
  });

  const updateDesignerMutation = useMutation({
    mutationFn: async ({ designerId, data }: { designerId: string; data: typeof designerFormData }) => {
      const { error } = await supabase
        .from('designers')
        .update({
          phone: data.phone || null,
          cost_per_art: parseFloat(data.cost_per_art) || 0,
        })
        .eq('id', designerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Dados do designer atualizados!');
      setIsEditDesignerDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar designer: ' + error.message);
    },
  });

  const resetDialog = () => {
    setSelectedUser(null);
    setSelectedRole('');
    setDesignerFormData({ phone: '', cost_per_art: '' });
    setIsDialogOpen(false);
  };

  const handleAddRole = () => {
    if (!selectedUser || !selectedRole) {
      toast.error('Selecione uma função');
      return;
    }

    addRoleMutation.mutate({
      userId: selectedUser.user_id,
      role: selectedRole,
      userName: selectedUser.full_name,
      userEmail: selectedUser.email,
      designerData: selectedRole === 'designer' ? designerFormData : undefined,
    });
  };

  const handleEditDesigner = (user: UserWithRoles) => {
    setSelectedUser(user);
    setDesignerFormData({
      phone: user.designer?.phone || '',
      cost_per_art: user.designer?.cost_per_art?.toString() || '',
    });
    setIsEditDesignerDialogOpen(true);
  };

  const handleUpdateDesigner = () => {
    if (!selectedUser?.designer) return;
    updateDesignerMutation.mutate({
      designerId: selectedUser.designer.id,
      data: designerFormData,
    });
  };

  const getRoleLabel = (role: AppRole) => {
    const labels: Record<AppRole, string> = {
      admin: 'Administrador',
      social_media: 'Social Media',
      designer: 'Designer',
      traffic: 'Tráfego',
      sdr: 'SDR',
      leader: 'Líder',
      videomaker: 'Videomaker',
      editor: 'Editor',
      head_marketing: 'Head de Marketing',
      closer: 'Closer',
      traffic_manager: 'Gestor de Tráfego',
      gestor_trafego: 'Gestor de Tráfego',
      finance_ellcazo: 'Financeiro (Ellcazo)',
      ellcazo: 'Admin Ellcazo',
      audiovisual_full: 'Audiovisual (Completo)'
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    const variants: Record<AppRole, 'default' | 'secondary' | 'outline'> = {
      admin: 'default',
      social_media: 'secondary',
      designer: 'outline',
      traffic: 'secondary',
      sdr: 'outline',
      leader: 'default',
      videomaker: 'secondary',
      editor: 'outline',
      head_marketing: 'default',
      closer: 'outline',
      traffic_manager: 'secondary',
      gestor_trafego: 'secondary',
      finance_ellcazo: 'default',
      ellcazo: 'default',
      audiovisual_full: 'default'
    };
    return variants[role] || 'outline';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredUsers = (users || []).filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários e suas funções no sistema
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar usuários..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Clique em um usuário para gerenciar suas funções
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum usuário encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Os usuários aparecerão aqui após se registrarem'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Funções</TableHead>
                  <TableHead>Info Designer</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const isDesigner = user.user_roles.some(ur => ur.role === 'designer');
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.user_roles.length === 0 ? (
                            <span className="text-sm text-muted-foreground">Sem função</span>
                          ) : (
                            user.user_roles.map((ur) => (
                              <Badge
                                key={ur.role}
                                variant={getRoleBadgeVariant(ur.role)}
                                className="cursor-pointer"
                                onClick={() => {
                                  if (user.user_id !== currentUser?.id) {
                                    removeRoleMutation.mutate({
                                      userId: user.user_id,
                                      role: ur.role,
                                    });
                                  }
                                }}
                                title={user.user_id === currentUser?.id ? 'Você não pode remover sua própria função' : 'Clique para remover'}
                              >
                                {getRoleLabel(ur.role)}
                                {user.user_id !== currentUser?.id && ' ×'}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isDesigner && user.designer ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {formatCurrency(user.designer.cost_per_art)}/arte
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDesigner(user)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : isDesigner ? (
                          <span className="text-sm text-muted-foreground">Pendente</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Adicionar Função
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) resetDialog();
        setIsDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Função</DialogTitle>
            <DialogDescription>
              Atribua uma nova função para {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole === 'designer' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">Dados do Designer</p>
                <div className="space-y-2">
                  <Label htmlFor="designer-phone">Telefone</Label>
                  <Input
                    id="designer-phone"
                    value={designerFormData.phone}
                    onChange={(e) => setDesignerFormData({ ...designerFormData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designer-cost">Custo por Arte (R$)</Label>
                  <Input
                    id="designer-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={designerFormData.cost_per_art}
                    onChange={(e) => setDesignerFormData({ ...designerFormData, cost_per_art: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddRole}
              disabled={addRoleMutation.isPending || !selectedRole}
            >
              {addRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Designer Dialog */}
      <Dialog open={isEditDesignerDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditDesignerDialogOpen(false);
          setSelectedUser(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Dados do Designer</DialogTitle>
            <DialogDescription>
              Atualize as informações de {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-designer-phone">Telefone</Label>
              <Input
                id="edit-designer-phone"
                value={designerFormData.phone}
                onChange={(e) => setDesignerFormData({ ...designerFormData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-designer-cost">Custo por Arte (R$)</Label>
              <Input
                id="edit-designer-cost"
                type="number"
                step="0.01"
                min="0"
                value={designerFormData.cost_per_art}
                onChange={(e) => setDesignerFormData({ ...designerFormData, cost_per_art: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDesignerDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateDesigner}
              disabled={updateDesignerMutation.isPending}
            >
              {updateDesignerMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
