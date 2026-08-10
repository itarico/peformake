import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, MapPin, Instagram, Mail, Phone, User, Globe, 
  ArrowRight, Loader2, Sparkles, Filter, Database, 
  Building2, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSDRContext } from './useSDRContext';
import { useQueryClient } from '@tanstack/react-query';

interface Lead {
  id: string;
  company_name: string;
  niche: string;
  location: string;
  ceo_name?: string;
  company_instagram?: string;
  personal_instagram?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  qualification_score: number;
  revenue_estimate?: string;
  tier: 'A' | 'B' | 'C' | 'Outro';
  is_verified?: boolean;
}

const SDRAIProspector = () => {
  const { sdrStaffId } = useSDRContext();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filters, setFilters] = useState({
    niche: '',
    location: '',
    min_revenue: '',
    requirements: {
      has_instagram: true,
      has_ceo: true,
      has_email: false,
    }
  });

  const handleSearch = async () => {
    if (!filters.niche || !filters.location) {
      toast.error('Nicho e Localização são obrigatórios para a busca real');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-lead-prospector', {
        body: filters
      });

      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error || 'Erro ao processar leads');

      setLeads(data);
      toast.success('Varredura de dados concluída com sucesso!');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro na integração com o motor de busca: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const importLead = async (lead: Lead) => {
    if (!sdrStaffId) {
      toast.error('SDR não identificado');
      return;
    }

    try {
      const { error } = await supabase.from('sdr_leads').insert({
        contact_name: lead.ceo_name || 'Responsável',
        company_name: lead.company_name,
        phone: lead.phone,
        email: lead.email,
        instagram_handle: lead.company_instagram,
        qualification_score: Math.round(lead.qualification_score),
        lead_tier: lead.tier,
        source: 'outbound_ai',
        sdr_staff_id: sdrStaffId,
        notes: `Localização: ${lead.location}. Endereço: ${lead.address}. Faturamento Est: ${lead.revenue_estimate}. Fonte: Busca IA Real.`
      });

      if (error) throw error;
      
      toast.success(`${lead.company_name} importado para o seu pipeline!`);
      queryClient.invalidateQueries({ queryKey: ['sdr-leads'] });
      setLeads(prev => prev.filter(l => l.id !== lead.id));
    } catch (error: any) {
      toast.error('Erro ao importar lead: ' + error.message);
    }
  };

  const removeLeadFromList = (leadId: string) => {
    const password = prompt("Para remover este prospect da lista, digite a senha do administrador:");
    if (password === "159951poX@") {
      setLeads(prev => prev.filter(l => l.id !== leadId));
      toast.success('Prospect removido da visualização.');
    } else if (password !== null) {
      toast.error("Senha incorreta.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Painel de Configuração */}
        <Card className="w-full md:w-80 h-fit border-primary/20 bg-muted/30 sticky top-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filtros Inteligentes
            </CardTitle>
            <CardDescription>Defina os parâmetros de busca real</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">O que buscar?</Label>
              <Input 
                placeholder="Ex: Academias" 
                value={filters.niche}
                onChange={e => setFilters({...filters, niche: e.target.value})}
                className="bg-background"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Onde?</Label>
              <Input 
                placeholder="Ex: Curitiba, PR" 
                value={filters.location}
                onChange={e => setFilters({...filters, location: e.target.value})}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Faturamento Min (Est.)</Label>
              <Input 
                placeholder="Ex: 100000" 
                type="number"
                value={filters.min_revenue}
                onChange={e => setFilters({...filters, min_revenue: e.target.value})}
                className="bg-background"
              />
            </div>

            <div className="pt-4 space-y-3 border-t">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Exigências da Busca</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="has_insta" 
                  checked={filters.requirements.has_instagram}
                  onCheckedChange={v => setFilters({...filters, requirements: {...filters.requirements, has_instagram: !!v}})}
                />
                <label htmlFor="has_insta" className="text-sm cursor-pointer flex items-center gap-2">
                  <Instagram className="h-3.5 w-3.5 text-pink-500" /> Instagram Ativo
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="has_ceo" 
                  checked={filters.requirements.has_ceo}
                  onCheckedChange={v => setFilters({...filters, requirements: {...filters.requirements, has_ceo: !!v}})}
                />
                <label htmlFor="has_ceo" className="text-sm cursor-pointer flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-blue-500" /> Nome do Decisor
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="has_mail" 
                  checked={filters.requirements.has_email}
                  onCheckedChange={v => setFilters({...filters, requirements: {...filters.requirements, has_email: !!v}})}
                />
                <label htmlFor="has_mail" className="text-sm cursor-pointer flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-orange-500" /> E-mail Encontrado
                </label>
              </div>
            </div>

            <Button 
              className="w-full mt-4 gap-2 bg-gradient-to-r from-primary to-blue-600 hover:opacity-90" 
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Realizar Busca IA
            </Button>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Base de Dados Encontrada</h2>
            </div>
            {leads.length > 0 && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {leads.length} Resultados em tempo real
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-xl border border-dashed">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Validando dados e redes sociais...</p>
              <p className="text-sm text-muted-foreground">Consultando Google Maps, Instagram e bases comerciais.</p>
            </div>
          ) : leads.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {leads.map(lead => (
                <Card key={lead.id} className={`overflow-hidden border-l-4 transition-all hover:translate-x-1 ${
                  lead.tier === 'A' ? 'border-l-purple-500' : 
                  lead.tier === 'B' ? 'border-l-blue-500' : 'border-l-slate-400'
                }`}>
                  <CardContent className="p-0">
                    <div className="p-4 flex justify-between items-start border-b bg-muted/5">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <h3 className="font-bold truncate text-base">{lead.company_name}</h3>
                          {lead.is_verified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge variant="secondary" className="text-[10px] uppercase">{lead.niche}</Badge>
                          <Badge variant="outline" className={`text-[10px] font-bold ${
                            lead.tier === 'A' ? 'text-purple-600 border-purple-200 bg-purple-50' :
                            lead.tier === 'B' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-slate-600'
                          }`}>
                            TIER {lead.tier}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-primary">Score: {lead.qualification_score}/10</div>
                        <div className="text-[10px] text-muted-foreground">{lead.revenue_estimate}</div>
                      </div>
                    </div>

                    <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{lead.ceo_name || 'Decisor não iden.'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate text-muted-foreground">{lead.location}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {lead.company_instagram ? (
                          <div className="flex items-center gap-2 text-xs text-pink-600 font-medium">
                            <Instagram className="h-3.5 w-3.5" />
                            <span className="truncate">{lead.company_instagram}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/40 italic">
                            <XCircle className="h-3.5 w-3.5" /> Sem Instagram
                          </div>
                        )}
                        {lead.phone ? (
                          <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                            <Phone className="h-3.5 w-3.5" />
                            <span className="truncate">{lead.phone}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/40 italic">
                            <AlertCircle className="h-3.5 w-3.5" /> Sem Telefone
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-muted/20 flex gap-2 border-t">
                      <Button variant="ghost" size="sm" className="h-8 flex-1 text-[10px] hover:bg-background" asChild>
                        <a href={lead.website} target="_blank" rel="noreferrer"><Globe className="h-3 w-3 mr-1" /> Website</a>
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 flex-1 text-[10px] hover:bg-background" asChild>
                        <a href={`https://instagram.com/${lead.company_instagram?.replace('@', '')}`} target="_blank" rel="noreferrer"><Instagram className="h-3 w-3 mr-1" /> Perfil</a>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 flex-1 text-[10px] text-destructive hover:bg-destructive/5" onClick={() => removeLeadFromList(lead.id)}>
                        <XCircle className="h-3 w-3 mr-1" /> Remover
                      </Button>
                      <Button size="sm" className="h-8 flex-1 text-[10px] gap-1 shadow-sm" onClick={() => importLead(lead)}>
                        Importar <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 bg-muted/5 rounded-xl border-2 border-dashed border-muted/50">
              <div className="p-4 rounded-full bg-primary/10 mb-6">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <h3 className="text-xl font-bold mb-2">Busca de Leads Inteligente</h3>
              <p className="text-muted-foreground max-w-sm text-center px-4">
                Use os filtros ao lado para pesquisar empresas reais em qualquer região do Brasil com extração automática de decisores e redes sociais.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SDRAIProspector;
