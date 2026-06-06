import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { supabase } from "../supabase";

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  blood_type: string;
  latitude: number;
  longitude: number;
  is_available: boolean;
  device_token?: string;
  created_at?: string;
  phone?: string;
  address?: string;
  birth_date?: string;
  hospital_id?: string;
  hospital_name?: string;
  role?: string;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = async () => {
    console.log("🧹 Clearing session...");
    await AsyncStorage.removeItem("supabase.auth.token");
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const fetchProfile = async (userId: string) => {
    try {
      // Cek apakah user adalah hospital staff
      const { data: staffData, error: staffError } = await supabase
        .from("hospital_staff")
        .select("*, hospitals(id, name)")
        .eq("id", userId)
        .single();

      if (staffData && !staffError) {
        setProfile({
          id: staffData.id,
          email: staffData.email,
          name: staffData.name,
          blood_type: "",
          latitude: 0,
          longitude: 0,
          is_available: true,
          phone: staffData.phone,
          hospital_id: staffData.hospital_id,
          hospital_name: staffData.hospitals?.name,
          role: staffData.role,
        });
        return;
      }

      const { data: donorData, error: donorError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (donorData && !donorError) {
        setProfile(donorData as UserProfile);
      } else if (donorError && donorError.code !== "PGRST116") {
        console.log("Error fetching profile:", donorError);
      }
    } catch (error) {
      console.log("Fetch profile error:", error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.log("Session error:", error);
          if (error.message?.includes("Refresh Token")) {
            await clearSession();
            if (isMounted) setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
          setLoading(false);
        }
      } catch (err) {
        console.log("Auth init error:", err);
        if (isMounted) {
          await clearSession();
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event);

      if (event === "TOKEN_REFRESHED") {
        console.log("Token refreshed successfully");
      }

      if (event === "SIGNED_OUT") {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      Alert.alert("Error", "User tidak ditemukan");
      return;
    }

    try {
      let tableName = "user_profiles";
      if (profile?.hospital_id) {
        tableName = "hospital_staff";
      }

      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      Alert.alert("Sukses", "Profile berhasil diupdate");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem("supabase.auth.token");
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.log("Sign out error:", error);
      await clearSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signOut,
        updateProfile,
        refreshProfile,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
