import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Check, ExternalLink, Globe, Building2 } from 'lucide-react';
import { Client } from '@/types/database';

export default function SocialMediaPortalLinks() {
  const { staffMember, isSocialMedia, isAdmin } = useStaffAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { isAdmin: isRealAdmin } = useAuth();

  if (!staffMember && !isRealAdmin) {
    return <Navigate to="/login" replace />;
  }
  if (staffMember && !isSocialMedia && !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const { data: clients } = useQuery({
    queryKey: ['portal-links-clients', staffMember?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      let result = data as Client[];
      if (!isAdmin && staffMember?.id) {
        result = result.filter(c => c.social_media_staff_id === staffMember.id || c.admin_staff_id === staffMember.id);
      }
      return result;
    },
  });

  const handleCopy = (token: string, clientId: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(clientId);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portal do Cliente</h1>
        <p className="text-sm text-muted-foreground mt-1">Links de acesso ao portal de cada cliente</p>
      </div>

      {!clients?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum cliente atribuído</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {clients.map(client => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{client.name}</p>
                    {client.business_segment && (
                      <p className="text-xs text-muted-foreground truncate">{client.business_segment}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleCopy(client.portal_token, client.id)}
                    >
                      {copiedId === client.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copiar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => window.open(`/portal/${client.portal_token}`, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
