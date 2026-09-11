import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type UserRole = "student" | "teacher" | "admin";

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