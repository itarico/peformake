import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client, Designer } from '@/types/database';
import { ClientServicesTab } from '@/components/clients/ClientServicesTab';
import ClientJourneyTimeline from '@/components/playbook/ClientJourneyTimeline';
import { ClientFilesTab } from '@/components/clients/ClientFilesTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Loader2, Building2, Copy, Palette, Trash2, Calendar, Users, UserX, Lock, Eye, EyeOff, Search, Award, Zap, Target, Video, ExternalLink, FileWarning, TrendingUp, PhoneCall } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ImageUpload } from '@/components/ImageUpload';
import { FileUpload } from '@/components/FileUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInMonths, isAfter, isBefore, addDays, addMonths, parseISO, format } from 'date-fns';
import { cn } from '@/lib/utils';

import { useStaffAuth } from '@/contexts/StaffAuthContext';

// --- Client Access Tab (portal credentials) ---
function ClientAccessTab({ clientId, clientEmail }: { clientId: string; clientEmail: string }) {
  const queryClient = useQueryClient();
  const [portalPassword, setPortalPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const { data: clientData } = useQuery({
    queryKey: ['client-access', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('portal_password, email')
        .eq('id', clientId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setPortalPassword(clientData?.portal_password || '');
  }, [clientData?.portal_password]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('clients')
        .update({ portal_password: portalPassword.trim() || null })
        .eq('id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-access', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Credenciais do cliente atualizadas!');
    },
    onError: () => toast.error('Erro ao salvar credenciais'),
  });

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Credenciais do Portal</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        O cliente usará o e-mail e senha abaixo para acessar o portal pelo botão "Entrar" no site.
      </p>

      <div className="space-y-2">
        <Label>E-mail de Login</Label>
        <Input value={clientEmail} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">O e-mail é definido na aba "Informações"</p>
      </div>

      <div className="space-y-2">
        <Label>Senha do Portal *</Label>
        <div className="relative">
          <Input
            type={showPw ? 'text' : 'password'}
            value={portalPassword}
            onChange={(e) => setPortalPassword(e.target.value)}
            placeholder="Defina a senha do cliente"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Você define a senha e informa ao cliente</p>
      </div>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
        {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar Credenciais
      </Button>
    </div>
  );
}

export default function Clients() {
  const { isAdmin, isSocialMedia, isStaff } = useAuth();
  const { staffMember, isAdmin: isStaffAdmin, isLeader: isStaffLeader, isHeadMarketing } = useStaffAuth();
  const effectiveIsAdmin = isAdmin || isStaffAdmin || isStaffLeader || isHeadMarketing;
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [dialogTab, setDialogTab] = useState('info');
  const [tableScrollY, setTableScrollY] = useState(0);
  const [lostDialogClient, setLostDialogClient] = useState<Client | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [nicheSearch, setNicheSearch] = useState('');
  const [isAddingNewNiche, setIsAddingNewNiche] = useState(false);
  const [newNiche, setNewNiche] = useState('');
  const today = format(new Date(), 'yyyy-MM-dd');
  const [formData, setFormData] = useState({
    client_type: 'recurring',
    name: '',
    email: '',
    phone: '',
    designer_id: '',
    social_media_staff_id: '',
    head_marketing_id: '',
    traffic_manager_id: '',
    closer_id: '',
    editor_id: '',
    videomaker_id: '',
    arts_per_month: '4',
    contract_months: '12',
    price_per_art: '',
    logo_url: '',
    has_consulting_service: false,
    has_design_service: true,
    consulting_months_contracted: '0',
    consulting_price_per_month: '',
    contract_type: 'recurring',
    contract_model: 'MRR',
    setup_fee: '0',
    contract_file_url: '',
    contract_start_date: today,
    contract_end_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    acquisition_channel: '',
    meta_ad_account_id: '',
    business_segment: '',
    squad_id: '',
    show_on_site: false,
    billing_day: '1',
    brief_summary: '',
    strategy_notes: '',
  });


  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      let q = supabase
        .from('clients')
        .select(`
          *,
          designer:staff_members!designer_id(id, full_name, avatar_url)
        `)
        .order('name');
      
      if (!effectiveIsAdmin && !isHeadMarketing && staffMember?.id) {
        q = q.or(`social_media_staff_id.eq.${staffMember.id},head_marketing_id.eq.${staffMember.id},traffic_manager_id.eq.${staffMember.id},designer_id.eq.${staffMember.id},editor_id.eq.${staffMember.id},videomaker_id.eq.${staffMember.id},closer_id.eq.${staffMember.id}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: isStaff,
  });

  const { data: staffDesigners } = useQuery({
    queryKey: ['staff-designers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, full_name, role')
        .eq('is_active', true)
        .eq('role', 'designer')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const { data: socialMediaStaff } = useQuery({
    queryKey: ['social-media-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_members').select('id, full_name, role').eq('is_active', true).in('role', ['social_media', 'admin']).order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const { data: adminStaff } = useQuery({
    queryKey: ['head-marketing-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_members').select('id, full_name, role').eq('is_active', true).order('full_name');
      if (error) throw error;
      // Filter for roles that can be a Head, but if no specific head role exists, return all as fallback
      const heads = data.filter((s: any) => ['admin', 'leader', 'head_marketing', 'diretor', 'gestor', 'head'].includes(s.role?.toLowerCase()));
      return heads.length > 0 ? heads : data;
    },
    enabled: isStaff,
  });

  const { data: trafficStaff } = useQuery({
    queryKey: ['traffic-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_members').select('id, full_name, role').eq('is_active', true).order('full_name');
      if (error) throw error;
      return data.filter((s: any) => ['traffic_manager', 'gestor_trafego', 'traffic', 'gestor', 'trafego'].includes(s.role?.toLowerCase()));
    },
    enabled: isStaff,
  });

  const { data: audiovisualStaff } = useQuery({
    queryKey: ['audiovisual-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_members').select('id, full_name, role').eq('is_active', true).order('full_name');
      if (error) throw error;
      return data.filter((s: any) => ['videomaker', 'editor', 'audiovisual', 'video'].includes(s.role?.toLowerCase()));
    },
    enabled: isStaff,
  });

  // Fetch client_services for revenue display in table
  const { data: squads } = useQuery({
    queryKey: ['staff-squads-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_squads').select('*').order('name');
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const { data: allClientServices = [] } = useQuery({
    queryKey: ['all-client-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_services').select('*, services(name)').eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const { data: uniqueNiches = [] } = useQuery({
    queryKey: ['unique-niches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('business_segment');
      if (error) throw error;
      const niches = Array.from(new Set(data.map(c => c.business_segment).filter(Boolean)));
      return niches.sort();
    },
    enabled: isStaff,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_members').select('id, full_name, role');
      if (error) throw error;
      return data;
    },
    enabled: isStaff,
  });

  const { data: latestSurveys = [] } = useQuery({
    queryKey: ['latest-client-surveys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_satisfaction_surveys')
        .select('client_id, score, responded_at')
        .not('responded_at', 'is', null)
        .order('responded_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isStaff,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: newClient, error } = await supabase.from('clients').insert({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        designer_id: data.designer_id || null,
        social_media_staff_id: data.social_media_staff_id || null,
        head_marketing_id: data.head_marketing_id || null,
        traffic_manager_id: data.traffic_manager_id || null,
        closer_id: data.closer_id || null,
        editor_id: data.editor_id || null,
        videomaker_id: data.videomaker_id || null,
        arts_per_month: parseInt(data.arts_per_month) || 4,
        contract_months: parseInt(data.contract_months) || 12,
        price_per_art: parseFloat(data.price_per_art) || 0,
        logo_url: data.logo_url || null,
        has_consulting_service: data.has_consulting_service,
        has_design_service: data.has_design_service,
        consulting_months_contracted: parseInt(data.consulting_months_contracted) || 0,
        consulting_price_per_month: parseFloat(data.consulting_price_per_month) || 0,
        contract_type: data.contract_type || 'recurring',
        contract_model: data.contract_model || 'MRR',
        setup_fee: parseFloat(data.setup_fee) || 0,
        contract_file_url: data.contract_file_url || null,
        contract_start_date: data.contract_start_date || today,
        contract_end_date: data.contract_end_date || calculateEndDate(data.contract_start_date || today, data.contract_months || '12'),
        acquisition_channel: data.acquisition_channel || null,
        meta_ad_account_id: data.meta_ad_account_id || null,
        business_segment: data.business_segment || null,
        squad_id: data.squad_id || null,
        show_on_site: data.show_on_site,
        client_type: data.client_type,
        billing_day: parseInt(data.billing_day) || 1,
        brief_summary: data.brief_summary || null,
        strategy_notes: data.strategy_notes || null,
      } as any).select('id').single();
      if (error) throw error;
      return newClient;
    },
    onSuccess: async (newClient) => {
      // Restore scroll position
      setTimeout(() => {
        window.scrollTo(0, tableScrollY);
      }, 100);

      if (formData.squad_id && newClient) {
        // Automatically link squad members
        const { data: squadMembers } = await supabase
          .from('staff_squad_members')
          .select('staff_id, role')
          .eq('squad_id', formData.squad_id);

        if (squadMembers && squadMembers.length > 0) {
          // Use upsert to avoid unique constraint issues on (client_id, staff_member_id)
          const assignments = squadMembers.map(m => ({
            client_id: newClient.id,
            staff_member_id: m.staff_id,
            role_in_client: 'Squad Member',
            responsibility_percent: 0,
            commission_percent: 0
          }));
          
          await supabase.from('client_team_assignments').upsert(assignments, {
            onConflict: 'client_id, staff_member_id'
          });

          // Also try to set direct roles if members match roles
          const updates: any = {};
          squadMembers.forEach(s => {
            if (s.role === 'designer' && !updates.designer_id) updates.designer_id = s.staff_id;
            if (s.role === 'social_media' && !updates.social_media_staff_id) updates.social_media_staff_id = s.staff_id;
          });
          if (Object.keys(updates).length > 0) {
            await supabase.from('clients').update(updates).eq('id', newClient.id);
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente cadastrado! Squad e serviços vinculados.');
      if (newClient) {
        setEditingClient({ id: newClient.id, name: formData.name } as any);
        setDialogTab('overview');
      }
    },
    onError: (error: any) => toast.error('Erro ao cadastrar: ' + error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { data: oldClient } = await supabase.from('clients').select('squad_id').eq('id', id).single();
      
      const { error } = await supabase.from('clients').update({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        designer_id: data.designer_id || null,
        social_media_staff_id: data.social_media_staff_id || null,
        head_marketing_id: data.head_marketing_id || null,
        traffic_manager_id: data.traffic_manager_id || null,
        closer_id: data.closer_id || null,
        editor_id: data.editor_id || null,
        videomaker_id: data.videomaker_id || null,
        arts_per_month: parseInt(data.arts_per_month) || 4,
        contract_months: parseInt(data.contract_months) || 12,
        price_per_art: parseFloat(data.price_per_art) || 0,
        logo_url: data.logo_url || null,
        has_consulting_service: data.has_consulting_service,
        has_design_service: data.has_design_service,
        consulting_months_contracted: parseInt(data.consulting_months_contracted) || 0,
        consulting_price_per_month: parseFloat(data.consulting_price_per_month) || 0,
        contract_type: data.contract_type || 'recurring',
        contract_model: data.contract_model || 'MRR',
        setup_fee: parseFloat(data.setup_fee) || 0,
        contract_file_url: data.contract_file_url || null,
        contract_start_date: data.contract_start_date || today,
        contract_end_date: data.contract_end_date || calculateEndDate(data.contract_start_date || today, data.contract_months || '12'),
        acquisition_channel: data.acquisition_channel || null,
        meta_ad_account_id: data.meta_ad_account_id || null,
        business_segment: data.business_segment || null,
        squad_id: data.squad_id || null,
        show_on_site: data.show_on_site,
        client_type: data.client_type,
        billing_day: parseInt(data.billing_day) || 1,
        brief_summary: data.brief_summary || null,
        strategy_notes: data.strategy_notes || null,
      } as any).eq('id', id);

      if (error) throw error;

      if (data.squad_id && data.squad_id !== oldClient?.squad_id) {
        const { data: squadMembers } = await supabase
          .from('staff_squad_members')
          .select('staff_id')
          .eq('squad_id', data.squad_id);

        if (squadMembers && squadMembers.length > 0) {
          // ... keep existing code
          const assignments = squadMembers.map(m => ({
            client_id: id,
            staff_member_id: m.staff_id,
            role_in_client: 'Squad Member',
            responsibility_percent: 0,
            commission_percent: 0
          }));
          
          await supabase.from('client_team_assignments').upsert(assignments, {
            onConflict: 'client_id, staff_member_id'
          });
        }
      }
    },
    onSuccess: () => {
      // Use setQueryData to update the local cache instantly without a full refetch
      // which would cause the table to re-render and lose scroll position
      queryClient.setQueryData(['clients'], (old: any[]) => {
        if (!old) return [];
        return old.map(c => {
          if (c.id === editingClient?.id) {
            return {
              ...c,
              ...formData,
              // Keep complex joined fields that are not in formData
              designer: c.designer
            };
          }
          return c;
        });
      });
      
      // Still invalidate but more selectively or with options to prevent flashing
      queryClient.invalidateQueries({ queryKey: ['clients'], exact: true, refetchType: 'none' });
      
      // Restore scroll position after a short delay to allow for DOM updates
      setTimeout(() => {
        window.scrollTo(0, tableScrollY);
      }, 100);
      toast.success('Cliente atualizado!');
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active, reason }: { id: string; is_active: boolean; reason?: string }) => {
      const { error } = await supabase.from('clients').update({ 
        is_active,
        lost_reason: is_active ? null : (reason || null),
        lost_at: is_active ? null : new Date().toISOString()
      }).eq('id', id);
      
      if (error) throw error;
      // Register churn event when marking as lost
      if (!is_active && reason) {
        await supabase.from('client_events').insert({
          client_id: id,
          event_type: 'churned',
          notes: reason,
          event_date: new Date().toISOString(),
        });
      }
      // Register reactivation event
      if (is_active) {
        await supabase.from('client_events').insert({
          client_id: id,
          event_type: 'reactivated',
          notes: 'Cliente reativado',
          event_date: new Date().toISOString(),
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(variables.is_active ? 'Cliente reativado!' : 'Cliente marcado como perdido!');
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('client_services').delete().eq('client_id', id);
      await supabase.from('client_team_assignments').delete().eq('client_id', id);
      await supabase.from('framework_answers').delete().in('instance_id',
        (await supabase.from('framework_instances').select('id').in('consulting_month_id',
          (await supabase.from('consulting_months').select('id').eq('client_id', id)).data?.map(d => d.id) || []
        )).data?.map(d => d.id) || []
      );
      await supabase.from('framework_instances').delete().in('consulting_month_id',
        (await supabase.from('consulting_months').select('id').eq('client_id', id)).data?.map(d => d.id) || []
      );
      await supabase.from('consulting_months').delete().eq('client_id', id);
      await supabase.from('arts').delete().in('work_month_id',
        (await supabase.from('work_months').select('id').eq('client_id', id)).data?.map(d => d.id) || []
      );
      await supabase.from('work_months').delete().eq('client_id', id);
      await supabase.from('client_strategic_data').delete().eq('client_id', id);
      await supabase.from('answer_templates').delete().eq('client_id', id);
      await supabase.from('notifications').delete().eq('client_id', id);
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente excluído!');
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  if (!isStaff) return <Navigate to="/dashboard" replace />;

  const calculateEndDate = (startDate: string, months: string) => {
    if (!startDate || !months) return '';
    try {
      const date = parseISO(startDate);
      const m = parseInt(months);
      if (isNaN(m)) return '';
      return format(addMonths(date, m), 'yyyy-MM-dd');
    } catch (e) {
      return '';
    }
  };

  const resetForm = () => {
    setFormData({
      client_type: 'recurring',
      name: '', email: '', phone: '', designer_id: '', social_media_staff_id: '',
      head_marketing_id: '', traffic_manager_id: '', closer_id: '', editor_id: '',
      videomaker_id: '',
      arts_per_month: '4', contract_months: '12', price_per_art: '', logo_url: '',
      has_consulting_service: false, has_design_service: true, consulting_months_contracted: '0',
      consulting_price_per_month: '', contract_type: 'recurring', 
      contract_model: 'MRR', setup_fee: '0', contract_file_url: '',
      contract_start_date: today,
      contract_end_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
      acquisition_channel: '', meta_ad_account_id: '', business_segment: '',
      squad_id: '',
      show_on_site: false,
      billing_day: '1',
      brief_summary: '',
      strategy_notes: '',
    });

    setEditingClient(null);
    setIsDialogOpen(false);
    setDialogTab('info');
  };

  const handleEdit = (client: any, initialTab: 'info' | 'services' | 'access' = 'info') => {
    setTableScrollY(window.scrollY);
    setEditingClient(client);
    
    setFormData({
      client_type: (client as any).client_type || 'recurring',
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      designer_id: client.designer_id || '',
      social_media_staff_id: client.social_media_staff_id || '',
      head_marketing_id: client.head_marketing_id || '',
      traffic_manager_id: client.traffic_manager_id || '',
      closer_id: client.closer_id || '',
      editor_id: client.editor_id || '',
      videomaker_id: (client as any).videomaker_id || '',
      arts_per_month: (client.arts_per_month || 0).toString(),
      contract_months: (client.contract_months || 0).toString(),
      price_per_art: (client.price_per_art || 0).toString(),
      logo_url: client.logo_url || '',
      has_consulting_service: client.has_consulting_service || false,
      has_design_service: client.has_design_service !== false,
      consulting_months_contracted: (client.consulting_months_contracted || 0).toString(),
      consulting_price_per_month: (client.consulting_price_per_month || 0).toString(),
      contract_type: client.contract_type || 'recurring',
      contract_model: (client as any).contract_model || 'MRR',
      setup_fee: ((client as any).setup_fee || 0).toString(),
      contract_file_url: (client as any).contract_file_url || '',
      contract_start_date: client.contract_start_date || today,
      contract_end_date: client.contract_end_date || calculateEndDate(client.contract_start_date || today, (client.contract_months || 12).toString()),
      acquisition_channel: client.acquisition_channel || '',
      meta_ad_account_id: (client as any).meta_ad_account_id || '',
      business_segment: client.business_segment || '',
      squad_id: client.squad_id || '',
      show_on_site: client.show_on_site || false,
      billing_day: (client.billing_day || 1).toString(),
      brief_summary: (client as any).brief_summary || '',
      strategy_notes: (client as any).strategy_notes || '',
    });

    setDialogTab(initialTab);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) { toast.error('O nome é obrigatório'); return; }
    if (!formData.phone) { toast.error('O telefone (WhatsApp) é obrigatório para notificações'); return; }
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const copyPortalLink = (portalToken: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/portal/${portalToken}`);
    toast.success('Link copiado!');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const [clientTypeFilter, setClientTypeFilter] = useState<'all' | 'recurring' | 'one-off' | 'tcv'>('all');

  const filteredClients = (clients || []).filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = showInactive ? client.is_active === false : client.is_active !== false;
    
    let matchesType = true;
    if (clientTypeFilter === 'recurring') matchesType = client.client_type === 'recurring' && client.contract_model !== 'TCV';
    if (clientTypeFilter === 'one-off') matchesType = client.client_type === 'one-off';
    if (clientTypeFilter === 'tcv') matchesType = client.contract_model === 'TCV';

    return matchesSearch && matchesStatus && matchesType;
  });

  const getHealthStatus = (nps: string | number | null) => {
    if (nps === null || nps === '') return { label: 'Sem NPS', color: 'bg-muted text-muted-foreground', emoji: '⚪' };
    const score = typeof nps === 'string' ? parseInt(nps) : nps;
    if (score >= 9) return { label: 'Saudável', color: 'bg-green-500/10 text-green-500 border-green-500/30', emoji: '🟢' };
    if (score >= 7) return { label: 'Em Observação', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', emoji: '🟡' };
    return { label: 'Risco de Churn', color: 'bg-red-500/10 text-red-500 border-red-500/30', emoji: '🔴' };
  };

  const getContractProgress = (client: Client) => {
    const startDate = client.contract_start_date ? new Date(client.contract_start_date) : new Date(client.created_at);
    const elapsed = differenceInMonths(new Date(), startDate) + 1;
    const total = client.contract_months || 12;
    return { elapsed: Math.max(0, Math.min(elapsed, total)), total };
  };

  const getClientMonthlyRevenue = (clientId: string) => {
    const services = allClientServices.filter(cs => cs.client_id === clientId);
    if (services.length > 0) {
      return services.reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
    }
    // Fallback to legacy fields
    const client = clients?.find(c => c.id === clientId);
    if (!client) return 0;
    const design = client.has_design_service ? (client.price_per_art || 0) * (client.arts_per_month || 0) : 0;
    const consulting = client.has_consulting_service ? (client.consulting_price_per_month || 0) : 0;
    return design + consulting;
  };

  const getClientStaffNames = (client: any) => {
    const staff = [];
    if (client.squad_id) {
      const squad = squads?.find(s => s.id === client.squad_id);
      if (squad) staff.push({ name: squad.name, icon: Users, isSquad: true });
    } else {
      if (client.head_marketing_id) {
        const s = allUsers.find(u => u.id === client.head_marketing_id);
        if (s) staff.push({ name: s.full_name, icon: Award });
      }
      if (client.social_media_staff_id) {
        const s = allUsers.find(u => u.id === client.social_media_staff_id);
        if (s) staff.push({ name: s.full_name, icon: Calendar });
      }
      if (client.designer_id) {
        const s = allUsers.find(u => u.id === client.designer_id);
        if (s) staff.push({ name: s.full_name, icon: Palette });
      }
      if (client.traffic_manager_id) {
        const s = allUsers.find(u => u.id === client.traffic_manager_id);
        if (s) staff.push({ name: s.full_name, icon: Target });
      }
      if (client.editor_id) {
        const s = allUsers.find(u => u.id === client.editor_id);
        if (s) staff.push({ name: s.full_name, icon: Video });
      }
      if (client.videomaker_id) {
        const s = allUsers.find(u => u.id === client.videomaker_id);
        if (s) staff.push({ name: s.full_name, icon: Video });
      }
    }
    return staff;
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in px-1 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-primary">Clientes</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie sua carteira de clientes ativos e inativos</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg border">
            <Button
              variant={clientTypeFilter === 'all' && !showInactive ? "default" : "ghost"}
              size="sm"
              onClick={() => { setShowInactive(false); setClientTypeFilter('all'); }}
              className="text-xs h-8"
            >
              Todos
            </Button>
            <Button
              variant={clientTypeFilter === 'recurring' && !showInactive ? "default" : "ghost"}
              size="sm"
              onClick={() => { setShowInactive(false); setClientTypeFilter('recurring'); }}
              className="text-xs h-8"
            >
              Fixo
            </Button>
            <Button
              variant={clientTypeFilter === 'tcv' && !showInactive ? "default" : "ghost"}
              size="sm"
              onClick={() => { setShowInactive(false); setClientTypeFilter('tcv'); }}
              className="text-xs h-8"
            >
              TCV
            </Button>
            <Button
              variant={clientTypeFilter === 'one-off' && !showInactive ? "default" : "ghost"}
              size="sm"
              onClick={() => { setShowInactive(false); setClientTypeFilter('one-off'); }}
              className="text-xs h-8"
            >
              Avulso
            </Button>
            <Button
              variant={showInactive ? "destructive" : "ghost"}
              size="sm"
              onClick={() => setShowInactive(true)}
              className="text-xs h-8"
            >
              <UserX className="h-3.5 w-3.5 mr-1" />
              Perdidos
            </Button>
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
              aria-label="Buscar clientes"
            />
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto h-10" onClick={() => setTableScrollY(window.scrollY)}>
                  <Plus className="mr-2 h-4 w-4" />Novo Cliente
                </Button>

              </DialogTrigger>
          
          
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
              <DialogHeader className="shrink-0 pb-2">
                <DialogTitle>{editingClient ? `Editar — ${editingClient.name}` : 'Novo Cliente'}</DialogTitle>
                <DialogDescription>
                  {editingClient ? 'Configure informações, responsáveis e serviços' : 'Preencha os dados e depois configure os serviços'}
                </DialogDescription>
              </DialogHeader>

              <Tabs value={dialogTab} onValueChange={setDialogTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-5 shrink-0">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="services" disabled={!editingClient}>Serviços</TabsTrigger>
                  <TabsTrigger value="journey" disabled={!editingClient}>Jornada</TabsTrigger>
                  <TabsTrigger value="files" disabled={!editingClient}>Arquivos</TabsTrigger>
                  <TabsTrigger value="access" disabled={!editingClient}>Acesso</TabsTrigger>
                </TabsList>


                <TabsContent value="info" className="flex-1 mt-0">
                  <div className="overflow-y-auto max-h-[60vh] pr-4">
                    <form onSubmit={handleSubmit} id="client-form" className="py-2 space-y-8">
                      {/* Section 1: Identificação */}
                      <section className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-bold">Identificação do Cliente</h3>
                          </div>
                          
                          <div className="flex gap-1 p-1 bg-muted rounded-lg border">
                            <Button 
                              type="button" 
                              variant={formData.client_type === 'recurring' && formData.contract_model !== 'TCV' ? 'default' : 'ghost'} 
                              size="sm" 
                              className="h-7 text-[10px] px-2"
                              onClick={() => setFormData({ 
                                ...formData, 
                                client_type: 'recurring',
                                contract_type: 'recurring',
                                contract_model: 'MRR'
                              })}
                            >
                              Fixo / Mensal
                            </Button>
                            <Button 
                              type="button" 
                              variant={formData.contract_model === 'TCV' ? 'default' : 'ghost'} 
                              size="sm" 
                              className="h-7 text-[10px] px-2"
                              onClick={() => setFormData({ 
                                ...formData, 
                                client_type: 'recurring',
                                contract_type: 'recurring',
                                contract_model: 'TCV'
                              })}
                            >
                              TCV
                            </Button>
                            <Button 
                              type="button" 
                              variant={formData.client_type === 'one-off' ? 'default' : 'ghost'} 
                              size="sm" 
                              className="h-7 text-[10px] px-2"
                              onClick={() => setFormData({ 
                                ...formData, 
                                client_type: 'one-off',
                                contract_type: 'project',
                                contract_model: 'One-off'
                              })}
                            >
                              Avulso
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                          <div className="md:col-span-3 flex flex-col items-center justify-center space-y-2">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Logo</Label>
                            <ImageUpload
                              bucket="client-logos"
                              folder={editingClient?.id || 'new'}
                              currentUrl={formData.logo_url || undefined}
                              onUpload={(url) => setFormData({ ...formData, logo_url: url })}
                              onRemove={() => setFormData({ ...formData, logo_url: '' })}
                            />
                          </div>
                          
                          <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2 space-y-2">
                              <Label className="text-sm font-semibold">Nome da Empresa / Cliente *</Label>
                              <Input 
                                value={formData.name} 
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                                placeholder="Ex: Peformake" 
                                required 
                                className="h-10 border-muted-foreground/20 focus:border-primary" 
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Nicho / Segmento</Label>
                              {!isAddingNewNiche ? (
                                <Select 
                                  value={formData.business_segment || '__none__'} 
                                  onValueChange={(v) => {
                                    if (v === 'Outro') {
                                      setIsAddingNewNiche(true);
                                      setNewNiche('');
                                    } else {
                                      setFormData({ ...formData, business_segment: v === '__none__' ? '' : v });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Selecione o nicho" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="p-2 border-b">
                                      <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                          placeholder="Buscar nicho..." 
                                          value={nicheSearch}
                                          onChange={(e) => setNicheSearch(e.target.value)}
                                          className="h-8 pl-8 text-xs"
                                        />
                                      </div>
                                    </div>
                                    <ScrollArea className="h-[200px]">
                                      <SelectItem value="__none__">Não informado</SelectItem>
                                      {Array.from(new Set([
                                        "Odontologia", "Estética / Beleza", "Saúde", "E-commerce", 
                                        "Restaurante / Gastronomia", "Imobiliário", "Educação", 
                                        "Fitness / Academia", "Moda", "Advocacia / Jurídico", 
                                        "Contabilidade", "Pet Shop", "Automotivo", "Tecnologia", 
                                        "Construção Civil", "Varejo", "Serviços Gerais",
                                        ...uniqueNiches.filter(n => 
                                          !n.includes("Food Service Distribuição") && 
                                          !n.includes("Automotivo Subnicho")
                                        )
                                      ]))
                                      .filter(n => n.toLowerCase().includes(nicheSearch.toLowerCase()))
                                      .map(n => (
                                        <SelectItem key={n} value={n}>{n}</SelectItem>
                                      ))}
                                      <SelectItem value="Outro" className="font-bold text-primary">+ Adicionar Novo</SelectItem>
                                    </ScrollArea>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="flex gap-2">
                                  <Input 
                                    value={newNiche} 
                                    onChange={(e) => setNewNiche(e.target.value)} 
                                    placeholder="Digite o novo nicho"
                                    className="h-10"
                                    autoFocus
                                  />
                                  <Button 
                                    type="button" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (newNiche.trim()) {
                                        setFormData({ ...formData, business_segment: newNiche.trim() });
                                        setIsAddingNewNiche(false);
                                        setNewNiche('');
                                      }
                                    }}
                                  >
                                    OK
                                  </Button>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setIsAddingNewNiche(false);
                                    }}
                                  >
                                    X
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">WhatsApp / Telefone *</Label>
                              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" required className="h-10" />
                            </div>

                            <div className="sm:col-span-2 space-y-2">
                              <Label className="text-sm font-semibold">E-mail de Contato</Label>
                              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contato@empresa.com" className="h-10" />
                            </div>

                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                              <Eye className="h-4 w-4 text-primary" /> Exibir no Site
                            </Label>
                            <p className="text-xs text-muted-foreground">Mostrar o logo deste cliente na galeria da página inicial</p>
                          </div>
                          <Button
                            type="button"
                            variant={formData.show_on_site ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFormData({ ...formData, show_on_site: !formData.show_on_site })}
                            className="w-24"
                          >
                            {formData.show_on_site ? (
                              <><Eye className="mr-2 h-3 w-3" /> Ativo</>
                            ) : (
                              <><EyeOff className="mr-2 h-3 w-3" /> Inativo</>
                            )}
                          </Button>
                        </div>
                      </section>

                      {/* Section 2: Equipe */}
                      <section className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Users className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-bold">Equipe & Responsáveis</h3>
                        </div>

                        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-bold flex items-center gap-2">
                                Atribuição Automática por Squad
                              </Label>
                              <p className="text-[11px] text-muted-foreground">Preenche todos os responsáveis de uma só vez</p>
                            </div>
                            <Badge variant="outline" className="bg-white text-[10px] uppercase font-bold text-primary border-primary/20">Recomendado</Badge>
                          </div>
                          
                          <Select 
                            value={formData.squad_id} 
                            onValueChange={async (squadId) => {
                              if (!squadId || squadId === '__none__') {
                                setFormData({ ...formData, squad_id: '' });
                                return;
                              }

                              const { data: members, error } = await supabase
                                .from('staff_squad_members')
                                .select('staff_id, role, staff_members(id, full_name, role)')
                                .eq('squad_id', squadId);

                              if (error) {
                                toast.error("Erro ao buscar membros do squad");
                                return;
                              }

                              const squadMembers = members.map(m => ({
                                id: m.staff_id,
                                role: (m as any).staff_members?.role || m.role
                              }));
                              
                              const findByRole = (rolePatterns: string[]) => 
                                squadMembers.find(u => rolePatterns.some(p => u.role?.toLowerCase().includes(p)))?.id || '';

                              const headId = findByRole(['head', 'leader', 'admin', 'diretor', 'gestor', 'diretoria']);
                              const smId = findByRole(['social', 'media', 'midia', 'social_media']);
                              const designerId = findByRole(['designer', 'design', 'arte', 'diretor_arte']);
                              const trafficId = findByRole(['trafego', 'traffic', 'gestor_trafego']);
                              const editorId = findByRole(['editor', 'montador']);
                              const videomakerId = findByRole(['video', 'audiovisual', 'videomaker', 'maker']);

                              setFormData({ 
                                ...formData, 
                                squad_id: squadId,
                                head_marketing_id: headId || formData.head_marketing_id,
                                social_media_staff_id: smId || formData.social_media_staff_id,
                                designer_id: designerId || formData.designer_id,
                                traffic_manager_id: trafficId || formData.traffic_manager_id,
                                editor_id: editorId || formData.editor_id,
                                videomaker_id: videomakerId || formData.videomaker_id
                              });
                            }}
                          >
                            <SelectTrigger className="h-12 bg-white border-primary/30 shadow-sm text-base">
                              <SelectValue placeholder="Escolha um Squad" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Definir membros manualmente</SelectItem>
                              {squads?.filter(s => !!s.id).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                              <Award className="h-3 w-3 text-indigo-500" /> Head
                            </Label>
                            <Select value={formData.head_marketing_id || '__none__'} onValueChange={(v) => setFormData({ ...formData, head_marketing_id: v === '__none__' ? '' : v })}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Nenhum</SelectItem>
                                {adminStaff?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3 text-sky-500" /> Social Media
                            </Label>
                            <Select value={formData.social_media_staff_id || '__none__'} onValueChange={(v) => setFormData({ ...formData, social_media_staff_id: v === '__none__' ? '' : v })}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Nenhum</SelectItem>
                                {socialMediaStaff?.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                              <Palette className="h-3 w-3 text-pink-500" /> Designer
                            </Label>
                            <Select value={formData.designer_id || '__none__'} onValueChange={(v) => setFormData({ ...formData, designer_id: v === '__none__' ? '' : v })}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Nenhum</SelectItem>
                                {staffDesigners?.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                              <Zap className="h-3 w-3 text-purple-500" /> Tráfego
                            </Label>
                            <Select value={formData.traffic_manager_id || '__none__'} onValueChange={(v) => setFormData({ ...formData, traffic_manager_id: v === '__none__' ? '' : v })}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Nenhum</SelectItem>
                                {trafficStaff?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>


                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                              <Video className="h-3 w-3 text-red-500" /> Editor
                            </Label>
                            <Select value={formData.editor_id || '__none__'} onValueChange={(v) => setFormData({ ...formData, editor_id: v === '__none__' ? '' : v })}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Nenhum</SelectItem>
                                {audiovisualStaff?.filter(s => s.role === 'editor').map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                              <Video className="h-3 w-3 text-orange-500" /> Videomaker
                            </Label>
                            <Select value={formData.videomaker_id || '__none__'} onValueChange={(v) => setFormData({ ...formData, videomaker_id: v === '__none__' ? '' : v })}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Nenhum</SelectItem>
                                {audiovisualStaff?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </section>

                      {/* Section 3: Comercial */}
                      <section className="space-y-4 pb-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Calendar className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-bold">Investimento & Contrato</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-muted/20 p-4 rounded-lg border">
                          {formData.client_type === 'one-off' ? (
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Valor do Projeto</Label>
                              <Input 
                                type="number" 
                                value={formData.setup_fee} 
                                onChange={(e) => setFormData({ ...formData, setup_fee: e.target.value })} 
                                placeholder="0,00" 
                                className="h-10 bg-background" 
                              />
                            </div>
                          ) : formData.contract_model === 'TCV' ? (
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Investimento Total (TCV)</Label>
                              <div className="p-2 bg-background border rounded h-10 flex items-center font-bold text-primary">
                                {formatCurrency(getClientMonthlyRevenue(editingClient?.id || ''))}
                              </div>
                              <p className="text-[10px] text-muted-foreground italic">Soma de todos os serviços selecionados</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Valor do Serviço Mensal (MRR)</Label>
                              <div className="p-2 bg-background border rounded h-10 flex items-center font-bold text-primary">
                                {formatCurrency(getClientMonthlyRevenue(editingClient?.id || ''))}
                              </div>
                              <p className="text-[10px] text-muted-foreground italic">Puxado automaticamente dos serviços ativos</p>
                            </div>
                          )}
                          
                          {(formData.client_type === 'recurring' || (formData.client_type === 'one-off' && formData.contract_model === 'TCV')) && (
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Duração do Contrato</Label>
                              <Select 
                                value={formData.contract_months} 
                                onValueChange={(v) => {
                                  const newEndDate = calculateEndDate(formData.contract_start_date, v);
                                  setFormData({ ...formData, contract_months: v, contract_end_date: newEndDate });
                                }}
                              >
                                <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">Trimestral (3 meses)</SelectItem>
                                  <SelectItem value="6">Semestral (6 meses)</SelectItem>
                                  <SelectItem value="12">Anual (12 meses)</SelectItem>
                                  <SelectItem value="24">Bienal (24 meses)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Vencimento (Dia)</Label>
                            <Input 
                              type="number" 
                              min="1" 
                              max="31" 
                              value={formData.billing_day} 
                              onChange={(e) => setFormData({ ...formData, billing_day: e.target.value })} 
                              placeholder="Ex: 10" 
                              className="h-10 bg-background" 
                            />
                          </div>
                        </div>

                        {(formData.client_type === 'recurring' || formData.contract_model === 'TCV') && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg">


                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Início</Label>
                              <Input 
                                type="date" 
                                value={formData.contract_start_date} 
                                onChange={(e) => {
                                  const newStartDate = e.target.value;
                                  const newEndDate = calculateEndDate(newStartDate, formData.contract_months);
                                  setFormData({ ...formData, contract_start_date: newStartDate, contract_end_date: newEndDate });
                                }} 
                                className="h-10" 
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Fim</Label>
                              <Input type="date" value={formData.contract_end_date} onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })} className="h-10" />
                            </div>

                            <div className="sm:col-span-2 space-y-2">
                              <Label className="text-sm font-semibold flex items-center gap-1">Contrato (PDF)</Label>
                              <FileUpload
                                bucket="client-contracts"
                                folder={editingClient?.id || 'new'}
                                currentUrl={formData.contract_file_url || undefined}
                                onUpload={(url) => setFormData({ ...formData, contract_file_url: url })}
                                onRemove={() => setFormData({ ...formData, contract_file_url: '' })}
                                accept="application/pdf"
                                label="Upload Contrato PDF"
                              />
                            </div>

                            <div className="sm:col-span-2 space-y-2">
                              <Label className="text-sm font-semibold">Canal de Aquisição</Label>
                              <Select value={formData.acquisition_channel} onValueChange={(v) => setFormData({ ...formData, acquisition_channel: v })}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Como chegou?" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Indicação">Indicação</SelectItem>
                                  <SelectItem value="Google Ads">Google Ads</SelectItem>
                                  <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                                  <SelectItem value="Instagram (Orgânico)">Instagram (Orgânico)</SelectItem>
                                  <SelectItem value="Cold Outreach">Cold Outreach</SelectItem>
                                  <SelectItem value="Outro">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="sm:col-span-4 pt-2 border-t mt-2">
                               <Label className="text-sm font-semibold text-primary">
                                {formData.contract_model === 'TCV' ? 'Investimento Total do Contrato (TCV)' : 'Faturamento Mensal Estimado'}
                              </Label>
                              <div className="h-12 flex items-center px-4 bg-primary/5 rounded-md border border-primary/20 font-bold text-xl text-primary mt-1">
                                {formData.contract_model === 'TCV' 
                                  ? formatCurrency((getClientMonthlyRevenue(editingClient?.id || '') * (parseInt(formData.contract_months) || 1)) + (parseFloat(formData.setup_fee) || 0))
                                  : formatCurrency(getClientMonthlyRevenue(editingClient?.id || '') + (parseFloat(formData.setup_fee) || 0))
                                }
                              </div>
                            </div>
                          </div>
                        )}
                      </section>
                    </form>
                  </div>
                  <DialogFooter className="pt-4 border-t shrink-0">
                    <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="min-w-[120px] bg-primary hover:bg-primary/90">
                      {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                    </Button>
                  </DialogFooter>
                </TabsContent>

                {/* SERVICES TAB */}
                <TabsContent value="services" className="flex-1 mt-0">
                  <div className="overflow-y-auto max-h-[60vh] pr-2">
                    {editingClient && (
                      <ClientServicesTab
                        clientId={editingClient.id}
                        clientName={editingClient.name}
                        metaAdAccountId={formData.meta_ad_account_id}
                        onMetaAdAccountIdChange={(v) => setFormData({ ...formData, meta_ad_account_id: v })}
                      />
                    )}
                  </div>
                </TabsContent>


                {/* FILES TAB */}
                <TabsContent value="files" className="flex-1 mt-0">
                  <div className="overflow-y-auto max-h-[60vh] pr-2">
                    {editingClient && <ClientFilesTab clientId={editingClient.id} />}
                  </div>
                </TabsContent>

                {/* JOURNEY TAB */}
                <TabsContent value="journey" className="flex-1 mt-0">
                  <div className="overflow-y-auto max-h-[60vh] pr-2 py-2">
                    {editingClient && (
                      <ClientJourneyTimeline clientId={editingClient.id} clientName={editingClient.name} />
                    )}
                  </div>
                </TabsContent>

                {/* ACCESS TAB */}
                <TabsContent value="access" className="flex-1 mt-0">
                  <div className="overflow-y-auto max-h-[60vh] pr-2">
                    {editingClient && (
                      <ClientAccessTab clientId={editingClient.id} clientEmail={formData.email} />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>

      {/* Lost Client Dialog */}
      <AlertDialog open={!!lostDialogClient} onOpenChange={(open) => { if (!open) setLostDialogClient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><UserX className="h-5 w-5 text-destructive" /> Marcar como Perdido</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente "{lostDialogClient?.name}" será marcado como perdido e ficará inativo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>Motivo da perda</Label>
            <Select value={lostReason} onValueChange={setLostReason}>
              <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cancelou por preço">Cancelou por preço</SelectItem>
                <SelectItem value="Insatisfação com resultado">Insatisfação com resultado</SelectItem>
                <SelectItem value="Mudou de agência">Mudou de agência</SelectItem>
                <SelectItem value="Fechou a empresa">Fechou a empresa</SelectItem>
                <SelectItem value="Internalizou o marketing">Internalizou o marketing</SelectItem>
                <SelectItem value="Fim do contrato">Fim do contrato</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!lostReason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (lostDialogClient) {
                  toggleActiveMutation.mutate({ id: lostDialogClient.id, is_active: false, reason: lostReason });
                  setLostDialogClient(null);
                }
              }}
            >
              Confirmar Perda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Lista de Clientes</CardTitle>
              <CardDescription>
                {clients?.filter(c => showInactive ? !c.is_active : c.is_active).length || 0} cliente(s) {showInactive ? 'inativos' : 'ativos'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
      <div className="space-y-4">
        {isLoading ? (
          <div className="px-4 py-8 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-8 w-[200px]" />
              <Skeleton className="h-8 w-[100px]" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[40%]" />
                    <Skeleton className="h-3 w-[20%]" />
                  </div>
                  <Skeleton className="h-6 w-[80px]" />
                  <Skeleton className="h-6 w-[80px]" />
                  <Skeleton className="h-6 w-[40px]" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Comece cadastrando seu primeiro cliente'}
            </p>
          </div>
        ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  {showInactive ? (
                    <>
                      <TableHead>Motivo da Perda</TableHead>
                      <TableHead>Data da Perda</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Responsáveis</TableHead>
                      <TableHead>Faturamento</TableHead>
                      <TableHead>Contrato</TableHead>
                    </>
                  )}
                  <TableHead>Saúde / NPS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const revenue = getClientMonthlyRevenue(client.id);
                  const progress = getContractProgress(client);
                  const pct = (progress.elapsed / progress.total) * 100;
                  
                  // Alerta de renovação (próximos 30 dias)
                  const isExpiringSoon = (client as any).contract_end_date && 
                    isAfter(parseISO((client as any).contract_end_date), new Date()) && 
                    isBefore(parseISO((client as any).contract_end_date), addDays(new Date(), 30));

                  return (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(client)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={client.logo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">{client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1 text-sm">
                              {client.name}
                              {isExpiringSoon && !showInactive && (
                                <FileWarning className="h-3.5 w-3.5 text-orange-500" />
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{client.business_segment || 'Nicho não definido'}</span>
                            {(client as any).contract_model === 'TCV' && !showInactive && (
                              <span className="text-[9px] text-primary font-bold uppercase tracking-tight">Contrato TCV</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {showInactive ? (
                        <>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] bg-destructive/5 text-destructive border-destructive/20 uppercase font-bold px-2 py-0">
                              {(client as any).lost_reason || 'Não informado'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {(client as any).lost_at ? new Date((client as any).lost_at).toLocaleDateString('pt-BR') : '---'}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {client.squad_id && squads?.find(s => s.id === client.squad_id) ? (
                                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-bold w-fit">
                                  {squads.find(s => s.id === client.squad_id)?.name}
                                </Badge>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  {getClientStaffNames(client).map((s, idx) => (
                                    <div key={idx} className="flex items-center gap-1 text-[11px] leading-tight">
                                      <s.icon className="h-2.5 w-2.5 text-muted-foreground" />
                                      <span>{s.name}</span>
                                    </div>
                                  ))}
                                  {getClientStaffNames(client).length === 0 && (
                                    <span className="text-[10px] text-muted-foreground italic">Nenhum responsável</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              {client.client_type === 'one-off' ? (
                                <>
                                  <span className="font-semibold text-sm">{formatCurrency(revenue > 0 ? revenue : parseFloat((client as any).setup_fee || '0'))}</span>
                                  <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">Valor do Projeto</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold text-sm">{formatCurrency(revenue)}</span>
                                   {(client as any).contract_model === 'TCV' && (
                                    <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
                                      <TrendingUp className="h-2.5 w-2.5" /> TCV Total: {formatCurrency((revenue * (client.contract_months || 1)) + ((client as any).setup_fee || 0))}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {client.client_type === 'one-off' ? (
                                <Badge variant="outline" className="text-[10px] w-fit px-2 h-4 border-primary/30 text-primary font-bold">
                                  AVULSO
                                </Badge>
                              ) : (
                                <>
                                  <Badge variant={pct >= 100 ? 'destructive' : pct >= 80 ? 'secondary' : 'outline'} className="text-[10px] w-fit px-1 h-4">
                                    {progress.elapsed}/{client.contract_months || 12} meses
                                  </Badge>
                                  {(client as any).contract_start_date && (client as any).contract_end_date && (
                                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                                      {format(parseISO((client as any).contract_start_date), 'dd/MM/yy')} - {format(parseISO((client as any).contract_end_date), 'dd/MM/yy')}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </>
                      )}

                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const latestNps = latestSurveys.find(s => s.client_id === client.id)?.score;
                            const health = getHealthStatus(latestNps);
                            return (
                              <Badge variant="outline" className={cn("text-[9px] uppercase font-bold py-0 h-4 w-fit", health.color)}>
                                {health.emoji} {health.label}
                              </Badge>
                            );
                          })()}
                          {(() => {
                            const latestNps = latestSurveys.find(s => s.client_id === client.id)?.score;
                            const score = latestNps;
                            return score !== null && score !== undefined && (
                              <span className="text-[10px] text-muted-foreground font-medium ml-1">Score: {score}</span>
                            );
                          })()}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={client.is_active ? 'default' : 'destructive'}
                          className={cn("text-[10px] uppercase font-bold", isAdmin ? 'cursor-pointer' : '')}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isAdmin) return;
                            if (client.is_active) {
                              setLostDialogClient(client);
                              setLostReason('');
                            } else {
                              toggleActiveMutation.mutate({ id: client.id, is_active: true });
                            }
                          }}
                        >
                          {client.is_active ? 'Ativo' : '❌ Perdido'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {client.phone && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-green-100 hover:text-green-600" 
                              title="WhatsApp do Cliente"
                              aria-label={`Abrir WhatsApp de ${client.name}`}
                              onClick={() => {
                                const phone = client.phone?.replace(/\D/g, '');
                                window.open(`https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}`, '_blank');
                              }}
                            >
                              <PhoneCall className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary" 
                            title="Abrir Portal"
                            onClick={() => window.open(`${window.location.origin}/portal/${client.portal_token}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary" 
                            title="Copiar Link do Portal"
                            aria-label="Copiar link do portal do cliente"
                            onClick={() => copyPortalLink(client.portal_token)}
                          >
                            <Copy className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary" 
                            aria-label={`Editar ${client.name}`}
                            title="Editar cliente"
                            onClick={() => handleEdit(client)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Excluir ${client.name}`}
                                title="Excluir cliente"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso removerá o cliente e TODOS os dados associados. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(client.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
