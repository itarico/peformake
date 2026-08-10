import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Palette, MessageSquare, Bot, FileText, ExternalLink, Download } from 'lucide-react';
import { SocialMediaAIChat } from '@/components/social-media/SocialMediaAIChat';
import { DesignBriefingAIChat } from '@/components/social-media/DesignBriefingAIChat';
import { Client } from '@/types/database';

export default function SocialMediaAssistant() {
  const { staffMember, isSocialMedia, isAdmin } = useStaffAuth();
  const [selectedClientId, setSelectedClientId] = useState('');

  if (!staffMember || (!isSocialMedia && !isAdmin)) {
    return <Navigate to="/login" replace />;
  }

  const { data: clients } = useQuery({
    queryKey: ['sm-assistant-clients', staffMember?.id],
    queryFn: async () => {
      let query = supabase.from('clients').select('*').eq('is_active', true).order('name');
      const { data, error } = await query;
      if (error) throw error;
      let result = data as Client[];
      if (!isAdmin && staffMember?.id) {
        result = result.filter(c => c.social_media_staff_id === staffMember.id || c.admin_staff_id === staffMember.id);
      }
      return result;
    },
  });

  const selectedClient = clients?.find(c => c.id === selectedClientId);

  const now = new Date();
  const { data: consultingMonth } = useQuery({
    queryKey: ['sm-assistant-consulting', selectedClientId, now.getMonth() + 1, now.getFullYear()],
    queryFn: async () => {
      const { data } = await supabase
        .from('consulting_months')
        .select('id, monthly_focus')
        .eq('client_id', selectedClientId)
        .eq('year', now.getFullYear())
        .eq('month', now.getMonth() + 1)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedClientId,
  });

  // Fetch planning PDFs from consulting storage
  const { data: planningPdfs } = useQuery({
    queryKey: ['sm-planning-pdfs', selectedClientId],
    queryFn: async () => {
      // Get PDFs from client_files with type 'planejamento'
      const { data: dbFiles } = await supabase
        .from('client_files')
        .select('*')
        .eq('client_id', selectedClientId)
        .eq('file_type', 'planejamento')
        .order('created_at', { ascending: false });

      // Also get PDFs from planning-pdfs bucket
      const { data: storagePdfs } = await supabase.storage
        .from('planning-pdfs')
        .list(selectedClientId, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });

      const storageFiles = (storagePdfs || []).map(f => ({
        id: f.id || f.name,
        file_name: f.name,
        file_url: supabase.storage.from('planning-pdfs').getPublicUrl(`${selectedClientId}/${f.name}`).data.publicUrl,
        created_at: f.created_at,
        is_storage: true,
      }));

      return [...(dbFiles || []), ...storageFiles];
    },
    enabled: !!selectedClientId,
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assistente IA</h1>
        <p className="text-sm text-muted-foreground mt-1">Ferramentas de IA e planejamento</p>
      </div>

      <div className="w-full max-w-sm">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients?.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedClientId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Selecione um cliente para usar o assistente</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="planning" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="planning" className="gap-2">
              <FileText className="h-4 w-4" />
              Planejamento
            </TabsTrigger>
            <TabsTrigger value="design" className="gap-2">
              <Palette className="h-4 w-4" />
              Design
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Social Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  PDFs de Planejamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!planningPdfs?.length ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum planejamento disponível para este cliente
                  </p>
                ) : (
                  <div className="space-y-3">
                    {planningPdfs.map((pdf: any) => (
                      <div key={pdf.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{pdf.file_name}</p>
                            {pdf.created_at && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(pdf.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => window.open(pdf.file_url, '_blank')}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design" className="mt-4">
            <DesignBriefingAIChat
              clientName={selectedClient?.name || ''}
              clientContext={{
                businessDescription: selectedClient?.business_description || undefined,
                businessSegment: selectedClient?.business_segment || undefined,
                targetAudience: selectedClient?.target_audience || undefined,
                monthlyFocus: consultingMonth?.monthly_focus || undefined,
              }}
            />
          </TabsContent>

          <TabsContent value="social" className="mt-4">
            <SocialMediaAIChat
              clientName={selectedClient?.name || ''}
              clientContext={{
                businessDescription: selectedClient?.business_description || undefined,
                businessSegment: selectedClient?.business_segment || undefined,
                targetAudience: selectedClient?.target_audience || undefined,
                monthlyFocus: consultingMonth?.monthly_focus || undefined,
              }}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
