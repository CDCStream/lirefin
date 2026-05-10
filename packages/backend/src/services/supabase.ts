import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

/**
 * Service-role client. **Never** expose this client (or its key) to the
 * extension or any client-side code — it bypasses Row-Level-Security and
 * can read / mutate every user's data.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "x-fni-source": "backend",
      },
    },
  },
);
