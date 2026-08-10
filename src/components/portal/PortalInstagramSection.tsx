import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Instagram, Users, Eye, Heart, MessageCircle, Bookmark, Share2, Play, ExternalLink, TrendingUp, TrendingDown, UserPlus, Clock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

interface PortalInstagramSectionProps {
  clientId: string;
}

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'];

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return (
    <span className={`text-[10px] font-medium flex items-center gap-0.5 ${pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
      {pct >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function PortalInstagramSection({ clientId }: PortalInstagramSectionProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: connection } = useQuery({
    queryKey: ['portal-ig-conn', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('traffic_meta_connections' as any)
        .select('instagram_business_id, instagram_username')
        .eq('client_id', clientId)
        .single();
      return data as any;
    },
  });

  const isConnected = !!connection?.instagram_business_id;

  const { data: metrics } = useQuery({
    queryKey: ['portal-ig-metrics', clientId, year, month],
    queryFn: async () => {
      const { data } = await supabase
        .from('instagram_metrics' as any)
        .select('*')
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .single();
      return data as any;
    },
    enabled: isConnected,
  });

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const { data: prevMetrics } = useQuery({
    queryKey: ['portal-ig-metrics-prev', clientId, prevYear, prevMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from('instagram_metrics' as any)
        .select('*')
        .eq('client_id', clientId)
        .eq('year', prevYear)
        .eq('month', prevMonth)
        .single();
      return data as any;
    },
    enabled: isConnected,
  });

  const { data: topMedia = [] } = useQuery({
    queryKey: ['portal-ig-media', clientId, year, month],
    queryFn: async () => {
      const { data } = await supabase
        .from('instagram_top_media' as any)
        .select('*')
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .order('engagement_total', { ascending: false })
        .limit(6);
      return (data || []) as any[];
    },
    enabled: isConnected,
  });

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Instagram className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <h3 className="font-medium text-foreground mb-1">Instagram não conectado</h3>
          <p className="text-sm text-muted-foreground">
            As métricas do Instagram serão exibidas aqui quando a conta for vinculada pela equipe.
          </p>
        </CardContent>
      </Card>
    );
  }

  const contentTypeData = metrics ? [
    { name: 'Imagens', value: metrics.image_count || 0 },
    { name: 'Reels', value: metrics.reels_count || 0 },
    { name: 'Carrossel', value: metrics.carousel_count || 0 },
  ].filter(d => d.value > 0) : [];

  const dailyFollowers = metrics?.daily_follower_data || [];
  const bestHours = metrics?.best_posting_hours?.slice(0, 6) || [];
  const cityData = metrics?.audience_demographics?.cities?.slice(0, 5) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Instagram className="h-5 w-5 text-pink-500" />
          Instagram @{connection.instagram_username}
        </h3>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{[now.getFullYear(), now.getFullYear() - 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {metrics && (
        <>
          {/* Main KPIs with MoM */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: Users, label: 'Seguidores', val: metrics.followers_count, prev: prevMetrics?.followers_count },
              { icon: UserPlus, label: 'Novos', val: metrics.new_followers, prev: prevMetrics?.new_followers },
              { icon: Eye, label: 'Alcance', val: metrics.reach, prev: prevMetrics?.reach },
              { icon: Eye, label: 'Impressões', val: metrics.impressions, prev: prevMetrics?.impressions },
              { icon: TrendingUp, label: 'Engajamento', val: null, prev: null, custom: `${(metrics.engagement_rate || 0).toFixed(2)}%` },
              { icon: ExternalLink, label: 'Cliques Link', val: metrics.website_clicks, prev: prevMetrics?.website_clicks },
            ].map((item, i) => (
              <Card key={i}><CardContent className="p-3 text-center">
                <item.icon className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold">{item.custom || (item.val || 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                {item.prev !== null && item.val !== null && <DeltaBadge current={item.val || 0} previous={item.prev || 0} />}
              </CardContent></Card>
            ))}
          </div>

          {/* Engagement details */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: Heart, label: 'Curtidas', val: metrics.total_likes, prev: prevMetrics?.total_likes },
              { icon: MessageCircle, label: 'Comentários', val: metrics.total_comments, prev: prevMetrics?.total_comments },
              { icon: Bookmark, label: 'Salvamentos', val: metrics.total_saves, prev: prevMetrics?.total_saves },
              { icon: Share2, label: 'Compartilhamentos', val: metrics.total_shares, prev: prevMetrics?.total_shares },
              { icon: Play, label: 'Reproduções', val: metrics.total_plays, prev: prevMetrics?.total_plays },
            ].map((item, i) => (
              <Card key={i}><CardContent className="p-3 text-center">
                <item.icon className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                <p className="text-base font-bold">{(item.val || 0).toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">{item.label}</p>
                {item.prev !== undefined && <DeltaBadge current={item.val || 0} previous={item.prev || 0} />}
              </CardContent></Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dailyFollowers.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">📈 Evolução Seguidores</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={dailyFollowers.map((d: any) => ({ day: new Date(d.date).getDate(), count: d.count }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {contentTypeData.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">📊 Tipos de Conteúdo</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={contentTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={({ name, value }) => `${name}: ${value}`}>
                        {contentTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {bestHours.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Melhores Horários</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={bestHours.map((h: any) => ({ hour: `${h.hour}h`, count: h.count }))}>
                      <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Top Posts */}
      {topMedia.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">🔥 Melhores Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              {topMedia.map((media: any, idx: number) => (
                <div key={media.id} className="border rounded-lg overflow-hidden">
                  <div className="relative aspect-square bg-muted">
                    <img src={media.thumbnail_url || media.media_url} alt="" className="w-full h-full object-cover" />
                    {(media.media_type === 'VIDEO' || media.media_type === 'REELS') && (
                      <Badge variant="secondary" className="absolute top-1 left-1 text-[10px] gap-0.5"><Play className="h-2.5 w-2.5" /> {media.media_type === 'REELS' ? 'Reel' : 'Vídeo'}</Badge>
                    )}
                    <Badge className="absolute top-1 right-1 text-[10px]">#{idx + 1}</Badge>
                  </div>
                  <div className="p-2 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" /> {media.like_count}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" /> {media.comments_count}</span>
                      <span className="flex items-center gap-0.5"><Bookmark className="h-2.5 w-2.5" /> {media.saves}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      Alcance: {(media.reach || 0).toLocaleString()} • {media.plays > 0 ? `${media.plays.toLocaleString()} plays` : ''}
                    </div>
                    {media.permalink && (
                      <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px] w-full" onClick={() => window.open(media.permalink, '_blank')}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Ver no Instagram
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
