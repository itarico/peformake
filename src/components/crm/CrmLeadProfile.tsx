import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Mail, MapPin, Building, Brain, ShoppingCart, Save, Loader2, Cake, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

const SOURCE_OPTIONS = [
  { value: 'ads', label: '📢 Anúncios (Ads)', color: 'bg-blue-100 text-blue-700' },
  { value: 'organic', label: '🌱 Orgânico', color: 'bg-green-100 text-green-700' },
  { value: 'referral', label: '🤝 Indicação', color: 'bg-purple-100 text-purple-700' },
  { value: 'whatsapp', label: '💬 WhatsApp Direto', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'website', label: '🌐 Site / Formulário', color: 'bg-orange-100 text-orange-700' },
  { value: 'gastro_form', label: '🍽️ Formulário Gastro', color: 'bg-amber-100 text-amber-700' },
  { value: 'instagram', label: '📸 Instagram', color: 'bg-pink-100 text-pink-700' },
  { value: 'facebook', label: '👤 Facebook', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'google', label: '🔍 Google', color: 'bg-red-100 text-red-700' },
  { value: 'other', label: '📌 Outro', color: 'bg-gray-100 text-gray-700' },
];

function getSourceInfo(source?: string | null) {
  if (!source) return null;
  return SOURCE_OPTIONS.find(s => s.value === source.toLowerCase()) || { value: source, label: source, color: 'bg-gray-100 text-gray-700' };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  summary?: any;
  sales?: any[];
  onReload: () => void;
}

export default function CrmLeadProfile({ open, onOpenChange, lead, summary, sales = [], onReload }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: lead?.name || '',
    full_name: lead?.full_name || '',
    email: lead?.email || '',
    city: lead?.city || '',
    company: lead?.company || '',
    birthday: lead?.birthday || '',
    source: lead?.source || '',
  });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('crm_leads').update({
      name: form.name || null,
      full_name: form.full_name || null,
      email: form.email || null,
      city: form.city || null,
      company: form.company || null,
      birthday: form.birthday || null,
      source: form.source || null,
    } as any).eq('id', lead.id);

    if (error) toast.error('Erro ao salvar');
    else { toast.success('Perfil atualizado!'); setEditing(false); onReload(); }
    setSaving(false);
  };

  if (!lead) return null;

  const totalSales = sales.reduce((sum, s) => sum + Number(s.value || 0), 0);
  const sourceInfo = getSourceInfo(lead?.source);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Perfil do Lead
            {sourceInfo && (
              <Badge variant="outline" className={`ml-auto text-[10px] ${sourceInfo.color}`}>
                {sourceInfo.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Informações</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)} className="text-xs h-7">
                {editing ? 'Cancelar' : 'Editar'}
              </Button>
            </div>

            {editing ? (
              <div className="space-y-2">
                {[
                  { key: 'name', label: 'Nome', icon: User },
                  { key: 'full_name', label: 'Nome Completo', icon: User },
                  { key: 'email', label: 'Email', icon: Mail },
                  { key: 'city', label: 'Cidade', icon: MapPin },
                  { key: 'company', label: 'Empresa', icon: Building },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      value={(form as any)[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={label}
                      className="text-sm h-8"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Cake className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input
                    type="date"
                    value={form.birthday}
                    onChange={e => setForm(p => ({ ...p, birthday: e.target.value }))}
                    placeholder="Aniversário"
                    className="text-sm h-8"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
                    <SelectTrigger className="text-sm h-8">
                      <SelectValue placeholder="Origem do lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Salvar
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5 text-sm">
                <InfoRow icon={User} label="Nome" value={lead.full_name || lead.name} />
                <InfoRow icon={Phone} label="Telefone" value={lead.phone} />
                <InfoRow icon={Mail} label="Email" value={lead.email} />
                <InfoRow icon={Cake} label="Aniversário" value={lead.birthday ? new Date(lead.birthday + 'T00:00:00').toLocaleDateString('pt-BR') : null} />
                <InfoRow icon={MapPin} label="Cidade" value={lead.city} />
                <InfoRow icon={Building} label="Empresa" value={lead.company} />
                <InfoRow icon={Globe} label="Origem" value={sourceInfo?.label || lead.source} />
                {lead.referred_by_member_id && (
                  <ReferrerInfo memberId={lead.referred_by_member_id} />
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* AI Summary */}
          {summary && (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Brain className="h-3.5 w-3.5 text-primary" /> Resumo da IA
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">{summary.summary}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Sales History */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" /> Histórico de Vendas
              {sales.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Total: R$ {totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Badge>
              )}
            </h3>
            {sales.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma venda registrada</p>
            ) : (
              <div className="space-y-2">
                {sales.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded border text-sm">
                    <div>
                      <p className="font-medium">{s.product_name || 'Produto não especificado'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.sale_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className="font-semibold text-emerald-600">
                      R$ {Number(s.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReferrerInfo({ memberId }: { memberId: string }) {
  const { data: member } = useQuery({
    queryKey: ['staff-member', memberId],
    queryFn: async () => {
      const { data } = await supabase.from('staff_members').select('full_name').eq('id', memberId).single();
      return data;
    },
    enabled: !!memberId,
  });

  return (
    <InfoRow 
      icon={User} 
      label="Indicado" 
      value={member?.full_name || '...'} 
      color="text-purple-500"
    />
  );
}

function InfoRow({ icon: Icon, label, value, color }: { icon: any; label: string; value?: string | null; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${color || 'text-muted-foreground'}`} />
      <span className="text-muted-foreground w-16 shrink-0">{label}:</span>
      <span className={value ? 'font-medium' : 'text-muted-foreground italic'}>{value || 'Não informado'}</span>
    </div>
  );
}
