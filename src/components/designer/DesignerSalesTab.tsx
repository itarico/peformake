import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, Loader2, Send, TrendingUp, DollarSign, Target, Gift, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  staffId: string;
}

export default function DesignerSalesTab({ staffId }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    instagram: '',
  });

  const { data: staffMember } = useQuery({
    queryKey: ['staff-member-sales', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('id', staffId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: commissionTemplates } = useQuery({
    queryKey: ['commission-templates-designer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_commission_templates')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const createLeadMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase.from('crm_leads').insert({
        full_name: values.name,
        phone: values.phone,
        email: values.email || null,
        company: values.company || null,
        referred_by_member_id: staffId,
        source: 'referral',
        status: 'new',
        notes: values.instagram ? `Instagram: ${values.instagram}` : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Indicação enviada! Nossa equipe comercial entrará em contato em breve.');
      setForm({ name: '', phone: '', email: '', company: '', instagram: '' });
      queryClient.invalidateQueries({ queryKey: ['designer-referrals', staffId] });
    },
    onError: (error: any) => {
      toast.error('Erro ao cadastrar lead: ' + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error('Nome e Telefone são obrigatórios');
      return;
    }
    setLoading(true);
    await createLeadMutation.mutateAsync(form);
    setLoading(false);
  };

  const salesCommissions = commissionTemplates?.filter(c => 
    c.name.toLowerCase().includes('venda') || 
    c.name.toLowerCase().includes('indicação') ||
    c.name.toLowerCase().includes('conversão')
  ) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-md bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Indique e Ganhe! 🚀 (Marketing)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Conhece alguma empresa que precisa de marketing? Indique aqui e ganhe comissão sobre o fechamento!
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lead-name">Nome do Contato *</Label>
                    <Input
                      id="lead-name"
                      placeholder="Ex: João Silva"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-phone">WhatsApp/Telefone *</Label>
                    <Input
                      id="lead-phone"
                      placeholder="(00) 00000-0000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-instagram">Instagram da Empresa</Label>
                    <Input
                      id="lead-instagram"
                      placeholder="@empresa"
                      value={form.instagram}
                      onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-email">E-mail (Opcional)</Label>
                    <Input
                      id="lead-email"
                      type="email"
                      placeholder="joao@empresa.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="lead-company">Nome da Empresa / Segmento</Label>
                    <Input
                      id="lead-company"
                      placeholder="Ex: Restaurante do João / Gastronomia"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full gap-2 h-11 text-base" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    Enviar Indicação para o Comercial
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <DesignerReferralList staffId={staffId} />
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-md border-t-4 border-t-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Como funcionam as comissões?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold uppercase text-muted-foreground">Sua Comissão Atual</span>
                  <Badge className="bg-primary text-white text-lg px-3 py-1">
                    {staffMember?.indication_commission || 10}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Você recebe <strong>{staffMember?.indication_commission || 10}% de comissão</strong> sobre o valor total do primeiro contrato fechado de cada empresa que você indicar.
                </p>
                <div className="pt-2">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Gatilho de Crescimento</p>
                  <p className="text-[11px] text-muted-foreground italic">
                    Quanto mais você indica, maior sua visibilidade na agência e chances de bônus extras!
                  </p>
                </div>
              </div>
              
              <div className="pt-2 text-[11px] text-muted-foreground space-y-2">
                <div className="flex gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                  <p>O lead cai diretamente na Etapa 1 do CRM Comercial.</p>
                </div>
                <div className="flex gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                  <p>Se o lead converter em venda, sua comissão é gerada automaticamente.</p>
                </div>
                <div className="flex gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 shrink-0" />
                  <p>Você pode acompanhar o status de cada indicação em tempo real.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <Target className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold">Potencialize sua Renda!</h3>
                  <p className="text-xs text-primary-foreground/80">
                    Membros que indicam regularmente aumentam sua remuneração mensal em média 25%.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DesignerReferralList({ staffId }: { staffId: string }) {
  const { data: referrals, isLoading } = useQuery({
    queryKey: ['designer-referrals', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('id, full_name, status, created_at, company, sale_value')
        .eq('referred_by_member_id', staffId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: '1º Contato',
      negotiating: 'Negociação',
      qualified: 'Qualificado',
      meeting_scheduled: 'Agendado',
      show_up: 'Show-up',
      no_show: 'No-show',
      sale_completed: 'Venda Concluída 🎉',
      sale_lost: 'Perdido',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'sale_completed') return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
    if (status === 'sale_lost') return 'bg-rose-500/10 text-rose-600 border-rose-200';
    return 'bg-blue-500/10 text-blue-600 border-blue-200';
  };

  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">Minhas Indicações</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] text-xs">
                <p>Aqui você acompanha o progresso de cada empresa que indicou para nossa equipe comercial.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !referrals?.length ? (
          <div className="text-center py-10 space-y-3">
            <div className="bg-muted/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
              <UserPlus className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">Você ainda não indicou nenhum lead. Comece hoje mesmo!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/20 transition-all group">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm truncate">{lead.full_name}</p>
                    {lead.sale_value && lead.status === 'sale_completed' && (
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-emerald-600 border-emerald-200">
                        Venda: R$ {lead.sale_value}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    {lead.company || 'Segmento não informado'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(lead.status)}`}>
                    {getStatusLabel(lead.status)}
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
