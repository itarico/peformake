import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IncomingLeadsProps {
  sdrStaffId: string | null;
}

const IncomingLeads = ({ sdrStaffId }: IncomingLeadsProps) => {
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, error: queryError } = useQuery({
    queryKey: ['incoming-leads'],
    queryFn: async () => {
      // Primeiro buscamos as etapas para saber qual é a etapa 1
      const { data: stages } = await supabase
        .from('sdr_pipeline_stages')
        .select('id')
        .eq('stage_order', 1)
        .maybeSingle();
      
      if (!stages) return [];

      const { data, error } = await supabase
        .from('sdr_leads')
        .select('*')
        .is('sdr_staff_id', null)
        .eq('stage_id', stages.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error("Erro ao buscar leads entrantes:", error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 10000,
  });

  if (queryError) {
    console.error("Query Error in IncomingLeads:", queryError);
  }

  const assignMutation = useMutation({
    mutationFn: async (leadId: string) => {
      let responsibleId: string;
      const { data: { user } } = await supabase.auth.getUser();
      // Verificamos se é admin via RPC ou se o email contém peformake (como fallback simples se RPC falhar)
      const { data: isAdminUser } = await supabase.rpc('is_staff', { _user_id: user?.id });

      if (isAdminUser && !sdrStaffId) {
        // Se for admin assumindo, tentamos encontrar ou criar o staff "Admin"
        const { data: adminStaff } = await supabase
          .from('staff_members')
          .select('id')
          .eq('full_name', 'Admin')
          .maybeSingle();
        
        if (adminStaff) {
          responsibleId = adminStaff.id;
        } else {
          // Criar staff Admin se não existir
          const { data: newAdmin, error: createError } = await supabase
            .from('staff_members')
            .insert({
              full_name: 'Admin',
              email: user?.email || 'admin@peformake.com',
              role: 'sdr',
              is_active: true
            })
            .select('id')
            .single();
          
          if (createError) throw createError;
          responsibleId = newAdmin.id;
        }
      } else if (!sdrStaffId) {
        // Fallback para outros staffs
        if (user) {
          const { data: staff } = await supabase
            .from('staff_members')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();
          
          if (staff) {
            responsibleId = staff.id;
          } else {
            const { data: firstStaff } = await supabase.from('staff_members').select('id').eq('is_active', true).limit(1).maybeSingle();
            if (firstStaff) responsibleId = firstStaff.id;
            else throw new Error("Responsável não encontrado.");
          }
        } else {
          throw new Error("Usuário não autenticado.");
        }
      } else {
        responsibleId = sdrStaffId;
      }

      const { data: stage } = await supabase
        .from('sdr_pipeline_stages')
        .select('id')
        .eq('stage_order', 2)
        .maybeSingle();

      if (!stage) throw new Error("Estágio 'Contato' não encontrado.");

      const { error } = await supabase
        .from('sdr_leads')
        .update({ 
          sdr_staff_id: responsibleId, 
          claimed_at: new Date().toISOString(),
          stage_id: stage.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .is('sdr_staff_id', null);
      
      if (error) {
        console.error("Erro ao assumir lead:", error);
        throw new Error("Erro ao assumir lead ou lead já possui responsável.");
      }

      // Record activity
      await supabase.from('sdr_lead_activities').insert({
        lead_id: leadId,
        sdr_staff_id: responsibleId,
        activity_type: 'claim',
        description: 'Lead assumido pelo responsável',
        outcome: 'Sucesso'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-leads'] });
      queryClient.invalidateQueries({ queryKey: ['sdr-leads'] });
      toast.success('Lead assumido! Ele foi movido para a etapa de Contato.');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const tiers = [
    { label: 'Prioridade A - Alto', value: 'A', color: 'bg-purple-600' },
    { label: 'Prioridade B - Médio', value: 'B', color: 'bg-blue-600' },
    { label: 'Prioridade C - Mínimo', value: 'C', color: 'bg-slate-600' },
    { label: 'Desqualificado', value: 'Desqualificado', color: 'bg-red-600' },
  ];

  const groupedLeads = tiers.reduce((acc, tier) => {
    acc[tier.value] = leads.filter((l: any) => {
      if (tier.value === 'Desqualificado') return l.lead_tier === 'Outro' || l.lead_tier === 'Desqualificado';
      return l.lead_tier === tier.value;
    });
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-orange-500/10 p-2 rounded-xl">
          <AlertCircle className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-tighter">Aguardando Atendimento</h2>
        </div>
        <Badge variant="secondary" className="bg-orange-100 text-orange-700 ml-auto">
          {leads.length} pendentes
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => (
          <div key={tier.value} className="space-y-3">
            <div className={`p-3 rounded-xl ${tier.color} text-white flex justify-between items-center shadow-lg shadow-black/5`}>
              <span className="text-xs font-black uppercase tracking-widest">{tier.label}</span>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                {groupedLeads[tier.value]?.length || 0}
              </span>
            </div>
            
            <div className="space-y-3 min-h-[100px] bg-muted/20 p-2 rounded-xl border border-dashed border-muted-foreground/20">
              {groupedLeads[tier.value]?.map((lead: any) => {
                const isLost = lead.status === 'lost';
                return (
                <Card
                  key={lead.id}
                  className={`shadow-sm hover:shadow-md transition-all group ${
                    isLost
                      ? 'border-l-4 border-l-red-600 bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                      : 'border-l-4 border-l-primary'
                  }`}
                >
                  <CardContent className="p-3 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <h4 className="font-bold text-sm truncate">{lead.contact_name}</h4>
                          {isLost && (
                            <Badge className="h-4 px-1.5 text-[8px] font-bold bg-red-600 text-white border-none shrink-0">
                              Perdido
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{lead.company_name || 'Individual'}</p>
                        {lead.sdr_staff_id && (
                          <div className="flex items-center gap-1 mt-1">
                             <UserCheck className="h-2 w-2 text-primary" />
                             <span className="text-[8px] font-bold text-primary uppercase">Assumido</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-[9px] h-4 flex gap-1 items-center border-orange-200 text-orange-700 bg-orange-50 font-bold uppercase">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDistanceToNow(new Date(lead.created_at), { locale: ptBR })}
                        </Badge>
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full h-8 text-[10px] font-bold uppercase bg-primary hover:bg-primary/90 shadow-md shadow-primary/10 group-hover:scale-[1.02] transition-transform"
                      onClick={() => assignMutation.mutate(lead.id)}
                      disabled={assignMutation.isPending}
                    >
                      <UserCheck className="h-3 w-3 mr-2" />
                      Assumir Lead
                    </Button>
                  </CardContent>
                </Card>
                );
              })}
              {groupedLeads[tier.value]?.length === 0 && (
                <div className="text-center py-8 text-[10px] text-muted-foreground font-medium uppercase tracking-tighter opacity-50">
                  Nenhum lead
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomingLeads;