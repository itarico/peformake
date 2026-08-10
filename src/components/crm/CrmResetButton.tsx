import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  clientId: string;
}

export default function CrmResetButton({ clientId }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleReset = async () => {
    if (confirmText !== 'RESETAR') {
      toast.error('Digite RESETAR para confirmar');
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.rpc('reset_crm_data', { p_client_id: clientId } as any);
      if (error) throw error;
      const result = data as any;
      toast.success(
        `🧹 CRM resetado! Removidos: ${result?.leads_removed || 0} contatos, ${result?.messages_removed || 0} mensagens, ${result?.sales_removed || 0} vendas.`
      );
      setOpen(false);
      setConfirmText('');
      // Recarrega a página para limpar estados em cache
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      toast.error('Erro ao resetar: ' + (e?.message || 'desconhecido'));
    }
    setResetting(false);
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-base">Zona de Perigo</CardTitle>
        </div>
        <CardDescription>
          Apaga todos os contatos, conversas, vendas, etiquetas, equipe, campanhas, produtos, fluxos e webhooks do seu CRM. Esta ação é <strong>permanente</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Resetar CRM completo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Resetar todo o CRM?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>Esta ação irá apagar <strong>permanentemente</strong>:</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5 text-muted-foreground">
                    <li>Todos os contatos / leads</li>
                    <li>Todas as conversas e mensagens (incluindo mídias)</li>
                    <li>Histórico de vendas registradas</li>
                    <li>Etiquetas, campanhas, produtos, fluxos e webhooks</li>
                    <li>Membros da equipe e notificações automáticas</li>
                  </ul>
                  <p className="text-destructive font-medium">Não é possível desfazer.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="confirm" className="text-xs">Para confirmar, digite <strong>RESETAR</strong>:</Label>
              <Input id="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="RESETAR" autoFocus />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmText !== 'RESETAR' || resetting}
                onClick={(e) => { e.preventDefault(); handleReset(); }}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Apagar tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
