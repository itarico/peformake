import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Check, MessageSquare, Film, ChevronLeft, ChevronRight, Instagram, CircleCheck, Clock, Loader2, Sparkles } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

async function callPortal(payload: any) {
  const { data, error } = await supabase.functions.invoke('weekly-plan-portal', { body: payload });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export function WeeklyPlanApproval({ token }: { token: string }) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [openPost, setOpenPost] = useState<any>(null);
  const [openStory, setOpenStory] = useState<any>(null);
  const [comment, setComment] = useState('');

  const { data: plansData, refetch: refetchPlans } = useQuery({
    queryKey: ['portal-wp-plans', token],
    queryFn: async () => await callPortal({ action: 'list_plans', token }),
  });

  const plans = (plansData as any)?.plans || [];

  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) setSelectedPlanId(plans[0].id);
  }, [plans, selectedPlanId]);

  const { data: planData, refetch: refetchPlan } = useQuery({
    queryKey: ['portal-wp-plan', token, selectedPlanId],
    queryFn: async () => await callPortal({ action: 'get_plan', token, plan_id: selectedPlanId }),
    enabled: !!selectedPlanId,
  });

  const plan = (planData as any)?.plan;
  const posts = (planData as any)?.posts || [];
  const stories = (planData as any)?.stories || [];

  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Instagram className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold">Ainda não há planejamento para aprovar</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Assim que seu social media enviar o próximo planejamento semanal, ele aparecerá aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  const approvedCount = [...posts, ...stories].filter((i: any) => i.status === 'approved').length;
  const totalCount = posts.length + stories.length;
  const start = plan ? new Date(plan.week_start_date + 'T00:00:00') : null;
  const end = start ? addDays(start, 6) : null;

  const handleApproveItem = async (type: 'post' | 'story', item: any) => {
    try {
      await callPortal({ action: 'approve_item', token, item_type: type, item_id: item.id });
      toast.success('Aprovado!');
      refetchPlan();
      setOpenPost(null);
      setOpenStory(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRequestChanges = async (type: 'post' | 'story', item: any) => {
    if (!comment.trim()) {
      toast.error('Escreva o que precisa ser alterado');
      return;
    }
    try {
      await callPortal({
        action: 'request_changes_item',
        token,
        item_type: type,
        item_id: item.id,
        comment: comment.trim(),
      });
      toast.success('Feedback enviado ao time');
      setComment('');
      refetchPlan();
      setOpenPost(null);
      setOpenStory(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleApproveAll = async () => {
    if (!plan) return;
    if (!confirm('Aprovar toda a semana? Todos os posts e stories serão marcados como aprovados.')) return;
    try {
      await callPortal({ action: 'approve_all', token, plan_id: plan.id });
      toast.success('Semana aprovada! ✨');
      refetchPlan();
      refetchPlans();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {plans.length > 1 && (
              <Select value={selectedPlanId || ''} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p: any) => {
                    const s = new Date(p.week_start_date + 'T00:00:00');
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        Semana de {format(s, "d 'de' MMM", { locale: ptBR })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <Instagram className="h-5 w-5 text-primary" /> Planejamento da semana
              </h2>
              {start && end && (
                <p className="text-sm text-muted-foreground">
                  {format(start, "d 'de' MMM", { locale: ptBR })} —{' '}
                  {format(end, "d 'de' MMM yyyy", { locale: ptBR })}
                </p>
              )}
              <p className="text-xs mt-1 text-muted-foreground">
                Aprovados: <strong>{approvedCount}/{totalCount}</strong>
              </p>
            </div>
          </div>
          <Button onClick={handleApproveAll} className="gap-2" disabled={plan?.status === 'approved'}>
            <CircleCheck className="h-4 w-4" />
            {plan?.status === 'approved' ? 'Semana aprovada' : 'Aprovar semana inteira'}
          </Button>
        </CardContent>
      </Card>

      {/* Instagram-style grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Instagram className="h-5 w-5" /> Preview do feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum post nessa semana.</p>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 sm:gap-1 max-w-lg mx-auto">
              {posts.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setOpenPost(p)}
                  className="relative aspect-square bg-muted overflow-hidden group"
                >
                  {p.image_urls?.[0] && (
                    <img src={p.image_urls[0]} alt="" className="w-full h-full object-cover" />
                  )}
                  {p.post_type === 'reels' && (
                    <Film className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow" />
                  )}
                  {p.image_urls?.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {p.image_urls.length}
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <StatusChip status={p.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stories per day */}
      {stories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Stories da semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day, i) => {
                const dayStories = stories.filter((s: any) => s.day_of_week === i);
                return (
                  <div key={i} className="text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">{day}</p>
                    <div className="space-y-2">
                      {dayStories.length === 0 ? (
                        <div className="aspect-square rounded-full bg-muted/30 border border-dashed" />
                      ) : (
                        dayStories.map((s: any) => (
                          <button
                            key={s.id}
                            onClick={() => setOpenStory(s)}
                            className={`w-full aspect-square rounded-full overflow-hidden ring-2 relative ${
                              s.status === 'approved'
                                ? 'ring-green-500'
                                : s.status === 'changes_requested'
                                ? 'ring-destructive'
                                : 'ring-primary'
                            }`}
                          >
                            {s.image_url ? (
                              <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[10px] p-1">
                                {s.title?.slice(0, 12) || s.story_type}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post modal */}
      <Dialog open={!!openPost} onOpenChange={(o) => { if (!o) { setOpenPost(null); setComment(''); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {openPost && (
            <div className="grid md:grid-cols-2">
              <div className="bg-black flex items-center justify-center">
                <PostCarousel images={openPost.image_urls || []} />
              </div>
              <div className="p-6 flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    {openPost.post_type === 'reels' ? 'Reels' : openPost.post_type === 'carousel' ? 'Carrossel' : 'Post do feed'}
                    <StatusChip status={openPost.status} />
                  </DialogTitle>
                </DialogHeader>
                {openPost.scheduled_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {format(new Date(openPost.scheduled_at), "EEEE, d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
                <div className="mt-4 flex-1 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{openPost.caption}</p>
                  {openPost.hashtags && (
                    <p className="text-sm text-primary mt-2">{openPost.hashtags}</p>
                  )}
                  {openPost.client_comment && (
                    <div className="mt-4 p-3 bg-muted/50 rounded text-xs">
                      <p className="font-semibold mb-1">Seu comentário anterior:</p>
                      <p>{openPost.client_comment}</p>
                    </div>
                  )}
                </div>
                {openPost.status !== 'approved' && (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Se quiser pedir alteração, descreva aqui..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button className="flex-1 gap-2" onClick={() => handleApproveItem('post', openPost)}>
                        <Check className="h-4 w-4" /> Aprovar
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => handleRequestChanges('post', openPost)}>
                        <MessageSquare className="h-4 w-4" /> Pedir alteração
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Story modal */}
      <Dialog open={!!openStory} onOpenChange={(o) => { if (!o) { setOpenStory(null); setComment(''); } }}>
        <DialogContent className="max-w-md">
          {openStory && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {DAYS[openStory.day_of_week]} • {openStory.title || openStory.story_type}
                  <StatusChip status={openStory.status} />
                </DialogTitle>
              </DialogHeader>
              {openStory.image_url && (
                <img src={openStory.image_url} alt="" className="w-full aspect-[9/16] object-cover rounded" />
              )}
              <p className="text-sm whitespace-pre-wrap">{openStory.description}</p>
              {openStory.status !== 'approved' && (
                <div className="space-y-2">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Comentário opcional..."
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2" onClick={() => handleApproveItem('story', openStory)}>
                      <Check className="h-4 w-4" /> Aprovar
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => handleRequestChanges('story', openStory)}>
                      <MessageSquare className="h-4 w-4" /> Alteração
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === 'approved') return <Badge className="bg-green-500 hover:bg-green-500 text-white text-[10px] ml-2">✓ Aprovado</Badge>;
  if (status === 'changes_requested') return <Badge variant="destructive" className="text-[10px] ml-2">Alteração pedida</Badge>;
  return <Badge variant="secondary" className="text-[10px] ml-2">Aguardando</Badge>;
}

function PostCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) return null;
  return (
    <div className="relative w-full aspect-square">
      <img src={images[idx]} alt="" className="w-full h-full object-contain" />
      {images.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
