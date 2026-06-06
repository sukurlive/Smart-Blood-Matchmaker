import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";

export default function TabLayout() {
  const { session, profile, signOut } = useAuth();

  useEffect(() => {
    if (!session) {
      router.replace("/");
    }
  }, [session]);

  if (!session) {
    return null;
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

  // Header kanan: Tombol Logout
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
      {/* Donor Tabs - hanya muncul jika BUKAN hospital */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          href: isHospital ? null : undefined,
        }}
      />

      <Tabs.Screen
        name="donors"
        options={{
          title: "Donor",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          href: isHospital ? null : undefined,
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "Riwayat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
          href: isHospital ? null : undefined,
        }}
      />

      {/* Hospital Tab - hanya muncul jika hospital */}
      <Tabs.Screen
        name="hospital-dashboard"
        options={{
          title: "Dashboard RS",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
          href: isHospital ? undefined : null,
        }}
      />

      {/* Profile Tab - muncul untuk semua */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
          title: "Edit Profil",
        }}
      />
    </Tabs>
  );
}
