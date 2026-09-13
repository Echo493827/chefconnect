// Generated from supabase/migrations against a migrated Postgres database.
// Regenerate after any schema change:
//   npx supabase login                       (once)
//   SUPABASE_PROJECT_REF=<ref> npm run db:types
// Do not edit by hand.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string
          session_id: string
          user_id: string
          seat_type: Database["public"]["Enums"]["seat_type"]
          status: Database["public"]["Enums"]["booking_status"]
          waiver_acceptance_id: string
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          seat_type: Database["public"]["Enums"]["seat_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          waiver_acceptance_id: string
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          seat_type?: Database["public"]["Enums"]["seat_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          waiver_acceptance_id?: string
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_waiver_acceptance_id_fkey"
            columns: ["waiver_acceptance_id"]
            isOneToOne: false
            referencedRelation: "waiver_acceptances"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_profiles: {
        Row: {
          id: string
          user_id: string
          slug: string
          chef_type: Database["public"]["Enums"]["chef_type"]
          business_name: string | null
          headline: string | null
          about: string | null
          years_experience: number | null
          specialties: string[]
          social_links: Json
          cover_image_url: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          is_accepting_bookings: boolean
          is_suspended: boolean
          rating_avg: number
          rating_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          slug: string
          chef_type: Database["public"]["Enums"]["chef_type"]
          business_name?: string | null
          headline?: string | null
          about?: string | null
          years_experience?: number | null
          specialties?: string[]
          social_links?: Json
          cover_image_url?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          is_accepting_bookings?: boolean
          is_suspended?: boolean
          rating_avg?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          slug?: string
          chef_type?: Database["public"]["Enums"]["chef_type"]
          business_name?: string | null
          headline?: string | null
          about?: string | null
          years_experience?: number | null
          specialties?: string[]
          social_links?: Json
          cover_image_url?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          is_accepting_bookings?: boolean
          is_suspended?: boolean
          rating_avg?: number
          rating_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          id: string
          chef_profile_id: string
          slug: string
          title: string
          summary: string | null
          description: string | null
          cuisine: string
          skill_level: Database["public"]["Enums"]["skill_level"]
          tags: string[]
          dietary_tags: string[]
          duration_minutes: number
          price_cents: number
          currency: string
          cover_image_url: string | null
          gallery_urls: string[]
          what_you_learn: string[]
          what_to_bring: string[]
          status: Database["public"]["Enums"]["class_status"]
          search_vector: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chef_profile_id: string
          slug: string
          title: string
          summary?: string | null
          description?: string | null
          cuisine: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
          tags?: string[]
          dietary_tags?: string[]
          duration_minutes: number
          price_cents?: number
          currency?: string
          cover_image_url?: string | null
          gallery_urls?: string[]
          what_you_learn?: string[]
          what_to_bring?: string[]
          status?: Database["public"]["Enums"]["class_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chef_profile_id?: string
          slug?: string
          title?: string
          summary?: string | null
          description?: string | null
          cuisine?: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
          tags?: string[]
          dietary_tags?: string[]
          duration_minutes?: number
          price_cents?: number
          currency?: string
          cover_image_url?: string | null
          gallery_urls?: string[]
          what_you_learn?: string[]
          what_to_bring?: string[]
          status?: Database["public"]["Enums"]["class_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_chef_profile_id_fkey"
            columns: ["chef_profile_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_addresses: {
        Row: {
          location_id: string
          full_address: string
          exact_lat: number
          exact_lng: number
          arrival_notes: string | null
          updated_at: string
        }
        Insert: {
          location_id: string
          full_address: string
          exact_lat: number
          exact_lng: number
          arrival_notes?: string | null
          updated_at?: string
        }
        Update: {
          location_id?: string
          full_address?: string
          exact_lat?: number
          exact_lng?: number
          arrival_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_addresses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          id: string
          chef_profile_id: string
          label: string
          city: string
          region: string | null
          country_code: string
          neighborhood: string | null
          approx_lat: number | null
          approx_lng: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chef_profile_id: string
          label: string
          city: string
          region?: string | null
          country_code?: string
          neighborhood?: string | null
          approx_lat?: number | null
          approx_lng?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chef_profile_id?: string
          label?: string
          city?: string
          region?: string | null
          country_code?: string
          neighborhood?: string | null
          approx_lat?: number | null
          approx_lng?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_chef_profile_id_fkey"
            columns: ["chef_profile_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          kind: string
          title: string
          body: string | null
          data: Json
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: string
          title: string
          body?: string | null
          data?: Json
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kind?: string
          title?: string
          body?: string | null
          data?: Json
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recaps: {
        Row: {
          id: string
          session_id: string
          chef_profile_id: string
          title: string
          body: string | null
          photo_urls: string[]
          attachments: Json
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          chef_profile_id: string
          title: string
          body?: string | null
          photo_urls?: string[]
          attachments?: Json
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          chef_profile_id?: string
          title?: string
          body?: string | null
          photo_urls?: string[]
          attachments?: Json
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recaps_chef_profile_id_fkey"
            columns: ["chef_profile_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recaps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          target_id: string
          reason: string
          details: string | null
          status: Database["public"]["Enums"]["report_status"]
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          target_id: string
          reason: string
          details?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
          target_id?: string
          reason?: string
          details?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          session_id: string
          class_id: string
          chef_profile_id: string
          user_id: string
          rating: number
          body: string | null
          chef_response: string | null
          chef_responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          session_id: string
          class_id: string
          chef_profile_id: string
          user_id: string
          rating: number
          body?: string | null
          chef_response?: string | null
          chef_responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          session_id?: string
          class_id?: string
          chef_profile_id?: string
          user_id?: string
          rating?: number
          body?: string | null
          chef_response?: string | null
          chef_responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_chef_profile_id_fkey"
            columns: ["chef_profile_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_classes: {
        Row: {
          user_id: string
          class_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          class_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          class_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_classes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_secrets: {
        Row: {
          session_id: string
          virtual_join_url: string | null
          attendee_notes: string | null
          updated_at: string
        }
        Insert: {
          session_id: string
          virtual_join_url?: string | null
          attendee_notes?: string | null
          updated_at?: string
        }
        Update: {
          session_id?: string
          virtual_join_url?: string | null
          attendee_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_secrets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          id: string
          class_id: string
          location_id: string | null
          format: Database["public"]["Enums"]["session_format"]
          starts_at: string
          ends_at: string
          timezone: string
          inperson_capacity: number
          virtual_capacity: number
          inperson_booked: number
          virtual_booked: number
          cancellation_cutoff_hours: number
          status: Database["public"]["Enums"]["session_status"]
          cancelled_at: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_id: string
          location_id?: string | null
          format: Database["public"]["Enums"]["session_format"]
          starts_at: string
          ends_at: string
          timezone?: string
          inperson_capacity?: number
          virtual_capacity?: number
          inperson_booked?: number
          virtual_booked?: number
          cancellation_cutoff_hours?: number
          status?: Database["public"]["Enums"]["session_status"]
          cancelled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          location_id?: string | null
          format?: Database["public"]["Enums"]["session_format"]
          starts_at?: string
          ends_at?: string
          timezone?: string
          inperson_capacity?: number
          virtual_capacity?: number
          inperson_booked?: number
          virtual_booked?: number
          cancellation_cutoff_hours?: number
          status?: Database["public"]["Enums"]["session_status"]
          cancelled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          bio: string | null
          role: Database["public"]["Enums"]["user_role"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          bio?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_acceptances: {
        Row: {
          id: string
          user_id: string
          session_id: string
          waiver_version: string
          accepted_at: string
          ip_address: unknown | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          waiver_version: string
          accepted_at?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          waiver_version?: string
          accepted_at?: string
          ip_address?: unknown | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waiver_acceptances_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiver_acceptances_waiver_version_fkey"
            columns: ["waiver_version"]
            isOneToOne: false
            referencedRelation: "waivers"
            referencedColumns: ["version"]
          },
        ]
      }
      waivers: {
        Row: {
          version: string
          title: string
          body: string
          is_current: boolean
          effective_from: string
          created_at: string
        }
        Insert: {
          version: string
          title: string
          body: string
          is_current?: boolean
          effective_from?: string
          created_at?: string
        }
        Update: {
          version?: string
          title?: string
          body?: string
          is_current?: boolean
          effective_from?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_chef_suspended: {
        Args: {
          p_chef_profile_id: string
          p_suspended: boolean
        }
        Returns: undefined
      }
      admin_set_class_status: {
        Args: {
          p_class_id: string
          p_status: Database["public"]["Enums"]["class_status"]
        }
        Returns: undefined
      }
      is_chef_suspended: {
        Args: {
          p_chef_profile_id: string
        }
        Returns: boolean
      }
      resolve_report: {
        Args: {
          p_report_id: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: undefined
      }
      array_to_search_text: {
        Args: {
          p_items: string[]
        }
        Returns: string
      }
      book_session: {
        Args: {
          p_session_id: string
          p_seat_type: Database["public"]["Enums"]["seat_type"]
          p_waiver_version: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      cancel_booking: {
        Args: {
          p_booking_id: string
        }
        Returns: undefined
      }
      claim_seat: {
        Args: {
          p_session_id: string
          p_seat: Database["public"]["Enums"]["seat_type"]
        }
        Returns: undefined
      }
      current_chef_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_live_booking: {
        Args: {
          p_session_id: string
        }
        Returns: boolean
      }
      has_live_booking_at_location: {
        Args: {
          p_location_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_chef_of_class: {
        Args: {
          p_class_id: string
        }
        Returns: boolean
      }
      is_chef_of_session: {
        Args: {
          p_session_id: string
        }
        Returns: boolean
      }
      is_class_published: {
        Args: {
          p_class_id: string
        }
        Returns: boolean
      }
      release_seat: {
        Args: {
          p_session_id: string
          p_seat: Database["public"]["Enums"]["seat_type"]
        }
        Returns: undefined
      }
      upsert_location: {
        Args: {
          p_label: string
          p_city: string
          p_full_address: string
          p_exact_lat: number
          p_exact_lng: number
          p_location_id?: string
          p_region?: string
          p_country_code?: string
          p_neighborhood?: string
          p_arrival_notes?: string
        }
        Returns: string
      }
    }
    Enums: {
      booking_status: "confirmed" | "cancelled" | "attended" | "no_show"
      chef_type: "home" | "restaurant" | "youtube" | "celebrity" | "cooking_school" | "other"
      class_status: "draft" | "published" | "archived"
      report_status: "open" | "reviewed" | "dismissed" | "actioned"
      report_target: "class" | "session" | "chef_profile" | "review" | "recap" | "user"
      seat_type: "in_person" | "virtual"
      session_format: "in_person" | "virtual" | "hybrid"
      session_status: "scheduled" | "cancelled" | "completed"
      skill_level: "beginner" | "intermediate" | "advanced" | "all_levels"
      user_role: "attendee" | "chef" | "admin"
      verification_status: "unverified" | "pending" | "verified"
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
