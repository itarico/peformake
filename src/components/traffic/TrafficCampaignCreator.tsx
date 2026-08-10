import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Rocket, CheckCircle2, Image, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const OBJECTIVES = [
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfego' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento' },
  { value: 'OUTCOME_LEADS', label: 'Geração de Leads' },
  { value: 'OUTCOME_SALES', label: 'Vendas' },
  { value: 'OUTCOME_AWARENESS', label: 'Reconhecimento' },
];

const OPTIMIZATION_GOALS: Record<string, { value: string; label: string }[]> = {
  OUTCOME_TRAFFIC: [
    { value: 'LINK_CLICKS', label: 'Cliques no Link' },
    { value: 'LANDING_PAGE_VIEWS', label: 'Visualizações da Página' },
  ],
  OUTCOME_ENGAGEMENT: [
    { value: 'POST_ENGAGEMENT', label: 'Engajamento no Post' },
    { value: 'THRUPLAY', label: 'ThruPlay (vídeo)' },
  ],
  OUTCOME_LEADS: [
    { value: 'LEAD_GENERATION', label: 'Geração de Leads' },
    { value: 'CONVERSATIONS', label: 'Conversas' },
  ],
  OUTCOME_SALES: [
    { value: 'OFFSITE_CONVERSIONS', label: 'Conversões' },
    { value: 'VALUE', label: 'Valor' },
  ],
  OUTCOME_AWARENESS: [
    { value: 'REACH', label: 'Alcance' },
    { value: 'IMPRESSIONS', label: 'Impressões' },
  ],
};

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'GET_OFFER', label: 'Obter Oferta' },
  { value: 'BOOK_TRAVEL', label: 'Reservar' },
  { value: 'SEND_WHATSAPP_MESSAGE', label: 'WhatsApp' },
];

interface TrafficCampaignCreatorProps { clientId?: string }

export function TrafficCampaignCreator({ clientId: propClientId }: TrafficCampaignCreatorProps = {}) {
  const [step, setStep] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState(propClientId || '');

  // Form fields
  const [campaignName, setCampaignName] = useState('');
  const [objective, setObjective] = useState('OUTCOME_TRAFFIC');
  const [optimizationGoal, setOptimizationGoal] = useState('LINK_CLICKS');
  const [dailyBudget, setDailyBudget] = useState('');
  const [pageId, setPageId] = useState('');
  const [primaryText, setPrimaryText] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [callToAction, setCallToAction] = useState('LEARN_MORE');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('65');

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageHash, setImageHash] = useState<string | null>(null);
  const [strategyLoaded, setStrategyLoaded] = useState(false);

  // Load campaign strategy from consulting
  const { data: campaignStrategy } = useQuery({
    queryKey: ['campaign-strategy', selectedClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_strategic_data')
        .select('data_value')
        .eq('client_id', selectedClientId)
        .eq('data_key', 'campaign_strategy')
        .maybeSingle();
      if (error) throw error;
      return data?.data_value || null;
    },
    enabled: !!selectedClientId,
  });

  // Clients
  const { data: trafficClients = [] } = useQuery({
    queryKey: ['traffic-campaign-creator-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_services')
        .select('client_id, clients(id, name, is_active), services!inner(slug)')
        .eq('is_active', true)
        .eq('services.slug', 'trafego');
      if (error) throw error;
      return (data || []).filter((cs: any) => cs.clients?.is_active).map((cs: any) => cs.clients);
    },
  });

  // Pages
  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ['meta-pages', selectedClientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-campaigns', {
        body: { action: 'list_pages', client_id: selectedClientId },
      });
      if (error || data?.error) return [];
      return data?.pages || [];
    },
    enabled: !!selectedClientId,
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async () => {
      if (!imageFile || !selectedClientId) throw new Error('Selecione imagem e cliente.');

      // Upload to Supabase Storage first
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const path = `${selectedClientId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('ad-creatives').upload(path, imageFile);
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage.from('ad-creatives').getPublicUrl(path);

      // Upload to Meta
      const { data, error } = await supabase.functions.invoke('meta-ads-campaigns', {
        body: { action: 'upload_image', client_id: selectedClientId, image_url: urlData.publicUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.image_hash;
    },
    onSuccess: (hash) => {
      setImageHash(hash);
      toast.success('Imagem enviada ao Meta com sucesso!');
    },
    onError: (error: any) => toast.error('Erro no upload: ' + error.message),
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-campaigns', {
        body: {
          action: 'create_campaign',
          client_id: selectedClientId,
          campaign_name: campaignName,
          objective,
          daily_budget: parseFloat(dailyBudget),
          optimization_goal: optimizationGoal,
          page_id: pageId || undefined,
          image_hash: imageHash,
          primary_text: primaryText,
          headline,
          description,
          link_url: linkUrl,
          call_to_action: callToAction,
          targeting: {
            geo_locations: { countries: ['BR'] },
            age_min: parseInt(ageMin),
            age_max: parseInt(ageMax),
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setStep(4); // success step
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageHash(null);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  const canProceedStep1 = selectedClientId && campaignName && dailyBudget;
  const canProceedStep2 = true; // Image is now optional
  const canProceedStep3 = primaryText && linkUrl;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === s ? 'bg-primary text-primary-foreground' :
              step > s ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
            {s < 4 && <div className={`w-12 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
        <span className="text-sm text-muted-foreground ml-2">
          {step === 1 && 'Configuração'}
          {step === 2 && 'Criativo'}
          {step === 3 && 'Conteúdo'}
          {step === 4 && 'Concluído'}
        </span>
      </div>

      {/* Step 1: Campaign Config */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuração da Campanha</CardTitle>
            <CardDescription>Defina cliente, objetivo e orçamento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {trafficClients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {campaignStrategy && !strategyLoaded && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Estratégia de Campanha Disponível</span>
                  <Badge variant="secondary" className="text-xs">Consultoria</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Este cliente possui uma estratégia personalizada. Ao aplicar, todos os campos serão preenchidos automaticamente.
                </p>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const raw = campaignStrategy as string;
                    
                    // Try to extract structured data block first
                    const structuredMatch = raw.match(/---STRUCTURED---\n([\s\S]*?)$/);
                    const dataBlockMatch = raw.match(/---CAMPAIGN_DATA_START---([\s\S]*?)---CAMPAIGN_DATA_END---/);
                    const dataBlock = structuredMatch?.[1] || dataBlockMatch?.[1] || '';
                    
                    if (dataBlock.trim()) {
                      // Parse structured key:value pairs
                      const parseField = (key: string): string => {
                        const regex = new RegExp(`^${key}:\\s*(.+)$`, 'mi');
                        const match = dataBlock.match(regex);
                        return match?.[1]?.trim() || '';
                      };
                      
                      const name = parseField('campaign_name');
                      const obj = parseField('objective');
                      const optGoal = parseField('optimization_goal');
                      const budget = parseField('daily_budget');
                      const ageMinVal = parseField('age_min');
                      const ageMaxVal = parseField('age_max');
                      const text = parseField('primary_text');
                      const head = parseField('headline');
                      const desc = parseField('description');
                      const cta = parseField('call_to_action');
                      const url = parseField('link_url');
                      
                      if (name) setCampaignName(name);
                      if (obj && OBJECTIVES.find(o => o.value === obj)) {
                        setObjective(obj);
                        if (optGoal && OPTIMIZATION_GOALS[obj]?.find(o => o.value === optGoal)) {
                          setOptimizationGoal(optGoal);
                        } else {
                          setOptimizationGoal(OPTIMIZATION_GOALS[obj]?.[0]?.value || 'LINK_CLICKS');
                        }
                      }
                      if (budget) {
                        const budgetNum = budget.replace(/[^\d.,]/g, '').replace(',', '.');
                        if (budgetNum) setDailyBudget(budgetNum);
                      }
                      if (ageMinVal) setAgeMin(ageMinVal.replace(/\D/g, '') || '18');
                      if (ageMaxVal) setAgeMax(ageMaxVal.replace(/\D/g, '') || '65');
                      if (text) setPrimaryText(text);
                      if (head) setHeadline(head);
                      if (desc) setDescription(desc);
                      if (cta && CTA_OPTIONS.find(c => c.value === cta)) setCallToAction(cta);
                      if (url) setLinkUrl(url);
                      
                      setStrategyLoaded(true);
                      toast.success('Campanha preenchida automaticamente com a estratégia!');
                    } else {
                      // Fallback: intelligent text parsing
                      const s = raw.toLowerCase();
                      if (s.includes('leads') || s.includes('geração de leads')) {
                        setObjective('OUTCOME_LEADS');
                        setOptimizationGoal('LEAD_GENERATION');
                      } else if (s.includes('vendas') || s.includes('conversão')) {
                        setObjective('OUTCOME_SALES');
                        setOptimizationGoal('OFFSITE_CONVERSIONS');
                      } else if (s.includes('reconhecimento') || s.includes('awareness')) {
                        setObjective('OUTCOME_AWARENESS');
                        setOptimizationGoal('REACH');
                      } else if (s.includes('engajamento')) {
                        setObjective('OUTCOME_ENGAGEMENT');
                        setOptimizationGoal('POST_ENGAGEMENT');
                      }
                      if (s.includes('whatsapp')) setCallToAction('SEND_WHATSAPP_MESSAGE');
                      
                      // Try to extract fields from text
                      const lines = raw.split('\n').filter((l: string) => l.trim());
                      for (const line of lines) {
                        const lower = line.toLowerCase();
                        const val = line.split(':').slice(1).join(':').trim();
                        if (!val) continue;
                        if (lower.includes('texto principal') || lower.includes('primary_text')) {
                          if (!primaryText) setPrimaryText(val);
                        } else if (lower.includes('headline') || lower.includes('título do anúncio')) {
                          if (!headline) setHeadline(val);
                        } else if (lower.includes('orçamento diário') || lower.includes('daily_budget')) {
                          const num = val.replace(/[^\d.,]/g, '').replace(',', '.');
                          if (num && !dailyBudget) setDailyBudget(num);
                        } else if (lower.includes('link') || lower.includes('url destino')) {
                          if (val.startsWith('http') && !linkUrl) setLinkUrl(val);
                        }
                      }
                      
                      setStrategyLoaded(true);
                      toast.info('Estratégia aplicada parcialmente. Gere o plano completo no chat de consultoria para preenchimento total.');
                    }
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  Aplicar Estratégia Automaticamente
                </Button>
              </div>
            )}
            {strategyLoaded && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-700 dark:text-green-400">Campanha preenchida com estratégia personalizada da consultoria.</span>
              </div>
            )}
            <div>
              <Label>Nome da Campanha</Label>
              <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ex: Promoção Janeiro 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Objetivo</Label>
                <Select value={objective} onValueChange={v => { setObjective(v); setOptimizationGoal(OPTIMIZATION_GOALS[v]?.[0]?.value || 'LINK_CLICKS'); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Otimização</Label>
                <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(OPTIMIZATION_GOALS[objective] || []).map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Orçamento Diário (R$)</Label>
                <Input type="number" value={dailyBudget} onChange={e => setDailyBudget(e.target.value)} placeholder="50.00" min="1" step="0.01" />
              </div>
              <div>
                <Label>Página do Facebook</Label>
                {pagesLoading ? (
                  <div className="flex items-center gap-2 h-10"><Loader2 className="h-4 w-4 animate-spin" /> <span className="text-sm text-muted-foreground">Carregando...</span></div>
                ) : pages.length > 0 ? (
                  <Select value={pageId} onValueChange={setPageId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {pages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">Selecione um cliente primeiro.</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Idade Mínima</Label>
                <Input type="number" value={ageMin} onChange={e => setAgeMin(e.target.value)} min="13" max="65" />
              </div>
              <div>
                <Label>Idade Máxima</Label>
                <Input type="number" value={ageMax} onChange={e => setAgeMax(e.target.value)} min="13" max="65" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Creative Upload */}
      {step === 2 && (
        <Card>
          <CardHeader>
           <CardTitle className="text-base">Upload do Criativo</CardTitle>
            <CardDescription>Envie a imagem do anúncio ou pule para adicionar depois.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {imagePreview ? (
                <div className="space-y-3">
                  <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                  <div className="flex items-center justify-center gap-2">
                    {imageHash ? (
                      <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Enviada ao Meta</Badge>
                    ) : (
                      <Button onClick={() => uploadImageMutation.mutate()} disabled={uploadImageMutation.isPending} size="sm">
                        {uploadImageMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Enviar ao Meta
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => { setImageFile(null); setImagePreview(null); setImageHash(null); }}>
                      Trocar imagem
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Image className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para selecionar uma imagem</p>
                  <p className="text-xs text-muted-foreground mt-1">(Opcional — você pode adicionar depois)</p>
                  <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </label>
              )}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={() => setStep(3)}>
                {imageHash ? 'Próximo' : 'Pular Criativo'} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Ad Content */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conteúdo do Anúncio</CardTitle>
            <CardDescription>Escreva os textos e defina o link de destino.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Texto Principal</Label>
              <Textarea value={primaryText} onChange={e => setPrimaryText(e.target.value)} placeholder="O texto que aparece acima da imagem..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Título</Label>
                <Input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Título do anúncio" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição curta" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>URL de Destino</Label>
                <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://seusite.com" />
              </div>
              <div>
                <Label>Botão (CTA)</Label>
                <Select value={callToAction} onValueChange={setCallToAction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CTA_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Preview do Anúncio</p>
                <div className="space-y-2">
                  <p className="text-sm">{primaryText || 'Texto principal...'}</p>
                  {imagePreview && <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded" />}
                  <div className="flex items-center justify-between bg-background p-2 rounded">
                    <div>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{linkUrl || 'seusite.com'}</p>
                      <p className="text-sm font-medium">{headline || 'Título'}</p>
                      <p className="text-xs text-muted-foreground">{description || 'Descrição'}</p>
                    </div>
                    <Badge variant="outline">{CTA_OPTIONS.find(c => c.value === callToAction)?.label || 'Saiba Mais'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={() => createCampaignMutation.mutate()} disabled={!canProceedStep3 || createCampaignMutation.isPending}>
                {createCampaignMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                Criar Campanha (Pausada)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <Card className="border-primary/20">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">Campanha Criada com Sucesso!</h3>
            <p className="text-muted-foreground mb-4">
              A campanha <strong>{campaignName}</strong> foi criada no Meta Ads com status <Badge>PAUSADA</Badge>.
              Ative-a quando estiver pronto no Dashboard ou diretamente no Gerenciador de Anúncios.
            </p>
            <Button onClick={() => {
              setStep(1);
              setCampaignName(''); setDailyBudget(''); setPrimaryText(''); setHeadline('');
              setDescription(''); setLinkUrl(''); setImageFile(null); setImagePreview(null); setImageHash(null);
            }}>
              Criar Outra Campanha
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
