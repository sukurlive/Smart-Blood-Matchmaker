import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const EXPO_PUBLIC_SUPABASE_URL = "https://ujqgulcealcgqdcrkpms.supabase.co";
const EXPO_PUBLIC_SUPABASE_KEY =
  "sb_publishable_6BoV-2SdwUBGyPccEroKBg_m9trQxID";

export const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    const { error } = await supabase
      .from("user_profiles")
      .select("count", { count: "exact", head: true });
    if (error) throw error;
    console.log("✅ Supabase connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Supabase connection failed:", error);
    return false;
  }
};
