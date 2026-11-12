import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireRole } from '@/auth/guards'
import { useAuth } from '@/auth/context'
import { AppShell } from '@/components/layout/AppShell'
import { CenteredMessage } from '@/components/ui/CenteredMessage'
import { CommercialRoutes } from '@/features/commercial/CommercialRoutes'
import { WhatsAppRoutes } from '@/features/commercial/WhatsAppRoutes'
import { AV_ROLES, CONTENT_PLANNER_ROLES, CONTENT_ROLES, NOTIFICATION_ADMIN_ROLES, TRAFFIC_ROLES, hasAnyRole } from '@/lib/roles'
import { MovedTo } from '@/components/layout/MovedTo'
import { SiteGate } from '@/site/SiteGate'
import { ConfirmHost } from '@/components/ui/confirm'

// Cada tela baixa só quando é aberta (o site e o login ficam leves).
const ClientDetailPage = lazy(() => import('@/features/clients/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })))
const EllcazoClientSheet = lazy(() => import('@/features/clients/EllcazoClientSheet').then((m) => ({ default: m.EllcazoClientSheet })))
const ClientFormPage = lazy(() => import('@/features/clients/ClientFormPage').then((m) => ({ default: m.ClientFormPage })))
const ClientsPage = lazy(() => import('@/features/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })))
const AvBoard = lazy(() => import('@/features/av/AvBoard').then((m) => ({ default: m.AvBoard })))
const AvMonthlyPlanPage = lazy(() => import('@/features/av/AvMonthlyPlanPage').then((m) => ({ default: m.AvMonthlyPlanPage })))
const AvProjectPage = lazy(() => import('@/features/av/AvProjectPage').then((m) => ({ default: m.AvProjectPage })))
const ContentBoard = lazy(() => import('@/features/content/ContentBoard').then((m) => ({ default: m.ContentBoard })))
// Desligado até a integração com o Instagram (12/11): const ContentCalendar = lazy(() => import('@/features/content/ContentCalendar').then((m) => ({ default: m.ContentCalendar })))
const ContentItemPage = lazy(() => import('@/features/content/ContentItemPage').then((m) => ({ default: m.ContentItemPage })))
const ContentLayout = lazy(() => import('@/features/content/ContentLayout').then((m) => ({ default: m.ContentLayout })))
const ContentIndex = lazy(() => import('@/features/content/ContentLayout').then((m) => ({ default: m.ContentIndex })))
const DesignPage = lazy(() => import('@/features/content/DesignPage').then((m) => ({ default: m.DesignPage })))
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
const ClientChatPage = lazy(() => import('@/features/strategy/ClientChatPage').then((m) => ({ default: m.ClientChatPage })))
const PublicDeckPage = lazy(() => import('@/features/strategy/PublicDeckPage').then((m) => ({ default: m.PublicDeckPage })))
const DocPresentation = lazy(() => import('@/features/strategy/DocPresentation').then((m) => ({ default: m.DocPresentation })))
const DiagnosticReview = lazy(() => import('@/features/review/DiagnosticReview').then((m) => ({ default: m.DiagnosticReview })))
const MonthlyReview = lazy(() => import('@/features/review/MonthlyReview').then((m) => ({ default: m.MonthlyReview })))
const AreaReviewRedirect = lazy(() => import('@/features/review/AreaReviewRedirect').then((m) => ({ default: m.AreaReviewRedirect })))
const RecordingPage = lazy(() => import('@/features/av/RecordingPage').then((m) => ({ default: m.RecordingPage })))
const RecordingFromProject = lazy(() => import('@/features/av/RecordingPage').then((m) => ({ default: m.RecordingFromProject })))
const MonthlyPlanPage = lazy(() => import('@/features/strategy/MonthlyPlanPage').then((m) => ({ default: m.MonthlyPlanPage })))
const PayPage = lazy(() => import('@/features/finance/PayPage').then((m) => ({ default: m.PayPage })))
const PublicQuotePage = lazy(() => import('@/features/av/PublicQuotePage').then((m) => ({ default: m.PublicQuotePage })))
const AvHome = lazy(() => import('@/features/av/AvHome').then((m) => ({ default: m.AvHome })))
const StaffCapturePage = lazy(() => import('@/features/av/StaffCapturePage').then((m) => ({ default: m.StaffCapturePage })))
const OperationPage = lazy(() => import('@/features/operation/OperationPage').then((m) => ({ default: m.OperationPage })))
const FinancePage = lazy(() => import('@/features/finance/FinancePage').then((m) => ({ default: m.FinancePage })))
const FinanceHome = lazy(() => import('@/features/finance/FinanceSummary').then((m) => ({ default: m.FinanceHome })))
const ContractsPage = lazy(() => import('@/features/finance/ContractsPage').then((m) => ({ default: m.ContractsPage })))
const FinanceWhatsappPage = lazy(() => import('@/features/finance/whatsapp/FinanceWhatsappPage').then((m) => ({ default: m.FinanceWhatsappPage })))
const BillingPage = lazy(() => import('@/features/finance/BillingPage').then((m) => ({ default: m.BillingPage })))
const NichePage = lazy(() => import('@/site/NichePage').then((m) => ({ default: m.NichePage })))
const StrategyLayout = lazy(() => import('@/features/strategy/StrategyLayout').then((m) => ({ default: m.StrategyLayout })))
const SettingsLayout = lazy(() => import('@/features/settings/SettingsLayout').then((m) => ({ default: m.SettingsLayout })))
// Desligado até a integração com o Instagram (12/11): const NetworksPage = lazy(() => import('@/features/social/NetworksPage').then((m) => ({ default: m.NetworksPage })))
// Desligado (12/11; novidades do Instagram vão para a Bete): const SocialAgent = lazy(() => import('@/features/social/SocialPage').then((m) => ({ default: m.Agent })))
const TeamPage = lazy(() => import('@/features/team/TeamPage').then((m) => ({ default: m.TeamPage })))
const NewPasswordPage = lazy(() => import('@/pages/NewPasswordPage').then((m) => ({ default: m.NewPasswordPage })))

/** Quem tem tráfego/admin/head vê a ficha completa; quem é da Ellcazo, a resumida. */
function ClientDetailRoute() {
  const { state } = useAuth()
  const roles = state.status === 'ready' ? state.user.roles : []
  return hasAnyRole(roles, TRAFFIC_ROLES) ? <ClientDetailPage /> : <EllcazoClientSheet />
}

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
      <Route path="/apresentacao/mes/:token" element={<PublicDeckPage kind="mes" />} />
      <Route path="/apresentacao/audiovisual/:token" element={<PublicDeckPage kind="av" />} />
      <Route path="/apresentacao/:token" element={<PublicDeckPage />} />
      <Route path="/conversa/:token" element={<ClientChatPage />} />
      <Route path="/galeria/:token" element={<PublicGalleryPage />} />
      <Route path="/captacao/:token" element={<StaffCapturePage />} />
      <Route element={<RequireAuth />}>
        <Route path="tv" element={<TvPage />} />
        {/* Modo gravação (no set, tela cheia): os vídeos do plano do mês, um por tela. */}
        <Route element={<RequireRole roles={AV_ROLES} />}>
          <Route path="gravacao/projeto/:id" element={<RecordingFromProject />} />
          <Route path="gravacao/:clientId/:mes" element={<RecordingPage />} />
        </Route>
        {/* Guia de revisão das apresentações (aba nova, sem o menu): diagnóstico, plano do mês e as visões por área. */}
        <Route path="revisao/diagnostico/:clientId" element={<DiagnosticReview />} />
        {/* Apresentação dos documentos da Peformake (HTML do agente): aprovar página a página e virar tarefa. */}
        <Route path="documento/:assetId" element={<DocPresentation />} />
        <Route path="revisao/plano/:clientId/:mes" element={<MonthlyReview />} />
        <Route path="revisao/:area/:clientId/:mes" element={<AreaReviewRedirect />} />
        <Route path="revisao/trimestral/:clientId" element={<CenteredMessage title="Revisão do trimestral" text="Ainda não existe o plano trimestral. Quando existir, ele abre aqui na mesma guia." />} />
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
              <Route path="estrategia" element={<MovedTo to="/estrategia/trafego" />} />
              <Route path="relatorios" element={<ReportsPage />} />
              <Route path="configuracoes" element={<TrafficSettingsPage />} />
              <Route path="servicos" element={<MovedTo to="/comercial/servicos?area=trafego" />} />
            </Route>
          </Route>
          <Route element={<RequireRole roles={TRAFFIC_ROLES} />}>
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="clientes/novo" element={<ClientFormPage />} />
            <Route path="clientes/:id/editar" element={<ClientFormPage />} />
          </Route>
          {/* Ficha do cliente: quem é da Ellcazo (sem tráfego) vê a ficha resumida, só com o que é da Ellcazo. */}
          <Route element={<RequireRole roles={[...TRAFFIC_ROLES, 'ellcazo']} />}>
            <Route path="clientes/:id" element={<ClientDetailRoute />} />
          </Route>
          <Route element={<RequireRole roles={CONTENT_ROLES} />}>
            <Route path="conteudo" element={<ContentLayout />}>
              <Route index element={<ContentIndex />} />
              <Route path="quadro" element={<ContentBoard />} />
              <Route path="design" element={<DesignPage />} />
              <Route path="calendario" element={<MovedTo to="/conteudo/quadro" />} />
              <Route path="planejamento" element={<ContentPlanPage />} />
              <Route path="datas" element={<SeasonalPage />} />
              <Route path="automatico" element={<AutoCreativePage />} />
              <Route path="servicos" element={<MovedTo to="/comercial/servicos?area=design" />} />
              <Route element={<RequireRole roles={CONTENT_PLANNER_ROLES} />}>
                <Route path="redes" element={<MovedTo to="/conteudo/quadro" />} />
                <Route path="novidades" element={<MovedTo to="/conteudo/quadro" />} />
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
            <Route path="audiovisual/plano-do-mes" element={<AvMonthlyPlanPage />} />
            <Route path="audiovisual/orcamentos/novo" element={<AvQuoteEditor />} />
            <Route path="audiovisual/orcamentos/:id" element={<AvQuoteEditor />} />
          </Route>
          <Route path="notificacoes" element={<NotificationsPage />} />
          <Route path="conta" element={<AccountPage />} />
          <Route path="plano/:clientId/:month" element={<MonthlyPlanPage />} />
          <Route element={<RequireRole roles={['admin', 'head_marketing']} />}>
            <Route path="operacao" element={<OperationPage />} />
          </Route>
          <Route element={<RequireRole roles={['admin', 'ellcazo']} />}>
            <Route path="financeiro" element={<FinanceHome />} />
            <Route path="financeiro/caixa" element={<FinancePage />} />
            <Route path="financeiro/cobranca" element={<BillingPage />} />
          </Route>
          <Route element={<RequireRole roles={['admin']} redirectTo="/financeiro/caixa" />}>
            <Route path="financeiro/contratos" element={<ContractsPage />} />
          </Route>
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="financeiro/whatsapp" element={<FinanceWhatsappPage />} />
          </Route>
          <Route path="equipe/*" element={<TeamPage />} />
          <Route path="social" element={<MovedTo to="/conteudo/quadro" />} />
          <Route path="social/painel" element={<MovedTo to="/conteudo/quadro" />} />
          <Route path="social/quadro" element={<MovedTo to="/conteudo/quadro" />} />
          <Route path="social/briefings" element={<MovedTo to="/conteudo/planejamento" />} />
          <Route path="social/agente" element={<MovedTo to="/conteudo/quadro" />} />
          <Route path="social/estrategia" element={<MovedTo to="/estrategia/social" />} />
          <Route path="social/contas" element={<MovedTo to="/conteudo/quadro" />} />
          <Route element={<RequireRole roles={['admin', 'head_marketing', 'traffic_manager', 'social_media', 'designer']} />}>
            <Route path="estrategia/*" element={<StrategyLayout />} />
          </Route>
          <Route path="metodologia" element={<MovedTo to="/estrategia/biblioteca?secao=nichos" />} />
          <Route path="metodologia/nichos" element={<MovedTo to="/estrategia/biblioteca?secao=nichos" />} />
          <Route path="metodologia/retencao" element={<MovedTo to="/estrategia/biblioteca?secao=retencao" />} />
          <Route path="metodologia/estudos" element={<MovedTo to="/estrategia/biblioteca?secao=estudos" />} />
          <Route path="inicio" element={<HomePage />} />
          {CommercialRoutes()}
          {WhatsAppRoutes()}
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
