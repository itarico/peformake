import { useEffect, useState } from 'react';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard } from 'lucide-react';
import DesignerDashboardTab from '@/components/designer/DesignerDashboardTab';

// Removendo 'sales' temporariamente conforme solicitado
const DESIGNER_TABS = ['dashboard'] as const;

type DesignerTab = (typeof DESIGNER_TABS)[number];

export default function DesignerWorkspace() {
  const { staffMember, isDesigner } = useStaffAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');
  const initialTab = DESIGNER_TABS.includes(currentTab as DesignerTab) ? (currentTab as DesignerTab) : 'dashboard';
  const [activeTab, setActiveTab] = useState<DesignerTab>(initialTab);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (DESIGNER_TABS.includes(nextTab as DesignerTab) && nextTab !== activeTab) {
      setActiveTab(nextTab as DesignerTab);
    }
  }, [searchParams, activeTab]);

  if (!staffMember || !isDesigner) {
    return <Navigate to="/staff-login" replace />;
  }

  const handleTabChange = (value: string) => {
    const nextTab = DESIGNER_TABS.includes(value as DesignerTab) ? (value as DesignerTab) : 'dashboard';
    setActiveTab(nextTab);

    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'dashboard') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }

    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {staffMember?.full_name?.split(' ')[0]}</h1>
      </div>

      <div className="space-y-6">
        <DesignerDashboardTab staffId={staffMember.id} />
      </div>

    </div>
  );
}
