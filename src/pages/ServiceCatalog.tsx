import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, Check, Info, ArrowLeft, Image as ImageIcon, Video, Star, ChevronRight, LayoutList, FileText, Clock, DollarSign, Globe, Copy, Zap, Rocket, ShieldCheck, Share2 } from 'lucide-react';
import { Link, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
  image_url: string | null;
  video_url: string | null;
  delivery_details: string | null;
  service_details: string | null;
  pricing_model: string;
  contract_duration: number | null;
  setup_fee: number;
  slug: string;
  category: string | null;
  benefits: string[] | null;
  show_in_catalog: boolean;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  discount_percentage: number;
  pricing_model: string;
  contract_duration: number | null;
  setup_fee: number;
  slug: string;
  category: string | null;
  benefits: string[] | null;
  delivery_details: string | null;
  service_details: string | null;
  show_in_catalog: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function ServiceCatalog({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { slug } = useParams();
  const location = useLocation();
  const activeTab = searchParams.get(isEmbedded ? 'c_tab' : 'tab_catalog') || searchParams.get('tab') || 'packages';
  
  // Detect if we are in an isolated route
  const isPackageRoute = location.pathname.startsWith('/pacote/');
  const isServiceRoute = location.pathname.startsWith('/servico/');
  
  // Use slug from URL if in isolated route, otherwise from query params
  const packageSlug = isPackageRoute ? slug : searchParams.get('p');
  const serviceSlug = isServiceRoute ? slug : searchParams.get('s');

  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').eq('is_active', true).eq('show_in_catalog', true).order('display_order');
      if (error) throw error;
      return data as Service[];
    },
  });

  const { data: packages, isLoading: loadingPackages } = useQuery({
    queryKey: ['service-packages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('service_packages').select('*').eq('is_active', true).eq('show_in_catalog', true).order('display_order');
      if (error) throw error;
      return data as ServicePackage[];
    },
  });

  const { data: packageServices } = useQuery({
    queryKey: ['package-services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('package_services').select('*');
      if (error) throw error;
      return data;
    },
  });

  if (loadingServices || loadingPackages) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getBackUrl = (currentTab: string) => {
    const basePath = window.location.pathname;
    if (isEmbedded) {
      return `${basePath}?tab=packages&p_tab=catalog&c_tab=${currentTab}`;
    }
    return `/service-catalog?tab=${currentTab}`;
  };

  // Find specific package or service if slug is provided
  const selectedPackage = packageSlug ? packages?.find(p => p.slug === packageSlug) : null;
  const selectedService = serviceSlug ? services?.find(s => s.slug === serviceSlug) : null;

  if (selectedPackage) {
    const svcsInPkg = packageServices?.filter((ps: any) => ps.package_id === selectedPackage.id) || [];
    const totalPrice = svcsInPkg.reduce((sum, ps) => sum + ps.price * ps.quantity, 0);
    const discountedPrice = totalPrice * (1 - (selectedPackage.discount_percentage || 0) / 100);

    return (
      <div className={`${isEmbedded ? 'p-4' : 'container mx-auto py-12 px-4'} animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl`}>
        {!isEmbedded && (
          <Button variant="ghost" className="mb-8 hover:bg-primary/5 rounded-full" asChild>
            <Link to={getBackUrl('packages')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Catálogo
            </Link>
          </Button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3 space-y-10">
            <div className="aspect-video rounded-[2.5rem] overflow-hidden bg-muted border shadow-2xl relative group">
              {selectedPackage.image_url ? (
                <img src={selectedPackage.image_url} alt={selectedPackage.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-primary/5 to-primary/20">
                  <Package className="h-20 w-20 opacity-20" />
                </div>
              )}
              {selectedPackage.discount_percentage > 0 && (
                <Badge className="absolute top-6 left-6 bg-green-500 text-lg px-6 py-2 rounded-full shadow-lg border-none animate-bounce">
                  {selectedPackage.discount_percentage}% OFF
                </Badge>
              )}
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/10 text-primary border-none text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                  {selectedPackage.category || 'Pacote Estratégico'}
                </Badge>
                <Badge variant="outline" className="text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold border-primary/20">
                  {selectedPackage.pricing_model === 'tcv' ? 'Contrato de Fidelidade' : 'Assinatura Mensal'}
                </Badge>
              </div>
              <h1 className="text-5xl font-black tracking-tight leading-tight">{selectedPackage.name}</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">{selectedPackage.description}</p>
            </div>

            {selectedPackage.benefits && selectedPackage.benefits.length > 0 && (
              <div className="space-y-6 py-8 px-8 bg-card rounded-[2rem] border shadow-sm">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="h-6 w-6 text-yellow-500" />
                  Benefícios Exclusivos
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {selectedPackage.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-muted/30 group hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/10">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
                        <Check className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm leading-snug">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-8 pt-4">
              <h2 className="text-3xl font-black flex items-center gap-3">
                <LayoutList className="h-8 w-8 text-primary" />
                Detalhamento dos Serviços
              </h2>
              <div className="grid gap-6">
                {svcsInPkg.map((ps: any) => {
                  const svc = services?.find((s: any) => s.id === ps.service_id);
                  return (
                    <Card key={ps.id} className="overflow-hidden rounded-3xl border shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                          <Rocket className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h3 className="text-2xl font-bold">{svc?.name}</h3>
                            {ps.quantity > 1 && <Badge variant="secondary" className="bg-primary/5 text-primary border-none px-3 py-1 rounded-full font-bold">{ps.quantity} Entregas</Badge>}
                          </div>
                          <p className="text-muted-foreground leading-relaxed">{svc?.description}</p>
                          {svc?.delivery_details && (
                            <div className="pt-2 text-sm text-muted-foreground/80 bg-muted/20 p-4 rounded-xl italic">
                              {svc.delivery_details}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {selectedPackage.delivery_details && (
              <div className="space-y-6 pt-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Info className="h-6 w-6 text-primary" />
                  Informações de Entrega
                </h2>
                <div className="p-8 rounded-[2rem] bg-muted/30 border border-dashed border-primary/20 leading-relaxed whitespace-pre-wrap">
                  {selectedPackage.delivery_details}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-[3rem] border-2 border-primary/20 shadow-2xl p-8 lg:p-10 sticky top-8 overflow-hidden">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
              <div className="space-y-8 relative">
                <div className="text-center space-y-3">
                  <p className="text-primary font-bold uppercase tracking-widest text-xs">Investimento Mensal</p>
                  <div className="flex flex-col items-center justify-center">
                    {selectedPackage.discount_percentage > 0 && (
                      <span className="text-xl text-muted-foreground line-through opacity-50 mb-1">{formatCurrency(totalPrice)}</span>
                    )}
                    <span className="text-6xl font-black text-primary tracking-tighter">{formatCurrency(discountedPrice)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">recorrência mensal via Cartão ou PIX</p>
                </div>

                <Separator className="bg-primary/10" />

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-3 text-sm font-medium"><Clock className="h-5 w-5 text-primary/60" /> Fidelidade:</span>
                    <span className="font-bold text-sm bg-primary/5 px-3 py-1 rounded-full">{selectedPackage.pricing_model === 'tcv' ? `${selectedPackage.contract_duration} meses` : 'Sem fidelidade'}</span>
                  </div>
                  {selectedPackage.pricing_model === 'tcv' && selectedPackage.contract_duration && (
                    <div className="pt-4 p-4 rounded-2xl bg-muted/50 border border-muted-foreground/10">
                       <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total do Contrato (TCV)</span>
                        <span className="font-black text-primary">{formatCurrency(discountedPrice * selectedPackage.contract_duration)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4">
                  <Button className="w-full h-18 rounded-full text-xl font-bold shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all py-8" size="lg">
                    Assinar Agora
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    Ambiente 100% Seguro
                  </div>
                </div>
              </div>
            </Card>

              <div className="p-8 rounded-[2rem] bg-card border shadow-sm space-y-4">
                <h4 className="font-bold flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-primary" />
                  Compartilhar Proposta
                </h4>
                <p className="text-xs text-muted-foreground">Envie este link direto para seu cliente revisar os detalhes.</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-full border-2" onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    toast.success('Link copiado!');
                  }}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Link
                  </Button>
                </div>
              </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedService) {
    return (
      <div className={`${isEmbedded ? 'p-4' : 'container mx-auto py-12 px-4'} animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl`}>
        {!isEmbedded && (
          <Button variant="ghost" className="mb-8 hover:bg-primary/5 rounded-full" asChild>
            <Link to={getBackUrl('services')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Catálogo
            </Link>
          </Button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3 space-y-10">
            <div className="aspect-video rounded-[2.5rem] overflow-hidden bg-muted border shadow-2xl relative group">
              {selectedService.image_url ? (
                <img src={selectedService.image_url} alt={selectedService.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-primary/5 to-primary/20">
                  <Star className="h-20 w-20 opacity-20" />
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/10 text-primary border-none text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                  {selectedService.category || 'Serviço Profissional'}
                </Badge>
                <Badge variant="outline" className="text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold border-primary/20">
                  {selectedService.pricing_model === 'single' ? 'Entrega Única' : 'Acompanhamento Recorrente'}
                </Badge>
              </div>
              <h1 className="text-5xl font-black tracking-tight leading-tight">{selectedService.name}</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">{selectedService.description}</p>
            </div>

            {selectedService.benefits && selectedService.benefits.length > 0 && (
              <div className="space-y-6 py-8 px-8 bg-card rounded-[2rem] border shadow-sm">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="h-6 w-6 text-yellow-500" />
                  Por que contratar?
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {selectedService.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-muted/30 group hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/10">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
                        <Check className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm leading-snug">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedService.delivery_details && (
              <div className="space-y-6 pt-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <LayoutList className="h-6 w-6 text-primary" />
                  O que está incluso?
                </h2>
                <div className="p-8 rounded-[2rem] bg-muted/30 border border-dashed border-primary/20 leading-relaxed whitespace-pre-wrap">
                  {selectedService.delivery_details}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-[3rem] border-2 border-primary/20 shadow-2xl p-8 lg:p-10 sticky top-8 overflow-hidden">
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
              <div className="space-y-8 relative">
                <div className="text-center space-y-3">
                  <p className="text-primary font-bold uppercase tracking-widest text-xs">
                    {selectedService.pricing_model === 'single' ? 'Investimento Único' : 'Investimento Mensal'}
                  </p>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-6xl font-black text-primary tracking-tighter">{formatCurrency(selectedService.default_price)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">via Cartão ou PIX</p>
                </div>

                <Separator className="bg-primary/10" />

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-3 text-sm font-medium"><Clock className="h-5 w-5 text-primary/60" /> Entrega:</span>
                    <span className="font-bold text-sm bg-primary/5 px-3 py-1 rounded-full">{selectedService.pricing_model === 'single' ? 'Pontual' : 'Contínuo'}</span>
                  </div>
                  {selectedService.pricing_model === 'tcv' && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-3 text-sm font-medium"><FileText className="h-5 w-5 text-primary/60" /> Fidelidade:</span>
                      <span className="font-bold text-sm bg-primary/5 px-3 py-1 rounded-full">{selectedService.contract_duration} meses</span>
                    </div>
                  )}
                  {selectedService.pricing_model === 'tcv' && selectedService.contract_duration && (
                    <div className="pt-4 p-4 rounded-2xl bg-muted/50 border border-muted-foreground/10">
                       <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total do Contrato (TCV)</span>
                        <span className="font-black text-primary">{formatCurrency(selectedService.default_price * selectedService.contract_duration)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4">
                  <Button className="w-full h-18 rounded-full text-xl font-bold shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all py-8" size="lg">
                    Contratar Agora
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    Ambiente 100% Seguro
                  </div>
                </div>
              </div>
            </Card>
            
            <div className="p-8 rounded-[2rem] bg-card border shadow-sm space-y-4">
              <h4 className="font-bold flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                Compartilhar Proposta
              </h4>
              <p className="text-xs text-muted-foreground">Envie este link direto para seu cliente revisar os detalhes.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full border-2" onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url);
                  toast.success('Link copiado!');
                }}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Link
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${window.location.pathname.includes('/packages') ? '' : 'container mx-auto py-12 px-4'} space-y-16 animate-in fade-in duration-1000 max-w-7xl`}>
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-primary/5 text-primary px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-primary/10">
          <Zap className="h-4 w-4" />
          Nossa Vitrine de Soluções
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground drop-shadow-sm">
          Acelere seu <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Crescimento</span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Escolha o ecossistema ideal para escalar sua operação com previsibilidade, tecnologia e alta performance.
        </p>
      </div>

      <div className="flex justify-center">
        <Tabs value={activeTab} className="w-full">
          <div className="flex justify-center mb-16">
            <TabsList className="h-16 p-1.5 bg-muted/50 rounded-full border backdrop-blur-sm">
              <Link to={getBackUrl('packages')}>
                <TabsTrigger value="packages" className="h-full px-10 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-base transition-all shadow-none data-[state=active]:shadow-xl">Pacotes Estratégicos</TabsTrigger>
              </Link>
              <Link to={getBackUrl('services')}>
                <TabsTrigger value="services" className="h-full px-10 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-base transition-all shadow-none data-[state=active]:shadow-xl">Serviços Únicos</TabsTrigger>
              </Link>
            </TabsList>
          </div>

          <TabsContent value="packages" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {packages?.map((pkg: any) => {
                const svcsInPkg = packageServices?.filter((ps: any) => ps.package_id === pkg.id) || [];
                return (
                  <Card key={pkg.id} className="flex flex-col rounded-[3rem] border-2 border-transparent hover:border-primary/40 transition-all group overflow-hidden shadow-lg hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-4 bg-card">
                    <div className="aspect-[4/3] relative overflow-hidden">
                      {pkg.image_url ? (
                        <img src={pkg.image_url} alt={pkg.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20 text-muted-foreground">
                          <Package className="h-16 w-16 opacity-10 group-hover:opacity-30 transition-opacity" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                      
                      {pkg.category && (
                        <Badge className="absolute top-6 right-6 bg-white/20 backdrop-blur-md text-white border-none text-[10px] font-bold uppercase px-3 py-1 rounded-full">
                          {pkg.category}
                        </Badge>
                      )}
                      
                      <div className="absolute bottom-8 left-8 right-8">
                        <h3 className="text-3xl font-black text-white tracking-tight leading-tight group-hover:text-primary transition-colors">{pkg.name}</h3>
                      </div>
                    </div>
                    
                    <CardContent className="flex-1 p-8 sm:p-10 space-y-8">
                      <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed font-medium opacity-80">
                        {pkg.description}
                      </p>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">O que está incluso:</p>
                        <div className="flex flex-wrap gap-2">
                          {svcsInPkg.slice(0, 4).map((ps: any) => {
                            const svc = services?.find((s: any) => s.id === ps.service_id);
                            return (
                              <div key={ps.id} className="flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                                <Check className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-bold text-primary/80 uppercase">{svc?.name}</span>
                              </div>
                            );
                          })}
                          {svcsInPkg.length > 4 && <Badge variant="secondary" className="rounded-full text-[10px]">+{svcsInPkg.length - 4}</Badge>}
                        </div>
                      </div>

                      <div className="pt-8 border-t mt-auto flex flex-col gap-6">
                        <Button asChild className="rounded-full font-black h-16 text-lg shadow-xl shadow-primary/20 hover:scale-[1.05] transition-transform">
                          <Link to={isEmbedded ? `${window.location.pathname}?tab=packages&p_tab=catalog&p=${pkg.slug}` : `/pacote/${pkg.slug}`}>Explorar Detalhes</Link>
                        </Button>
                        <div className="flex items-center justify-center gap-4 text-muted-foreground/60">
                           <Separator className="flex-1" />
                           <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Investimento sob consulta</span>
                           <Separator className="flex-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services?.map((svc: any) => (
                <Card key={svc.id} className="flex flex-col rounded-[2.5rem] border border-muted hover:border-primary/30 shadow-sm hover:shadow-2xl transition-all p-8 group hover:-translate-y-2">
                  <div className="flex items-start justify-between mb-8">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                      <Star className="h-7 w-7" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 px-3 py-1 rounded-full">
                      {svc.pricing_model === 'single' ? 'Entrega Única' : 'Recorrente'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-4 flex-1">
                    {svc.category && <p className="text-[10px] font-black text-primary uppercase tracking-widest">{svc.category}</p>}
                    <h3 className="font-black text-2xl tracking-tight leading-tight">{svc.name}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed opacity-80">
                      {svc.description}
                    </p>
                  </div>

                  <div className="pt-10 border-t flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Investimento</p>
                        <p className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(svc.default_price)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => {
                         const url = `${window.location.origin}/servico/${svc.slug}`;
                         navigator.clipboard.writeText(url);
                         toast.success('Link do serviço copiado!');
                      }}>
                        <Copy className="h-5 w-5 text-primary" />
                      </Button>
                    </div>
                    <Button asChild variant="secondary" className="w-full rounded-full font-bold h-12">
                      <Link to={isEmbedded ? `${window.location.pathname}?tab=packages&p_tab=catalog&s=${svc.slug}` : `/servico/${svc.slug}`}>Ver Mais Detalhes</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="bg-primary text-primary-foreground rounded-[4rem] p-12 md:p-20 relative overflow-hidden text-center space-y-8 shadow-3xl">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[40rem] h-[40rem] bg-white/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[30rem] h-[30rem] bg-black/10 rounded-full blur-[80px]" />
        <div className="relative space-y-6">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight max-w-4xl mx-auto">
            Não encontrou o que precisava?<br/>Vamos criar uma <span className="underline decoration-white/30">estratégia personalizada</span>.
          </h2>
          <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto font-medium leading-relaxed">
            Desenvolvemos ecossistemas exclusivos para operações de alto volume que exigem escala agressiva e automação de ponta.
          </p>
          <div className="pt-6">
            <Button size="lg" variant="secondary" className="rounded-full px-16 h-20 text-2xl font-black shadow-2xl hover:scale-105 transition-transform">
              Falar com Especialista
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}