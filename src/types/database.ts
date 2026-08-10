// Tipos do Sistema Peformake

export type AppRole = 'admin' | 'social_media' | 'designer' | 'traffic' | 'sdr' | 'leader' | 'videomaker' | 'editor' | 'head_marketing' | 'closer' | 'traffic_manager' | 'gestor_trafego';

export type ArtType = 'post_instagram' | 'story' | 'carrossel' | 'anuncio' | 'feed';

export type ArtStatus = 
  | 'pending_briefing'
  | 'ready_for_production'
  | 'in_production'
  | 'awaiting_approval'
  | 'revision_requested'
  | 'approved';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Designer {
  id: string;
  user_id: string | null;
  staff_member_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  cost_per_art: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  designer_id: string | null;
  social_media_staff_id: string | null;
  admin_staff_id: string | null;
  head_marketing_id: string | null;
  traffic_manager_id: string | null;
  closer_id: string | null;
  editor_id: string | null;
  videomaker_id: string | null;
  arts_per_month: number;
  contract_months: number;
  price_per_art: number;
  portal_token: string;
  is_active: boolean;
  show_on_site: boolean;
  has_consulting_service: boolean;
  has_design_service: boolean;
  has_audiovisual_service: boolean;
  consulting_months_contracted: number;
  consulting_price_per_month: number;
  business_description: string | null;
  business_segment: string | null;
  target_audience: string | null;
  squad_id: string | null;
  created_at: string;
  updated_at: string;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  nps?: number | null;
  portal_password?: string | null;
  designer?: Designer;
}

export interface WorkMonth {
  id: string;
  client_id: string;
  year: number;
  month: number;
  is_planning_complete: boolean;
  created_at: string;
  updated_at: string;
  client?: Client;
  arts?: Art[];
}

export interface Art {
  id: string;
  work_month_id: string;
  art_number: number;
  art_type: ArtType | null;
  title: string | null;
  headline: string | null;
  subtitle: string | null;
  cta: string | null;
  description: string | null;
  caption: string | null;
  reference_image_url: string | null;
  reference_image_urls: string[] | null;
  reference_link: string | null;
  carousel_slides: any[] | null;
  observations: string | null;
  audio_observation_url?: string | null;
  asset_urls?: string[] | null;
  final_art_url: string | null;
  final_art_urls: string[];
  status: ArtStatus;
  is_extra: boolean;
  revision_comment: string | null;
  deadline_date: string | null;
  briefing_completed_at: string | null;
  created_at: string;
  updated_at: string;
  work_month?: WorkMonth;
  comments?: ArtComment[];
}

export interface ArtComment {
  id: string;
  art_id: string;
  user_id: string | null;
  client_portal: boolean;
  action: 'comment' | 'approve' | 'request_revision';
  comment: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string | null;
  client_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

// Traffic module types
export interface TrafficCampaign {
  id: string;
  client_id: string;
  year: number;
  month: number;
  platform: string;
  campaign_id_external: string | null;
  campaign_name: string | null;
  objective: string | null;
  status: string | null;
  investment: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue_generated: number;
  reach: number;
  frequency: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cost_per_conversion: number;
  roas: number;
  synced_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgencyExpense {
  id: string;
  year: number;
  month: number;
  category: string;
  description: string | null;
  amount: number;
  is_recurring: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientEvent {
  id: string;
  client_id: string;
  event_type: 'joined' | 'churned' | 'reactivated';
  event_date: string;
  notes: string | null;
  created_at: string;
}

export interface TeamProductionLog {
  id: string;
  staff_member_id: string;
  client_id: string;
  year: number;
  month: number;
  production_type: string;
  quantity: number;
  revenue_amount: number;
  notes: string | null;
  created_at: string;
}

export interface ClientTeamAssignment {
  id: string;
  client_id: string;
  staff_member_id: string;
  responsibility_percent: number;
  role_in_client: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole extends Profile {
  roles: AppRole[];
}

export const ART_TYPE_LABELS: Record<ArtType, string> = {
  post_instagram: 'Post Instagram',
  feed: 'Feed',
  story: 'Story',
  carrossel: 'Carrossel',
  anuncio: 'Anúncio',
};

export const ART_STATUS_LABELS: Record<ArtStatus, string> = {
  pending_briefing: 'Aguardando Briefing',
  ready_for_production: 'Pronto para Produção',
  in_production: 'Em Produção',
  awaiting_approval: 'Aguardando Aprovação',
  revision_requested: 'Alteração Solicitada',
  approved: 'Aprovada',
};

export const ART_STATUS_COLORS: Record<ArtStatus, string> = {
  pending_briefing: 'bg-muted text-muted-foreground',
  ready_for_production: 'bg-info/20 text-info',
  in_production: 'bg-warning/20 text-warning',
  awaiting_approval: 'bg-primary/20 text-primary',
  revision_requested: 'bg-destructive/20 text-destructive',
  approved: 'bg-success/20 text-success',
};

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
