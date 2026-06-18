import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);


const { session, profile, loading: authLoading } = useAuth(); 

 useEffect(() => {
    // 1. Jika belum login (tidak ada session), diam saja
    if (!session) return;

    // 2. Jika sudah login TAPI data profile masih kosong/loading, TUNGGU!
    if (authLoading || !profile) return;

    // 3. Cek data di console komputer/terminal untuk memastikan isinya
    console.log("Data Profile Saat Login:", profile);
    console.log("Role User Ini:", profile.role);

    // 4. Baru lakukan pengecekan rute (Pastikan huruf kecil/besar sama persis)
    if (profile.role === "admin" || profile.role === "Admin") {
      router.replace("/(tabs)/admin-dashboard");
    } else {
      router.replace("/(tabs)/home");
    }
  }, [session, profile, authLoading]);
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email dan password harus diisi");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      Alert.alert("Login Gagal", error.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        {/* Logo / Icon Section */}
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="blood-bag" size={60} color="#D32F2F" />
        </View>

        {/* Title Section */}
        <Text style={styles.title}>Smart Blood Matchmaker</Text>
        <Text style={styles.subtitle}>
          Sistem Informasi Donor Darah Darurat
        </Text>

        {/* Form Section */}
        <View style={styles.formContainer}>
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
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/register")}
            disabled={loading}
          >
            <Text style={styles.registerText}>Belum punya akun? Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  innerContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },

  // Logo Container
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#D32F2F",
    marginTop: 8,
  },

  // Title Section
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 40,
    color: "#666",
  },

  // Form Section
  formContainer: {
    marginTop: 20,
  },
  input: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#DDD",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#D32F2F",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  registerText: {
    textAlign: "center",
    marginTop: 20,
    color: "#D32F2F",
    fontSize: 14,
  },
});
