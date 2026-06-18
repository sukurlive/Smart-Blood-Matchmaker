import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";

interface User {
  id: string;
  name: string;
  email: string;
  blood_type: string;
  phone: string;
  role: string;
  is_available: boolean;
  created_at: string;
}

interface Hospital {
  id: string;
  name: string;
  address: string;
  contact_phone: string;
  is_verified: boolean;
  created_at: string;
}

interface Stats {
  total_donors: number;
  total_hospitals: number;
  total_requests: number;
  total_donations: number;
  total_blood_requests: {
    A_plus: number; A_minus: number; B_plus: number; B_minus: number;
    AB_plus: number; AB_minus: number; O_plus: number; O_minus: number;
  };
  chart_data: { label: string; count: number; }[];
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeInternalTab, setActiveInternalTab] = useState<"stats" | "users" | "hospitals">("stats");
  const [chartFilter, setChartFilter] = useState<"monthly" | "quarterly">("monthly");

  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_donors: 0, total_hospitals: 0, total_requests: 0, total_donations: 0,
    total_blood_requests: { A_plus: 0, A_minus: 0, B_plus: 0, B_minus: 0, AB_plus: 0, AB_minus: 0, O_plus: 0, O_minus: 0 },
    chart_data: [],
  });

  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [userForm, setUserForm] = useState({
    name: "", email: "", phone: "", blood_type: "O+", role: "donor", password: "",
  });
  const DEFAULT_MAP_REGION: Region = {
    latitude: -6.2000,
    longitude: 106.8167,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  const [hospitalForm, setHospitalForm] = useState<{
    name: string;
    address: string;
    contact_phone: string;
    location: { latitude: number; longitude: number } | null;
  }>({
    name: "", address: "", contact_phone: "", location: null,
  });
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_MAP_REGION);

  useEffect(() => {
    fetchData();
  }, [activeInternalTab, chartFilter]);

  if (profile?.role !== "admin") {
    return (
      <View style={styles.unauthorizedContainer}>
        <MaterialCommunityIcons name="shield-alert" size={80} color="#D32F2F" />
        <Text style={styles.unauthorizedTitle}>Akses Ditolak</Text>
        <Text style={styles.unauthorizedText}>Anda tidak memiliki akses ke halaman admin.</Text>
      </View>
    );
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeInternalTab === "stats") {
        await fetchStats();
      } else if (activeInternalTab === "users") {
        const { data, error } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        setUsers(data || []);
      } else if (activeInternalTab === "hospitals") {
        const { data, error } = await supabase.from("hospitals").select("*").order("name");
        if (error) throw error;
        setHospitals(data || []);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: donorsCount } = await supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("role", "donor");
      const { count: hospitalsCount } = await supabase.from("hospitals").select("*", { count: "exact", head: true });
      const { count: requestsCount } = await supabase.from("blood_requests").select("*", { count: "exact", head: true }).eq("status", "Active");
      const { count: donationsCount } = await supabase.from("donor_responses").select("*", { count: "exact", head: true }).ilike("response_status", "accepted");

      const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
      const bloodCounts: any = {};
      for (const type of bloodTypes) {
        const { count } = await supabase.from("blood_requests").select("*", { count: "exact", head: true }).eq("required_blood", type).eq("status", "Active");
        bloodCounts[type.replace("+", "_plus").replace("-", "_minus")] = count || 0;
      }

      const fetchedChartData = [];
      const now = new Date();

      if (chartFilter === "monthly") {
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
          const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString();

          const { count } = await supabase.from("donor_responses").select("*", { count: "exact", head: true }).ilike("response_status", "accepted").gte("responded_at", startDate).lt("responded_at", endDate);
          fetchedChartData.push({ label: date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }), count: count || 0 });
        }
      } else {
        const currentYear = now.getFullYear();
        for (let q = 1; q <= 4; q++) {
          const startMonth = (q - 1) * 3;
          const startDate = new Date(currentYear, startMonth, 1).toISOString();
          const endDate = new Date(currentYear, startMonth + 3, 1).toISOString();

          const { count } = await supabase.from("donor_responses").select("*", { count: "exact", head: true }).ilike("response_status", "accepted").gte("responded_at", startDate).lt("responded_at", endDate);
          fetchedChartData.push({ label: `Q${q} '${currentYear.toString().slice(-2)}`, count: count || 0 });
        }
      }

      setStats({
        total_donors: donorsCount || 0, total_hospitals: hospitalsCount || 0,
        total_requests: requestsCount || 0, total_donations: donationsCount || 0,
        total_blood_requests: bloodCounts, chart_data: fetchedChartData,
      });
    } catch (error) { console.error(error); }
  };

  const addUser = async () => {
    if (!userForm.name || !userForm.email) return Alert.alert("Error", "Nama dan email harus diisi");
    try {
      const tempPassword = userForm.password || "password123";
      const { error: authError } = await supabase.auth.signUp({
        email: userForm.email, password: tempPassword,
        options: { data: { name: userForm.name, blood_type: userForm.blood_type, phone: userForm.phone, role: userForm.role } },
      });
      if (authError) throw authError;

      Alert.alert("Sukses", `User berhasil ditambahkan!\nEmail: ${userForm.email}\nPassword: ${tempPassword}`);
      setShowUserModal(false);
      setUserForm({ name: "", email: "", phone: "", blood_type: "O+", role: "donor", password: "" });
      fetchData();
    } catch (error: any) { Alert.alert("Error", error.message); }
  };

  const updateUser = async () => {
    if (!editingUser) return;
    try {
      const { error } = await supabase.from("user_profiles").update({
        name: userForm.name, phone: userForm.phone, blood_type: userForm.blood_type, role: userForm.role,
      }).eq("id", editingUser.id);
      if (error) throw error;
      Alert.alert("Sukses", "User berhasil diupdate");
      setShowUserModal(false);
      setEditingUser(null);
      fetchData();
    } catch (error: any) { Alert.alert("Error", error.message); }
  };

  const deleteUser = async (id: string, name: string) => {
    Alert.alert("Konfirmasi", `Hapus user "${name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive", onPress: async () => {
          const { error } = await supabase.from("user_profiles").delete().eq("id", id);
          if (error) Alert.alert("Error", error.message); else fetchData();
        }
      },
    ]);
  };

  const addHospital = async () => {
    if (!hospitalForm.name || !hospitalForm.address) return Alert.alert("Error", "Nama dan alamat harus diisi");
    if (!hospitalForm.location) return Alert.alert("Error", "Silakan pilih lokasi rumah sakit di peta.");
    try {
      const locationWkt = `SRID=4326;POINT(${hospitalForm.location.longitude} ${hospitalForm.location.latitude})`;
      const insertPayload: any = {
        name: hospitalForm.name,
        address: hospitalForm.address,
        contact_phone: hospitalForm.contact_phone,
        is_verified: true,
        latitude: hospitalForm.location.latitude,
        longitude: hospitalForm.location.longitude,
        location: locationWkt,
      };

      const { error } = await supabase.from("hospitals").insert(insertPayload);
      if (error) throw error;
      Alert.alert("Sukses", "Rumah sakit berhasil ditambahkan");
      setShowHospitalModal(false);
      setHospitalForm({ name: "", address: "", contact_phone: "", location: null });
      setMapRegion(DEFAULT_MAP_REGION);
      fetchData();
    } catch (error: any) { Alert.alert("Error", error.message); }
  };

  const deleteHospital = async (id: string, name: string) => {
    Alert.alert("Konfirmasi", `Hapus RS "${name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive", onPress: async () => {
          const { error } = await supabase.from("hospitals").delete().eq("id", id);
          if (error) Alert.alert("Error", error.message); else fetchData();
        }
      },
    ]);
  };

  const filteredUsers = users.filter((user) => user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredHospitals = hospitals.filter((hospital) => hospital.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });

  // Helper untuk inisial nama Avatar
  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : "?";

  // --- RENDER STATISTIK ---
  const renderStatsTab = () => {
    const bloodData = [
      { label: "A+", value: stats.total_blood_requests.A_plus, color: "#D32F2F" },
      { label: "A-", value: stats.total_blood_requests.A_minus, color: "#E57373" },
      { label: "B+", value: stats.total_blood_requests.B_plus, color: "#FF9800" },
      { label: "B-", value: stats.total_blood_requests.B_minus, color: "#FFB74D" },
      { label: "AB+", value: stats.total_blood_requests.AB_plus, color: "#4CAF50" },
      { label: "AB-", value: stats.total_blood_requests.AB_minus, color: "#81C784" },
      { label: "O+", value: stats.total_blood_requests.O_plus, color: "#2196F3" },
      { label: "O-", value: stats.total_blood_requests.O_minus, color: "#64B5F6" },
    ];
    const maxBloodValue = Math.max(...bloodData.map((b) => b.value), 1);

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#E8F5E9" }]}><Ionicons name="people" size={24} color="#4CAF50" /></View>
            <Text style={styles.statNumber}>{stats.total_donors}</Text>
            <Text style={styles.statLabel}>Total Donor</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#E3F2FD" }]}><Ionicons name="business" size={24} color="#2196F3" /></View>
            <Text style={styles.statNumber}>{stats.total_hospitals}</Text>
            <Text style={styles.statLabel}>Total RS</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#FFF3E0" }]}><Ionicons name="alert-circle" size={24} color="#FF9800" /></View>
            <Text style={styles.statNumber}>{stats.total_requests}</Text>
            <Text style={styles.statLabel}>Request Aktif</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#FFEBEE" }]}><Ionicons name="checkmark-circle" size={24} color="#D32F2F" /></View>
            <Text style={styles.statNumber}>{stats.total_donations}</Text>
            <Text style={styles.statLabel}>Donasi Selesai</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🩸 Permintaan Darah per Golongan</Text>
          {bloodData.map((item) => (
            <View key={item.label} style={styles.barContainer}>
              <Text style={styles.barLabel}>{item.label}</Text>
              <View style={styles.barWrapper}>
                <View style={[styles.barFill, { width: `${(item.value / maxBloodValue) * 100}%`, backgroundColor: item.color }]} />
              </View>
              <Text style={styles.barValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>📊 Grafik Donasi</Text>
            <View style={styles.filterToggle}>
              <TouchableOpacity style={[styles.filterBtn, chartFilter === "monthly" && styles.filterBtnActive]} onPress={() => setChartFilter("monthly")}>
                <Text style={[styles.filterBtnText, chartFilter === "monthly" && styles.filterBtnTextActive]}>Bln</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, chartFilter === "quarterly" && styles.filterBtnActive]} onPress={() => setChartFilter("quarterly")}>
                <Text style={[styles.filterBtnText, chartFilter === "quarterly" && styles.filterBtnTextActive]}>Qtr</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {stats.chart_data.map((item, index) => {
              const maxChartValue = Math.max(...stats.chart_data.map((m) => m.count), 1);
              const height = (item.count / maxChartValue) * 120;
              return (
                <View key={index} style={styles.chartBarWrapper}>
                  <View style={[styles.chartBar, { height: Math.max(height, 4) }]} />
                  <Text style={styles.chartLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.chartValue}>{item.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  };

  // --- RENDER USERS ---
  const renderUsersTab = () => (
    <View style={styles.listTabContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput style={styles.searchInput} placeholder="Cari nama atau email..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#999" />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={styles.userCardContent}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.userBadges}>
                  <View style={styles.bloodBadgeMini}><Text style={styles.bloodBadgeMiniText}>{item.blood_type}</Text></View>
                  <View style={[styles.roleBadge, item.role === "admin" && styles.adminBadge]}>
                    <Text style={[styles.roleText, item.role === "admin" && styles.adminRoleText]}>
                      {item.role === "admin" ? "Admin" : "Donor"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* HANYA MUNCUL JIKA ROLE ADALAH DONOR */}
            {item.role === "donor" && (
              <View style={styles.actionDivider}>
                <TouchableOpacity style={styles.actionButton} onPress={() => { setEditingUser(item); setUserForm({ name: item.name || "", email: item.email || "", phone: item.phone || "", blood_type: item.blood_type || "O+", role: item.role || "donor", password: "" }); setShowUserModal(true); }}>
                  <Ionicons name="create-outline" size={18} color="#2196F3" />
                  <Text style={styles.actionTextEdit}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => deleteUser(item.id, item.name)}>
                  <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                  <Text style={styles.actionTextDelete}>Hapus</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="people-outline" size={48} color="#DDD" /><Text style={styles.emptyText}>Tidak ada user ditemukan</Text></View>}
      />

      {/* FAB Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => { setEditingUser(null); setUserForm({ name: "", email: "", phone: "", blood_type: "O+", role: "donor", password: "" }); setShowUserModal(true); }}>
        <Ionicons name="person-add" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  // --- RENDER HOSPITALS ---
  const renderHospitalsTab = () => (
    <View style={styles.listTabContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput style={styles.searchInput} placeholder="Cari nama rumah sakit..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor="#999" />
      </View>

      <FlatList
        data={filteredHospitals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listPadding}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.hospitalCard}>
            <View style={styles.hospitalCardHeader}>
              <View style={styles.hospitalIconBg}>
                <MaterialCommunityIcons name="hospital-building" size={24} color="#D32F2F" />
              </View>
              <View style={styles.hospitalInfo}>
                <Text style={styles.hospitalName}>{item.name}</Text>
                <Text style={styles.hospitalDate}>Ditambahkan: {formatDate(item.created_at)}</Text>
              </View>
            </View>

            <View style={styles.hospitalDetails}>
              <View style={styles.hospitalDetailRow}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.hospitalAddress} numberOfLines={2}>{item.address}</Text>
              </View>
              <View style={styles.hospitalDetailRow}>
                <Ionicons name="call-outline" size={14} color="#666" />
                <Text style={styles.hospitalPhone}>{item.contact_phone || "Tidak ada nomor"}</Text>
              </View>
            </View>

            <View style={styles.actionDivider}>
              <TouchableOpacity style={styles.actionButton} onPress={() => deleteHospital(item.id, item.name)}>
                <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                <Text style={styles.actionTextDelete}>Hapus RS</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.emptyContainer}><MaterialCommunityIcons name="hospital-box-outline" size={48} color="#DDD" /><Text style={styles.emptyText}>Tidak ada rumah sakit</Text></View>}
      />

      {/* FAB Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => { setHospitalForm({ name: "", address: "", contact_phone: "", location: null }); setMapRegion(DEFAULT_MAP_REGION); setShowHospitalModal(true); }}>
        <MaterialCommunityIcons name="hospital-marker" size={26} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  if (loading && activeInternalTab !== "stats") {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header Premium */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Dashboard</Text>
          <Text style={styles.headerTitle}>Super Admin</Text>
        </View>
        <View style={styles.adminAvatar}>
          <MaterialCommunityIcons name="shield-crown" size={24} color="#D32F2F" />
        </View>
      </View>

      {/* Segmented Control Tabs */}
      <View style={styles.segmentedControlContainer}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity style={[styles.segmentBtn, activeInternalTab === "stats" && styles.segmentBtnActive]} onPress={() => setActiveInternalTab("stats")}>
            <Ionicons name="stats-chart" size={16} color={activeInternalTab === "stats" ? "#333" : "#888"} />
            <Text style={[styles.segmentText, activeInternalTab === "stats" && styles.segmentTextActive]}>Statistik</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, activeInternalTab === "users" && styles.segmentBtnActive]} onPress={() => setActiveInternalTab("users")}>
            <Ionicons name="people" size={16} color={activeInternalTab === "users" ? "#333" : "#888"} />
            <Text style={[styles.segmentText, activeInternalTab === "users" && styles.segmentTextActive]}>Pengguna</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, activeInternalTab === "hospitals" && styles.segmentBtnActive]} onPress={() => setActiveInternalTab("hospitals")}>
            <Ionicons name="business" size={16} color={activeInternalTab === "hospitals" ? "#333" : "#888"} />
            <Text style={[styles.segmentText, activeInternalTab === "hospitals" && styles.segmentTextActive]}>Rumah Sakit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContent}>
        {activeInternalTab === "stats" && renderStatsTab()}
        {activeInternalTab === "users" && renderUsersTab()}
        {activeInternalTab === "hospitals" && renderHospitalsTab()}
      </View>

      {/* MODAL USER */}
    <Modal visible={showUserModal} animationType="slide" transparent>
  <View style={styles.modalOverlay}>
    {/* Gunakan View sebagai pembungkus utama agar kita bisa memisahkan header/footer */}
    <View style={styles.modalContent}>
      
      {/* 1. Header (Tetap di atas) */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{editingUser ? "Edit User" : "Tambah User Baru"}</Text>
        <TouchableOpacity onPress={() => setShowUserModal(false)}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* 2. ScrollView (Hanya untuk form agar bisa di-scroll) */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nama Lengkap</Text>
          <TextInput style={styles.modalInput} placeholder="Masukkan nama..." value={userForm.name} onChangeText={(text) => setUserForm({ ...userForm, name: text })} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput style={styles.modalInput} placeholder="contoh@email.com" value={userForm.email} onChangeText={(text) => setUserForm({ ...userForm, email: text })} autoCapitalize="none" keyboardType="email-address" />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>No Telepon</Text>
          <TextInput style={styles.modalInput} placeholder="08123xxx" value={userForm.phone} onChangeText={(text) => setUserForm({ ...userForm, phone: text })} keyboardType="phone-pad" />
        </View>

        {!editingUser && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password Sementara</Text>
            <TextInput style={styles.modalInput} placeholder="Default: password123" value={userForm.password} onChangeText={(text) => setUserForm({ ...userForm, password: text })} secureTextEntry />
          </View>
        )}

        <Text style={styles.modalLabel}>Golongan Darah</Text>
        <View style={styles.bloodTypeRow}>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
            <TouchableOpacity key={type} style={[styles.bloodTypeOption, userForm.blood_type === type && styles.bloodTypeOptionActive]} onPress={() => setUserForm({ ...userForm, blood_type: type })}>
              <Text style={[styles.bloodTypeOptionText, userForm.blood_type === type && styles.bloodTypeOptionTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.modalLabel}>Role Sistem</Text>
        <View style={styles.roleRow}>
          {["donor", "admin"].map((role) => (
            <TouchableOpacity key={role} style={[styles.roleOption, userForm.role === role && styles.roleOptionActive]} onPress={() => setUserForm({ ...userForm, role })}>
              <Ionicons name={role === 'admin' ? "shield-checkmark" : "water"} size={16} color={userForm.role === role ? "#FFF" : "#666"} />
              <Text style={[styles.roleOptionText, userForm.role === role && styles.roleOptionTextActive]}>{role === "donor" ? "Pendonor" : "Administrator"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Tambahkan ruang kosong di bawah agar tidak menempel ke tombol footer */}
        <View style={{ height: 20 }} /> 
      </ScrollView>

      {/* 3. Tombol Simpan (Tetap di bawah, tidak ikut di-scroll) */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity style={styles.modalSaveButton} onPress={editingUser ? updateUser : addUser}>
          <Text style={styles.modalSaveButtonText}>Simpan Data</Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
</Modal>
      {/* MODAL HOSPITAL */}
      <Modal visible={showHospitalModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daftarkan Rumah Sakit</Text>
              <TouchableOpacity onPress={() => setShowHospitalModal(false)}><Ionicons name="close" size={24} color="#666" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Rumah Sakit</Text>
                <TextInput style={styles.modalInput} placeholder="RS Umum Daerah..." value={hospitalForm.name} onChangeText={(text) => setHospitalForm({ ...hospitalForm, name: text })} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alamat Lengkap</Text>
                <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Jl. Raya No..." value={hospitalForm.address} onChangeText={(text) => setHospitalForm({ ...hospitalForm, address: text })} multiline />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nomor Telepon UGD / RS</Text>
                <TextInput style={styles.modalInput} placeholder="021-xxx" value={hospitalForm.contact_phone} onChangeText={(text) => setHospitalForm({ ...hospitalForm, contact_phone: text })} keyboardType="phone-pad" />
              </View>

              <Text style={styles.modalLabel}>Pilih Lokasi Rumah Sakit</Text>
              <Text style={styles.modalHelperText}>Sentuh peta untuk memilih titik lokasi dan tarik pin untuk penyesuaian.</Text>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={mapRegion}
                  region={mapRegion}
                  onPress={(event) => {
                    const { latitude, longitude } = event.nativeEvent.coordinate;
                    setHospitalForm({ ...hospitalForm, location: { latitude, longitude } });
                    setMapRegion({ ...mapRegion, latitude, longitude });
                  }}
                  onRegionChangeComplete={(region) => setMapRegion(region)}
                >
                  {hospitalForm.location && (
                    <Marker
                      coordinate={hospitalForm.location}
                      draggable
                      onDragEnd={(event) => {
                        const { latitude, longitude } = event.nativeEvent.coordinate;
                        setHospitalForm({ ...hospitalForm, location: { latitude, longitude } });
                      }}
                    />
                  )}
                </MapView>
              </View>
              {hospitalForm.location && (
                <Text style={styles.locationInfo}>
                  Lokasi terpilih: {hospitalForm.location.latitude.toFixed(5)}, {hospitalForm.location.longitude.toFixed(5)}
                </Text>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.stickyFooter}>
              <TouchableOpacity style={styles.modalSaveButton} onPress={addHospital}>
                <Text style={styles.modalSaveButtonText}>Tambahkan RS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  unauthorizedContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#F8F9FA" },
  unauthorizedTitle: { fontSize: 22, fontWeight: "bold", color: "#D32F2F", marginTop: 20 },
  unauthorizedText: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 10 },

  // --- HEADER ---
  header: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16, backgroundColor: "#FFF", flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerGreeting: { fontSize: 14, color: "#666", fontWeight: "500" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#1A1A1A", letterSpacing: 0.5 },
  adminAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFEbee", justifyContent: "center", alignItems: "center" },

  // --- SEGMENTED CONTROL ---
  segmentedControlContainer: { backgroundColor: "#FFF", paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "#EEE" },
  segmentedControl: { flexDirection: "row", backgroundColor: "#F0F2F5", borderRadius: 12, padding: 4 },
  segmentBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 8, gap: 6 },
  segmentBtnActive: { backgroundColor: "#FFF", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  segmentText: { fontSize: 13, color: "#888", fontWeight: "600" },
  segmentTextActive: { color: "#333", fontWeight: "bold" },

  tabContent: { flex: 1 },
  scrollPadding: { paddingBottom: 24 },

  // --- STATS TAB ---
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: "#FFF", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  statIconBg: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  statNumber: { fontSize: 26, fontWeight: "900", color: "#1A1A1A" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 4, fontWeight: "500" },

  sectionCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, marginHorizontal: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A", marginBottom: 16 },

  barContainer: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 12 },
  barLabel: { width: 35, fontSize: 13, fontWeight: "bold", color: "#444" },
  barWrapper: { flex: 1, height: 16, backgroundColor: "#F0F2F5", borderRadius: 8, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 8 },
  barValue: { width: 35, fontSize: 12, color: "#666", textAlign: "right", fontWeight: "600" },

  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  filterToggle: { flexDirection: "row", backgroundColor: "#F0F2F5", borderRadius: 8, padding: 3 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  filterBtnActive: { backgroundColor: "#FFF", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  filterBtnText: { fontSize: 11, color: "#666", fontWeight: "700" },
  filterBtnTextActive: { color: "#D32F2F" },

  chartContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 140, marginTop: 10 },
  chartBarWrapper: { alignItems: "center", width: 45 },
  chartBar: { width: 24, backgroundColor: "#D32F2F", borderRadius: 6, marginBottom: 8, minHeight: 4 },
  chartLabel: { fontSize: 10, color: "#888", textAlign: "center", fontWeight: "500" },
  chartValue: { fontSize: 12, fontWeight: "bold", color: "#333", position: 'absolute', top: -20 },

  // --- LISTS (USERS & HOSPITALS) ---
  listTabContainer: { flex: 1 },
  listPadding: { paddingBottom: 100 }, // Padding for FAB
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", margin: 16, paddingHorizontal: 16, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, paddingVertical: 14, marginLeft: 10, fontSize: 14, color: "#333" },

  // User Card
  userCard: { backgroundColor: "#FFF", marginHorizontal: 16, marginBottom: 12, borderRadius: 20, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  userCardContent: { flexDirection: "row", padding: 16, alignItems: "center" },
  avatarCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#F0F2F5", justifyContent: "center", alignItems: "center", marginRight: 14 },
  avatarText: { fontSize: 18, fontWeight: "bold", color: "#666" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A", marginBottom: 2 },
  userEmail: { fontSize: 13, color: "#888", marginBottom: 8 },
  userBadges: { flexDirection: "row", gap: 8 },
  bloodBadgeMini: { backgroundColor: "#FFEbee", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  bloodBadgeMiniText: { color: "#D32F2F", fontSize: 11, fontWeight: "bold" },
  roleBadge: { backgroundColor: "#E3F2FD", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminBadge: { backgroundColor: "#333" },
  roleText: { fontSize: 11, color: "#1976D2", fontWeight: "bold" },
  adminRoleText: { color: "#FFF" },

  // Hospital Card
  hospitalCard: { backgroundColor: "#FFF", marginHorizontal: 16, marginBottom: 12, borderRadius: 20, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  hospitalCardHeader: { flexDirection: "row", padding: 16, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F4F6F8" },
  hospitalIconBg: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#FFEbee", justifyContent: "center", alignItems: "center", marginRight: 12 },
  hospitalInfo: { flex: 1 },
  hospitalName: { fontSize: 16, fontWeight: "bold", color: "#1A1A1A", marginBottom: 2 },
  hospitalDate: { fontSize: 11, color: "#999" },
  hospitalDetails: { padding: 16, gap: 8 },
  hospitalDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hospitalAddress: { fontSize: 13, color: "#555", flex: 1, lineHeight: 18 },
  hospitalPhone: { fontSize: 13, color: "#555", fontWeight: "500" },

  // Card Actions (Footer)
  actionDivider: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: "#F4F6F8", backgroundColor: "#FAFAFA" },
  actionButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 6 },
  actionTextEdit: { color: "#2196F3", fontSize: 13, fontWeight: "600" },
  actionTextDelete: { color: "#D32F2F", fontSize: 13, fontWeight: "600" },

  // --- FAB ---
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: "#D32F2F", justifyContent: 'center', alignItems: 'center', shadowColor: "#D32F2F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },

  emptyContainer: { alignItems: "center", marginTop: 60, padding: 20 },
  emptyText: { color: "#999", marginTop: 12, fontSize: 14 },

  // --- MODALS ---
modalOverlay: { 
  flex: 1, 
  backgroundColor: "rgba(0,0,0,0.5)", 
  justifyContent: "center", // Dialog tetap di tengah secara vertikal
  alignItems: "center",
  paddingTop: 40, // Memberikan ruang agar tidak menabrak status bar/notch
},
modalContent: { 
  backgroundColor: "#FFF", 
  borderRadius: 20, 
  padding: 24, 
  width: "90%", 
  maxHeight: "85%", 
  marginTop: 20, // Menambahkan jarak/spasi dari atas
  marginBottom: 20, // Menambahkan jarak/spasi dari bawah
  overflow: "hidden",
},
modalBody: {
  paddingBottom: 8,
},
stickyFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    backgroundColor: "#FFF",
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A" },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, color: "#555", fontWeight: "600", marginBottom: 8 },
  modalInput: { backgroundColor: "#F8F9FA", borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 12, padding: 14, fontSize: 15, color: "#333" },
  modalHelperText: { fontSize: 12, color: "#666", marginBottom: 10 },
  mapContainer: { height: 250, borderRadius: 16, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: "#EAEAEA" },
  map: { width: "100%", height: "100%" },
  locationInfo: { fontSize: 12, color: "#666", marginBottom: 16 },

  modalLabel: { fontSize: 14, fontWeight: "bold", color: "#1A1A1A", marginBottom: 12, marginTop: 8 },
  bloodTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  bloodTypeOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "#F8F9FA", borderWidth: 1, borderColor: "#EAEAEA" },
  bloodTypeOptionActive: { backgroundColor: "#FFEbee", borderColor: "#D32F2F" },
  bloodTypeOptionText: { fontSize: 14, color: "#666", fontWeight: "600" },
  bloodTypeOptionTextActive: { color: "#D32F2F", fontWeight: "bold" },

  roleRow: { flexDirection: "row", gap: 12, marginBottom: 32 },
  roleOption: { flex: 1, flexDirection: 'row', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: "#F8F9FA", borderWidth: 1, borderColor: "#EAEAEA", gap: 8 },
  roleOptionActive: { backgroundColor: "#1A1A1A", borderColor: "#1A1A1A" },
  roleOptionText: { fontSize: 14, color: "#666", fontWeight: "600" },
  roleOptionTextActive: { color: "#FFF", fontWeight: "bold" },

  modalSaveButton: { backgroundColor: "#D32F2F", paddingVertical: 16, borderRadius: 16, alignItems: "center", marginBottom: 20 },
  modalSaveButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});