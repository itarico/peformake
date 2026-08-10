import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, MessageSquare, Award } from 'lucide-react';

interface MySquadProps {
  clientId: string;
}

export function MySquad({ clientId }: MySquadProps) {
  const { data: squadData, isLoading } = useQuery({
    queryKey: ['portal-my-squad', clientId],
    queryFn: async () => {
      // 1. Get client to see specific IDs and squad_id
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select(`
          designer_id, 
          social_media_staff_id, 
          admin_staff_id, 
          squad_id, 
          has_audiovisual_service,
          head_marketing_id,
          traffic_manager_id,
          closer_id,
          editor_id
        `)
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // 2. Get squad info if it exists
      let squad = null;
      let squadMemberIds: string[] = [];
      if (client.squad_id) {
        const { data: squadInfo } = await supabase
          .from('staff_squads')
          .select('*')
          .eq('id', client.squad_id)
          .single();
        
        if (squadInfo) {
          squad = squadInfo;
          const { data: squadMembersData } = await supabase
            .from('staff_squad_members')
            .select('staff_id')
            .eq('squad_id', client.squad_id);
          
          if (squadMembersData) {
            squadMemberIds = squadMembersData.map(m => m.staff_id);
          }
        }
      }

      const individualMemberIds = [
        client.designer_id,
        client.social_media_staff_id,
        client.admin_staff_id,
        client.head_marketing_id,
        client.traffic_manager_id,
        client.closer_id,
        client.editor_id
      ].filter(Boolean) as string[];

      // Get all members assigned to the client via client_team_assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('client_team_assignments')
        .select('staff_member_id, role_in_client')
        .eq('client_id', clientId);

      const allIds = Array.from(new Set([
        ...individualMemberIds, 
        ...squadMemberIds,
        ...(assignments?.map(a => a.staff_member_id) || [])
      ]));

      if (allIds.length === 0) return { members: [], squad: null };

      // 3. Get staff details
      const { data: staff, error: staffError } = await supabase
        .from('staff_members')
        .select('*')
        .in('id', allIds);

      if (staffError) throw staffError;

      const members = staff.map(m => {
        let role = (m as any).roleLabel || m.job_title || m.role || 'Membro';
        
        // Match assignments first
        const assignment = assignments?.find(a => a.staff_member_id === m.id);
        if (assignment && assignment.role_in_client && assignment.role_in_client !== 'Squad Member') {
          role = assignment.role_in_client;
        } else {
          // Check specific client-staff associations
          // Priority to mapped fields in client object
          if (m.id === client.head_marketing_id) role = 'Head de Marketing';
          else if (m.id === client.traffic_manager_id) role = 'Gestor de Tráfego';
          else if (m.id === client.social_media_staff_id) role = 'Social Media';
          else if (m.id === client.designer_id) role = 'Designer';
          else if (m.id === client.closer_id) role = 'Closer / SDR';
          else if (m.id === client.editor_id) role = 'Audiovisual / Editor';
          else if (m.id === client.admin_staff_id) role = 'Gestor de Conta';
          else if (client.has_audiovisual_service && 
            (m.role === 'editor' || m.role === 'videomaker' || m.job_title?.toLowerCase().includes('video') || m.job_title?.toLowerCase().includes('audio'))) {
            role = 'Audiovisual';
          }
        }
        
        return { ...m, roleLabel: role };
      });

      return { members, squad, client };
    },
    enabled: !!clientId,
  });

  if (isLoading) return (
    <div className="flex justify-center py-4">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    </div>
  );

  if (!squadData || squadData.members.length === 0) return null;

  const { members, squad } = squadData;
  const leaderId = squad?.leader_id;

  return (
    <Card className="border-primary/10 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-primary/5 bg-primary/5">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Sua Equipe de Sucesso
          </div>
          {squad && (
            <Badge variant="outline" className="text-[10px] font-bold uppercase bg-white/50">
              Squad: {squad.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-primary/5">
          {members.map((member) => (
            <div key={member.id} className="p-4 flex items-center gap-4 hover:bg-primary/5 transition-colors group">
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-primary/10 group-hover:border-primary/30 transition-all">
                  <AvatarImage src={member.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {member.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                  </AvatarFallback>
                </Avatar>
                {member.id === leaderId && (
                  <div className="absolute -top-1 -right-1 bg-primary text-white p-0.5 rounded-full ring-2 ring-white">
                    <Award className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{member.full_name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1.5 bg-background font-medium border-primary/10">
                    {member.roleLabel}
                  </Badge>
                  {member.id === leaderId && (
                    <Badge className="text-[9px] h-3.5 px-1.5 bg-primary/20 text-primary border-none font-bold uppercase tracking-tighter">
                      Líder
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Only Leader contact is visible to the client */}
              {member.id === leaderId && (
                <button 
                  onClick={() => window.open(`https://wa.me/${member.phone?.replace(/\D/g, '') || '5581985672212'}`, '_blank')}
                  className="h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-sm bg-primary text-white hover:bg-primary/90 scale-110"
                  title="Contato direto com o Líder"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
