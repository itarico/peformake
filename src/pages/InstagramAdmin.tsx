import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Instagram, CheckCircle2, XCircle, BarChart3, CalendarClock } from 'lucide-react';
import { InstagramDashboard } from '@/components/traffic/InstagramDashboard';
import { InstagramScheduler } from '@/components/instagram/InstagramScheduler';

export default function InstagramAdmin() {
  const { isAdmin, isStaff, isLoading } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: clients = [] } = useQuery({
    queryKey: ['instagram-all-clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, logo_url, business_segment, is_active')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const { data: igConnections = [] } = useQuery({
    queryKey: ['ig-connections-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('traffic_meta_connections')
        .select('client_id, instagram_business_id, instagram_username')
        .not('instagram_business_id', 'is', null);
      return (data || []) as any[];
    },
  });

  if (isLoading) return null;
  if (!isStaff) return <Navigate to="/dashboard" replace />;

  const getIgConnection = (clientId: string) =>
    igConnections.find((c: any) => c.client_id === clientId);

  if (!selectedClientId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Instagram className="h-7 w-7 text-pink-500" /> Instagram
          </h1>
          <p className="text-muted-foreground">Gerencie o Instagram de todos os clientes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client: any) => {
            const igConn = getIgConnection(client.id);
            return (
              <Card
                key={client.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => { setSelectedClientId(client.id); setActiveTab('dashboard'); }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base">{client.name}</h3>
                      {client.business_segment && (
                        <p className="text-xs text-muted-foreground">{client.business_segment}</p>
                      )}
                    </div>
                    {igConn ? (
                      <Badge variant="default" className="gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3" /> @{igConn.instagram_username}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <XCircle className="h-3 w-3" /> Sem Instagram
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const selectedClient = clients.find((c: any) => c.id === selectedClientId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedClientId(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{selectedClient?.name}</h1>
          <p className="text-muted-foreground">Instagram</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Métricas
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="gap-2">
            <CalendarClock className="h-4 w-4" /> Agendamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <InstagramDashboard clientId={selectedClientId} clientName={selectedClient?.name} />
        </TabsContent>
        <TabsContent value="scheduler">
          <InstagramScheduler clientId={selectedClientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
