import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, FileText, Plus, X, Save, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  clientId: string;
  portalToken?: string;
}

export default function CrmQuoteConfig({ clientId, portalToken }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Branding
  const [brandName, setBrandName] = useState("Peformake");
  const [tagline, setTagline] = useState("Agência de Marketing Digital");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#6366f1");
  const [accentColor, setAccentColor] = useState("#8b5cf6");
  const [footerText, setFooterText] = useState("");
  const [ctaText, setCtaText] = useState("Aceitar Proposta");
  const [socialProof, setSocialProof] = useState("");
  const [nicheIcon, setNicheIcon] = useState("");
  const [showCatalog, setShowCatalog] = useState(true);
  const [whatsappAuto, setWhatsappAuto] = useState(true);
  const [validDays, setValidDays] = useState(7);
  const [persuasionTexts, setPersuasionTexts] = useState<string[]>([]);
  const [newPersuasion, setNewPersuasion] = useState("");
  const [pdfHeaderText, setPdfHeaderText] = useState("");
  const [pdfFooterText, setPdfFooterText] = useState("");

  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Load config and client logo in parallel
      const [cfgRes, clientRes] = await Promise.all([
        supabase.from("crm_quote_configs").select("*").eq("client_id", clientId).maybeSingle(),
        supabase.from("clients").select("logo_url").eq("id", clientId).maybeSingle(),
      ]);

      if (clientRes.data?.logo_url) {
        setClientLogoUrl(clientRes.data.logo_url);
      }

      const data = cfgRes.data;
      if (data) {
        setBrandName(data.brand_name || "Peformake");
        setTagline(data.tagline || "");
        setLogoUrl(data.logo_url || "");
        setBrandColor(data.brand_color || "#6366f1");
        setAccentColor(data.accent_color || "#8b5cf6");
        setFooterText(data.footer_text || "");
        setCtaText(data.cta_text || "Aceitar Proposta");
        setSocialProof(data.social_proof_text || "");
        setNicheIcon(data.niche_icon || "");
        setShowCatalog(data.show_catalog_images ?? true);
        setWhatsappAuto(data.whatsapp_auto_send ?? true);
        setValidDays(data.valid_days || 7);
        setPersuasionTexts((data.persuasion_texts as string[]) || []);
        setPdfHeaderText(data.pdf_header_text || "");
        setPdfFooterText(data.pdf_footer_text || "");
      }
      setLoading(false);
    })();
  }, [clientId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        brand_name: brandName,
        tagline,
        logo_url: logoUrl || null,
        brand_color: brandColor,
        accent_color: accentColor,
        footer_text: footerText,
        cta_text: ctaText,
        social_proof_text: socialProof || null,
        niche_icon: nicheIcon || null,
        show_catalog_images: showCatalog,
        whatsapp_auto_send: whatsappAuto,
        valid_days: validDays,
        persuasion_texts: persuasionTexts as any,
        pdf_header_text: pdfHeaderText || null,
        pdf_footer_text: pdfFooterText || null,
      };

      const { error } = await supabase
        .from("crm_quote_configs")
        .upsert(payload, { onConflict: "client_id" });

      if (error) throw error;
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addPersuasionText = () => {
    if (!newPersuasion.trim()) return;
    setPersuasionTexts([...persuasionTexts, newPersuasion.trim()]);
    setNewPersuasion("");
  };

  const removePersuasionText = (idx: number) => {
    setPersuasionTexts(persuasionTexts.filter((_, i) => i !== idx));
  };

  const quoteUrl = portalToken ? `${window.location.origin}/orcamento/PFMK-XXXX` : "";

  const copyQuoteLink = () => {
    navigator.clipboard.writeText(quoteUrl);
    toast.success("Link de exemplo copiado! O link real é gerado ao criar cada orçamento.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configurações de Orçamento & Formulário
          </h3>
          <p className="text-sm text-muted-foreground">Personalize a página de orçamento e o formulário de captação</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Marca & Design
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome da Marca</Label>
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Nome da empresa" />
            </div>
            <div>
              <Label>Slogan</Label>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Descrição curta" />
            </div>
          </div>

          <div>
            <Label>URL do Logo (deixe vazio para usar a logo do cliente)</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://... (ou deixe vazio)" />
            <div className="mt-2 flex items-center gap-4">
              {(logoUrl || clientLogoUrl) && (
                <div className="p-3 bg-muted rounded-lg inline-flex items-center gap-3">
                  <img src={logoUrl || clientLogoUrl || ''} alt="Logo" className="h-12 object-contain" />
                  <span className="text-xs text-muted-foreground">
                    {logoUrl ? 'Logo personalizada' : 'Logo do cadastro do cliente'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cor Principal</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <Label>Cor de Destaque</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Ícone do Nicho (emoji)</Label>
              <Input value={nicheIcon} onChange={(e) => setNicheIcon(e.target.value)} placeholder="🍽️ (auto se vazio)" />
            </div>
            <div>
              <Label>Texto do Botão CTA</Label>
              <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Aceitar Proposta" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quote Link Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Link de Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <Label className="text-xs text-muted-foreground">Exemplo de link de orçamento:</Label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm font-mono break-all flex-1">{quoteUrl}</p>
              <Button variant="outline" size="sm" onClick={copyQuoteLink}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Cada orçamento gera um link único automaticamente. O formulário de captura é configurado na aba "Formulário".</p>
          </div>
        </CardContent>
      </Card>

      {/* Persuasion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 Textos Persuasivos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Dados e argumentos que aparecem na página de orçamento</p>

          {persuasionTexts.map((text, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
              <p className="text-sm flex-1">{text}</p>
              <button onClick={() => removePersuasionText(i)} className="text-destructive hover:opacity-80">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              value={newPersuasion}
              onChange={(e) => setNewPersuasion(e.target.value)}
              placeholder="Ex: +300% de aumento no engajamento em 90 dias"
              onKeyDown={(e) => { if (e.key === "Enter") addPersuasionText(); }}
            />
            <Button variant="outline" size="sm" onClick={addPersuasionText}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <Label>Prova Social</Label>
            <Textarea
              value={socialProof}
              onChange={(e) => setSocialProof(e.target.value)}
              placeholder="Ex: Mais de 50 empresas já aumentaram seu faturamento conosco"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">⚙️ Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enviar automaticamente por WhatsApp</Label>
              <p className="text-xs text-muted-foreground">Ao criar orçamento, enviar link automaticamente</p>
            </div>
            <Switch checked={whatsappAuto} onCheckedChange={setWhatsappAuto} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Exibir imagens do catálogo</Label>
              <p className="text-xs text-muted-foreground">Mostrar fotos dos produtos na página</p>
            </div>
            <Switch checked={showCatalog} onCheckedChange={setShowCatalog} />
          </div>

          <div>
            <Label>Validade padrão (dias)</Label>
            <Input type="number" value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} min={1} className="w-24" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Texto rodapé PDF</Label>
              <Input value={pdfFooterText} onChange={(e) => setPdfFooterText(e.target.value)} placeholder="Texto do rodapé do PDF" />
            </div>
            <div>
              <Label>Texto rodapé página</Label>
              <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Texto do rodapé da página" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-2">Prévia das cores:</p>
        <div className="inline-flex gap-2 p-3 rounded-xl border">
          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: brandColor }} />
          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: accentColor }} />
          <div className="w-8 h-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${brandColor}, ${accentColor})` }} />
        </div>
      </div>
    </div>
  );
}
