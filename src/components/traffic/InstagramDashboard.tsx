import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Instagram, Users, Eye, Heart, MessageCircle, Bookmark, Share2, Play, ExternalLink, RefreshCw, Link2, TrendingUp, TrendingDown, BarChart3, Image, Film, Layers, UserPlus, Globe, Clock, Unlink, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface InstagramDashboardProps {
  clientId: string;
  clientName?: string;
}

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function DeltaBadge({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const isPositive = invert ? pct <= 0 : pct >= 0;
  return (
    <span className={`text-[10px] font-medium flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
      {pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, prevValue, invert = false }: { icon: any; label: string; value: number | string; prevValue?: number; invert?: boolean }) {
  const numVal = typeof value === 'number' ? value : parseFloat(value) || 0;
  const displayVal = typeof value === 'number' ? value.toLocaleString('pt-BR') : value;
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
        <p className="text-xl font-bold">{displayVal}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {prevValue !== undefined && <DeltaBadge current={numVal} previous={prevValue} invert={invert} />}
      </CardContent>
    </Card>
  );
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

export function InstagramDashboard({ clientId, clientName }: InstagramDashboardProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: connection } = useQuery({
    queryKey: ['ig-connection', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_meta_connections')
        .select('instagram_business_id, instagram_username')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const isIgConnected = !!connection?.instagram_business_id;

  const discoverMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('instagram-sync', {
        body: { action: 'discover_instagram', client_id: clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.accounts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (acc: any) => {
      const { data, error } = await supabase.functions.invoke('instagram-sync', {
        body: { action: 'save_instagram', client_id: clientId, ig_id: acc.ig_id, ig_username: acc.ig_username },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-connection', clientId] });
      toast.success('Instagram vinculado!');
      discoverMutation.reset();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('instagram-sync', {
        body: { action: 'sync_instagram', client_id: clientId, year, month },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['ig-media'] });
      toast.success('Dados do Instagram sincronizados!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('instagram-sync', {
        body: { action: 'disconnect_instagram', client_id: clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig-connection', clientId] });
      toast.success('Instagram desconectado');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: metrics } = useQuery({
    queryKey: ['ig-metrics', clientId, year, month],
    queryFn: async () => {
      const { data } = await supabase
        .from('instagram_metrics')
        .select('*')
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .single();
      return data as any;
    },
    enabled: isIgConnected,
  });

  // Previous month metrics for comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const { data: prevMetrics } = useQuery({
    queryKey: ['ig-metrics', clientId, prevYear, prevMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from('instagram_metrics')
        .select('*')
        .eq('client_id', clientId)
        .eq('year', prevYear)
        .eq('month', prevMonth)
        .single();
      return data as any;
    },
    enabled: isIgConnected,
  });

  const { data: topMedia = [] } = useQuery({
    queryKey: ['ig-media', clientId, year, month],
    queryFn: async () => {
      const { data } = await supabase
        .from('instagram_top_media')
        .select('*')
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .order('engagement_total', { ascending: false })
        .limit(12);
      return (data || []) as any[];
    },
    enabled: isIgConnected,
  });

  if (!isIgConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Instagram className="h-5 w-5" /> Instagram</CardTitle>
          <CardDescription>Vincule a conta do Instagram do cliente para extrair métricas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {discoverMutation.data ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Contas encontradas:</p>
              {discoverMutation.data.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta profissional encontrada.</p>}
              {discoverMutation.data.map((acc: any) => (
                <div key={acc.ig_id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {acc.ig_profile_pic && <img src={acc.ig_profile_pic} className="h-10 w-10 rounded-full" alt="" />}
                    <div>
                      <p className="font-medium text-sm">@{acc.ig_username}</p>
                      <p className="text-xs text-muted-foreground">{acc.followers?.toLocaleString()} seguidores • {acc.media_count} posts</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => saveMutation.mutate(acc)} disabled={saveMutation.isPending}>
                    <Link2 className="mr-1 h-3 w-3" /> Vincular
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Button onClick={() => discoverMutation.mutate()} disabled={discoverMutation.isPending}>
              {discoverMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Instagram className="mr-2 h-4 w-4" /> Buscar Conta Instagram
            </Button>
          )}
          {discoverMutation.error && <p className="text-sm text-destructive">{(discoverMutation.error as any).message}</p>}
          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate('/traffic?tab=config')}>
              <Settings className="h-4 w-4" />
              Configurações de Integração Meta
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const contentTypeData = metrics ? [
    { name: 'Imagens', value: metrics.image_count || 0 },
    { name: 'Reels', value: metrics.reels_count || 0 },
    { name: 'Carrossel', value: metrics.carousel_count || 0 },
  ].filter(d => d.value > 0) : [];

  const demographicData = metrics?.audience_demographics?.age_gender?.slice(0, 10) || [];
  const cityData = metrics?.audience_demographics?.cities?.slice(0, 8) || [];
  const bestHours = metrics?.best_posting_hours?.slice(0, 8) || [];
  const dailyFollowers = metrics?.daily_follower_data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-pink-500" />
          <h3 className="font-semibold">Instagram @{connection.instagram_username}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{[now.getFullYear(), now.getFullYear() - 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
            if (confirm('Desconectar Instagram deste cliente?')) disconnectMutation.mutate();
          }} disabled={disconnectMutation.isPending}>
            <Unlink className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2"
            onClick={() => navigate('/traffic?tab=config')}
          >
            <Settings className="h-4 w-4" />
            Configurar Conexão
          </Button>
        </div>
      </div>

      {!metrics && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <p className="text-sm">Nenhum dado para {MONTHS[month - 1]} {year}. Clique em sincronizar.</p>
        </CardContent></Card>
      )}

      {metrics && (
        <>
          {/* Main KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <MetricCard icon={Users} label="Seguidores" value={metrics.followers_count || 0} prevValue={prevMetrics?.followers_count} />
            <MetricCard icon={UserPlus} label="Novos Seguidores" value={metrics.new_followers || 0} prevValue={prevMetrics?.new_followers} />
            <MetricCard icon={Eye} label="Alcance" value={metrics.reach || 0} prevValue={prevMetrics?.reach} />
            <MetricCard icon={Eye} label="Impressões" value={metrics.impressions || 0} prevValue={prevMetrics?.impressions} />
            <MetricCard icon={TrendingUp} label="Engajamento" value={`${(metrics.engagement_rate || 0).toFixed(2)}%`} prevValue={prevMetrics?.engagement_rate} />
            <MetricCard icon={Users} label="Visitas Perfil" value={metrics.profile_views || 0} prevValue={prevMetrics?.profile_views} />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <MetricCard icon={Heart} label="Curtidas" value={metrics.total_likes || 0} prevValue={prevMetrics?.total_likes} />
            <MetricCard icon={MessageCircle} label="Comentários" value={metrics.total_comments || 0} prevValue={prevMetrics?.total_comments} />
            <MetricCard icon={Bookmark} label="Salvamentos" value={metrics.total_saves || 0} prevValue={prevMetrics?.total_saves} />
            <MetricCard icon={Share2} label="Compartilhamentos" value={metrics.total_shares || 0} prevValue={prevMetrics?.total_shares} />
            <MetricCard icon={Play} label="Reproduções" value={metrics.total_plays || 0} prevValue={prevMetrics?.total_plays} />
            <MetricCard icon={ExternalLink} label="Cliques Link" value={metrics.website_clicks || 0} prevValue={prevMetrics?.website_clicks} />
          </div>

          {/* Averages per post */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">📊 Média por Post ({metrics.posts_count || 0} publicações)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold">{(metrics.avg_likes || 0).toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-muted-foreground">Curtidas/post</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{(metrics.avg_comments || 0).toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-muted-foreground">Comentários/post</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{(metrics.avg_saves || 0).toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-muted-foreground">Salvamentos/post</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{(metrics.avg_shares || 0).toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-muted-foreground">Compartilhamentos/post</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{(metrics.avg_reach_per_post || 0).toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] text-muted-foreground">Alcance/post</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Content Type */}
            {contentTypeData.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Tipos de Conteúdo</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={contentTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                        {contentTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Follower Growth */}
            {dailyFollowers.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução de Seguidores</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={dailyFollowers.map((d: any) => ({ ...d, day: new Date(d.date).getDate() }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 10', 'dataMax + 10']} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#ec4899" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Best Hours */}
            {bestHours.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Melhores Horários</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={bestHours.map((h: any) => ({ hour: `${h.hour}h`, count: h.count }))}>
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Demographics */}
          {cityData.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Top Cidades</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cityData.map((c: any) => ({ name: c.city || c.dimension_values?.[0], value: c.value }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top Posts */}
          {topMedia.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">🔥 Top Posts do Mês</CardTitle>
                <CardDescription>Ordenados por engajamento total</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {topMedia.map((media: any, idx: number) => (
                    <div key={media.id} className="border rounded-lg overflow-hidden">
                      <div className="relative aspect-square bg-muted">
                        {media.media_type === 'VIDEO' || media.media_type === 'REELS' ? (
                          <>
                            <img src={media.thumbnail_url || media.media_url} alt="" className="w-full h-full object-cover" />
                            <Badge variant="secondary" className="absolute top-2 left-2 gap-1"><Play className="h-3 w-3" /> {media.media_type === 'REELS' ? 'Reel' : 'Vídeo'}</Badge>
                          </>
                        ) : (
                          <img src={media.media_url || media.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        )}
                        <Badge className="absolute top-2 right-2">#{idx + 1}</Badge>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {media.like_count}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {media.comments_count}</span>
                          <span className="flex items-center gap-0.5"><Bookmark className="h-3 w-3" /> {media.saves}</span>
                          <span className="flex items-center gap-0.5"><Share2 className="h-3 w-3" /> {media.shares}</span>
                          {media.plays > 0 && <span className="flex items-center gap-0.5"><Play className="h-3 w-3" /> {media.plays?.toLocaleString()}</span>}
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span><strong>Alcance:</strong> {media.reach?.toLocaleString()}</span>
                          {media.permalink && (
                            <Button size="sm" variant="ghost" className="h-5 px-1" onClick={() => window.open(media.permalink, '_blank')}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {media.caption && <p className="text-[10px] text-muted-foreground line-clamp-2">{media.caption}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
