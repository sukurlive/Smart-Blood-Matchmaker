import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";

// Tipe data untuk struktur balasan (Join) dari tabel user_badge dan master_badges
type EarnedBadge = {
  id: string;
  master_badges: {
    name: string;
    icon_name: string;
  };
};

export default function ProfileScreen() {
  const { profile, updateProfile, signOut, loading } = useAuth();

  const [isAvailable, setIsAvailable] = useState<boolean>(profile?.is_available ?? true);
  const [updating, setUpdating] = useState(false);

  // State untuk Statistik
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalDonations: 0,
    totalPoints: 0,
  });

  // State untuk Lencana (Badges)
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);

  // Identifikasi Role User
  const isHospital = !!profile?.hospital_id;
  const isAdmin = profile?.role === "admin" || profile?.role === "Admin";

  const fetchData = async () => {
    if (!profile?.id) return;
    
    // Jika user adalah admin atau rumah sakit, kita tidak perlu menarik data statistik/lencana
    if (isAdmin || isHospital) {
      setStatsLoading(false);
      setBadgesLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // 1. Fetch Statistik
      const { data: statsData, error: statsError } = await supabase
        .from("user_statistics")
        .select("total_donations, total_points")
        .eq("user_id", profile.id)
        .single();

      if (statsError && statsError.code !== "PGRST116") {
        console.error("Error stats:", statsError);
      } else if (statsData) {
        setStats({
          totalDonations: statsData.total_donations || 0,
          totalPoints: statsData.total_points || 0,
        });
      }

      // 2. Fetch Lencana (Join user_badge dan master_badges)
      const { data: badgesData, error: badgesError } = await supabase
        .from("user_badge")
        .select(`
          id,
          master_badges (
            name,
            icon_name
          )
        `)
        .eq("user_id", profile.id)
        .order("achieved_at", { ascending: true });

      if (badgesError) {
        console.error("Error badges:", badgesError);
      } else if (badgesData) {
        setBadges(badgesData as any);
      }
    } catch (error: any) {
      console.error("Gagal memuat data profile:", error.message);
    } finally {
      setStatsLoading(false);
      setBadgesLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.id, isAdmin, isHospital]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [profile?.id, isAdmin, isHospital]);

  const handleToggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    setUpdating(true);
    await updateProfile({ is_available: value });
    setUpdating(false);
  };

  const handleLogout = async () => {
    Alert.alert("Konfirmasi Logout", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => await signOut(),
      },
    ]);
  };

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#D32F2F"]} />
        }
      >
        {/* Header Profile */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {isHospital ? "🏥" : isAdmin ? "🛡️" : profile.blood_type || "?"}
              </Text>
            </View>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          
          {isHospital && (
            <Text style={styles.roleBadge}>{profile.hospital_name}</Text>
          )}
          {isAdmin && (
            <Text style={[styles.roleBadge, { backgroundColor: '#FEEBEE', color: '#D32F2F' }]}>
              Administrator
            </Text>
          )}

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push("/(tabs)/edit-profile")}
          >
            <Ionicons name="create-outline" size={18} color="#D32F2F" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* HANYA TAMPIL JIKA PENDONOR (Bukan Hospital & Bukan Admin) */}
        {!isHospital && !isAdmin && (
          <>
            {/* Bagian Statistik */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Statistik Pahlawan</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  {statsLoading ? (
                    <ActivityIndicator size="small" color="#D32F2F" />
                  ) : (
                    <Text style={styles.statNumber}>{stats.totalDonations}</Text>
                  )}
                  <Text style={styles.statLabel}>Total Donasi</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statCard}>
                  {statsLoading ? (
                    <ActivityIndicator size="small" color="#FF9800" />
                  ) : (
                    <Text style={[styles.statNumber, { color: "#FF9800" }]}>{stats.totalPoints}</Text>
                  )}
                  <Text style={styles.statLabel}>Poin Kemanusiaan</Text>
                </View>
              </View>
            </View>

            {/* Bagian Lencana (Badges) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lencana Pahlawan</Text>
              {badgesLoading ? (
                <View style={{ padding: 20 }}>
                  <ActivityIndicator size="small" color="#D32F2F" />
                </View>
              ) : badges.length > 0 ? (
                <View style={styles.badgeContainer}>
                  {badges.map((badge, index) => (
                    <View key={badge.id || index} style={styles.badgeItem}>
                      <View style={styles.badgeIconCircle}>
                        <MaterialCommunityIcons
                          name={(badge.master_badges.icon_name as any) || "medal"}
                          size={32}
                          color="#FFB300"
                        />
                      </View>
                      <Text style={styles.badgeName} numberOfLines={2}>
                        {badge.master_badges.name}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyBadgeContainer}>
                  <MaterialCommunityIcons name="medal-outline" size={40} color="#E0E0E0" />
                  <Text style={styles.emptyBadgeText}>
                    Belum ada lencana. Kumpulkan poin dari donasi untuk mendapatkan lencana pertamamu!
                  </Text>
                </View>
              )}
            </View>

            {/* Informasi Pribadi */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informasi Pribadi</Text>
              {profile.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Telepon</Text>
                  <Text style={styles.infoValue}>{profile.phone}</Text>
                </View>
              )}
              {profile.address && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Alamat</Text>
                  <Text style={styles.infoValue}>{profile.address}</Text>
                </View>
              )}
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Golongan Darah</Text>
                <Text style={styles.infoValue}>{profile.blood_type}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={styles.statusRow}>
                  <Switch
                    value={isAvailable}
                    onValueChange={handleToggleAvailability}
                    disabled={updating}
                    trackColor={{ false: "#767577", true: "#4CAF50" }}
                    thumbColor={isAvailable ? "#FFF" : "#F4F3F4"}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: isAvailable ? "#4CAF50" : "#999" },
                    ]}
                  >
                    {isAvailable ? "Siap Donor" : "Sedang Tidak Tersedia"}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.version}>Smart Blood Matchmaker v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  avatarContainer: { marginBottom: 10 },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#D32F2F",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "bold", color: "#FFF" },
  name: { fontSize: 20, fontWeight: "bold", color: "#333" },
  email: { fontSize: 13, color: "#666", marginTop: 3 },
  roleBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    marginTop: 6,
    fontSize: 11,
    color: "#1976D2",
    fontWeight: "bold",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  editButtonText: { color: "#D32F2F", fontSize: 13, fontWeight: "500" },
  section: {
    backgroundColor: "#FFF",
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 14,
  },
  statsRow: { flexDirection: "row", justifyContent: "space-evenly", alignItems: "center", paddingVertical: 5 },
  statCard: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 28, fontWeight: "bold", color: "#D32F2F" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 4, fontWeight: "500" },
  divider: { width: 1, height: 40, backgroundColor: "#E0E0E0" },
  
  badgeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  badgeItem: {
    alignItems: "center",
    width: 80,
  },
  badgeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#FFECB3",
  },
  badgeName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#444",
    textAlign: "center",
  },
  emptyBadgeContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  emptyBadgeText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 20,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  infoLabel: { fontSize: 14, color: "#666" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#333" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { fontSize: 13, fontWeight: "500" },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#D32F2F",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: { color: "#FFF", fontSize: 14, fontWeight: "bold" },
  version: {
    textAlign: "center",
    color: "#999",
    fontSize: 11,
    marginBottom: 20,
  },
});