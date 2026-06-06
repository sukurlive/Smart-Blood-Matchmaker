import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";

export default function HospitalDashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRequest, setNewRequest] = useState({
    required_blood: "O+",
    bags_needed: 1,
    urgency_level: "Normal",
  });

  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const urgencyLevels = ["Normal", "High", "Critical"];

  const fetchData = useCallback(async () => {
    if (!profile?.hospital_id) return;

    try {
      const { data: reqData } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("hospital_id", profile.hospital_id)
        .eq("status", "Active")
        .order("created_at", { ascending: false });

      setRequests(reqData || []);

      const { data: respData } = await supabase
        .from("hospital_donor_responses")
        .select("*")
        .eq("hospital_id", profile.hospital_id);

      setResponses(respData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createRequest = async () => {
    setCreating(true);
    try {
      const { error } = await supabase.rpc("create_blood_request", {
        p_hospital_id: profile?.hospital_id,
        p_required_blood: newRequest.required_blood,
        p_bags_needed: newRequest.bags_needed,
        p_urgency_level: newRequest.urgency_level,
      });

      if (error) throw error;

      Alert.alert("Sukses", "Permintaan berhasil dibuat");
      setShowModal(false);
      setNewRequest({
        required_blood: "O+",
        bags_needed: 1,
        urgency_level: "Normal",
      });
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setCreating(false);
    }
  };

  const completeRequest = async (id: string) => {
    Alert.alert("Selesaikan", "Selesaikan permintaan ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya",
        onPress: async () => {
          const { error } = await supabase.rpc("update_request_status", {
            p_request_id: id,
            p_status: "Completed",
            p_hospital_id: profile?.hospital_id,
          });

          if (error) {
            Alert.alert("Error", error.message);
          } else {
            Alert.alert("Sukses", "Permintaan selesai");
            fetchData();
          }
        },
      },
    ]);
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case "Critical":
        return "#D32F2F";
      case "High":
        return "#FF9800";
      default:
        return "#4CAF50";
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard RS</Text>
          <Text style={styles.headerSub}>{profile?.hospital_name}</Text>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.createButtonText}>Buat Permintaan Baru</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Permintaan Aktif ({requests.length})
          </Text>
          {requests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Tidak ada permintaan aktif</Text>
            </View>
          ) : (
            requests.map((req) => (
              <View key={req.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: getUrgencyColor(req.urgency_level) },
                    ]}
                  >
                    <Text style={styles.badgeText}>{req.urgency_level}</Text>
                  </View>
                  <TouchableOpacity onPress={() => completeRequest(req.id)}>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#4CAF50"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.bloodType}>{req.required_blood}</Text>
                <Text style={styles.bags}>{req.bags_needed} Kantong</Text>
                <Text style={styles.date}>
                  {new Date(req.created_at).toLocaleString("id-ID")}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Donor Merespon ({responses.length})
          </Text>
          {responses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Belum ada donor yang merespon
              </Text>
            </View>
          ) : (
            responses.map((donor) => (
              <View key={donor.response_id} style={styles.donorCard}>
                <View style={styles.donorHeader}>
                  <View style={styles.donorAvatar}>
                    <Text style={styles.donorAvatarText}>
                      {donor.donor_blood_type}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.donorName}>{donor.donor_name}</Text>
                    <Text style={styles.donorPhone}>{donor.donor_phone}</Text>
                  </View>
                </View>
                <Text style={styles.donorNotes}>
                  📋 {donor.notes || "Tidak ada catatan"}
                </Text>
                <Text style={styles.donorTime}>
                  🕐 {new Date(donor.responded_at).toLocaleString("id-ID")}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create Request Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Buat Permintaan Darah</Text>

            <Text style={styles.label}>Golongan Darah</Text>
            <View style={styles.bloodGrid}>
              {bloodTypes.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.bloodBtn,
                    newRequest.required_blood === t && styles.bloodBtnActive,
                  ]}
                  onPress={() =>
                    setNewRequest({ ...newRequest, required_blood: t })
                  }
                >
                  <Text
                    style={[
                      styles.bloodText,
                      newRequest.required_blood === t && styles.bloodTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Jumlah Kantong</Text>
            <View style={styles.bagsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.bagBtn,
                    newRequest.bags_needed === n && styles.bagBtnActive,
                  ]}
                  onPress={() =>
                    setNewRequest({ ...newRequest, bags_needed: n })
                  }
                >
                  <Text
                    style={[
                      styles.bagText,
                      newRequest.bags_needed === n && styles.bagTextActive,
                    ]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tingkat Urgensi</Text>
            <View style={styles.urgencyRow}>
              {urgencyLevels.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[
                    styles.urgencyBtn,
                    newRequest.urgency_level === l && {
                      backgroundColor: getUrgencyColor(l),
                    },
                  ]}
                  onPress={() =>
                    setNewRequest({ ...newRequest, urgency_level: l })
                  }
                >
                  <Text
                    style={[
                      styles.urgencyText,
                      newRequest.urgency_level === l && { color: "#FFF" },
                    ]}
                  >
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={createRequest}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmText}>Buat</Text>
                )}
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
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#D32F2F", padding: 20, paddingTop: 40 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#FFF" },
  headerSub: { fontSize: 14, color: "#FFCDD2", marginTop: 4 },
  createButton: {
    flexDirection: "row",
    backgroundColor: "#D32F2F",
    margin: 15,
    padding: 15,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  createButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  section: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
  bloodType: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#D32F2F",
    textAlign: "center",
  },
  bags: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 4 },
  date: { fontSize: 11, color: "#999", textAlign: "center", marginTop: 8 },
  donorCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  donorHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  donorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  donorAvatarText: { fontSize: 18, fontWeight: "bold", color: "#D32F2F" },
  donorName: { fontSize: 16, fontWeight: "600" },
  donorPhone: { fontSize: 13, color: "#666" },
  donorNotes: { fontSize: 12, color: "#666", marginBottom: 4 },
  donorTime: { fontSize: 11, color: "#999" },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
  },
  emptyText: { color: "#999" },
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  bloodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  bloodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  bloodBtnActive: { backgroundColor: "#D32F2F" },
  bloodText: { fontSize: 14, color: "#666" },
  bloodTextActive: { color: "#FFF" },
  bagsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  bagBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  bagBtnActive: { backgroundColor: "#D32F2F" },
  bagText: { fontSize: 18, fontWeight: "bold", color: "#666" },
  bagTextActive: { color: "#FFF" },
  urgencyRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  urgencyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  urgencyText: { fontSize: 14, fontWeight: "600", color: "#666" },
  modalButtons: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelText: { color: "#666", fontWeight: "600" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#D32F2F",
    alignItems: "center",
  },
  confirmText: { color: "#FFF", fontWeight: "bold" },
});
