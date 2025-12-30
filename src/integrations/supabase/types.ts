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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      additional_expenses: {
        Row: {
          amount: number
          bill_url: string | null
          category: string
          created_at: string
          custom_category: string | null
          description: string | null
          expense_date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          bill_url?: string | null
          category: string
          created_at?: string
          custom_category?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bill_url?: string | null
          category?: string
          created_at?: string
          custom_category?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feature_feedback: {
        Row: {
          created_at: string | null
          feature: string
          feedback_type: string
          id: string
          retailer_id: string | null
          user_id: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string | null
          feature: string
          feedback_type: string
          id?: string
          retailer_id?: string | null
          user_id?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string | null
          feature?: string
          feedback_type?: string
          id?: string
          retailer_id?: string | null
          user_id?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feature_feedback_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feature_feedback_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_likes: {
        Row: {
          created_at: string
          id: string
          liked_at: string
          page_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked_at?: string
          page_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked_at?: string
          page_type?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_views: {
        Row: {
          created_at: string
          id: string
          user_id: string
          viewed_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          viewed_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          viewed_at?: string
          visit_id?: string
        }
        Relationships: []
      }
      approvers: {
        Row: {
          approver_level: number
          created_at: string
          department: string | null
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approver_level: number
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approver_level?: number
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in_address: string | null
          check_in_location: Json | null
          check_in_photo_url: string | null
          check_in_time: string | null
          check_out_address: string | null
          check_out_location: Json | null
          check_out_photo_url: string | null
          check_out_time: string | null
          created_at: string
          date: string
          face_match_confidence: number | null
          face_match_confidence_out: number | null
          face_verification_status: string | null
          face_verification_status_out: string | null
          id: string
          notes: string | null
          status: string
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_address?: string | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          face_match_confidence?: number | null
          face_match_confidence_out?: number | null
          face_verification_status?: string | null
          face_verification_status_out?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_address?: string | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          face_match_confidence?: number | null
          face_match_confidence_out?: number | null
          face_verification_status?: string | null
          face_verification_status_out?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_color: string | null
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string | null
          icon: string
          id: string
          name: string
        }
        Insert: {
          badge_color?: string | null
          created_at?: string
          criteria_type: string
          criteria_value: number
          description?: string | null
          icon: string
          id?: string
          name: string
        }
        Update: {
          badge_color?: string | null
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      beat_allowances: {
        Row: {
          average_km: number | null
          average_time_minutes: number | null
          beat_id: string
          beat_name: string
          created_at: string
          daily_allowance: number
          id: string
          travel_allowance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id: string
          beat_name: string
          created_at?: string
          daily_allowance?: number
          id?: string
          travel_allowance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id?: string
          beat_name?: string
          created_at?: string
          daily_allowance?: number
          id?: string
          travel_allowance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beat_plans: {
        Row: {
          beat_data: Json
          beat_id: string
          beat_name: string
          created_at: string
          id: string
          joint_sales_manager_id: string | null
          plan_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          beat_data?: Json
          beat_id: string
          beat_name: string
          created_at?: string
          id?: string
          joint_sales_manager_id?: string | null
          plan_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          beat_data?: Json
          beat_id?: string
          beat_name?: string
          created_at?: string
          id?: string
          joint_sales_manager_id?: string | null
          plan_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beats: {
        Row: {
          average_km: number | null
          average_time_minutes: number | null
          beat_id: string
          beat_name: string
          category: string | null
          created_at: string
          created_by: string | null
          distributor_id: string | null
          id: string
          is_active: boolean | null
          territory_id: string | null
          travel_allowance: number | null
          updated_at: string
        }
        Insert: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id: string
          beat_name: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          distributor_id?: string | null
          id?: string
          is_active?: boolean | null
          territory_id?: string | null
          travel_allowance?: number | null
          updated_at?: string
        }
        Update: {
          average_km?: number | null
          average_time_minutes?: number | null
          beat_id?: string
          beat_name?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          distributor_id?: string | null
          id?: string
          is_active?: boolean | null
          territory_id?: string | null
          travel_allowance?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beats_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beats_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_request_items: {
        Row: {
          approved_budget: number | null
          asset_type: string
          branding_request_id: string | null
          created_at: string
          current_stage: string | null
          due_date: string | null
          id: string
          pending_status: string | null
          preferred_vendor: string | null
          updated_at: string
          vendor_budget: number | null
          vendor_confirmation_status: string | null
        }
        Insert: {
          approved_budget?: number | null
          asset_type: string
          branding_request_id?: string | null
          created_at?: string
          current_stage?: string | null
          due_date?: string | null
          id?: string
          pending_status?: string | null
          preferred_vendor?: string | null
          updated_at?: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
        }
        Update: {
          approved_budget?: number | null
          asset_type?: string
          branding_request_id?: string | null
          created_at?: string
          current_stage?: string | null
          due_date?: string | null
          id?: string
          pending_status?: string | null
          preferred_vendor?: string | null
          updated_at?: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branding_request_items_branding_request_id_fkey"
            columns: ["branding_request_id"]
            isOneToOne: false
            referencedRelation: "branding_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_requests: {
        Row: {
          approved_at: string | null
          assigned_vendor_id: string | null
          budget: number | null
          contract_document_url: string | null
          created_at: string
          description: string | null
          due_date: string | null
          executed_at: string | null
          id: string
          implementation_date: string | null
          implementation_photo_urls: string[] | null
          manager_comments: string | null
          manager_id: string | null
          measurement_photo_urls: string[] | null
          order_impact_notes: string | null
          pincode: string | null
          post_implementation_notes: string | null
          procurement_id: string | null
          requested_assets: string | null
          retailer_feedback_on_branding: string | null
          retailer_id: string
          size: string | null
          status: Database["public"]["Enums"]["branding_status"]
          title: string | null
          updated_at: string
          user_id: string
          vendor_budget: number | null
          vendor_confirmation_status: string | null
          vendor_due_date: string | null
          vendor_feedback: string | null
          vendor_rating: number | null
          verification_photo_url: string | null
          visit_id: string
        }
        Insert: {
          approved_at?: string | null
          assigned_vendor_id?: string | null
          budget?: number | null
          contract_document_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          executed_at?: string | null
          id?: string
          implementation_date?: string | null
          implementation_photo_urls?: string[] | null
          manager_comments?: string | null
          manager_id?: string | null
          measurement_photo_urls?: string[] | null
          order_impact_notes?: string | null
          pincode?: string | null
          post_implementation_notes?: string | null
          procurement_id?: string | null
          requested_assets?: string | null
          retailer_feedback_on_branding?: string | null
          retailer_id: string
          size?: string | null
          status?: Database["public"]["Enums"]["branding_status"]
          title?: string | null
          updated_at?: string
          user_id: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
          vendor_due_date?: string | null
          vendor_feedback?: string | null
          vendor_rating?: number | null
          verification_photo_url?: string | null
          visit_id: string
        }
        Update: {
          approved_at?: string | null
          assigned_vendor_id?: string | null
          budget?: number | null
          contract_document_url?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          executed_at?: string | null
          id?: string
          implementation_date?: string | null
          implementation_photo_urls?: string[] | null
          manager_comments?: string | null
          manager_id?: string | null
          measurement_photo_urls?: string[] | null
          order_impact_notes?: string | null
          pincode?: string | null
          post_implementation_notes?: string | null
          procurement_id?: string | null
          requested_assets?: string | null
          retailer_feedback_on_branding?: string | null
          retailer_id?: string
          size?: string | null
          status?: Database["public"]["Enums"]["branding_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
          vendor_budget?: number | null
          vendor_confirmation_status?: string | null
          vendor_due_date?: string | null
          vendor_feedback?: string | null
          vendor_rating?: number | null
          verification_photo_url?: string | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branding_requests_assigned_vendor_id_fkey"
            columns: ["assigned_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          message_id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          message_id: string
          rating?: number | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          message_id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_badges: {
        Row: {
          badge_color: string | null
          created_at: string
          criteria_competency_id: string | null
          criteria_type: string
          criteria_value: number
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          points_awarded: number | null
        }
        Insert: {
          badge_color?: string | null
          created_at?: string
          criteria_competency_id?: string | null
          criteria_type: string
          criteria_value: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          points_awarded?: number | null
        }
        Update: {
          badge_color?: string | null
          created_at?: string
          criteria_competency_id?: string | null
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          points_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_badges_criteria_competency_id_fkey"
            columns: ["criteria_competency_id"]
            isOneToOne: false
            referencedRelation: "coach_competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string | null
          metadata: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string | null
          metadata?: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string | null
          metadata?: Json | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_competencies: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      coach_daily_nudges: {
        Row: {
          created_at: string
          delivered_at: string | null
          id: string
          is_delivered: boolean | null
          is_interacted: boolean | null
          message: string | null
          nudge_type: string
          reference_id: string | null
          scheduled_for: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_delivered?: boolean | null
          is_interacted?: boolean | null
          message?: string | null
          nudge_type: string
          reference_id?: string | null
          scheduled_for?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_delivered?: boolean | null
          is_interacted?: boolean | null
          message?: string | null
          nudge_type?: string
          reference_id?: string | null
          scheduled_for?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coach_feedback: {
        Row: {
          created_at: string
          feedback_text: string | null
          id: string
          is_helpful: boolean | null
          rating: number | null
          reference_id: string | null
          reference_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_helpful?: boolean | null
          rating?: number | null
          reference_id?: string | null
          reference_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          is_helpful?: boolean | null
          rating?: number | null
          reference_id?: string | null
          reference_type?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_learning_content: {
        Row: {
          competency_id: string | null
          content_body: string | null
          content_type: string
          content_url: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          points_on_completion: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          competency_id?: string | null
          content_body?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          points_on_completion?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          competency_id?: string | null
          content_body?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          points_on_completion?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_learning_content_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "coach_competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_quiz_attempts: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string | null
          user_answer: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          user_answer?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          user_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_quiz_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "coach_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_quiz_questions: {
        Row: {
          competency_id: string | null
          correct_answer: string
          created_at: string
          difficulty_level: string | null
          explanation: string | null
          id: string
          is_active: boolean | null
          learning_content_id: string | null
          options: Json | null
          points: number | null
          question: string
          question_type: string | null
        }
        Insert: {
          competency_id?: string | null
          correct_answer: string
          created_at?: string
          difficulty_level?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          learning_content_id?: string | null
          options?: Json | null
          points?: number | null
          question: string
          question_type?: string | null
        }
        Update: {
          competency_id?: string | null
          correct_answer?: string
          created_at?: string
          difficulty_level?: string | null
          explanation?: string | null
          id?: string
          is_active?: boolean | null
          learning_content_id?: string | null
          options?: Json | null
          points?: number | null
          question?: string
          question_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_quiz_questions_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "coach_competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_quiz_questions_learning_content_id_fkey"
            columns: ["learning_content_id"]
            isOneToOne: false
            referencedRelation: "coach_learning_content"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_scenario_attempts: {
        Row: {
          answered_at: string
          id: string
          is_best_choice: boolean | null
          points_earned: number | null
          scenario_id: string | null
          selected_option: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_best_choice?: boolean | null
          points_earned?: number | null
          scenario_id?: string | null
          selected_option?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_best_choice?: boolean | null
          points_earned?: number | null
          scenario_id?: string | null
          selected_option?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_scenario_attempts_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "coach_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_scenarios: {
        Row: {
          best_option: string
          competency_id: string | null
          created_at: string
          difficulty_level: string | null
          feedback: Json | null
          id: string
          is_active: boolean | null
          options: Json | null
          points: number | null
          scenario_text: string
          scenario_type: string | null
          title: string
        }
        Insert: {
          best_option: string
          competency_id?: string | null
          created_at?: string
          difficulty_level?: string | null
          feedback?: Json | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          points?: number | null
          scenario_text: string
          scenario_type?: string | null
          title: string
        }
        Update: {
          best_option?: string
          competency_id?: string | null
          created_at?: string
          difficulty_level?: string | null
          feedback?: Json | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          points?: number | null
          scenario_text?: string
          scenario_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_scenarios_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "coach_competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_user_badges: {
        Row: {
          badge_id: string | null
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id?: string | null
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string | null
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "coach_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_user_competency_scores: {
        Row: {
          competency_id: string | null
          created_at: string
          current_score: number | null
          id: string
          last_calculated_at: string
          learning_engagement_score: number | null
          practical_score: number | null
          previous_score: number | null
          quiz_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          competency_id?: string | null
          created_at?: string
          current_score?: number | null
          id?: string
          last_calculated_at?: string
          learning_engagement_score?: number | null
          practical_score?: number | null
          previous_score?: number | null
          quiz_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          competency_id?: string | null
          created_at?: string
          current_score?: number | null
          id?: string
          last_calculated_at?: string
          learning_engagement_score?: number | null
          practical_score?: number | null
          previous_score?: number | null
          quiz_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_user_competency_scores_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "coach_competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_user_overall_scores: {
        Row: {
          created_at: string
          id: string
          last_calculated_at: string
          overall_competency_score: number | null
          overall_learning_score: number | null
          rank_percentile: number | null
          total_content_completed: number | null
          total_correct_answers: number | null
          total_points_earned: number | null
          total_quizzes_attempted: number | null
          total_scenarios_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_calculated_at?: string
          overall_competency_score?: number | null
          overall_learning_score?: number | null
          rank_percentile?: number | null
          total_content_completed?: number | null
          total_correct_answers?: number | null
          total_points_earned?: number | null
          total_quizzes_attempted?: number | null
          total_scenarios_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_calculated_at?: string
          overall_competency_score?: number | null
          overall_learning_score?: number | null
          rank_percentile?: number | null
          total_content_completed?: number | null
          total_correct_answers?: number | null
          total_points_earned?: number | null
          total_quizzes_attempted?: number | null
          total_scenarios_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_user_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          learning_content_id: string | null
          progress_percent: number | null
          started_at: string | null
          status: string | null
          time_spent_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          learning_content_id?: string | null
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          learning_content_id?: string | null
          progress_percent?: number | null
          started_at?: string | null
          status?: string | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_user_progress_learning_content_id_fkey"
            columns: ["learning_content_id"]
            isOneToOne: false
            referencedRelation: "coach_learning_content"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_user_streaks: {
        Row: {
          created_at: string
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          total_learning_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          total_learning_days?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          total_learning_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          account_holder_name: string | null
          address: string | null
          bank_account: string | null
          bank_name: string | null
          contact_phone: string | null
          created_at: string | null
          email: string | null
          gstin: string | null
          id: string
          ifsc: string | null
          invoice_template: string | null
          logo_url: string | null
          name: string
          qr_code_url: string | null
          qr_upi: string | null
          state: string | null
          terms_conditions: string | null
          updated_at: string | null
        }
        Insert: {
          account_holder_name?: string | null
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          ifsc?: string | null
          invoice_template?: string | null
          logo_url?: string | null
          name: string
          qr_code_url?: string | null
          qr_upi?: string | null
          state?: string | null
          terms_conditions?: string | null
          updated_at?: string | null
        }
        Update: {
          account_holder_name?: string | null
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          ifsc?: string | null
          invoice_template?: string | null
          logo_url?: string | null
          name?: string
          qr_code_url?: string | null
          qr_upi?: string | null
          state?: string | null
          terms_conditions?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      competencies: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          level_definitions: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          level_definitions?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          level_definitions?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      competition_contacts: {
        Row: {
          competitor_id: string
          competitor_since: number | null
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string
          designation: string | null
          hq: string | null
          id: string
          is_active: boolean | null
          level: string | null
          region_covered: string | null
          reporting_to: string | null
          role: string | null
          skill: string | null
          updated_at: string
        }
        Insert: {
          competitor_id: string
          competitor_since?: number | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          designation?: string | null
          hq?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          region_covered?: string | null
          reporting_to?: string | null
          role?: string | null
          skill?: string | null
          updated_at?: string
        }
        Update: {
          competitor_id?: string
          competitor_since?: number | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          designation?: string | null
          hq?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          region_covered?: string | null
          reporting_to?: string | null
          role?: string | null
          skill?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_contacts_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competition_master"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_data: {
        Row: {
          competitor_id: string
          created_at: string
          id: string
          impact_level: string | null
          insight: string | null
          needs_attention: boolean | null
          photo_urls: string[] | null
          retailer_id: string
          selling_price: number | null
          sku_id: string | null
          stock_quantity: number | null
          unit: string | null
          updated_at: string
          user_id: string
          visit_id: string | null
          voice_note_urls: string[] | null
        }
        Insert: {
          competitor_id: string
          created_at?: string
          id?: string
          impact_level?: string | null
          insight?: string | null
          needs_attention?: boolean | null
          photo_urls?: string[] | null
          retailer_id: string
          selling_price?: number | null
          sku_id?: string | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
          visit_id?: string | null
          voice_note_urls?: string[] | null
        }
        Update: {
          competitor_id?: string
          created_at?: string
          id?: string
          impact_level?: string | null
          insight?: string | null
          needs_attention?: boolean | null
          photo_urls?: string[] | null
          retailer_id?: string
          selling_price?: number | null
          sku_id?: string | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          visit_id?: string | null
          voice_note_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "competition_data_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competition_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_data_sku_id_fkey"
            columns: ["sku_id"]
            isOneToOne: false
            referencedRelation: "competition_skus"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_insights: {
        Row: {
          action_required: boolean | null
          additional_notes: string | null
          category: string | null
          competitor_image_url: string
          competitor_name: string
          created_at: string
          description: string
          id: string
          impact_level: string | null
          insight_type: string
          location_info: string | null
          price_info: string | null
          product_category: string | null
          product_details: string | null
          retailer_id: string
          shelf_space: string | null
          updated_at: string
          user_id: string
          visit_id: string | null
        }
        Insert: {
          action_required?: boolean | null
          additional_notes?: string | null
          category?: string | null
          competitor_image_url?: string
          competitor_name: string
          created_at?: string
          description: string
          id?: string
          impact_level?: string | null
          insight_type: string
          location_info?: string | null
          price_info?: string | null
          product_category?: string | null
          product_details?: string | null
          retailer_id: string
          shelf_space?: string | null
          updated_at?: string
          user_id: string
          visit_id?: string | null
        }
        Update: {
          action_required?: boolean | null
          additional_notes?: string | null
          category?: string | null
          competitor_image_url?: string
          competitor_name?: string
          created_at?: string
          description?: string
          id?: string
          impact_level?: string | null
          insight_type?: string
          location_info?: string | null
          price_info?: string | null
          product_category?: string | null
          product_details?: string | null
          retailer_id?: string
          shelf_space?: string | null
          updated_at?: string
          user_id?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      competition_master: {
        Row: {
          business_background: string | null
          competitor_name: string
          created_at: string
          focus: string | null
          head_office: string | null
          id: string
          key_financial_stats: Json | null
          regional_offices_count: number | null
          sales_team_size: number | null
          strategy: string | null
          supply_chain_info: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          business_background?: string | null
          competitor_name: string
          created_at?: string
          focus?: string | null
          head_office?: string | null
          id?: string
          key_financial_stats?: Json | null
          regional_offices_count?: number | null
          sales_team_size?: number | null
          strategy?: string | null
          supply_chain_info?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          business_background?: string | null
          competitor_name?: string
          created_at?: string
          focus?: string | null
          head_office?: string | null
          id?: string
          key_financial_stats?: Json | null
          regional_offices_count?: number | null
          sales_team_size?: number | null
          strategy?: string | null
          supply_chain_info?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      competition_skus: {
        Row: {
          competitor_id: string
          created_at: string
          id: string
          is_active: boolean | null
          sku_name: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          competitor_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          sku_name: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          competitor_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          sku_name?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_skus_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competition_master"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_management_config: {
        Row: {
          config_name: string | null
          created_at: string | null
          credit_multiplier: number
          id: string
          is_active: boolean | null
          is_enabled: boolean
          lookback_period_months: number
          new_retailer_starting_score: number
          payment_term_days: number
          scoring_mode: string
          target_growth_rate_percent: number | null
          target_order_frequency: number | null
          territory_ids: string[]
          updated_at: string | null
          weight_growth_rate: number
          weight_order_frequency: number
          weight_repayment_dso: number
        }
        Insert: {
          config_name?: string | null
          created_at?: string | null
          credit_multiplier?: number
          id?: string
          is_active?: boolean | null
          is_enabled?: boolean
          lookback_period_months?: number
          new_retailer_starting_score?: number
          payment_term_days?: number
          scoring_mode?: string
          target_growth_rate_percent?: number | null
          target_order_frequency?: number | null
          territory_ids?: string[]
          updated_at?: string | null
          weight_growth_rate?: number
          weight_order_frequency?: number
          weight_repayment_dso?: number
        }
        Update: {
          config_name?: string | null
          created_at?: string | null
          credit_multiplier?: number
          id?: string
          is_active?: boolean | null
          is_enabled?: boolean
          lookback_period_months?: number
          new_retailer_starting_score?: number
          payment_term_days?: number
          scoring_mode?: string
          target_growth_rate_percent?: number | null
          target_order_frequency?: number | null
          territory_ids?: string[]
          updated_at?: string | null
          weight_growth_rate?: number
          weight_order_frequency?: number
          weight_repayment_dso?: number
        }
        Relationships: []
      }
      custom_invoice_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_file_url: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_file_url: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_file_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          gstin: string | null
          id: string
          name: string
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          gstin?: string | null
          id?: string
          name: string
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          gstin?: string | null
          id?: string
          name?: string
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      distributor_attachments: {
        Row: {
          created_at: string | null
          distributor_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          distributor_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          distributor_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributor_attachments_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_beat_mappings: {
        Row: {
          beat_id: string
          created_at: string
          created_by: string | null
          distributor_id: string
          id: string
        }
        Insert: {
          beat_id: string
          created_at?: string
          created_by?: string | null
          distributor_id: string
          id?: string
        }
        Update: {
          beat_id?: string
          created_at?: string
          created_by?: string | null
          distributor_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributor_beat_mappings_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_beat_mappings_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_business_plan_months: {
        Row: {
          business_plan_id: string
          created_at: string
          id: string
          month_name: string
          month_number: number
          quantity_target: number | null
          target_revenue: number | null
          updated_at: string
        }
        Insert: {
          business_plan_id: string
          created_at?: string
          id?: string
          month_name: string
          month_number: number
          quantity_target?: number | null
          target_revenue?: number | null
          updated_at?: string
        }
        Update: {
          business_plan_id?: string
          created_at?: string
          id?: string
          month_name?: string
          month_number?: number
          quantity_target?: number | null
          target_revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributor_business_plan_months_business_plan_id_fkey"
            columns: ["business_plan_id"]
            isOneToOne: false
            referencedRelation: "distributor_business_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_business_plan_products: {
        Row: {
          business_plan_id: string
          created_at: string
          id: string
          product_id: string
          product_name: string
          quantity_target: number | null
          revenue_target: number | null
        }
        Insert: {
          business_plan_id: string
          created_at?: string
          id?: string
          product_id: string
          product_name: string
          quantity_target?: number | null
          revenue_target?: number | null
        }
        Update: {
          business_plan_id?: string
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          quantity_target?: number | null
          revenue_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "distributor_business_plan_products_business_plan_id_fkey"
            columns: ["business_plan_id"]
            isOneToOne: false
            referencedRelation: "distributor_business_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_business_plan_retailers: {
        Row: {
          business_plan_id: string
          created_at: string
          growth_percent: number | null
          id: string
          last_year_revenue: number | null
          quantity_target: number | null
          retailer_id: string
          retailer_name: string
          target_revenue: number | null
        }
        Insert: {
          business_plan_id: string
          created_at?: string
          growth_percent?: number | null
          id?: string
          last_year_revenue?: number | null
          quantity_target?: number | null
          retailer_id: string
          retailer_name: string
          target_revenue?: number | null
        }
        Update: {
          business_plan_id?: string
          created_at?: string
          growth_percent?: number | null
          id?: string
          last_year_revenue?: number | null
          quantity_target?: number | null
          retailer_id?: string
          retailer_name?: string
          target_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "distributor_business_plan_retailers_business_plan_id_fkey"
            columns: ["business_plan_id"]
            isOneToOne: false
            referencedRelation: "distributor_business_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_business_plans: {
        Row: {
          coverage_target: string | null
          created_at: string
          distributor_id: string
          id: string
          notes: string | null
          quantity_target: number | null
          quantity_unit: string | null
          revenue_target: number | null
          territory_target: string | null
          updated_at: string
          year: number
        }
        Insert: {
          coverage_target?: string | null
          created_at?: string
          distributor_id: string
          id?: string
          notes?: string | null
          quantity_target?: number | null
          quantity_unit?: string | null
          revenue_target?: number | null
          territory_target?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          coverage_target?: string | null
          created_at?: string
          distributor_id?: string
          id?: string
          notes?: string | null
          quantity_target?: number | null
          quantity_unit?: string | null
          revenue_target?: number | null
          territory_target?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "distributor_business_plans_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_claims: {
        Row: {
          approved_amount: number | null
          bill_urls: string[] | null
          claim_amount: number
          claim_date: string
          claim_number: string
          claim_type: string
          created_at: string
          created_by_user_id: string | null
          damage_reason: string | null
          description: string | null
          distributor_id: string
          expense_category: string | null
          expense_date: string | null
          id: string
          km_traveled: number | null
          paid_at: string | null
          payment_reference: string | null
          product_details: Json | null
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheme_name: string | null
          scheme_period: string | null
          status: string
          supporting_docs: string[] | null
          target_achieved: number | null
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          approved_amount?: number | null
          bill_urls?: string[] | null
          claim_amount?: number
          claim_date?: string
          claim_number: string
          claim_type: string
          created_at?: string
          created_by_user_id?: string | null
          damage_reason?: string | null
          description?: string | null
          distributor_id: string
          expense_category?: string | null
          expense_date?: string | null
          id?: string
          km_traveled?: number | null
          paid_at?: string | null
          payment_reference?: string | null
          product_details?: Json | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheme_name?: string | null
          scheme_period?: string | null
          status?: string
          supporting_docs?: string[] | null
          target_achieved?: number | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          approved_amount?: number | null
          bill_urls?: string[] | null
          claim_amount?: number
          claim_date?: string
          claim_number?: string
          claim_type?: string
          created_at?: string
          created_by_user_id?: string | null
          damage_reason?: string | null
          description?: string | null
          distributor_id?: string
          expense_category?: string | null
          expense_date?: string | null
          id?: string
          km_traveled?: number | null
          paid_at?: string | null
          payment_reference?: string | null
          product_details?: Json | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheme_name?: string | null
          scheme_period?: string | null
          status?: string
          supporting_docs?: string[] | null
          target_achieved?: number | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributor_claims_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_contacts: {
        Row: {
          address: string | null
          birth_date: string | null
          contact_name: string
          created_at: string | null
          designation: string | null
          distributor_id: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          phone: string | null
          reports_to: string | null
          role: string | null
          updated_at: string | null
          years_of_experience: number | null
          years_with_distributor: number | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          contact_name: string
          created_at?: string | null
          designation?: string | null
          distributor_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          phone?: string | null
          reports_to?: string | null
          role?: string | null
          updated_at?: string | null
          years_of_experience?: number | null
          years_with_distributor?: number | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          contact_name?: string
          created_at?: string | null
          designation?: string | null
          distributor_id?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          phone?: string | null
          reports_to?: string | null
          role?: string | null
          updated_at?: string | null
          years_of_experience?: number | null
          years_with_distributor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "distributor_contacts_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_contacts_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "distributor_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_ideas: {
        Row: {
          attachment_urls: string[] | null
          category: string
          competitor_insight: string | null
          competitor_name: string | null
          created_at: string
          created_by_user_id: string | null
          description: string
          distributor_id: string
          estimated_value: number | null
          expected_impact: string | null
          id: string
          idea_number: string
          implementation_date: string | null
          implementation_effort: string | null
          implementation_status: string | null
          market_segment: string | null
          points_awarded: number | null
          recognition_notes: string | null
          region: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_packaging: string | null
          suggested_price_range: string | null
          suggested_product: string | null
          target_audience: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attachment_urls?: string[] | null
          category: string
          competitor_insight?: string | null
          competitor_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description: string
          distributor_id: string
          estimated_value?: number | null
          expected_impact?: string | null
          id?: string
          idea_number: string
          implementation_date?: string | null
          implementation_effort?: string | null
          implementation_status?: string | null
          market_segment?: string | null
          points_awarded?: number | null
          recognition_notes?: string | null
          region?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_packaging?: string | null
          suggested_price_range?: string | null
          suggested_product?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attachment_urls?: string[] | null
          category?: string
          competitor_insight?: string | null
          competitor_name?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string
          distributor_id?: string
          estimated_value?: number | null
          expected_impact?: string | null
          id?: string
          idea_number?: string
          implementation_date?: string | null
          implementation_effort?: string | null
          implementation_status?: string | null
          market_segment?: string | null
          points_awarded?: number | null
          recognition_notes?: string | null
          region?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_packaging?: string | null
          suggested_price_range?: string | null
          suggested_product?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributor_ideas_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_inventory: {
        Row: {
          available_quantity: number | null
          batch_number: string | null
          created_at: string
          distributor_id: string
          expiry_date: string | null
          id: string
          last_issued_date: string | null
          last_received_date: string | null
          location: string | null
          manufacturing_date: string | null
          max_stock_level: number | null
          product_id: string
          product_name: string
          quantity: number
          reorder_level: number | null
          reserved_quantity: number
          sku: string | null
          total_value: number | null
          unit: string
          unit_cost: number | null
          updated_at: string
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          available_quantity?: number | null
          batch_number?: string | null
          created_at?: string
          distributor_id: string
          expiry_date?: string | null
          id?: string
          last_issued_date?: string | null
          last_received_date?: string | null
          location?: string | null
          manufacturing_date?: string | null
          max_stock_level?: number | null
          product_id: string
          product_name: string
          quantity?: number
          reorder_level?: number | null
          reserved_quantity?: number
          sku?: string | null
          total_value?: number | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          available_quantity?: number | null
          batch_number?: string | null
          created_at?: string
          distributor_id?: string
          expiry_date?: string | null
          id?: string
          last_issued_date?: string | null
          last_received_date?: string | null
          location?: string | null
          manufacturing_date?: string | null
          max_stock_level?: number | null
          product_id?: string
          product_name?: string
          quantity?: number
          reorder_level?: number | null
          reserved_quantity?: number
          sku?: string | null
          total_value?: number | null
          unit?: string
          unit_cost?: number | null
          updated_at?: string
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributor_inventory_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_item_mappings: {
        Row: {
          category_id: string | null
          category_name: string | null
          created_at: string
          id: string
          mapping_id: string
          product_id: string | null
          product_name: string | null
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          id?: string
          mapping_id: string
          product_id?: string | null
          product_name?: string | null
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          id?: string
          mapping_id?: string
          product_id?: string | null
          product_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributor_item_mappings_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "distributor_retailer_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_locations: {
        Row: {
          address: string | null
          city: string | null
          contact_phone: string | null
          created_at: string | null
          distributor_id: string | null
          id: string
          is_head_office: boolean | null
          location_name: string
          pincode: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string | null
          distributor_id?: string | null
          id?: string
          is_head_office?: boolean | null
          location_name: string
          pincode?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string | null
          distributor_id?: string | null
          id?: string
          is_head_office?: boolean | null
          location_name?: string
          pincode?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distributor_locations_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_price_books: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          deactivated_at: string | null
          distributor_id: string
          id: string
          is_active: boolean | null
          price_book_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          deactivated_at?: string | null
          distributor_id: string
          id?: string
          is_active?: boolean | null
          price_book_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          deactivated_at?: string | null
          distributor_id?: string
          id?: string
          is_active?: boolean | null
          price_book_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributor_price_books_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributor_price_books_price_book_id_fkey"
            columns: ["price_book_id"]
            isOneToOne: false
            referencedRelation: "price_books"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_retailer_mappings: {
        Row: {
          created_at: string
          distributor_id: string
          id: string
          mapping_type: string
          retailer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distributor_id: string
          id?: string
          mapping_type?: string
          retailer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          distributor_id?: string
          id?: string
          mapping_type?: string
          retailer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      distributor_support_requests: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          attachment_urls: string[] | null
          category: string
          created_at: string
          created_by_user_id: string | null
          description: string
          distributor_id: string
          feedback_comment: string | null
          id: string
          priority: string
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          satisfaction_rating: number | null
          screenshot_urls: string[] | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          attachment_urls?: string[] | null
          category: string
          created_at?: string
          created_by_user_id?: string | null
          description: string
          distributor_id: string
          feedback_comment?: string | null
          id?: string
          priority?: string
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          satisfaction_rating?: number | null
          screenshot_urls?: string[] | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          attachment_urls?: string[] | null
          category?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string
          distributor_id?: string
          feedback_comment?: string | null
          id?: string
          priority?: string
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          satisfaction_rating?: number | null
          screenshot_urls?: string[] | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributor_support_requests_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      distributor_users: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auth_user_id: string | null
          created_at: string
          designation: string | null
          distributor_id: string
          email: string
          email_sent_at: string | null
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          password_set_at: string | null
          phone: string | null
          requested_at: string | null
          role: string
          updated_at: string
          user_level: string | null
          user_status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auth_user_id?: string | null
          created_at?: string
          designation?: string | null
          distributor_id: string
          email: string
          email_sent_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_set_at?: string | null
          phone?: string | null
          requested_at?: string | null
          role?: string
          updated_at?: string
          user_level?: string | null
          user_status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auth_user_id?: string | null
          created_at?: string
          designation?: string | null
          distributor_id?: string
          email?: string
          email_sent_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_set_at?: string | null
          phone?: string | null
          requested_at?: string | null
          role?: string
          updated_at?: string
          user_level?: string | null
          user_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "distributor_users_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      distributors: {
        Row: {
          about_business: string | null
          address: string | null
          annual_revenue: number | null
          assets_trucks: number | null
          assets_vans: number | null
          business_hunger: string | null
          competition_products: string[] | null
          contact_person: string
          coverage_area: string | null
          created_at: string
          credit_limit: number | null
          distribution_experience_years: number | null
          distribution_level: string | null
          distributor_status: string | null
          drop_reason: string | null
          email: string | null
          established_year: number | null
          evaluation_checklist: Json | null
          gst_number: string | null
          id: string
          name: string
          network_retailers_count: number | null
          onboarding_date: string | null
          opportunities: string | null
          other_products: string[] | null
          outstanding_amount: number | null
          parent_id: string | null
          parent_type: string | null
          partnership_status: string | null
          phone: string
          products_distributed: string[] | null
          profitability: string | null
          region_coverage: string | null
          sales_team_size: number | null
          status: string
          strength: string | null
          territory_id: string | null
          threats: string | null
          updated_at: string
          weakness: string | null
          years_of_relationship: number | null
        }
        Insert: {
          about_business?: string | null
          address?: string | null
          annual_revenue?: number | null
          assets_trucks?: number | null
          assets_vans?: number | null
          business_hunger?: string | null
          competition_products?: string[] | null
          contact_person: string
          coverage_area?: string | null
          created_at?: string
          credit_limit?: number | null
          distribution_experience_years?: number | null
          distribution_level?: string | null
          distributor_status?: string | null
          drop_reason?: string | null
          email?: string | null
          established_year?: number | null
          evaluation_checklist?: Json | null
          gst_number?: string | null
          id?: string
          name: string
          network_retailers_count?: number | null
          onboarding_date?: string | null
          opportunities?: string | null
          other_products?: string[] | null
          outstanding_amount?: number | null
          parent_id?: string | null
          parent_type?: string | null
          partnership_status?: string | null
          phone: string
          products_distributed?: string[] | null
          profitability?: string | null
          region_coverage?: string | null
          sales_team_size?: number | null
          status?: string
          strength?: string | null
          territory_id?: string | null
          threats?: string | null
          updated_at?: string
          weakness?: string | null
          years_of_relationship?: number | null
        }
        Update: {
          about_business?: string | null
          address?: string | null
          annual_revenue?: number | null
          assets_trucks?: number | null
          assets_vans?: number | null
          business_hunger?: string | null
          competition_products?: string[] | null
          contact_person?: string
          coverage_area?: string | null
          created_at?: string
          credit_limit?: number | null
          distribution_experience_years?: number | null
          distribution_level?: string | null
          distributor_status?: string | null
          drop_reason?: string | null
          email?: string | null
          established_year?: number | null
          evaluation_checklist?: Json | null
          gst_number?: string | null
          id?: string
          name?: string
          network_retailers_count?: number | null
          onboarding_date?: string | null
          opportunities?: string | null
          other_products?: string[] | null
          outstanding_amount?: number | null
          parent_id?: string | null
          parent_type?: string | null
          partnership_status?: string | null
          phone?: string
          products_distributed?: string[] | null
          profitability?: string | null
          region_coverage?: string | null
          sales_team_size?: number | null
          status?: string
          strength?: string | null
          territory_id?: string | null
          threats?: string | null
          updated_at?: string
          weakness?: string | null
          years_of_relationship?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "distributors_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distributors_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string | null
          badge_name: string
          badge_type: string
          created_at: string
          id: string
          issued_at: string
          issued_by: string | null
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_name: string
          badge_type: string
          created_at?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_name?: string
          badge_type?: string
          created_at?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      employee_competencies: {
        Row: {
          assessed_at: string | null
          assessed_by: string | null
          competency_id: string
          created_at: string
          current_level: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assessed_at?: string | null
          assessed_by?: string | null
          competency_id: string
          created_at?: string
          current_level: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assessed_at?: string | null
          assessed_by?: string | null
          competency_id?: string
          created_at?: string
          current_level?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_connections: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          content_type: string | null
          created_at: string
          doc_type: Database["public"]["Enums"]["employee_doc_type"]
          file_name: string | null
          file_path: string
          id: string
          uploaded_by: string
          user_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          doc_type: Database["public"]["Enums"]["employee_doc_type"]
          file_name?: string | null
          file_path: string
          id?: string
          uploaded_by: string
          user_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          doc_type?: Database["public"]["Enums"]["employee_doc_type"]
          file_name?: string | null
          file_path?: string
          id?: string
          uploaded_by?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_recommendations: {
        Row: {
          created_at: string
          id: string
          recommendation_text: string
          recommender_id: string
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recommendation_text: string
          recommender_id: string
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recommendation_text?: string
          recommender_id?: string
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          aadhar_document_url: string | null
          address: string | null
          alternate_email: string | null
          band: number | null
          certifications: Json | null
          created_at: string
          daily_da_allowance: number | null
          date_of_exit: string | null
          date_of_joining: string | null
          district_territory_id: string | null
          education: string | null
          education_background: Json | null
          emergency_contact_number: string | null
          expertise_areas: string[] | null
          hq: string | null
          hq_territory_id: string | null
          manager_id: string | null
          monthly_salary: number | null
          pan_document_url: string | null
          photo_url: string | null
          secondary_manager_id: string | null
          state_territory_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aadhar_document_url?: string | null
          address?: string | null
          alternate_email?: string | null
          band?: number | null
          certifications?: Json | null
          created_at?: string
          daily_da_allowance?: number | null
          date_of_exit?: string | null
          date_of_joining?: string | null
          district_territory_id?: string | null
          education?: string | null
          education_background?: Json | null
          emergency_contact_number?: string | null
          expertise_areas?: string[] | null
          hq?: string | null
          hq_territory_id?: string | null
          manager_id?: string | null
          monthly_salary?: number | null
          pan_document_url?: string | null
          photo_url?: string | null
          secondary_manager_id?: string | null
          state_territory_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aadhar_document_url?: string | null
          address?: string | null
          alternate_email?: string | null
          band?: number | null
          certifications?: Json | null
          created_at?: string
          daily_da_allowance?: number | null
          date_of_exit?: string | null
          date_of_joining?: string | null
          district_territory_id?: string | null
          education?: string | null
          education_background?: Json | null
          emergency_contact_number?: string | null
          expertise_areas?: string[] | null
          hq?: string | null
          hq_territory_id?: string | null
          manager_id?: string | null
          monthly_salary?: number | null
          pan_document_url?: string | null
          photo_url?: string | null
          secondary_manager_id?: string | null
          state_territory_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_district_territory_id_fkey"
            columns: ["district_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_hq_territory_id_fkey"
            columns: ["hq_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_state_territory_id_fkey"
            columns: ["state_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_master_config: {
        Row: {
          created_at: string
          da_amount: number | null
          fixed_ta_amount: number | null
          id: string
          ta_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          da_amount?: number | null
          fixed_ta_amount?: number | null
          id?: string
          ta_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          da_amount?: number | null
          fixed_ta_amount?: number | null
          id?: string
          ta_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      feature_flag_audit: {
        Row: {
          changed_at: string
          changed_by: string
          feature_flag_id: string
          id: string
          new_value: boolean
          old_value: boolean
        }
        Insert: {
          changed_at?: string
          changed_by: string
          feature_flag_id: string
          id?: string
          new_value: boolean
          old_value: boolean
        }
        Update: {
          changed_at?: string
          changed_by?: string
          feature_flag_id?: string
          id?: string
          new_value?: boolean
          old_value?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_audit_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      gamification_actions: {
        Row: {
          action_name: string
          action_type: string
          base_daily_target: number | null
          consecutive_orders_required: number | null
          created_at: string
          focused_products: string[] | null
          game_id: string
          id: string
          is_enabled: boolean | null
          max_awardable_activities: number | null
          max_daily_awards: number | null
          metadata: Json | null
          min_growth_percentage: number | null
          points: number
          target_type: string | null
          updated_at: string
        }
        Insert: {
          action_name: string
          action_type: string
          base_daily_target?: number | null
          consecutive_orders_required?: number | null
          created_at?: string
          focused_products?: string[] | null
          game_id: string
          id?: string
          is_enabled?: boolean | null
          max_awardable_activities?: number | null
          max_daily_awards?: number | null
          metadata?: Json | null
          min_growth_percentage?: number | null
          points?: number
          target_type?: string | null
          updated_at?: string
        }
        Update: {
          action_name?: string
          action_type?: string
          base_daily_target?: number | null
          consecutive_orders_required?: number | null
          created_at?: string
          focused_products?: string[] | null
          game_id?: string
          id?: string
          is_enabled?: boolean | null
          max_awardable_activities?: number | null
          max_daily_awards?: number | null
          metadata?: Json | null
          min_growth_percentage?: number | null
          points?: number
          target_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_actions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "gamification_games"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_daily_tracking: {
        Row: {
          action_id: string
          count: number | null
          created_at: string | null
          id: string
          tracking_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_id: string
          count?: number | null
          created_at?: string | null
          id?: string
          tracking_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_id?: string
          count?: number | null
          created_at?: string | null
          id?: string
          tracking_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_daily_tracking_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "gamification_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_games: {
        Row: {
          baseline_target: number | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          is_all_territories: boolean | null
          name: string
          points_to_rupee_conversion: number
          start_date: string
          territories: string[] | null
          updated_at: string
        }
        Insert: {
          baseline_target?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          is_all_territories?: boolean | null
          name: string
          points_to_rupee_conversion?: number
          start_date: string
          territories?: string[] | null
          updated_at?: string
        }
        Update: {
          baseline_target?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_all_territories?: boolean | null
          name?: string
          points_to_rupee_conversion?: number
          start_date?: string
          territories?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      gamification_points: {
        Row: {
          action_id: string
          earned_at: string
          game_id: string
          id: string
          metadata: Json | null
          points: number
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          action_id: string
          earned_at?: string
          game_id: string
          id?: string
          metadata?: Json | null
          points: number
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          action_id?: string
          earned_at?: string
          game_id?: string
          id?: string
          metadata?: Json | null
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_points_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "gamification_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_points_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "gamification_games"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_redemptions: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          points_redeemed: number
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_at: string
          status: string
          updated_at: string
          user_id: string
          voucher_amount: number
          voucher_code: string | null
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          points_redeemed: number
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id: string
          voucher_amount: number
          voucher_code?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          points_redeemed?: number
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          voucher_amount?: number
          voucher_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gamification_redemptions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "gamification_games"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_retailer_sequences: {
        Row: {
          consecutive_orders: number | null
          created_at: string | null
          id: string
          last_order_date: string | null
          retailer_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consecutive_orders?: number | null
          created_at?: string | null
          id?: string
          last_order_date?: string | null
          retailer_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consecutive_orders?: number | null
          created_at?: string | null
          id?: string
          last_order_date?: string | null
          retailer_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gps_tracking: {
        Row: {
          accuracy: number | null
          created_at: string
          date: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          timestamp: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          date?: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          timestamp?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          date?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      gps_tracking_stops: {
        Row: {
          created_at: string
          date: string
          id: string
          reason: string
          stopped_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          reason: string
          stopped_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          reason?: string
          stopped_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          created_by: string
          date: string
          description: string | null
          holiday_name: string
          id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          description?: string | null
          holiday_name: string
          id?: string
          updated_at?: string
          year?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          description?: string | null
          holiday_name?: string
          id?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      inst_accounts: {
        Row: {
          account_name: string
          account_owner: string | null
          account_type: string | null
          annual_revenue: number | null
          billing_address: string | null
          city: string | null
          created_at: string
          credit_limit: number | null
          email: string | null
          employee_count: number | null
          gst_number: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          pan_number: string | null
          parent_account_id: string | null
          payment_terms: number | null
          phone: string | null
          pincode: string | null
          shipping_address: string | null
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_name: string
          account_owner?: string | null
          account_type?: string | null
          annual_revenue?: number | null
          billing_address?: string | null
          city?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          employee_count?: number | null
          gst_number?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          pan_number?: string | null
          parent_account_id?: string | null
          payment_terms?: number | null
          phone?: string | null
          pincode?: string | null
          shipping_address?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_name?: string
          account_owner?: string | null
          account_type?: string | null
          annual_revenue?: number | null
          billing_address?: string | null
          city?: string | null
          created_at?: string
          credit_limit?: number | null
          email?: string | null
          employee_count?: number | null
          gst_number?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          pan_number?: string | null
          parent_account_id?: string | null
          payment_terms?: number | null
          phone?: string | null
          pincode?: string | null
          shipping_address?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inst_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "inst_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      inst_collections: {
        Row: {
          account_id: string
          amount: number
          bank_name: string | null
          cheque_number: string | null
          collected_by: string | null
          collection_date: string
          collection_number: string
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_method: string | null
          reference_number: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount?: number
          bank_name?: string | null
          cheque_number?: string | null
          collected_by?: string | null
          collection_date?: string
          collection_number: string
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          bank_name?: string | null
          cheque_number?: string | null
          collected_by?: string | null
          collection_date?: string
          collection_number?: string
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inst_collections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inst_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_collections_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "inst_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      inst_contacts: {
        Row: {
          account_id: string
          created_at: string
          department: string | null
          designation: string | null
          email: string | null
          first_name: string
          id: string
          is_decision_maker: boolean | null
          is_primary_contact: boolean | null
          last_name: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_decision_maker?: boolean | null
          is_primary_contact?: boolean | null
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_decision_maker?: boolean | null
          is_primary_contact?: boolean | null
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inst_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inst_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      inst_invoice_lines: {
        Row: {
          commitment_line_id: string | null
          created_at: string
          description: string | null
          discount_amount: number | null
          id: string
          invoice_id: string
          line_total: number
          product_id: string
          quantity: number
          tax_amount: number | null
          unit_price: number
        }
        Insert: {
          commitment_line_id?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          id?: string
          invoice_id: string
          line_total?: number
          product_id: string
          quantity?: number
          tax_amount?: number | null
          unit_price?: number
        }
        Update: {
          commitment_line_id?: string | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          id?: string
          invoice_id?: string
          line_total?: number
          product_id?: string
          quantity?: number
          tax_amount?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "inst_invoice_lines_commitment_line_id_fkey"
            columns: ["commitment_line_id"]
            isOneToOne: false
            referencedRelation: "inst_order_commitment_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "inst_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_invoice_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inst_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inst_invoices: {
        Row: {
          account_id: string
          balance_amount: number | null
          created_at: string
          created_by: string
          discount_amount: number | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          order_commitment_id: string | null
          paid_amount: number | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          account_id: string
          balance_amount?: number | null
          created_at?: string
          created_by: string
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          order_commitment_id?: string | null
          paid_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          balance_amount?: number | null
          created_at?: string
          created_by?: string
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          order_commitment_id?: string | null
          paid_amount?: number | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inst_invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inst_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_invoices_order_commitment_id_fkey"
            columns: ["order_commitment_id"]
            isOneToOne: false
            referencedRelation: "inst_order_commitments"
            referencedColumns: ["id"]
          },
        ]
      }
      inst_leads: {
        Row: {
          address: string | null
          annual_potential_value: number | null
          assigned_to: string | null
          city: string | null
          company_name: string
          converted_account_id: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          industry_type: string | null
          lead_name: string
          lead_source: string | null
          lead_status: string | null
          notes: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          annual_potential_value?: number | null
          assigned_to?: string | null
          city?: string | null
          company_name: string
          converted_account_id?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          industry_type?: string | null
          lead_name: string
          lead_source?: string | null
          lead_status?: string | null
          notes?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          annual_potential_value?: number | null
          assigned_to?: string | null
          city?: string | null
          company_name?: string
          converted_account_id?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          industry_type?: string | null
          lead_name?: string
          lead_source?: string | null
          lead_status?: string | null
          notes?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inst_opportunities: {
        Row: {
          account_id: string
          amount: number | null
          closed_date: string | null
          competitors: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          expected_close_date: string | null
          id: string
          lead_source: string | null
          next_step: string | null
          opportunity_name: string
          owner_id: string | null
          probability: number | null
          stage: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount?: number | null
          closed_date?: string | null
          competitors?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_source?: string | null
          next_step?: string | null
          opportunity_name: string
          owner_id?: string | null
          probability?: number | null
          stage?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number | null
          closed_date?: string | null
          competitors?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_source?: string | null
          next_step?: string | null
          opportunity_name?: string
          owner_id?: string | null
          probability?: number | null
          stage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inst_opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inst_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "inst_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      inst_order_commitment_lines: {
        Row: {
          actual_delivery_date: string | null
          actual_quantity: number | null
          actual_value: number | null
          created_at: string
          delivered_quantity: number | null
          id: string
          order_commitment_id: string
          planned_delivery_date: string | null
          planned_quantity: number
          planned_value: number | null
          product_id: string
          status: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          actual_quantity?: number | null
          actual_value?: number | null
          created_at?: string
          delivered_quantity?: number | null
          id?: string
          order_commitment_id: string
          planned_delivery_date?: string | null
          planned_quantity?: number
          planned_value?: number | null
          product_id: string
          status?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          actual_quantity?: number | null
          actual_value?: number | null
          created_at?: string
          delivered_quantity?: number | null
          id?: string
          order_commitment_id?: string
          planned_delivery_date?: string | null
          planned_quantity?: number
          planned_value?: number | null
          product_id?: string
          status?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inst_order_commitment_lines_order_commitment_id_fkey"
            columns: ["order_commitment_id"]
            isOneToOne: false
            referencedRelation: "inst_order_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_order_commitment_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inst_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inst_order_commitments: {
        Row: {
          account_id: string
          commitment_date: string
          commitment_number: string
          created_at: string
          created_by: string
          delivery_end_date: string | null
          delivery_start_date: string | null
          id: string
          notes: string | null
          opportunity_id: string | null
          quote_id: string | null
          status: string | null
          total_actual_value: number | null
          total_planned_value: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          commitment_date?: string
          commitment_number: string
          created_at?: string
          created_by: string
          delivery_end_date?: string | null
          delivery_start_date?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          quote_id?: string | null
          status?: string | null
          total_actual_value?: number | null
          total_planned_value?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          commitment_date?: string
          commitment_number?: string
          created_at?: string
          created_by?: string
          delivery_end_date?: string | null
          delivery_start_date?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          quote_id?: string | null
          status?: string | null
          total_actual_value?: number | null
          total_planned_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inst_order_commitments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inst_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_order_commitments_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "inst_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_order_commitments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "inst_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      inst_price_book_entries: {
        Row: {
          created_at: string
          discount_percentage: number | null
          final_price: number
          id: string
          list_price: number
          max_quantity: number | null
          min_quantity: number | null
          price_book_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_percentage?: number | null
          final_price?: number
          id?: string
          list_price?: number
          max_quantity?: number | null
          min_quantity?: number | null
          price_book_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_percentage?: number | null
          final_price?: number
          id?: string
          list_price?: number
          max_quantity?: number | null
          min_quantity?: number | null
          price_book_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inst_price_book_entries_price_book_id_fkey"
            columns: ["price_book_id"]
            isOneToOne: false
            referencedRelation: "inst_price_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_price_book_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inst_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inst_price_books: {
        Row: {
          account_id: string | null
          created_at: string
          currency: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          is_standard: boolean | null
          price_book_name: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          currency?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          is_standard?: boolean | null
          price_book_name: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          currency?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          is_standard?: boolean | null
          price_book_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inst_price_books_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inst_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      inst_products: {
        Row: {
          base_price: number
          category: string | null
          created_at: string
          description: string | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          is_active: boolean | null
          min_order_quantity: number | null
          product_code: string
          product_name: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          base_price?: number
          category?: string | null
          created_at?: string
          description?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          min_order_quantity?: number | null
          product_code: string
          product_name: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string | null
          created_at?: string
          description?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean | null
          min_order_quantity?: number | null
          product_code?: string
          product_name?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inst_quote_line_items: {
        Row: {
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          line_total: number
          product_id: string
          quantity: number
          quote_id: string
          sort_order: number | null
          tax_amount: number | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          line_total?: number
          product_id: string
          quantity?: number
          quote_id: string
          sort_order?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          line_total?: number
          product_id?: string
          quantity?: number
          quote_id?: string
          sort_order?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "inst_quote_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inst_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_quote_line_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "inst_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      inst_quotes: {
        Row: {
          account_id: string
          approved_by: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          discount_amount: number | null
          id: string
          notes: string | null
          opportunity_id: string | null
          price_book_id: string | null
          quote_date: string
          quote_number: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          terms_and_conditions: string | null
          total_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          account_id: string
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          price_book_id?: string | null
          quote_date?: string
          quote_number: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          account_id?: string
          approved_by?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          price_book_id?: string | null
          quote_date?: string
          quote_number?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inst_quotes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "inst_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "inst_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_quotes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "inst_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inst_quotes_price_book_id_fkey"
            columns: ["price_book_id"]
            isOneToOne: false
            referencedRelation: "inst_price_books"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          cgst_amount: number | null
          created_at: string | null
          description: string
          gst_rate: number | null
          hsn_sac: string | null
          id: string
          invoice_id: string
          price_per_unit: number | null
          quantity: number | null
          sgst_amount: number | null
          taxable_amount: number | null
          total_amount: number | null
          unit: string | null
        }
        Insert: {
          cgst_amount?: number | null
          created_at?: string | null
          description: string
          gst_rate?: number | null
          hsn_sac?: string | null
          id?: string
          invoice_id: string
          price_per_unit?: number | null
          quantity?: number | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
        }
        Update: {
          cgst_amount?: number | null
          created_at?: string | null
          description?: string
          gst_rate?: number | null
          hsn_sac?: string | null
          id?: string
          invoice_id?: string
          price_per_unit?: number | null
          quantity?: number | null
          sgst_amount?: number | null
          taxable_amount?: number | null
          total_amount?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_in_words: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          is_edited: boolean | null
          order_id: string | null
          place_of_supply: string | null
          status: string | null
          sub_total: number | null
          terms: string | null
          total_amount: number | null
          total_tax: number | null
          updated_at: string | null
          vehicle_number: string | null
        }
        Insert: {
          amount_in_words?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          is_edited?: boolean | null
          order_id?: string | null
          place_of_supply?: string | null
          status?: string | null
          sub_total?: number | null
          terms?: string | null
          total_amount?: number | null
          total_tax?: number | null
          updated_at?: string | null
          vehicle_number?: string | null
        }
        Update: {
          amount_in_words?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          is_edited?: boolean | null
          order_id?: string | null
          place_of_supply?: string | null
          status?: string | null
          sub_total?: number | null
          terms?: string | null
          total_amount?: number | null
          total_tax?: number | null
          updated_at?: string | null
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      joint_sales_feedback: {
        Row: {
          action_items: string | null
          additional_notes: string | null
          beat_plan_id: string | null
          branding_rating: number | null
          branding_status: string | null
          competition_knowledge: string | null
          competition_presence: string | null
          competition_rating: number | null
          consumer_feedback: string | null
          conversation_highlights: string | null
          created_at: string | null
          distributor_feedback_rating: number | null
          distributor_service: string | null
          feedback_date: string
          fse_user_id: string
          future_growth_rating: number | null
          growth_potential: string | null
          id: string
          joint_sales_impact: string | null
          manager_id: string
          monthly_potential_6months: number | null
          new_products_introduced: string | null
          order_increase_amount: number | null
          placement_feedback: string | null
          pricing_compliance: string | null
          pricing_feedback: string | null
          pricing_feedback_rating: number | null
          product_feedback_rating: number | null
          product_packaging_feedback: string | null
          product_quality_feedback: string | null
          product_sku_range_feedback: string | null
          product_usp_feedback: string | null
          promotion_vs_competition: string | null
          retailer_id: string
          retailer_notes: string | null
          retailing_feedback: string | null
          retailing_rating: number | null
          sales_increase_feedback: string | null
          sales_trend: string | null
          sales_trends_rating: number | null
          sampling_rating: number | null
          sampling_status: string | null
          scheme_awareness: string | null
          schemes_feedback: string | null
          schemes_rating: number | null
          service_feedback: string | null
          shelf_visibility: string | null
          trends_feedback: string | null
          updated_at: string | null
          visit_id: string | null
          willingness_to_grow_range: string | null
        }
        Insert: {
          action_items?: string | null
          additional_notes?: string | null
          beat_plan_id?: string | null
          branding_rating?: number | null
          branding_status?: string | null
          competition_knowledge?: string | null
          competition_presence?: string | null
          competition_rating?: number | null
          consumer_feedback?: string | null
          conversation_highlights?: string | null
          created_at?: string | null
          distributor_feedback_rating?: number | null
          distributor_service?: string | null
          feedback_date?: string
          fse_user_id: string
          future_growth_rating?: number | null
          growth_potential?: string | null
          id?: string
          joint_sales_impact?: string | null
          manager_id: string
          monthly_potential_6months?: number | null
          new_products_introduced?: string | null
          order_increase_amount?: number | null
          placement_feedback?: string | null
          pricing_compliance?: string | null
          pricing_feedback?: string | null
          pricing_feedback_rating?: number | null
          product_feedback_rating?: number | null
          product_packaging_feedback?: string | null
          product_quality_feedback?: string | null
          product_sku_range_feedback?: string | null
          product_usp_feedback?: string | null
          promotion_vs_competition?: string | null
          retailer_id: string
          retailer_notes?: string | null
          retailing_feedback?: string | null
          retailing_rating?: number | null
          sales_increase_feedback?: string | null
          sales_trend?: string | null
          sales_trends_rating?: number | null
          sampling_rating?: number | null
          sampling_status?: string | null
          scheme_awareness?: string | null
          schemes_feedback?: string | null
          schemes_rating?: number | null
          service_feedback?: string | null
          shelf_visibility?: string | null
          trends_feedback?: string | null
          updated_at?: string | null
          visit_id?: string | null
          willingness_to_grow_range?: string | null
        }
        Update: {
          action_items?: string | null
          additional_notes?: string | null
          beat_plan_id?: string | null
          branding_rating?: number | null
          branding_status?: string | null
          competition_knowledge?: string | null
          competition_presence?: string | null
          competition_rating?: number | null
          consumer_feedback?: string | null
          conversation_highlights?: string | null
          created_at?: string | null
          distributor_feedback_rating?: number | null
          distributor_service?: string | null
          feedback_date?: string
          fse_user_id?: string
          future_growth_rating?: number | null
          growth_potential?: string | null
          id?: string
          joint_sales_impact?: string | null
          manager_id?: string
          monthly_potential_6months?: number | null
          new_products_introduced?: string | null
          order_increase_amount?: number | null
          placement_feedback?: string | null
          pricing_compliance?: string | null
          pricing_feedback?: string | null
          pricing_feedback_rating?: number | null
          product_feedback_rating?: number | null
          product_packaging_feedback?: string | null
          product_quality_feedback?: string | null
          product_sku_range_feedback?: string | null
          product_usp_feedback?: string | null
          promotion_vs_competition?: string | null
          retailer_id?: string
          retailer_notes?: string | null
          retailing_feedback?: string | null
          retailing_rating?: number | null
          sales_increase_feedback?: string | null
          sales_trend?: string | null
          sales_trends_rating?: number | null
          sampling_rating?: number | null
          sampling_status?: string | null
          scheme_awareness?: string | null
          schemes_feedback?: string | null
          schemes_rating?: number | null
          service_feedback?: string | null
          shelf_visibility?: string | null
          trends_feedback?: string | null
          updated_at?: string | null
          visit_id?: string | null
          willingness_to_grow_range?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "joint_sales_feedback_beat_plan_id_fkey"
            columns: ["beat_plan_id"]
            isOneToOne: false
            referencedRelation: "beat_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "joint_sales_feedback_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "joint_sales_feedback_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      joint_sales_sessions: {
        Row: {
          beat_id: string | null
          beat_name: string | null
          beat_plan_id: string | null
          created_at: string | null
          fse_user_id: string
          id: string
          manager_id: string
          session_date: string
          session_end_time: string | null
          session_start_time: string | null
          total_feedback_captured: number | null
          total_retailers_visited: number | null
          updated_at: string | null
        }
        Insert: {
          beat_id?: string | null
          beat_name?: string | null
          beat_plan_id?: string | null
          created_at?: string | null
          fse_user_id: string
          id?: string
          manager_id: string
          session_date: string
          session_end_time?: string | null
          session_start_time?: string | null
          total_feedback_captured?: number | null
          total_retailers_visited?: number | null
          updated_at?: string | null
        }
        Update: {
          beat_id?: string | null
          beat_name?: string | null
          beat_plan_id?: string | null
          created_at?: string | null
          fse_user_id?: string
          id?: string
          manager_id?: string
          session_date?: string
          session_end_time?: string | null
          session_start_time?: string | null
          total_feedback_captured?: number | null
          total_retailers_visited?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "joint_sales_sessions_beat_plan_id_fkey"
            columns: ["beat_plan_id"]
            isOneToOne: false
            referencedRelation: "beat_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_applications: {
        Row: {
          applied_date: string
          approved_by: string | null
          approved_date: string | null
          created_at: string
          end_date: string
          id: string
          leave_type_id: string
          reason: string
          rejection_reason: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_date?: string
          approved_by?: string | null
          approved_date?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type_id: string
          reason: string
          rejection_reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_date?: string
          approved_by?: string | null
          approved_date?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string
          rejection_reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leave_applications_leave_type_id"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balance: {
        Row: {
          created_at: string
          id: string
          leave_type_id: string
          opening_balance: number
          remaining_balance: number | null
          updated_at: string
          used_balance: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          leave_type_id: string
          opening_balance?: number
          remaining_balance?: number | null
          updated_at?: string
          used_balance?: number
          user_id: string
          year?: number
        }
        Update: {
          created_at?: string
          id?: string
          leave_type_id?: string
          opening_balance?: number
          remaining_balance?: number | null
          updated_at?: string
          used_balance?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_leave_balance_leave_type_id"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balance_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      license_config: {
        Row: {
          created_at: string
          field_sales_enabled: boolean | null
          id: string
          institutional_sales_enabled: boolean | null
          license_type: string
          max_users: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          field_sales_enabled?: boolean | null
          id?: string
          institutional_sales_enabled?: boolean | null
          license_type?: string
          max_users?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          field_sales_enabled?: boolean | null
          id?: string
          institutional_sales_enabled?: boolean | null
          license_type?: string
          max_users?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          template_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          template_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          template_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          related_table: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          related_table?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          related_table?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          category: string
          cgst_amount: number | null
          created_at: string
          discount_amount: number | null
          hsn_code: string | null
          id: string
          order_id: string
          original_rate: number | null
          product_id: string
          product_name: string
          quantity: number
          rate: number
          sgst_amount: number | null
          total: number
          unit: string
        }
        Insert: {
          category: string
          cgst_amount?: number | null
          created_at?: string
          discount_amount?: number | null
          hsn_code?: string | null
          id?: string
          order_id: string
          original_rate?: number | null
          product_id: string
          product_name: string
          quantity: number
          rate: number
          sgst_amount?: number | null
          total: number
          unit: string
        }
        Update: {
          category?: string
          cgst_amount?: number | null
          created_at?: string
          discount_amount?: number | null
          hsn_code?: string | null
          id?: string
          order_id?: string
          original_rate?: number | null
          product_id?: string
          product_name?: string
          quantity?: number
          rate?: number
          sgst_amount?: number | null
          total?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          credit_paid_amount: number | null
          credit_pending_amount: number | null
          discount_amount: number | null
          distributor_id: string | null
          distributor_name: string | null
          id: string
          idempotency_key: string | null
          invoice_number: string | null
          is_credit_order: boolean | null
          order_date: string | null
          payment_method: string | null
          payment_proof_url: string | null
          previous_pending_cleared: number | null
          retailer_id: string | null
          retailer_name: string
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
          upi_last_four_code: string | null
          user_id: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          credit_paid_amount?: number | null
          credit_pending_amount?: number | null
          discount_amount?: number | null
          distributor_id?: string | null
          distributor_name?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_number?: string | null
          is_credit_order?: boolean | null
          order_date?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          previous_pending_cleared?: number | null
          retailer_id?: string | null
          retailer_name: string
          status?: string
          subtotal: number
          total_amount: number
          updated_at?: string
          upi_last_four_code?: string | null
          user_id: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          credit_paid_amount?: number | null
          credit_pending_amount?: number | null
          discount_amount?: number | null
          distributor_id?: string | null
          distributor_name?: string | null
          id?: string
          idempotency_key?: string | null
          invoice_number?: string | null
          is_credit_order?: boolean | null
          order_date?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          previous_pending_cleared?: number | null
          retailer_id?: string | null
          retailer_name?: string
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
          upi_last_four_code?: string | null
          user_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string | null
          user_agent: string | null
          was_successful: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          was_successful?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          was_successful?: boolean
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          method: string
          phone_number: string | null
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          method?: string
          phone_number?: string | null
          token: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          method?: string
          phone_number?: string | null
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      performance_comments: {
        Row: {
          created_at: string | null
          hr_comment: string | null
          hr_id: string | null
          hr_rating: number | null
          id: string
          manager_comment: string | null
          manager_id: string | null
          manager_rating: number | null
          period_end: string
          period_start: string
          period_type: string
          self_comment: string | null
          self_rating: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hr_comment?: string | null
          hr_id?: string | null
          hr_rating?: number | null
          id?: string
          manager_comment?: string | null
          manager_id?: string | null
          manager_rating?: number | null
          period_end: string
          period_start: string
          period_type: string
          self_comment?: string | null
          self_rating?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hr_comment?: string | null
          hr_id?: string | null
          hr_rating?: number | null
          id?: string
          manager_comment?: string | null
          manager_id?: string | null
          manager_rating?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          self_comment?: string | null
          self_rating?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      performance_module_config: {
        Row: {
          active_module: string
          created_at: string | null
          enabled_periods: string[] | null
          id: string
          rating_thresholds: Json | null
          updated_at: string | null
        }
        Insert: {
          active_module?: string
          created_at?: string | null
          enabled_periods?: string[] | null
          id?: string
          rating_thresholds?: Json | null
          updated_at?: string | null
        }
        Update: {
          active_module?: string
          created_at?: string | null
          enabled_periods?: string[] | null
          id?: string
          rating_thresholds?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      permanent_deletion_log: {
        Row: {
          created_at: string
          deleted_from_bin_at: string
          deleted_from_bin_by: string
          id: string
          module_name: string
          original_deleted_at: string
          original_deleted_by: string
          original_id: string
          original_table: string
          record_data: Json
          record_name: string | null
        }
        Insert: {
          created_at?: string
          deleted_from_bin_at?: string
          deleted_from_bin_by: string
          id?: string
          module_name: string
          original_deleted_at: string
          original_deleted_by: string
          original_id: string
          original_table: string
          record_data: Json
          record_name?: string | null
        }
        Update: {
          created_at?: string
          deleted_from_bin_at?: string
          deleted_from_bin_by?: string
          id?: string
          module_name?: string
          original_deleted_at?: string
          original_deleted_by?: string
          original_id?: string
          original_table?: string
          record_data?: Json
          record_name?: string | null
        }
        Relationships: []
      }
      price_book_entries: {
        Row: {
          created_at: string
          discount_percent: number | null
          final_price: number
          id: string
          is_active: boolean | null
          list_price: number
          min_quantity: number | null
          price_book_id: string
          product_id: string
          uom: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          discount_percent?: number | null
          final_price?: number
          id?: string
          is_active?: boolean | null
          list_price?: number
          min_quantity?: number | null
          price_book_id: string
          product_id: string
          uom?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          discount_percent?: number | null
          final_price?: number
          id?: string
          is_active?: boolean | null
          list_price?: number
          min_quantity?: number | null
          price_book_id?: string
          product_id?: string
          uom?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_book_entries_price_book_id_fkey"
            columns: ["price_book_id"]
            isOneToOne: false
            referencedRelation: "price_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_entries_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_books: {
        Row: {
          apply_to_all_territories: boolean | null
          cloned_from: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          distributor_category: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          is_standard: boolean | null
          name: string
          price_book_type: string
          target_type: string | null
          territory_id: string | null
          updated_at: string
        }
        Insert: {
          apply_to_all_territories?: boolean | null
          cloned_from?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          distributor_category?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          is_standard?: boolean | null
          name: string
          price_book_type?: string
          target_type?: string | null
          territory_id?: string | null
          updated_at?: string
        }
        Update: {
          apply_to_all_territories?: boolean | null
          cloned_from?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          distributor_category?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          is_standard?: boolean | null
          name?: string
          price_book_type?: string
          target_type?: string | null
          territory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_books_cloned_from_fkey"
            columns: ["cloned_from"]
            isOneToOne: false
            referencedRelation: "price_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_books_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      primary_order_items: {
        Row: {
          batch_number: string | null
          created_at: string
          damaged_quantity: number | null
          discount_percent: number | null
          expiry_date: string | null
          id: string
          line_total: number
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          received_quantity: number | null
          sku: string | null
          tax_percent: number | null
          unit: string
          unit_price: number
          variant_id: string | null
          variant_name: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          damaged_quantity?: number | null
          discount_percent?: number | null
          expiry_date?: string | null
          id?: string
          line_total?: number
          order_id: string
          product_id: string
          product_name: string
          quantity?: number
          received_quantity?: number | null
          sku?: string | null
          tax_percent?: number | null
          unit?: string
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          damaged_quantity?: number | null
          discount_percent?: number | null
          expiry_date?: string | null
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          received_quantity?: number | null
          sku?: string | null
          tax_percent?: number | null
          unit?: string
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "primary_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "primary_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "primary_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "primary_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      primary_orders: {
        Row: {
          actual_delivery_date: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by_user_id: string | null
          discount_amount: number
          dispatch_reference: string | null
          dispatched_at: string | null
          distributor_id: string
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          payment_status: string
          payment_terms: string | null
          shipping_address: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          transporter_name: string | null
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by_user_id?: string | null
          discount_amount?: number
          dispatch_reference?: string | null
          dispatched_at?: string | null
          distributor_id: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          payment_status?: string
          payment_terms?: string | null
          shipping_address?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          transporter_name?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by_user_id?: string | null
          discount_amount?: number
          dispatch_reference?: string | null
          dispatched_at?: string | null
          distributor_id?: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          payment_status?: string
          payment_terms?: string | null
          shipping_address?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          transporter_name?: string | null
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "primary_orders_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_schemes: {
        Row: {
          bundle_discount_amount: number | null
          bundle_discount_percentage: number | null
          bundle_product_ids: string[] | null
          buy_quantity: number | null
          category_id: string | null
          condition_quantity: number | null
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string | null
          free_product_id: string | null
          free_quantity: number | null
          id: string
          is_active: boolean | null
          is_first_order_only: boolean | null
          min_order_value: number | null
          name: string
          product_id: string | null
          quantity_condition_type: string | null
          scheme_type: string
          start_date: string | null
          tier_data: Json | null
          updated_at: string
          validity_days: number | null
          variant_id: string | null
        }
        Insert: {
          bundle_discount_amount?: number | null
          bundle_discount_percentage?: number | null
          bundle_product_ids?: string[] | null
          buy_quantity?: number | null
          category_id?: string | null
          condition_quantity?: number | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          free_product_id?: string | null
          free_quantity?: number | null
          id?: string
          is_active?: boolean | null
          is_first_order_only?: boolean | null
          min_order_value?: number | null
          name: string
          product_id?: string | null
          quantity_condition_type?: string | null
          scheme_type?: string
          start_date?: string | null
          tier_data?: Json | null
          updated_at?: string
          validity_days?: number | null
          variant_id?: string | null
        }
        Update: {
          bundle_discount_amount?: number | null
          bundle_discount_percentage?: number | null
          bundle_product_ids?: string[] | null
          buy_quantity?: number | null
          category_id?: string | null
          condition_quantity?: number | null
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          free_product_id?: string | null
          free_quantity?: number | null
          id?: string
          is_active?: boolean | null
          is_first_order_only?: boolean | null
          min_order_value?: number | null
          name?: string
          product_id?: string | null
          quantity_condition_type?: string | null
          scheme_type?: string
          start_date?: string | null
          tier_data?: Json | null
          updated_at?: string
          validity_days?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_schemes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_schemes_free_product_id_fkey"
            columns: ["free_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_schemes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_schemes_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          barcode_image_url: string | null
          created_at: string
          discount_amount: number | null
          discount_percentage: number | null
          focused_due_date: string | null
          focused_recurring_config: Json | null
          focused_target_quantity: number | null
          focused_territories: string[] | null
          focused_type: string | null
          id: string
          is_active: boolean | null
          is_focused_product: boolean | null
          price: number
          product_id: string
          qr_code: string | null
          sku: string
          stock_quantity: number
          updated_at: string
          variant_name: string
        }
        Insert: {
          barcode?: string | null
          barcode_image_url?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          focused_due_date?: string | null
          focused_recurring_config?: Json | null
          focused_target_quantity?: number | null
          focused_territories?: string[] | null
          focused_type?: string | null
          id?: string
          is_active?: boolean | null
          is_focused_product?: boolean | null
          price?: number
          product_id: string
          qr_code?: string | null
          sku: string
          stock_quantity?: number
          updated_at?: string
          variant_name: string
        }
        Update: {
          barcode?: string | null
          barcode_image_url?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          focused_due_date?: string | null
          focused_recurring_config?: Json | null
          focused_target_quantity?: number | null
          focused_territories?: string[] | null
          focused_type?: string | null
          id?: string
          is_active?: boolean | null
          is_focused_product?: boolean | null
          price?: number
          product_id?: string
          qr_code?: string | null
          sku?: string
          stock_quantity?: number
          updated_at?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          barcode_image_url: string | null
          base_unit: string | null
          category_id: string | null
          closing_stock: number | null
          conversion_factor: number | null
          created_at: string
          description: string | null
          focused_due_date: string | null
          focused_recurring_config: Json | null
          focused_target_quantity: number | null
          focused_territories: string[] | null
          focused_type: string | null
          id: string
          is_active: boolean | null
          is_focused_product: boolean | null
          name: string
          product_number: string | null
          qr_code: string | null
          rate: number
          sku: string
          sku_image_url: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          barcode_image_url?: string | null
          base_unit?: string | null
          category_id?: string | null
          closing_stock?: number | null
          conversion_factor?: number | null
          created_at?: string
          description?: string | null
          focused_due_date?: string | null
          focused_recurring_config?: Json | null
          focused_target_quantity?: number | null
          focused_territories?: string[] | null
          focused_type?: string | null
          id?: string
          is_active?: boolean | null
          is_focused_product?: boolean | null
          name: string
          product_number?: string | null
          qr_code?: string | null
          rate?: number
          sku: string
          sku_image_url?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          barcode_image_url?: string | null
          base_unit?: string | null
          category_id?: string | null
          closing_stock?: number | null
          conversion_factor?: number | null
          created_at?: string
          description?: string | null
          focused_due_date?: string | null
          focused_recurring_config?: Json | null
          focused_target_quantity?: number | null
          focused_territories?: string[] | null
          focused_type?: string | null
          id?: string
          is_active?: boolean | null
          is_focused_product?: boolean | null
          name?: string
          product_number?: string | null
          qr_code?: string | null
          rate?: number
          sku?: string
          sku_image_url?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_attachments: {
        Row: {
          attached_by: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attached_by: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attached_by?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_object_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_modify_all: boolean | null
          can_read: boolean | null
          can_view_all: boolean | null
          created_at: string | null
          id: string
          object_name: string
          profile_id: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_modify_all?: boolean | null
          can_read?: boolean | null
          can_view_all?: boolean | null
          created_at?: string | null
          id?: string
          object_name: string
          profile_id?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_modify_all?: boolean | null
          can_read?: boolean | null
          can_view_all?: boolean | null
          created_at?: string | null
          id?: string
          object_name?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_object_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "security_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anniversary_date: string | null
          aspirations: string | null
          created_at: string
          current_address: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          facebook_url: string | null
          full_name: string
          hint_answer: string
          hint_question: string
          id: string
          instagram_url: string | null
          interests: string[] | null
          invitation_token: string | null
          learning_goals: string[] | null
          linkedin_url: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          permanent_address: string | null
          phone_number: string | null
          preferred_language: string | null
          profile_picture_url: string | null
          recovery_email: string | null
          role_id: string | null
          territories_covered: string[] | null
          updated_at: string
          user_status: Database["public"]["Enums"]["user_status"] | null
          username: string
          work_location: string | null
        }
        Insert: {
          anniversary_date?: string | null
          aspirations?: string | null
          created_at?: string
          current_address?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          facebook_url?: string | null
          full_name: string
          hint_answer: string
          hint_question: string
          id: string
          instagram_url?: string | null
          interests?: string[] | null
          invitation_token?: string | null
          learning_goals?: string[] | null
          linkedin_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          permanent_address?: string | null
          phone_number?: string | null
          preferred_language?: string | null
          profile_picture_url?: string | null
          recovery_email?: string | null
          role_id?: string | null
          territories_covered?: string[] | null
          updated_at?: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
          username: string
          work_location?: string | null
        }
        Update: {
          anniversary_date?: string | null
          aspirations?: string | null
          created_at?: string
          current_address?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          facebook_url?: string | null
          full_name?: string
          hint_answer?: string
          hint_question?: string
          id?: string
          instagram_url?: string | null
          interests?: string[] | null
          invitation_token?: string | null
          learning_goals?: string[] | null
          linkedin_url?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          permanent_address?: string | null
          phone_number?: string | null
          preferred_language?: string | null
          profile_picture_url?: string | null
          recovery_email?: string | null
          role_id?: string | null
          territories_covered?: string[] | null
          updated_at?: string
          user_status?: Database["public"]["Enums"]["user_status"] | null
          username?: string
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_content_execution_log: {
        Row: {
          created_at: string
          error_message: string | null
          execution_time: string
          id: string
          metadata: Json | null
          post_id: string | null
          status: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_time?: string
          id?: string
          metadata?: Json | null
          post_id?: string | null
          status: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_time?: string
          id?: string
          metadata?: Json | null
          post_id?: string | null
          status?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_content_execution_log_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_content_execution_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "push_content_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      push_content_posts: {
        Row: {
          content: string
          generated_data: Json | null
          id: string
          is_published: boolean | null
          posted_at: string | null
          subscription_id: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          content: string
          generated_data?: Json | null
          id?: string
          is_published?: boolean | null
          posted_at?: string | null
          subscription_id?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          content?: string
          generated_data?: Json | null
          id?: string
          is_published?: boolean | null
          posted_at?: string | null
          subscription_id?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_content_posts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_push_content_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_content_posts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "push_content_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      push_content_templates: {
        Row: {
          content_structure: Json
          created_at: string | null
          created_by: string | null
          default_schedule_time: string | null
          description: string | null
          id: string
          is_active: boolean | null
          template_name: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          content_structure: Json
          created_at?: string | null
          created_by?: string | null
          default_schedule_time?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          template_name: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          content_structure?: Json
          created_at?: string | null
          created_by?: string | null
          default_schedule_time?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          template_name?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recommendation_feedback: {
        Row: {
          created_at: string | null
          feedback_note: string | null
          feedback_type: string
          id: string
          recommendation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_note?: string | null
          feedback_type: string
          id?: string
          recommendation_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback_note?: string | null
          feedback_type?: string
          id?: string
          recommendation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          entity_id: string | null
          entity_name: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          reasoning: string | null
          recommendation_data: Json
          recommendation_type: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reasoning?: string | null
          recommendation_data: Json
          recommendation_type: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reasoning?: string | null
          recommendation_data?: Json
          recommendation_type?: string
          user_id?: string
        }
        Relationships: []
      }
      recycle_bin: {
        Row: {
          created_at: string
          deleted_at: string
          deleted_by: string
          id: string
          module_name: string
          original_id: string
          original_table: string
          record_data: Json
          record_name: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string
          deleted_by: string
          id?: string
          module_name: string
          original_id: string
          original_table: string
          record_data: Json
          record_name?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string
          deleted_by?: string
          id?: string
          module_name?: string
          original_id?: string
          original_table?: string
          record_data?: Json
          record_name?: string | null
        }
        Relationships: []
      }
      recycle_bin_config: {
        Row: {
          auto_delete_days: number | null
          created_at: string
          id: string
          is_enabled: boolean | null
          require_confirmation: boolean | null
          show_deletion_log_to_users: boolean | null
          updated_at: string
        }
        Insert: {
          auto_delete_days?: number | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          require_confirmation?: boolean | null
          show_deletion_log_to_users?: boolean | null
          updated_at?: string
        }
        Update: {
          auto_delete_days?: number | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          require_confirmation?: boolean | null
          show_deletion_log_to_users?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      regularization_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attendance_date: string
          created_at: string
          current_check_in_time: string | null
          current_check_out_time: string | null
          id: string
          reason: string
          rejection_reason: string | null
          requested_check_in_time: string | null
          requested_check_out_time: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_date: string
          created_at?: string
          current_check_in_time?: string | null
          current_check_out_time?: string | null
          id?: string
          reason: string
          rejection_reason?: string | null
          requested_check_in_time?: string | null
          requested_check_out_time?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_date?: string
          created_at?: string
          current_check_in_time?: string | null
          current_check_out_time?: string | null
          id?: string
          reason?: string
          rejection_reason?: string | null
          requested_check_in_time?: string | null
          requested_check_out_time?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      retailer_credit_scores: {
        Row: {
          avg_dso: number | null
          avg_growth_rate: number | null
          avg_order_frequency: number | null
          calculated_at: string | null
          created_at: string | null
          credit_limit: number
          growth_rate_score: number | null
          id: string
          last_month_revenue: number | null
          order_frequency_score: number | null
          repayment_dso_score: number | null
          retailer_id: string
          score: number
          score_type: string
          updated_at: string | null
        }
        Insert: {
          avg_dso?: number | null
          avg_growth_rate?: number | null
          avg_order_frequency?: number | null
          calculated_at?: string | null
          created_at?: string | null
          credit_limit?: number
          growth_rate_score?: number | null
          id?: string
          last_month_revenue?: number | null
          order_frequency_score?: number | null
          repayment_dso_score?: number | null
          retailer_id: string
          score: number
          score_type?: string
          updated_at?: string | null
        }
        Update: {
          avg_dso?: number | null
          avg_growth_rate?: number | null
          avg_order_frequency?: number | null
          calculated_at?: string | null
          created_at?: string | null
          credit_limit?: number
          growth_rate_score?: number | null
          id?: string
          last_month_revenue?: number | null
          order_frequency_score?: number | null
          repayment_dso_score?: number | null
          retailer_id?: string
          score?: number
          score_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retailer_credit_scores_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: true
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      retailer_feedback: {
        Row: {
          comments: string | null
          consumer_satisfaction: number | null
          created_at: string
          feedback_date: string | null
          feedback_type: string
          id: string
          product_packaging: number | null
          product_placement: number | null
          product_quality: number | null
          product_sku_range: number | null
          rating: number | null
          retailer_id: string
          score: number | null
          summary_notes: string | null
          updated_at: string
          user_id: string
          visit_id: string | null
        }
        Insert: {
          comments?: string | null
          consumer_satisfaction?: number | null
          created_at?: string
          feedback_date?: string | null
          feedback_type: string
          id?: string
          product_packaging?: number | null
          product_placement?: number | null
          product_quality?: number | null
          product_sku_range?: number | null
          rating?: number | null
          retailer_id: string
          score?: number | null
          summary_notes?: string | null
          updated_at?: string
          user_id: string
          visit_id?: string | null
        }
        Update: {
          comments?: string | null
          consumer_satisfaction?: number | null
          created_at?: string
          feedback_date?: string | null
          feedback_type?: string
          id?: string
          product_packaging?: number | null
          product_placement?: number | null
          product_quality?: number | null
          product_sku_range?: number | null
          rating?: number | null
          retailer_id?: string
          score?: number | null
          summary_notes?: string | null
          updated_at?: string
          user_id?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      retailer_loyalty_actions: {
        Row: {
          action_name: string
          action_type: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          metadata: Json | null
          points: number
          program_id: string
          target_config: Json | null
          updated_at: string | null
        }
        Insert: {
          action_name: string
          action_type: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          points?: number
          program_id: string
          target_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          action_name?: string
          action_type?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          points?: number
          program_id?: string
          target_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retailer_loyalty_actions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "retailer_loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      retailer_loyalty_feedback: {
        Row: {
          action_id: string
          created_at: string
          feedback_date: string
          feedback_type: string
          fse_user_id: string
          id: string
        }
        Insert: {
          action_id: string
          created_at?: string
          feedback_date?: string
          feedback_type: string
          fse_user_id: string
          id?: string
        }
        Update: {
          action_id?: string
          created_at?: string
          feedback_date?: string
          feedback_type?: string
          fse_user_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retailer_loyalty_feedback_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "retailer_loyalty_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      retailer_loyalty_points: {
        Row: {
          action_id: string
          awarded_by_user_id: string | null
          earned_at: string | null
          id: string
          metadata: Json | null
          points: number
          program_id: string
          reference_id: string | null
          reference_type: string | null
          retailer_id: string
        }
        Insert: {
          action_id: string
          awarded_by_user_id?: string | null
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          points?: number
          program_id: string
          reference_id?: string | null
          reference_type?: string | null
          retailer_id: string
        }
        Update: {
          action_id?: string
          awarded_by_user_id?: string | null
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          points?: number
          program_id?: string
          reference_id?: string | null
          reference_type?: string | null
          retailer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retailer_loyalty_points_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "retailer_loyalty_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retailer_loyalty_points_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "retailer_loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retailer_loyalty_points_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      retailer_loyalty_programs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          is_all_territories: boolean | null
          points_to_rupee_conversion: number
          program_name: string
          start_date: string
          territories: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          is_all_territories?: boolean | null
          points_to_rupee_conversion?: number
          program_name: string
          start_date: string
          territories?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_all_territories?: boolean | null
          points_to_rupee_conversion?: number
          program_name?: string
          start_date?: string
          territories?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retailer_loyalty_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      retailer_loyalty_redemptions: {
        Row: {
          created_at: string | null
          id: string
          points_redeemed: number
          processed_at: string | null
          processed_by: string | null
          program_id: string
          rejection_reason: string | null
          requested_at: string | null
          requested_by_user_id: string | null
          retailer_id: string
          status: string
          updated_at: string | null
          voucher_amount: number
          voucher_code: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_redeemed?: number
          processed_at?: string | null
          processed_by?: string | null
          program_id: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by_user_id?: string | null
          retailer_id: string
          status?: string
          updated_at?: string | null
          voucher_amount?: number
          voucher_code?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          points_redeemed?: number
          processed_at?: string | null
          processed_by?: string | null
          program_id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          requested_by_user_id?: string | null
          retailer_id?: string
          status?: string
          updated_at?: string | null
          voucher_amount?: number
          voucher_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retailer_loyalty_redemptions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retailer_loyalty_redemptions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "retailer_loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retailer_loyalty_redemptions_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      retailer_loyalty_reward_redemptions: {
        Row: {
          created_at: string | null
          delivery_address: string | null
          delivery_notes: string | null
          id: string
          points_redeemed: number
          processed_at: string | null
          processed_by: string | null
          program_id: string
          requested_at: string | null
          retailer_id: string
          reward_id: string
          status: string | null
          tracking_info: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          id?: string
          points_redeemed: number
          processed_at?: string | null
          processed_by?: string | null
          program_id: string
          requested_at?: string | null
          retailer_id: string
          reward_id: string
          status?: string | null
          tracking_info?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          id?: string
          points_redeemed?: number
          processed_at?: string | null
          processed_by?: string | null
          program_id?: string
          requested_at?: string | null
          retailer_id?: string
          reward_id?: string
          status?: string | null
          tracking_info?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retailer_loyalty_reward_redemptions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "retailer_loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retailer_loyalty_reward_redemptions_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retailer_loyalty_reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "retailer_loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      retailer_loyalty_rewards: {
        Row: {
          cash_value: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          points_required: number
          program_id: string
          reward_name: string
          reward_type: string
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          cash_value?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          points_required: number
          program_id: string
          reward_name: string
          reward_type: string
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          cash_value?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          points_required?: number
          program_id?: string
          reward_name?: string
          reward_type?: string
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retailer_loyalty_rewards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "retailer_loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      retailer_loyalty_tracking: {
        Row: {
          consecutive_order_count: number | null
          created_at: string | null
          id: string
          last_order_date: string | null
          last_points_earned_date: string | null
          new_products_tried: string[] | null
          retailer_id: string
          total_orders_count: number | null
          updated_at: string | null
        }
        Insert: {
          consecutive_order_count?: number | null
          created_at?: string | null
          id?: string
          last_order_date?: string | null
          last_points_earned_date?: string | null
          new_products_tried?: string[] | null
          retailer_id: string
          total_orders_count?: number | null
          updated_at?: string | null
        }
        Update: {
          consecutive_order_count?: number | null
          created_at?: string | null
          id?: string
          last_order_date?: string | null
          last_points_earned_date?: string | null
          new_products_tried?: string[] | null
          retailer_id?: string
          total_orders_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retailer_loyalty_tracking_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: true
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      retailer_visit_logs: {
        Row: {
          action_type: string | null
          created_at: string
          distance_meters: number | null
          end_time: string | null
          id: string
          is_phone_order: boolean | null
          location_feedback_notes: string | null
          location_feedback_reason: string | null
          location_status: string | null
          retailer_id: string
          start_latitude: number | null
          start_longitude: number | null
          start_time: string
          time_spent_seconds: number | null
          updated_at: string
          user_id: string
          visit_date: string
          visit_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string
          distance_meters?: number | null
          end_time?: string | null
          id?: string
          is_phone_order?: boolean | null
          location_feedback_notes?: string | null
          location_feedback_reason?: string | null
          location_status?: string | null
          retailer_id: string
          start_latitude?: number | null
          start_longitude?: number | null
          start_time: string
          time_spent_seconds?: number | null
          updated_at?: string
          user_id: string
          visit_date: string
          visit_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string
          distance_meters?: number | null
          end_time?: string | null
          id?: string
          is_phone_order?: boolean | null
          location_feedback_notes?: string | null
          location_feedback_reason?: string | null
          location_status?: string | null
          retailer_id?: string
          start_latitude?: number | null
          start_longitude?: number | null
          start_time?: string
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string
          visit_date?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retailer_visit_logs_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      retailers: {
        Row: {
          address: string
          avg_monthly_orders_3m: number | null
          avg_order_per_visit_3m: number | null
          beat_id: string
          beat_name: string | null
          category: string | null
          competitors: string[] | null
          created_at: string
          distributor_id: string | null
          entity_type: string
          gst_number: string | null
          id: string
          last_order_date: string | null
          last_order_value: number | null
          last_visit_date: string | null
          latitude: number | null
          location_tag: string | null
          longitude: number | null
          manual_credit_score: number | null
          name: string
          notes: string | null
          order_value: number | null
          parent_name: string | null
          parent_type: string | null
          pending_amount: number | null
          phone: string | null
          photo_url: string | null
          potential: string | null
          priority: string | null
          productive_visits_3m: number | null
          retail_type: string | null
          state: string | null
          status: string | null
          territory_id: string | null
          total_visits_3m: number | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          address: string
          avg_monthly_orders_3m?: number | null
          avg_order_per_visit_3m?: number | null
          beat_id: string
          beat_name?: string | null
          category?: string | null
          competitors?: string[] | null
          created_at?: string
          distributor_id?: string | null
          entity_type?: string
          gst_number?: string | null
          id?: string
          last_order_date?: string | null
          last_order_value?: number | null
          last_visit_date?: string | null
          latitude?: number | null
          location_tag?: string | null
          longitude?: number | null
          manual_credit_score?: number | null
          name: string
          notes?: string | null
          order_value?: number | null
          parent_name?: string | null
          parent_type?: string | null
          pending_amount?: number | null
          phone?: string | null
          photo_url?: string | null
          potential?: string | null
          priority?: string | null
          productive_visits_3m?: number | null
          retail_type?: string | null
          state?: string | null
          status?: string | null
          territory_id?: string | null
          total_visits_3m?: number | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          address?: string
          avg_monthly_orders_3m?: number | null
          avg_order_per_visit_3m?: number | null
          beat_id?: string
          beat_name?: string | null
          category?: string | null
          competitors?: string[] | null
          created_at?: string
          distributor_id?: string | null
          entity_type?: string
          gst_number?: string | null
          id?: string
          last_order_date?: string | null
          last_order_value?: number | null
          last_visit_date?: string | null
          latitude?: number | null
          location_tag?: string | null
          longitude?: number | null
          manual_credit_score?: number | null
          name?: string
          notes?: string | null
          order_value?: number | null
          parent_name?: string | null
          parent_type?: string | null
          pending_amount?: number | null
          phone?: string | null
          photo_url?: string | null
          potential?: string | null
          priority?: string | null
          productive_visits_3m?: number | null
          retail_type?: string | null
          state?: string | null
          status?: string | null
          territory_id?: string | null
          total_visits_3m?: number | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "retailers_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retailers_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      role_definitions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          required_competencies: Json | null
          responsibilities: string[] | null
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          required_competencies?: Json | null
          responsibilities?: string[] | null
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          required_competencies?: Json | null
          responsibilities?: string[] | null
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_targets: {
        Row: {
          created_at: string | null
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          kpi_id: string | null
          monthly_target: number
          quarterly_target: number
          role_name: string
          territory_id: string | null
          updated_at: string | null
          yearly_target: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          kpi_id?: string | null
          monthly_target?: number
          quarterly_target?: number
          role_name: string
          territory_id?: string | null
          updated_at?: string | null
          yearly_target?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          kpi_id?: string | null
          monthly_target?: number
          quarterly_target?: number
          role_name?: string
          territory_id?: string | null
          updated_at?: string | null
          yearly_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_targets_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "target_kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_targets_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          parameters: Json | null
          query: string
          title: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          parameters?: Json | null
          query: string
          title: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          parameters?: Json | null
          query?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_profiles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sensitive_data_access_log: {
        Row: {
          accessed_at: string
          action: string
          id: string
          ip_address: string | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          accessed_at?: string
          action: string
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          accessed_at?: string
          action?: string
          id?: string
          ip_address?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_config: {
        Row: {
          account_sid: string | null
          auth_token: string | null
          created_at: string | null
          from_number: string | null
          id: string
          is_active: boolean | null
          provider: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          account_sid?: string | null
          auth_token?: string | null
          created_at?: string | null
          from_number?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          account_sid?: string | null
          auth_token?: string | null
          created_at?: string | null
          from_number?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      social_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_attachments: {
        Row: {
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          post_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          post_id?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_automated: boolean | null
          post_metadata: Json | null
          scheduled_time: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_automated?: boolean | null
          post_metadata?: Json | null
          scheduled_time?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_automated?: boolean | null
          post_metadata?: Json | null
          scheduled_time?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "push_content_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      social_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      stock: {
        Row: {
          created_at: string
          id: string
          product_id: string
          product_name: string
          retailer_id: string
          stock_quantity: number
          updated_at: string
          user_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          product_name: string
          retailer_id: string
          stock_quantity?: number
          updated_at?: string
          user_id: string
          visit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          retailer_id?: string
          stock_quantity?: number
          updated_at?: string
          user_id?: string
          visit_id?: string
        }
        Relationships: []
      }
      stock_cycle_data: {
        Row: {
          created_at: string
          id: string
          ordered_quantity: number | null
          product_id: string
          product_name: string
          retailer_id: string
          stock_quantity: number | null
          updated_at: string
          user_id: string
          visit_date: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ordered_quantity?: number | null
          product_id: string
          product_name: string
          retailer_id: string
          stock_quantity?: number | null
          updated_at?: string
          user_id: string
          visit_date: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ordered_quantity?: number | null
          product_id?: string
          product_name?: string
          retailer_id?: string
          stock_quantity?: number | null
          updated_at?: string
          user_id?: string
          visit_date?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      stockist_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          stockist_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          stockist_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          stockist_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stockist_attachments_stockist_id_fkey"
            columns: ["stockist_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      stockist_contacts: {
        Row: {
          address: string | null
          contact_name: string
          created_at: string | null
          designation: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          phone: string | null
          reports_to: string | null
          stockist_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_name: string
          created_at?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          phone?: string | null
          reports_to?: string | null
          stockist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string
          created_at?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          phone?: string | null
          reports_to?: string | null
          stockist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stockist_contacts_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "stockist_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stockist_contacts_stockist_id_fkey"
            columns: ["stockist_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      stockist_locations: {
        Row: {
          address: string | null
          city: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_head_office: boolean | null
          location_name: string
          pincode: string | null
          state: string | null
          stockist_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_head_office?: boolean | null
          location_name: string
          pincode?: string | null
          state?: string | null
          stockist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_head_office?: boolean | null
          location_name?: string
          pincode?: string | null
          state?: string | null
          stockist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stockist_locations_stockist_id_fkey"
            columns: ["stockist_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          created_at: string
          created_date: string
          description: string | null
          id: string
          resolution_notes: string | null
          resolved_by: string | null
          resolved_date: string | null
          status: string
          subject: string
          support_category: string
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_date?: string
          description?: string | null
          id?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          resolved_date?: string | null
          status?: string
          subject: string
          support_category: string
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_date?: string
          description?: string | null
          id?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          resolved_date?: string | null
          status?: string
          subject?: string
          support_category?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      target_actual_logs: {
        Row: {
          created_at: string | null
          daily_actual: number | null
          id: string
          kpi_id: string | null
          log_date: string
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_actual?: number | null
          id?: string
          kpi_id?: string | null
          log_date?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_actual?: number | null
          id?: string
          kpi_id?: string | null
          log_date?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_actual_logs_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "target_kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      target_kpi_definitions: {
        Row: {
          calculation_method: string
          created_at: string | null
          data_source: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          kpi_key: string
          kpi_name: string
          unit: string | null
          weightage: number | null
        }
        Insert: {
          calculation_method: string
          created_at?: string | null
          data_source: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          kpi_key: string
          kpi_name: string
          unit?: string | null
          weightage?: number | null
        }
        Update: {
          calculation_method?: string
          created_at?: string | null
          data_source?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          kpi_key?: string
          kpi_name?: string
          unit?: string | null
          weightage?: number | null
        }
        Relationships: []
      }
      target_setup_master: {
        Row: {
          annual_quantity_target: number
          annual_revenue_target: number
          band: number
          created_at: string
          created_by: string | null
          id: string
          state_territory_id: string | null
          territory_id: string | null
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          annual_quantity_target?: number
          annual_revenue_target?: number
          band: number
          created_at?: string
          created_by?: string | null
          id?: string
          state_territory_id?: string | null
          territory_id?: string | null
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          annual_quantity_target?: number
          annual_revenue_target?: number
          band?: number
          created_at?: string
          created_by?: string | null
          id?: string
          state_territory_id?: string | null
          territory_id?: string | null
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_setup_master_state_territory_id_fkey"
            columns: ["state_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_setup_master_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territories: {
        Row: {
          assigned_distributor_ids: Json | null
          assigned_user_id: string | null
          assigned_user_ids: Json | null
          child_territories_count: number | null
          competitor_ids: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          last_updated_by: string | null
          name: string
          owner_id: string | null
          parent_id: string | null
          pincode_ranges: string[] | null
          population: number | null
          region: string
          retailer_count: number | null
          target_market_size: number | null
          territory_type: string | null
          updated_at: string
          zone: string | null
        }
        Insert: {
          assigned_distributor_ids?: Json | null
          assigned_user_id?: string | null
          assigned_user_ids?: Json | null
          child_territories_count?: number | null
          competitor_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_updated_by?: string | null
          name: string
          owner_id?: string | null
          parent_id?: string | null
          pincode_ranges?: string[] | null
          population?: number | null
          region: string
          retailer_count?: number | null
          target_market_size?: number | null
          territory_type?: string | null
          updated_at?: string
          zone?: string | null
        }
        Update: {
          assigned_distributor_ids?: Json | null
          assigned_user_id?: string | null
          assigned_user_ids?: Json | null
          child_territories_count?: number | null
          competitor_ids?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          last_updated_by?: string | null
          name?: string
          owner_id?: string | null
          parent_id?: string | null
          pincode_ranges?: string[] | null
          population?: number | null
          region?: string
          retailer_count?: number | null
          target_market_size?: number | null
          territory_type?: string | null
          updated_at?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "territories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_assignment_history: {
        Row: {
          assigned_from: string
          assigned_to: string | null
          assigned_user_id: string
          created_at: string
          id: string
          territory_id: string
          updated_at: string
        }
        Insert: {
          assigned_from: string
          assigned_to?: string | null
          assigned_user_id: string
          created_at?: string
          id?: string
          territory_id: string
          updated_at?: string
        }
        Update: {
          assigned_from?: string
          assigned_to?: string | null
          assigned_user_id?: string
          created_at?: string
          id?: string
          territory_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_assignment_history_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_approvals: {
        Row: {
          approval_level: number
          approved_at: string | null
          approver_id: string | null
          comments: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["approval_status"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approval_level: number
          approved_at?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approval_level?: number
          approved_at?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["approval_status"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          invitation_token: string
          manager_id: string | null
          phone_number: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at: string
          full_name: string
          id?: string
          invitation_token: string
          manager_id?: string | null
          phone_number?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invitation_token?: string
          manager_id?: string | null
          phone_number?: string | null
          status?: string | null
        }
        Relationships: []
      }
      user_performance_scores: {
        Row: {
          calculated_at: string | null
          id: string
          kpi_scores: Json | null
          performance_rating: string | null
          period_end: string
          period_start: string
          period_type: string
          user_id: string
          weighted_average_score: number | null
        }
        Insert: {
          calculated_at?: string | null
          id?: string
          kpi_scores?: Json | null
          performance_rating?: string | null
          period_end: string
          period_start: string
          period_type: string
          user_id: string
          weighted_average_score?: number | null
        }
        Update: {
          calculated_at?: string | null
          id?: string
          kpi_scores?: Json | null
          performance_rating?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          user_id?: string
          weighted_average_score?: number | null
        }
        Relationships: []
      }
      user_period_targets: {
        Row: {
          achievement_percent: number | null
          actual_value: number | null
          created_at: string | null
          id: string
          kpi_id: string | null
          last_calculated_at: string | null
          period_end: string
          period_start: string
          period_type: string
          status: string | null
          target_value: number
          user_id: string
        }
        Insert: {
          achievement_percent?: number | null
          actual_value?: number | null
          created_at?: string | null
          id?: string
          kpi_id?: string | null
          last_calculated_at?: string | null
          period_end: string
          period_start: string
          period_type: string
          status?: string | null
          target_value?: number
          user_id: string
        }
        Update: {
          achievement_percent?: number | null
          actual_value?: number | null
          created_at?: string | null
          id?: string
          kpi_id?: string | null
          last_calculated_at?: string | null
          period_end?: string
          period_start?: string
          period_type?: string
          status?: string | null
          target_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_period_targets_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "target_kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          assigned_at: string | null
          id: string
          profile_id: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          profile_id?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          id?: string
          profile_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "security_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_content_subscriptions: {
        Row: {
          created_at: string | null
          custom_settings: Json | null
          id: string
          is_active: boolean | null
          schedule_time: string
          template_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_settings?: Json | null
          id?: string
          is_active?: boolean | null
          schedule_time: string
          template_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_settings?: Json | null
          id?: string
          is_active?: boolean | null
          schedule_time?: string
          template_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_push_content_subscriptions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "push_content_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      van_beat_assignments: {
        Row: {
          assigned_date: string
          beat_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          updated_at: string
          van_id: string
        }
        Insert: {
          assigned_date?: string
          beat_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          van_id: string
        }
        Update: {
          assigned_date?: string
          beat_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          van_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "van_beat_assignments_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_beat_assignments_van_id_fkey"
            columns: ["van_id"]
            isOneToOne: false
            referencedRelation: "vans"
            referencedColumns: ["id"]
          },
        ]
      }
      van_closing_stock: {
        Row: {
          closing_date: string
          closing_inventory_qty: number
          computed_at: string
          created_at: string
          id: string
          total_inward_qty: number
          total_returned_qty: number
          total_sold_qty: number
          van_id: string
        }
        Insert: {
          closing_date?: string
          closing_inventory_qty?: number
          computed_at?: string
          created_at?: string
          id?: string
          total_inward_qty?: number
          total_returned_qty?: number
          total_sold_qty?: number
          van_id: string
        }
        Update: {
          closing_date?: string
          closing_inventory_qty?: number
          computed_at?: string
          created_at?: string
          id?: string
          total_inward_qty?: number
          total_returned_qty?: number
          total_sold_qty?: number
          van_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "van_closing_stock_van_id_fkey"
            columns: ["van_id"]
            isOneToOne: false
            referencedRelation: "vans"
            referencedColumns: ["id"]
          },
        ]
      }
      van_closing_stock_items: {
        Row: {
          closing_qty: number
          closing_stock_id: string
          created_at: string
          id: string
          morning_qty: number
          product_id: string
          returned_qty: number
          sold_qty: number
          variant_id: string | null
        }
        Insert: {
          closing_qty?: number
          closing_stock_id: string
          created_at?: string
          id?: string
          morning_qty?: number
          product_id: string
          returned_qty?: number
          sold_qty?: number
          variant_id?: string | null
        }
        Update: {
          closing_qty?: number
          closing_stock_id?: string
          created_at?: string
          id?: string
          morning_qty?: number
          product_id?: string
          returned_qty?: number
          sold_qty?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "van_closing_stock_items_closing_stock_id_fkey"
            columns: ["closing_stock_id"]
            isOneToOne: false
            referencedRelation: "van_closing_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_closing_stock_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_closing_stock_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      van_inward_grn: {
        Row: {
          beat_id: string | null
          created_at: string
          documents_verified: boolean | null
          grn_date: string
          grn_number: string
          id: string
          updated_at: string
          user_id: string
          van_distance_km: number | null
          van_id: string
          verified_at: string | null
          verified_by: string | null
          verified_by_name: string | null
        }
        Insert: {
          beat_id?: string | null
          created_at?: string
          documents_verified?: boolean | null
          grn_date?: string
          grn_number: string
          id?: string
          updated_at?: string
          user_id: string
          van_distance_km?: number | null
          van_id: string
          verified_at?: string | null
          verified_by?: string | null
          verified_by_name?: string | null
        }
        Update: {
          beat_id?: string | null
          created_at?: string
          documents_verified?: boolean | null
          grn_date?: string
          grn_number?: string
          id?: string
          updated_at?: string
          user_id?: string
          van_distance_km?: number | null
          van_id?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "van_inward_grn_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_inward_grn_van_id_fkey"
            columns: ["van_id"]
            isOneToOne: false
            referencedRelation: "vans"
            referencedColumns: ["id"]
          },
        ]
      }
      van_inward_grn_items: {
        Row: {
          ai_confidence_percent: number | null
          ai_scanned: boolean | null
          created_at: string
          grn_id: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          ai_confidence_percent?: number | null
          ai_scanned?: boolean | null
          created_at?: string
          grn_id: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          ai_confidence_percent?: number | null
          ai_scanned?: boolean | null
          created_at?: string
          grn_id?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "van_inward_grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "van_inward_grn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_inward_grn_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_inward_grn_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      van_live_inventory: {
        Row: {
          created_at: string
          current_stock: number
          date: string
          id: string
          last_updated_at: string
          morning_stock: number
          pending_quantity: number
          product_id: string
          returned_quantity: number
          sold_quantity: number
          van_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          current_stock?: number
          date?: string
          id?: string
          last_updated_at?: string
          morning_stock?: number
          pending_quantity?: number
          product_id: string
          returned_quantity?: number
          sold_quantity?: number
          van_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          current_stock?: number
          date?: string
          id?: string
          last_updated_at?: string
          morning_stock?: number
          pending_quantity?: number
          product_id?: string
          returned_quantity?: number
          sold_quantity?: number
          van_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "van_live_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_live_inventory_van_id_fkey"
            columns: ["van_id"]
            isOneToOne: false
            referencedRelation: "vans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_live_inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      van_order_fulfillment: {
        Row: {
          created_at: string
          fulfilled_quantity: number
          fulfillment_date: string
          id: string
          order_id: string
          order_item_id: string
          pending_quantity: number
          product_id: string
          requested_quantity: number
          updated_at: string
          van_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          fulfilled_quantity?: number
          fulfillment_date?: string
          id?: string
          order_id: string
          order_item_id: string
          pending_quantity?: number
          product_id: string
          requested_quantity: number
          updated_at?: string
          van_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          fulfilled_quantity?: number
          fulfillment_date?: string
          id?: string
          order_id?: string
          order_item_id?: string
          pending_quantity?: number
          product_id?: string
          requested_quantity?: number
          updated_at?: string
          van_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "van_order_fulfillment_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_order_fulfillment_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_order_fulfillment_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_order_fulfillment_van_id_fkey"
            columns: ["van_id"]
            isOneToOne: false
            referencedRelation: "vans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_order_fulfillment_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      van_return_grn: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean | null
          notes: string | null
          retailer_id: string
          return_date: string
          return_grn_number: string
          updated_at: string
          user_id: string
          van_id: string
          verified_at: string | null
          verified_by: string | null
          verified_by_name: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          notes?: string | null
          retailer_id: string
          return_date?: string
          return_grn_number: string
          updated_at?: string
          user_id: string
          van_id: string
          verified_at?: string | null
          verified_by?: string | null
          verified_by_name?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          notes?: string | null
          retailer_id?: string
          return_date?: string
          return_grn_number?: string
          updated_at?: string
          user_id?: string
          van_id?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_by_name?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "van_return_grn_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_return_grn_van_id_fkey"
            columns: ["van_id"]
            isOneToOne: false
            referencedRelation: "vans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_return_grn_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      van_return_grn_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          return_grn_id: string
          return_quantity: number
          return_reason: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          return_grn_id: string
          return_quantity?: number
          return_reason?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          return_grn_id?: string
          return_quantity?: number
          return_reason?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "van_return_grn_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_return_grn_items_return_grn_id_fkey"
            columns: ["return_grn_id"]
            isOneToOne: false
            referencedRelation: "van_return_grn"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_return_grn_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      van_sales_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      van_stock: {
        Row: {
          beat_id: string | null
          created_at: string
          end_km: number | null
          end_of_day_stock: Json
          id: string
          start_km: number | null
          start_of_day_stock: Json
          status: string
          stock_date: string
          total_km: number | null
          total_ordered_qty: Json
          updated_at: string
          user_id: string
          van_id: string
        }
        Insert: {
          beat_id?: string | null
          created_at?: string
          end_km?: number | null
          end_of_day_stock?: Json
          id?: string
          start_km?: number | null
          start_of_day_stock?: Json
          status?: string
          stock_date?: string
          total_km?: number | null
          total_ordered_qty?: Json
          updated_at?: string
          user_id: string
          van_id: string
        }
        Update: {
          beat_id?: string | null
          created_at?: string
          end_km?: number | null
          end_of_day_stock?: Json
          id?: string
          start_km?: number | null
          start_of_day_stock?: Json
          status?: string
          stock_date?: string
          total_km?: number | null
          total_ordered_qty?: Json
          updated_at?: string
          user_id?: string
          van_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "van_stock_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "van_stock_van_id_fkey"
            columns: ["van_id"]
            isOneToOne: false
            referencedRelation: "vans"
            referencedColumns: ["id"]
          },
        ]
      }
      van_stock_adjustments: {
        Row: {
          adjustment_type: string
          created_at: string
          created_by: string
          id: string
          product_id: string
          product_name: string
          quantity: number
          reason: string | null
          van_stock_id: string
        }
        Insert: {
          adjustment_type: string
          created_at?: string
          created_by: string
          id?: string
          product_id: string
          product_name: string
          quantity: number
          reason?: string | null
          van_stock_id: string
        }
        Update: {
          adjustment_type?: string
          created_at?: string
          created_by?: string
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          reason?: string | null
          van_stock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "van_stock_adjustments_van_stock_id_fkey"
            columns: ["van_stock_id"]
            isOneToOne: false
            referencedRelation: "van_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      van_stock_items: {
        Row: {
          created_at: string
          id: string
          left_qty: number
          ordered_qty: number
          product_id: string
          product_name: string
          returned_qty: number
          start_qty: number
          unit: string | null
          updated_at: string
          van_stock_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          left_qty?: number
          ordered_qty?: number
          product_id: string
          product_name: string
          returned_qty?: number
          start_qty?: number
          unit?: string | null
          updated_at?: string
          van_stock_id: string
        }
        Update: {
          created_at?: string
          id?: string
          left_qty?: number
          ordered_qty?: number
          product_id?: string
          product_name?: string
          returned_qty?: number
          start_qty?: number
          unit?: string | null
          updated_at?: string
          van_stock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "van_stock_items_van_stock_id_fkey"
            columns: ["van_stock_id"]
            isOneToOne: false
            referencedRelation: "van_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      vans: {
        Row: {
          assigned_user_id: string | null
          created_at: string
          created_by: string | null
          driver_address: string | null
          driver_id_proof_url: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          insurance_expiry_date: string | null
          insurance_url: string | null
          is_active: boolean
          make_model: string
          pollution_cert_url: string | null
          pollution_expiry_date: string | null
          purchase_date: string | null
          rc_book_url: string | null
          rc_expiry_date: string | null
          registration_number: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_address?: string | null
          driver_id_proof_url?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          insurance_expiry_date?: string | null
          insurance_url?: string | null
          is_active?: boolean
          make_model: string
          pollution_cert_url?: string | null
          pollution_expiry_date?: string | null
          purchase_date?: string | null
          rc_book_url?: string | null
          rc_expiry_date?: string | null
          registration_number: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_address?: string | null
          driver_id_proof_url?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          insurance_expiry_date?: string | null
          insurance_url?: string | null
          is_active?: boolean
          make_model?: string
          pollution_cert_url?: string | null
          pollution_expiry_date?: string | null
          purchase_date?: string | null
          rc_book_url?: string | null
          rc_expiry_date?: string | null
          registration_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          about_business: string | null
          annual_revenue: number | null
          assets_trucks: number | null
          assets_vans: number | null
          business_hunger: string | null
          city: string | null
          competitors: string[] | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          coverage_area: string | null
          created_at: string
          created_by: string
          established_year: number | null
          id: string
          is_approved: boolean
          name: string
          other_products: string[] | null
          products_distributed: string[] | null
          profitability: string | null
          region_pincodes: string[]
          sales_team_size: number | null
          skills: string[]
          state: string | null
          stockist_status: string | null
          updated_at: string
        }
        Insert: {
          about_business?: string | null
          annual_revenue?: number | null
          assets_trucks?: number | null
          assets_vans?: number | null
          business_hunger?: string | null
          city?: string | null
          competitors?: string[] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          coverage_area?: string | null
          created_at?: string
          created_by: string
          established_year?: number | null
          id?: string
          is_approved?: boolean
          name: string
          other_products?: string[] | null
          products_distributed?: string[] | null
          profitability?: string | null
          region_pincodes?: string[]
          sales_team_size?: number | null
          skills?: string[]
          state?: string | null
          stockist_status?: string | null
          updated_at?: string
        }
        Update: {
          about_business?: string | null
          annual_revenue?: number | null
          assets_trucks?: number | null
          assets_vans?: number | null
          business_hunger?: string | null
          city?: string | null
          competitors?: string[] | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          coverage_area?: string | null
          created_at?: string
          created_by?: string
          established_year?: number | null
          id?: string
          is_approved?: boolean
          name?: string
          other_products?: string[] | null
          products_distributed?: string[] | null
          profitability?: string | null
          region_pincodes?: string[]
          sales_team_size?: number | null
          skills?: string[]
          state?: string | null
          stockist_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      visit_ai_insights: {
        Row: {
          created_at: string | null
          id: string
          insights: Json
          retailer_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          insights: Json
          retailer_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          insights?: Json
          retailer_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_ai_insights_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          check_in_address: string | null
          check_in_location: Json | null
          check_in_photo_url: string | null
          check_in_time: string | null
          check_out_address: string | null
          check_out_location: Json | null
          check_out_photo_url: string | null
          check_out_time: string | null
          created_at: string
          feedback: Json | null
          id: string
          location_match_in: boolean | null
          location_match_out: boolean | null
          no_order_reason: string | null
          planned_date: string
          retailer_id: string
          skip_check_in_reason: string | null
          skip_check_in_time: string | null
          status: string
          updated_at: string
          user_id: string
          visit_type: string | null
        }
        Insert: {
          check_in_address?: string | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          location_match_in?: boolean | null
          location_match_out?: boolean | null
          no_order_reason?: string | null
          planned_date: string
          retailer_id: string
          skip_check_in_reason?: string | null
          skip_check_in_time?: string | null
          status?: string
          updated_at?: string
          user_id: string
          visit_type?: string | null
        }
        Update: {
          check_in_address?: string | null
          check_in_location?: Json | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_address?: string | null
          check_out_location?: Json | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          location_match_in?: boolean | null
          location_match_out?: boolean | null
          no_order_reason?: string | null
          planned_date?: string
          retailer_id?: string
          skip_check_in_reason?: string | null
          skip_check_in_time?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          visit_type?: string | null
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          business_name: string | null
          business_phone_number: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          business_phone_number: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          business_phone_number?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      orders_total_amount: {
        Row: {
          total_amount: number | null
        }
        Insert: {
          total_amount?: number | null
        }
        Update: {
          total_amount?: number | null
        }
        Relationships: []
      }
      productive_summary_daywise: {
        Row: {
          planned_date: string | null
          productive_visits: number | null
          productivity_percentage: number | null
          total_visits: number | null
          unproductive_visits: number | null
        }
        Relationships: []
      }
      productive_summary_week: {
        Row: {
          planned_date: string | null
          productive_visits: number | null
          productivity_percentage: number | null
          total_visits: number | null
          unproductive_visits: number | null
        }
        Relationships: []
      }
      productive_view: {
        Row: {
          full_name: string | null
          productive_visits: number | null
          productivity_percentage: number | null
          total_visits: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_beat_adherence: {
        Args: { p_end: string; p_start: string; p_user_id: string }
        Returns: number
      }
      calculate_new_retailers: {
        Args: { p_end: string; p_start: string; p_user_id: string }
        Returns: number
      }
      calculate_productive_visits: {
        Args: { p_end: string; p_start: string; p_user_id: string }
        Returns: number
      }
      calculate_revenue_contribution: {
        Args: { p_end: string; p_start: string; p_user_id: string }
        Returns: number
      }
      calculate_user_kpi_actual: {
        Args: {
          p_end: string
          p_kpi_key: string
          p_start: string
          p_user_id: string
        }
        Returns: number
      }
      calculate_visit_completion_rate: {
        Args: { p_end: string; p_start: string; p_user_id: string }
        Returns: number
      }
      can_access_invitation: {
        Args: { _invitation_token: string }
        Returns: boolean
      }
      can_access_object: {
        Args: {
          object_name_param: string
          permission_type: string
          user_id_param: string
        }
        Returns: boolean
      }
      can_view_employee: { Args: { _target_user_id: string }; Returns: boolean }
      can_view_profile: { Args: { _target_user_id: string }; Returns: boolean }
      check_duplicate_competitor: {
        Args: { competitor_name_param: string }
        Returns: {
          competitor_id: string
          competitor_image_url: string
          competitor_name: string
          is_duplicate: boolean
          product_details: string
        }[]
      }
      cleanup_expired_recommendations: { Args: never; Returns: undefined }
      cleanup_expired_reset_tokens: { Args: never; Returns: undefined }
      cleanup_old_execution_logs: { Args: never; Returns: undefined }
      create_approval_workflow: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      generate_invoice_number: { Args: never; Returns: string }
      get_all_subordinates: {
        Args: { manager_user_id: string }
        Returns: {
          full_name: string
          level: number
          subordinate_user_id: string
        }[]
      }
      get_authenticated_email: { Args: never; Returns: string }
      get_basic_profiles_for_admin: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          id: string
          username: string
        }[]
      }
      get_direct_reports: {
        Args: { manager_user_id: string }
        Returns: {
          full_name: string
          profile_picture_url: string
          subordinate_user_id: string
        }[]
      }
      get_employee_basic_info: {
        Args: { employee_user_id: string }
        Returns: {
          full_name: string
          hq: string
          user_id: string
        }[]
      }
      get_limited_profiles_for_admin: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          id: string
          profile_picture_url: string
          user_status: Database["public"]["Enums"]["user_status"]
          username: string
        }[]
      }
      get_password_reset_stats: {
        Args: never
        Returns: {
          email: string
          failed_attempts: number
          is_locked: boolean
          last_attempt: string
          total_attempts: number
        }[]
      }
      get_product_revenue_performance: {
        Args: { end_date?: string; start_date?: string; user_full_name: string }
        Returns: {
          full_name: string
          product_name: string
          quantity_sold: number
          revenue: number
          unit: string
        }[]
      }
      get_productivity_summary:
        | {
            Args: { user_full_name: string }
            Returns: {
              full_name: string
              planned_date: string
              productive_visits: number
              productivity_percentage: number
              total_visits: number
              unproductive_visits: number
            }[]
          }
        | {
            Args: {
              end_date?: string
              start_date?: string
              user_full_name: string
            }
            Returns: {
              full_name: string
              planned_date: string
              productive_visits: number
              productivity_percentage: number
              total_visits: number
              unproductive_visits: number
            }[]
          }
      get_public_vendors: {
        Args: never
        Returns: {
          city: string
          created_at: string
          id: string
          is_approved: boolean
          name: string
          region_pincodes: string[]
          skills: string[]
          state: string
        }[]
      }
      get_subordinate_users: {
        Args: { user_id_param: string }
        Returns: {
          subordinate_user_id: string
        }[]
      }
      get_suspicious_access_attempts: {
        Args: never
        Returns: {
          action: string
          attempt_count: number
          first_attempt: string
          last_attempt: string
          table_name: string
          user_id: string
        }[]
      }
      get_territory_sales_summary: {
        Args: {
          end_date_param?: string
          start_date_param?: string
          territory_id_param: string
        }
        Returns: {
          total_orders: number
          total_retailers: number
          total_sales: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_vendor_contact_info: {
        Args: { vendor_id: string }
        Returns: {
          city: string
          competitors: string[]
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          created_by: string
          id: string
          is_approved: boolean
          name: string
          region_pincodes: string[]
          skills: string[]
          state: string
          updated_at: string
        }[]
      }
      get_vendors_public_info: {
        Args: never
        Returns: {
          city: string
          created_at: string
          id: string
          is_approved: boolean
          name: string
          region_pincodes: string[]
          skills: string[]
          state: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_hint_answer: { Args: { answer: string }; Returns: string }
      is_account_locked: { Args: { user_email: string }; Returns: boolean }
      is_manager: { Args: { user_id_param: string }; Returns: boolean }
      list_team_members: {
        Args: never
        Returns: {
          full_name: string
          hq: string
          manager_id: string
          profile_picture_url: string
          user_id: string
          username: string
        }[]
      }
      log_sensitive_access: {
        Args: { p_action: string; p_record_id: string; p_table_name: string }
        Returns: undefined
      }
      owns_completed_invitation: {
        Args: { _email: string; _user_id: string }
        Returns: boolean
      }
      send_notification: {
        Args: {
          message_param: string
          related_id_param?: string
          related_table_param?: string
          title_param: string
          type_param?: string
          user_id_param: string
        }
        Returns: string
      }
      unlock_password_reset: { Args: { user_email: string }; Returns: boolean }
      update_security_info: {
        Args: { new_hint_answer: string; new_hint_question: string }
        Returns: boolean
      }
      update_security_info_secure: {
        Args: {
          new_hint_answer: string
          new_hint_question: string
          new_phone_number?: string
          new_recovery_email?: string
        }
        Returns: boolean
      }
      update_sensitive_profile_fields: {
        Args: {
          new_hint_answer?: string
          new_hint_question?: string
          new_phone_number?: string
          new_recovery_email?: string
        }
        Returns: boolean
      }
      validate_invitation_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          full_name: string
          id: string
          manager_id: string
          phone_number: string
        }[]
      }
      verify_hint_answer: {
        Args: { submitted_answer: string; user_email: string }
        Returns: boolean
      }
      verify_hint_answer_secure: {
        Args: { submitted_answer: string; user_email: string }
        Returns: boolean
      }
      verify_hint_answer_with_rate_limit: {
        Args: {
          submitted_answer: string
          user_agent_str?: string
          user_email: string
          user_ip?: string
        }
        Returns: {
          attempts_remaining: number
          is_locked: boolean
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      approval_status: "pending" | "approved" | "rejected"
      branding_status:
        | "submitted"
        | "manager_approved"
        | "manager_rejected"
        | "assigned"
        | "in_progress"
        | "executed"
        | "verified"
      employee_doc_type: "address_proof" | "id_proof" | "other"
      user_status:
        | "pending_completion"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "active"
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
      app_role: ["admin", "user"],
      approval_status: ["pending", "approved", "rejected"],
      branding_status: [
        "submitted",
        "manager_approved",
        "manager_rejected",
        "assigned",
        "in_progress",
        "executed",
        "verified",
      ],
      employee_doc_type: ["address_proof", "id_proof", "other"],
      user_status: [
        "pending_completion",
        "pending_approval",
        "approved",
        "rejected",
        "active",
      ],
    },
  },
} as const
