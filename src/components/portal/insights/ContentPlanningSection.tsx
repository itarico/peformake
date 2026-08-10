import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Lightbulb, TrendingUp, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormattedText, cleanAIText } from './ContentFormatter';

interface ContentPlanningItem {
  id: string;
  category: string;
  content: string;
}

interface ContentPlanningSectionProps {
  socialPlanning?: ContentPlanningItem;
  videoIdeas?: ContentPlanningItem;
  campaignPlanning?: ContentPlanningItem;
}

function ContentCard({ 
  title, 
  description, 
  icon, 
  content, 
  accentColor 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  content: string;
  accentColor: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cleanAIText(content));
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={`border-l-4 ${accentColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto">
          <FormattedText content={content} />
        </div>
      </CardContent>
    </Card>
  );
}

export function ContentPlanningSection({ socialPlanning, videoIdeas, campaignPlanning }: ContentPlanningSectionProps) {
  const hasContent = socialPlanning || videoIdeas || campaignPlanning;
  
  if (!hasContent) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {socialPlanning && (
        <ContentCard
          title="Calendário de Conteúdo"
          description="Planejamento de posts para suas redes"
          icon={<Calendar className="h-5 w-5 text-blue-500" />}
          content={socialPlanning.content}
          accentColor="border-l-blue-500"
        />
      )}

      {videoIdeas && (
        <ContentCard
          title="Ideias de Vídeo DIY"
          description="Vídeos simples que você pode gravar"
          icon={<Lightbulb className="h-5 w-5 text-yellow-500" />}
          content={videoIdeas.content}
          accentColor="border-l-yellow-500"
        />
      )}

      {campaignPlanning && (
        <ContentCard
          title="Estratégia de Campanha"
          description="Planejamento de anúncios e campanhas"
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
          content={campaignPlanning.content}
          accentColor="border-l-green-500"
        />
      )}
    </div>
  );
}
