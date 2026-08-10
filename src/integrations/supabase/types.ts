export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agency_expenses: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          entity: string | null
          id: string
          is_fixed: boolean | null
          is_recurring: boolean | null
          month: number
          payment_status: string | null
          updated_at: string
          year: number
        }
        Insert: {
          amount?: number
          category: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity?: string | null
          id?: string
          is_fixed?: boolean | null
          is_recurring?: boolean | null
          month: number
          payment_status?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity?: string | null
          id?: string
          is_fixed?: boolean | null
          is_recurring?: boolean | null
          month?: number
          payment_status?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_analyses: {
        Row: {
          analysis_scope: string
          analysis_type: string
          content: string
          generated_at: string
          id: string
          instance_id: string | null
          model_used: string | null
          prompt_version: string | null
        }
        Insert: {
          analysis_scope?: string
          analysis_type: string
          content: string
          generated_at?: string
          id?: string
          instance_id?: string | null
          model_used?: string | null
          prompt_version?: string | null
        }
        Update: {
          analysis_scope?: string
          analysis_type?: string
          content?: string
          generated_at?: string
          id?: string
          instance_id?: string | null
          model_used?: string | null
          prompt_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "framework_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          chat_type: string
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          chat_type?: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          chat_type?: string
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_daily_insights: {
        Row: {
          auto_generated: boolean | null
          category: string
          content: string
          created_at: string | null
          id: string
          insight_format: string | null
          is_pinned: boolean | null
          media_type: string | null
          media_url: string | null
          service_type: string
          source_url: string | null
          tags: string[] | null
          target_id: string | null
          target_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          auto_generated?: boolean | null
          category?: string
          content: string
          created_at?: string | null
          id?: string
          insight_format?: string | null
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          service_type?: string
          source_url?: string | null
          tags?: string[] | null
          target_id?: string | null
          target_type?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          auto_generated?: boolean | null
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          insight_format?: string | null
          is_pinned?: boolean | null
          media_type?: string | null
          media_url?: string | null
          service_type?: string
          source_url?: string | null
          tags?: string[] | null
          target_id?: string | null
          target_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      answer_templates: {
        Row: {
          answers: Json
          client_id: string
          created_at: string
          framework_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          client_id: string
          created_at?: string
          framework_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          client_id?: string
          created_at?: string
          framework_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_templates_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      art_comments: {
        Row: {
          action: string
          art_id: string
          client_portal: boolean
          comment: string | null
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          art_id: string
          client_portal?: boolean
          comment?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          art_id?: string
          client_portal?: boolean
          comment?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "art_comments_art_id_fkey"
            columns: ["art_id"]
            isOneToOne: false
            referencedRelation: "arts"
            referencedColumns: ["id"]
          },
        ]
      }
      art_status_history: {
        Row: {
          art_id: string
          created_at: string
          id: string
          staff_member_id: string | null
          status: string
        }
        Insert: {
          art_id: string
          created_at?: string
          id?: string
          staff_member_id?: string | null
          status: string
        }
        Update: {
          art_id?: string
          created_at?: string
          id?: string
          staff_member_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "art_status_history_art_id_fkey"
            columns: ["art_id"]
            isOneToOne: false
            referencedRelation: "arts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "art_status_history_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "art_status_history_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      arts: {
        Row: {
          art_number: number
          art_type: Database["public"]["Enums"]["art_type"] | null
          asset_urls: string[] | null
          audio_observation_url: string | null
          briefing_completed_at: string | null
          caption: string | null
          carousel_slides: Json | null
          completed_at: string | null
          created_at: string
          cta: string | null
          deadline_date: string | null
          deleted_at: string | null
          description: string | null
          designer_id: string | null
          final_art_url: string | null
          final_art_urls: string[] | null
          headline: string | null
          id: string
          is_extra: boolean
          observations: string | null
          reference_image_url: string | null
          reference_image_urls: string[] | null
          reference_link: string | null
          revision_comment: string | null
          status: Database["public"]["Enums"]["art_status"]
          subtitle: string | null
          title: string | null
          updated_at: string
          work_month_id: string
        }
        Insert: {
          art_number: number
          art_type?: Database["public"]["Enums"]["art_type"] | null
          asset_urls?: string[] | null
          audio_observation_url?: string | null
          briefing_completed_at?: string | null
          caption?: string | null
          carousel_slides?: Json | null
          completed_at?: string | null
          created_at?: string
          cta?: string | null
          deadline_date?: string | null
          deleted_at?: string | null
          description?: string | null
          designer_id?: string | null
          final_art_url?: string | null
          final_art_urls?: string[] | null
          headline?: string | null
          id?: string
          is_extra?: boolean
          observations?: string | null
          reference_image_url?: string | null
          reference_image_urls?: string[] | null
          reference_link?: string | null
          revision_comment?: string | null
          status?: Database["public"]["Enums"]["art_status"]
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          work_month_id: string
        }
        Update: {
          art_number?: number
          art_type?: Database["public"]["Enums"]["art_type"] | null
          asset_urls?: string[] | null
          audio_observation_url?: string | null
          briefing_completed_at?: string | null
          caption?: string | null
          carousel_slides?: Json | null
          completed_at?: string | null
          created_at?: string
          cta?: string | null
          deadline_date?: string | null
          deleted_at?: string | null
          description?: string | null
          designer_id?: string | null
          final_art_url?: string | null
          final_art_urls?: string[] | null
          headline?: string | null
          id?: string
          is_extra?: boolean
          observations?: string | null
          reference_image_url?: string | null
          reference_image_urls?: string[] | null
          reference_link?: string | null
          revision_comment?: string | null
          status?: Database["public"]["Enums"]["art_status"]
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          work_month_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arts_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arts_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "arts_work_month_id_fkey"
            columns: ["work_month_id"]
            isOneToOne: false
            referencedRelation: "work_months"
            referencedColumns: ["id"]
          },
        ]
      }
      audiovisual_comments: {
        Row: {
          author_name: string | null
          author_type: string
          created_at: string
          id: string
          message: string
          project_id: string
        }
        Insert: {
          author_name?: string | null
          author_type: string
          created_at?: string
          id?: string
          message: string
          project_id: string
        }
        Update: {
          author_name?: string | null
          author_type?: string
          created_at?: string
          id?: string
          message?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audiovisual_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "audiovisual_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audiovisual_projects: {
        Row: {
          briefing: string | null
          client_approved_at: string | null
          client_confirmed_at: string | null
          client_confirmed_by: string | null
          client_feedback: string | null
          client_id: string
          commission_value: number | null
          completed_at: string | null
          created_at: string
          created_by_id: string | null
          description: string | null
          due_date: string | null
          duration_seconds: number | null
          editing_completed_at: string | null
          editing_started_at: string | null
          editor_id: string | null
          finished_assets_url: string | null
          first_delivery_at: string | null
          format: string | null
          google_event_id: string | null
          google_event_link: string | null
          id: string
          internal_revision_count: number | null
          kind: Database["public"]["Enums"]["audiovisual_kind"]
          last_assets_update: string | null
          leader_revision_count: number | null
          location_address: string | null
          month: number | null
          photos_url: string | null
          published_at: string | null
          raw_video_added_at: string | null
          raw_video_url: string | null
          reference_links: string | null
          revisions: number | null
          script: string | null
          shoot_date: string | null
          shoot_end_time: string | null
          shoot_notes: string | null
          shoot_time: string | null
          status: Database["public"]["Enums"]["audiovisual_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
          version: number | null
          video_count: number | null
          video_url: string | null
          videographer_id: string | null
          webhook_token: string | null
          year: number | null
        }
        Insert: {
          briefing?: string | null
          client_approved_at?: string | null
          client_confirmed_at?: string | null
          client_confirmed_by?: string | null
          client_feedback?: string | null
          client_id: string
          commission_value?: number | null
          completed_at?: string | null
          created_at?: string
          created_by_id?: string | null
          description?: string | null
          due_date?: string | null
          duration_seconds?: number | null
          editing_completed_at?: string | null
          editing_started_at?: string | null
          editor_id?: string | null
          finished_assets_url?: string | null
          first_delivery_at?: string | null
          format?: string | null
          google_event_id?: string | null
          google_event_link?: string | null
          id?: string
          internal_revision_count?: number | null
          kind?: Database["public"]["Enums"]["audiovisual_kind"]
          last_assets_update?: string | null
          leader_revision_count?: number | null
          location_address?: string | null
          month?: number | null
          photos_url?: string | null
          published_at?: string | null
          raw_video_added_at?: string | null
          raw_video_url?: string | null
          reference_links?: string | null
          revisions?: number | null
          script?: string | null
          shoot_date?: string | null
          shoot_end_time?: string | null
          shoot_notes?: string | null
          shoot_time?: string | null
          status?: Database["public"]["Enums"]["audiovisual_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          version?: number | null
          video_count?: number | null
          video_url?: string | null
          videographer_id?: string | null
          webhook_token?: string | null
          year?: number | null
        }
        Update: {
          briefing?: string | null
          client_approved_at?: string | null
          client_confirmed_at?: string | null
          client_confirmed_by?: string | null
          client_feedback?: string | null
          client_id?: string
          commission_value?: number | null
          completed_at?: string | null
          created_at?: string
          created_by_id?: string | null
          description?: string | null
          due_date?: string | null
          duration_seconds?: number | null
          editing_completed_at?: string | null
          editing_started_at?: string | null
          editor_id?: string | null
          finished_assets_url?: string | null
          first_delivery_at?: string | null
          format?: string | null
          google_event_id?: string | null
          google_event_link?: string | null
          id?: string
          internal_revision_count?: number | null
          kind?: Database["public"]["Enums"]["audiovisual_kind"]
          last_assets_update?: string | null
          leader_revision_count?: number | null
          location_address?: string | null
          month?: number | null
          photos_url?: string | null
          published_at?: string | null
          raw_video_added_at?: string | null
          raw_video_url?: string | null
          reference_links?: string | null
          revisions?: number | null
          script?: string | null
          shoot_date?: string | null
          shoot_end_time?: string | null
          shoot_notes?: string | null
          shoot_time?: string | null
          status?: Database["public"]["Enums"]["audiovisual_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          version?: number | null
          video_count?: number | null
          video_url?: string | null
          videographer_id?: string | null
          webhook_token?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audiovisual_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiovisual_projects_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiovisual_projects_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "audiovisual_projects_videographer_id_fkey"
            columns: ["videographer_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audiovisual_projects_videographer_id_fkey"
            columns: ["videographer_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      automated_tasks: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          last_run_at: string | null
          status: string | null
          task_name: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          last_run_at?: string | null
          status?: string | null
          task_name: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          last_run_at?: string | null
          status?: string | null
          task_name?: string
        }
        Relationships: []
      }
      business_investments: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          expected_return: number | null
          id: string
          invested_at: string
          title: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          expected_return?: number | null
          id?: string
          invested_at: string
          title: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          expected_return?: number | null
          id?: string
          invested_at?: string
          title?: string
        }
        Relationships: []
      }
      client_data_collection: {
        Row: {
          cardapio_digital_url: string | null
          client_id: string
          cliente_autenticou: boolean
          collected_at: string | null
          collected_by: string | null
          concorrentes: Json | null
          created_at: string
          email: string | null
          facebook: string | null
          horarios_funcionamento: string | null
          id: string
          instagram: string | null
          localizacao: string | null
          notes: string | null
          updated_at: string
          whatsapp_business: string | null
        }
        Insert: {
          cardapio_digital_url?: string | null
          client_id: string
          cliente_autenticou?: boolean
          collected_at?: string | null
          collected_by?: string | null
          concorrentes?: Json | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          horarios_funcionamento?: string | null
          id?: string
          instagram?: string | null
          localizacao?: string | null
          notes?: string | null
          updated_at?: string
          whatsapp_business?: string | null
        }
        Update: {
          cardapio_digital_url?: string | null
          client_id?: string
          cliente_autenticou?: boolean
          collected_at?: string | null
          collected_by?: string | null
          concorrentes?: Json | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          horarios_funcionamento?: string | null
          id?: string
          instagram?: string | null
          localizacao?: string | null
          notes?: string | null
          updated_at?: string
          whatsapp_business?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_data_collection_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_data_collection_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_data_collection_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      client_events: {
        Row: {
          client_id: string
          created_at: string
          event_date: string
          event_type: string
          id: string
          notes: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          event_date?: string
          event_type: string
          id?: string
          notes?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_expenses: {
        Row: {
          amount: number
          category: string
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          month: number
          year: number
        }
        Insert: {
          amount?: number
          category?: string
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          month: number
          year: number
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          month?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files: {
        Row: {
          client_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_external_link: boolean
          notes: string | null
          updated_at: string
          uploaded_by_staff_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          is_external_link?: boolean
          notes?: string | null
          updated_at?: string
          uploaded_by_staff_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_external_link?: boolean
          notes?: string | null
          updated_at?: string
          uploaded_by_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_uploaded_by_staff_id_fkey"
            columns: ["uploaded_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_uploaded_by_staff_id_fkey"
            columns: ["uploaded_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      client_follow_ups: {
        Row: {
          client_id: string
          created_at: string
          due_date: string
          id: string
          notes: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_follow_ups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_journey_meetings: {
        Row: {
          agenda: Json | null
          attendees: Json | null
          client_id: string
          completed_at: string | null
          created_at: string
          diagnostics: Json | null
          id: string
          meeting_type: string
          next_steps: string | null
          outcomes: string | null
          recording_url: string | null
          responsible_staff_id: string | null
          scheduled_at: string
          seeds_planted: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agenda?: Json | null
          attendees?: Json | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          diagnostics?: Json | null
          id?: string
          meeting_type: string
          next_steps?: string | null
          outcomes?: string | null
          recording_url?: string | null
          responsible_staff_id?: string | null
          scheduled_at: string
          seeds_planted?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agenda?: Json | null
          attendees?: Json | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          diagnostics?: Json | null
          id?: string
          meeting_type?: string
          next_steps?: string | null
          outcomes?: string | null
          recording_url?: string | null
          responsible_staff_id?: string | null
          scheduled_at?: string
          seeds_planted?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_journey_meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_meetings_responsible_staff_id_fkey"
            columns: ["responsible_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_meetings_responsible_staff_id_fkey"
            columns: ["responsible_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      client_journey_stages: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          display_order: number
          id: string
          notes: string | null
          outcome_data: Json | null
          responsible_staff_id: string | null
          scheduled_at: string | null
          stage_key: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          notes?: string | null
          outcome_data?: Json | null
          responsible_staff_id?: string | null
          scheduled_at?: string | null
          stage_key: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          notes?: string | null
          outcome_data?: Json | null
          responsible_staff_id?: string | null
          scheduled_at?: string | null
          stage_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_journey_stages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_stages_responsible_staff_id_fkey"
            columns: ["responsible_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_stages_responsible_staff_id_fkey"
            columns: ["responsible_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      client_management_actions: {
        Row: {
          action_type: string
          client_id: string
          created_at: string
          id: string
          notes: string | null
          staff_id: string | null
        }
        Insert: {
          action_type: string
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          staff_id?: string | null
        }
        Update: {
          action_type?: string
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_management_actions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_products: {
        Row: {
          category: string | null
          client_id: string
          cost: number | null
          created_at: string | null
          description: string | null
          features: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          client_id: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          features?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          client_id?: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          features?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_referrals: {
        Row: {
          client_id: string
          created_at: string
          id: string
          notes: string | null
          referred_company: string | null
          referred_name: string | null
          referred_phone: string | null
          status: string
          survey_id: string | null
          updated_at: string
          would_recommend: boolean | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          referred_company?: string | null
          referred_name?: string | null
          referred_phone?: string | null
          status?: string
          survey_id?: string | null
          updated_at?: string
          would_recommend?: boolean | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          referred_company?: string | null
          referred_name?: string | null
          referred_phone?: string | null
          status?: string
          survey_id?: string | null
          updated_at?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_referrals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_referrals_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "client_satisfaction_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      client_satisfaction_surveys: {
        Row: {
          category: string | null
          client_id: string
          comment: string | null
          created_at: string
          id: string
          month: number | null
          period: string
          public_token: string
          responded_at: string | null
          score: number | null
          source: string
          updated_at: string
          week: number
          year: number
        }
        Insert: {
          category?: string | null
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          month?: number | null
          period?: string
          public_token?: string
          responded_at?: string | null
          score?: number | null
          source?: string
          updated_at?: string
          week: number
          year: number
        }
        Update: {
          category?: string | null
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          month?: number | null
          period?: string
          public_token?: string
          responded_at?: string | null
          score?: number | null
          source?: string
          updated_at?: string
          week?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_satisfaction_surveys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_production_configs: {
        Row: {
          client_id: string | null
          created_at: string | null
          id: string
          service_type: string
          target_minutes: number
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          service_type: string
          target_minutes?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          id?: string
          service_type?: string
          target_minutes?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_service_production_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          art_unit_label: string | null
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          package_id: string | null
          price: number
          quantity: number
          service_id: string
          updated_at: string
        }
        Insert: {
          art_unit_label?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          package_id?: string | null
          price?: number
          quantity?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          art_unit_label?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          package_id?: string | null
          price?: number
          quantity?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_squad_assignments: {
        Row: {
          client_id: string
          created_at: string
          id: string
          squad_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          squad_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_squad_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_squad_assignments_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "staff_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_strategic_data: {
        Row: {
          client_id: string
          created_at: string
          data_key: string
          data_value: string
          id: string
          source_framework: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          data_key: string
          data_value: string
          id?: string
          source_framework?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          data_key?: string
          data_value?: string
          id?: string
          source_framework?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_strategic_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_team_assignments: {
        Row: {
          client_id: string
          commission_percent: number
          created_at: string
          id: string
          responsibility_percent: number
          role_in_client: string
          staff_member_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          commission_percent?: number
          created_at?: string
          id?: string
          responsibility_percent?: number
          role_in_client: string
          staff_member_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          commission_percent?: number
          created_at?: string
          id?: string
          responsibility_percent?: number
          role_in_client?: string
          staff_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_team_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_team_assignments_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_team_assignments_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      clients: {
        Row: {
          acquisition_channel: string | null
          address: string | null
          admin_staff_id: string | null
          arts_per_month: number
          billing_day: number | null
          brief_summary: string | null
          business_description: string | null
          business_segment: string | null
          client_type: string | null
          closer_id: string | null
          consulting_months_contracted: number | null
          consulting_price_per_month: number | null
          contract_end_date: string | null
          contract_file_url: string | null
          contract_model: string | null
          contract_months: number
          contract_start_date: string | null
          contract_type: string
          created_at: string
          crm_activated_at: string | null
          crm_assignment_mode: string | null
          crm_portal_login: string | null
          crm_portal_password: string | null
          designer_id: string | null
          editor_id: string | null
          email: string | null
          has_audiovisual_service: boolean
          has_consulting_service: boolean
          has_crm_service: boolean
          has_design_service: boolean
          head_marketing_id: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          lost_at: string | null
          lost_reason: string | null
          main_competitors: string | null
          meta_ad_account_id: string | null
          meta_pixel_id: string | null
          name: string
          notification_email: string | null
          nps: number | null
          phone: string | null
          portal_password: string | null
          portal_token: string
          price_per_art: number
          setup_fee: number | null
          show_on_site: boolean | null
          social_media_staff_id: string | null
          squad_id: string | null
          strategy_notes: string | null
          target_audience: string | null
          traffic_manager_id: string | null
          updated_at: string
          value_proposition: string | null
          videomaker_id: string | null
        }
        Insert: {
          acquisition_channel?: string | null
          address?: string | null
          admin_staff_id?: string | null
          arts_per_month?: number
          billing_day?: number | null
          brief_summary?: string | null
          business_description?: string | null
          business_segment?: string | null
          client_type?: string | null
          closer_id?: string | null
          consulting_months_contracted?: number | null
          consulting_price_per_month?: number | null
          contract_end_date?: string | null
          contract_file_url?: string | null
          contract_model?: string | null
          contract_months?: number
          contract_start_date?: string | null
          contract_type?: string
          created_at?: string
          crm_activated_at?: string | null
          crm_assignment_mode?: string | null
          crm_portal_login?: string | null
          crm_portal_password?: string | null
          designer_id?: string | null
          editor_id?: string | null
          email?: string | null
          has_audiovisual_service?: boolean
          has_consulting_service?: boolean
          has_crm_service?: boolean
          has_design_service?: boolean
          head_marketing_id?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          main_competitors?: string | null
          meta_ad_account_id?: string | null
          meta_pixel_id?: string | null
          name: string
          notification_email?: string | null
          nps?: number | null
          phone?: string | null
          portal_password?: string | null
          portal_token?: string
          price_per_art?: number
          setup_fee?: number | null
          show_on_site?: boolean | null
          social_media_staff_id?: string | null
          squad_id?: string | null
          strategy_notes?: string | null
          target_audience?: string | null
          traffic_manager_id?: string | null
          updated_at?: string
          value_proposition?: string | null
          videomaker_id?: string | null
        }
        Update: {
          acquisition_channel?: string | null
          address?: string | null
          admin_staff_id?: string | null
          arts_per_month?: number
          billing_day?: number | null
          brief_summary?: string | null
          business_description?: string | null
          business_segment?: string | null
          client_type?: string | null
          closer_id?: string | null
          consulting_months_contracted?: number | null
          consulting_price_per_month?: number | null
          contract_end_date?: string | null
          contract_file_url?: string | null
          contract_model?: string | null
          contract_months?: number
          contract_start_date?: string | null
          contract_type?: string
          created_at?: string
          crm_activated_at?: string | null
          crm_assignment_mode?: string | null
          crm_portal_login?: string | null
          crm_portal_password?: string | null
          designer_id?: string | null
          editor_id?: string | null
          email?: string | null
          has_audiovisual_service?: boolean
          has_consulting_service?: boolean
          has_crm_service?: boolean
          has_design_service?: boolean
          head_marketing_id?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          main_competitors?: string | null
          meta_ad_account_id?: string | null
          meta_pixel_id?: string | null
          name?: string
          notification_email?: string | null
          nps?: number | null
          phone?: string | null
          portal_password?: string | null
          portal_token?: string
          price_per_art?: number
          setup_fee?: number | null
          show_on_site?: boolean | null
          social_media_staff_id?: string | null
          squad_id?: string | null
          strategy_notes?: string | null
          target_audience?: string | null
          traffic_manager_id?: string | null
          updated_at?: string
          value_proposition?: string | null
          videomaker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_admin_staff_id_fkey"
            columns: ["admin_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_admin_staff_id_fkey"
            columns: ["admin_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "clients_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "clients_designer_id_staff_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_designer_id_staff_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "clients_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "clients_head_marketing_id_fkey"
            columns: ["head_marketing_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_head_marketing_id_fkey"
            columns: ["head_marketing_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "clients_social_media_staff_id_fkey"
            columns: ["social_media_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_social_media_staff_id_fkey"
            columns: ["social_media_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "clients_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "staff_squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_traffic_manager_id_fkey"
            columns: ["traffic_manager_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_traffic_manager_id_fkey"
            columns: ["traffic_manager_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "clients_videomaker_id_fkey"
            columns: ["videomaker_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_videomaker_id_fkey"
            columns: ["videomaker_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      commission_checklists: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          criteria_key: string
          declared_at: string | null
          id: string
          month: number
          notes: string | null
          rejected_reason: string | null
          staff_member_id: string
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          criteria_key: string
          declared_at?: string | null
          id?: string
          month: number
          notes?: string | null
          rejected_reason?: string | null
          staff_member_id: string
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          criteria_key?: string
          declared_at?: string | null
          id?: string
          month?: number
          notes?: string | null
          rejected_reason?: string | null
          staff_member_id?: string
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "commission_checklists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_checklists_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_checklists_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          applies_to: string
          bonus_threshold: number | null
          bonus_value: number | null
          commission_type: string
          commission_value: number
          created_at: string
          id: string
          is_active: boolean
          min_arts_per_month: number | null
          notes: string | null
          rule_name: string
          staff_member_id: string | null
          updated_at: string
        }
        Insert: {
          applies_to?: string
          bonus_threshold?: number | null
          bonus_value?: number | null
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          min_arts_per_month?: number | null
          notes?: string | null
          rule_name?: string
          staff_member_id?: string | null
          updated_at?: string
        }
        Update: {
          applies_to?: string
          bonus_threshold?: number | null
          bonus_value?: number | null
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          min_arts_per_month?: number | null
          notes?: string | null
          rule_name?: string
          staff_member_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rules_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      consulting_months: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_complete: boolean
          month: number
          monthly_focus: string | null
          notes: string | null
          updated_at: string
          year: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_complete?: boolean
          month: number
          monthly_focus?: string | null
          notes?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_complete?: boolean
          month?: number
          monthly_focus?: string | null
          notes?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "consulting_months_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      content_analyses: {
        Row: {
          category: string
          consulting_month_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          category: string
          consulting_month_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          category?: string
          consulting_month_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_analyses_consulting_month_id_fkey"
            columns: ["consulting_month_id"]
            isOneToOne: false
            referencedRelation: "consulting_months"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_agent_configs: {
        Row: {
          activation_keywords: string | null
          activation_mode: string
          agent_name: string | null
          agent_type: string
          allow_ai_identification: boolean
          allow_discount: boolean
          allow_links: boolean
          allow_media: boolean
          authority_level: number | null
          auto_advance_to: string | null
          client_id: string
          created_at: string
          crisis_keywords: string | null
          curiosity_level: number | null
          custom_instructions: string | null
          escalate_on_crisis: boolean | null
          focus_products: string | null
          formality_level: number | null
          human_takeover_minutes: number
          id: string
          ideal_client_profile: string | null
          ideal_company_type: string | null
          insistence_level: number | null
          is_enabled: boolean
          max_attempts: number
          max_chars: number
          max_discount_percent: number | null
          max_score_unqualified: number | null
          min_budget: number | null
          min_confidence_sale: number | null
          min_score_qualified: number | null
          min_ticket: number | null
          pix_key: string | null
          pressure_level: number | null
          reactivation_days: number | null
          reactivation_minutes: number
          reactivation_strategy: string | null
          required_problem: string | null
          response_structure: string | null
          sales_intensity: string
          sales_model: string | null
          send_product_images: boolean | null
          success_criteria: string | null
          target_region: string | null
          tone: string
          updated_at: string
          use_anchoring: boolean | null
          use_emojis: boolean
          use_urgency: boolean | null
          useful_links: string | null
        }
        Insert: {
          activation_keywords?: string | null
          activation_mode?: string
          agent_name?: string | null
          agent_type: string
          allow_ai_identification?: boolean
          allow_discount?: boolean
          allow_links?: boolean
          allow_media?: boolean
          authority_level?: number | null
          auto_advance_to?: string | null
          client_id: string
          created_at?: string
          crisis_keywords?: string | null
          curiosity_level?: number | null
          custom_instructions?: string | null
          escalate_on_crisis?: boolean | null
          focus_products?: string | null
          formality_level?: number | null
          human_takeover_minutes?: number
          id?: string
          ideal_client_profile?: string | null
          ideal_company_type?: string | null
          insistence_level?: number | null
          is_enabled?: boolean
          max_attempts?: number
          max_chars?: number
          max_discount_percent?: number | null
          max_score_unqualified?: number | null
          min_budget?: number | null
          min_confidence_sale?: number | null
          min_score_qualified?: number | null
          min_ticket?: number | null
          pix_key?: string | null
          pressure_level?: number | null
          reactivation_days?: number | null
          reactivation_minutes?: number
          reactivation_strategy?: string | null
          required_problem?: string | null
          response_structure?: string | null
          sales_intensity?: string
          sales_model?: string | null
          send_product_images?: boolean | null
          success_criteria?: string | null
          target_region?: string | null
          tone?: string
          updated_at?: string
          use_anchoring?: boolean | null
          use_emojis?: boolean
          use_urgency?: boolean | null
          useful_links?: string | null
        }
        Update: {
          activation_keywords?: string | null
          activation_mode?: string
          agent_name?: string | null
          agent_type?: string
          allow_ai_identification?: boolean
          allow_discount?: boolean
          allow_links?: boolean
          allow_media?: boolean
          authority_level?: number | null
          auto_advance_to?: string | null
          client_id?: string
          created_at?: string
          crisis_keywords?: string | null
          curiosity_level?: number | null
          custom_instructions?: string | null
          escalate_on_crisis?: boolean | null
          focus_products?: string | null
          formality_level?: number | null
          human_takeover_minutes?: number
          id?: string
          ideal_client_profile?: string | null
          ideal_company_type?: string | null
          insistence_level?: number | null
          is_enabled?: boolean
          max_attempts?: number
          max_chars?: number
          max_discount_percent?: number | null
          max_score_unqualified?: number | null
          min_budget?: number | null
          min_confidence_sale?: number | null
          min_score_qualified?: number | null
          min_ticket?: number | null
          pix_key?: string | null
          pressure_level?: number | null
          reactivation_days?: number | null
          reactivation_minutes?: number
          reactivation_strategy?: string | null
          required_problem?: string | null
          response_structure?: string | null
          sales_intensity?: string
          sales_model?: string | null
          send_product_images?: boolean | null
          success_criteria?: string | null
          target_region?: string | null
          tone?: string
          updated_at?: string
          use_anchoring?: boolean | null
          use_emojis?: boolean
          use_urgency?: boolean | null
          useful_links?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_agent_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_agent_files: {
        Row: {
          agent_type: string
          client_id: string
          created_at: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          parsed_content: string | null
        }
        Insert: {
          agent_type: string
          client_id: string
          created_at?: string
          file_name: string
          file_type: string
          file_url: string
          id?: string
          parsed_content?: string | null
        }
        Update: {
          agent_type?: string
          client_id?: string
          created_at?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          parsed_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_agent_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_agent_knowledge: {
        Row: {
          agent_type: string
          answer: string
          category: string | null
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          question: string
          updated_at: string
        }
        Insert: {
          agent_type?: string
          answer: string
          category?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          agent_type?: string
          answer?: string
          category?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_agent_knowledge_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_agent_questions: {
        Row: {
          agent_type: string
          client_id: string
          condition_field: string | null
          condition_value: string | null
          created_at: string
          id: string
          is_conditional: boolean
          is_required: boolean
          question_order: number
          question_text: string
          score_weight: number | null
          updated_at: string
        }
        Insert: {
          agent_type: string
          client_id: string
          condition_field?: string | null
          condition_value?: string | null
          created_at?: string
          id?: string
          is_conditional?: boolean
          is_required?: boolean
          question_order?: number
          question_text: string
          score_weight?: number | null
          updated_at?: string
        }
        Update: {
          agent_type?: string
          client_id?: string
          condition_field?: string | null
          condition_value?: string | null
          created_at?: string
          id?: string
          is_conditional?: boolean
          is_required?: boolean
          question_order?: number
          question_text?: string
          score_weight?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_agent_questions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_auto_notification_logs: {
        Row: {
          client_id: string
          error_message: string | null
          id: string
          lead_id: string
          notification_id: string
          sent_at: string
          status: string
          wasender_response: Json | null
        }
        Insert: {
          client_id: string
          error_message?: string | null
          id?: string
          lead_id: string
          notification_id: string
          sent_at?: string
          status?: string
          wasender_response?: Json | null
        }
        Update: {
          client_id?: string
          error_message?: string | null
          id?: string
          lead_id?: string
          notification_id?: string
          sent_at?: string
          status?: string
          wasender_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_auto_notification_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_auto_notification_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_auto_notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "crm_auto_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_auto_notifications: {
        Row: {
          client_id: string
          created_at: string
          delay_minutes: number
          id: string
          is_active: boolean
          max_sends_per_lead: number | null
          media_type: string | null
          media_url: string | null
          message_template: string
          name: string
          notification_type: string
          send_window_end: string | null
          send_window_start: string | null
          trigger_event: string
          trigger_status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          delay_minutes?: number
          id?: string
          is_active?: boolean
          max_sends_per_lead?: number | null
          media_type?: string | null
          media_url?: string | null
          message_template: string
          name: string
          notification_type?: string
          send_window_end?: string | null
          send_window_start?: string | null
          trigger_event: string
          trigger_status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          delay_minutes?: number
          id?: string
          is_active?: boolean
          max_sends_per_lead?: number | null
          media_type?: string | null
          media_url?: string | null
          message_template?: string
          name?: string
          notification_type?: string
          send_window_end?: string | null
          send_window_start?: string | null
          trigger_event?: string
          trigger_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_auto_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_bot_configs: {
        Row: {
          auto_respond_on_new: boolean
          bot_rules: Json | null
          business_hours_end: string | null
          business_hours_only: boolean
          business_hours_start: string | null
          client_id: string
          created_at: string
          human_takeover_minutes: number | null
          id: string
          instructions: string | null
          is_enabled: boolean
          persona: string
          updated_at: string
        }
        Insert: {
          auto_respond_on_new?: boolean
          bot_rules?: Json | null
          business_hours_end?: string | null
          business_hours_only?: boolean
          business_hours_start?: string | null
          client_id: string
          created_at?: string
          human_takeover_minutes?: number | null
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          persona?: string
          updated_at?: string
        }
        Update: {
          auto_respond_on_new?: boolean
          bot_rules?: Json | null
          business_hours_end?: string | null
          business_hours_only?: boolean
          business_hours_start?: string | null
          client_id?: string
          created_at?: string
          human_takeover_minutes?: number | null
          id?: string
          instructions?: string | null
          is_enabled?: boolean
          persona?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_bot_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaigns: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          failed_count: number | null
          filter_criteria: Json | null
          id: string
          media_type: string | null
          media_url: string | null
          message: string
          name: string
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          total_count: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          failed_count?: number | null
          filter_criteria?: Json | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message: string
          name: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          total_count?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          failed_count?: number | null
          filter_criteria?: Json | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          total_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_conversion_events: {
        Row: {
          client_id: string
          created_at: string
          custom_event: string
          event_name: string
          id: string
          lead_id: string
          meta_response: Json | null
          sale_value: number | null
          status: string
          success: boolean
        }
        Insert: {
          client_id: string
          created_at?: string
          custom_event: string
          event_name: string
          id?: string
          lead_id: string
          meta_response?: Json | null
          sale_value?: number | null
          status: string
          success?: boolean
        }
        Update: {
          client_id?: string
          created_at?: string
          custom_event?: string
          event_name?: string
          id?: string
          lead_id?: string
          meta_response?: Json | null
          sale_value?: number | null
          status?: string
          success?: boolean
        }
        Relationships: []
      }
      crm_decision_logs: {
        Row: {
          agent_type: string
          client_id: string
          confidence_at_decision: number | null
          created_at: string
          decision_type: string
          from_stage: string | null
          id: string
          lead_id: string
          metadata: Json | null
          reason: string
          score_at_decision: number | null
          to_stage: string | null
        }
        Insert: {
          agent_type: string
          client_id: string
          confidence_at_decision?: number | null
          created_at?: string
          decision_type: string
          from_stage?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          reason: string
          score_at_decision?: number | null
          to_stage?: string | null
        }
        Update: {
          agent_type?: string
          client_id?: string
          confidence_at_decision?: number | null
          created_at?: string
          decision_type?: string
          from_stage?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          reason?: string
          score_at_decision?: number | null
          to_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_decision_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_flow_nodes: {
        Row: {
          config: Json
          created_at: string | null
          flow_id: string
          id: string
          next_node_id: string | null
          node_order: number
          node_type: string
          position_x: number | null
          position_y: number | null
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          flow_id: string
          id?: string
          next_node_id?: string | null
          node_order?: number
          node_type?: string
          position_x?: number | null
          position_y?: number | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          flow_id?: string
          id?: string
          next_node_id?: string | null
          node_order?: number
          node_type?: string
          position_x?: number | null
          position_y?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_flow_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "crm_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_flow_nodes_next_node_id_fkey"
            columns: ["next_node_id"]
            isOneToOne: false
            referencedRelation: "crm_flow_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_flow_sessions: {
        Row: {
          client_id: string
          completed_at: string | null
          current_node_id: string | null
          flow_id: string
          id: string
          lead_id: string
          started_at: string | null
          status: string
          variables: Json | null
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          current_node_id?: string | null
          flow_id: string
          id?: string
          lead_id: string
          started_at?: string | null
          status?: string
          variables?: Json | null
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          current_node_id?: string | null
          flow_id?: string
          id?: string
          lead_id?: string
          started_at?: string | null
          status?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_flow_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_flow_sessions_current_node_id_fkey"
            columns: ["current_node_id"]
            isOneToOne: false
            referencedRelation: "crm_flow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_flow_sessions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "crm_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_flow_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_flow_webhooks: {
        Row: {
          client_id: string
          created_at: string | null
          headers: Json | null
          id: string
          is_active: boolean | null
          name: string
          payload_template: Json | null
          updated_at: string | null
          url: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          payload_template?: Json | null
          updated_at?: string | null
          url: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          payload_template?: Json | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_flow_webhooks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_flows: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_type: string
          trigger_value: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_flows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_intelligence_events: {
        Row: {
          agent_type: string | null
          client_id: string
          confidence: number | null
          created_at: string
          event_type: string
          from_stage: string | null
          id: string
          intent: string | null
          is_reversed: boolean
          lead_id: string
          message_id: string | null
          metadata: Json | null
          product_name: string | null
          sale_value: number | null
          to_stage: string | null
          trigger_text: string | null
        }
        Insert: {
          agent_type?: string | null
          client_id: string
          confidence?: number | null
          created_at?: string
          event_type: string
          from_stage?: string | null
          id?: string
          intent?: string | null
          is_reversed?: boolean
          lead_id: string
          message_id?: string | null
          metadata?: Json | null
          product_name?: string | null
          sale_value?: number | null
          to_stage?: string | null
          trigger_text?: string | null
        }
        Update: {
          agent_type?: string | null
          client_id?: string
          confidence?: number | null
          created_at?: string
          event_type?: string
          from_stage?: string | null
          id?: string
          intent?: string | null
          is_reversed?: boolean
          lead_id?: string
          message_id?: string | null
          metadata?: Json | null
          product_name?: string | null
          sale_value?: number | null
          to_stage?: string | null
          trigger_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_intelligence_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_intelligence_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "crm_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_activities: {
        Row: {
          activity_type: string
          client_id: string
          created_at: string
          description: string
          id: string
          lead_id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          client_id: string
          created_at?: string
          description: string
          id?: string
          lead_id: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_scores: {
        Row: {
          attempt_count: number
          client_id: string
          created_at: string
          id: string
          interest_score: number
          last_objection: string | null
          last_price_mentioned: number | null
          last_product_mentioned: string | null
          last_stage: string | null
          lead_id: string
          qualification_score: number
          risk_score: number
          updated_at: string
          urgency_score: number
        }
        Insert: {
          attempt_count?: number
          client_id: string
          created_at?: string
          id?: string
          interest_score?: number
          last_objection?: string | null
          last_price_mentioned?: number | null
          last_product_mentioned?: string | null
          last_stage?: string | null
          lead_id: string
          qualification_score?: number
          risk_score?: number
          updated_at?: string
          urgency_score?: number
        }
        Update: {
          attempt_count?: number
          client_id?: string
          created_at?: string
          id?: string
          interest_score?: number
          last_objection?: string | null
          last_price_mentioned?: number | null
          last_product_mentioned?: string | null
          last_stage?: string | null
          lead_id?: string
          qualification_score?: number
          risk_score?: number
          updated_at?: string
          urgency_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_summaries: {
        Row: {
          analyzed_at: string
          client_id: string
          detected_sale_value: number | null
          detected_stage: string | null
          id: string
          lead_id: string
          summary: string
        }
        Insert: {
          analyzed_at?: string
          client_id: string
          detected_sale_value?: number | null
          detected_stage?: string | null
          id?: string
          lead_id: string
          summary: string
        }
        Update: {
          analyzed_at?: string
          client_id?: string
          detected_sale_value?: number | null
          detected_stage?: string | null
          id?: string
          lead_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_summaries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_tags: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_member_id: string | null
          birthday: string | null
          bot_paused: boolean
          city: string | null
          client_id: string
          company: string | null
          context_summary: string | null
          created_at: string
          email: string | null
          full_name: string | null
          human_active_until: string | null
          id: string
          interested_products: string[] | null
          last_message_at: string | null
          meeting_date: string | null
          meeting_status: string | null
          name: string | null
          notes: string | null
          phone: string
          recovery_attempts: number
          referred_by_member_id: string | null
          sale_date: string | null
          sale_value: number | null
          source: string | null
          status: string
          tags: string[] | null
          updated_at: string
          whatsapp_lid: string | null
        }
        Insert: {
          assigned_member_id?: string | null
          birthday?: string | null
          bot_paused?: boolean
          city?: string | null
          client_id: string
          company?: string | null
          context_summary?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          human_active_until?: string | null
          id?: string
          interested_products?: string[] | null
          last_message_at?: string | null
          meeting_date?: string | null
          meeting_status?: string | null
          name?: string | null
          notes?: string | null
          phone: string
          recovery_attempts?: number
          referred_by_member_id?: string | null
          sale_date?: string | null
          sale_value?: number | null
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          whatsapp_lid?: string | null
        }
        Update: {
          assigned_member_id?: string | null
          birthday?: string | null
          bot_paused?: boolean
          city?: string | null
          client_id?: string
          company?: string | null
          context_summary?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          human_active_until?: string | null
          id?: string
          interested_products?: string[] | null
          last_message_at?: string | null
          meeting_date?: string | null
          meeting_status?: string | null
          name?: string | null
          notes?: string | null
          phone?: string
          recovery_attempts?: number
          referred_by_member_id?: string | null
          sale_date?: string | null
          sale_value?: number | null
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          whatsapp_lid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "crm_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_referred_by_member_id_fkey"
            columns: ["referred_by_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_referred_by_member_id_fkey"
            columns: ["referred_by_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      crm_message_classifications: {
        Row: {
          classifications: string[] | null
          confidence: number | null
          created_at: string
          id: string
          lead_id: string
          message_id: string
          primary_intent: string | null
          sentiment: string | null
          urgency: string | null
        }
        Insert: {
          classifications?: string[] | null
          confidence?: number | null
          created_at?: string
          id?: string
          lead_id: string
          message_id: string
          primary_intent?: string | null
          sentiment?: string | null
          urgency?: string | null
        }
        Update: {
          classifications?: string[] | null
          confidence?: number | null
          created_at?: string
          id?: string
          lead_id?: string
          message_id?: string
          primary_intent?: string | null
          sentiment?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_message_classifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_message_classifications_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "crm_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_messages: {
        Row: {
          client_id: string
          content: string | null
          created_at: string
          direction: string
          frontend_message_id: string | null
          id: string
          lead_id: string
          media_url: string | null
          message_type: string
          status: string
          wasender_message_id: string | null
        }
        Insert: {
          client_id: string
          content?: string | null
          created_at?: string
          direction?: string
          frontend_message_id?: string | null
          id?: string
          lead_id: string
          media_url?: string | null
          message_type?: string
          status?: string
          wasender_message_id?: string | null
        }
        Update: {
          client_id?: string
          content?: string | null
          created_at?: string
          direction?: string
          frontend_message_id?: string | null
          id?: string
          lead_id?: string
          media_url?: string | null
          message_type?: string
          status?: string
          wasender_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_quick_replies: {
        Row: {
          category: string | null
          client_id: string
          content: string
          created_at: string | null
          id: string
          media_type: string | null
          media_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          client_id: string
          content: string
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          client_id?: string
          content?: string
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_quick_replies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_quote_configs: {
        Row: {
          accent_color: string | null
          brand_color: string | null
          brand_name: string
          client_id: string
          cover_image_url: string | null
          created_at: string
          cta_text: string | null
          custom_css: string | null
          enable_lead_form: boolean
          footer_text: string | null
          id: string
          logo_url: string | null
          niche_icon: string | null
          page_type: string
          pdf_footer_text: string | null
          pdf_header_text: string | null
          persuasion_texts: Json | null
          reward_text: string | null
          show_catalog_images: boolean | null
          social_proof_text: string | null
          tagline: string | null
          updated_at: string
          valid_days: number | null
          whatsapp_auto_send: boolean | null
          whatsapp_redirect_number: string | null
        }
        Insert: {
          accent_color?: string | null
          brand_color?: string | null
          brand_name?: string
          client_id: string
          cover_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          custom_css?: string | null
          enable_lead_form?: boolean
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          niche_icon?: string | null
          page_type?: string
          pdf_footer_text?: string | null
          pdf_header_text?: string | null
          persuasion_texts?: Json | null
          reward_text?: string | null
          show_catalog_images?: boolean | null
          social_proof_text?: string | null
          tagline?: string | null
          updated_at?: string
          valid_days?: number | null
          whatsapp_auto_send?: boolean | null
          whatsapp_redirect_number?: string | null
        }
        Update: {
          accent_color?: string | null
          brand_color?: string | null
          brand_name?: string
          client_id?: string
          cover_image_url?: string | null
          created_at?: string
          cta_text?: string | null
          custom_css?: string | null
          enable_lead_form?: boolean
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          niche_icon?: string | null
          page_type?: string
          pdf_footer_text?: string | null
          pdf_header_text?: string | null
          persuasion_texts?: Json | null
          reward_text?: string | null
          show_catalog_images?: boolean | null
          social_proof_text?: string | null
          tagline?: string | null
          updated_at?: string
          valid_days?: number | null
          whatsapp_auto_send?: boolean | null
          whatsapp_redirect_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_quote_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_quotes: {
        Row: {
          accepted_at: string | null
          client_id: string | null
          code: string
          created_at: string
          discount_percent: number | null
          discount_value: number | null
          final_value: number
          id: string
          items: Json
          lead_email: string | null
          lead_id: string | null
          lead_name: string
          lead_phone: string | null
          lead_segment: string | null
          notes: string | null
          page_type: string
          status: string
          title: string
          total_value: number
          updated_at: string
          valid_until: string
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          client_id?: string | null
          code: string
          created_at?: string
          discount_percent?: number | null
          discount_value?: number | null
          final_value?: number
          id?: string
          items?: Json
          lead_email?: string | null
          lead_id?: string | null
          lead_name: string
          lead_phone?: string | null
          lead_segment?: string | null
          notes?: string | null
          page_type?: string
          status?: string
          title?: string
          total_value?: number
          updated_at?: string
          valid_until?: string
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          client_id?: string | null
          code?: string
          created_at?: string
          discount_percent?: number | null
          discount_value?: number | null
          final_value?: number
          id?: string
          items?: Json
          lead_email?: string | null
          lead_id?: string | null
          lead_name?: string
          lead_phone?: string | null
          lead_segment?: string | null
          notes?: string | null
          page_type?: string
          status?: string
          title?: string
          total_value?: number
          updated_at?: string
          valid_until?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sales: {
        Row: {
          client_id: string
          confidence_score: number | null
          created_at: string
          detected_by: string | null
          detected_excerpt: string | null
          detected_message_id: string | null
          id: string
          is_confirmed: boolean | null
          lead_id: string
          notes: string | null
          product_name: string | null
          referral_commission_paid: boolean | null
          sale_date: string
          value: number
        }
        Insert: {
          client_id: string
          confidence_score?: number | null
          created_at?: string
          detected_by?: string | null
          detected_excerpt?: string | null
          detected_message_id?: string | null
          id?: string
          is_confirmed?: boolean | null
          lead_id: string
          notes?: string | null
          product_name?: string | null
          referral_commission_paid?: boolean | null
          sale_date?: string
          value?: number
        }
        Update: {
          client_id?: string
          confidence_score?: number | null
          created_at?: string
          detected_by?: string | null
          detected_excerpt?: string | null
          detected_message_id?: string | null
          id?: string
          is_confirmed?: boolean | null
          lead_id?: string
          notes?: string | null
          product_name?: string | null
          referral_commission_paid?: boolean | null
          sale_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sales_detected_message_id_fkey"
            columns: ["detected_message_id"]
            isOneToOne: false
            referencedRelation: "crm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_scheduled_messages: {
        Row: {
          client_id: string
          content: string
          created_at: string
          error_message: string | null
          id: string
          lead_id: string
          media_type: string | null
          media_url: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id: string
          media_type?: string | null
          media_url?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string
          media_type?: string | null
          media_url?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_scheduled_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_scheduled_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          api_key: string | null
          config: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          provider: string
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          api_key?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          api_key?: string | null
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      crm_tags: {
        Row: {
          client_id: string
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_team_members: {
        Row: {
          avatar_url: string | null
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          login_password: string | null
          max_active_leads: number | null
          name: string
          phone: string | null
          role_label: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          login_password?: string | null
          max_active_leads?: number | null
          name: string
          phone?: string | null
          role_label?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          login_password?: string | null
          max_active_leads?: number | null
          name?: string
          phone?: string | null
          role_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_team_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_whatsapp_connections: {
        Row: {
          client_id: string
          connected_at: string | null
          created_at: string
          id: string
          phone_number: string | null
          session_api_key: string | null
          session_id: string | null
          status: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          client_id: string
          connected_at?: string | null
          created_at?: string
          id?: string
          phone_number?: string | null
          session_api_key?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          client_id?: string
          connected_at?: string | null
          created_at?: string
          id?: string
          phone_number?: string | null
          session_api_key?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_whatsapp_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_briefing_configs: {
        Row: {
          client_id: string
          created_at: string
          custom_days: number[] | null
          frequency: string
          id: string
          is_enabled: boolean
          message_template: string
          monday_message_template: string | null
          send_time: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          custom_days?: number[] | null
          frequency?: string
          id?: string
          is_enabled?: boolean
          message_template?: string
          monday_message_template?: string | null
          send_time?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          custom_days?: number[] | null
          frequency?: string
          id?: string
          is_enabled?: boolean
          message_template?: string
          monday_message_template?: string | null
          send_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_briefing_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_completed: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      designers: {
        Row: {
          commission_rate: number | null
          cost_per_art: number
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_fixed_model: boolean | null
          name: string
          phone: string | null
          staff_member_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commission_rate?: number | null
          cost_per_art?: number
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          is_fixed_model?: boolean | null
          name: string
          phone?: string | null
          staff_member_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commission_rate?: number | null
          cost_per_art?: number
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_fixed_model?: boolean | null
          name?: string
          phone?: string | null
          staff_member_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "designers_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designers_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      employee_records: {
        Row: {
          created_at: string
          hired_at: string
          id: string
          name: string
          role: string | null
          salary: number | null
          terminated_at: string | null
        }
        Insert: {
          created_at?: string
          hired_at: string
          id?: string
          name: string
          role?: string | null
          salary?: number | null
          terminated_at?: string | null
        }
        Update: {
          created_at?: string
          hired_at?: string
          id?: string
          name?: string
          role?: string | null
          salary?: number | null
          terminated_at?: string | null
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          acquisition_goal: number | null
          created_at: string
          entity: string
          goal_amount: number
          id: string
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          acquisition_goal?: number | null
          created_at?: string
          entity?: string
          goal_amount?: number
          id?: string
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          acquisition_goal?: number | null
          created_at?: string
          entity?: string
          goal_amount?: number
          id?: string
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      firecrawl_research_data: {
        Row: {
          consulting_month_id: string | null
          content: string
          created_at: string
          id: string
          instance_id: string | null
          notes: string | null
          source_type: string
          source_url: string | null
          title: string | null
        }
        Insert: {
          consulting_month_id?: string | null
          content: string
          created_at?: string
          id?: string
          instance_id?: string | null
          notes?: string | null
          source_type: string
          source_url?: string | null
          title?: string | null
        }
        Update: {
          consulting_month_id?: string | null
          content?: string
          created_at?: string
          id?: string
          instance_id?: string | null
          notes?: string | null
          source_type?: string
          source_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firecrawl_research_data_consulting_month_id_fkey"
            columns: ["consulting_month_id"]
            isOneToOne: false
            referencedRelation: "consulting_months"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firecrawl_research_data_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "framework_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_answers: {
        Row: {
          answer_text: string | null
          created_at: string
          id: string
          instance_id: string
          question_id: string
          updated_at: string
        }
        Insert: {
          answer_text?: string | null
          created_at?: string
          id?: string
          instance_id: string
          question_id: string
          updated_at?: string
        }
        Update: {
          answer_text?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_answers_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "framework_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "framework_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_assistant_questions: {
        Row: {
          allow_other: boolean | null
          created_at: string | null
          framework_id: string | null
          id: string
          options: Json | null
          question_order: number
          question_text: string
          question_type: string
          target_question_id: string | null
        }
        Insert: {
          allow_other?: boolean | null
          created_at?: string | null
          framework_id?: string | null
          id?: string
          options?: Json | null
          question_order: number
          question_text: string
          question_type?: string
          target_question_id?: string | null
        }
        Update: {
          allow_other?: boolean | null
          created_at?: string | null
          framework_id?: string | null
          id?: string
          options?: Json | null
          question_order?: number
          question_text?: string
          question_type?: string
          target_question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "framework_assistant_questions_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_assistant_questions_target_question_id_fkey"
            columns: ["target_question_id"]
            isOneToOne: false
            referencedRelation: "framework_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_instances: {
        Row: {
          completed_at: string | null
          consulting_month_id: string
          created_at: string
          framework_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          consulting_month_id: string
          created_at?: string
          framework_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          consulting_month_id?: string
          created_at?: string
          framework_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_instances_consulting_month_id_fkey"
            columns: ["consulting_month_id"]
            isOneToOne: false
            referencedRelation: "consulting_months"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_instances_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      framework_questions: {
        Row: {
          created_at: string
          field_type: string
          framework_id: string
          id: string
          is_required: boolean
          placeholder: string | null
          question_order: number
          question_text: string
        }
        Insert: {
          created_at?: string
          field_type?: string
          framework_id: string
          id?: string
          is_required?: boolean
          placeholder?: string | null
          question_order: number
          question_text: string
        }
        Update: {
          created_at?: string
          field_type?: string
          framework_id?: string
          id?: string
          is_required?: boolean
          placeholder?: string | null
          question_order?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "framework_questions_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      frameworks: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          objective: string
          slug: string
          when_to_use: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          objective: string
          slug: string
          when_to_use: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          objective?: string
          slug?: string
          when_to_use?: string
        }
        Relationships: []
      }
      instagram_conversations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          ig_conversation_id: string
          ig_name: string | null
          ig_profile_pic: string | null
          ig_user_id: string
          ig_username: string | null
          is_read: boolean | null
          last_message_at: string | null
          last_message_preview: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          ig_conversation_id: string
          ig_name?: string | null
          ig_profile_pic?: string | null
          ig_user_id: string
          ig_username?: string | null
          is_read?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          ig_conversation_id?: string
          ig_name?: string | null
          ig_profile_pic?: string | null
          ig_user_id?: string
          ig_username?: string | null
          is_read?: boolean | null
          last_message_at?: string | null
          last_message_preview?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_messages: {
        Row: {
          client_id: string
          content: string | null
          conversation_id: string | null
          created_at: string
          direction: string
          id: string
          ig_message_id: string | null
          ig_sender_id: string
          media_url: string | null
          message_type: string | null
        }
        Insert: {
          client_id: string
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          ig_message_id?: string | null
          ig_sender_id: string
          media_url?: string | null
          message_type?: string | null
        }
        Update: {
          client_id?: string
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          ig_message_id?: string | null
          ig_sender_id?: string
          media_url?: string | null
          message_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "instagram_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_metrics: {
        Row: {
          accounts_engaged: number | null
          audience_demographics: Json | null
          avg_comments: number | null
          avg_likes: number | null
          avg_reach_per_post: number | null
          avg_saves: number | null
          avg_shares: number | null
          best_posting_hours: Json | null
          carousel_count: number | null
          client_id: string
          created_at: string
          daily_follower_data: Json | null
          engagement_rate: number | null
          followers_count: number
          following_count: number | null
          id: string
          image_count: number | null
          impressions: number
          media_count: number | null
          month: number
          new_followers: number | null
          posts_count: number
          profile_views: number
          reach: number
          reels_count: number | null
          stories_count: number | null
          synced_at: string | null
          total_comments: number | null
          total_likes: number | null
          total_plays: number | null
          total_saves: number | null
          total_shares: number | null
          updated_at: string
          website_clicks: number
          year: number
        }
        Insert: {
          accounts_engaged?: number | null
          audience_demographics?: Json | null
          avg_comments?: number | null
          avg_likes?: number | null
          avg_reach_per_post?: number | null
          avg_saves?: number | null
          avg_shares?: number | null
          best_posting_hours?: Json | null
          carousel_count?: number | null
          client_id: string
          created_at?: string
          daily_follower_data?: Json | null
          engagement_rate?: number | null
          followers_count?: number
          following_count?: number | null
          id?: string
          image_count?: number | null
          impressions?: number
          media_count?: number | null
          month: number
          new_followers?: number | null
          posts_count?: number
          profile_views?: number
          reach?: number
          reels_count?: number | null
          stories_count?: number | null
          synced_at?: string | null
          total_comments?: number | null
          total_likes?: number | null
          total_plays?: number | null
          total_saves?: number | null
          total_shares?: number | null
          updated_at?: string
          website_clicks?: number
          year: number
        }
        Update: {
          accounts_engaged?: number | null
          audience_demographics?: Json | null
          avg_comments?: number | null
          avg_likes?: number | null
          avg_reach_per_post?: number | null
          avg_saves?: number | null
          avg_shares?: number | null
          best_posting_hours?: Json | null
          carousel_count?: number | null
          client_id?: string
          created_at?: string
          daily_follower_data?: Json | null
          engagement_rate?: number | null
          followers_count?: number
          following_count?: number | null
          id?: string
          image_count?: number | null
          impressions?: number
          media_count?: number | null
          month?: number
          new_followers?: number | null
          posts_count?: number
          profile_views?: number
          reach?: number
          reels_count?: number | null
          stories_count?: number | null
          synced_at?: string | null
          total_comments?: number | null
          total_likes?: number | null
          total_plays?: number | null
          total_saves?: number | null
          total_shares?: number | null
          updated_at?: string
          website_clicks?: number
          year?: number
        }
        Relationships: []
      }
      instagram_scheduled_posts: {
        Row: {
          caption: string | null
          client_id: string
          created_at: string
          error_message: string | null
          id: string
          ig_media_id: string | null
          media_type: string
          media_url: string | null
          media_urls: string[] | null
          published_at: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          client_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          ig_media_id?: string | null
          media_type?: string
          media_url?: string | null
          media_urls?: string[] | null
          published_at?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          client_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ig_media_id?: string | null
          media_type?: string
          media_url?: string | null
          media_urls?: string[] | null
          published_at?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_scheduled_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_top_media: {
        Row: {
          caption: string | null
          client_id: string
          comments_count: number
          created_at: string
          engagement_total: number
          id: string
          impressions: number
          like_count: number
          media_id_external: string
          media_type: string | null
          media_url: string | null
          month: number
          permalink: string | null
          plays: number
          reach: number
          saves: number
          shares: number
          synced_at: string | null
          thumbnail_url: string | null
          timestamp: string | null
          updated_at: string
          year: number
        }
        Insert: {
          caption?: string | null
          client_id: string
          comments_count?: number
          created_at?: string
          engagement_total?: number
          id?: string
          impressions?: number
          like_count?: number
          media_id_external: string
          media_type?: string | null
          media_url?: string | null
          month: number
          permalink?: string | null
          plays?: number
          reach?: number
          saves?: number
          shares?: number
          synced_at?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          caption?: string | null
          client_id?: string
          comments_count?: number
          created_at?: string
          engagement_total?: number
          id?: string
          impressions?: number
          like_count?: number
          media_id_external?: string
          media_type?: string | null
          media_url?: string | null
          month?: number
          permalink?: string | null
          plays?: number
          reach?: number
          saves?: number
          shares?: number
          synced_at?: string | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      landing_client_logos: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          logo_url: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      landing_portfolio_cases: {
        Row: {
          after_text: string
          before_text: string
          client_name: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          metric_label: string
          metric_value: string
          process_text: string
          updated_at: string | null
        }
        Insert: {
          after_text: string
          before_text: string
          client_name: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          metric_label: string
          metric_value: string
          process_text: string
          updated_at?: string | null
        }
        Update: {
          after_text?: string
          before_text?: string
          client_name?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          metric_label?: string
          metric_value?: string
          process_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      landing_stats: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
          value: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          value: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          value?: string
        }
        Relationships: []
      }
      landing_testimonials: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          photo_url: string | null
          rating: number | null
          role: string
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          photo_url?: string | null
          rating?: number | null
          role: string
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          photo_url?: string | null
          rating?: number | null
          role?: string
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_email_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          notification_id: string | null
          recipient_email: string
          resend_id: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          recipient_email: string
          resend_id?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          recipient_email?: string
          resend_id?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_email_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_email_settings: {
        Row: {
          admin_email: string | null
          agency_whatsapp_api_key: string | null
          agency_whatsapp_phone: string | null
          agency_whatsapp_session: string | null
          agency_whatsapp_session_id: string | null
          created_at: string
          digest_mode: string
          excluded_client_ids: string[] | null
          global_emails: Json
          id: string
          notify_art_approved: boolean
          notify_art_ready: boolean
          notify_art_revision: boolean
          notify_briefing_completed: boolean
          notify_crm_new_lead: boolean
          notify_crm_new_message: boolean
          notify_planning_complete: boolean
          notify_system_art_approved: boolean
          notify_system_art_ready: boolean
          notify_system_art_revision: boolean
          notify_system_briefing_completed: boolean
          notify_system_crm_new_lead: boolean
          notify_system_crm_new_message: boolean
          notify_system_planning_complete: boolean
          notify_whatsapp_art_approved: boolean | null
          notify_whatsapp_art_ready: boolean | null
          notify_whatsapp_briefing_completed: boolean | null
          notify_whatsapp_client_approval: boolean | null
          notify_whatsapp_deadline_near: boolean | null
          notify_whatsapp_traffic_low: boolean | null
          updated_at: string
          whatsapp_notifications_enabled: boolean | null
        }
        Insert: {
          admin_email?: string | null
          agency_whatsapp_api_key?: string | null
          agency_whatsapp_phone?: string | null
          agency_whatsapp_session?: string | null
          agency_whatsapp_session_id?: string | null
          created_at?: string
          digest_mode?: string
          excluded_client_ids?: string[] | null
          global_emails?: Json
          id?: string
          notify_art_approved?: boolean
          notify_art_ready?: boolean
          notify_art_revision?: boolean
          notify_briefing_completed?: boolean
          notify_crm_new_lead?: boolean
          notify_crm_new_message?: boolean
          notify_planning_complete?: boolean
          notify_system_art_approved?: boolean
          notify_system_art_ready?: boolean
          notify_system_art_revision?: boolean
          notify_system_briefing_completed?: boolean
          notify_system_crm_new_lead?: boolean
          notify_system_crm_new_message?: boolean
          notify_system_planning_complete?: boolean
          notify_whatsapp_art_approved?: boolean | null
          notify_whatsapp_art_ready?: boolean | null
          notify_whatsapp_briefing_completed?: boolean | null
          notify_whatsapp_client_approval?: boolean | null
          notify_whatsapp_deadline_near?: boolean | null
          notify_whatsapp_traffic_low?: boolean | null
          updated_at?: string
          whatsapp_notifications_enabled?: boolean | null
        }
        Update: {
          admin_email?: string | null
          agency_whatsapp_api_key?: string | null
          agency_whatsapp_phone?: string | null
          agency_whatsapp_session?: string | null
          agency_whatsapp_session_id?: string | null
          created_at?: string
          digest_mode?: string
          excluded_client_ids?: string[] | null
          global_emails?: Json
          id?: string
          notify_art_approved?: boolean
          notify_art_ready?: boolean
          notify_art_revision?: boolean
          notify_briefing_completed?: boolean
          notify_crm_new_lead?: boolean
          notify_crm_new_message?: boolean
          notify_planning_complete?: boolean
          notify_system_art_approved?: boolean
          notify_system_art_ready?: boolean
          notify_system_art_revision?: boolean
          notify_system_briefing_completed?: boolean
          notify_system_crm_new_lead?: boolean
          notify_system_crm_new_message?: boolean
          notify_system_planning_complete?: boolean
          notify_whatsapp_art_approved?: boolean | null
          notify_whatsapp_art_ready?: boolean | null
          notify_whatsapp_briefing_completed?: boolean | null
          notify_whatsapp_client_approval?: boolean | null
          notify_whatsapp_deadline_near?: boolean | null
          notify_whatsapp_traffic_low?: boolean | null
          updated_at?: string
          whatsapp_notifications_enabled?: boolean | null
        }
        Relationships: []
      }
      notification_pendencies: {
        Row: {
          art_id: string | null
          client_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          notified_at: string | null
          project_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          art_id?: string | null
          client_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          notified_at?: string | null
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          art_id?: string | null
          client_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          notified_at?: string | null
          project_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_pendencies_art_id_fkey"
            columns: ["art_id"]
            isOneToOne: false
            referencedRelation: "arts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_pendencies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_pendencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "audiovisual_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_ai_insights: {
        Row: {
          created_at: string | null
          id: string
          insight_type: string
          is_resolved: boolean | null
          key_result_id: string | null
          message: string
          metadata: Json | null
          objective_id: string | null
          priority: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          insight_type: string
          is_resolved?: boolean | null
          key_result_id?: string | null
          message: string
          metadata?: Json | null
          objective_id?: string | null
          priority?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          insight_type?: string
          is_resolved?: boolean | null
          key_result_id?: string | null
          message?: string
          metadata?: Json | null
          objective_id?: string | null
          priority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_ai_insights_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "okr_key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_ai_insights_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "okr_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_alerts: {
        Row: {
          created_at: string | null
          id: string
          is_resolved: boolean | null
          key_result_id: string | null
          message: string | null
          severity: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          key_result_id?: string | null
          message?: string | null
          severity?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          key_result_id?: string | null
          message?: string | null
          severity?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_alerts_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "okr_key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_auto_generation_logs: {
        Row: {
          created_at: string | null
          cycle_month: number
          cycle_year: number
          error_message: string | null
          id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          cycle_month: number
          cycle_year: number
          error_message?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          cycle_month?: number
          cycle_year?: number
          error_message?: string | null
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      okr_automation_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      okr_initiatives: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          impact: string | null
          justification: string | null
          key_result_id: string
          measurement_method: string | null
          notes: string | null
          owner_staff_id: string | null
          priority: string | null
          responsible_staff_id: string | null
          status: string
          suggestion_status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          impact?: string | null
          justification?: string | null
          key_result_id: string
          measurement_method?: string | null
          notes?: string | null
          owner_staff_id?: string | null
          priority?: string | null
          responsible_staff_id?: string | null
          status?: string
          suggestion_status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          impact?: string | null
          justification?: string | null
          key_result_id?: string
          measurement_method?: string | null
          notes?: string | null
          owner_staff_id?: string | null
          priority?: string | null
          responsible_staff_id?: string | null
          status?: string
          suggestion_status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_initiatives_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "okr_key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_initiatives_owner_staff_id_fkey"
            columns: ["owner_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_initiatives_owner_staff_id_fkey"
            columns: ["owner_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "okr_initiatives_responsible_staff_id_fkey"
            columns: ["responsible_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_initiatives_responsible_staff_id_fkey"
            columns: ["responsible_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      okr_key_result_history: {
        Row: {
          id: string
          key_result_id: string | null
          recorded_at: string | null
          value: number
        }
        Insert: {
          id?: string
          key_result_id?: string | null
          recorded_at?: string | null
          value: number
        }
        Update: {
          id?: string
          key_result_id?: string | null
          recorded_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "okr_key_result_history_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "okr_key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_key_results: {
        Row: {
          ai_diagnostic: string | null
          ai_recommendations: string[] | null
          auto_sync_source: string | null
          confidence_level: number | null
          created_at: string
          current_value: number | null
          id: string
          is_automated: boolean | null
          is_template: boolean | null
          last_sync_at: string | null
          metric_category: string | null
          metric_unit: string | null
          notes: string | null
          objective_id: string
          owner_staff_id: string | null
          start_value: number | null
          target_value: number
          title: string
          trend_indicator: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          ai_diagnostic?: string | null
          ai_recommendations?: string[] | null
          auto_sync_source?: string | null
          confidence_level?: number | null
          created_at?: string
          current_value?: number | null
          id?: string
          is_automated?: boolean | null
          is_template?: boolean | null
          last_sync_at?: string | null
          metric_category?: string | null
          metric_unit?: string | null
          notes?: string | null
          objective_id: string
          owner_staff_id?: string | null
          start_value?: number | null
          target_value: number
          title: string
          trend_indicator?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          ai_diagnostic?: string | null
          ai_recommendations?: string[] | null
          auto_sync_source?: string | null
          confidence_level?: number | null
          created_at?: string
          current_value?: number | null
          id?: string
          is_automated?: boolean | null
          is_template?: boolean | null
          last_sync_at?: string | null
          metric_category?: string | null
          metric_unit?: string | null
          notes?: string | null
          objective_id?: string
          owner_staff_id?: string | null
          start_value?: number | null
          target_value?: number
          title?: string
          trend_indicator?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "okr_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_key_results_owner_staff_id_fkey"
            columns: ["owner_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_key_results_owner_staff_id_fkey"
            columns: ["owner_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      okr_metric_sources: {
        Row: {
          category: string
          created_at: string | null
          id: string
          metric_name: string
          source_query: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          metric_name: string
          source_query?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          metric_name?: string
          source_query?: string | null
        }
        Relationships: []
      }
      okr_monthly_reports: {
        Row: {
          created_at: string | null
          cycle_month: number | null
          cycle_quarter: number | null
          cycle_year: number
          deviations: Json | null
          goals_met: Json | null
          id: string
          recommendations: string[] | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cycle_month?: number | null
          cycle_quarter?: number | null
          cycle_year: number
          deviations?: Json | null
          goals_met?: Json | null
          id?: string
          recommendations?: string[] | null
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cycle_month?: number | null
          cycle_quarter?: number | null
          cycle_year?: number
          deviations?: Json | null
          goals_met?: Json | null
          id?: string
          recommendations?: string[] | null
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      okr_objectives: {
        Row: {
          ai_status: string | null
          client_id: string | null
          created_at: string
          cycle_month: number | null
          cycle_quarter: number | null
          cycle_year: number
          description: string | null
          id: string
          is_client_visible: boolean | null
          is_template: boolean | null
          justification: string | null
          last_ai_analysis_at: string | null
          level: string | null
          owner_staff_id: string | null
          progress: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_status?: string | null
          client_id?: string | null
          created_at?: string
          cycle_month?: number | null
          cycle_quarter?: number | null
          cycle_year: number
          description?: string | null
          id?: string
          is_client_visible?: boolean | null
          is_template?: boolean | null
          justification?: string | null
          last_ai_analysis_at?: string | null
          level?: string | null
          owner_staff_id?: string | null
          progress?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_status?: string | null
          client_id?: string | null
          created_at?: string
          cycle_month?: number | null
          cycle_quarter?: number | null
          cycle_year?: number
          description?: string | null
          id?: string
          is_client_visible?: boolean | null
          is_template?: boolean | null
          justification?: string | null
          last_ai_analysis_at?: string | null
          level?: string | null
          owner_staff_id?: string | null
          progress?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_objectives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_objectives_owner_staff_id_fkey"
            columns: ["owner_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "okr_objectives_owner_staff_id_fkey"
            columns: ["owner_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      okr_suggestions_cache: {
        Row: {
          context_id: string
          context_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          suggestions: Json
        }
        Insert: {
          context_id: string
          context_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          suggestions: Json
        }
        Update: {
          context_id?: string
          context_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          suggestions?: Json
        }
        Relationships: []
      }
      okr_sync_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          key_result_id: string | null
          metric_category: string | null
          new_value: number | null
          old_value: number | null
          rule_name: string | null
          source: string
          status: string | null
          validation_errors: Json | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          key_result_id?: string | null
          metric_category?: string | null
          new_value?: number | null
          old_value?: number | null
          rule_name?: string | null
          source: string
          status?: string | null
          validation_errors?: Json | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          key_result_id?: string | null
          metric_category?: string | null
          new_value?: number | null
          old_value?: number | null
          rule_name?: string | null
          source?: string
          status?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "okr_sync_logs_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "okr_key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_deliverables: {
        Row: {
          asset_url: string | null
          client_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          due_date: string | null
          id: string
          month: number
          notes: string | null
          notified_at: string | null
          opens_at: string | null
          project_id: string | null
          service_type: string
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          asset_url?: string | null
          client_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          month: number
          notes?: string | null
          notified_at?: string | null
          opens_at?: string | null
          project_id?: string | null
          service_type: string
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          asset_url?: string | null
          client_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          month?: number
          notes?: string | null
          notified_at?: string | null
          opens_at?: string | null
          project_id?: string | null
          service_type?: string
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "operation_deliverables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "audiovisual_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ote_criteria: {
        Row: {
          created_at: string
          criteria_order: number
          description: string | null
          id: string
          is_active: boolean
          measurement_type: string
          name: string
          role_config_id: string
          target_value: number | null
          updated_at: string
          weight_percent: number
        }
        Insert: {
          created_at?: string
          criteria_order?: number
          description?: string | null
          id?: string
          is_active?: boolean
          measurement_type?: string
          name: string
          role_config_id: string
          target_value?: number | null
          updated_at?: string
          weight_percent?: number
        }
        Update: {
          created_at?: string
          criteria_order?: number
          description?: string | null
          id?: string
          is_active?: boolean
          measurement_type?: string
          name?: string
          role_config_id?: string
          target_value?: number | null
          updated_at?: string
          weight_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "ote_criteria_role_config_id_fkey"
            columns: ["role_config_id"]
            isOneToOne: false
            referencedRelation: "ote_role_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ote_criteria_scores: {
        Row: {
          achievement_percent: number
          created_at: string
          criteria_id: string
          current_value: number
          id: string
          is_met: boolean
          monthly_score_id: string
          notes: string | null
          target_value: number
          updated_at: string
          weight_percent: number
          weighted_score: number
        }
        Insert: {
          achievement_percent?: number
          created_at?: string
          criteria_id: string
          current_value?: number
          id?: string
          is_met?: boolean
          monthly_score_id: string
          notes?: string | null
          target_value?: number
          updated_at?: string
          weight_percent?: number
          weighted_score?: number
        }
        Update: {
          achievement_percent?: number
          created_at?: string
          criteria_id?: string
          current_value?: number
          id?: string
          is_met?: boolean
          monthly_score_id?: string
          notes?: string | null
          target_value?: number
          updated_at?: string
          weight_percent?: number
          weighted_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ote_criteria_scores_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "ote_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ote_criteria_scores_monthly_score_id_fkey"
            columns: ["monthly_score_id"]
            isOneToOne: false
            referencedRelation: "ote_monthly_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      ote_monthly_scores: {
        Row: {
          accelerator_bonus: number
          achievement_percent: number
          approved_by: string | null
          calculated_at: string | null
          created_at: string
          fixed_amount: number
          id: string
          month: number
          notes: string | null
          role_config_id: string
          staff_member_id: string
          status: string
          total_amount: number
          updated_at: string
          variable_amount: number
          year: number
        }
        Insert: {
          accelerator_bonus?: number
          achievement_percent?: number
          approved_by?: string | null
          calculated_at?: string | null
          created_at?: string
          fixed_amount?: number
          id?: string
          month: number
          notes?: string | null
          role_config_id: string
          staff_member_id: string
          status?: string
          total_amount?: number
          updated_at?: string
          variable_amount?: number
          year: number
        }
        Update: {
          accelerator_bonus?: number
          achievement_percent?: number
          approved_by?: string | null
          calculated_at?: string | null
          created_at?: string
          fixed_amount?: number
          id?: string
          month?: number
          notes?: string | null
          role_config_id?: string
          staff_member_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
          variable_amount?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "ote_monthly_scores_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ote_monthly_scores_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "ote_monthly_scores_role_config_id_fkey"
            columns: ["role_config_id"]
            isOneToOne: false
            referencedRelation: "ote_role_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ote_monthly_scores_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ote_monthly_scores_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      ote_payment_cycles: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ote_role_configs: {
        Row: {
          accelerator_multiplier: number | null
          accelerator_type: string
          base_salary: number
          created_at: string
          id: string
          is_active: boolean
          ote_target: number
          role_name: string
          split_fixed: number
          split_variable: number | null
          updated_at: string
        }
        Insert: {
          accelerator_multiplier?: number | null
          accelerator_type?: string
          base_salary?: number
          created_at?: string
          id?: string
          is_active?: boolean
          ote_target?: number
          role_name: string
          split_fixed?: number
          split_variable?: number | null
          updated_at?: string
        }
        Update: {
          accelerator_multiplier?: number | null
          accelerator_type?: string
          base_salary?: number
          created_at?: string
          id?: string
          is_active?: boolean
          ote_target?: number
          role_name?: string
          split_fixed?: number
          split_variable?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ote_staff_performance: {
        Row: {
          adjustment_reason: string | null
          created_at: string
          cycle_id: string
          fixed_amount: number
          id: string
          manual_adjustment: number | null
          met_automated_criteria: boolean | null
          over_performance_bonus: number | null
          referral_bonus: number | null
          staff_id: string
          status: string | null
          total_payable: number | null
          updated_at: string
          variable_achieved_percent: number | null
          variable_earned_amount: number | null
          variable_target_amount: number
        }
        Insert: {
          adjustment_reason?: string | null
          created_at?: string
          cycle_id: string
          fixed_amount: number
          id?: string
          manual_adjustment?: number | null
          met_automated_criteria?: boolean | null
          over_performance_bonus?: number | null
          referral_bonus?: number | null
          staff_id: string
          status?: string | null
          total_payable?: number | null
          updated_at?: string
          variable_achieved_percent?: number | null
          variable_earned_amount?: number | null
          variable_target_amount: number
        }
        Update: {
          adjustment_reason?: string | null
          created_at?: string
          cycle_id?: string
          fixed_amount?: number
          id?: string
          manual_adjustment?: number | null
          met_automated_criteria?: boolean | null
          over_performance_bonus?: number | null
          referral_bonus?: number | null
          staff_id?: string
          status?: string | null
          total_payable?: number | null
          updated_at?: string
          variable_achieved_percent?: number | null
          variable_earned_amount?: number | null
          variable_target_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "ote_staff_performance_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "ote_payment_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ote_staff_performance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ote_staff_performance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      other_revenues: {
        Row: {
          amount: number
          category: string | null
          client_id: string | null
          created_at: string | null
          date: string
          description: string
          entity: string
          id: string
          is_fixed: boolean | null
          payment_status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          date?: string
          description: string
          entity?: string
          id?: string
          is_fixed?: boolean | null
          payment_status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          client_id?: string | null
          created_at?: string | null
          date?: string
          description?: string
          entity?: string
          id?: string
          is_fixed?: boolean | null
          payment_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "other_revenues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      package_services: {
        Row: {
          created_at: string
          id: string
          package_id: string
          price: number
          quantity: number
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          price?: number
          quantity?: number
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          price?: number
          quantity?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_services_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_pdfs: {
        Row: {
          client_id: string
          consulting_month_id: string | null
          created_at: string
          file_name: string
          file_url: string
          generated_by: string | null
          id: string
          month: number | null
          pdf_type: string
          work_month_id: string | null
          year: number | null
        }
        Insert: {
          client_id: string
          consulting_month_id?: string | null
          created_at?: string
          file_name: string
          file_url: string
          generated_by?: string | null
          id?: string
          month?: number | null
          pdf_type: string
          work_month_id?: string | null
          year?: number | null
        }
        Update: {
          client_id?: string
          consulting_month_id?: string | null
          created_at?: string
          file_name?: string
          file_url?: string
          generated_by?: string | null
          id?: string
          month?: number | null
          pdf_type?: string
          work_month_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_pdfs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_pdfs_consulting_month_id_fkey"
            columns: ["consulting_month_id"]
            isOneToOne: false
            referencedRelation: "consulting_months"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_pdfs_work_month_id_fkey"
            columns: ["work_month_id"]
            isOneToOne: false
            referencedRelation: "work_months"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_task_checks: {
        Row: {
          client_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          staff_member_id: string
          task_date: string
          task_description: string | null
          task_key: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          staff_member_id: string
          task_date: string
          task_description?: string | null
          task_key: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          staff_member_id?: string
          task_date?: string
          task_description?: string | null
          task_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_task_checks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_task_checks_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_task_checks_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      playbook_content: {
        Row: {
          content_md: string
          created_at: string
          display_order: number
          id: string
          section_key: string
          title: string
          updated_at: string
        }
        Insert: {
          content_md: string
          created_at?: string
          display_order?: number
          id?: string
          section_key: string
          title: string
          updated_at?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          display_order?: number
          id?: string
          section_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_cases: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_urls: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          logo_url: string | null
          metrics: Json | null
          niche: string | null
          service_tags: string[] | null
          title: string
          updated_at: string
          video_urls: string[] | null
        }
        Insert: {
          client_id?: string | null
          client_name: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          metrics?: Json | null
          niche?: string | null
          service_tags?: string[] | null
          title: string
          updated_at?: string
          video_urls?: string[] | null
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          logo_url?: string | null
          metrics?: Json | null
          niche?: string | null
          service_tags?: string[] | null
          title?: string
          updated_at?: string
          video_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      production_tasks: {
        Row: {
          client_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          started_at: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_leads: {
        Row: {
          ai_diagnostic: string | null
          answers: Json
          created_at: string | null
          email: string
          id: string
          instagram_handle: string | null
          level: string | null
          name: string
          preferred_callback_time: string | null
          qualification: string | null
          score: number | null
          wants_callback: boolean | null
          whatsapp: string
        }
        Insert: {
          ai_diagnostic?: string | null
          answers?: Json
          created_at?: string | null
          email: string
          id?: string
          instagram_handle?: string | null
          level?: string | null
          name: string
          preferred_callback_time?: string | null
          qualification?: string | null
          score?: number | null
          wants_callback?: boolean | null
          whatsapp: string
        }
        Update: {
          ai_diagnostic?: string | null
          answers?: Json
          created_at?: string | null
          email?: string
          id?: string
          instagram_handle?: string | null
          level?: string | null
          name?: string
          preferred_callback_time?: string | null
          qualification?: string | null
          score?: number | null
          wants_callback?: boolean | null
          whatsapp?: string
        }
        Relationships: []
      }
      sales_leads: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          estimated_value: number | null
          id: string
          last_contact_at: string | null
          name: string
          phone: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          last_contact_at?: string | null
          name: string
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          last_contact_at?: string | null
          name?: string
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      satisfaction_question_answers: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          question_id: string
          rating: string | null
          survey_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id: string
          rating?: string | null
          survey_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          question_id?: string
          rating?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "satisfaction_question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "satisfaction_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satisfaction_question_answers_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "client_satisfaction_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      satisfaction_questions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          question: string
          service: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question: string
          service?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question?: string
          service?: string
          updated_at?: string
        }
        Relationships: []
      }
      sdr_activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          details: Json | null
          id: string
          lead_id: string | null
          sdr_staff_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id?: string | null
          sdr_staff_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id?: string | null
          sdr_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_to_move_recovery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sdr_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_activity_logs_sdr_staff_id_fkey"
            columns: ["sdr_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_ai_leads: {
        Row: {
          address: string | null
          ceo_name: string | null
          company_instagram: string | null
          company_name: string
          created_at: string | null
          email: string | null
          id: string
          location: string | null
          niche: string | null
          personal_instagram: string | null
          phone: string | null
          qualification_score: number | null
          segmentation: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          ceo_name?: string | null
          company_instagram?: string | null
          company_name: string
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          niche?: string | null
          personal_instagram?: string | null
          phone?: string | null
          qualification_score?: number | null
          segmentation?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          ceo_name?: string | null
          company_instagram?: string | null
          company_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          niche?: string | null
          personal_instagram?: string | null
          phone?: string | null
          qualification_score?: number | null
          segmentation?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sdr_cadences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          steps: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          steps?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          steps?: Json
        }
        Relationships: []
      }
      sdr_kpi_configs: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          metric_name: string
          stage_name: string
          target_count: number | null
          target_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metric_name: string
          stage_name: string
          target_count?: number | null
          target_value: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metric_name?: string
          stage_name?: string
          target_count?: number | null
          target_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      sdr_lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          lead_id: string
          outcome: string | null
          sdr_staff_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          outcome?: string | null
          sdr_staff_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          outcome?: string | null
          sdr_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_to_move_recovery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sdr_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_lead_activities_sdr_staff_id_fkey"
            columns: ["sdr_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_lead_activities_sdr_staff_id_fkey"
            columns: ["sdr_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      sdr_leads: {
        Row: {
          budget_range: string | null
          claimed_at: string | null
          client_id: string | null
          cnpj: string | null
          company_name: string | null
          company_revenue_bracket: string | null
          contact_name: string
          contract_duration: number | null
          created_at: string
          crm_id: string | null
          crm_source: string | null
          decision_maker: boolean | null
          disqualified_at: string | null
          email: string | null
          estimated_value: number | null
          id: string
          initial_contact_responses: Json | null
          instagram_handle: string | null
          last_contact_at: string | null
          last_synced_at: string | null
          lead_tier: string | null
          lost_at: string | null
          lost_reason: string | null
          meeting_at: string | null
          next_follow_up_at: string | null
          notes: string | null
          pain_point: string | null
          phone: string | null
          qualification_score: number | null
          sale_type: string | null
          sdr_staff_id: string | null
          segment: string | null
          selected_services: Json | null
          source: string | null
          stage_id: string | null
          status: string
          updated_at: string
          won_value: number | null
        }
        Insert: {
          budget_range?: string | null
          claimed_at?: string | null
          client_id?: string | null
          cnpj?: string | null
          company_name?: string | null
          company_revenue_bracket?: string | null
          contact_name: string
          contract_duration?: number | null
          created_at?: string
          crm_id?: string | null
          crm_source?: string | null
          decision_maker?: boolean | null
          disqualified_at?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          initial_contact_responses?: Json | null
          instagram_handle?: string | null
          last_contact_at?: string | null
          last_synced_at?: string | null
          lead_tier?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          meeting_at?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          pain_point?: string | null
          phone?: string | null
          qualification_score?: number | null
          sale_type?: string | null
          sdr_staff_id?: string | null
          segment?: string | null
          selected_services?: Json | null
          source?: string | null
          stage_id?: string | null
          status?: string
          updated_at?: string
          won_value?: number | null
        }
        Update: {
          budget_range?: string | null
          claimed_at?: string | null
          client_id?: string | null
          cnpj?: string | null
          company_name?: string | null
          company_revenue_bracket?: string | null
          contact_name?: string
          contract_duration?: number | null
          created_at?: string
          crm_id?: string | null
          crm_source?: string | null
          decision_maker?: boolean | null
          disqualified_at?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          initial_contact_responses?: Json | null
          instagram_handle?: string | null
          last_contact_at?: string | null
          last_synced_at?: string | null
          lead_tier?: string | null
          lost_at?: string | null
          lost_reason?: string | null
          meeting_at?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          pain_point?: string | null
          phone?: string | null
          qualification_score?: number | null
          sale_type?: string | null
          sdr_staff_id?: string | null
          segment?: string | null
          selected_services?: Json | null
          source?: string | null
          stage_id?: string | null
          status?: string
          updated_at?: string
          won_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_leads_sdr_staff_id_fkey"
            columns: ["sdr_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_leads_sdr_staff_id_fkey"
            columns: ["sdr_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "sdr_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "sdr_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_meetings: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          lead_id: string | null
          meeting_link: string | null
          notes: string | null
          outcome: string | null
          scheduled_at: string
          sdr_staff_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          meeting_link?: string | null
          notes?: string | null
          outcome?: string | null
          scheduled_at: string
          sdr_staff_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          meeting_link?: string | null
          notes?: string | null
          outcome?: string | null
          scheduled_at?: string
          sdr_staff_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sdr_meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_to_move_recovery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sdr_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_meetings_sdr_staff_id_fkey"
            columns: ["sdr_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_meetings_sdr_staff_id_fkey"
            columns: ["sdr_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      sdr_pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_lost: boolean | null
          is_won: boolean | null
          name: string
          stage_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          name: string
          stage_order: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          name?: string
          stage_order?: number
        }
        Relationships: []
      }
      sdr_playbook_audits: {
        Row: {
          adherence_rate: number | null
          ai_analysis: string | null
          created_at: string | null
          feedback: string | null
          id: string
          items_checked: Json | null
          lead_id: string | null
          score: number | null
          sdr_staff_id: string | null
        }
        Insert: {
          adherence_rate?: number | null
          ai_analysis?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          items_checked?: Json | null
          lead_id?: string | null
          score?: number | null
          sdr_staff_id?: string | null
        }
        Update: {
          adherence_rate?: number | null
          ai_analysis?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          items_checked?: Json | null
          lead_id?: string | null
          score?: number | null
          sdr_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_playbook_audits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_to_move_recovery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_playbook_audits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sdr_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_playbook_audits_sdr_staff_id_fkey"
            columns: ["sdr_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_scripts: {
        Row: {
          category: string
          channel: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          strategy_step_key: string | null
          target_profile: string | null
          title: string
          updated_at: string
          use_count: number | null
          variables: string[] | null
        }
        Insert: {
          category: string
          channel?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          strategy_step_key?: string | null
          target_profile?: string | null
          title: string
          updated_at?: string
          use_count?: number | null
          variables?: string[] | null
        }
        Update: {
          category?: string
          channel?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          strategy_step_key?: string | null
          target_profile?: string | null
          title?: string
          updated_at?: string
          use_count?: number | null
          variables?: string[] | null
        }
        Relationships: []
      }
      sdr_search_cache: {
        Row: {
          created_at: string | null
          id: string
          query_params: Json
          results: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          query_params: Json
          results: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          query_params?: Json
          results?: Json
        }
        Relationships: []
      }
      sdr_stage_tactics: {
        Row: {
          checklist: string[] | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          metadata: Json | null
          stage_key: string
          title: string
        }
        Insert: {
          checklist?: string[] | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          metadata?: Json | null
          stage_key: string
          title: string
        }
        Update: {
          checklist?: string[] | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          metadata?: Json | null
          stage_key?: string
          title?: string
        }
        Relationships: []
      }
      sdr_strategy_guides: {
        Row: {
          category: string
          content: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
      sdr_strategy_steps: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          label: string
          methodology_info: string | null
          next_steps_instructions: string | null
          step_key: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          methodology_info?: string | null
          next_steps_instructions?: string | null
          step_key: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          methodology_info?: string | null
          next_steps_instructions?: string | null
          step_key?: string
        }
        Relationships: []
      }
      seasonality_dates: {
        Row: {
          category: string | null
          consulting_month_id: string
          created_at: string
          date: string
          id: string
          importance: string | null
          notes: string | null
          title: string
        }
        Insert: {
          category?: string | null
          consulting_month_id: string
          created_at?: string
          date: string
          id?: string
          importance?: string | null
          notes?: string | null
          title: string
        }
        Update: {
          category?: string | null
          consulting_month_id?: string
          created_at?: string
          date?: string
          id?: string
          importance?: string | null
          notes?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasonality_dates_consulting_month_id_fkey"
            columns: ["consulting_month_id"]
            isOneToOne: false
            referencedRelation: "consulting_months"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          benefits: Json | null
          category: string | null
          contract_duration: number | null
          created_at: string
          delivery_details: string | null
          description: string | null
          discount_percentage: number | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          pricing_model: string | null
          service_details: string | null
          setup_fee: number | null
          show_in_catalog: boolean | null
          slug: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          benefits?: Json | null
          category?: string | null
          contract_duration?: number | null
          created_at?: string
          delivery_details?: string | null
          description?: string | null
          discount_percentage?: number | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          pricing_model?: string | null
          service_details?: string | null
          setup_fee?: number | null
          show_in_catalog?: boolean | null
          slug: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          benefits?: Json | null
          category?: string | null
          contract_duration?: number | null
          created_at?: string
          delivery_details?: string | null
          description?: string | null
          discount_percentage?: number | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          pricing_model?: string | null
          service_details?: string | null
          setup_fee?: number | null
          show_in_catalog?: boolean | null
          slug?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      service_page_content: {
        Row: {
          content_type: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          media_url: string | null
          metric_label: string | null
          metric_value: string | null
          service_slug: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          media_url?: string | null
          metric_label?: string | null
          metric_value?: string | null
          service_slug: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          media_url?: string | null
          metric_label?: string | null
          metric_value?: string | null
          service_slug?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          service_id: string | null
          service_name: string
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          service_id?: string | null
          service_name: string
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          service_id?: string | null
          service_name?: string
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          benefits: Json | null
          category: string | null
          contract_duration: number | null
          created_at: string
          default_price: number
          delivery_details: string | null
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          pricing_model: string | null
          service_details: string | null
          setup_fee: number | null
          show_in_catalog: boolean | null
          slug: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          benefits?: Json | null
          category?: string | null
          contract_duration?: number | null
          created_at?: string
          default_price?: number
          delivery_details?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          pricing_model?: string | null
          service_details?: string | null
          setup_fee?: number | null
          show_in_catalog?: boolean | null
          slug: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          benefits?: Json | null
          category?: string | null
          contract_duration?: number | null
          created_at?: string
          default_price?: number
          delivery_details?: string | null
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          pricing_model?: string | null
          service_details?: string | null
          setup_fee?: number | null
          show_in_catalog?: boolean | null
          slug?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      staff_activity_proofs: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          files: string[] | null
          goal_id: string | null
          id: string
          performance_id: string | null
          proof_type: string
          proof_url: string
          staff_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          files?: string[] | null
          goal_id?: string | null
          id?: string
          performance_id?: string | null
          proof_type: string
          proof_url: string
          staff_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          files?: string[] | null
          goal_id?: string | null
          id?: string
          performance_id?: string | null
          proof_type?: string
          proof_url?: string
          staff_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_activity_proofs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_activity_proofs_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "staff_assigned_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_activity_proofs_performance_id_fkey"
            columns: ["performance_id"]
            isOneToOne: false
            referencedRelation: "ote_staff_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_activity_proofs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_activity_proofs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      staff_activity_sessions: {
        Row: {
          client_id: string | null
          created_at: string
          end_time: string | null
          id: string
          last_heartbeat: string
          staff_member_id: string
          start_time: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          last_heartbeat?: string
          staff_member_id: string
          start_time?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          last_heartbeat?: string
          staff_member_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_activity_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_activity_sessions_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_activity_sessions_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      staff_assigned_goals: {
        Row: {
          created_at: string | null
          current_value: number | null
          custom_target_value: number | null
          id: string
          last_tracking_at: string | null
          last_tracking_error: string | null
          month: number
          staff_id: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          custom_target_value?: number | null
          id?: string
          last_tracking_at?: string | null
          last_tracking_error?: string | null
          month: number
          staff_id?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          custom_target_value?: number | null
          id?: string
          last_tracking_at?: string | null
          last_tracking_error?: string | null
          month?: number
          staff_id?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_assigned_goals_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_assigned_goals_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_assigned_goals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "staff_goal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_client_payments: {
        Row: {
          client_id: string
          created_at: string
          id: string
          notes: string | null
          payment_value: number
          staff_member_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_value?: number
          staff_member_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_value?: number
          staff_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_client_payments_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_client_payments_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      staff_commission_templates: {
        Row: {
          commission_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          value: number
        }
        Insert: {
          commission_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          value: number
        }
        Update: {
          commission_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      staff_commissions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          month: number
          reference_id: string | null
          staff_member_id: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          month: number
          reference_id?: string | null
          staff_member_id?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          month?: number
          reference_id?: string | null
          staff_member_id?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_commissions_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_commissions_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_commissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "staff_commission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_goal_templates: {
        Row: {
          category: string | null
          commission_template_id: string | null
          created_at: string | null
          data_source_description: string | null
          description: string | null
          goal_type: string | null
          id: string
          improvement_direction: string | null
          is_active: boolean | null
          is_global: boolean | null
          is_standard: boolean | null
          measurement_unit: string | null
          min_threshold: number | null
          name: string
          role_type: string | null
          target_role: string | null
          target_value: number
          tracking_method: string
          tracking_query: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          commission_template_id?: string | null
          created_at?: string | null
          data_source_description?: string | null
          description?: string | null
          goal_type?: string | null
          id?: string
          improvement_direction?: string | null
          is_active?: boolean | null
          is_global?: boolean | null
          is_standard?: boolean | null
          measurement_unit?: string | null
          min_threshold?: number | null
          name: string
          role_type?: string | null
          target_role?: string | null
          target_value: number
          tracking_method?: string
          tracking_query?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          commission_template_id?: string | null
          created_at?: string | null
          data_source_description?: string | null
          description?: string | null
          goal_type?: string | null
          id?: string
          improvement_direction?: string | null
          is_active?: boolean | null
          is_global?: boolean | null
          is_standard?: boolean | null
          measurement_unit?: string | null
          min_threshold?: number | null
          name?: string
          role_type?: string | null
          target_role?: string | null
          target_value?: number
          tracking_method?: string
          tracking_query?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_goal_templates_commission_template_id_fkey"
            columns: ["commission_template_id"]
            isOneToOne: false
            referencedRelation: "staff_commission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_kpis: {
        Row: {
          created_at: string | null
          id: string
          kpi_name: string
          kpi_value: number
          period_end: string
          period_start: string
          staff_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kpi_name: string
          kpi_value: number
          period_end: string
          period_start: string
          staff_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kpi_name?: string
          kpi_value?: number
          period_end?: string
          period_start?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_kpis_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_kpis_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      staff_members: {
        Row: {
          av_monthly_capture_goal: number | null
          av_monthly_video_goal: number | null
          avatar_url: string | null
          base_salary: number | null
          base_salary_percent: number | null
          commission_percent: number
          commission_referral_percent: number | null
          cost_per_art: number
          created_at: string
          double_goal_commission: number | null
          early_delivery_commission: number | null
          email: string | null
          entity: string | null
          full_name: string
          has_password_login: boolean
          id: string
          indication_commission: number | null
          is_active: boolean
          job_title: string | null
          last_seen_at: string | null
          login_password: string | null
          max_hours_per_art: number | null
          monthly_capacity: number
          monthly_cost: number
          notification_email: string | null
          ote_role_config_id: string | null
          payment_split_fixed: number | null
          performance_salary_percent: number | null
          phone: string | null
          pix_key: string | null
          role: Database["public"]["Enums"]["app_role"]
          roles: string[] | null
          same_day_bonus: number | null
          show_commission: boolean | null
          show_financial: boolean | null
          show_on_landing: boolean
          squad_id: string | null
          updated_at: string
          variable_target: number | null
        }
        Insert: {
          av_monthly_capture_goal?: number | null
          av_monthly_video_goal?: number | null
          avatar_url?: string | null
          base_salary?: number | null
          base_salary_percent?: number | null
          commission_percent?: number
          commission_referral_percent?: number | null
          cost_per_art?: number
          created_at?: string
          double_goal_commission?: number | null
          early_delivery_commission?: number | null
          email?: string | null
          entity?: string | null
          full_name: string
          has_password_login?: boolean
          id?: string
          indication_commission?: number | null
          is_active?: boolean
          job_title?: string | null
          last_seen_at?: string | null
          login_password?: string | null
          max_hours_per_art?: number | null
          monthly_capacity?: number
          monthly_cost?: number
          notification_email?: string | null
          ote_role_config_id?: string | null
          payment_split_fixed?: number | null
          performance_salary_percent?: number | null
          phone?: string | null
          pix_key?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          roles?: string[] | null
          same_day_bonus?: number | null
          show_commission?: boolean | null
          show_financial?: boolean | null
          show_on_landing?: boolean
          squad_id?: string | null
          updated_at?: string
          variable_target?: number | null
        }
        Update: {
          av_monthly_capture_goal?: number | null
          av_monthly_video_goal?: number | null
          avatar_url?: string | null
          base_salary?: number | null
          base_salary_percent?: number | null
          commission_percent?: number
          commission_referral_percent?: number | null
          cost_per_art?: number
          created_at?: string
          double_goal_commission?: number | null
          early_delivery_commission?: number | null
          email?: string | null
          entity?: string | null
          full_name?: string
          has_password_login?: boolean
          id?: string
          indication_commission?: number | null
          is_active?: boolean
          job_title?: string | null
          last_seen_at?: string | null
          login_password?: string | null
          max_hours_per_art?: number | null
          monthly_capacity?: number
          monthly_cost?: number
          notification_email?: string | null
          ote_role_config_id?: string | null
          payment_split_fixed?: number | null
          performance_salary_percent?: number | null
          phone?: string | null
          pix_key?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          roles?: string[] | null
          same_day_bonus?: number | null
          show_commission?: boolean | null
          show_financial?: boolean | null
          show_on_landing?: boolean
          squad_id?: string | null
          updated_at?: string
          variable_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_ote_role_config_id_fkey"
            columns: ["ote_role_config_id"]
            isOneToOne: false
            referencedRelation: "ote_role_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "staff_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_squad_members: {
        Row: {
          created_at: string
          id: string
          role: string | null
          role_in_squad: string | null
          squad_id: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string | null
          role_in_squad?: string | null
          squad_id: string
          staff_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string | null
          role_in_squad?: string | null
          squad_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "staff_squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_squad_members_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_squad_members_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      staff_squad_productivity_logs: {
        Row: {
          created_at: string | null
          id: string
          kpi_data: Json | null
          period_end: string
          period_start: string
          productivity_score: number | null
          squad_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kpi_data?: Json | null
          period_end: string
          period_start: string
          productivity_score?: number | null
          squad_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kpi_data?: Json | null
          period_end?: string
          period_start?: string
          productivity_score?: number | null
          squad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_squad_productivity_logs_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "staff_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_squads: {
        Row: {
          avg_client_tax: number | null
          client_ids: string[] | null
          created_at: string
          delivery_progress: number | null
          description: string | null
          id: string
          kpis_config: Json | null
          leader_id: string | null
          name: string
          parent_squad_id: string | null
          productivity_target: number | null
          source_logic: Json | null
          updated_at: string
        }
        Insert: {
          avg_client_tax?: number | null
          client_ids?: string[] | null
          created_at?: string
          delivery_progress?: number | null
          description?: string | null
          id?: string
          kpis_config?: Json | null
          leader_id?: string | null
          name: string
          parent_squad_id?: string | null
          productivity_target?: number | null
          source_logic?: Json | null
          updated_at?: string
        }
        Update: {
          avg_client_tax?: number | null
          client_ids?: string[] | null
          created_at?: string
          delivery_progress?: number | null
          description?: string | null
          id?: string
          kpis_config?: Json | null
          leader_id?: string | null
          name?: string
          parent_squad_id?: string | null
          productivity_target?: number | null
          source_logic?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_squads_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_squads_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
          {
            foreignKeyName: "staff_squads_parent_squad_id_fkey"
            columns: ["parent_squad_id"]
            isOneToOne: false
            referencedRelation: "staff_squads"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_task_metrics: {
        Row: {
          id: string
          is_within_target: boolean | null
          metric_type: string
          recorded_at: string | null
          staff_id: string
          task_id: string | null
          value_numeric: number | null
        }
        Insert: {
          id?: string
          is_within_target?: boolean | null
          metric_type: string
          recorded_at?: string | null
          staff_id: string
          task_id?: string | null
          value_numeric?: number | null
        }
        Update: {
          id?: string
          is_within_target?: boolean | null
          metric_type?: string
          recorded_at?: string | null
          staff_id?: string
          task_id?: string | null
          value_numeric?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_task_metrics_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_task_metrics_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      strategic_goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          description: string | null
          id: string
          is_innovation: boolean | null
          target_date: string | null
          title: string
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_innovation?: boolean | null
          target_date?: string | null
          title: string
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_innovation?: boolean | null
          target_date?: string | null
          title?: string
        }
        Relationships: []
      }
      system_activity_logs: {
        Row: {
          activity_type: string
          client_id: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          metadata: Json | null
          staff_member_id: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          client_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          metadata?: Json | null
          staff_member_id?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          client_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          metadata?: Json | null
          staff_member_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_activity_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_activity_logs_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_activity_logs_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      team_production_logs: {
        Row: {
          client_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          month: number
          notes: string | null
          production_type: string
          quantity: number
          revenue_amount: number
          staff_member_id: string
          year: number
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          month: number
          notes?: string | null
          production_type: string
          quantity?: number
          revenue_amount?: number
          staff_member_id: string
          year: number
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          month?: number
          notes?: string | null
          production_type?: string
          quantity?: number
          revenue_amount?: number
          staff_member_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_production_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_production_logs_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_production_logs_staff_member_id_fkey"
            columns: ["staff_member_id"]
            isOneToOne: false
            referencedRelation: "staff_performance_metrics_view"
            referencedColumns: ["staff_id"]
          },
        ]
      }
      traffic_ai_actions: {
        Row: {
          action_type: string
          client_id: string
          created_at: string
          description: string
          id: string
          is_resolved: boolean
          month: number
          resolved_at: string | null
          severity: string
          title: string
          year: number
        }
        Insert: {
          action_type: string
          client_id: string
          created_at?: string
          description: string
          id?: string
          is_resolved?: boolean
          month: number
          resolved_at?: string | null
          severity?: string
          title: string
          year: number
        }
        Update: {
          action_type?: string
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          is_resolved?: boolean
          month?: number
          resolved_at?: string | null
          severity?: string
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "traffic_ai_actions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_ai_analyses: {
        Row: {
          analysis_type: string
          client_id: string
          client_summary: string | null
          content: string
          created_at: string
          id: string
          month: number
          year: number
        }
        Insert: {
          analysis_type?: string
          client_id: string
          client_summary?: string | null
          content: string
          created_at?: string
          id?: string
          month: number
          year: number
        }
        Update: {
          analysis_type?: string
          client_id?: string
          client_summary?: string | null
          content?: string
          created_at?: string
          id?: string
          month?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "traffic_ai_analyses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_auto_rules: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          last_executed_at: string | null
          rule_config: Json
          rule_type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          rule_config?: Json
          rule_type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          rule_config?: Json
          rule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_auto_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_campaigns: {
        Row: {
          add_to_cart: number | null
          campaign_id_external: string | null
          campaign_name: string | null
          clicks: number | null
          client_id: string
          conversion_rate: number | null
          conversion_rate_ranking: string | null
          conversions: number | null
          cost_per_conversion: number | null
          cost_per_lead: number | null
          cost_per_outbound_click: number | null
          cost_per_thruplay: number | null
          cpc: number | null
          cpm: number | null
          cpp: number | null
          created_at: string
          ctr: number | null
          daily_budget: number | null
          engagement_rate_ranking: string | null
          frequency: number | null
          id: string
          impressions: number | null
          investment: number | null
          landing_page_views: number | null
          leads: number | null
          lifetime_budget: number | null
          link_clicks: number | null
          messages_started: number | null
          month: number
          notes: string | null
          objective: string | null
          outbound_clicks: number | null
          platform: string
          post_comments: number | null
          post_engagement: number | null
          post_reactions: number | null
          post_saves: number | null
          post_shares: number | null
          purchase_value: number | null
          purchases: number | null
          quality_ranking: string | null
          reach: number | null
          revenue_generated: number | null
          roas: number | null
          status: string | null
          synced_at: string | null
          unique_clicks: number | null
          unique_impressions: number | null
          updated_at: string
          video_p100: number | null
          video_p25: number | null
          video_p50: number | null
          video_p75: number | null
          video_thruplay: number | null
          video_views: number | null
          year: number
        }
        Insert: {
          add_to_cart?: number | null
          campaign_id_external?: string | null
          campaign_name?: string | null
          clicks?: number | null
          client_id: string
          conversion_rate?: number | null
          conversion_rate_ranking?: string | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cost_per_lead?: number | null
          cost_per_outbound_click?: number | null
          cost_per_thruplay?: number | null
          cpc?: number | null
          cpm?: number | null
          cpp?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          engagement_rate_ranking?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          investment?: number | null
          landing_page_views?: number | null
          leads?: number | null
          lifetime_budget?: number | null
          link_clicks?: number | null
          messages_started?: number | null
          month: number
          notes?: string | null
          objective?: string | null
          outbound_clicks?: number | null
          platform?: string
          post_comments?: number | null
          post_engagement?: number | null
          post_reactions?: number | null
          post_saves?: number | null
          post_shares?: number | null
          purchase_value?: number | null
          purchases?: number | null
          quality_ranking?: string | null
          reach?: number | null
          revenue_generated?: number | null
          roas?: number | null
          status?: string | null
          synced_at?: string | null
          unique_clicks?: number | null
          unique_impressions?: number | null
          updated_at?: string
          video_p100?: number | null
          video_p25?: number | null
          video_p50?: number | null
          video_p75?: number | null
          video_thruplay?: number | null
          video_views?: number | null
          year: number
        }
        Update: {
          add_to_cart?: number | null
          campaign_id_external?: string | null
          campaign_name?: string | null
          clicks?: number | null
          client_id?: string
          conversion_rate?: number | null
          conversion_rate_ranking?: string | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cost_per_lead?: number | null
          cost_per_outbound_click?: number | null
          cost_per_thruplay?: number | null
          cpc?: number | null
          cpm?: number | null
          cpp?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          engagement_rate_ranking?: string | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          investment?: number | null
          landing_page_views?: number | null
          leads?: number | null
          lifetime_budget?: number | null
          link_clicks?: number | null
          messages_started?: number | null
          month?: number
          notes?: string | null
          objective?: string | null
          outbound_clicks?: number | null
          platform?: string
          post_comments?: number | null
          post_engagement?: number | null
          post_reactions?: number | null
          post_saves?: number | null
          post_shares?: number | null
          purchase_value?: number | null
          purchases?: number | null
          quality_ranking?: string | null
          reach?: number | null
          revenue_generated?: number | null
          roas?: number | null
          status?: string | null
          synced_at?: string | null
          unique_clicks?: number | null
          unique_impressions?: number | null
          updated_at?: string
          video_p100?: number | null
          video_p25?: number | null
          video_p50?: number | null
          video_p75?: number | null
          video_thruplay?: number | null
          video_views?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "traffic_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_custom_audiences: {
        Row: {
          audience_id_external: string
          audience_type: string
          client_id: string
          created_at: string
          description: string | null
          id: string
          lead_count: number | null
          lookalike_country: string | null
          lookalike_ratio: number | null
          name: string
          source_audience_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          audience_id_external: string
          audience_type?: string
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          lead_count?: number | null
          lookalike_country?: string | null
          lookalike_ratio?: number | null
          name: string
          source_audience_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          audience_id_external?: string
          audience_type?: string
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_count?: number | null
          lookalike_country?: string | null
          lookalike_ratio?: number | null
          name?: string
          source_audience_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_custom_audiences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_custom_audiences_source_audience_id_fkey"
            columns: ["source_audience_id"]
            isOneToOne: false
            referencedRelation: "traffic_custom_audiences"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_meta_connections: {
        Row: {
          access_token: string
          ad_account_id: string | null
          ad_account_name: string | null
          client_id: string
          created_at: string
          id: string
          instagram_business_id: string | null
          instagram_connected_at: string | null
          instagram_username: string | null
          last_synced_at: string | null
          meta_user_id: string | null
          meta_user_name: string | null
          status: string
          sync_error: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          ad_account_id?: string | null
          ad_account_name?: string | null
          client_id: string
          created_at?: string
          id?: string
          instagram_business_id?: string | null
          instagram_connected_at?: string | null
          instagram_username?: string | null
          last_synced_at?: string | null
          meta_user_id?: string | null
          meta_user_name?: string | null
          status?: string
          sync_error?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          ad_account_id?: string | null
          ad_account_name?: string | null
          client_id?: string
          created_at?: string
          id?: string
          instagram_business_id?: string | null
          instagram_connected_at?: string | null
          instagram_username?: string | null
          last_synced_at?: string | null
          meta_user_id?: string | null
          meta_user_name?: string | null
          status?: string
          sync_error?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_meta_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_plan_comments: {
        Row: {
          action: string
          author_name: string | null
          author_type: string
          created_at: string
          id: string
          message: string | null
          plan_id: string
          post_id: string | null
          story_id: string | null
        }
        Insert: {
          action: string
          author_name?: string | null
          author_type: string
          created_at?: string
          id?: string
          message?: string | null
          plan_id: string
          post_id?: string | null
          story_id?: string | null
        }
        Update: {
          action?: string
          author_name?: string | null
          author_type?: string
          created_at?: string
          id?: string
          message?: string | null
          plan_id?: string
          post_id?: string | null
          story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plan_comments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plan_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "weekly_plan_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plan_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "weekly_plan_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plan_posts: {
        Row: {
          approved_at: string | null
          caption: string | null
          client_comment: string | null
          created_at: string
          hashtags: string | null
          id: string
          image_urls: string[]
          plan_id: string
          position: number
          post_type: Database["public"]["Enums"]["weekly_plan_post_type"]
          scheduled_at: string | null
          status: Database["public"]["Enums"]["weekly_plan_item_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          caption?: string | null
          client_comment?: string | null
          created_at?: string
          hashtags?: string | null
          id?: string
          image_urls?: string[]
          plan_id: string
          position?: number
          post_type?: Database["public"]["Enums"]["weekly_plan_post_type"]
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["weekly_plan_item_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          caption?: string | null
          client_comment?: string | null
          created_at?: string
          hashtags?: string | null
          id?: string
          image_urls?: string[]
          plan_id?: string
          position?: number
          post_type?: Database["public"]["Enums"]["weekly_plan_post_type"]
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["weekly_plan_item_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plan_posts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plan_stories: {
        Row: {
          approved_at: string | null
          client_comment: string | null
          created_at: string
          day_of_week: number
          description: string | null
          id: string
          image_url: string | null
          plan_id: string
          position: number
          status: Database["public"]["Enums"]["weekly_plan_item_status"]
          story_type: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          client_comment?: string | null
          created_at?: string
          day_of_week: number
          description?: string | null
          id?: string
          image_url?: string | null
          plan_id: string
          position?: number
          status?: Database["public"]["Enums"]["weekly_plan_item_status"]
          story_type?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          client_comment?: string | null
          created_at?: string
          day_of_week?: number
          description?: string | null
          id?: string
          image_url?: string | null
          plan_id?: string
          position?: number
          status?: Database["public"]["Enums"]["weekly_plan_item_status"]
          story_type?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plan_stories_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          approved_at: string | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["weekly_plan_status"]
          title: string | null
          updated_at: string
          week_start_date: string
        }
        Insert: {
          approved_at?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["weekly_plan_status"]
          title?: string | null
          updated_at?: string
          week_start_date: string
        }
        Update: {
          approved_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["weekly_plan_status"]
          title?: string | null
          updated_at?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          is_active: boolean
          message_template: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          message_template: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          message_template?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_notification_log: {
        Row: {
          art_id: string | null
          client_id: string | null
          created_at: string
          edge_function: string | null
          error_message: string | null
          event_type: string
          id: string
          message_preview: string | null
          recipient_phone: string | null
          recipient_type: string | null
          status: string
        }
        Insert: {
          art_id?: string | null
          client_id?: string | null
          created_at?: string
          edge_function?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          message_preview?: string | null
          recipient_phone?: string | null
          recipient_type?: string | null
          status?: string
        }
        Update: {
          art_id?: string | null
          client_id?: string | null
          created_at?: string
          edge_function?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          message_preview?: string | null
          recipient_phone?: string | null
          recipient_type?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_log_art_id_fkey"
            columns: ["art_id"]
            isOneToOne: false
            referencedRelation: "arts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notification_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      work_months: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_planning_complete: boolean
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_planning_complete?: boolean
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_planning_complete?: boolean
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_months_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      financial_performance_summary: {
        Row: {
          margin_percent: number | null
          month: number | null
          mrr: number | null
          net_profit: number | null
          total_costs: number | null
          year: number | null
        }
        Relationships: []
      }
      leads_to_move_recovery: {
        Row: {
          current_stage: string | null
          disqualified_at: string | null
          id: string | null
          lead_tier: string | null
          lost_at: string | null
          stage_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "sdr_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_managed_revenue: {
        Row: {
          staff_id: string | null
          total_managed_revenue: number | null
        }
        Relationships: []
      }
      staff_performance_metrics_view: {
        Row: {
          month: number | null
          staff_id: string | null
          staff_name: string | null
          total_managed_revenue: number | null
          year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      authenticate_client_portal: {
        Args: { p_email: string; p_password: string }
        Returns: {
          client_name: string
          portal_token: string
        }[]
      }
      authenticate_crm_portal: {
        Args: { p_client_id: string; p_login: string; p_password: string }
        Returns: boolean
      }
      authenticate_staff_by_email: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
      authenticate_staff_member: {
        Args: { p_full_name: string; p_password?: string }
        Returns: Json
      }
      auto_generate_monthly_okrs: {
        Args: { target_month: number; target_year: number }
        Returns: undefined
      }
      auto_generate_monthly_okrs_v2: {
        Args: { target_month: number; target_year: number }
        Returns: undefined
      }
      calculate_member_commission: {
        Args: { p_month: number; p_staff_id: string; p_year: number }
        Returns: number
      }
      check_okr_auto_generation_trigger: {
        Args: { current_day: number }
        Returns: Json
      }
      check_stale_pendencies: { Args: never; Returns: undefined }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      ensure_monthly_audiovisual_projects: { Args: never; Returns: Json }
      generate_intelligent_okrs: {
        Args: { target_month: number; target_year: number }
        Returns: {
          obj_id: string
          title: string
        }[]
      }
      generate_quote_code: { Args: never; Returns: string }
      get_designer_id: { Args: { _user_id: string }; Returns: string }
      get_edge_function_url: { Args: { func_name: string }; Returns: string }
      get_editing_duration: { Args: { project_id: string }; Returns: string }
      get_staff_designer_id: { Args: { _staff_id: string }; Returns: string }
      get_staff_managed_revenue_by_entity: {
        Args: { p_entity?: string }
        Returns: {
          staff_id: string
          total_managed_revenue: number
        }[]
      }
      get_staff_managed_revenue_split: {
        Args: never
        Returns: {
          ellcazo_revenue: number
          peformake_revenue: number
          staff_id: string
        }[]
      }
      get_staff_performance_metrics: {
        Args: { p_month: number; p_year: number }
        Returns: Json
      }
      get_staff_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_total_unique_revenue:
        | { Args: { p_entity?: string }; Returns: number }
        | {
            Args: { p_entity?: string; p_month?: number; p_year?: number }
            Returns: number
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_audiovisual_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_audiovisual_leader: { Args: { p_user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      reset_crm_data: { Args: { p_client_id: string }; Returns: Json }
      reset_financial_data: {
        Args: { include_services?: boolean }
        Returns: undefined
      }
      staff_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _staff_id: string
        }
        Returns: boolean
      }
      update_squad_metrics: { Args: never; Returns: undefined }
      update_staff_goal_metrics: {
        Args: { p_month: number; p_year: number }
        Returns: Json
      }
      verify_staff_session: { Args: { p_staff_id: string }; Returns: Json }
    }
    Enums: {
      app_role:
        | "admin"
        | "social_media"
        | "designer"
        | "sdr"
        | "traffic"
        | "leader"
        | "videomaker"
        | "editor"
        | "closer"
      art_status:
        | "pending_briefing"
        | "ready_for_production"
        | "in_production"
        | "awaiting_approval"
        | "revision_requested"
        | "approved"
      art_type: "post_instagram" | "story" | "carrossel" | "anuncio" | "feed"
      audiovisual_kind: "monthly" | "project"
      audiovisual_status:
        | "pending_briefing"
        | "briefing_done"
        | "in_production"
        | "awaiting_approval"
        | "revision_requested"
        | "approved"
        | "published"
        | "awaiting_capture"
        | "captured"
        | "in_editing"
        | "cancelled"
      weekly_plan_item_status: "pending" | "approved" | "changes_requested"
      weekly_plan_post_type: "feed" | "reels" | "carousel"
      weekly_plan_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "changes_requested"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "social_media",
        "designer",
        "sdr",
        "traffic",
        "leader",
        "videomaker",
        "editor",
        "closer",
      ],
      art_status: [
        "pending_briefing",
        "ready_for_production",
        "in_production",
        "awaiting_approval",
        "revision_requested",
        "approved",
      ],
      art_type: ["post_instagram", "story", "carrossel", "anuncio", "feed"],
      audiovisual_kind: ["monthly", "project"],
      audiovisual_status: [
        "pending_briefing",
        "briefing_done",
        "in_production",
        "awaiting_approval",
        "revision_requested",
        "approved",
        "published",
        "awaiting_capture",
        "captured",
        "in_editing",
        "cancelled",
      ],
      weekly_plan_item_status: ["pending", "approved", "changes_requested"],
      weekly_plan_post_type: ["feed", "reels", "carousel"],
      weekly_plan_status: [
        "draft",
        "pending_approval",
        "approved",
        "changes_requested",
      ],
    },
  },
} as const
