import type { CommercialFunctions, CommercialTables } from '@/features/commercial/commercialDb.types'
import type { AgentFunctions, AgentTables } from '@/features/traffic/agentDb.types'
import type { ProductionFunctions, ProductionTables } from '@/features/production/productionDb.types'
import type { AppRole } from './roles'

// Escrito à mão até a migração ser aplicada. Depois, trocar pelos tipos gerados pelo Supabase.
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: never
        Update: { full_name?: string }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          segment: string | null
          client_type: string | null
          is_active: boolean
          is_lost: boolean
          source: string
          synced_at: string
          email: string | null
          phone: string | null
          document: string | null
          billing_email: string | null
          niche: string | null
          logo_path: string | null
          legacy_logo_url: string | null
          description: string | null
          target_audience: string | null
          competitors: string | null
          value_proposition: string | null
          acquisition_channel: string | null
          lost_reason: string | null
          lost_at: string | null
          legacy_created_at: string | null
          nps: number | null
          show_on_site: boolean
          squad_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      ad_accounts: {
        Row: {
          id: string
          name: string
          business_id: string | null
          business_name: string | null
          currency: string
          meta_status: string
          has_payment_method: boolean
          is_queryable: boolean
          mcp_enabled: boolean
          meta_connections: string[]
          last_seen_at: string
          client_id: string | null
          enabled: boolean
          read_source: string
          updated_at: string
          updated_by: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      services: {
        Row: { id: string; name: string; category: string | null; is_active: boolean; is_audiovisual: boolean }
        Insert: never
        Update: never
        Relationships: []
      }
      client_services: {
        Row: {
          id: string
          client_id: string
          service_id: string | null
          quantity: number | null
          is_active: boolean
          billing_month: string | null
          notes: string | null
          legacy_created_at: string | null
          package_id: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      client_contracts: {
        Row: {
          client_id: string
          contract_type: string | null
          contract_model: string | null
          start_date: string | null
          end_date: string | null
          months: number | null
          billing_day: number | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      client_service_prices: {
        Row: { client_service_id: string; price: number | null; discount_type: string | null; discount_value: number | null }
        Insert: never
        Update: never
        Relationships: []
      }
      traffic_settings: {
        Row: {
          id: boolean
          auto_read_enabled: boolean
          read_every_hours: number
          days_back: number
          balance_alert_cents: number
          daily_spend_alert_cents: number
          spike_multiplier: number
          notify_client: boolean
          notify_group: boolean
          group_jid: string | null
          last_auto_run_at: string | null
          weekly_report_enabled: boolean
          monthly_report_enabled: boolean
          scan_enabled: boolean
          send_reports_enabled: boolean
          last_scan_day: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      traffic_daily_metrics: {
        Row: {
          account_id: string
          day: string
          spend_cents: number
          impressions: number
          clicks: number
          leads: number
          purchases: number
          purchase_value_cents: number
          results: number | null
          result_type: string | null
          read_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      staff_members: {
        Row: {
          id: string
          full_name: string
          job_title: string | null
          main_role: string | null
          email: string | null
          avatar_path: string | null
          legacy_avatar_url: string | null
          is_active: boolean
          synced_at: string
          profile_id: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      client_team: {
        Row: { client_id: string; staff_id: string; role_in_client: string }
        Insert: never
        Update: never
        Relationships: []
      }
      staff_squads: {
        Row: { id: string; name: string; is_active: boolean }
        Insert: never
        Update: never
        Relationships: []
      }
      staff_squad_members: {
        Row: { squad_id: string; staff_id: string }
        Insert: never
        Update: never
        Relationships: []
      }
      client_billing: {
        Row: { client_id: string; setup_fee: number | null }
        Insert: never
        Update: never
        Relationships: []
      }
      service_default_prices: {
        Row: { service_id: string; price: number }
        Insert: never
        Update: never
        Relationships: []
      }
      service_packages: {
        Row: { id: string; name: string; is_active: boolean }
        Insert: never
        Update: never
        Relationships: []
      }
      service_package_items: {
        Row: { package_id: string; service_id: string; quantity: number; price: number | null }
        Insert: never
        Update: never
        Relationships: []
      }
      client_assessments: {
        Row: { id: string; client_id: string; level: string; observation: string | null; assessed_at: string; assessed_by: string | null }
        Insert: never
        Update: never
        Relationships: []
      }
      client_events: {
        Row: { id: string; client_id: string; event_type: string; event_date: string; notes: string | null; created_at: string; created_by: string | null }
        Insert: never
        Update: never
        Relationships: []
      }
      client_links: {
        Row: { id: string; client_id: string; name: string; url: string; created_at: string; created_by: string | null }
        Insert: never
        Update: never
        Relationships: []
      }
      client_portal_links: {
        Row: {
          id: string
          client_id: string
          created_by: string | null
          created_at: string
          revoked_at: string | null
          last_used_at: string | null
          visits: number
        }
        Insert: never
        Update: never
        Relationships: []
      }
      traffic_account_status: {
        Row: {
          account_id: string
          account_status: number | null
          disable_reason: number | null
          currency: string | null
          amount_spent_cents: number | null
          spend_cap_cents: number | null
          balance_due_cents: number | null
          is_prepaid: boolean | null
          available_cents: number | null
          funding_text: string | null
          read_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      traffic_alerts: {
        Row: {
          id: string
          account_id: string
          kind: string
          day: string
          value_cents: number | null
          threshold_cents: number | null
          message: string
          created_at: string
          resolved_at: string | null
          resolved_by: string | null
          client_notified_at: string | null
          group_notified_at: string | null
          notify_error: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      traffic_runs: {
        Row: {
          id: number
          trigger: string
          requested_by: string | null
          started_at: string
          finished_at: string | null
          ok: boolean | null
          accounts: number | null
          rows: number | null
          alerts: number | null
          error: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      traffic_tasks: {
        Row: {
          id: string
          client_id: string | null
          title: string
          description: string | null
          status: string
          priority: string
          category: string
          source: string
          due_date: string | null
          assignee_id: string | null
          position: number
          created_by: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
          completed_at: string | null
          proposed_action: unknown
          action_summary: string | null
          action_status: string | null
          action_result: string | null
          effect: unknown
          effect_checked_at: string | null
          undo_of: string | null
          approved_by: string | null
          approved_at: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      client_monthly_plans: {
        Row: {
          id: string
          client_id: string
          month: string
          meeting_date: string | null
          objectives: string | null
          priority_products: string | null
          services_to_promote: string | null
          planned_actions: string | null
          important_dates: string | null
          business_changes: string | null
          new_offers: string | null
          expectations: string | null
          budget: string | null
          constraints: string | null
          notes: string | null
          direction: string | null
          status: string
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      client_plan_steps: {
        Row: { id: string; plan_id: string; label: string; position: number; done_at: string | null; done_by: string | null }
        Insert: never
        Update: never
        Relationships: []
      }
      client_files: {
        Row: {
          id: string
          client_id: string
          plan_id: string | null
          kind: string
          name: string
          path: string
          size_bytes: number
          mime: string
          sensitive: boolean
          uploaded_by: string | null
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      traffic_entities: {
        Row: {
          id: string
          account_id: string
          level: string
          parent_id: string | null
          campaign_id: string | null
          name: string
          status: string | null
          effective_status: string | null
          objective: string | null
          daily_budget_cents: number | null
          lifetime_budget_cents: number | null
          thumbnail_url: string | null
          read_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      traffic_entity_daily: {
        Row: { entity_id: string; day: string; spend_cents: number; impressions: number; reach: number; clicks: number; results: number; leads: number; read_at: string }
        Insert: never
        Update: never
        Relationships: []
      }
      traffic_datasets: {
        Row: { id: string; account_id: string; name: string | null; last_fired_time: string | null; is_unavailable: boolean | null; read_at: string }
        Insert: never
        Update: never
        Relationships: []
      }
      traffic_reports: {
        Row: {
          id: string
          client_id: string
          kind: string
          period_start: string
          period_end: string
          path: string
          summary: string | null
          metrics: unknown
          created_at: string
          created_by: string | null
          sent_at: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      traffic_chat_messages: {
        Row: { id: string; user_id: string; role: string; content: string; tasks_created: number; created_at: string; status: string | null; reply_to: string | null }
        Insert: never
        Update: never
        Relationships: []
      }
      user_roles: {
        Row: { user_id: string; role: AppRole; created_at: string }
        Insert: never
        Update: never
        Relationships: []
      }
    } & CommercialTables & AgentTables & ProductionTables
    Views: Record<string, never>
    Functions: {
      traffic_save_settings: {
        Args: { _auto_read_enabled: boolean; _read_every_hours: number; _days_back: number; _balance_alert_cents: number }
        Returns: undefined
      }
      traffic_set_account: {
        Args: { _account_id: string; _client_id: string | null; _enabled: boolean; _expected_updated_at: string }
        Returns: undefined
      }
      client_save: { Args: { _client_id: string | null; _expected_updated_at: string | null; _data: Record<string, unknown> }; Returns: string }
      client_set_team: { Args: { _client_id: string; _squad_id: string | null; _team: { staff_id: string; role: string }[] }; Returns: undefined }
      client_add_services: { Args: { _client_id: string; _service_ids: string[]; _package_id: string | null }; Returns: number }
      client_update_service: {
        Args: {
          _client_service_id: string
          _quantity: number
          _is_active: boolean
          _notes: string | null
          _price: number | null
          _discount_type: string | null
          _discount_value: number | null
        }
        Returns: undefined
      }
      client_remove_service: { Args: { _client_service_id: string }; Returns: undefined }
      client_set_status: { Args: { _client_id: string; _lost: boolean; _reason: string | null }; Returns: undefined }
      client_add_assessment: { Args: { _client_id: string; _level: string; _observation: string | null }; Returns: undefined }
      client_add_link: { Args: { _client_id: string; _name: string; _url: string }; Returns: undefined }
      client_remove_link: { Args: { _link_id: string }; Returns: undefined }
      client_delete: { Args: { _client_id: string; _confirm_name: string }; Returns: undefined }
      traffic_request_action: { Args: { _entity_id: string; _type: string; _value: string }; Returns: string }
      traffic_save_report_settings: { Args: { _weekly: boolean; _monthly: boolean; _scan: boolean; _send: boolean }; Returns: undefined }
      traffic_chat_clear: { Args: Record<string, never>; Returns: undefined }
      traffic_resolve_alert: { Args: { _alert_id: string }; Returns: undefined }
      traffic_save_alert_settings: {
        Args: { _daily_spend_alert_cents: number; _spike_multiplier: number; _notify_client: boolean; _notify_group: boolean; _group_jid: string | null }
        Returns: undefined
      }
      task_save: { Args: { _task_id: string | null; _expected_updated_at: string | null; _data: Record<string, unknown> }; Returns: string }
      task_undo: { Args: { _task_id: string }; Returns: string }
      task_move: { Args: { _task_id: string; _status: string; _position: number | null }; Returns: undefined }
      task_delete: { Args: { _task_id: string }; Returns: undefined }
      plan_open: { Args: { _client_id: string; _month: string }; Returns: string }
      plan_save: { Args: { _plan_id: string; _expected_updated_at: string; _data: Record<string, unknown> }; Returns: undefined }
      plan_step_toggle: { Args: { _step_id: string; _done: boolean }; Returns: undefined }
      plan_step_add: { Args: { _plan_id: string; _label: string }; Returns: undefined }
      client_file_register: {
        Args: { _client_id: string; _plan_id: string | null; _kind: string; _name: string; _path: string; _size: number; _mime: string }
        Returns: string
      }
      client_file_delete: { Args: { _file_id: string }; Returns: string }
      portal_create_link: { Args: { _client_id: string }; Returns: string }
      portal_revoke_link: { Args: { _client_id: string }; Returns: undefined }
      portal_get: { Args: { _token: string }; Returns: unknown }
      portal_metrics: {
        Args: { _token: string; _from: string; _to: string }
        Returns: Database['public']['Tables']['traffic_daily_metrics']['Row'][]
      }
      admin_set_user_access: {
        Args: { _user_id: string; _is_active: boolean; _roles: AppRole[] }
        Returns: undefined
      }
    } & CommercialFunctions & AgentFunctions & ProductionFunctions
    Enums: { app_role: AppRole }
    CompositeTypes: Record<string, never>
  }
}
