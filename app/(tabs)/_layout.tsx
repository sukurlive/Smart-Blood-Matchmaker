import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";

export default function TabLayout() {
  // 1. Tambahkan state loading dari useAuth
  const { session, profile, signOut, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/");
    }
  }, [session, loading]);

  // 2. TUNGGU sampai session dan profile benar-benar siap sebelum merender rute tab
  if (loading || (session && !profile)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA" }}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Logout",
      "Apakah Anda yakin ingin keluar dari aplikasi?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Keluar",
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/");
          },
        },
      ],
    );
  };

  const isHospital = !!profile?.hospital_id;
  const isAdmin = profile?.role === "admin";

  const HeaderLeft = () => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 15,
        gap: 8,
      }}
    >
      <MaterialCommunityIcons name="blood-bag" size={28} color="#D32F2F" />
      <View>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#D32F2F" }}>
          BloodHero
        </Text>
        <Text style={{ fontSize: 10, color: "#999", marginTop: -2 }}>
          Smart Blood Matchmaker
        </Text>
      </View>
    </View>
  );

  const HeaderRight = () => (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
      <Ionicons name="log-out-outline" size={24} color="#D32F2F" />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerLeft: () => <HeaderLeft />,
        headerRight: () => <HeaderRight />,
        headerTitle: "",
        headerStyle: {
          backgroundColor: "#FFF",
          elevation: 0,
          shadowOpacity: 0,
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: "#D32F2F",
        tabBarInactiveTintColor: "#999",
      }}
    >
      {/* ADMIN TABS - hanya muncul jika admin */}
      <Tabs.Screen
        name="admin-dashboard"
        options={{
          title: "Admin",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield" size={size} color={color} />
          ),
          href: isAdmin ? undefined : null,
        }}
      />

      {/* HOSPITAL TABS - hanya muncul jika hospital */}
      <Tabs.Screen
        name="hospital-dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
          href: isHospital && !isAdmin ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="admin-requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle" size={size} color={color} />
          ),
          href: isAdmin ? undefined : null,
        }}
      />

      {/* DONOR TABS - hanya muncul jika donor (bukan admin & bukan hospital) */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          href: !isHospital && !isAdmin ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="donors"
        options={{
          title: "Donor",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          href: isAdmin&&!isAdmin ? undefined : null, // Fix: Disederhanakan, asumsikan hanya admin yang bisa lihat daftar semua donor
        }}
      />
      <Tabs.Screen
        name="forum-donor"
        options={{
          title: "Forum",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
          href: !isHospital && !isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Riwayat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
          href: !isHospital && !isAdmin ? undefined : null,
        }}
      />

      {/* Profile Tab - untuk semua user */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
    </Tabs>
  );
}