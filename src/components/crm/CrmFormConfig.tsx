import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Loader2, Save, FileText, Upload, Image } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  portalToken: string;
}

export default function CrmFormConfig({ clientId, portalToken }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [enableLeadForm, setEnableLeadForm] = useState(false);
  const [rewardText, setRewardText] = useState('');
  const [whatsappRedirectNumber, setWhatsappRedirectNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandColor, setBrandColor] = useState('#6366f1');
  const [clientLogoUrl, setClientLogoUrl] = useState('');
  const [useClientLogo, setUseClientLogo] = useState(true);

  const formUrl = `${window.location.origin}/formulario/${portalToken}`;

  useEffect(() => {
    (async () => {
      const [{ data: config }, { data: client }] = await Promise.all([
        supabase.from('crm_quote_configs').select('*').eq('client_id', clientId).maybeSingle(),
        supabase.from('clients').select('logo_url, name').eq('id', clientId).maybeSingle(),
      ]);

      const registeredLogo = client?.logo_url || '';
      setClientLogoUrl(registeredLogo);

      if (config) {
        setEnableLeadForm((config as any).enable_lead_form || false);
        setRewardText((config as any).reward_text || '');
        setWhatsappRedirectNumber((config as any).whatsapp_redirect_number || '');
        setLogoUrl(config.logo_url || '');
        setBrandName(config.brand_name || client?.name || '');
        setBrandColor(config.brand_color || '#6366f1');
        // If no custom logo, use client's
        setUseClientLogo(!config.logo_url && !!registeredLogo);
      } else {
        setBrandName(client?.name || '');
        setUseClientLogo(!!registeredLogo);
      }
      setLoading(false);
    })();
  }, [clientId]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 2MB'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${clientId}/form-logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from('client-logos').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('client-logos').getPublicUrl(path);
      setLogoUrl(publicUrl);
      setUseClientLogo(false);
      toast.success('Logo enviada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao enviar logo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const effectiveLogo = useClientLogo ? clientLogoUrl : logoUrl;
    const payload: any = {
      client_id: clientId,
      enable_lead_form: enableLeadForm,
      reward_text: rewardText || null,
      whatsapp_redirect_number: whatsappRedirectNumber || null,
      logo_url: effectiveLogo || null,
      brand_name: brandName || null,
      brand_color: brandColor || '#6366f1',
    };

    const { data: existing } = await supabase.from('crm_quote_configs').select('id').eq('client_id', clientId).maybeSingle();
    if (existing) {
      await supabase.from('crm_quote_configs').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('crm_quote_configs').insert(payload);
    }

    toast.success('Configurações do formulário salvas!');
    setSaving(false);
  };

  const copyLink = () => { navigator.clipboard.writeText(formUrl); toast.success('Link copiado!'); };

  const effectiveLogo = useClientLogo ? clientLogoUrl : logoUrl;

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Formulário de Captura de Leads</CardTitle>
          </div>
          <CardDescription>Configure o formulário público para capturar leads automaticamente no CRM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Ativar formulário</Label>
            <Switch checked={enableLeadForm} onCheckedChange={setEnableLeadForm} />
          </div>

          {enableLeadForm && (
            <>
              {/* Link do formulário */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <Label className="text-xs font-medium text-primary">Link do formulário</Label>
                <div className="flex items-center gap-2">
                  <Input value={formUrl} readOnly className="text-xs font-mono" />
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={copyLink}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => window.open(formUrl, '_blank')}><ExternalLink className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              {/* Logo - Preview + Opções */}
              <div className="space-y-3">
                <Label className="text-xs font-medium">Logo do Formulário</Label>
                
                {/* Preview */}
                {effectiveLogo && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                    <img src={effectiveLogo} alt="Logo" className="h-12 w-12 object-contain rounded-lg border bg-white" />
                    <div className="flex-1">
                      <p className="text-xs font-medium">{useClientLogo ? 'Logo do cadastro do cliente' : 'Logo personalizada'}</p>
                      <p className="text-[10px] text-muted-foreground">Esta logo será exibida no formulário</p>
                    </div>
                  </div>
                )}

                {/* Opções */}
                <div className="space-y-2">
                  {clientLogoUrl && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-primary" />
                        <span className="text-xs">Usar logo cadastrada do cliente</span>
                      </div>
                      <Switch checked={useClientLogo} onCheckedChange={(v) => { setUseClientLogo(v); if (v) setLogoUrl(''); }} />
                    </div>
                  )}
                  
                  {!useClientLogo && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={logoUrl}
                          onChange={e => setLogoUrl(e.target.value)}
                          placeholder="https://... (URL da logo)"
                          className="flex-1 text-xs"
                        />
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
                          <Button variant="outline" size="sm" className="gap-1.5" disabled={uploading} asChild>
                            <span>{uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Upload</span>
                          </Button>
                        </label>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Cole uma URL ou faça upload de uma imagem (máx. 2MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs">Nome da marca</Label>
                <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Ex: Restaurante do João" className="mt-1" />
              </div>

              <div>
                <Label className="text-xs">Cor principal</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="font-mono flex-1" />
                </div>
              </div>

              <div>
                <Label className="text-xs">Texto da recompensa / brinde</Label>
                <Input value={rewardText} onChange={e => setRewardText(e.target.value)} placeholder="Ex: Preencha e ganhe uma sobremesa grátis!" className="mt-1" />
              </div>

              <div>
                <Label className="text-xs">WhatsApp para redirecionamento</Label>
                <Input value={whatsappRedirectNumber} onChange={e => setWhatsappRedirectNumber(e.target.value)} placeholder="(00) 00000-0000" className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">Após o cadastro, o lead será redirecionado para esse WhatsApp.</p>
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar configurações
          </Button>
        </CardContent>
      </Card>

      {enableLeadForm && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">Info</Badge>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Leads cadastrados pelo formulário entram automaticamente no CRM com status "Novo" e origem "Formulário".</p>
                <p>Se o lead já existir (mesmo telefone), os dados são atualizados.</p>
                <p>A data de aniversário capturada é usada nas campanhas automáticas.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
