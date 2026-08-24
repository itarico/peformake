import React, { useState, useEffect, lazy, Suspense, useTransition, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs-lazy';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, DollarSign, Users, ClipboardCheck, KeyRound, Globe, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaffAuth } from '@/contexts/StaffAuthContext';

// Lazy loading components with custom prefetch support
const ManagementDashboard = lazy(() => import('@/components/management/ManagementDashboard'));
const FinancialPanel = lazy(() => import('@/components/management/FinancialPanel'));
const IntegratedStaffPanel = lazy(() => import('@/components/management/IntegratedStaffPanel'));
const OperationPanel = lazy(() => import('@/components/management/OperationPanel'));
const CredentialsPanel = lazy(() => import('@/components/management/CredentialsPanel'));
const SitePanel = lazy(() => import('@/components/management/SitePanel'));
const CohortPanel = lazy(() => import('@/components/management/CohortPanel'));

const Management = () => {
  const { isAdmin: isStaffAdmin, isLeader, isFinanceEllcazo, isEllcazo } = useStaffAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  // Cargo "Financeiro (Ellcazo)": só a aba financeira, nada mais de Financeiro (Equipe,
  // Credenciais, Site, Cohort). A trava de entidade (só Ellcazo, sem alternar pra Peformake/Geral)
  // é dentro do próprio FinancialPanel.
  const isFinanceEllcazoOnly = isFinanceEllcazo && !isEllcazo && !isStaffAdmin && !isLeader;
  // Perfil "Admin Ellcazo": financeiro da Ellcazo com lançamentos + equipe da Ellcazo.
  const isEllcazoOnly = isEllcazo && !isStaffAdmin && !isLeader;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      startTransition(() => {
        setActiveTab(tab);
      });
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (value: string) => {
    startTransition(() => {
      setActiveTab(value);
      setSearchParams({ tab: value });
    });
  };

  const prefetchTab = (tab: string) => {
    // Prefetch component chunks
    if (tab === 'performance') {
      import('@/components/management/IntegratedStaffPanel');
      queryClient.prefetchQuery({ queryKey: ['staff-integrated'] });
      queryClient.prefetchQuery({ queryKey: ['all-clients'] });
    } else if (tab === 'financial') {
      import('@/components/management/FinancialPanel');
      queryClient.prefetchQuery({ queryKey: ['mgmt-dash-expenses-last-12-months'] });
    } else if (tab === 'dashboard') {
      import('@/components/management/ManagementDashboard');
      queryClient.prefetchQuery({ queryKey: ['mgmt-dash-clients'] });
      queryClient.prefetchQuery({ queryKey: ['mgmt-dash-client-services'] });
    } else if (tab === 'operation') {
      import('@/components/management/OperationPanel');
      queryClient.prefetchQuery({ queryKey: ['mgmt-dash-production'] });
    } else if (tab === 'credentials') {
      import('@/components/management/CredentialsPanel');
    } else if (tab === 'site') {
      import('@/components/management/SitePanel');
    } else if (tab === 'cohort') {
      import('@/components/management/CohortPanel');
      queryClient.prefetchQuery({ queryKey: ['cohort-tab-clients'] });
      queryClient.prefetchQuery({ queryKey: ['cohort-tab-events'] });
    }
  };

  if (isFinanceEllcazoOnly) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Financeiro — Ellcazo</h1>
          <p className="text-muted-foreground">Acesso restrito aos dados financeiros da Ellcazo.</p>
        </div>
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <FinancialPanel />
        </Suspense>
      </div>
    );
  }

  if (isEllcazoOnly) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Financeiro — Ellcazo</h1>
          <p className="text-muted-foreground">Lançamentos e equipe da produtora.</p>
        </div>
        <Tabs value={activeTab === 'performance' ? 'performance' : 'financial'} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="flex flex-wrap items-center justify-start gap-1 p-0.5 bg-background border rounded-lg h-auto w-fit">
            <TabsTrigger value="financial" className="flex items-center gap-1.5 text-xs py-2 px-3">
              <DollarSign className="h-3.5 w-3.5" /> Lançamentos
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-1.5 text-xs py-2 px-3">
              <Users className="h-3.5 w-3.5" /> Equipe
            </TabsTrigger>
          </TabsList>
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <TabsContent value="financial" className="border-none p-0 outline-none">
              <FinancialPanel />
            </TabsContent>
            <TabsContent value="performance" className="border-none p-0 outline-none">
              <IntegratedStaffPanel />
            </TabsContent>
          </Suspense>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestão da Agência</h1>
        <p className="text-muted-foreground">
          Gerencie finanças, equipe, operações e acessos em um único lugar.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap items-center justify-start gap-1 p-0.5 bg-background border rounded-lg h-auto w-fit">
          <TabsTrigger 
            value="dashboard" 
            className="flex items-center gap-1.5 text-xs py-2 px-3"
            onMouseEnter={() => prefetchTab('dashboard')}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger 
            value="financial" 
            className="flex items-center gap-1.5 text-xs py-2 px-3"
            onMouseEnter={() => prefetchTab('financial')}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Financeiro</span>
          </TabsTrigger>
          <TabsTrigger 
            value="cohort" 
            className="flex items-center gap-1.5 text-xs py-2 px-3 hidden"
            onMouseEnter={() => prefetchTab('cohort')}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cohort & Retenção</span>
          </TabsTrigger>
          <TabsTrigger 
            value="performance" 
            className="flex items-center gap-1.5 text-xs py-2 px-3"
            onMouseEnter={() => prefetchTab('performance')}
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Equipe & Pagamento</span>
          </TabsTrigger>
          {/* Operation removed - moved to its own page */}
          <TabsTrigger 
            value="credentials" 
            className="flex items-center gap-1.5 text-xs py-2 px-3"
            onMouseEnter={() => prefetchTab('credentials')}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Credenciais</span>
          </TabsTrigger>
          <TabsTrigger 
            value="site" 
            className="flex items-center gap-1.5 text-xs py-2 px-3"
            onMouseEnter={() => prefetchTab('site')}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Site</span>
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
          <TabsContent value="dashboard" className="border-none p-0 outline-none">
            <ManagementDashboard />
          </TabsContent>
          <TabsContent value="financial" className="border-none p-0 outline-none">
            <FinancialPanel />
          </TabsContent>
          <TabsContent value="cohort" className="border-none p-0 outline-none">
            <CohortPanel />
          </TabsContent>
          <TabsContent value="performance" className="border-none p-0 outline-none">
            <IntegratedStaffPanel />
          </TabsContent>
          {/* Operation content moved to /operation */}
          <TabsContent value="credentials" className="border-none p-0 outline-none">
            <CredentialsPanel />
          </TabsContent>
          <TabsContent value="site" className="border-none p-0 outline-none">
            <SitePanel />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
};

export default memo(Management);
