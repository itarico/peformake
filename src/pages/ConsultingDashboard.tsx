import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Calendar, Lightbulb } from "lucide-react";
import { MONTH_NAMES } from "@/types/database";

export default function ConsultingDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isSocialMedia, isStaff: isAuthStaff } = useAuth();
  const { staffMember, isAdmin: isStaffAdmin, isSocialMedia: isStaffSocialMedia, isStaff } = useStaffAuth();
  
  const isStaffAdminMember = !!staffMember && isStaffAdmin;
  const canAccess = isAdmin || isSocialMedia || isAuthStaff || isStaffAdmin || isStaffSocialMedia || isStaff;

  const { data: clients, isLoading } = useQuery({
    queryKey: ['consulting-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          logo_url,
          has_consulting_service,
          consulting_months_contracted,
          consulting_price_per_month,
          admin_staff_id,
          is_active
        `)
        .eq('has_consulting_service', true)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: canAccess,
  });

  // Get current month for each client
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const { data: consultingMonths } = useQuery({
    queryKey: ['current-consulting-months', currentYear, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consulting_months')
        .select(`
          id,
          client_id,
          year,
          month,
          is_complete,
          framework_instances(id, status)
        `)
        .eq('year', currentYear)
        .eq('month', currentMonth);
      
      if (error) throw error;
      return data;
    },
    enabled: canAccess && !!clients?.length,
  });

  if (!canAccess) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter clients for staff admin
  const filteredClients = isStaffAdminMember && staffMember?.id
    ? clients?.filter(c => (c as any).admin_staff_id === staffMember.id)
    : clients;

  const getClientMonthData = (clientId: string) => {
    return consultingMonths?.find(cm => cm.client_id === clientId);
  };

  return (
    <div className="container mx-auto py-4 md:py-8 space-y-4 md:space-y-6 px-2 md:px-4">
      <div className="flex items-center gap-2 md:gap-3">
        <Lightbulb className="h-6 w-6 md:h-8 md:w-8 text-primary shrink-0" />
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Consultoria</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerenciamento estratégico de clientes com frameworks e IA
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="px-3 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Calendar className="h-4 w-4 md:h-5 md:w-5" />
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Clientes com serviço de consultoria ativo
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 md:px-6 pb-4 md:pb-6">
          {isLoading ? (
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 md:h-32" />
              ))}
            </div>
          ) : filteredClients?.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <Building2 className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-muted-foreground">
                Nenhum cliente com consultoria ativa.
              </p>
              <p className="text-xs md:text-sm text-muted-foreground mt-2">
                Ative o serviço de consultoria em um cliente para começar.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredClients?.map((client) => {
                const monthData = getClientMonthData(client.id);
                const instanceCount = monthData?.framework_instances?.length || 0;
                const completedCount = monthData?.framework_instances?.filter(
                  fi => fi.status === 'completed'
                ).length || 0;

                return (
                  <Card 
                    key={client.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/consulting/${client.id}`)}
                  >
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-start gap-2 md:gap-3">
                        {client.logo_url ? (
                          <img 
                            src={client.logo_url} 
                            alt={client.name}
                            className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate text-sm md:text-base">{client.name}</h3>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {client.consulting_months_contracted} meses contratados
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 md:mt-4 flex items-center justify-between">
                        {monthData ? (
                          <>
                            <div className="text-xs md:text-sm">
                              <span className="text-muted-foreground">Frameworks: </span>
                              <span className="font-medium">{completedCount}/{instanceCount}</span>
                            </div>
                            {monthData.is_complete ? (
                              <Badge variant="default" className="bg-success/20 text-success text-[10px] md:text-xs">
                                Concluído
                              </Badge>
                            ) : instanceCount > 0 ? (
                              <Badge variant="secondary" className="text-[10px] md:text-xs">
                                Em andamento
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] md:text-xs">
                                Não iniciado
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px] md:text-xs">
                            Mês não gerado
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
