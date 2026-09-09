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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_user: {
        Row: {
          created_at: string
          display_name: string
          id: string
          locale: string
          person_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          locale?: string
          person_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          locale?: string
          person_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_user_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          after: Json | null
          before: Json | null
          id: number
          occurred_at: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          id?: number
          occurred_at?: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          id?: number
          occurred_at?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      buyer: {
        Row: {
          channel: Database["public"]["Enums"]["buyer_channel"]
          contact_note: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["buyer_channel"]
          contact_note?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["buyer_channel"]
          contact_note?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_demand: {
        Row: {
          buyer_id: string
          captured_at: string
          captured_by: string | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          crop_id: string
          currency: string
          deleted_at: string | null
          delivery_point: string | null
          id: string
          indicative_price_per_kg: number | null
          project_id: string
          quality_note: string | null
          quantity_kg: number
          status: Database["public"]["Enums"]["demand_status"]
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          window_end: string
          window_start: string
        }
        Insert: {
          buyer_id: string
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          crop_id: string
          currency?: string
          deleted_at?: string | null
          delivery_point?: string | null
          id?: string
          indicative_price_per_kg?: number | null
          project_id: string
          quality_note?: string | null
          quantity_kg: number
          status?: Database["public"]["Enums"]["demand_status"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          window_end: string
          window_start: string
        }
        Update: {
          buyer_id?: string
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          crop_id?: string
          currency?: string
          deleted_at?: string | null
          delivery_point?: string | null
          id?: string
          indicative_price_per_kg?: number | null
          project_id?: string
          quality_note?: string | null
          quantity_kg?: number
          status?: Database["public"]["Enums"]["demand_status"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_demand_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_demand_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_demand_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_demand_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      country: {
        Row: {
          created_at: string
          default_area_unit: Database["public"]["Enums"]["area_unit"]
          id: string
          iso2: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_area_unit?: Database["public"]["Enums"]["area_unit"]
          id?: string
          iso2: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_area_unit?: Database["public"]["Enums"]["area_unit"]
          id?: string
          iso2?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      crop: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          measured_by: Database["public"]["Enums"]["crop_measure"]
          name_en: string
          name_sw: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          measured_by?: Database["public"]["Enums"]["crop_measure"]
          name_en: string
          name_sw: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          measured_by?: Database["public"]["Enums"]["crop_measure"]
          name_en?: string
          name_sw?: string
          updated_at?: string
        }
        Relationships: []
      }
      crop_cycle: {
        Row: {
          area_ha: number | null
          captured_at: string
          captured_by: string | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          crop_id: string
          deleted_at: string | null
          evidence_ref: string | null
          harvest_end: string | null
          harvest_start: string | null
          id: string
          planted_on: string | null
          plot_id: string
          season_label: string | null
          source: Database["public"]["Enums"]["source_type"]
          status: Database["public"]["Enums"]["crop_cycle_status"]
          tree_count: number | null
          unit_count: number | null
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          village_id: string
        }
        Insert: {
          area_ha?: number | null
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          crop_id: string
          deleted_at?: string | null
          evidence_ref?: string | null
          harvest_end?: string | null
          harvest_start?: string | null
          id?: string
          planted_on?: string | null
          plot_id: string
          season_label?: string | null
          source: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["crop_cycle_status"]
          tree_count?: number | null
          unit_count?: number | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id: string
        }
        Update: {
          area_ha?: number | null
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          crop_id?: string
          deleted_at?: string | null
          evidence_ref?: string | null
          harvest_end?: string | null
          harvest_start?: string | null
          id?: string
          planted_on?: string | null
          plot_id?: string
          season_label?: string | null
          source?: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["crop_cycle_status"]
          tree_count?: number | null
          unit_count?: number | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_cycle_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_cycle_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_cycle_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_cycle_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_plot_village_fk"
            columns: ["plot_id", "village_id"]
            isOneToOne: false
            referencedRelation: "plot"
            referencedColumns: ["id", "village_id"]
          },
        ]
      }
      energy_estimate: {
        Row: {
          computed_at: string
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          days_per_week: number
          est_kwh_per_day: number | null
          est_kwh_per_week: number | null
          est_power_kw: number | null
          hours_per_day: number
          id: string
          method: string
          pue_request_id: string
          quantity: number
          rated_power_kw: number
          source: Database["public"]["Enums"]["source_type"]
          updated_at: string
          village_id: string
        }
        Insert: {
          computed_at?: string
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          days_per_week: number
          est_kwh_per_day?: number | null
          est_kwh_per_week?: number | null
          est_power_kw?: number | null
          hours_per_day: number
          id?: string
          method?: string
          pue_request_id: string
          quantity: number
          rated_power_kw: number
          source?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          village_id: string
        }
        Update: {
          computed_at?: string
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          days_per_week?: number
          est_kwh_per_day?: number | null
          est_kwh_per_week?: number | null
          est_power_kw?: number | null
          hours_per_day?: number
          id?: string
          method?: string
          pue_request_id?: string
          quantity?: number
          rated_power_kw?: number
          source?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "energy_estimate_pue_request_id_fkey"
            columns: ["pue_request_id"]
            isOneToOne: true
            referencedRelation: "pue_request"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_estimate_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_data_quality"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "energy_estimate_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_energy"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "energy_estimate_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "village"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category_id: string
          code: string
          created_at: string
          currency: string
          id: string
          indicative_price: number | null
          is_active: boolean
          name_en: string
          name_sw: string
          project_id: string
          rated_power_kw: number | null
          typical_days_per_week: number | null
          typical_hours_per_day: number | null
          updated_at: string
        }
        Insert: {
          category_id: string
          code: string
          created_at?: string
          currency?: string
          id?: string
          indicative_price?: number | null
          is_active?: boolean
          name_en: string
          name_sw: string
          project_id: string
          rated_power_kw?: number | null
          typical_days_per_week?: number | null
          typical_hours_per_day?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          code?: string
          created_at?: string
          currency?: string
          id?: string
          indicative_price?: number | null
          is_active?: boolean
          name_en?: string
          name_sw?: string
          project_id?: string
          rated_power_kw?: number | null
          typical_days_per_week?: number | null
          typical_hours_per_day?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_category: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_sw: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_sw: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_sw?: string
          updated_at?: string
        }
        Relationships: []
      }
      farm: {
        Row: {
          captured_at: string
          captured_by: string | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          deleted_at: string | null
          evidence_ref: string | null
          household_id: string | null
          id: string
          label: string
          latitude: number | null
          longitude: number | null
          source: Database["public"]["Enums"]["source_type"]
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          village_id: string
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          deleted_at?: string | null
          evidence_ref?: string | null
          household_id?: string | null
          id?: string
          label: string
          latitude?: number | null
          longitude?: number | null
          source: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id: string
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          deleted_at?: string | null
          evidence_ref?: string | null
          household_id?: string | null
          id?: string
          label?: string
          latitude?: number | null
          longitude?: number | null
          source?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_data_quality"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "farm_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_energy"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "farm_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "village"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_manager: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          is_primary: boolean
          person_id: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          is_primary?: boolean
          person_id: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          is_primary?: boolean
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_manager_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_manager_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_report: {
        Row: {
          captured_at: string
          captured_by: string | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          crop_cycle_id: string
          deleted_at: string | null
          evidence_ref: string | null
          id: string
          is_current: boolean
          kind: Database["public"]["Enums"]["harvest_kind"]
          quantity_kg: number
          reported_for: string | null
          source: Database["public"]["Enums"]["source_type"]
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          village_id: string
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          crop_cycle_id: string
          deleted_at?: string | null
          evidence_ref?: string | null
          id?: string
          is_current?: boolean
          kind: Database["public"]["Enums"]["harvest_kind"]
          quantity_kg: number
          reported_for?: string | null
          source: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id: string
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          crop_cycle_id?: string
          deleted_at?: string | null
          evidence_ref?: string | null
          id?: string
          is_current?: boolean
          kind?: Database["public"]["Enums"]["harvest_kind"]
          quantity_kg?: number
          reported_for?: string | null
          source?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvest_cycle_village_fk"
            columns: ["crop_cycle_id", "village_id"]
            isOneToOne: false
            referencedRelation: "crop_cycle"
            referencedColumns: ["id", "village_id"]
          },
          {
            foreignKeyName: "harvest_report_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_report_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_report_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
        ]
      }
      household: {
        Row: {
          captured_at: string
          captured_by: string | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          deleted_at: string | null
          evidence_ref: string | null
          id: string
          label: string
          source: Database["public"]["Enums"]["source_type"]
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          village_id: string
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          deleted_at?: string | null
          evidence_ref?: string | null
          id?: string
          label: string
          source: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id: string
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          deleted_at?: string | null
          evidence_ref?: string | null
          id?: string
          label?: string
          source?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_captured_by_fk"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_verified_by_fk"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_data_quality"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "household_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_energy"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "household_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "village"
            referencedColumns: ["id"]
          },
        ]
      }
      household_member: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_head: boolean
          person_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_head?: boolean
          person_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_head?: boolean
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_member_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_member_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
        ]
      }
      membership: {
        Row: {
          created_at: string
          id: string
          project_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          village_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          village_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_village_in_project"
            columns: ["village_id", "project_id"]
            isOneToOne: false
            referencedRelation: "village"
            referencedColumns: ["id", "project_id"]
          },
        ]
      }
      opportunity: {
        Row: {
          buyer_demand_id: string
          captured_at: string
          captured_by: string | null
          created_at: string
          crop_id: string
          deleted_at: string | null
          id: string
          note: string | null
          offered_quantity_kg: number
          status: Database["public"]["Enums"]["opportunity_status"]
          updated_at: string
          village_id: string
        }
        Insert: {
          buyer_demand_id: string
          captured_at?: string
          captured_by?: string | null
          created_at?: string
          crop_id: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          offered_quantity_kg?: number
          status?: Database["public"]["Enums"]["opportunity_status"]
          updated_at?: string
          village_id: string
        }
        Update: {
          buyer_demand_id?: string
          captured_at?: string
          captured_by?: string | null
          created_at?: string
          crop_id?: string
          deleted_at?: string | null
          id?: string
          note?: string | null
          offered_quantity_kg?: number
          status?: Database["public"]["Enums"]["opportunity_status"]
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_buyer_demand_id_fkey"
            columns: ["buyer_demand_id"]
            isOneToOne: false
            referencedRelation: "buyer_demand"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_buyer_demand_id_fkey"
            columns: ["buyer_demand_id"]
            isOneToOne: false
            referencedRelation: "v_demand_match"
            referencedColumns: ["buyer_demand_id"]
          },
          {
            foreignKeyName: "opportunity_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_data_quality"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "opportunity_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_energy"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "opportunity_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "village"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_supply: {
        Row: {
          contributed_kg: number
          created_at: string
          crop_cycle_id: string
          harvest_report_id: string
          id: string
          opportunity_id: string
        }
        Insert: {
          contributed_kg: number
          created_at?: string
          crop_cycle_id: string
          harvest_report_id: string
          id?: string
          opportunity_id: string
        }
        Update: {
          contributed_kg?: number
          created_at?: string
          crop_cycle_id?: string
          harvest_report_id?: string
          id?: string
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_supply_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_supply_harvest_report_id_fkey"
            columns: ["harvest_report_id"]
            isOneToOne: false
            referencedRelation: "harvest_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_supply_harvest_report_id_fkey"
            columns: ["harvest_report_id"]
            isOneToOne: false
            referencedRelation: "v_harvest_available"
            referencedColumns: ["harvest_report_id"]
          },
          {
            foreignKeyName: "opportunity_supply_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_supply_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "v_demand_match"
            referencedColumns: ["opportunity_id"]
          },
        ]
      }
      person: {
        Row: {
          captured_at: string
          captured_by: string | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          deleted_at: string | null
          evidence_ref: string | null
          family_name: string
          given_name: string
          id: string
          phone: string | null
          source: Database["public"]["Enums"]["source_type"]
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          village_id: string
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          deleted_at?: string | null
          evidence_ref?: string | null
          family_name: string
          given_name: string
          id?: string
          phone?: string | null
          source: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id: string
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          deleted_at?: string | null
          evidence_ref?: string | null
          family_name?: string
          given_name?: string
          id?: string
          phone?: string | null
          source?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_captured_by_fk"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_verified_by_fk"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_data_quality"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "person_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_energy"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "person_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "village"
            referencedColumns: ["id"]
          },
        ]
      }
      plot: {
        Row: {
          area_ha: number | null
          captured_at: string
          captured_by: string | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          deleted_at: string | null
          evidence_ref: string | null
          farm_id: string
          id: string
          label: string
          latitude: number | null
          longitude: number | null
          source: Database["public"]["Enums"]["source_type"]
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          village_id: string
        }
        Insert: {
          area_ha?: number | null
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          deleted_at?: string | null
          evidence_ref?: string | null
          farm_id: string
          id?: string
          label: string
          latitude?: number | null
          longitude?: number | null
          source: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id: string
        }
        Update: {
          area_ha?: number | null
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          deleted_at?: string | null
          evidence_ref?: string | null
          farm_id?: string
          id?: string
          label?: string
          latitude?: number | null
          longitude?: number | null
          source?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plot_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plot_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plot_farm_village_fk"
            columns: ["farm_id", "village_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id", "village_id"]
          },
          {
            foreignKeyName: "plot_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
        ]
      }
      project: {
        Row: {
          code: string
          country_id: string
          created_at: string
          id: string
          name: string
          operator: string | null
          started_on: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          code: string
          country_id: string
          created_at?: string
          id?: string
          name: string
          operator?: string | null
          started_on?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          country_id?: string
          created_at?: string
          id?: string
          name?: string
          operator?: string | null
          started_on?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "country"
            referencedColumns: ["id"]
          },
        ]
      }
      pue_request: {
        Row: {
          captured_at: string
          captured_by: string | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          created_at: string
          days_per_week: number | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          deleted_at: string | null
          equipment_id: string
          evidence_ref: string | null
          farm_id: string | null
          hours_per_day: number | null
          id: string
          person_id: string
          purpose: string | null
          quantity: number
          source: Database["public"]["Enums"]["source_type"]
          status: Database["public"]["Enums"]["pue_status"]
          submitted_at: string | null
          updated_at: string
          verification: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          village_id: string
        }
        Insert: {
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          days_per_week?: number | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          deleted_at?: string | null
          equipment_id: string
          evidence_ref?: string | null
          farm_id?: string | null
          hours_per_day?: number | null
          id?: string
          person_id: string
          purpose?: string | null
          quantity?: number
          source?: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["pue_status"]
          submitted_at?: string | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id: string
        }
        Update: {
          captured_at?: string
          captured_by?: string | null
          confidence?: Database["public"]["Enums"]["confidence_level"] | null
          created_at?: string
          days_per_week?: number | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          deleted_at?: string | null
          equipment_id?: string
          evidence_ref?: string | null
          farm_id?: string | null
          hours_per_day?: number | null
          id?: string
          person_id?: string
          purpose?: string | null
          quantity?: number
          source?: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["pue_status"]
          submitted_at?: string | null
          updated_at?: string
          verification?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pue_farm_village_fk"
            columns: ["farm_id", "village_id"]
            isOneToOne: false
            referencedRelation: "farm"
            referencedColumns: ["id", "village_id"]
          },
          {
            foreignKeyName: "pue_request_captured_by_fkey"
            columns: ["captured_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pue_request_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pue_request_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pue_request_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "person"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pue_request_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pue_request_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_data_quality"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "pue_request_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_energy"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "pue_request_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "village"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_receipt: {
        Row: {
          client_ref: string
          created_at: string
          created_by: string
          result: Json
        }
        Insert: {
          client_ref: string
          created_at?: string
          created_by: string
          result: Json
        }
        Update: {
          client_ref?: string
          created_at?: string
          created_by?: string
          result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "registration_receipt_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          },
        ]
      }
      village: {
        Row: {
          code: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          primary_language: string
          project_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          primary_language?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          primary_language?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "village_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
        ]
      }
      village_capacity: {
        Row: {
          basis: Database["public"]["Enums"]["capacity_basis"]
          capacity_kw: number
          created_at: string
          effective_from: string
          id: string
          is_current: boolean
          simultaneity_factor: number
          source_note: string | null
          updated_at: string
          village_id: string
        }
        Insert: {
          basis?: Database["public"]["Enums"]["capacity_basis"]
          capacity_kw: number
          created_at?: string
          effective_from?: string
          id?: string
          is_current?: boolean
          simultaneity_factor?: number
          source_note?: string | null
          updated_at?: string
          village_id: string
        }
        Update: {
          basis?: Database["public"]["Enums"]["capacity_basis"]
          capacity_kw?: number
          created_at?: string
          effective_from?: string
          id?: string
          is_current?: boolean
          simultaneity_factor?: number
          source_note?: string | null
          updated_at?: string
          village_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "village_capacity_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_data_quality"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "village_capacity_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_energy"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "village_capacity_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "village"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_demand_match: {
        Row: {
          available_kg: number | null
          buyer_demand_id: string | null
          buyer_id: string | null
          coverable_kg: number | null
          coverage_pct: number | null
          crop_id: string | null
          demand_kg: number | null
          opportunity_id: string | null
          opportunity_status:
            | Database["public"]["Enums"]["opportunity_status"]
            | null
          village_id: string | null
          window_end: string | null
          window_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_demand_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_demand_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop"
            referencedColumns: ["id"]
          },
        ]
      }
      v_harvest_available: {
        Row: {
          available_kg: number | null
          committed_kg: number | null
          confidence: Database["public"]["Enums"]["confidence_level"] | null
          crop_cycle_id: string | null
          crop_id: string | null
          harvest_end: string | null
          harvest_report_id: string | null
          harvest_start: string | null
          plot_id: string | null
          quantity_kg: number | null
          verification:
            | Database["public"]["Enums"]["verification_status"]
            | null
          village_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_cycle_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_cycle_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_cycle_village_fk"
            columns: ["crop_cycle_id", "village_id"]
            isOneToOne: false
            referencedRelation: "crop_cycle"
            referencedColumns: ["id", "village_id"]
          },
          {
            foreignKeyName: "harvest_report_crop_cycle_id_fkey"
            columns: ["crop_cycle_id"]
            isOneToOne: false
            referencedRelation: "crop_cycle"
            referencedColumns: ["id"]
          },
        ]
      }
      v_village_data_quality: {
        Row: {
          cycles: number | null
          cycles_with_estimate: number | null
          farms: number | null
          farms_with_gps: number | null
          persons: number | null
          persons_verified: number | null
          village_id: string | null
        }
        Insert: {
          cycles?: never
          cycles_with_estimate?: never
          farms?: never
          farms_with_gps?: never
          persons?: never
          persons_verified?: never
          village_id?: string | null
        }
        Update: {
          cycles?: never
          cycles_with_estimate?: never
          farms?: never
          farms_with_gps?: never
          persons?: never
          persons_verified?: never
          village_id?: string | null
        }
        Relationships: []
      }
      v_village_energy: {
        Row: {
          approved_assets: number | null
          approved_kw_raw: number | null
          approved_kwh_per_week: number | null
          approved_peak_kw: number | null
          capacity_basis: Database["public"]["Enums"]["capacity_basis"] | null
          capacity_kw: number | null
          headroom_kw: number | null
          prospective_kw_raw: number | null
          prospective_peak_kw: number | null
          simultaneity_factor: number | null
          village_id: string | null
        }
        Relationships: []
      }
      v_village_production: {
        Row: {
          actual_kg: number | null
          crop_id: string | null
          cycle_area_ha: number | null
          cycle_count: number | null
          expected_kg: number | null
          plot_count: number | null
          tree_count: number | null
          verified_cycles: number | null
          village_id: string | null
          window_month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_cycle_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop"
            referencedColumns: ["id"]
          },
        ]
      }
      v_village_pue_pipeline: {
        Row: {
          currency: string | null
          indicative_value: number | null
          request_count: number | null
          status: Database["public"]["Enums"]["pue_status"] | null
          village_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pue_request_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_data_quality"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "pue_request_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "v_village_energy"
            referencedColumns: ["village_id"]
          },
          {
            foreignKeyName: "pue_request_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "village"
            referencedColumns: ["id"]
          },
        ]
      }
      v_village_supply: {
        Row: {
          available_kg: number | null
          committed_kg: number | null
          crop_id: string | null
          cycle_count: number | null
          expected_kg: number | null
          verified_cycles: number | null
          village_id: string | null
          window_end: string | null
          window_month: string | null
          window_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_cycle_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crop"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      app_admins_project: { Args: { p: string }; Returns: boolean }
      app_farms: { Args: never; Returns: string[] }
      app_has_role: {
        Args: { r: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      app_household_persons: { Args: never; Returns: string[] }
      app_households: { Args: never; Returns: string[] }
      app_is_staff: { Args: never; Returns: boolean }
      app_manages_project: { Args: { p: string }; Returns: boolean }
      app_person_id: { Args: never; Returns: string }
      app_projects: { Args: never; Returns: string[] }
      app_register_farmer: { Args: { payload: Json }; Returns: Json }
      app_staff_households: { Args: never; Returns: string[] }
      app_staff_opportunities: { Args: never; Returns: string[] }
      app_supersede_harvest: {
        Args: {
          p_confidence?: Database["public"]["Enums"]["confidence_level"]
          p_cycle: string
          p_kind: Database["public"]["Enums"]["harvest_kind"]
          p_quantity_kg: number
          p_reported_for?: string
          p_source: Database["public"]["Enums"]["source_type"]
        }
        Returns: string
      }
      app_supplied_opportunities: { Args: never; Returns: string[] }
      app_verify: {
        Args: { p_id: string; p_table: string }
        Returns: undefined
      }
      app_villages: { Args: never; Returns: string[] }
    }
    Enums: {
      app_role: "farmer" | "field_officer" | "ops" | "admin"
      area_unit: "hectare" | "acre"
      buyer_channel: "direct" | "afm" | "other"
      capacity_basis: "planned" | "nameplate"
      confidence_level: "low" | "medium" | "high"
      crop_cycle_status: "planned" | "growing" | "harvested" | "abandoned"
      crop_measure: "area" | "tree_count" | "unit_count"
      demand_status: "open" | "matched" | "closed" | "cancelled"
      harvest_kind: "expected" | "actual"
      opportunity_status:
        | "proposed"
        | "shared"
        | "accepted"
        | "declined"
        | "lapsed"
      project_status: "setup" | "active" | "paused" | "closed"
      pue_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "withdrawn"
      source_type:
        | "farmer_reported"
        | "field_verified"
        | "transaction_derived"
        | "sensor_derived"
        | "model_estimated"
      verification_status: "unverified" | "pending" | "verified" | "disputed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["farmer", "field_officer", "ops", "admin"],
      area_unit: ["hectare", "acre"],
      buyer_channel: ["direct", "afm", "other"],
      capacity_basis: ["planned", "nameplate"],
      confidence_level: ["low", "medium", "high"],
      crop_cycle_status: ["planned", "growing", "harvested", "abandoned"],
      crop_measure: ["area", "tree_count", "unit_count"],
      demand_status: ["open", "matched", "closed", "cancelled"],
      harvest_kind: ["expected", "actual"],
      opportunity_status: [
        "proposed",
        "shared",
        "accepted",
        "declined",
        "lapsed",
      ],
      project_status: ["setup", "active", "paused", "closed"],
      pue_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "withdrawn",
      ],
      source_type: [
        "farmer_reported",
        "field_verified",
        "transaction_derived",
        "sensor_derived",
        "model_estimated",
      ],
      verification_status: ["unverified", "pending", "verified", "disputed"],
    },
  },
} as const
