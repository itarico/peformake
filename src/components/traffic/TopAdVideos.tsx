import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, ExternalLink, DollarSign, Eye, MousePointerClick } from 'lucide-react';

interface TopAdVideosProps {
  clientId: string;
  year: number;
  month: number;
}

export function TopAdVideos({ clientId, year, month }: TopAdVideosProps) {
  const { data: ads = [], isLoading } = useQuery({
    queryKey: ['top-ad-videos', clientId, year, month],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('instagram-sync', {
        body: { action: 'top_ad_videos', client_id: clientId, year, month },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.ads || [];
    },
  });

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (ads.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Top Anúncios</CardTitle>
        <CardDescription>Anúncios com maior investimento no mês</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ads.map((ad: any, idx: number) => (
            <div key={ad.ad_id} className="flex items-center gap-3 p-3 rounded-lg border">
              <Badge variant="outline" className="shrink-0">#{idx + 1}</Badge>
              {ad.thumbnail_url && <img src={ad.thumbnail_url} alt="" className="h-14 w-14 rounded object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ad.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> R$ {ad.spend.toFixed(2)}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {ad.reach?.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {ad.clicks} cliques</span>
                  <span>CTR {ad.ctr}%</span>
                  {ad.thruplay > 0 && <span>▶ {ad.thruplay} views</span>}
                </div>
              </div>
              {ad.preview_url && (
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => window.open(ad.preview_url, '_blank')}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
