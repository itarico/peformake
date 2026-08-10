import { GuidedAIChat } from '@/components/consulting/guided-chat/GuidedAIChat';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Palette, Video, Target } from 'lucide-react';

interface SocialMediaCreativeAIToolsProps {
  clientName: string;
  clientContext: {
    businessDescription?: string;
    businessSegment?: string;
    targetAudience?: string;
    valueProposition?: string;
    monthlyFocus?: string;
  };
  consultingMonthId?: string;
  clientId?: string;
}

export function SocialMediaCreativeAITools({
  clientName,
  clientContext,
  consultingMonthId,
  clientId,
}: SocialMediaCreativeAIToolsProps) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="campaign" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaign" className="gap-1">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Campanha</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Social Media</span>
          </TabsTrigger>
          <TabsTrigger value="design" className="gap-1">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Design</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-1">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Vídeo</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="campaign" className="mt-4">
          <GuidedAIChat chatType="campaign" clientName={clientName} clientContext={clientContext} consultingMonthId={consultingMonthId} clientId={clientId} />
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <GuidedAIChat chatType="social_media" clientName={clientName} clientContext={clientContext} consultingMonthId={consultingMonthId} clientId={clientId} />
        </TabsContent>
        
        <TabsContent value="design" className="mt-4">
          <GuidedAIChat chatType="design" clientName={clientName} clientContext={clientContext} consultingMonthId={consultingMonthId} clientId={clientId} />
        </TabsContent>
        
        <TabsContent value="video" className="mt-4">
          <GuidedAIChat chatType="video" clientName={clientName} clientContext={clientContext} consultingMonthId={consultingMonthId} clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
