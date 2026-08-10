import { useState, useEffect } from 'react';
import TrafficDeliverablesPanel from '@/components/traffic/TrafficDeliverablesPanel';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Settings, Brain, UsersRound, Rocket, Lightbulb, FileDown, ArrowLeft, CheckCircle2, XCircle, Instagram, ClipboardList } from 'lucide-react';
import { TrafficDashboardPanel } from '@/components/traffic/TrafficDashboardPanel';
import { TrafficConfigPanel } from '@/components/traffic/TrafficConfigPanel';
import { TrafficAIAnalysisPanel } from '@/components/traffic/TrafficAIAnalysisPanel';
import { TrafficAudiencesPanel } from '@/components/traffic/TrafficAudiencesPanel';
import { TrafficCampaignCreator } from '@/components/traffic/TrafficCampaignCreator';
import { TrafficInsightsPanel } from '@/components/traffic/TrafficInsightsPanel';
import { TrafficPDFExportButton } from '@/components/traffic/TrafficPDFExportButton';
import { TrafficActionAlerts } from '@/components/traffic/TrafficActionAlerts';
import { InstagramDashboard } from '@/components/traffic/InstagramDashboard';


export default function TrafficAdmin() {
  const { isAdmin, isStaff, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
  const [oauthCode, setOauthCode] = useState<string | null>(null);
  const [oauthState, setOauthState] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(searchParams.get('client'));


  // Fetch clients with tráfego service
  const { data: trafficClients = [] } = useQuery({
    queryKey: ['traffic-admin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_services')
        .select('client_id, clients(id, name, is_active, logo_url, business_segment), services!inner(slug)')
        .eq('is_active', true)
        .eq('services.slug', 'trafego');
      if (error) throw error;
      return (data || []).filter((cs: any) => cs.clients?.is_active).map((cs: any) => cs.clients);
    },
  });

  // Fetch Meta connections to show status
  const { data: connections = [] } = useQuery({
    queryKey: ['traffic-connections-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('traffic_meta_connections')
        .select('client_id, status')
        .eq('status', 'active');
      return data || [];
    },
  });

  // Fetch pending actions for all clients
  const { data: allActions = [] } = useQuery({
    queryKey: ['traffic-ai-actions-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('traffic_ai_actions')
        .select('client_id, severity')
        .eq('is_resolved', false);
      return data || [];
    },
  });

  const getClientActionCounts = (clientId: string) => {
    const clientActions = allActions.filter((a: any) => a.client_id === clientId);
    return {
      critical: clientActions.filter((a: any) => a.severity === 'critical').length,
      warning: clientActions.filter((a: any) => a.severity === 'warning').length,
      total: clientActions.length,
    };
  };

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (code && state) {
      setOauthCode(code);
      setOauthState(state);
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('code');
      newParams.delete('state');
      setSearchParams(newParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAdmin && oauthCode && oauthState) {
      setSelectedClientId(oauthState);
      setActiveTab('config');
    }
  }, [isAdmin, oauthCode, oauthState]);

  if (isLoading) return null;
  if (!isStaff) return <Navigate to="/dashboard" replace />;

  const isConnected = (clientId: string) => connections.some((c: any) => c.client_id === clientId);

  // Client Selection Screen
  if (!selectedClientId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tráfego Pago</h1>
          <p className="text-muted-foreground">Selecione um cliente para gerenciar suas campanhas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trafficClients.map((client: any) => {
            const connected = isConnected(client.id);
            const actionCounts = getClientActionCounts(client.id);
            return (
              <Card
                key={client.id}
                className={`cursor-pointer hover:border-primary/50 transition-colors ${actionCounts.critical > 0 ? 'border-destructive/50' : actionCounts.warning > 0 ? 'border-yellow-500/40' : ''}`}
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
                    <div className="flex flex-col items-end gap-1.5">
                      {connected ? (
                        <Badge variant="default" className="gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" /> Meta
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <XCircle className="h-3 w-3" /> Sem Meta
                        </Badge>
                      )}
                    </div>
                  </div>
                  {actionCounts.total > 0 && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      <TrafficActionAlerts clientId={client.id} compact />
                      <span className="text-[11px] text-muted-foreground">
                        {actionCounts.total} {actionCounts.total === 1 ? 'ação pendente' : 'ações pendentes'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {trafficClients.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum cliente com serviço de Tráfego ativo. Ative o serviço "Tráfego" no cadastro do cliente.
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedClient = trafficClients.find((c: any) => c.id === selectedClientId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedClientId(null); setActiveTab('dashboard'); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{selectedClient?.name || 'Cliente'}</h1>
            <p className="text-muted-foreground">Gestão de tráfego pago</p>
          </div>
        </div>
        {isAdmin && <TrafficPDFExportButton clientId={selectedClientId} clientName={selectedClient?.name} />}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="insights" className="gap-2">
              <Lightbulb className="h-4 w-4" /> Insights
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="ai-copilot" className="gap-2">
              <Brain className="h-4 w-4" /> Copiloto IA
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="create-campaign" className="gap-2">
              <Rocket className="h-4 w-4" /> Criar Campanha
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="audiences" className="gap-2">
              <UsersRound className="h-4 w-4" /> Públicos
            </TabsTrigger>
          )}
          <TabsTrigger value="entregas" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Entregas
          </TabsTrigger>
          <TabsTrigger value="instagram" className="gap-2">
            <Instagram className="h-4 w-4" /> Instagram
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" /> Configurações
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="dashboard">
          <TrafficDashboardPanel clientId={selectedClientId} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="insights">
            <TrafficInsightsPanel clientId={selectedClientId} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="ai-copilot">
            <TrafficAIAnalysisPanel clientId={selectedClientId} clientName={selectedClient?.name} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="create-campaign">
            <TrafficCampaignCreator clientId={selectedClientId} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="audiences">
            <TrafficAudiencesPanel clientId={selectedClientId} />
          </TabsContent>
        )}

        <TabsContent value="entregas">
          <TrafficDeliverablesPanel initialClientId={selectedClientId} />
        </TabsContent>

        <TabsContent value="instagram">
          <InstagramDashboard clientId={selectedClientId} clientName={selectedClient?.name} />
        </TabsContent>


        {isAdmin && (
          <TabsContent value="config">
            <TrafficConfigPanel oauthCode={oauthCode} oauthState={oauthState} onOAuthConsumed={() => { setOauthCode(null); setOauthState(null); }} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
