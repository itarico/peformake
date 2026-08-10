import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Instagram, AlertTriangle, MessageCircle } from 'lucide-react';

interface Props {
  clientId: string;
}

/**
 * Instagram DM Panel — DISABLED for Meta Policy Compliance
 * 
 * DM access requires instagram_manage_messages and pages_messaging
 * permissions which need formal Meta App Review approval.
 * Without approval, using these endpoints can result in account bans.
 */
export default function InstagramChatPanel({ clientId }: Props) {
  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">DMs do Instagram</CardTitle>
          <Badge variant="secondary" className="gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" /> Desativado
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
          <div className="space-y-2 max-w-md">
            <p className="text-sm font-medium">
              Funcionalidade de DM desativada por conformidade com políticas da Meta
            </p>
            <p className="text-xs text-muted-foreground">
              O acesso a DMs do Instagram requer aprovação formal da Meta (App Review) 
              para as permissões <code className="bg-muted px-1 rounded">instagram_manage_messages</code> e{' '}
              <code className="bg-muted px-1 rounded">pages_messaging</code>. 
              Usar essas APIs sem aprovação pode resultar em bloqueio da conta.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Use o <strong>WhatsApp via CRM</strong> para comunicação com clientes.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
