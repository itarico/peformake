import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Eye } from 'lucide-react';

interface Art {
  id: string;
  art_number: number;
  title: string | null;
  status: string;
  revision_comment?: string | null;
}

interface PendingAlertsSectionProps {
  arts: Art[];
  onViewArt?: (art: Art) => void;
}

export function PendingAlertsSection({ arts, onViewArt }: PendingAlertsSectionProps) {
  const awaitingApproval = arts.filter(a => a.status === 'awaiting_approval');
  const revisionRequested = arts.filter(a => a.status === 'revision_requested');
  
  if (awaitingApproval.length === 0 && revisionRequested.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Revision Requested - Priority */}
      {revisionRequested.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="h-5 w-5" />
              Revisão Solicitada
              <Badge variant="destructive">{revisionRequested.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {revisionRequested.slice(0, 3).map((art) => (
              <div 
                key={art.id}
                className="flex items-center justify-between p-2 rounded-lg bg-background border border-destructive/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Arte #{art.art_number}: {art.title || 'Sem título'}
                  </p>
                  {art.revision_comment && (
                    <p className="text-xs text-destructive truncate">
                      {art.revision_comment}
                    </p>
                  )}
                </div>
                {onViewArt && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onViewArt(art)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {revisionRequested.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                + {revisionRequested.length - 3} mais
              </p>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Awaiting Approval */}
      {awaitingApproval.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-yellow-600">
              <Clock className="h-5 w-5" />
              Aguardando Aprovação
              <Badge className="bg-yellow-500 text-yellow-950">{awaitingApproval.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {awaitingApproval.slice(0, 3).map((art) => (
              <div 
                key={art.id}
                className="flex items-center justify-between p-2 rounded-lg bg-background border border-yellow-500/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Arte #{art.art_number}: {art.title || 'Sem título'}
                  </p>
                </div>
                {onViewArt && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onViewArt(art)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {awaitingApproval.length > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                + {awaitingApproval.length - 3} mais
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
