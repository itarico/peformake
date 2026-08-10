import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Check, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';

const categoryFromScore = (s: number) =>
  s >= 9 ? 'promoter' : s >= 7 ? 'passive' : 'detractor';

interface Question { id: string; question: string; service: string; }
interface Answer { rating: 'ok' | 'improve' | null; comment: string; }

const SERVICE_LABELS: Record<string, string> = {
  geral: 'Geral',
  design: 'Design',
  traffic: 'Tráfego Pago',
  social_media: 'Social Media',
  consulting: 'Consultoria',
  audiovisual: 'Audiovisual',
};

// DB service slug -> question category
const SLUG_TO_CATEGORY: Record<string, string> = {
  design: 'design',
  trafego: 'traffic',
  social_midia: 'social_media',
  consultoria: 'consulting',
  producao_audiovisual: 'audiovisual',
};

export default function NPSResponse() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<any>(null);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [clientName, setClientName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);

  // Referral
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [refName, setRefName] = useState('');
  const [refPhone, setRefPhone] = useState('');
  const [refCompany, setRefCompany] = useState('');
  const [refNotes, setRefNotes] = useState('');

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data: s } = await supabase
        .from('client_satisfaction_surveys')
        .select('*, clients(name)')
        .eq('public_token', token)
        .maybeSingle();
      if (!s) { setLoading(false); return; }

      setSurvey(s);
      setClientName((s as any).clients?.name || '');
      if (s.responded_at) setSubmitted(true);

      // Get client active services
      const { data: cs } = await supabase
        .from('client_services')
        .select('services(slug)')
        .eq('client_id', s.client_id)
        .eq('is_active', true);

      const allowedCats = new Set<string>(['geral']);
      (cs || []).forEach((row: any) => {
        const slug = row.services?.slug;
        if (slug && SLUG_TO_CATEGORY[slug]) allowedCats.add(SLUG_TO_CATEGORY[slug]);
      });

      const { data: q } = await supabase
        .from('satisfaction_questions')
        .select('id, question, service')
        .eq('is_active', true)
        .order('service').order('display_order');

      setQuestions(((q as Question[]) || []).filter(qq => allowedCats.has(qq.service)));
      setLoading(false);
    })();
  }, [token]);

  const setRating = (qid: string, rating: 'ok' | 'improve') => {
    setAnswers(prev => ({ ...prev, [qid]: { rating, comment: prev[qid]?.comment || '' } }));
  };
  const setComm = (qid: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qid]: { rating: prev[qid]?.rating || null, comment: val } }));
  };

  const submit = async () => {
    if (score === null || !survey) return;
    setSaving(true);
    await supabase
      .from('client_satisfaction_surveys')
      .update({
        score,
        category: categoryFromScore(score),
        comment: comment || null,
        responded_at: new Date().toISOString(),
      })
      .eq('public_token', token);

    const rows = Object.entries(answers)
      .filter(([_, a]) => a.rating)
      .map(([qid, a]) => ({
        survey_id: survey.id,
        question_id: qid,
        rating: a.rating,
        comment: a.comment || null,
      }));
    if (rows.length > 0) {
      await supabase.from('satisfaction_question_answers').insert(rows);
    }

    if (wouldRecommend !== null) {
      await supabase.from('client_referrals').insert({
        survey_id: survey.id,
        client_id: survey.client_id,
        would_recommend: wouldRecommend,
        referred_name: refName || null,
        referred_phone: refPhone || null,
        referred_company: refCompany || null,
        notes: refNotes || null,
      });
    }

    setSubmitted(true);
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!survey) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Pesquisa não encontrada.</div>;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center space-y-3">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">Obrigado!</h1>
            <p className="text-muted-foreground">Sua resposta foi registrada com sucesso. Vamos usá-la para melhorar ainda mais o nosso trabalho.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const grouped = questions.reduce((acc, q) => {
    (acc[q.service] = acc[q.service] || []).push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  const periodLabel = survey.period === 'monthly' ? 'mensal' : 'semanal';

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-2xl mx-auto space-y-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Olá, {clientName}! 👋</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pesquisa {periodLabel} de satisfação. Avalie cada item como <strong className="text-green-500">Está ok</strong> ou <strong className="text-yellow-500">Pode melhorar</strong> e deixe um comentário se quiser.
            </p>
          </CardHeader>
        </Card>

        {Object.entries(grouped).map(([service, qs]) => (
          <Card key={service}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{SERVICE_LABELS[service] || service}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {qs.map(q => {
                const a = answers[q.id];
                return (
                  <div key={q.id} className="space-y-2 pb-3 border-b last:border-b-0">
                    <p className="text-sm font-medium">{q.question}</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={a?.rating === 'ok' ? 'default' : 'outline'}
                        className={a?.rating === 'ok' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                        onClick={() => setRating(q.id, 'ok')}
                      >
                        <Check className="h-4 w-4 mr-1" /> Está ok
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={a?.rating === 'improve' ? 'default' : 'outline'}
                        className={a?.rating === 'improve' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                        onClick={() => setRating(q.id, 'improve')}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" /> Pode melhorar
                      </Button>
                    </div>
                    {a?.rating && (
                      <Textarea
                        value={a.comment}
                        onChange={e => setComm(q.id, e.target.value)}
                        placeholder="Comentário (opcional)"
                        rows={2}
                        maxLength={500}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nota geral (NPS)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Em uma escala de 0 a 10, o quanto você recomendaria nossos serviços a um amigo ou colega?
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setScore(i)}
                  className={`aspect-square rounded-md text-sm font-semibold border transition-colors ${
                    score === i
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-muted border-border'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Nada provável</span>
              <span>Muito provável</span>
            </div>
            <div>
              <label className="text-sm font-medium">Comentário geral (opcional)</label>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="O que mais nos ajudaria a melhorar?"
                rows={3}
                maxLength={1000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Referral */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🤝 Indicação</CardTitle>
            <p className="text-sm text-muted-foreground">
              Você indicaria a Peformake para alguém? Se sim, nos diga quem — entraremos em contato com cuidado.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={wouldRecommend === true ? 'default' : 'outline'}
                className={wouldRecommend === true ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                onClick={() => setWouldRecommend(true)}
              >
                <ThumbsUp className="h-4 w-4 mr-1" /> Sim, indicaria
              </Button>
              <Button
                type="button"
                size="sm"
                variant={wouldRecommend === false ? 'default' : 'outline'}
                className={wouldRecommend === false ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                onClick={() => setWouldRecommend(false)}
              >
                <ThumbsDown className="h-4 w-4 mr-1" /> Ainda não
              </Button>
            </div>

            {wouldRecommend === true && (
              <div className="space-y-2 pt-2">
                <div>
                  <Label className="text-xs">Nome da pessoa</Label>
                  <Input value={refName} onChange={e => setRefName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">WhatsApp</Label>
                    <Input value={refPhone} onChange={e => setRefPhone(e.target.value)} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <Label className="text-xs">Empresa (opcional)</Label>
                    <Input value={refCompany} onChange={e => setRefCompany(e.target.value)} placeholder="Empresa" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Por que essa indicação? (opcional)</Label>
                  <Textarea value={refNotes} onChange={e => setRefNotes(e.target.value)} rows={2} maxLength={500} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={submit} disabled={score === null || saving} className="w-full" size="lg">
          {saving ? 'Enviando...' : 'Enviar resposta'}
        </Button>
      </div>
    </div>
  );
}
