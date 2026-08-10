import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Users, Brain, Settings } from 'lucide-react';
import CrmBotConfig from './CrmBotConfig';
import CrmAgentConfig from './CrmAgentConfig';
import CrmIntelligenceLog from './CrmIntelligenceLog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export default function CrmBotConfigSheet({ open, onOpenChange, clientId, clientName }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Motor de Inteligência IA — {clientName}
          </SheetTitle>
          <SheetDescription>
            Configure os agentes de IA e visualize o log de decisões.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="config">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="config" className="flex-1 text-xs">
              <Settings className="h-3.5 w-3.5 mr-1" />Config Bot
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex-1 text-xs">
              <Users className="h-3.5 w-3.5 mr-1" />Agentes IA
            </TabsTrigger>
            <TabsTrigger value="log" className="flex-1 text-xs">
              <Brain className="h-3.5 w-3.5 mr-1" />Log IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <CrmBotConfig clientId={clientId} clientName={clientName} />
          </TabsContent>

          <TabsContent value="agents">
            <CrmAgentConfig clientId={clientId} clientName={clientName} />
          </TabsContent>

          <TabsContent value="log">
            <CrmIntelligenceLog clientId={clientId} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
