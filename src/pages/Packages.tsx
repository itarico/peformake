import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Package, Settings2, Image as ImageIcon, Video, BookOpen, Copy, ExternalLink, Upload, Percent, Eye, Zap, LayoutList, FileText } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import ServiceCatalog from './ServiceCatalog';

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  default_price: number;
  is_active: boolean;
  display_order: number;
  image_url: string | null;
  video_url: string | null;
  delivery_details: string | null;
  service_details: string | null;
  pricing_model: 'single' | 'monthly' | 'tcv';
  contract_duration: number | null;
  category: string | null;
  benefits: string[] | null;
  show_in_catalog: boolean;
}

interface ServicePackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  image_url: string | null;
  video_url: string | null;
  discount_percentage: number;
  pricing_model: 'single' | 'monthly' | 'tcv';
  contract_duration: number | null;
  category: string | null;
  benefits: string[] | null;
  delivery_details: string | null;
  service_details: string | null;
  show_in_catalog: boolean;
}

interface PackageService {
  id: string;
  package_id: string;
  service_id: string;
  price: number;
  quantity: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function BenefitsList({ benefits, onChange }: { benefits: string[], onChange: (newBenefits: string[]) => void }) {
  const addBenefit = () => onChange([...benefits, '']);
  const updateBenefit = (index: number, value: string) => {
    const updated = [...benefits];
    updated[index] = value;
    onChange(updated);
  };
  const removeBenefit = (index: number) => {
    const updated = benefits.filter((_, i) => i !== index);
    onChange(updated.length > 0 ? updated : ['']);
  };

  return (
    <div className="space-y-2">
      <Label className="font-semibold flex items-center justify-between">
        Benefícios / Vantagens
        <Button variant="ghost" size="sm" onClick={addBenefit} className="h-6 px-2 text-[10px] uppercase">
          + Adicionar
        </Button>
      </Label>
      <div className="space-y-2">
        {benefits.map((benefit, idx) => (
          <div key={idx} className="flex gap-2">
            <Input 
              value={benefit} 
              onChange={(e) => updateBenefit(idx, e.target.value)} 
              placeholder={`Benefício ${idx + 1}`} 
              className="flex-1"
            />
            {benefits.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeBenefit(idx)} className="h-10 w-10 shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Packages() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'service' | 'package') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `catalog-assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (field === 'service') {
        setServiceForm(prev => ({ ...prev, image_url: publicUrl }));
      } else {
        setPackageForm(prev => ({ ...prev, image_url: publicUrl }));
      }
      
      toast.success('Imagem enviada com sucesso!');
    } catch (error: any) {
      toast.error('Erro no upload: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };
  
  const isEmbedded = window.location.pathname.includes('/sdr-workspace');
  const activeTab = searchParams.get(isEmbedded ? 'p_tab' : 'tab') || 'services';

  const handleTabChange = (value: string) => {
    if (isEmbedded) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('p_tab', value);
      setSearchParams(newParams);
    } else {
      setSearchParams({ tab: value });
    }
  };

  // Services state
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ 
    name: '', 
    description: '', 
    default_price: '', 
    image_url: '', 
    video_url: '', 
    delivery_details: '', 
    service_details: '', 
    pricing_model: 'monthly' as 'single' | 'monthly' | 'tcv',
    contract_duration: '12',
    category: '',
    benefits: [''],
    show_in_catalog: true,
    is_active: true
  });

  // Packages state
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [packageForm, setPackageForm] = useState({ 
    name: '', 
    description: '',
    image_url: '',
    video_url: '',
    discount_percentage: '0',
    pricing_model: 'monthly' as 'single' | 'monthly' | 'tcv',
    contract_duration: '12',
    category: '',
    benefits: [''],
    delivery_details: '',
    service_details: '',
    show_in_catalog: true,
    is_active: true
  });
  const [packageServices, setPackageServices] = useState<{ service_id: string; price: string; quantity: string; checked: boolean }[]>([]);

  // Queries
  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').order('display_order');
      if (error) throw error;
      return data as Service[];
    },
  });

  const { data: packages, isLoading: loadingPackages } = useQuery({
    queryKey: ['service-packages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('service_packages').select('*').order('display_order');
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

  // Service mutations
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Service> }) => {
      const { error } = await supabase.from('services').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço atualizado!');
      setServiceDialogOpen(false);
      setEditingService(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('services').insert({ ...data, display_order: (services?.length || 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço criado!');
      setServiceDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Serviço excluído!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Package mutations
  const savePackageMutation = useMutation({
    mutationFn: async ({ pkg, pkgServices }: { pkg: any; pkgServices: { service_id: string; price: number; quantity: number }[] }) => {
      let packageId: string;

      if (editingPackage) {
        const { error } = await supabase.from('service_packages').update(pkg).eq('id', editingPackage.id);
        if (error) throw error;
        packageId = editingPackage.id;
        // Remove old services
        await supabase.from('package_services').delete().eq('package_id', packageId);
      } else {
        const { data, error } = await supabase.from('service_packages').insert({ ...pkg, display_order: (packages?.length || 0) + 1 }).select('id').single();
        if (error) throw error;
        packageId = data.id;
      }

      // Insert package services
      if (pkgServices.length > 0) {
        const { error } = await supabase.from('package_services').insert(
          pkgServices.map((ps) => ({ package_id: packageId, ...ps }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-packages'] });
      queryClient.invalidateQueries({ queryKey: ['package-services'] });
      toast.success(editingPackage ? 'Pacote atualizado!' : 'Pacote criado!');
      setPackageDialogOpen(false);
      setEditingPackage(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('service_packages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-packages'] });
      queryClient.invalidateQueries({ queryKey: ['package-services'] });
      toast.success('Pacote excluído!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const openEditService = (svc: Service) => {
    setEditingService(svc);
    setServiceForm({ 
      name: svc.name, 
      description: svc.description || '', 
      default_price: svc.default_price.toString(),
      image_url: svc.image_url || '',
      video_url: svc.video_url || '',
      delivery_details: svc.delivery_details || '',
      service_details: svc.service_details || '',
      pricing_model: svc.pricing_model || 'monthly',
      contract_duration: (svc.contract_duration || 12).toString(),
      category: svc.category || '',
      benefits: svc.benefits && svc.benefits.length > 0 ? svc.benefits : [''],
      show_in_catalog: svc.show_in_catalog ?? true,
      is_active: svc.is_active ?? true
    });
    setServiceDialogOpen(true);
  };

  const openNewService = () => {
    setEditingService(null);
    setServiceForm({ 
      name: '', 
      description: '', 
      default_price: '',
      image_url: '',
      video_url: '',
      delivery_details: '',
      service_details: '',
      pricing_model: 'monthly',
      contract_duration: '12',
      category: '',
      benefits: [''],
      show_in_catalog: true,
      is_active: true
    });
    setServiceDialogOpen(true);
  };

  const handleServiceSubmit = () => {
    if (!serviceForm.name) return toast.error('Nome é obrigatório');
    const filteredBenefits = serviceForm.benefits.filter(b => b.trim() !== '');
    const svcData = { 
      name: serviceForm.name, 
      description: serviceForm.description || null, 
      default_price: parseFloat(serviceForm.default_price) || 0,
      image_url: serviceForm.image_url || null,
      video_url: serviceForm.video_url || null,
      delivery_details: serviceForm.delivery_details || null,
      service_details: serviceForm.service_details || null,
      pricing_model: serviceForm.pricing_model,
      contract_duration: (serviceForm.pricing_model === 'tcv' || serviceForm.pricing_model === 'monthly') ? parseInt(serviceForm.contract_duration) : null,
      category: serviceForm.category || null,
      benefits: filteredBenefits,
      show_in_catalog: serviceForm.show_in_catalog,
      is_active: serviceForm.is_active,
      slug: (editingService?.slug || serviceForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'))
    };

    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data: svcData });
    } else {
      createServiceMutation.mutate(svcData);
    }
  };

  const openEditPackage = (pkg: ServicePackage) => {
    setEditingPackage(pkg);
    setPackageForm({ 
      name: pkg.name, 
      description: pkg.description || '',
      image_url: pkg.image_url || '',
      video_url: pkg.video_url || '',
      discount_percentage: (pkg.discount_percentage || 0).toString(),
      pricing_model: pkg.pricing_model || 'monthly',
      contract_duration: (pkg.contract_duration || 12).toString(),
      category: pkg.category || '',
      benefits: pkg.benefits && pkg.benefits.length > 0 ? pkg.benefits : [''],
      delivery_details: pkg.delivery_details || '',
      service_details: pkg.service_details || '',
      show_in_catalog: pkg.show_in_catalog ?? true,
      is_active: pkg.is_active ?? true
    });
    const existing = allPackageServices?.filter((ps) => ps.package_id === pkg.id) || [];
    setPackageServices(
      (services || []).map((svc) => {
        const ps = existing.find((e) => e.service_id === svc.id);
        return { service_id: svc.id, price: ps ? ps.price.toString() : svc.default_price.toString(), quantity: ps ? ps.quantity.toString() : '1', checked: !!ps };
      })
    );
    setPackageDialogOpen(true);
  };

  const openNewPackage = () => {
    setEditingPackage(null);
    setPackageForm({ 
      name: '', 
      description: '',
      image_url: '',
      video_url: '',
      discount_percentage: '0',
      pricing_model: 'monthly',
      contract_duration: '12',
      category: '',
      benefits: [''],
      delivery_details: '',
      service_details: '',
      show_in_catalog: true,
      is_active: true
    });
    setPackageServices(
      (services || []).map((svc) => ({ service_id: svc.id, price: svc.default_price.toString(), quantity: '1', checked: false }))
    );
    setPackageDialogOpen(true);
  };

  const handlePackageSubmit = () => {
    if (!packageForm.name) return toast.error('Nome do pacote é obrigatório');
    const selectedServices = packageServices
      .filter((ps) => ps.checked)
      .map((ps) => ({ service_id: ps.service_id, price: parseFloat(ps.price) || 0, quantity: parseInt(ps.quantity) || 1 }));
    if (selectedServices.length === 0) return toast.error('Selecione pelo menos um serviço');
    
    const filteredBenefits = packageForm.benefits.filter(b => b.trim() !== '');
    const pkgData = { 
      name: packageForm.name, 
      description: packageForm.description || null,
      image_url: packageForm.image_url || null,
      video_url: packageForm.video_url || null,
      discount_percentage: parseFloat(packageForm.discount_percentage) || 0,
      pricing_model: packageForm.pricing_model,
      contract_duration: (packageForm.pricing_model === 'tcv' || packageForm.pricing_model === 'monthly') ? parseInt(packageForm.contract_duration) : null,
      // setup_fee removed
      category: packageForm.category || null,
      benefits: filteredBenefits,
      delivery_details: packageForm.delivery_details || null,
      service_details: packageForm.service_details || null,
      show_in_catalog: packageForm.show_in_catalog,
      is_active: packageForm.is_active,
      slug: (editingPackage?.slug || packageForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'))
    };

    savePackageMutation.mutate({ pkg: pkgData, pkgServices: selectedServices });
  };

  const getPackageTotal = (pkgId: string) => {
    return (allPackageServices?.filter((ps) => ps.package_id === pkgId) || []).reduce((sum, ps) => sum + ps.price * ps.quantity, 0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pacotes e Serviços</h1>
          <p className="text-muted-foreground">Defina os serviços disponíveis e monte pacotes para seus clientes</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="services">
            <Settings2 className="h-4 w-4 mr-2" />
            Serviços
          </TabsTrigger>
          <TabsTrigger value="packages">
            <Package className="h-4 w-4 mr-2" />
            Pacotes
          </TabsTrigger>
          <TabsTrigger value="catalog">
            <BookOpen className="h-4 w-4 mr-2" />
            Catálogo Comercial
          </TabsTrigger>
        </TabsList>


        {/* SERVICES TAB */}
        <TabsContent value="services">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Serviços Disponíveis</CardTitle>
                <CardDescription>Configure os serviços que sua agência oferece</CardDescription>
                <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Link do Catálogo Público</p>
                      <p className="text-xs font-medium opacity-70 truncate max-w-[200px] sm:max-w-none">
                        {window.location.origin}/service-catalog
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 rounded-xl gap-2 bg-background border-primary/20 hover:bg-primary/5"
                      onClick={() => {
                        window.open(`${window.location.origin}/service-catalog`, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Visualizar
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-9 rounded-xl gap-2 shadow-lg shadow-primary/20"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/service-catalog`);
                        toast.success('Link do catálogo copiado!');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar Link
                    </Button>
                  </div>
                </div>
              </div>
              <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewService}><Plus className="mr-2 h-4 w-4" />Novo Serviço</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
                    <DialogDescription>Configure detalhes, preços e mídia para o catálogo</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="Ex: Design" />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoria / Tipo de Serviço</Label>
                        <Input value={serviceForm.category} onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })} placeholder="Ex: Tráfego Pago, Social Media..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição Curta (No catálogo)</Label>
                        <Textarea 
                          value={serviceForm.description} 
                          onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} 
                          placeholder="Breve descrição que aparece no card do catálogo" 
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço Padrão (R$)</Label>
                        <Input type="number" step="0.01" min="0" value={serviceForm.default_price} onChange={(e) => setServiceForm({ ...serviceForm, default_price: e.target.value })} placeholder="0,00" />
                      </div>
                      <div className="space-y-2">
                        <Label>Modelo de Precificação</Label>
                        <Select value={serviceForm.pricing_model} onValueChange={(v: any) => setServiceForm({ ...serviceForm, pricing_model: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Mensal (MRR)</SelectItem>
                            <SelectItem value="single">Único (One-time)</SelectItem>
                            <SelectItem value="tcv">Contrato (TCV)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(serviceForm.pricing_model === 'tcv' || serviceForm.pricing_model === 'monthly') && (
                        <div className="space-y-2">
                          <Label>Duração do Contrato (meses)</Label>
                          <Select value={serviceForm.contract_duration} onValueChange={(v) => setServiceForm({ ...serviceForm, contract_duration: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3">3 Meses</SelectItem>
                              <SelectItem value="6">6 Meses</SelectItem>
                              <SelectItem value="12">12 Meses</SelectItem>
                              <SelectItem value="24">24 Meses</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold">Visível no Catálogo</Label>
                          <p className="text-[10px] text-muted-foreground">Mostrar este serviço no site público</p>
                        </div>
                        <Switch 
                          checked={serviceForm.show_in_catalog} 
                          onCheckedChange={(checked) => setServiceForm({ ...serviceForm, show_in_catalog: checked })} 
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/10">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold">Serviço Ativo</Label>
                          <p className="text-[10px] text-muted-foreground">Disponível para novas vendas e contratos</p>
                        </div>
                        <Switch 
                          checked={serviceForm.is_active} 
                          onCheckedChange={(checked) => setServiceForm({ ...serviceForm, is_active: checked })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 font-bold text-primary"><ImageIcon className="h-4 w-4" /> URL da Imagem (Principal)</Label>
                        <div className="flex gap-2">
                          <Input value={serviceForm.image_url} onChange={(e) => setServiceForm({ ...serviceForm, image_url: e.target.value })} placeholder="https://exemplo.com/imagem.jpg" className="border-primary/20" />
                          <div className="relative">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                              onChange={(e) => handleFileUpload(e, 'service')}
                              disabled={isUploading}
                            />
                            <Button variant="outline" size="icon" disabled={isUploading} className="shrink-0 border-primary/20">
                              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Video className="h-4 w-4" /> Link do Vídeo (Apresentação)</Label>
                        <Input value={serviceForm.video_url} onChange={(e) => setServiceForm({ ...serviceForm, video_url: e.target.value })} placeholder="https://youtube.com/..." />
                      </div>
                      <div className="space-y-2">
                        <BenefitsList 
                          benefits={serviceForm.benefits} 
                          onChange={(newBenefits) => setServiceForm({ ...serviceForm, benefits: newBenefits })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">O que entregamos? (Lista)</Label>
                        <Textarea value={serviceForm.delivery_details} onChange={(e) => setServiceForm({ ...serviceForm, delivery_details: e.target.value })} placeholder="• Item 1&#10;• Item 2" className="min-h-[100px] bg-muted/20" />
                        <p className="text-[10px] text-muted-foreground">Descreva os itens que o cliente recebe.</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Informações Técnicas</Label>
                        <Textarea value={serviceForm.service_details} onChange={(e) => setServiceForm({ ...serviceForm, service_details: e.target.value })} placeholder="Detalhes técnicos para o time..." className="min-h-[100px]" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleServiceSubmit} disabled={updateServiceMutation.isPending || createServiceMutation.isPending}>
                      {(updateServiceMutation.isPending || createServiceMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingServices ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Preço Padrão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services?.map((svc) => (
                      <TableRow key={svc.id}>
                        <TableCell className="font-medium">{svc.name}</TableCell>
                        <TableCell className="text-muted-foreground">{svc.description || '—'}</TableCell>
                        <TableCell>{formatCurrency(svc.default_price)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={svc.is_active ? 'default' : 'secondary'} className="w-fit cursor-pointer" onClick={() => updateServiceMutation.mutate({ id: svc.id, data: { is_active: !svc.is_active } })}>
                              {svc.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {svc.show_in_catalog && (
                              <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-200">
                                No Catálogo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Visualizar Página"
                              onClick={() => window.open(`${window.location.origin}/servico/${svc.slug}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Copiar Link"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/servico/${svc.slug}`);
                                toast.success('Link do serviço copiado!');
                              }}
                            >
                              <Copy className="h-4 w-4 text-slate-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditService(svc)}><Pencil className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação removerá o serviço de todos os pacotes.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteServiceMutation.mutate(svc.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PACKAGES TAB */}
        <TabsContent value="packages">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pacotes</CardTitle>
                <CardDescription>Monte pacotes combinando serviços com preços personalizados</CardDescription>
              </div>
              <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openNewPackage}><Plus className="mr-2 h-4 w-4" />Novo Pacote</Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col rounded-[2rem]">
                  <DialogHeader>
                    <DialogTitle>{editingPackage ? 'Editar Pacote' : 'Novo Pacote'}</DialogTitle>
                    <DialogDescription>Selecione serviços, defina preços e mídia para o catálogo</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome do Pacote *</Label>
                          <Input value={packageForm.name} onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })} placeholder="Ex: Pacote Premium" />
                        </div>
                        <div className="space-y-2">
                          <Label>Categoria</Label>
                          <Input value={packageForm.category} onChange={(e) => setPackageForm({ ...packageForm, category: e.target.value })} placeholder="Ex: Estratégico, Performance..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição Curta (No catálogo)</Label>
                          <Textarea 
                            value={packageForm.description} 
                            onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })} 
                            placeholder="Descrição que aparece no card do pacote" 
                            className="min-h-[80px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10 transition-all hover:bg-primary/10">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-bold flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5 text-primary" />
                                No Catálogo
                              </Label>
                              <p className="text-[10px] text-muted-foreground">Visível no site público</p>
                            </div>
                            <Switch 
                              checked={packageForm.show_in_catalog} 
                              onCheckedChange={(checked) => setPackageForm({ ...packageForm, show_in_catalog: checked })} 
                            />
                          </div>
                          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10 transition-all hover:bg-primary/10">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-bold flex items-center gap-2">
                                <Zap className="h-3.5 w-3.5 text-primary" />
                                Pacote Ativo
                              </Label>
                              <p className="text-[10px] text-muted-foreground">Disponível para venda</p>
                            </div>
                            <Switch 
                              checked={packageForm.is_active} 
                              onCheckedChange={(checked) => setPackageForm({ ...packageForm, is_active: checked })} 
                            />
                          </div>
                        </div>

                        <div className="space-y-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                          <Label className="flex items-center gap-2 font-bold text-primary">
                            <Percent className="h-4 w-4" />
                            Desconto Estratégico (%)
                          </Label>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={packageForm.discount_percentage} 
                            onChange={(e) => setPackageForm({ ...packageForm, discount_percentage: e.target.value })} 
                            placeholder="Ex: 15" 
                            className="bg-background border-primary/20 focus:ring-primary/30 text-lg font-bold"
                          />
                          <p className="text-[10px] text-muted-foreground">O desconto será aplicado sobre o valor total dos serviços selecionados.</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2 font-bold text-primary">
                            <ImageIcon className="h-4 w-4" /> 
                            Imagem de Capa (Banner)
                          </Label>
                          <div className="flex gap-2">
                            <Input value={packageForm.image_url} onChange={(e) => setPackageForm({ ...packageForm, image_url: e.target.value })} placeholder="https://exemplo.com/banner.jpg" className="border-primary/20" />
                            <div className="relative">
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                onChange={(e) => handleFileUpload(e, 'package')}
                                disabled={isUploading}
                              />
                              <Button variant="outline" size="icon" disabled={isUploading} className="shrink-0 border-primary/20 hover:bg-primary/5">
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Modelo de Precificação</Label>
                            <Select value={packageForm.pricing_model} onValueChange={(v: any) => setPackageForm({ ...packageForm, pricing_model: v })}>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monthly">Mensal (MRR)</SelectItem>
                                <SelectItem value="single">Único (One-time)</SelectItem>
                                <SelectItem value="tcv">Contrato (TCV)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {(packageForm.pricing_model === 'tcv' || packageForm.pricing_model === 'monthly') && (
                            <div className="space-y-2">
                              <Label>Fidelidade (Meses)</Label>
                              <Select value={packageForm.contract_duration} onValueChange={(v) => setPackageForm({ ...packageForm, contract_duration: v })}>
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">3 Meses</SelectItem>
                                  <SelectItem value="6">6 Meses</SelectItem>
                                  <SelectItem value="12">12 Meses</SelectItem>
                                  <SelectItem value="24">24 Meses</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2"><Video className="h-4 w-4 text-red-500" /> Vídeo de Vendas (Link)</Label>
                          <Input value={packageForm.video_url} onChange={(e) => setPackageForm({ ...packageForm, video_url: e.target.value })} placeholder="YouTube, Vimeo ou Loom link" />
                        </div>
                        
                        <BenefitsList 
                          benefits={packageForm.benefits} 
                          onChange={(newBenefits) => setPackageForm({ ...packageForm, benefits: newBenefits })} 
                        />
                        
                        <div className="space-y-2">
                          <Label className="font-semibold flex items-center gap-2"><LayoutList className="h-4 w-4 text-primary" /> O que entregamos?</Label>
                          <Textarea 
                            value={packageForm.delivery_details} 
                            onChange={(e) => setPackageForm({ ...packageForm, delivery_details: e.target.value })} 
                            placeholder="Descreva os itens de entrega deste pacote..." 
                            className="min-h-[100px] bg-muted/20 rounded-xl" 
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-slate-500" /> Notas Internas / Técnicas</Label>
                          <Textarea 
                            value={packageForm.service_details} 
                            onChange={(e) => setPackageForm({ ...packageForm, service_details: e.target.value })} 
                            placeholder="Informações visíveis apenas para o time..." 
                            className="min-h-[100px] rounded-xl" 
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <Label className="text-base font-semibold">Serviços Incluídos</Label>
                      <div className="space-y-3">
                        {packageServices.map((ps, idx) => {
                          const svc = services?.find((s) => s.id === ps.service_id);
                          if (!svc) return null;
                          return (
                            <div key={ps.service_id} className={`p-3 rounded-lg border ${ps.checked ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'}`}>
                              <div className="flex items-center gap-3">
                                <Checkbox checked={ps.checked} onCheckedChange={(checked) => {
                                  const updated = [...packageServices];
                                  updated[idx] = { ...updated[idx], checked: !!checked };
                                  setPackageServices(updated);
                                }} />
                                <span className="font-medium flex-1">{svc.name}</span>
                              </div>
                              {ps.checked && (
                                <div className="grid grid-cols-2 gap-3 mt-3 pl-7">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Preço (R$)</Label>
                                    <Input type="number" step="0.01" min="0" value={ps.price} onChange={(e) => {
                                      const updated = [...packageServices];
                                      updated[idx] = { ...updated[idx], price: e.target.value };
                                      setPackageServices(updated);
                                    }} />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Quantidade</Label>
                                    <Input type="number" min="1" value={ps.quantity} onChange={(e) => {
                                      const updated = [...packageServices];
                                      updated[idx] = { ...updated[idx], quantity: e.target.value };
                                      setPackageServices(updated);
                                    }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Package total */}
                    <div className="p-3 rounded-lg border bg-accent/30">
                      <Label className="text-xs text-muted-foreground">Total do Pacote</Label>
                      <p className="text-lg font-bold">
                        {formatCurrency(packageServices.filter((ps) => ps.checked).reduce((sum, ps) => sum + (parseFloat(ps.price) || 0) * (parseInt(ps.quantity) || 1), 0))}
                      </p>
                    </div>
                  </div>
                  <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => setPackageDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handlePackageSubmit} disabled={savePackageMutation.isPending}>
                      {savePackageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingPackages ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : packages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum pacote criado</h3>
                  <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro pacote combinando serviços</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {packages?.map((pkg) => {
                    const pkgSvcs = allPackageServices?.filter((ps) => ps.package_id === pkg.id) || [];
                    return (
                      <Card key={pkg.id} className="relative overflow-hidden group">
                        {pkg.discount_percentage > 0 && (
                          <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">
                            {pkg.discount_percentage}% OFF
                          </div>
                        )}
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg truncate">{pkg.name}</CardTitle>
                              {pkg.description && <CardDescription className="line-clamp-1">{pkg.description}</CardDescription>}
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Visualizar Página"
                                onClick={() => window.open(`${window.location.origin}/pacote/${pkg.slug}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Copiar Link"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/pacote/${pkg.slug}`);
                                  toast.success('Link do pacote copiado!');
                                }}
                              >
                                <Copy className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditPackage(pkg)}><Pencil className="h-4 w-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir pacote?</AlertDialogTitle>
                                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deletePackageMutation.mutate(pkg.id)}>Excluir</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-1">
                            {pkgSvcs.map((ps) => {
                              const svc = services?.find((s) => s.id === ps.service_id);
                              return (
                                <div key={ps.id} className="flex justify-between text-sm">
                                  <span className="truncate mr-2">{svc?.name || 'Serviço'} {ps.quantity > 1 ? `×${ps.quantity}` : ''}</span>
                                  <span className="text-muted-foreground shrink-0">{formatCurrency(ps.price * ps.quantity)}</span>
                                </div>
                              );
                            })}
                          </div>
                          <div className="pt-2 border-t space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Investimento</span>
                              <div className="text-right">
                                {pkg.discount_percentage > 0 && (
                                  <p className="text-xs text-muted-foreground line-through decoration-red-400 opacity-60">
                                    {formatCurrency(getPackageTotal(pkg.id))}
                                  </p>
                                )}
                                <span className="text-lg font-bold text-primary">
                                  {formatCurrency(getPackageTotal(pkg.id) * (1 - (pkg.discount_percentage || 0) / 100))}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {pkg.show_in_catalog && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] py-0">
                                  No Catálogo
                                </Badge>
                              )}
                              {!pkg.is_active && (
                                <Badge variant="secondary" className="text-[10px] py-0">
                                  Inativo
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="catalog" className="mt-0">
          <div className="-mx-4 md:-mx-8 lg:-mx-10 bg-background min-h-[calc(100vh-200px)]">
            <ServiceCatalog isEmbedded={isEmbedded} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
