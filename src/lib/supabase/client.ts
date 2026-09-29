import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "admin" | "technician";

export function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "technician";
}

type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };
      machines: {
        Row: {
          id: string;
          machine_code: string;
          machine_name: string;
          machine_type: string;
          location: string;
          status: "running" | "stop" | "alarm" | "maintenance";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          machine_code: string;
          machine_name: string;
          machine_type: string;
          location: string;
          status?: "running" | "stop" | "alarm" | "maintenance";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          machine_code?: string;
          machine_name?: string;
          machine_type?: string;
          location?: string;
          status?: "running" | "stop" | "alarm" | "maintenance";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      alarm_records: {
        Row: {
          id: string;
          machine_id: string;
          alarm_code: string;
          alarm_description: string;
          occurred_at: string;
          cause: string | null;
          status: "open" | "in_progress" | "closed";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          machine_id: string;
          alarm_code: string;
          alarm_description: string;
          occurred_at?: string;
          cause?: string | null;
          status?: "open" | "in_progress" | "closed";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          machine_id?: string;
          alarm_code?: string;
          alarm_description?: string;
          occurred_at?: string;
          cause?: string | null;
          status?: "open" | "in_progress" | "closed";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alarm_records_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alarm_records_machine_id_fkey";
            columns: ["machine_id"];
            isOneToOne: false;
            referencedRelation: "machines";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let supabaseClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Missing Supabase environment variables");
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(supabaseUrl, supabasePublishableKey);
  }

  return supabaseClient;
}