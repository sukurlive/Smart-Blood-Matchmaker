import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  phone: string;
  is_verified: boolean;
  created_at: string;
}

interface Stats {
  total_donors: number;
  total_hospitals: number;
  total_requests: number;
  total_donations: number;
  total_blood_requests: {
    A_plus: number;
    A_minus: number;
    B_plus: number;
    B_minus: number;
    AB_plus: number;
    AB_minus: number;
    O_plus: number;
    O_minus: number;
  };
  monthly_donations: {
    month: string;
    count: number;
  }[];
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeInternalTab, setActiveInternalTab] = useState<
    "stats" | "users" | "hospitals"
  >("stats");
  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_donors: 0,
    total_hospitals: 0,
    total_requests: 0,
    total_donations: 0,
    total_blood_requests: {
      A_plus: 0,
      A_minus: 0,
      B_plus: 0,
      B_minus: 0,
      AB_plus: 0,
      AB_minus: 0,
      O_plus: 0,
      O_minus: 0,
    },
    monthly_donations: [],
  });
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    blood_type: "O+",
    role: "donor",
    password: "",
  });
  const [hospitalForm, setHospitalForm] = useState({
    name: "",
    address: "",
    phone: "",
  });

  useEffect(() => {
    fetchData();
  }, [activeInternalTab]);

  // Cek apakah user adalah admin
  if (profile?.role !== "admin") {
    return (
      <View style={styles.unauthorizedContainer}>
        <MaterialCommunityIcons name="shield-alert" size={80} color="#D32F2F" />
        <Text style={styles.unauthorizedTitle}>Akses Ditolak</Text>
        <Text style={styles.unauthorizedText}>
          Anda tidak memiliki akses ke halaman admin.
        </Text>
      </View>
    );
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeInternalTab === "stats") {
        await fetchStats();
      } else if (activeInternalTab === "users") {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setUsers(data || []);
      } else if (activeInternalTab === "hospitals") {
        const { data, error } = await supabase
          .from("hospitals")
          .select("*")
          .order("name");
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
      // Total donors
      const { count: donorsCount } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "donor");

      // Total hospitals
      const { count: hospitalsCount } = await supabase
        .from("hospitals")
        .select("*", { count: "exact", head: true });

      // Total active requests
      const { count: requestsCount } = await supabase
        .from("blood_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "Active");

      // Total completed donations
      const { count: donationsCount } = await supabase
        .from("donor_responses")
        .select("*", { count: "exact", head: true })
        .eq("response_status", "completed");

      // Blood requests by type
      const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
      const bloodCounts: any = {};

      for (const type of bloodTypes) {
        const { count } = await supabase
          .from("blood_requests")
          .select("*", { count: "exact", head: true })
          .eq("required_blood", type)
          .eq("status", "Active");
        bloodCounts[type.replace("+", "_plus").replace("-", "_minus")] =
          count || 0;
      }

      // Monthly donations (last 6 months)
      const monthlyData = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const startDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          1,
        ).toISOString();
        const endDate = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
        ).toISOString();

        const { count } = await supabase
          .from("donor_responses")
          .select("*", { count: "exact", head: true })
          .eq("response_status", "completed")
          .gte("responded_at", startDate)
          .lt("responded_at", endDate);

        monthlyData.push({
          month: date.toLocaleDateString("id-ID", {
            month: "short",
            year: "numeric",
          }),
          count: count || 0,
        });
      }

      setStats({
        total_donors: donorsCount || 0,
        total_hospitals: hospitalsCount || 0,
        total_requests: requestsCount || 0,
        total_donations: donationsCount || 0,
        total_blood_requests: bloodCounts,
        monthly_donations: monthlyData,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const addUser = async () => {
    if (!userForm.name || !userForm.email) {
      Alert.alert("Error", "Nama dan email harus diisi");
      return;
    }

    try {
      const tempPassword = userForm.password || "password123";
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userForm.email,
        password: tempPassword,
        options: {
          data: {
            name: userForm.name,
            blood_type: userForm.blood_type,
            phone: userForm.phone,
            role: userForm.role,
          },
        },
      });

      if (authError) throw authError;

      Alert.alert(
        "Sukses",
        `User berhasil ditambahkan!\nEmail: ${userForm.email}\nPassword: ${tempPassword}`,
      );
      setShowUserModal(false);
      setUserForm({
        name: "",
        email: "",
        phone: "",
        blood_type: "O+",
        role: "donor",
        password: "",
      });
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          name: userForm.name,
          phone: userForm.phone,
          blood_type: userForm.blood_type,
          role: userForm.role,
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      Alert.alert("Sukses", "User berhasil diupdate");
      setShowUserModal(false);
      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const deleteUser = async (id: string, name: string) => {
    Alert.alert("Konfirmasi", `Hapus user "${name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("user_profiles")
            .delete()
            .eq("id", id);
          if (error) Alert.alert("Error", error.message);
          else fetchData();
        },
      },
    ]);
  };

  const addHospital = async () => {
    if (!hospitalForm.name || !hospitalForm.address) {
      Alert.alert("Error", "Nama dan alamat harus diisi");
      return;
    }

    try {
      const { error } = await supabase.from("hospitals").insert({
        name: hospitalForm.name,
        address: hospitalForm.address,
        phone: hospitalForm.phone,
        is_verified: true,
      });

      if (error) throw error;

      Alert.alert("Sukses", "Rumah sakit berhasil ditambahkan");
      setShowHospitalModal(false);
      setHospitalForm({ name: "", address: "", phone: "" });
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const deleteHospital = async (id: string, name: string) => {
    Alert.alert("Konfirmasi", `Hapus RS "${name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("hospitals")
            .delete()
            .eq("id", id);
          if (error) Alert.alert("Error", error.message);
          else fetchData();
        },
      },
    ]);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredHospitals = hospitals.filter((hospital) =>
    hospital.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID");
  };

  // Render Statistik Tab
  const renderStatsTab = () => {
    const bloodData = [
      {
        label: "A+",
        value: stats.total_blood_requests.A_plus,
        color: "#D32F2F",
      },
      {
        label: "A-",
        value: stats.total_blood_requests.A_minus,
        color: "#E57373",
      },
      {
        label: "B+",
        value: stats.total_blood_requests.B_plus,
        color: "#FF9800",
      },
      {
        label: "B-",
        value: stats.total_blood_requests.B_minus,
        color: "#FFB74D",
      },
      {
        label: "AB+",
        value: stats.total_blood_requests.AB_plus,
        color: "#4CAF50",
      },
      {
        label: "AB-",
        value: stats.total_blood_requests.AB_minus,
        color: "#81C784",
      },
      {
        label: "O+",
        value: stats.total_blood_requests.O_plus,
        color: "#2196F3",
      },
      {
        label: "O-",
        value: stats.total_blood_requests.O_minus,
        color: "#64B5F6",
      },
    ];

    const maxBloodValue = Math.max(...bloodData.map((b) => b.value), 1);

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="people" size={28} color="#4CAF50" />
            </View>
            <Text style={styles.statNumber}>{stats.total_donors}</Text>
            <Text style={styles.statLabel}>Total Donor</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="business" size={28} color="#2196F3" />
            </View>
            <Text style={styles.statNumber}>{stats.total_hospitals}</Text>
            <Text style={styles.statLabel}>Total RS</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="alert-circle" size={28} color="#FF9800" />
            </View>
            <Text style={styles.statNumber}>{stats.total_requests}</Text>
            <Text style={styles.statLabel}>Request Aktif</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#FFEBEE" }]}>
              <Ionicons name="checkmark-circle" size={28} color="#D32F2F" />
            </View>
            <Text style={styles.statNumber}>{stats.total_donations}</Text>
            <Text style={styles.statLabel}>Donasi Selesai</Text>
          </View>
        </View>

        {/* Blood Type Distribution */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            🩸 Permintaan Darah per Golongan
          </Text>
          {bloodData.map((item) => (
            <View key={item.label} style={styles.barContainer}>
              <Text style={styles.barLabel}>{item.label}</Text>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${(item.value / maxBloodValue) * 100}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Monthly Donations Chart */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📊 Donasi per Bulan</Text>
          <View style={styles.chartContainer}>
            {stats.monthly_donations.map((item, index) => {
              const maxMonthly = Math.max(
                ...stats.monthly_donations.map((m) => m.count),
                1,
              );
              const height = (item.count / maxMonthly) * 120;
              return (
                <View key={index} style={styles.chartBarWrapper}>
                  <View
                    style={[styles.chartBar, { height: Math.max(height, 4) }]}
                  />
                  <Text style={styles.chartLabel}>
                    {item.month.split(" ")[0]}
                  </Text>
                  <Text style={styles.chartValue}>{item.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  };

  // Render Users Tab
  const renderUsersTab = () => (
    <>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari user..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingUser(null);
          setUserForm({
            name: "",
            email: "",
            phone: "",
            blood_type: "O+",
            role: "donor",
            password: "",
          });
          setShowUserModal(true);
        }}
      >
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.addButtonText}>Tambah User Baru</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <View style={styles.userCardHeader}>
              <View>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingUser(item);
                    setUserForm({
                      name: item.name || "",
                      email: item.email || "",
                      phone: item.phone || "",
                      blood_type: item.blood_type || "O+",
                      role: item.role || "donor",
                      password: "",
                    });
                    setShowUserModal(true);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteUser(item.id, item.name)}
                >
                  <Ionicons name="trash-outline" size={20} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.detailText}>🩸 {item.blood_type || "-"}</Text>
              <Text style={styles.detailText}>📞 {item.phone || "-"}</Text>
              <View
                style={[
                  styles.roleBadge,
                  item.role === "admin" && styles.adminBadge,
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    item.role === "admin" && styles.adminRoleText,
                  ]}
                >
                  {item.role === "admin" ? "Admin" : "Donor"}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada user ditemukan</Text>
          </View>
        }
      />
    </>
  );

  // Render Hospitals Tab
  const renderHospitalsTab = () => (
    <>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari rumah sakit..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setHospitalForm({ name: "", address: "", phone: "" });
          setShowHospitalModal(true);
        }}
      >
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.addButtonText}>Tambah RS Baru</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredHospitals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.hospitalCard}>
            <View style={styles.hospitalCardHeader}>
              <Text style={styles.hospitalName}>{item.name}</Text>
              <TouchableOpacity
                onPress={() => deleteHospital(item.id, item.name)}
              >
                <Ionicons name="trash-outline" size={20} color="#D32F2F" />
              </TouchableOpacity>
            </View>
            <Text style={styles.hospitalAddress}>{item.address}</Text>
            <Text style={styles.hospitalPhone}>📞 {item.phone || "-"}</Text>
            <Text style={styles.hospitalDate}>
              📅 {formatDate(item.created_at)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Tidak ada rumah sakit ditemukan
            </Text>
          </View>
        }
      />
    </>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSub}>Kelola data aplikasi</Text>
      </View>

      {/* Internal Tabs */}
      <View style={styles.internalTabContainer}>
        <TouchableOpacity
          style={[
            styles.internalTab,
            activeInternalTab === "stats" && styles.internalTabActive,
          ]}
          onPress={() => setActiveInternalTab("stats")}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeInternalTab === "stats" ? "#D32F2F" : "#666"}
          />
          <Text
            style={[
              styles.internalTabText,
              activeInternalTab === "stats" && styles.internalTabTextActive,
            ]}
          >
            Statistik
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.internalTab,
            activeInternalTab === "users" && styles.internalTabActive,
          ]}
          onPress={() => setActiveInternalTab("users")}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeInternalTab === "users" ? "#D32F2F" : "#666"}
          />
          <Text
            style={[
              styles.internalTabText,
              activeInternalTab === "users" && styles.internalTabTextActive,
            ]}
          >
            Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.internalTab,
            activeInternalTab === "hospitals" && styles.internalTabActive,
          ]}
          onPress={() => setActiveInternalTab("hospitals")}
        >
          <Ionicons
            name="business"
            size={20}
            color={activeInternalTab === "hospitals" ? "#D32F2F" : "#666"}
          />
          <Text
            style={[
              styles.internalTabText,
              activeInternalTab === "hospitals" && styles.internalTabTextActive,
            ]}
          >
            RS
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      <View style={styles.tabContent}>
        {activeInternalTab === "stats" && renderStatsTab()}
        {activeInternalTab === "users" && renderUsersTab()}
        {activeInternalTab === "hospitals" && renderHospitalsTab()}
      </View>

      {/* Modals */}
      <Modal visible={showUserModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingUser ? "Edit User" : "Tambah User Baru"}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nama Lengkap"
              value={userForm.name}
              onChangeText={(text) => setUserForm({ ...userForm, name: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              value={userForm.email}
              onChangeText={(text) => setUserForm({ ...userForm, email: text })}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="No Telepon"
              value={userForm.phone}
              onChangeText={(text) => setUserForm({ ...userForm, phone: text })}
              keyboardType="phone-pad"
            />
            {!editingUser && (
              <TextInput
                style={styles.modalInput}
                placeholder="Password (default: password123)"
                value={userForm.password}
                onChangeText={(text) =>
                  setUserForm({ ...userForm, password: text })
                }
                secureTextEntry
              />
            )}
            <Text style={styles.modalLabel}>Golongan Darah</Text>
            <View style={styles.bloodTypeRow}>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                (type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.bloodTypeOption,
                      userForm.blood_type === type &&
                        styles.bloodTypeOptionActive,
                    ]}
                    onPress={() =>
                      setUserForm({ ...userForm, blood_type: type })
                    }
                  >
                    <Text
                      style={[
                        styles.bloodTypeOptionText,
                        userForm.blood_type === type &&
                          styles.bloodTypeOptionTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
            <Text style={styles.modalLabel}>Role</Text>
            <View style={styles.roleRow}>
              {["donor", "admin"].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    userForm.role === role && styles.roleOptionActive,
                  ]}
                  onPress={() => setUserForm({ ...userForm, role })}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      userForm.role === role && styles.roleOptionTextActive,
                    ]}
                  >
                    {role === "donor" ? "Donor" : "Admin"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowUserModal(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={editingUser ? updateUser : addUser}
              >
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showHospitalModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tambah RS Baru</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nama Rumah Sakit"
              value={hospitalForm.name}
              onChangeText={(text) =>
                setHospitalForm({ ...hospitalForm, name: text })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Alamat"
              value={hospitalForm.address}
              onChangeText={(text) =>
                setHospitalForm({ ...hospitalForm, address: text })
              }
              multiline
            />
            <TextInput
              style={styles.modalInput}
              placeholder="No Telepon"
              value={hospitalForm.phone}
              onChangeText={(text) =>
                setHospitalForm({ ...hospitalForm, phone: text })
              }
              keyboardType="phone-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowHospitalModal(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={addHospital}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  unauthorizedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F8F9FA",
  },
  unauthorizedTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#D32F2F",
    marginTop: 20,
  },
  unauthorizedText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#333" },
  headerSub: { fontSize: 13, color: "#777", marginTop: 2 },

  // Internal Tabs
  internalTabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 8,
  },
  internalTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  internalTabActive: { backgroundColor: "#FFF5F5" },
  internalTabText: { fontSize: 14, color: "#666" },
  internalTabTextActive: { color: "#D32F2F", fontWeight: "600" },

  tabContent: { flex: 1 },

  // Stats Tab Styles
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statNumber: { fontSize: 24, fontWeight: "bold", color: "#333" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 4 },

  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    margin: 12,
    marginTop: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },

  barContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  barLabel: { width: 35, fontSize: 13, fontWeight: "600", color: "#666" },
  barWrapper: {
    flex: 1,
    height: 24,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 12 },
  barValue: { width: 35, fontSize: 12, color: "#666", textAlign: "right" },

  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 160,
    marginTop: 8,
  },
  chartBarWrapper: { alignItems: "center", width: 40 },
  chartBar: {
    width: 30,
    backgroundColor: "#D32F2F",
    borderRadius: 8,
    marginBottom: 6,
    minHeight: 4,
  },
  chartLabel: { fontSize: 10, color: "#999", marginTop: 4 },
  chartValue: { fontSize: 10, fontWeight: "bold", color: "#666" },

  // Users Tab Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  searchInput: { flex: 1, paddingVertical: 10, marginLeft: 8, fontSize: 14 },

  addButton: {
    flexDirection: "row",
    backgroundColor: "#D32F2F",
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  addButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },

  userCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  userName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  userEmail: { fontSize: 13, color: "#666", marginTop: 2 },
  userActions: { flexDirection: "row", gap: 12 },
  userDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  detailText: { fontSize: 13, color: "#666" },
  roleBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  adminBadge: { backgroundColor: "#D32F2F" },
  roleText: { fontSize: 11, color: "#1976D2", fontWeight: "500" },
  adminRoleText: { color: "#FFF" },

  hospitalCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  hospitalCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  hospitalName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  hospitalAddress: { fontSize: 14, color: "#666", marginBottom: 4 },
  hospitalPhone: { fontSize: 13, color: "#888", marginBottom: 4 },
  hospitalDate: { fontSize: 11, color: "#999", marginTop: 4 },

  emptyContainer: { alignItems: "center", marginTop: 40, padding: 20 },
  emptyText: { color: "#999" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    margin: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 8,
  },

  bloodTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  bloodTypeOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  bloodTypeOptionActive: { backgroundColor: "#D32F2F", borderColor: "#D32F2F" },
  bloodTypeOptionText: { fontSize: 13, color: "#666" },
  bloodTypeOptionTextActive: { color: "#FFF" },

  roleRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  roleOptionActive: { backgroundColor: "#D32F2F" },
  roleOptionText: { fontSize: 14, color: "#666" },
  roleOptionTextActive: { color: "#FFF" },

  modalButtons: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  modalCancelText: { color: "#666", fontWeight: "600" },
  modalSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#D32F2F",
    alignItems: "center",
  },
  modalSaveText: { color: "#FFF", fontWeight: "bold" },
});
