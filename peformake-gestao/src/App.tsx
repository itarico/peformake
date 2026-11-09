import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireRole } from '@/auth/guards'
import { AppShell } from '@/components/layout/AppShell'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { CommercialRoutes } from '@/features/commercial/CommercialRoutes'
import { AV_ROLES, CONTENT_PLANNER_ROLES, CONTENT_ROLES, NOTIFICATION_ADMIN_ROLES, TRAFFIC_ROLES } from '@/lib/roles'
import { MovedTo } from '@/components/layout/MovedTo'
import { SiteGate } from '@/site/SiteGate'
import { ConfirmHost } from '@/components/ui/confirm'

// Cada tela baixa só quando é aberta (o site e o login ficam leves).
const ClientDetailPage = lazy(() => import('@/features/clients/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })))
const ClientFormPage = lazy(() => import('@/features/clients/ClientFormPage').then((m) => ({ default: m.ClientFormPage })))
const ClientsPage = lazy(() => import('@/features/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })))
const AvBoard = lazy(() => import('@/features/av/AvBoard').then((m) => ({ default: m.AvBoard })))
const AvProjectPage = lazy(() => import('@/features/av/AvProjectPage').then((m) => ({ default: m.AvProjectPage })))
const ContentBoard = lazy(() => import('@/features/content/ContentBoard').then((m) => ({ default: m.ContentBoard })))
const ContentCalendar = lazy(() => import('@/features/content/ContentCalendar').then((m) => ({ default: m.ContentCalendar })))
const ContentItemPage = lazy(() => import('@/features/content/ContentItemPage').then((m) => ({ default: m.ContentItemPage })))
const ContentLayout = lazy(() => import('@/features/content/ContentLayout').then((m) => ({ default: m.ContentLayout })))
const SeasonalPage = lazy(() => import('@/features/content/SeasonalPage').then((m) => ({ default: m.SeasonalPage })))
const ContentPlanPage = lazy(() => import('@/features/content/ContentPlanPage').then((m) => ({ default: m.ContentPlanPage })))
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const HomePage = lazy(() => import('@/features/dashboard/HomePage').then((m) => ({ default: m.HomePage })))
const PortalPage = lazy(() => import('@/features/portal/PortalPage').then((m) => ({ default: m.PortalPage })))
const AccountsPage = lazy(() => import('@/features/traffic/AccountsPage').then((m) => ({ default: m.AccountsPage })))
const AgentPage = lazy(() => import('@/features/traffic/AgentPage').then((m) => ({ default: m.AgentPage })))
const BalancePage = lazy(() => import('@/features/traffic/BalancePage').then((m) => ({ default: m.BalancePage })))
const CampaignsPage = lazy(() => import('@/features/traffic/CampaignsPage').then((m) => ({ default: m.CampaignsPage })))
const ReportsPage = lazy(() => import('@/features/traffic/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const StrategyPage = lazy(() => import('@/features/traffic/StrategyPage').then((m) => ({ default: m.StrategyPage })))
const TasksPage = lazy(() => import('@/features/traffic/TasksPage').then((m) => ({ default: m.TasksPage })))
const TrafficDashboard = lazy(() => import('@/features/traffic/TrafficDashboard').then((m) => ({ default: m.TrafficDashboard })))
const TrafficLayout = lazy(() => import('@/features/traffic/TrafficLayout').then((m) => ({ default: m.TrafficLayout })))
const TrafficSettingsPage = lazy(() => import('@/features/traffic/TrafficSettingsPage').then((m) => ({ default: m.TrafficSettingsPage })))
const AutoCreativePage = lazy(() => import('@/features/content/AutoCreativePage').then((m) => ({ default: m.AutoCreativePage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const TvPage = lazy(() => import('@/features/tv/TvPage').then((m) => ({ default: m.TvPage })))
const AccountPage = lazy(() => import('@/features/account/AccountPage').then((m) => ({ default: m.AccountPage })))
const AvQuotesPage = lazy(() => import('@/features/av/AvQuotesPage').then((m) => ({ default: m.AvQuotesPage })))
const AvQuoteEditor = lazy(() => import('@/features/av/AvQuoteEditor').then((m) => ({ default: m.AvQuoteEditor })))
const AvPhotosPage = lazy(() => import('@/features/av/AvPhotosPage').then((m) => ({ default: m.AvPhotosPage })))
const AvGalleryPage = lazy(() => import('@/features/av/AvPhotosPage').then((m) => ({ default: m.AvGalleryPage })))
const PublicGalleryPage = lazy(() => import('@/features/av/PublicGalleryPage').then((m) => ({ default: m.PublicGalleryPage })))
const PayPage = lazy(() => import('@/features/finance/PayPage').then((m) => ({ default: m.PayPage })))
const PublicQuotePage = lazy(() => import('@/features/av/PublicQuotePage').then((m) => ({ default: m.PublicQuotePage })))
const AvHome = lazy(() => import('@/features/av/AvHome').then((m) => ({ default: m.AvHome })))
const StaffCapturePage = lazy(() => import('@/features/av/StaffCapturePage').then((m) => ({ default: m.StaffCapturePage })))
const OperationPage = lazy(() => import('@/features/operation/OperationPage').then((m) => ({ default: m.OperationPage })))
const FinancePage = lazy(() => import('@/features/finance/FinancePage').then((m) => ({ default: m.FinancePage })))
const ContractsPage = lazy(() => import('@/features/finance/ContractsPage').then((m) => ({ default: m.ContractsPage })))
const BillingPage = lazy(() => import('@/features/finance/BillingPage').then((m) => ({ default: m.BillingPage })))
const NichePage = lazy(() => import('@/site/NichePage').then((m) => ({ default: m.NichePage })))
const StrategyLayout = lazy(() => import('@/features/strategy/StrategyLayout').then((m) => ({ default: m.StrategyLayout })))
const SettingsLayout = lazy(() => import('@/features/settings/SettingsLayout').then((m) => ({ default: m.SettingsLayout })))
const NetworksPage = lazy(() => import('@/features/social/NetworksPage').then((m) => ({ default: m.NetworksPage })))
const SocialAgent = lazy(() => import('@/features/social/SocialPage').then((m) => ({ default: m.Agent })))
const TeamPage = lazy(() => import('@/features/team/TeamPage').then((m) => ({ default: m.TeamPage })))
const NewPasswordPage = lazy(() => import('@/pages/NewPasswordPage').then((m) => ({ default: m.NewPasswordPage })))

export function App() {
  return (
    <>
    <ConfirmHost />
    <Suspense fallback={<CenteredMessage title="Carregando" role="status" />}>
    <Routes>
      <Route index element={<SiteGate />} />
      <Route path="/solucoes/:slug" element={<NichePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/nova-senha" element={<NewPasswordPage />} />
      <Route path="/portal" element={<PortalPage />} />
      <Route path="/orcamento/:token" element={<PublicQuotePage />} />
      <Route path="/pagar/:token" element={<PayPage />} />
      <Route path="/galeria/:token" element={<PublicGalleryPage />} />
      <Route path="/captacao/:token" element={<StaffCapturePage />} />
      <Route element={<RequireAuth />}>
        <Route path="tv" element={<TvPage />} />
        <Route element={<AppShell />}>
          <Route
            path="sem-modulo"
            element={<CenteredMessage title="Sua área ainda não está neste sistema" text="Fale com um administrador." />}
          />
          <Route element={<RequireRole roles={TRAFFIC_ROLES} />}>
            <Route path="trafego" element={<TrafficLayout />}>
              <Route index element={<Navigate to="painel" replace />} />
              <Route path="painel" element={<TrafficDashboard />} />
              <Route path="saldo" element={<BalancePage />} />
              <Route path="agente" element={<AgentPage />} />
              <Route path="campanhas" element={<CampaignsPage />} />
              <Route path="tarefas" element={<TasksPage />} />
              <Route path="contas" element={<AccountsPage />} />
              <Route path="estrategia" element={<StrategyPage />} />
              <Route path="relatorios" element={<ReportsPage />} />
              <Route path="configuracoes" element={<TrafficSettingsPage />} />
              <Route path="servicos" element={<MovedTo to="/configuracoes/servicos?area=trafego" />} />
            </Route>
          </Route>
          <Route element={<RequireRole roles={TRAFFIC_ROLES} />}>
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="clientes/novo" element={<ClientFormPage />} />
            <Route path="clientes/:id" element={<ClientDetailPage />} />
            <Route path="clientes/:id/editar" element={<ClientFormPage />} />
          </Route>
          <Route element={<RequireRole roles={CONTENT_ROLES} />}>
            <Route path="conteudo" element={<ContentLayout />}>
              <Route index element={<Navigate to="quadro" replace />} />
              <Route path="quadro" element={<ContentBoard />} />
              <Route path="calendario" element={<ContentCalendar />} />
              <Route path="planejamento" element={<ContentPlanPage />} />
              <Route path="datas" element={<SeasonalPage />} />
              <Route path="automatico" element={<AutoCreativePage />} />
              <Route path="servicos" element={<MovedTo to="/configuracoes/servicos?area=design" />} />
              <Route element={<RequireRole roles={CONTENT_PLANNER_ROLES} />}>
                <Route path="redes" element={<NetworksPage />} />
                <Route path="novidades" element={<SocialAgent />} />
              </Route>
            </Route>
            <Route path="conteudo/peca/:id" element={<ContentItemPage />} />
          </Route>
          <Route element={<RequireRole roles={AV_ROLES} />}>
            <Route path="audiovisual" element={<AvHome />} />
            <Route path="audiovisual/producao" element={<AvBoard />} />
            <Route path="audiovisual/projeto/:id" element={<AvProjectPage />} />
            <Route path="audiovisual/servicos" element={<MovedTo to="/configuracoes/audiovisual/servicos" />} />
            <Route path="audiovisual/orcamentos" element={<AvQuotesPage />} />
            <Route path="audiovisual/fotos" element={<AvPhotosPage />} />
            <Route path="audiovisual/fotos/:id" element={<AvGalleryPage />} />
            <Route path="audiovisual/roteiros" element={<MovedTo to="/audiovisual/producao" />} />
            <Route path="audiovisual/orcamentos/novo" element={<AvQuoteEditor />} />
            <Route path="audiovisual/orcamentos/:id" element={<AvQuoteEditor />} />
          </Route>
          <Route path="notificacoes" element={<NotificationsPage />} />
          <Route path="conta" element={<AccountPage />} />
          <Route element={<RequireRole roles={['admin', 'head_marketing']} />}>
            <Route path="operacao" element={<OperationPage />} />
          </Route>
          <Route element={<RequireRole roles={['admin', 'ellcazo']} />}>
            <Route path="financeiro" element={<FinancePage />} />
            <Route path="financeiro/cobranca" element={<BillingPage />} />
            <Route path="financeiro/contratos" element={<ContractsPage />} />
          </Route>
          <Route path="equipe/*" element={<TeamPage />} />
          <Route path="social" element={<MovedTo to="/conteudo/redes" />} />
          <Route path="social/painel" element={<MovedTo to="/conteudo/redes" />} />
          <Route path="social/quadro" element={<MovedTo to="/conteudo/redes" />} />
          <Route path="social/briefings" element={<MovedTo to="/conteudo/planejamento" />} />
          <Route path="social/agente" element={<MovedTo to="/conteudo/novidades" />} />
          <Route path="social/estrategia" element={<MovedTo to="/estrategia/social" />} />
          <Route path="social/contas" element={<MovedTo to="/conteudo/redes?ver=contas" />} />
          <Route element={<RequireRole roles={['admin', 'head_marketing', 'traffic_manager', 'social_media']} />}>
            <Route path="estrategia/*" element={<StrategyLayout />} />
          </Route>
          <Route path="metodologia" element={<MovedTo to="/estrategia/nichos" />} />
          <Route path="metodologia/nichos" element={<MovedTo to="/estrategia/nichos" />} />
          <Route path="metodologia/retencao" element={<MovedTo to="/estrategia/retencao" />} />
          <Route path="metodologia/estudos" element={<MovedTo to="/estrategia/estudos" />} />
          <Route path="inicio" element={<HomePage />} />
          {CommercialRoutes()}
          <Route element={<RequireRole roles={NOTIFICATION_ADMIN_ROLES} />}>
            <Route path="configuracoes/*" element={<SettingsLayout />} />
          </Route>
          <Route path="acessos" element={<MovedTo to="/equipe/membros" />} />
          <Route path="integracoes" element={<MovedTo to="/configuracoes/integracoes" />} />
          <Route path="*" element={<CenteredMessage title="Página não encontrada" />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
    </>
  )
}
