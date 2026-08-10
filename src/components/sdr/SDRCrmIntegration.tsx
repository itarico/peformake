import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, Copy, ExternalLink, Settings2, ShieldCheck, Link2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SDRCrmIntegration() {
  const [showCatalog, setShowCatalog] = useState(true);
  const catalogUrl = `${window.location.origin}/service-catalog`;

  const copyUrl = () => {
    navigator.clipboard.writeText(catalogUrl);
    toast.success('Link do catálogo copiado!');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Catálogo de Vendas
                </CardTitle>
                <CardDescription>Visualize o site de pacotes e serviços</CardDescription>
              </div>
              <Switch checked={showCatalog} onCheckedChange={setShowCatalog} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-2xl border border-dashed border-primary/20 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Link Público do Catálogo</Label>
              <div className="flex gap-2">
                <Input value={catalogUrl} readOnly className="bg-background" />
                <Button variant="outline" size="icon" onClick={copyUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" asChild>
                  <a href={catalogUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                * Compartilhe este link com leads para que eles vejam os pacotes em formato de site.
              </p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold">Visualização por Liderança</p>
                <p className="text-xs text-muted-foreground">Permitir que SDRs e Closers visualizem o catálogo no menu comercial.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Integração CRM
            </CardTitle>
            <CardDescription>Configure como os leads entram no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
               <Label>Webhook de Entrada (n8n/Make)</Label>
               <Input placeholder="https://seu-webhook.com/..." />
             </div>
             <Button className="w-full" variant="outline">
               <Settings2 className="h-4 w-4 mr-2" />
               Testar Conexão
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}