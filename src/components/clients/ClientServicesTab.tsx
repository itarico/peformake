import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Package, Check, Save, Plus, Trash2, Lock } from 'lucide-react';


interface ClientServicesTabProps {
  clientId: string;
  clientName: string;
  metaAdAccountId?: string;
  onMetaAdAccountIdChange?: (value: string) => void;
}

interface Service {
  id: string;
  name: string;
  slug: string;
  default_price: number;
  is_active: boolean;
  pricing_model: 'single' | 'monthly' | 'tcv';
  contract_duration: number | null;
}

interface ServicePackage {
  id: string;
  name: string;
  is_active: boolean;
}

interface PackageService {
  id: string;
  package_id: string;
  service_id: string;
  price: number;
  quantity: number;
}

interface ClientService {
  id: string;
  client_id: string;
  service_id: string;
  package_id: string | null;
  price: number;
  quantity: number;
  is_active: boolean;
  notes: string | null;
  art_unit_label?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function ClientServicesTab({ clientId, clientName, metaAdAccountId, onMetaAdAccountIdChange }: ClientServicesTabProps) {
  const queryClient = useQueryClient();
  const isPriceLocked = true; // Totalmente Bloqueado as per user request
  const [localClientServices, setLocalClientServices] = useState<Partial<ClientService>[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').eq('is_active', true).order('display_order');
      if (error) throw error;
      return data as Service[];
    },
  });

  const { data: packages } = useQuery({
    queryKey: ['service-packages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('service_packages').select('*').eq('is_active', true).order('display_order');
      if (error) throw error;
      return data as ServicePackage[];
    },
  });

  const { data: allPackageServices } = useQuery({
    queryKey: ['package-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('package_services').select('*');
      if (error) throw error;
      return data as PackageService[];
    },
  });

  const { data: clientServices, isLoading } = useQuery({
    queryKey: ['client-services', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from('client_services').select('*').eq('client_id', clientId);
      if (error) throw error;
      return data as ClientService[];
    },
  });

  useEffect(() => {
    if (clientServices) {
      setLocalClientServices(clientServices.map(cs => ({ ...cs })));
    }
  }, [clientServices]);

  const addPackage = (packageId: string) => {
    if (packageId === 'none') return;
    const pkg = packages?.find(p => p.id === packageId);
    if (!pkg) return;

    const pkgSvcs = allPackageServices?.filter((ps) => ps.package_id === packageId) || [];
    
    // Add only services that are not already in the list
    const newItems = pkgSvcs
      .filter(ps => !localClientServices.some(cs => cs.service_id === ps.service_id))
      .map(ps => ({
        client_id: clientId,
        service_id: ps.service_id,
        package_id: packageId,
        price: ps.price,
        quantity: ps.quantity,
        is_active: true,
        art_unit_label: ''
      }));

    if (newItems.length === 0) {
      toast.info('Todos os serviços deste pacote já foram adicionados individualmente.');
      return;
    }

    setLocalClientServices(prev => [...prev, ...newItems]);
    setHasChanges(true);
    toast.success(`${newItems.length} serviço(s) do pacote "${pkg.name}" adicionado(s).`);
  };

  const addIndividualService = (serviceId: string) => {
    if (serviceId === 'none') return;
    const svc = services?.find(s => s.id === serviceId);
    if (!svc) return;

    const newItem = {
      client_id: clientId,
      service_id: serviceId,
      package_id: null,
      price: svc.default_price,
      quantity: 1,
      is_active: true,
      art_unit_label: ''
    };

    setLocalClientServices(prev => [...prev, newItem]);
    setHasChanges(true);
    toast.success(`Serviço "${svc.name}" adicionado.`);
  };

  const removeService = (index: number) => {
    setLocalClientServices(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateServiceRow = (index: number, data: Partial<ClientService>) => {
    setLocalClientServices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...data };
      return updated;
    });
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    onMutate: () => {
      // Invalidate both client-services and clients to ensure parent UI updates
      queryClient.invalidateQueries({ queryKey: ['client-services', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    mutationFn: async () => {
      const currentNow = new Date();
      const currentYearValue = currentNow.getFullYear();
      const currentMonthValue = currentNow.getMonth() + 1;

      // Delete existing
      await supabase.from('client_services').delete().eq('client_id', clientId);
      
      // Insert active ones
      if (localClientServices.length > 0) {
        const { error } = await supabase.from('client_services').insert(
          localClientServices.map((r) => ({
            client_id: clientId,
            service_id: r.service_id,
            package_id: r.package_id,
            price: r.price || 0,
            quantity: r.quantity || 1,
            is_active: true,
            art_unit_label: r.art_unit_label || null,
          }))
        );
        if (error) throw error;

        // One-off service integration with Financial (TeamProductionLog)
        const { data: clientData } = await supabase.from('clients').select('client_type').eq('id', clientId).single();
        if (clientData?.client_type === 'one-off') {
          // Add to TeamProductionLog for the current month
          const productionLogs = localClientServices.map(r => {
            const svc = services?.find(s => s.id === r.service_id);
            return {
              staff_member_id: '00000000-0000-0000-0000-000000000000', // System/Agency placeholder if no specific member
              client_id: clientId,
              year: currentYearValue,
              month: currentMonthValue,
              production_type: svc?.name || 'Serviço Avulso',
              quantity: r.quantity || 1,
              revenue_amount: (r.price || 0) * (r.quantity || 1),
              notes: 'Lançamento automático via serviço avulso'
            };
          });
          
          if (productionLogs.length > 0) {
            await supabase.from('team_production_logs').insert(productionLogs);
          }
        }
      }

      // Sync flags on clients table
      const activeRows = localClientServices;
      const hasConsulting = activeRows.some((r) => {
        const svc = services?.find((s) => s.id === r.service_id);
        return svc?.slug === 'consultoria';
      });
      const consultingRow = activeRows.find((r) => {
        const svc = services?.find((s) => s.id === r.service_id);
        return svc?.slug === 'consultoria';
      });
      
      const designRow = activeRows.find((r) => {
        const svc = services?.find((s) => s.id === r.service_id);
        return svc?.slug === 'design';
      });
      const hasDesign = !!designRow;
      const designQuantity = hasDesign ? (designRow.quantity || 4) : 0;

      const hasCrm = activeRows.some((r) => {
        const svc = services?.find((s) => s.id === r.service_id);
        return svc?.slug === 'crm';
      });

      const hasAudiovisual = activeRows.some((r) => {
        const svc = services?.find((s) => s.id === r.service_id);
        return svc && ['producao_audiovisual', 'captacao', 'edicao'].includes(svc.slug);
      });

      await supabase.from('clients').update({
        has_consulting_service: hasConsulting,
        consulting_months_contracted: hasConsulting ? 12 : 0,
        consulting_price_per_month: hasConsulting ? (consultingRow?.price || 0) : 0,
        has_design_service: hasDesign,
        arts_per_month: designQuantity,
        has_crm_service: hasCrm,
        has_audiovisual_service: hasAudiovisual,
      } as any).eq('id', clientId);

      // ── Sync art slots ────────────────────────────
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const { data: eligibleWorkMonths } = await supabase
        .from('work_months')
        .select('id, year, month')
        .eq('client_id', clientId)
        .or(`year.gt.${currentYear},and(year.eq.${currentYear},month.gte.${currentMonth})`);

      if (eligibleWorkMonths && eligibleWorkMonths.length > 0) {
        const wmIds = eligibleWorkMonths.map(wm => wm.id);

        if (!hasDesign) {
          await supabase
            .from('arts')
            .delete()
            .in('work_month_id', wmIds)
            .eq('status', 'pending_briefing')
            .is('title', null);
        } else {
          for (const wm of eligibleWorkMonths) {
            const { data: monthArts } = await supabase
              .from('arts')
              .select('id, art_number, status, title')
              .eq('work_month_id', wm.id)
              .order('art_number', { ascending: true });

            const currentArts = monthArts || [];
            const currentCount = currentArts.length;

            if (currentCount < designQuantity) {
              const toAdd = designQuantity - currentCount;
              const maxArtNumber = currentArts.reduce((max, a) => Math.max(max, a.art_number), 0);
              const newArts = Array.from({ length: toAdd }, (_, i) => ({
                work_month_id: wm.id,
                art_number: maxArtNumber + i + 1,
              }));
              await supabase.from('arts').insert(newArts);
            } else if (currentCount > designQuantity) {
              const removable = currentArts
                .filter(a => a.status === 'pending_briefing' && !a.title)
                .reverse();
              const toRemove = Math.min(removable.length, currentCount - designQuantity);
              if (toRemove > 0) {
                const idsToRemove = removable.slice(0, toRemove).map(a => a.id);
                await supabase.from('arts').delete().in('id', idsToRemove);
              }
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-services', clientId] });
      toast.success('Serviços do cliente atualizados!');
      setHasChanges(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalMensal = localClientServices.reduce((sum, r) => sum + (r.price || 0) * (r.quantity || 1), 0);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Package selector */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Pacotes
            </CardTitle>
            <CardDescription className="text-xs">Adicionar múltiplos serviços de uma vez</CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={addPackage}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Escolha um pacote" />
              </SelectTrigger>
              <SelectContent>
                {packages
                  ?.filter(pkg => !localClientServices.some(cs => cs.package_id === pkg.id))
                  .map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                  ))
                }
                {packages?.filter(pkg => !localClientServices.some(cs => cs.package_id === pkg.id)).length === 0 && (
                  <SelectItem value="none" disabled>Nenhum pacote disponível</SelectItem>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Individual Service selector */}
        <Card className="border-indigo-100 bg-indigo-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-500" />
              Serviços Individuais
            </CardTitle>
            <CardDescription className="text-xs">Adicionar um serviço específico</CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={addIndividualService}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Escolha um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services
                  ?.filter(svc => !localClientServices.some(cs => cs.service_id === svc.id))
                  .map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>
                  ))
                }
                {services?.filter(svc => !localClientServices.some(cs => cs.service_id === svc.id)).length === 0 && (
                  <SelectItem value="none" disabled>Todos os serviços já adicionados</SelectItem>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Service rows */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Serviços e Pacotes Ativos</CardTitle>
            <CardDescription>Gerencie o que este cliente contratou</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs gap-2 cursor-default hover:bg-transparent"
          >
            <Lock className="h-3 w-3" />
            Preços Bloqueados
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {localClientServices.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">Nenhum serviço contratado ainda.</p>
            </div>
          ) : (
            localClientServices.map((row, idx) => {
              const svc = services?.find((s) => s.id === row.service_id);
              const pkg = packages?.find((p) => p.id === row.package_id);
              if (!svc) return null;
              return (
                <div key={idx} className="p-4 rounded-lg border bg-primary/5 border-primary/20 relative group">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeService(idx)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{svc.name}</span>
                        {pkg && <Badge variant="secondary" className="text-[10px]"><Package className="h-3 w-3 mr-1" /> {pkg.name}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {svc.pricing_model === 'tcv' ? `Contrato ${svc.contract_duration} meses` : svc.pricing_model === 'monthly' ? 'Recorrente Mensal' : 'Pagamento Único'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Preço (R$)</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.01" 
                            className="h-8 w-24 text-sm bg-background" 
                            disabled={isPriceLocked}
                            value={row.price} 
                            onChange={(e) => updateServiceRow(idx, { price: parseFloat(e.target.value) || 0 })} 
                          />
                          {isPriceLocked && <Lock className="h-3 w-3 absolute right-2 top-2.5 text-muted-foreground/50" />}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Quantidade</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          className="h-8 w-16 text-sm bg-background" 
                          value={row.quantity} 
                          onChange={(e) => updateServiceRow(idx, { quantity: parseInt(e.target.value) || 1 })} 
                        />
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Subtotal</p>
                        <p className="text-sm font-bold">{formatCurrency((row.price || 0) * (row.quantity || 1))}</p>
                      </div>
                    </div>
                  </div>

                  {svc.slug === 'design' && (
                    <div className="mt-3 pt-3 border-t border-primary/10">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Unidade da Arte / Formato</Label>
                      <Input 
                        value={row.art_unit_label || ''} 
                        onChange={(e) => updateServiceRow(idx, { art_unit_label: e.target.value })}
                        placeholder="Ex: Post Instagram, Story, Carrossel..."
                        className="h-8 text-sm mt-1 bg-background"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Total + Save */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/30">
        <div>
          <p className="text-sm text-muted-foreground">Total Contratado</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalMensal)}</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !hasChanges} size="lg">
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Serviços
        </Button>
      </div>

    </div>
  );
}
