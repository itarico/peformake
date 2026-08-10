import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Phone, 
  Mail, 
  Building2, 
  ExternalLink, 
  Loader2,
  Users2
} from 'lucide-react';
import { useState } from 'react';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { Navigate } from 'react-router-dom';

export default function LeaderDirectory() {
  const { isLeader, isAdmin, isHeadMarketing, isStaff } = useStaffAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Apenas líderes, admins ou head marketing podem acessar
  if (!isStaff || (!isLeader && !isAdmin && !isHeadMarketing)) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: clients, isLoading } = useQuery({
    queryKey: ['leader-clients-directory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          email,
          phone,
          logo_url,
          is_active,
          business_segment,
          social_media_staff_id,
          designer_id,
          head_marketing_id,
          staff_members!social_media_staff_id(full_name),
          designer:staff_members!designer_id(full_name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const filteredClients = (clients || []).filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.business_segment?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diretório de Clientes</h1>
          <p className="text-muted-foreground">
            Acesso rápido aos contatos e informações de todos os clientes ativos
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou nicho..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            <CardTitle>Clientes Ativos</CardTitle>
          </div>
          <CardDescription>
            Lista consolidada de contatos da agência
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum cliente encontrado.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Nicho</TableHead>
                    <TableHead>Responsáveis</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border">
                            <AvatarImage src={client.logo_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{client.name}</span>
                            <span className="text-xs text-muted-foreground">ID: {client.id.split('-')[0]}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {client.email && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                            </div>
                          )}
                          {!client.email && !client.phone && (
                            <span className="text-xs text-muted-foreground italic">Sem contato registrado</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.business_segment ? (
                          <Badge variant="secondary" className="font-normal">
                            {client.business_segment}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          {client.staff_members?.full_name && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">SM:</span>
                              <span className="font-medium">{client.staff_members.full_name}</span>
                            </div>
                          )}
                          {client.designer?.full_name && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Design:</span>
                              <span className="font-medium">{client.designer.full_name}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          asChild
                        >
                          <a href={`/clients?id=${client.id}`} className="gap-1.5">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ver Detalhes
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
