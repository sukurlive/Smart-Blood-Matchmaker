import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";

export default function ProfileScreen() {
  const { profile, updateProfile, signOut, loading } = useAuth();
  const [isAvailable, setIsAvailable] = React.useState<boolean>(
    profile?.is_available ?? true,
  );
  const [updating, setUpdating] = React.useState(false);

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

  const isHospital = !!profile.hospital_id;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {isHospital ? "🏥" : profile.blood_type || "?"}
              </Text>
            </View>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          {isHospital && (
            <Text style={styles.hospitalBadge}>{profile.hospital_name}</Text>
          )}

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push("/(tabs)/edit-profile")}
          >
            <Ionicons name="create-outline" size={18} color="#D32F2F" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {!isHospital && (
          <>
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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Statistik</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Total Donasi</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>Poin Kemanusiaan</Text>
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
  hospitalBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    marginTop: 6,
    fontSize: 11,
    color: "#1976D2",
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
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoLabel: { fontSize: 14, color: "#666" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#333" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { fontSize: 13, fontWeight: "500" },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statCard: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 24, fontWeight: "bold", color: "#D32F2F" },
  statLabel: { fontSize: 11, color: "#666", marginTop: 4 },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#D32F2F",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingVertical: 12,
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
    marginBottom: 16,
  },
});
