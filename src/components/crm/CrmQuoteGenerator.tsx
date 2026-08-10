import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Send, Copy, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";

interface QuoteItem {
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
}

interface CatalogProduct {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  category: string | null;
}

interface Props {
  clientId: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  leadSegment?: string;
  onCreated?: (code: string) => void;
}

const SEGMENTS = [
  "Restaurante", "Clínica", "Loja", "E-commerce", "Saúde", "Beleza",
  "Educação", "Tecnologia", "Imobiliária", "Advocacia", "Contabilidade",
  "Odontologia", "Fitness", "Pet", "Automotivo", "Construção", "Outro",
];

export default function CrmQuoteGenerator({ clientId, leadId, leadName, leadPhone, leadSegment, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [title, setTitle] = useState("Proposta Comercial");
  const [name, setName] = useState(leadName || "");
  const [segment, setSegment] = useState(leadSegment || "");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [validDays, setValidDays] = useState(10);
  const [saving, setSaving] = useState(false);
  const [createdCode, setCreatedCode] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  useEffect(() => {
    supabase
      .from("client_products")
      .select("id, name, price, description, category")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        if (data) setProducts(data);
      });
  }, [clientId]);

  useEffect(() => {
    if (leadName) setName(leadName);
    if (leadSegment) setSegment(leadSegment);
  }, [leadName, leadSegment]);

  // Get unique categories from products and current items
  const existingCategories = Array.from(new Set([
    ...products.map(p => p.category).filter(Boolean),
    ...items.map(i => i.category).filter(Boolean),
  ])) as string[];

  const addItem = (product?: CatalogProduct) => {
    setItems([...items, {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price || 0,
      quantity: 1,
      category: product?.category || "",
    }]);
  };

  const updateItem = (idx: number, field: keyof QuoteItem, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const totalValue = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountValue = totalValue * (discount / 100);
  const finalValue = totalValue - discountValue;

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Nome do lead é obrigatório");
    if (items.length === 0) return toast.error("Adicione pelo menos um serviço");

    setSaving(true);
    try {
      const { data: codeData } = await supabase.rpc("generate_quote_code");
      const code = codeData || `PFMK-${Date.now().toString(36).toUpperCase()}`;

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validDays);

      const { data, error } = await supabase.from("crm_quotes").insert({
        code,
        client_id: clientId,
        lead_id: leadId || null,
        lead_name: name,
        lead_phone: leadPhone || null,
        lead_segment: segment || null,
        title,
        items: items as any,
        total_value: totalValue,
        discount_percent: discount,
        discount_value: discountValue,
        final_value: finalValue,
        notes: notes || null,
        valid_until: validUntil.toISOString().split("T")[0],
        status: "draft",
      }).select("code").single();

      if (error) throw error;

      setCreatedCode(data.code);
      toast.success(`Orçamento ${data.code} criado!`);
      onCreated?.(data.code);
    } catch (err: any) {
      toast.error("Erro ao criar orçamento: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const quoteUrl = createdCode ? `${window.location.origin}/orcamento/${createdCode}` : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(quoteUrl);
    toast.success("Link copiado!");
  };

  const handleSendWhatsApp = async () => {
    if (!leadPhone || !createdCode) return;
    await supabase.from("crm_quotes").update({ status: "sent" }).eq("code", createdCode);
    try {
      const msg = `Olá ${name}! 😊\n\nPreparei uma proposta exclusiva para você:\n\n${quoteUrl}\n\nDá uma olhada e me diz o que achou!`;
      await supabase.functions.invoke("crm-wasender", {
        body: { action: "send_message", client_id: clientId, to: leadPhone, text: msg },
      });
      toast.success("Orçamento enviado por WhatsApp!");
    } catch {
      toast.error("Erro ao enviar por WhatsApp");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="w-4 h-4" /> Gerar Orçamento
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Novo Orçamento</SheetTitle>
        </SheetHeader>

        {createdCode ? (
          <div className="mt-6 space-y-4 text-center">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
              <Check className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-bold">{createdCode}</p>
              <p className="text-muted-foreground text-sm mt-1">Orçamento criado com sucesso!</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Link do orçamento:</p>
              <p className="text-sm font-mono break-all">{quoteUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" /> Copiar Link
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => window.open(quoteUrl, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" /> Visualizar
              </Button>
            </div>
            {leadPhone && (
              <Button className="w-full" onClick={handleSendWhatsApp}>
                <Send className="w-4 h-4 mr-2" /> Enviar por WhatsApp
              </Button>
            )}
            <Button variant="ghost" onClick={() => { setCreatedCode(""); setItems([]); }} className="w-full">
              Criar novo orçamento
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Proposta Comercial" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome do Lead *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div>
                <Label>Segmento</Label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products from catalog */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Produtos / Serviços</Label>
                <Button variant="ghost" size="sm" onClick={() => addItem()}>
                  <Plus className="w-3 h-3 mr-1" /> Personalizado
                </Button>
              </div>
              {products.length > 0 ? (
                <div className="flex flex-wrap gap-1 mb-3">
                  {products.map((p) => (
                    <Badge key={p.id} variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => addItem(p)}>
                      <Plus className="w-3 h-3 mr-1" /> {p.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-3">Nenhum produto no catálogo.</p>
              )}

              <div className="space-y-3">
                {items.map((item, i) => (
                  <Card key={i} className="p-3">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} placeholder="Nome do serviço" className="text-sm" />
                        <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Descrição (opcional)" className="text-xs" />
                        <div className="flex gap-2">
                          <Input type="number" value={item.price} onChange={(e) => updateItem(i, "price", Number(e.target.value))} placeholder="Valor" className="text-sm" />
                          <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} placeholder="Qtd" className="text-sm w-20" />
                        </div>
                        {/* Category selector */}
                        <div className="flex gap-2">
                          <Select value={item.category || "__none__"} onValueChange={(v) => updateItem(i, "category", v === "__none__" ? "" : v)}>
                            <SelectTrigger className="text-xs h-8">
                              <SelectValue placeholder="Categoria..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sem categoria</SelectItem>
                              {existingCategories.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1">
                            <Input
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              placeholder="Nova cat."
                              className="text-xs h-8 w-24"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && customCategory.trim()) {
                                  updateItem(i, "category", customCategory.trim());
                                  setCustomCategory("");
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(i)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Discount & Validity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Desconto (%)</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} min={0} max={100} />
              </div>
              <div>
                <Label>Validade (dias)</Label>
                <Input type="number" value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} min={1} />
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condições especiais, detalhes..." rows={3} />
            </div>

            {items.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Desconto ({discount}%)</span><span>-{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(discountValue)}</span></div>}
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-primary">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(finalValue)}/mês</span>
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Criando..." : "Criar Orçamento"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
