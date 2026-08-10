import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, CheckCircle, Clock, FileText, Brain, ChevronDown } from "lucide-react";
import { MONTH_NAMES } from "@/types/database";
import { StrategicChat } from "@/components/consulting/StrategicChat";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function ClientConsulting() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(true);

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['consulting-client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, logo_url, has_consulting_service')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: months, isLoading: loadingMonths } = useQuery({
    queryKey: ['client-consulting-months', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consulting_months')
        .select(`
          id,
          year,
          month,
          is_complete,
          notes,
          framework_instances(id, status, framework:frameworks(name))
        `)
        .eq('client_id', clientId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const isLoading = loadingClient || loadingMonths;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const isCurrentMonth = (year: number, month: number) => {
    return year === currentYear && month === currentMonth;
  };

  const isPastMonth = (year: number, month: number) => {
    return year < currentYear || (year === currentYear && month < currentMonth);
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
      <Button 
        variant="ghost" 
        className="gap-2"
        onClick={() => navigate('/consulting')}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            {client?.logo_url ? (
              <img 
                src={client.logo_url} 
                alt={client.name}
                className="h-12 w-12 md:h-16 md:w-16 rounded-xl object-cover"
              />
            ) : (
              <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl md:text-3xl font-bold">{client?.name}</h1>
              <p className="text-sm text-muted-foreground">Histórico de Consultoria</p>
            </div>
          </div>

          {/* Strategic AI Chat */}
          {clientId && client && (
            <Collapsible open={isChatOpen} onOpenChange={setIsChatOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent rounded-lg transition-colors group border">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-sm">Estrategista IA</h2>
                    <p className="text-xs text-muted-foreground">
                      Chat com inteligência cruzada — cruza todos os dados do cliente
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 border-primary/20 text-primary hidden sm:flex">
                    Dados Cruzados
                  </Badge>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isChatOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <StrategicChat clientId={clientId} clientName={client.name} />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Monthly Timeline */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Meses de Consultoria</h2>
            <div className="grid gap-4">
              {months?.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum mês de consultoria gerado para este cliente.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Verifique se o serviço de consultoria está ativo e os meses foram configurados.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                months?.map((consultingMonth) => {
                  const instanceCount = consultingMonth.framework_instances?.length || 0;
                  const completedCount = consultingMonth.framework_instances?.filter(
                    (fi: any) => fi.status === 'completed'
                  ).length || 0;
                  const isCurrent = isCurrentMonth(consultingMonth.year, consultingMonth.month);
                  const isPast = isPastMonth(consultingMonth.year, consultingMonth.month);

                  return (
                    <Card 
                      key={consultingMonth.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        isCurrent ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => navigate(`/consulting/${clientId}/${consultingMonth.id}`)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                            <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                            {MONTH_NAMES[consultingMonth.month - 1]} {consultingMonth.year}
                            {isCurrent && (
                              <Badge variant="default" className="ml-2 text-xs">
                                Mês Atual
                              </Badge>
                            )}
                          </CardTitle>
                          {consultingMonth.is_complete ? (
                            <Badge className="bg-success/20 text-success gap-1 text-xs">
                              <CheckCircle className="h-3 w-3" />
                              Concluído
                            </Badge>
                          ) : isPast ? (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              Incompleto
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              Em andamento
                            </Badge>
                          )}
                        </div>
                        {consultingMonth.notes && (
                          <CardDescription className="text-xs md:text-sm">{consultingMonth.notes}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground text-xs md:text-sm">
                            Frameworks: <span className="font-medium text-foreground">{instanceCount}</span>
                          </span>
                          {instanceCount > 0 && (
                            <span className="text-muted-foreground text-xs md:text-sm">
                              Concluídos: <span className="font-medium text-foreground">{completedCount}/{instanceCount}</span>
                            </span>
                          )}
                        </div>
                        
                        {instanceCount > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {consultingMonth.framework_instances?.map((fi: any) => (
                              <Badge 
                                key={fi.id} 
                                variant={fi.status === 'completed' ? 'default' : 'outline'}
                                className={`text-[10px] ${fi.status === 'completed' ? 'bg-success/20 text-success' : ''}`}
                              >
                                {fi.framework?.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
