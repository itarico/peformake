/**
 * CrmClientSettings — shown inside CrmPortal for the client to manage their CRM settings.
 * Includes: Bot toggle, Products catalog, Tags, Flows, Webhooks, Campaigns, CSV tools.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Info, Package, GitBranch, Webhook, Tag, Megaphone, FileSpreadsheet, Users, Bell, FileText, ClipboardList, Settings } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import CrmFlowBuilder from './CrmFlowBuilder';
import CrmWebhookConfig from './CrmWebhookConfig';
import CrmTagManager from './CrmTagManager';
import CrmProductCatalog from './CrmProductCatalog';
import CrmCampaigns from './CrmCampaigns';
import CrmCSVTools from './CrmCSVTools';
import CrmTeamMembers from './CrmTeamMembers';
import CrmAutoNotifications from './CrmAutoNotifications';
import CrmQuoteConfig from './CrmQuoteConfig';
import CrmFormConfig from './CrmFormConfig';
import CrmResetButton from './CrmResetButton';

interface Props {
  clientId: string;
}

export default function CrmClientSettings({ clientId }: Props) {
  const [botConfig, setBotConfig] = useState<any>(null);
  const [portalToken, setPortalToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: bc }, { data: client }] = await Promise.all([
        supabase.from('crm_bot_configs').select('*').eq('client_id', clientId).maybeSingle(),
        supabase.from('clients').select('portal_token').eq('id', clientId).maybeSingle(),
      ]);
      setBotConfig(bc);
      if (client) setPortalToken(client.portal_token);
      setLoading(false);
    };
    load();
  }, [clientId]);

  const toggleBot = async () => {
    if (!botConfig) {
      toast.error('Configuração do bot não encontrada. Contate o administrador.');
      return;
    }
    setToggling(true);
    const newVal = !botConfig.is_enabled;
    const { error } = await supabase
      .from('crm_bot_configs')
      .update({ is_enabled: newVal })
      .eq('id', botConfig.id);

    if (error) {
      toast.error('Erro ao alterar bot: ' + error.message);
    } else {
      setBotConfig((prev: any) => ({ ...prev, is_enabled: newVal }));
      toast.success(newVal ? '🤖 Bot ativado!' : '🔕 Bot desativado!');
    }
    setToggling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="py-4">
      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="w-full justify-start bg-transparent gap-1 border-b rounded-none px-0 h-auto pb-0 overflow-x-auto flex-nowrap">
          {[
            { value: 'catalog', icon: Package, label: 'Catálogo' },
            { value: 'tags', icon: Tag, label: 'Etiquetas' },
            { value: 'campaigns', icon: Megaphone, label: 'Campanhas' },
            { value: 'team', icon: Users, label: 'Equipe' },
            { value: 'notifications', icon: Bell, label: 'Notificações' },
            { value: 'bot', icon: Bot, label: 'Bot / IA' },
            { value: 'quotes', icon: FileText, label: 'Orçamentos' },
            { value: 'formulario', icon: ClipboardList, label: 'Formulário' },
            { value: 'flows', icon: GitBranch, label: 'Fluxos' },
            { value: 'webhooks', icon: Webhook, label: 'Webhooks' },
            { value: 'general', icon: Settings, label: 'Geral' },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2 transition-all shrink-0"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Product Catalog */}
        <TabsContent value="catalog" className="mt-4">
          <div className="space-y-4 max-w-2xl mx-auto">
            <CrmProductCatalog clientId={clientId} />
          </div>
        </TabsContent>

        {/* Tags */}
        <TabsContent value="tags" className="mt-4">
          <div className="max-w-xl mx-auto space-y-4">
            <CrmTagManager clientId={clientId} />
          </div>
        </TabsContent>

        {/* Campaigns */}
        <TabsContent value="campaigns" className="mt-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <CrmCampaigns clientId={clientId} />
          </div>
        </TabsContent>

        {/* Team Members */}
        <TabsContent value="team" className="mt-4">
          <div className="max-w-2xl mx-auto">
            <CrmTeamMembers clientId={clientId} />
          </div>
        </TabsContent>

        {/* Auto Notifications */}
        <TabsContent value="notifications" className="mt-4">
          <div className="max-w-2xl mx-auto">
            <CrmAutoNotifications clientId={clientId} />
          </div>
        </TabsContent>

        {/* Quote Config */}
        <TabsContent value="quotes" className="mt-4">
          <div className="max-w-2xl mx-auto">
            <CrmQuoteConfig clientId={clientId} portalToken={portalToken} />
          </div>
        </TabsContent>

        {/* Formulário de captura */}
        <TabsContent value="formulario" className="mt-4">
          <CrmFormConfig clientId={clientId} portalToken={portalToken} />
        </TabsContent>

        {/* Bot settings */}
        <TabsContent value="bot" className="mt-4">
          <div className="space-y-4 max-w-xl mx-auto">
            {/* Bot toggle */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Assistente de IA</CardTitle>
                  </div>
                  {botConfig ? (
                    <div className="flex items-center gap-2">
                      {toggling
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Switch checked={botConfig.is_enabled} onCheckedChange={toggleBot} />
                      }
                      <Badge variant={botConfig.is_enabled ? 'default' : 'secondary'}>
                        {botConfig.is_enabled ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="secondary">Não configurado</Badge>
                  )}
                </div>
                <CardDescription>
                  {botConfig
                    ? botConfig.is_enabled
                      ? `O assistente "${botConfig.persona || 'IA'}" está respondendo mensagens automaticamente pelo WhatsApp.`
                      : 'O assistente de IA está pausado. Ative para responder mensagens automaticamente.'
                    : 'Peça ao administrador para configurar o bot de IA para sua conta.'}
                </CardDescription>
              </CardHeader>
              {botConfig?.is_enabled && (
                <CardContent className="pt-0">
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>O assistente responde em seu nome com base nos produtos cadastrados e no histórico de cada conversa.</p>
                      {botConfig.business_hours_only && botConfig.business_hours_start && (
                        <p className="font-medium text-foreground">
                          Horário: {botConfig.business_hours_start} – {botConfig.business_hours_end}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Flows */}
        <TabsContent value="flows" className="mt-0">
          <CrmFlowBuilder clientId={clientId} />
        </TabsContent>

        {/* Webhooks */}
        <TabsContent value="webhooks" className="mt-0">
          <CrmWebhookConfig clientId={clientId} />
        </TabsContent>

        {/* Geral / Zona de Perigo */}
        <TabsContent value="general" className="mt-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <CrmResetButton clientId={clientId} />
          </div>
        </TabsContent>
      </Tabs>

      {/* CSV tools at the bottom */}
      <div className="mt-6 pt-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileSpreadsheet className="h-4 w-4" />
          <span>Importar/Exportar Leads</span>
        </div>
        <CrmCSVTools clientId={clientId} />
      </div>
    </div>
  );
}
