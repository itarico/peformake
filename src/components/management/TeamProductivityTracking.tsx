import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Loader2, Users } from 'lucide-react';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// This component is used in IntegratedStaffPanel under Productivity tab
// It should show all active staff members with their core KPIs
export const TeamProductivityTracking = () => {
  const { data: staff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['staff-members-productivity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: arts = [] } = useQuery({
    queryKey: ['staff-productivity-arts'],
    queryFn: async () => {
      const now = new Date();
      const { data, error } = await supabase
        .from('arts')
        .select('*, work_months!inner(year, month)')
        .eq('work_months.year', now.getFullYear())
        .eq('work_months.month', now.getMonth() + 1);
      if (error) throw error;
      return data;
    }
  });

  if (loadingStaff) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => {
          const memberArts = arts.filter((a: any) => 
            a.designer_id === member.id || 
            (a.work_months?.clients?.social_media_staff_id === member.id)
          );
          
          const approved = memberArts.filter((a: any) => a.status === 'approved').length;
          const total = memberArts.length;
          const progress = total > 0 ? (approved / total) * 100 : 0;

          return (
            <Card key={member.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 bg-muted/30">
                <div className="flex items-center gap-3">
                  <OptimizedAvatar 
                    src={member.avatar_url} 
                    fallback={member.full_name} 
                    className="border border-primary/20" 
                    size="sm" 
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{member.full_name}</CardTitle>
                    </div>
                    <CardDescription className="text-[10px] truncate">
                      {member.job_title || member.role}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground uppercase font-bold">Produção do Mês</span>
                    <span className="font-bold">{approved}/{total}</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 p-2 rounded-md text-center">
                    <p className="text-[10px] text-muted-foreground uppercase leading-none mb-1">Status</p>
                    <Badge variant={member.is_active ? "outline" : "secondary"} className="text-[8px] h-3.5 px-1 py-0">
                      {member.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="bg-muted/50 p-2 rounded-md text-center">
                    <p className="text-[10px] text-muted-foreground uppercase leading-none mb-1">Função</p>
                    <p className="text-[10px] font-bold truncate">{member.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {staff.length === 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-2">
            <Users className="h-12 w-12 text-primary opacity-20" />
            <h3 className="font-bold">Nenhum membro encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Adicione membros na aba de configuração para que eles apareçam aqui.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};