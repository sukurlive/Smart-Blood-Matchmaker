// app/(tabs)/edit-profile.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";

export default function EditProfileScreen() {
  const { profile, user, refreshProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // STATE BARU: Untuk menyimpan status apakah user sudah pernah donor
  const [hasDonated, setHasDonated] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    birth_date: "",
    blood_type: "",
    is_available: true,
  });

  const isHospital = !!profile?.hospital_id;

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        birth_date: profile.birth_date || "",
        blood_type: profile.blood_type || "",
        is_available: profile.is_available ?? true,
      });
    }
  }, [profile]);

  // LOGIC BARU: Cek riwayat donor langsung di komponen ini
  useEffect(() => {
    const checkDonationHistory = async () => {
      if (!user?.id || isHospital) return;

      try {
        const { data, error } = await supabase
          .from("donor_responses")
          .select("id")
          .eq("donor_id", user.id)
          .in("response_status", ["accepted", "completed"]) // Syarat donor sah
          .limit(1);

        if (error) throw error;

        // Jika ada data, berarti sudah pernah donor
        if (data && data.length > 0) {
          setHasDonated(true);
        }
      } catch (error) {
        console.error("Gagal mengecek riwayat donor:", error);
      }
    };

    checkDonationHistory();
  }, [user?.id, isHospital]);

  const updateLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Error", "Izin lokasi diperlukan");
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { error } = await supabase
        .from("user_profiles")
        .update({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          last_location_update: new Date().toISOString(),
        })
        .eq("id", user?.id);
      if (error) throw error;
      Alert.alert("Sukses", "Lokasi berhasil diperbarui");
      await refreshProfile();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const tableName = isHospital ? "hospital_staff" : "user_profiles";

      const updateData: any = isHospital
        ? { name: form.name, phone: form.phone }
        : {
            name: form.name,
            phone: form.phone,
            address: form.address,
            birth_date: form.birth_date || null,
            is_available: form.is_available,
          };

      // KEAMANAN DATA: Hanya masukkan data golongan darah JIKA user BELUM pernah donor
      if (!isHospital && !hasDonated) {
        updateData.blood_type = form.blood_type;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq("id", user?.id);

      if (error) throw error;
      await refreshProfile();
      Alert.alert("Sukses", "Profile berhasil diperbarui");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Text style={styles.headerSub}>Perbarui informasi Anda</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Card Lokasi - hanya untuk donor */}
        {!isHospital && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Lokasi Anda Saat Ini</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={updateLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator color="#D32F2F" />
              ) : (
                <>
                  <Ionicons name="location" size={20} color="#D32F2F" />
                  <Text style={styles.locationButtonText}>Perbarui Lokasi</Text>
                </>
              )}
            </TouchableOpacity>
            {profile?.latitude !== 0 && (
              <Text style={styles.locationInfo}>
                Lat: {profile?.latitude?.toFixed(4)}, Lng:{" "}
                {profile?.longitude?.toFixed(4)}
              </Text>
            )}
          </View>
        )}

        {/* Informasi Pribadi */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Informasi Pribadi</Text>
          <TextInput
            style={styles.input}
            placeholder="Nama Lengkap"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Nomor Telepon"
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: text })}
            keyboardType="phone-pad"
          />

          {/* Field khusus donor */}
          {!isHospital && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Alamat"
                value={form.address}
                onChangeText={(text) => setForm({ ...form, address: text })}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Tanggal Lahir (YYYY-MM-DD)"
                value={form.birth_date}
                onChangeText={(text) => setForm({ ...form, birth_date: text })}
              />

              <Text style={styles.label}>Golongan Darah</Text>
              <View style={styles.bloodTypeGrid}>
                {bloodTypes.map((type) => {
                  const isActive = form.blood_type === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      disabled={hasDonated} // Gunakan state hasDonated di sini
                      style={[
                        styles.bloodTypeButton,
                        isActive && styles.bloodTypeButtonActive,
                        hasDonated && !isActive && styles.bloodTypeButtonDisabled, 
                        hasDonated && isActive && styles.bloodTypeButtonDisabledActive 
                      ]}
                      onPress={() => setForm({ ...form, blood_type: type })}
                    >
                      <Text
                        style={[
                          styles.bloodTypeText,
                          isActive && styles.bloodTypeTextActive,
                          hasDonated && !isActive && styles.bloodTypeTextDisabled 
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Tampilkan Peringatan Jika Terkunci */}
              {hasDonated && (
                <Text style={styles.warningText}>
                  * Golongan darah tidak dapat diubah karena Anda sudah memiliki riwayat donor (Diterima / Selesai).
                </Text>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Siap Donor</Text>
                <Switch
                  value={form.is_available}
                  onValueChange={(value) =>
                    setForm({ ...form, is_available: value })
                  }
                  trackColor={{ false: "#767577", true: "#4CAF50" }}
                  thumbColor={form.is_available ? "#FFF" : "#F4F3F4"}
                />
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Simpan Perubahan</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  headerSub: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },

  content: { padding: 20 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF5F5",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  locationButtonText: { color: "#D32F2F", fontWeight: "600" },
  locationInfo: {
    fontSize: 11,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  
  bloodTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 6,
  },
  bloodTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  bloodTypeButtonActive: { backgroundColor: "#D32F2F", borderColor: "#D32F2F" },
  bloodTypeText: { fontSize: 14, color: "#666" },
  bloodTypeTextActive: { color: "#FFF" },
  
  // STYLE KHUSUS SAAT DISABLE
  bloodTypeButtonDisabled: {
    backgroundColor: "#EEEEEE",
    borderColor: "#E0E0E0",
  },
  bloodTypeButtonDisabledActive: {
    backgroundColor: "#E57373", // Warna merah pucat untuk pilihan yg terkunci
    borderColor: "#E57373",
  },
  bloodTypeTextDisabled: {
    color: "#BBB",
  },
  warningText: {
    color: "#D32F2F",
    fontSize: 12,
    marginBottom: 16,
    fontStyle: "italic",
    lineHeight: 16,
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    marginTop: 10,
  },
  switchLabel: { fontSize: 15, color: "#333" },
  saveButton: {
    backgroundColor: "#D32F2F",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});