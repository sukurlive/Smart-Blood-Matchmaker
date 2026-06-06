import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabase";

interface Hospital {
  id: string;
  name: string;
  address: string;
}

export default function RegisterScreen() {
  const [userType, setUserType] = useState<"donor" | "hospital">("donor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null,
  );
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [showHospitalPicker, setShowHospitalPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    const { data, error } = await supabase
      .from("hospitals")
      .select("id, name, address")
      .eq("is_verified", true);

    if (!error && data) {
      setHospitals(data);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert("Error", "Email, password, dan nama harus diisi");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Password dan konfirmasi password tidak sama");
      return;
    }

    if (userType === "donor" && !bloodType) {
      Alert.alert("Error", "Golongan darah harus dipilih");
      return;
    }

    if (userType === "hospital" && !selectedHospital) {
      Alert.alert("Error", "Rumah sakit harus dipilih");
      return;
    }

    setLoading(true);

    const metadata: any = {
      name: name,
      user_type: userType,
      phone: phone,
    };

    if (userType === "donor") {
      metadata.blood_type = bloodType;
    } else {
      metadata.hospital_id = selectedHospital?.id;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      Alert.alert("Register Gagal", error.message);
    } else {
      await supabase.auth.signOut();
      Alert.alert(
        "Sukses",
        userType === "donor"
          ? "Pendaftaran berhasil! Silakan login."
          : "Pendaftaran RS berhasil! Silakan login.",
        [{ text: "OK", onPress: () => router.replace("/") }],
      );
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>Daftar Akun Baru</Text>

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              userType === "donor" && styles.roleButtonActive,
            ]}
            onPress={() => setUserType("donor")}
          >
            <Ionicons
              name="person"
              size={24}
              color={userType === "donor" ? "#FFF" : "#666"}
            />
            <Text
              style={[
                styles.roleText,
                userType === "donor" && styles.roleTextActive,
              ]}
            >
              Masyarakat / Donor
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              userType === "hospital" && styles.roleButtonActive,
            ]}
            onPress={() => setUserType("hospital")}
          >
            <Ionicons
              name="business"
              size={24}
              color={userType === "hospital" ? "#FFF" : "#666"}
            />
            <Text
              style={[
                styles.roleText,
                userType === "hospital" && styles.roleTextActive,
              ]}
            >
              Rumah Sakit
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Nama Lengkap"
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Nomor Telepon"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          editable={!loading}
        />

        {userType === "donor" && (
          <View style={styles.bloodTypeContainer}>
            <Text style={styles.label}>Golongan Darah</Text>
            <View style={styles.bloodTypeGrid}>
              {bloodTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.bloodTypeButton,
                    bloodType === type && styles.bloodTypeButtonActive,
                  ]}
                  onPress={() => setBloodType(type)}
                >
                  <Text
                    style={[
                      styles.bloodTypeText,
                      bloodType === type && styles.bloodTypeTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {userType === "hospital" && (
          <TouchableOpacity
            style={styles.hospitalPicker}
            onPress={() => setShowHospitalPicker(true)}
          >
            <Text
              style={
                selectedHospital
                  ? styles.hospitalSelected
                  : styles.hospitalPlaceholder
              }
            >
              {selectedHospital ? selectedHospital.name : "Pilih Rumah Sakit"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.input}
          placeholder="Password (min 6 karakter)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Konfirmasi Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Daftar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.loginText}>Sudah punya akun? Login</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showHospitalPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Rumah Sakit</Text>
            <FlatList
              data={hospitals}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.hospitalItem}
                  onPress={() => {
                    setSelectedHospital(item);
                    setShowHospitalPicker(false);
                  }}
                >
                  <Text style={styles.hospitalName}>{item.name}</Text>
                  <Text style={styles.hospitalAddress}>{item.address}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowHospitalPicker(false)}
            >
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  innerContainer: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#D32F2F",
  },
  roleContainer: { flexDirection: "row", gap: 10, marginBottom: 20 },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  roleButtonActive: { backgroundColor: "#D32F2F", borderColor: "#D32F2F" },
  roleText: { fontSize: 14, color: "#666" },
  roleTextActive: { color: "#FFF" },
  input: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#DDD",
    fontSize: 16,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 10 },
  bloodTypeContainer: { marginBottom: 15 },
  bloodTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bloodTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  bloodTypeButtonActive: { backgroundColor: "#D32F2F", borderColor: "#D32F2F" },
  bloodTypeText: { fontSize: 14, color: "#666" },
  bloodTypeTextActive: { color: "#FFF" },
  hospitalPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  hospitalPlaceholder: { color: "#999", fontSize: 16 },
  hospitalSelected: { color: "#333", fontSize: 16 },
  button: {
    backgroundColor: "#D32F2F",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  loginText: {
    textAlign: "center",
    marginTop: 20,
    color: "#D32F2F",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  hospitalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  hospitalName: { fontSize: 16, fontWeight: "600", color: "#333" },
  hospitalAddress: { fontSize: 12, color: "#666", marginTop: 4 },
  modalCloseButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    alignItems: "center",
  },
  modalCloseText: { color: "#666", fontWeight: "600" },
});
