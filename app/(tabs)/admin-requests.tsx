import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { supabase } from "../../supabase";

interface BloodRequest {
  id: string;
  required_blood: string;
  bags_needed: number;
  urgency_level: string;
  status: string;
  created_at: string;
  hospital_name: string;
}

export default function AdminRequestsScreen() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("blood_requests")
        .select(
          `
          *,
          hospitals (name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = data.map((item: any) => ({
        ...item,
        hospital_name: item.hospitals?.name,
      }));
      setRequests(formatted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    Alert.alert("Konfirmasi", `Ubah status menjadi ${newStatus}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya",
        onPress: async () => {
          const { error } = await supabase
            .from("blood_requests")
            .update({ status: newStatus })
            .eq("id", id);
          if (error) Alert.alert("Error", error.message);
          else fetchRequests();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "#4CAF50";
      case "Completed":
        return "#2196F3";
      case "Cancelled":
        return "#999";
      default:
        return "#666";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kelola Request Darah</Text>
        <Text style={styles.headerSub}>Semua permintaan dari RS</Text>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.hospitalName}>{item.hospital_name}</Text>
                <Text style={styles.requestId}>ID: {item.id.slice(-8)}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) },
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.bloodInfo}>
                <Text style={styles.bloodType}>{item.required_blood}</Text>
                <Text style={styles.bags}>{item.bags_needed} Kantong</Text>
              </View>
              <View
                style={[
                  styles.urgencyBadge,
                  { backgroundColor: getUrgencyColor(item.urgency_level) },
                ]}
              >
                <Text style={styles.urgencyText}>{item.urgency_level}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.date}>
                📅 {new Date(item.created_at).toLocaleDateString("id-ID")}
              </Text>
              {item.status === "Active" && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => updateStatus(item.id, "Completed")}
                  >
                    <Text style={styles.completeButtonText}>Selesaikan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => updateStatus(item.id, "Cancelled")}
                  >
                    <Text style={styles.cancelButtonText}>Batalkan</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada request darah</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  headerSub: { fontSize: 13, color: "#777", marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 20 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  hospitalName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  requestId: { fontSize: 11, color: "#999", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "bold", color: "#FFF" },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  bloodInfo: { alignItems: "center" },
  bloodType: { fontSize: 24, fontWeight: "bold", color: "#D32F2F" },
  bags: { fontSize: 13, color: "#666", marginTop: 2 },
  urgencyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  urgencyText: { fontSize: 12, fontWeight: "bold", color: "#FFF" },
  cardFooter: { borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 12 },
  date: { fontSize: 12, color: "#999", marginBottom: 8 },
  actionButtons: { flexDirection: "row", gap: 12 },
  completeButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  completeButtonText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  cancelButton: {
    flex: 1,
    backgroundColor: "#FF9800",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  emptyContainer: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "#999" },
});
