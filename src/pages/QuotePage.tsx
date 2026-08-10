import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, Download, Clock, ArrowRight, Star, Shield, Zap, ChevronDown, TrendingUp, Users, Award, BarChart3, Target, Sparkles, Gift, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoPfmk from "@/assets/logo-pfmk.png";
import { buildStandardPdfHtml, exportHtmlToPdf, pdfSectionTitle } from "@/lib/pdfUtils";

interface QuoteItem {
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  image_url?: string;
  category?: string;
}

interface QuoteData {
  id: string;
  code: string;
  lead_name: string;
  lead_segment: string | null;
  title: string;
  items: QuoteItem[];
  total_value: number;
  discount_percent: number;
  discount_value: number;
  final_value: number;
  notes: string | null;
  valid_until: string;
  status: string;
  viewed_at: string | null;
  accepted_at: string | null;
  created_at: string;
  client_id: string | null;
}

interface QuoteConfig {
  brand_name: string;
  tagline: string;
  logo_url: string | null;
  brand_color: string;
  accent_color: string;
  footer_text: string;
  cover_image_url: string | null;
  show_catalog_images: boolean;
  persuasion_texts: string[];
  social_proof_text: string | null;
  niche_icon: string | null;
  cta_text: string;
  pdf_header_text: string | null;
  pdf_footer_text: string | null;
  reward_text: string | null;
  whatsapp_redirect_number: string | null;
  page_type: string;
}

interface CatalogProduct {
  name: string;
  image_url: string | null;
  price: number | null;
  description: string | null;
}

const DEFAULT_CONFIG: QuoteConfig = {
  brand_name: "Peformake",
  tagline: "Agência de Marketing Digital",
  logo_url: null,
  brand_color: "#6366f1",
  accent_color: "#8b5cf6",
  footer_text: "Documento gerado automaticamente",
  cover_image_url: null,
  show_catalog_images: true,
  persuasion_texts: [
    "Empresas que investem em marketing digital crescem 2.8x mais rápido",
    "ROI médio de 300% nos primeiros 6 meses de campanha",
    "Mais de 50 clientes atendidos com resultados comprovados",
    "Suporte dedicado e relatórios mensais de performance",
  ],
  social_proof_text: "Mais de 50 empresas já transformaram seus resultados com nossa metodologia.",
  niche_icon: null,
  cta_text: "Aceitar Proposta",
  pdf_header_text: null,
  pdf_footer_text: null,
  reward_text: null,
  whatsapp_redirect_number: null,
  page_type: "quote",
};

const SEGMENT_ICONS: Record<string, string> = {
  restaurante: "🍽️", clinica: "🏥", loja: "🛍️", ecommerce: "🛒",
  saude: "💊", beleza: "💅", educacao: "📚", tecnologia: "💻",
  imobiliaria: "🏠", advocacia: "⚖️", contabilidade: "📊",
  odontologia: "🦷", fitness: "💪", pet: "🐾", automotivo: "🚗", construcao: "🏗️",
};

const SEGMENT_STATS: Record<string, { stat: string; label: string }[]> = {
  restaurante: [
    { stat: "73%", label: "dos clientes pesquisam online antes de escolher um restaurante" },
    { stat: "4.2x", label: "mais pedidos com presença digital ativa" },
    { stat: "68%", label: "aumento médio no ticket com cardápio digital estratégico" },
  ],
  clinica: [
    { stat: "82%", label: "dos pacientes buscam médicos no Google" },
    { stat: "3.5x", label: "mais agendamentos com marketing digital" },
    { stat: "45%", label: "redução no custo de aquisição de pacientes" },
  ],
  beleza: [
    { stat: "89%", label: "das clientes descobrem salões pelo Instagram" },
    { stat: "5x", label: "mais agendamentos com conteúdo estratégico" },
    { stat: "62%", label: "aumento na fidelização com CRM automatizado" },
  ],
  fitness: [
    { stat: "76%", label: "das matrículas começam com pesquisa online" },
    { stat: "3.8x", label: "mais leads com anúncios geolocalizados" },
    { stat: "55%", label: "redução na taxa de cancelamento com engajamento digital" },
  ],
  default: [
    { stat: "70%", label: "dos consumidores pesquisam online antes de comprar" },
    { stat: "3x", label: "mais conversões com estratégia digital profissional" },
    { stat: "50%", label: "redução no CAC com marketing direcionado" },
  ],
};

function getSegmentIcon(segment?: string | null, configIcon?: string | null) {
  if (configIcon) return configIcon;
  if (!segment) return "🚀";
  const key = segment.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [k, v] of Object.entries(SEGMENT_ICONS)) {
    if (key.includes(k)) return v;
  }
  return "🚀";
}

function getSegmentStats(segment?: string | null) {
  if (!segment) return SEGMENT_STATS.default;
  const key = segment.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [k, v] of Object.entries(SEGMENT_STATS)) {
    if (key.includes(k)) return v;
  }
  return SEGMENT_STATS.default;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function isExpired(validUntil: string) {
  return new Date(validUntil) < new Date();
}

// ── Persuasion section ──
function PersuasionSection({ texts, color }: { texts: string[]; color: string }) {
  if (!texts || texts.length === 0) return null;
  const icons = [TrendingUp, Users, Award, Star];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
      {texts.map((text, i) => {
        const Icon = icons[i % icons.length];
        return (
          <div key={i} className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="shrink-0 p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-sm text-gray-600">{text}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Data-driven stats section ──
function StatsSection({ segment, color }: { segment?: string | null; color: string }) {
  const stats = getSegmentStats(segment);
  return (
    <div className="grid grid-cols-3 gap-3 mb-10">
      {stats.map((s, i) => {
        const icons = [BarChart3, Target, Sparkles];
        const Icon = icons[i % icons.length];
        return (
          <div key={i} className="text-center bg-gray-50 border border-gray-100 rounded-xl p-5">
            <Icon className="w-5 h-5 mx-auto mb-2 opacity-60" style={{ color }} />
            <p className="text-2xl md:text-3xl font-black" style={{ color }}>{s.stat}</p>
            <p className="text-[11px] md:text-xs text-gray-500 mt-1 leading-tight">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Build PDF HTML ──
function buildQuotePdfHtml(quote: QuoteData, config: QuoteConfig, logoSrc: string): string {
  const stats = getSegmentStats(quote.lead_segment);

  const statsHtml = `<div style="display:flex;gap:12px;margin-bottom:20px;">
    ${stats.map(s => `<div style="flex:1;text-align:center;padding:12px;background:#f8f9fa;border-radius:8px;border:1px solid #e5e7eb;">
      <p style="margin:0;font-size:20px;font-weight:bold;color:${config.brand_color};">${s.stat}</p>
      <p style="margin:4px 0 0;font-size:10px;color:#666;">${s.label}</p>
    </div>`).join('')}
  </div>`;

  // Group items by category
  const categories = new Map<string, QuoteItem[]>();
  quote.items.forEach(item => {
    const cat = item.category || 'Serviços';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(item);
  });

  let itemsHtml = '';
  categories.forEach((items, cat) => {
    if (categories.size > 1) {
      itemsHtml += `<h3 style="margin:16px 0 8px;font-size:14px;font-weight:bold;color:${config.brand_color};border-bottom:2px solid #e5e7eb;padding-bottom:4px;">${cat}</h3>`;
    }
    itemsHtml += `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
      <thead><tr style="border-bottom:2px solid #e5e7eb;">
        <th style="text-align:left;padding:8px;font-size:12px;color:${config.brand_color};">Serviço</th>
        <th style="text-align:center;padding:8px;font-size:12px;color:${config.brand_color};">Qtd</th>
        <th style="text-align:right;padding:8px;font-size:12px;color:${config.brand_color};">Valor</th>
      </tr></thead><tbody>`;
    items.forEach(item => {
      itemsHtml += `<tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:8px;font-size:13px;"><strong>${item.name}</strong>${item.description ? `<br/><span style="font-size:11px;color:#888;">${item.description}</span>` : ''}</td>
        <td style="text-align:center;padding:8px;font-size:13px;">${item.quantity || 1}</td>
        <td style="text-align:right;padding:8px;font-size:13px;font-weight:bold;">${formatCurrency(item.price * (item.quantity || 1))}</td>
      </tr>`;
    });
    itemsHtml += `</tbody></table>`;
  });

  const totalHtml = `<div style="text-align:right;font-size:14px;margin-top:16px;padding:16px;background:#f8f9fa;border-radius:10px;">
    ${quote.discount_value > 0 ? `
      <p style="margin:4px 0;color:#888;">Subtotal: ${formatCurrency(quote.total_value)}</p>
      <p style="margin:4px 0;color:#22c55e;">Desconto (${quote.discount_percent}%): -${formatCurrency(quote.discount_value)}</p>
    ` : ''}
    <p style="margin:8px 0;font-size:22px;font-weight:bold;color:${config.brand_color};">Total: ${formatCurrency(quote.final_value)}/mês</p>
  </div>`;

  const notesHtml = quote.notes ? `<div style="margin-top:20px;padding:15px;background:#f9fafb;border-radius:8px;font-size:12px;color:#555;border-left:3px solid ${config.brand_color};">
    <strong>Observações:</strong><br/>${quote.notes}
  </div>` : '';

  const validityHtml = `<div style="margin-top:20px;padding:12px;background:${config.brand_color}10;border-radius:8px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#555;">📅 Proposta válida até <strong>${formatDate(quote.valid_until)}</strong></p>
  </div>`;

  const body = `
    <div style="background:linear-gradient(135deg,${config.brand_color},${config.accent_color});color:white;padding:18px;border-radius:10px;margin-bottom:25px;">
      <h2 style="margin:0 0 6px;font-size:18px;">Para: ${quote.lead_name}</h2>
      ${quote.lead_segment ? `<p style="margin:0;font-size:13px;opacity:0.9;">Segmento: ${quote.lead_segment}</p>` : ''}
      <p style="margin:4px 0 0;font-size:11px;opacity:0.7;">Código: ${quote.code} • Criado em ${formatDate(quote.created_at)}</p>
    </div>
    ${statsHtml}
    ${itemsHtml}
    ${totalHtml}
    ${notesHtml}
    ${validityHtml}
  `;

  return buildStandardPdfHtml({
    title: quote.title,
    subtitle: `Código: ${quote.code}`,
    clientName: quote.lead_name,
    clientExtra: quote.lead_segment ? `Segmento: ${quote.lead_segment}` : undefined,
    body,
  });
}

// ── GASTRONOMY FORM PAGE ──
function GastroFormPage({ clientId, config, logoSrc }: { clientId: string; config: QuoteConfig; logoSrc: string }) {
  const [formName, setFormName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !phone.trim() || !birthday) {
      toast.error("Preencha nome, telefone e data de aniversário");
      return;
    }
    setSubmitting(true);
    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const { data: existingLead } = await supabase
        .from("crm_leads")
        .select("id")
        .eq("client_id", clientId)
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (existingLead) {
        await supabase.from("crm_leads").update({
          name: formName.trim(), email: email.trim() || null, birthday, source: "gastro_form",
        } as any).eq("id", existingLead.id);
      } else {
        await supabase.from("crm_leads").insert({
          client_id: clientId, name: formName.trim(), phone: cleanPhone,
          email: email.trim() || null, birthday, source: "gastro_form", status: "new",
        } as any);
      }

      setSubmitted(true);
      const waNumber = config.whatsapp_redirect_number?.replace(/\D/g, "") || "";
      if (waNumber) {
        const waMsg = encodeURIComponent("Gostaria de resgatar meu brinde por preencher o formulário.");
        setTimeout(() => {
          window.location.href = `https://wa.me/${waNumber.startsWith("55") ? waNumber : "55" + waNumber}?text=${waMsg}`;
        }, 2500);
      }
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${config.brand_color}15, ${config.accent_color}10)` }}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: `${config.brand_color}20` }}>
            <PartyPopper className="w-10 h-10" style={{ color: config.brand_color }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro realizado! 🎉</h1>
          <p className="text-gray-600">{config.reward_text || "Parabéns! Você ganhou um brinde especial. Redirecionando para o WhatsApp..."}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Redirecionando para o WhatsApp...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${config.brand_color}08, ${config.accent_color}05)` }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img src={logoSrc} alt={config.brand_name} className="h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-gray-900">{config.brand_name}</h1>
          {config.tagline && <p className="text-sm text-gray-500 mt-1">{config.tagline}</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-xl border p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: `${config.brand_color}15` }}>
              <Gift className="w-6 h-6" style={{ color: config.brand_color }} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{config.reward_text || "Preencha e ganhe um brinde especial!"}</h2>
            <p className="text-xs text-gray-500">Cadastre-se e resgate seu presente</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label className="text-sm text-gray-700">Nome *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Seu nome completo" required className="mt-1" /></div>
            <div><Label className="text-sm text-gray-700">Telefone / WhatsApp *</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" required className="mt-1" type="tel" /></div>
            <div><Label className="text-sm text-gray-700">E-mail</Label><Input value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" type="email" className="mt-1" /></div>
            <div><Label className="text-sm text-gray-700">Data de Aniversário *</Label><Input value={birthday} onChange={e => setBirthday(e.target.value)} type="date" required className="mt-1" /></div>
            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl text-white" style={{ backgroundColor: config.brand_color }} disabled={submitting}>
              {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Gift className="w-5 h-5 mr-2" />Quero meu brinde!</>}
            </Button>
          </form>
          <p className="text-[10px] text-gray-400 text-center">Ao se cadastrar, você concorda com nossa política de privacidade.</p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">{config.footer_text}</p>
      </div>
    </div>
  );
}

function buildConfig(cfgData: any): QuoteConfig {
  return {
    brand_name: cfgData.brand_name || DEFAULT_CONFIG.brand_name,
    tagline: cfgData.tagline || DEFAULT_CONFIG.tagline,
    logo_url: cfgData.logo_url,
    brand_color: cfgData.brand_color || DEFAULT_CONFIG.brand_color,
    accent_color: cfgData.accent_color || DEFAULT_CONFIG.accent_color,
    footer_text: cfgData.footer_text || DEFAULT_CONFIG.footer_text,
    cover_image_url: cfgData.cover_image_url,
    show_catalog_images: cfgData.show_catalog_images ?? true,
    persuasion_texts: (cfgData.persuasion_texts as string[]) || DEFAULT_CONFIG.persuasion_texts,
    social_proof_text: cfgData.social_proof_text || DEFAULT_CONFIG.social_proof_text,
    niche_icon: cfgData.niche_icon,
    cta_text: cfgData.cta_text || DEFAULT_CONFIG.cta_text,
    pdf_header_text: cfgData.pdf_header_text,
    pdf_footer_text: cfgData.pdf_footer_text,
    reward_text: (cfgData as any).reward_text || null,
    whatsapp_redirect_number: (cfgData as any).whatsapp_redirect_number || null,
    page_type: (cfgData as any).page_type || 'quote',
  };
}

export default function QuotePage() {
  const { code, token } = useParams<{ code?: string; token?: string }>();
  const location = useLocation();
  const isFormRoute = location.pathname.startsWith("/formulario/");
  const lookupKey = token || code;

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [config, setConfig] = useState<QuoteConfig>(DEFAULT_CONFIG);
  const [catalogImages, setCatalogImages] = useState<Record<string, string>>({});
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formClientId, setFormClientId] = useState<string | null>(null);

  useEffect(() => {
    if (!lookupKey) return;
    (async () => {
      if (isFormRoute) {
        const { data: client } = await supabase.from("clients").select("id, logo_url").eq("portal_token", lookupKey).maybeSingle();
        if (client) {
          setClientLogoUrl(client.logo_url);
          const { data: cfgData } = await supabase.from("crm_quote_configs").select("*").eq("client_id", client.id).maybeSingle();
          if (cfgData && (cfgData as any).enable_lead_form) {
            setConfig(buildConfig(cfgData));
            setFormClientId(client.id);
            setLoading(false);
            return;
          }
        }
        setError("Formulário não encontrado.");
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("crm_quotes").select("*").eq("code", lookupKey.toUpperCase()).maybeSingle();
      if (data) {
        const q: QuoteData = {
          ...data, items: (data.items as any) || [],
          total_value: Number(data.total_value), discount_percent: Number(data.discount_percent),
          discount_value: Number(data.discount_value), final_value: Number(data.final_value),
        };
        setQuote(q);

        if (data.client_id) {
          // Fetch config + client logo in parallel
          const [cfgRes, prodRes, clientRes] = await Promise.all([
            supabase.from("crm_quote_configs").select("*").eq("client_id", data.client_id).maybeSingle(),
            supabase.from("client_products").select("name, image_url").eq("client_id", data.client_id).eq("is_active", true),
            supabase.from("clients").select("logo_url").eq("id", data.client_id).maybeSingle(),
          ]);
          if (cfgRes.data) setConfig(buildConfig(cfgRes.data));
          if (clientRes.data) setClientLogoUrl(clientRes.data.logo_url);
          if (prodRes.data) {
            const imgs: Record<string, string> = {};
            prodRes.data.forEach((p: any) => { if (p.image_url) imgs[p.name.toLowerCase()] = p.image_url; });
            setCatalogImages(imgs);
          }
        }

        if (!data.viewed_at) {
          await supabase.from("crm_quotes").update({ viewed_at: new Date().toISOString(), status: "viewed" }).eq("id", data.id);
        }
        setLoading(false);
        return;
      }

      setError("Orçamento não encontrado.");
      setLoading(false);
    })();
  }, [lookupKey, isFormRoute]);

  const handleAccept = async () => {
    if (!quote) return;
    await supabase.from("crm_quotes").update({ accepted_at: new Date().toISOString(), status: "accepted" }).eq("id", quote.id);
    setQuote({ ...quote, status: "accepted", accepted_at: new Date().toISOString() });
    toast.success("Proposta aceita! Entraremos em contato em breve.");
  };

  const handleDownloadPDF = async () => {
    if (!quote) return;
    try {
      const logoSrc = config.logo_url || clientLogoUrl || logoPfmk;
      const html = buildQuotePdfHtml(quote, config, logoSrc);
      await exportHtmlToPdf(html, `Orcamento-${quote.code}.pdf`);
      toast.success("PDF baixado!");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (formClientId) {
    const logoSrc = config.logo_url || clientLogoUrl || logoPfmk;
    return <GastroFormPage clientId={formClientId} config={config} logoSrc={logoSrc} />;
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{error || "Não encontrado"}</h1>
          <p className="text-gray-500">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  const expired = isExpired(quote.valid_until);
  const accepted = quote.status === "accepted";
  const segmentIcon = getSegmentIcon(quote.lead_segment, config.niche_icon);
  const logoSrc = config.logo_url || clientLogoUrl || logoPfmk;

  // Group items by category
  const categories = new Map<string, QuoteItem[]>();
  quote.items.forEach(item => {
    const cat = item.category || 'Serviços';
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(item);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
      {/* Hero */}
      <div className="relative overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(${config.brand_color} 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }} />

        <div className="relative max-w-4xl mx-auto px-4 pt-10 pb-8">
          <div className="flex items-center justify-between mb-10">
            <img src={logoSrc} alt={config.brand_name} className="h-12 object-contain" />
            <Badge variant="outline" className="text-xs font-mono border-gray-300 text-gray-500">
              {quote.code}
            </Badge>
          </div>

          <div className="text-center mb-8">
            <span className="text-5xl mb-4 block">{segmentIcon}</span>
            <p className="text-sm font-semibold tracking-wider uppercase mb-2" style={{ color: config.brand_color }}>
              Proposta Exclusiva
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
              {quote.title}
            </h1>
            <p className="text-gray-500 text-lg">
              Preparada para <span className="text-gray-900 font-semibold">{quote.lead_name}</span>
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: config.brand_color }} />
              <span>Criado em {formatDate(quote.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: config.brand_color }} />
              <span>Válido até {formatDate(quote.valid_until)}</span>
            </div>
            {quote.lead_segment && (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: config.brand_color }} />
                <span>{quote.lead_segment}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="flex justify-center py-6">
        <ChevronDown className="w-5 h-5 animate-bounce text-gray-300" />
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <StatsSection segment={quote.lead_segment} color={config.brand_color} />

        {config.social_proof_text && (
          <div className="mb-8 text-center bg-gray-50 border border-gray-100 rounded-xl p-5">
            <p className="text-sm text-gray-500 italic">"{config.social_proof_text}"</p>
          </div>
        )}

        <PersuasionSection texts={config.persuasion_texts} color={config.brand_color} />

        {/* Services grouped by category */}
        {Array.from(categories.entries()).map(([cat, items]) => (
          <div key={cat} className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5" style={{ color: config.brand_color }} />
              {cat}
            </h2>
            <div className="space-y-3">
              {items.map((item, i) => {
                const imgUrl = item.image_url || catalogImages[item.name.toLowerCase()];
                return (
                  <div key={i} className="group bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      {config.show_catalog_images && imgUrl && (
                        <img src={imgUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Check className="w-4 h-4 flex-shrink-0" style={{ color: config.brand_color }} />
                              <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            </div>
                            {item.description && <p className="text-gray-400 text-sm ml-6">{item.description}</p>}
                          </div>
                          <span className="font-bold text-lg whitespace-nowrap" style={{ color: config.brand_color }}>
                            {formatCurrency(item.price * (item.quantity || 1))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Total */}
        <div className="mt-8 border rounded-2xl p-6 bg-white shadow-sm" style={{ borderColor: `${config.brand_color}30` }}>
          {quote.discount_value > 0 && (
            <>
              <div className="flex justify-between text-gray-400 text-sm mb-2">
                <span>Subtotal</span><span>{formatCurrency(quote.total_value)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 text-sm mb-3">
                <span>Desconto ({quote.discount_percent}%)</span><span>-{formatCurrency(quote.discount_value)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-end border-t border-gray-100 pt-3">
            <span className="text-gray-600 text-lg">Investimento mensal</span>
            <div className="text-right">
              <span className="text-3xl font-bold" style={{ color: config.brand_color }}>
                {formatCurrency(quote.final_value)}
              </span>
              <span className="text-gray-400 text-sm block">/mês</span>
            </div>
          </div>
        </div>

        {quote.notes && (
          <div className="mt-6 bg-gray-50 border border-gray-100 rounded-xl p-5">
            <p className="text-sm text-gray-500 font-medium mb-2">Observações</p>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {!expired && !accepted && (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
            <p className="text-amber-700 text-sm font-medium">⏰ Esta proposta é válida por tempo limitado</p>
            <p className="text-amber-600/70 text-xs mt-1">Garanta as condições especiais até {formatDate(quote.valid_until)}</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 text-center space-y-4">
          {expired ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <p className="text-red-600 font-semibold">Este orçamento expirou em {formatDate(quote.valid_until)}</p>
              <p className="text-red-400 text-sm mt-1">Entre em contato para renovar a proposta.</p>
            </div>
          ) : accepted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
              <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-emerald-600 font-semibold text-lg">Proposta Aceita!</p>
              <p className="text-emerald-500 text-sm mt-1">Nossa equipe entrará em contato em breve.</p>
            </div>
          ) : (
            <Button onClick={handleAccept} size="lg" className="text-white px-10 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              style={{ background: `linear-gradient(to right, ${config.brand_color}, ${config.accent_color})`, boxShadow: `0 10px 30px -10px ${config.brand_color}40` }}>
              {config.cta_text} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
          <div>
            <Button variant="ghost" onClick={handleDownloadPDF} className="text-gray-400 hover:text-gray-700">
              <Download className="w-4 h-4 mr-2" /> Baixar PDF
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center border-t border-gray-100 pt-8">
          <img src={logoSrc} alt={config.brand_name} className="h-6 mx-auto mb-3 opacity-40" />
          <p className="text-gray-400 text-xs">{config.brand_name} - {config.tagline}</p>
        </div>
      </div>
    </div>
  );
}
