import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { StaffAuthProvider } from "@/contexts/StaffAuthContext";
import TrackingScripts from "@/components/TrackingScripts";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "sonner";
import { LazyMotion, domAnimation } from "framer-motion";

// Lazy load EVERYTHING to keep initial chunk tiny
const Index = lazy(() => import("@/pages/Index"));
const Login = lazy(() => import("@/pages/Login"));
// Componente de carregamento reutilizável

// Prefetch para rotas principais
const prefetchRoute = (importFn: () => Promise<any>) => {
  // Use requestIdleCallback if available, otherwise fallback to a short timeout
  const trigger = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 2000));
  
  let idleHandle: any;
  idleHandle = trigger(() => {
    // Only prefetch if connection is good
    const conn = (navigator as any).connection;
    if (conn && (conn.saveData || (conn.effectiveType && conn.effectiveType.includes('2g')))) {
      return;
    }
    importFn().catch(() => {}); // Silent catch for network issues
  });
  
  return () => {
    if ((window as any).cancelIdleCallback) {
      (window as any).cancelIdleCallback(idleHandle);
    } else {
      clearTimeout(idleHandle);
    }
  };
};

// Lazy load para páginas internas
const ClientLogin = lazy(() => import("@/pages/ClientLogin"));
const StaffLogin = lazy(() => import("@/pages/StaffLogin"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Clients = lazy(() => import("@/pages/Clients"));
const Users = lazy(() => import("@/pages/Users"));
const Team = lazy(() => import("@/pages/Team"));
const Planning = lazy(() => import("@/pages/Planning"));
const PlanningMonth = lazy(() => import("@/pages/PlanningMonth"));
const SocialMediaMonth = lazy(() => import("@/pages/SocialMediaMonth"));
const SocialMediaDashboard = lazy(() => import("@/pages/SocialMediaDashboard"));
const SocialMediaAssistant = lazy(() => import("@/pages/SocialMediaAssistant"));
const SocialMediaChecklist = lazy(() => import("@/pages/SocialMediaChecklist"));
const SocialMediaPlanning = lazy(() => import("@/pages/SocialMediaPlanning"));
const SocialMediaDirectory = lazy(() => import("@/pages/SocialMediaDirectory"));
const SocialMediaPortalLinks = lazy(() => import("@/pages/SocialMediaPortalLinks"));
const StaffProfile = lazy(() => import("@/pages/StaffProfile"));
const Production = lazy(() => import("@/pages/Production"));
const DesignerWorkspace = lazy(() => import("@/pages/DesignerWorkspace"));
const SDRWorkspace = lazy(() => import("@/pages/SDRWorkspace"));
const ClientPortal = lazy(() => import("@/pages/ClientPortal"));
const WeeklyPlanning = lazy(() => import("@/pages/WeeklyPlanning"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Profile = lazy(() => import("@/pages/Profile"));
const ConsultingDashboard = lazy(() => import("@/pages/ConsultingDashboard"));
const ClientConsulting = lazy(() => import("@/pages/ClientConsulting"));
const ConsultingMonth = lazy(() => import("@/pages/ConsultingMonth"));
const FrameworkExecution = lazy(() => import("@/pages/FrameworkExecution"));
const Management = lazy(() => import("@/pages/Management"));
const Playbook = lazy(() => import("@/pages/Playbook"));
const Packages = lazy(() => import("@/pages/Packages"));
const ServiceCatalog = lazy(() => import("@/pages/ServiceCatalog"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const TrafficAdmin = lazy(() => import("@/pages/TrafficAdmin"));
const CrmPortal = lazy(() => import("@/pages/CrmPortal"));
const CrmAdmin = lazy(() => import("@/pages/CrmAdmin"));
const InstagramAdmin = lazy(() => import("@/pages/InstagramAdmin"));
const Install = lazy(() => import("@/pages/Install"));
const LandingAdmin = lazy(() => import("@/pages/LandingAdmin"));
// Diagnostico removed
const Operation = lazy(() => import("@/pages/Operation"));
const Servicos = lazy(() => import("@/pages/Servicos"));
const ServicePage = lazy(() => import("@/pages/ServicePage"));
const Gastronomia = lazy(() => import("@/pages/Gastronomia"));
const IAHub = lazy(() => import("@/pages/IAHub"));
const Audiovisual = lazy(() => import("@/pages/Audiovisual"));
const LeaderDirectory = lazy(() => import("@/pages/LeaderDirectory"));

const NotFound = lazy(() => import("@/pages/NotFound"));
const QuotePage = lazy(() => import("@/pages/QuotePage"));
const NPSResponse = lazy(() => import("@/pages/NPSResponse"));
const SDRLeadCapture = lazy(() => import("@/pages/SDRLeadCapture"));
const QuizPage = lazy(() => import("@/components/landing/QuizDiagnostico"));
const AuthRoute = lazy(() => import("@/components/auth/AuthRoute"));
const StaffAuthRoute = lazy(() => import("@/components/auth/StaffAuthRoute"));
const ProtectedAppShell = lazy(() => import("@/components/auth/ProtectedAppShell"));
const PWAInstallBanner = lazy(() => import("@/components/PWAInstallBanner").then(module => ({ default: module.PWAInstallBanner })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // Aumentado para 1 hora
      gcTime: 1000 * 60 * 60 * 24,  // Aumentado para 24 horas
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // Evita disparos desnecessários ao voltar conexão instável
      retry: (failureCount, error: any) => {
        if (error?.status === 404 || error?.status === 401 || error?.status === 403) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      onError: (error: any) => {
        console.error("Global Mutation Error:", error);
        toast.error(error.message || "Ocorreu um erro ao processar sua solicitação.");
      }
    }
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  useEffect(() => {
    // Prefetch Dashboard e Management após o carregamento inicial (em idle)
    const clearDashboard = prefetchRoute(() => import("@/pages/Dashboard"));
    const clearManagement = prefetchRoute(() => import("@/pages/Management"));
    const clearPlanning = prefetchRoute(() => import("@/pages/Planning"));
    
    return () => {
      clearDashboard();
      clearManagement();
      clearPlanning();
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation} strict>
      <TooltipProvider>
        <AuthProvider>
          <StaffAuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={null}>
                <PWAInstallBanner />
              </Suspense>
              <TrackingScripts />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Auth routes */}
                  <Route element={<AuthRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/client-login" element={<Navigate to="/login" replace />} />
                  </Route>
                  <Route element={<StaffAuthRoute />}>
                    <Route path="/staff-login" element={<StaffLogin />} />
                  </Route>

                {/* Public routes */}
                <Route path="/portal/:token" element={<ClientPortal />} />
                <Route path="/crm/:token" element={<CrmPortal />} />
                <Route path="/install" element={<Install />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/gastronomia" element={<Gastronomia />} />
                <Route path="/diagnostico" element={<Navigate to="/captura-lead" replace />} />
                <Route path="/diagnostico-quiz" element={<Navigate to="/captura-lead" replace />} />
                <Route path="/servicos/:slug" element={<ServicePage />} />
                <Route path="/servico/:slug" element={<ServiceCatalog />} />
                <Route path="/pacote/:slug" element={<ServiceCatalog />} />
                <Route path="/servicos" element={<Servicos />} />
                <Route path="/orcamento/:code" element={<QuotePage />} />
                <Route path="/formulario/:token" element={<QuotePage />} />
                <Route path="/nps/:token" element={<NPSResponse />} />
                <Route path="/captura-lead" element={<SDRLeadCapture />} />

                {/* Protected routes */}
                <Route element={<ProtectedAppShell />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/team" element={<Navigate to="/management?tab=configuration" replace />} />
                  <Route path="/planning" element={<Planning />} />
                  <Route path="/planning/:monthId" element={<PlanningMonth />} />
                  <Route path="/planning/social/:clientId/:monthId" element={<SocialMediaMonth />} />
                  <Route path="/social-media" element={<SocialMediaDashboard />} />
                  <Route path="/social-media/:clientId/:monthId" element={<SocialMediaMonth />} />
                  <Route path="/social-media-assistant" element={<SocialMediaAssistant />} />
                  <Route path="/social-media-checklist" element={<SocialMediaChecklist />} />
                  <Route path="/social-media-planning" element={<SocialMediaPlanning />} />
                  <Route path="/social-media-directory" element={<SocialMediaDirectory />} />
                  <Route path="/social-media-portal" element={<SocialMediaPortalLinks />} />
                  <Route path="/planejamento-semanal" element={<WeeklyPlanning />} />
                  <Route path="/staff-profile" element={<StaffProfile />} />
                  <Route path="/production" element={<Production />} />
                  <Route path="/designer-workspace" element={<DesignerWorkspace />} />
                  <Route path="/sdr-workspace" element={<SDRWorkspace />} />
                  <Route path="/financial" element={<Navigate to="/management" replace />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/consulting" element={<ConsultingDashboard />} />
                  <Route path="/consulting/:clientId" element={<ClientConsulting />} />
                  <Route path="/consulting/:clientId/:monthId" element={<ConsultingMonth />} />
                  <Route path="/consulting/:clientId/:monthId/:instanceId" element={<FrameworkExecution />} />
                  <Route path="/management" element={<Management />} />
                  <Route path="/operation" element={<Operation />} />
                  <Route path="/playbook" element={<Playbook />} />
                  <Route path="/packages" element={<Packages />} />
                  <Route path="/service-catalog" element={<ServiceCatalog />} />
                  <Route path="/traffic" element={<TrafficAdmin />} />
                  <Route path="/instagram" element={<InstagramAdmin />} />
                  <Route path="/crm-admin" element={<CrmAdmin />} />
                  <Route path="/ia-hub" element={<IAHub />} />
                  <Route path="/audiovisual" element={<Audiovisual />} />
                  <Route path="/leader-directory" element={<LeaderDirectory />} />

                  <Route path="/ia-trafego" element={<Navigate to="/ia-hub" replace />} />
                  <Route path="/ia-design" element={<Navigate to="/ia-hub" replace />} />
                  <Route path="/ia-audiovisual" element={<Navigate to="/ia-hub" replace />} />
                  <Route path="/landing-admin" element={<Navigate to="/management?tab=site" replace />} />
                  <Route path="/leads" element={<Navigate to="/management?tab=site" replace />} />
                </Route>

                {/* Redirects */}
                <Route path="/" element={<Index />} />
                <Route path="/designers" element={<Navigate to="/team" replace />} />
                <Route path="/my-arts" element={<Navigate to="/production" replace />} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </StaffAuthProvider>
      </AuthProvider>
    </TooltipProvider>
    </LazyMotion>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
