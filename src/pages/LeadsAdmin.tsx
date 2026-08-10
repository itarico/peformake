import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, MessageCircle, Clock, User, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LeadsAdmin() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: quizLeads, isLoading: loadingQuiz } = useQuery({
    queryKey: ['admin-quiz-leads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('quiz_leads')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: serviceRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['admin-service-requests'],
    queryFn: async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads & Formulários</h1>
        <p className="text-muted-foreground">Diagnósticos e solicitações de serviço recebidas pelo site.</p>
      </div>

      <Tabs defaultValue="diagnosticos">
        <TabsList>
          <TabsTrigger value="diagnosticos" className="gap-2">
            <FileText size={16} />
            Diagnósticos ({quizLeads?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="servicos" className="gap-2">
            <MessageCircle size={16} />
            Solicitações de Serviço ({serviceRequests?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnosticos">
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-3">
              {loadingQuiz && <p className="text-muted-foreground text-sm">Carregando...</p>}
              {quizLeads?.map((lead) => (
                <Card key={lead.id} className="cursor-pointer hover:border-primary/20 transition-colors" onClick={() => toggleExpand(lead.id)}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User size={18} className="text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{lead.name}</CardTitle>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Phone size={12} /> {lead.whatsapp}</span>
                            <span className="flex items-center gap-1"><Mail size={12} /> {lead.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {lead.level && (
                          <Badge variant={lead.level === 'Estruturado' ? 'default' : lead.level === 'Em crescimento' ? 'secondary' : 'destructive'}>
                            {lead.level}
                          </Badge>
                        )}
                        {lead.score !== null && (
                          <span className="text-sm font-bold text-primary">{lead.score}/33</span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} /> {formatDate(lead.created_at)}
                        </span>
                        {expandedId === lead.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </CardHeader>
                  {expandedId === lead.id && (
                    <CardContent className="pt-0 border-t">
                      <h4 className="text-sm font-semibold mb-2 mt-3">Respostas:</h4>
                      <div className="space-y-2">
                        {lead.answers && typeof lead.answers === 'object' && Object.entries(lead.answers as Record<string, string>).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-muted-foreground">Pergunta {Number(key) + 1}:</span>{' '}
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
              {!loadingQuiz && quizLeads?.length === 0 && (
                <p className="text-muted-foreground text-center py-12">Nenhum diagnóstico recebido ainda.</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="servicos">
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-3">
              {loadingRequests && <p className="text-muted-foreground text-sm">Carregando...</p>}
              {serviceRequests?.map((req) => (
                <Card key={req.id} className="cursor-pointer hover:border-primary/20 transition-colors" onClick={() => toggleExpand(req.id)}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <MessageCircle size={18} className="text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{req.name}</CardTitle>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Phone size={12} /> {req.whatsapp}</span>
                            {req.email && <span className="flex items-center gap-1"><Mail size={12} /> {req.email}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{req.service_name}</Badge>
                        <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'contacted' ? 'default' : 'outline'}>
                          {req.status === 'pending' ? 'Pendente' : req.status === 'contacted' ? 'Contatado' : req.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={12} /> {formatDate(req.created_at)}
                        </span>
                        {expandedId === req.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </CardHeader>
                  {expandedId === req.id && req.message && (
                    <CardContent className="pt-0 border-t">
                      <h4 className="text-sm font-semibold mb-2 mt-3">Detalhes:</h4>
                      <pre className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/50 p-3 rounded-lg">{req.message}</pre>
                    </CardContent>
                  )}
                </Card>
              ))}
              {!loadingRequests && serviceRequests?.length === 0 && (
                <p className="text-muted-foreground text-center py-12">Nenhuma solicitação recebida ainda.</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
