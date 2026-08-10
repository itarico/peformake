import React, { useState, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs-lazy';
import { ClipboardCheck, Users, BookOpen, Video } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy loading components
const OperationPanel = lazy(() => import('@/components/management/OperationPanel'));
const Planning = lazy(() => import('@/pages/Planning'));
const Playbook = lazy(() => import('@/pages/Playbook'));
const Audiovisual = lazy(() => import('@/pages/Audiovisual'));

const Operation = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Operação</h1>
        <p className="text-muted-foreground">
          Gestão operacional, planejamento de social media e playbook da agência.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap items-center justify-start gap-1 p-0.5 bg-background border rounded-lg h-auto w-fit">
          <TabsTrigger 
            value="general" 
            className="flex items-center gap-1.5 text-xs py-2 px-3"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Geral</span>
          </TabsTrigger>
          <TabsTrigger 
            value="social-media" 
            className="flex items-center gap-1.5 text-xs py-2 px-3"
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Social Media</span>
          </TabsTrigger>
          <TabsTrigger 
            value="audiovisual" 
            className="flex items-center gap-1.5 text-xs py-2 px-3"
          >
            <Video className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Audiovisual</span>
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
            </div>
          </div>
        }>
          <TabsContent value="general" className="border-none p-0 outline-none">
            <OperationPanel />
          </TabsContent>
          <TabsContent value="social-media" className="border-none p-0 outline-none">
            <Planning />
          </TabsContent>
          <TabsContent value="audiovisual" className="border-none p-0 outline-none">
            <Audiovisual />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
};

export default Operation;
