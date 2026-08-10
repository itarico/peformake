import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Target, Briefcase, Settings2, UserCheck, 
  PieChart, Calendar, GraduationCap, Package
} from 'lucide-react';
import SDRPipelineKanban from '@/components/sdr/SDRPipelineKanban';
import SDRMeetings from '@/components/sdr/SDRMeetings';
import SDRDashboard from '@/components/sdr/SDRDashboard';
import SDRStrategyGuide from '@/components/sdr/SDRStrategyGuide';
import SDRCrmIntegration from '@/components/sdr/SDRCrmIntegration';
// SDRAIProspector removed based on user request to remove strategy tab
import CloserPlaybook from '@/components/sdr/CloserPlaybook';
import SDRICPIdentification from '@/components/sdr/SDRICPIdentification';
import SDRCommercialGoals from '@/components/sdr/SDRCommercialGoals';
import Packages from './Packages';
import { useSDRContext } from '@/components/sdr/useSDRContext';

const SDRWorkspace = () => {
  const { isAdminView } = useSDRContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    setSearchParams({ tab: v });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 p-2.5 rounded-xl border border-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Máquina Comercial</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="h-5 text-[10px] font-semibold border-primary/20 text-primary bg-primary/5">
                GESTÃO UNIFICADA
              </Badge>
              <span className="text-[11px] text-muted-foreground font-medium">SDR & Closer</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex items-center justify-start gap-1 p-1 bg-muted/30 border rounded-xl h-auto w-full sm:w-fit overflow-x-auto no-scrollbar">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 text-xs py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <PieChart className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </TabsTrigger>
          {/* ICP moved into Metodologia */}
          <TabsTrigger value="sdr" className="flex items-center gap-2 text-xs py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <UserCheck className="h-3.5 w-3.5" />
            <span>Venda</span>
          </TabsTrigger>
          <TabsTrigger value="reunioes" className="flex items-center gap-2 text-xs py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Calendar className="h-3.5 w-3.5" />
            <span>Reuniões</span>
          </TabsTrigger>
          <TabsTrigger value="metodologia" className="flex items-center gap-2 text-xs py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Metodologia</span>
          </TabsTrigger>
          <TabsTrigger value="packages" className="flex items-center gap-2 text-xs py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Package className="h-3.5 w-3.5" />
            <span>Pacotes e Serviços</span>
          </TabsTrigger>
          {isAdminView && (
            <TabsTrigger value="settings" className="flex items-center gap-2 text-xs py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Settings2 className="h-3.5 w-3.5" />
              <span>Configurações</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Dashboard Geral */}
        <TabsContent value="dashboard" className="mt-4">
          <SDRDashboard showGeneral={true} />
        </TabsContent>

        {/* ICP Content moved to Metodologia tab */}

        {/* Venda (SDR) */}
        <TabsContent value="sdr" className="mt-4 space-y-4">
          <SDRPipelineKanban />
        </TabsContent>

        {/* Reuniões */}
        <TabsContent value="reunioes" className="mt-4">
          <SDRMeetings />
        </TabsContent>

        {/* Metodologia (Combina Playbooks e Estratégias) */}
        <TabsContent value="metodologia" className="mt-4">
          <Tabs defaultValue="strategies" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <TabsList className="grid w-full sm:w-auto grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/30 border rounded-xl">
                <TabsTrigger value="icp" className="flex items-center gap-2 py-2 px-4">
                  <Target className="h-3.5 w-3.5" />
                  <span>ICP</span>
                </TabsTrigger>
                <TabsTrigger value="strategies" className="flex items-center gap-2 py-2 px-4">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Estratégias</span>
                </TabsTrigger>
                <TabsTrigger value="playbook-sdr" className="flex items-center gap-2 py-2 px-4">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Playbook SDR</span>
                </TabsTrigger>
                <TabsTrigger value="playbook-closer" className="flex items-center gap-2 py-2 px-4">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Playbook Closer</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="icp" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SDRICPIdentification />
            </TabsContent>
            
            <TabsContent value="strategies" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SDRStrategyGuide mode="strategies" />
            </TabsContent>
            
            <TabsContent value="playbook-sdr" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <SDRStrategyGuide mode="sdr-playbook" />
            </TabsContent>
            
            <TabsContent value="playbook-closer" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <CloserPlaybook />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Pacotes e Serviços */}
        <TabsContent value="packages" className="mt-4">
          <Packages />
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="settings" className="mt-4 space-y-6">
          <SDRCommercialGoals />
          <SDRCrmIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SDRWorkspace;
