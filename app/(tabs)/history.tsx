import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";

interface DonationHistory {
  id: string;
  request_id: string;
  response_status: string;
  responded_at: string;
  blood_type: string;
  bags_needed: number;
  urgency_level: string;
  hospital_name: string;
}

export default function HistoryScreen() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<DonationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from("donor_responses")
        .select(
          `
          id, request_id, response_status, responded_at,
          blood_requests!inner (required_blood, bags_needed, urgency_level, hospitals!inner (name))
        `,
        )
        .eq("donor_id", profile.id)
        .in("response_status", ["accepted", "completed"])
        .order("responded_at", { ascending: false });

      if (error) throw error;

      const formattedHistory: DonationHistory[] = (data || []).map(
        (item: any) => ({
          id: item.id,
          request_id: item.request_id,
          response_status: item.response_status,
          responded_at: item.responded_at,
          blood_type: item.blood_requests.required_blood,
          bags_needed: item.blood_requests.bags_needed,
          urgency_level: item.blood_requests.urgency_level,
          hospital_name: item.blood_requests.hospitals.name,
        }),
      );

      setHistory(formattedHistory);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Riwayat Donasi</Text>
        <Text style={styles.headerSub}>Jejak kebaikan Anda</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.bloodBadge,
                  { backgroundColor: getUrgencyColor(item.urgency_level) },
                ]}
              >
                <Text style={styles.bloodBadgeText}>{item.blood_type}</Text>
              </View>
              <View
                style={[styles.statusBadge, { backgroundColor: "#E8F5E9" }]}
              >
                <Text style={[styles.statusText, { color: "#4CAF50" }]}>
                  {item.response_status === "completed"
                    ? "SELESAI"
                    : "DITERIMA"}
                </Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.hospitalInfo}>
                <MaterialCommunityIcons
                  name="hospital-building"
                  size={18}
                  color="#D32F2F"
                />
                <Text style={styles.hospitalName}>{item.hospital_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="water" size={14} color="#666" />
                  <Text style={styles.detailText}>
                    {item.bags_needed} Kantong
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar" size={14} color="#666" />
                  <Text style={styles.detailText}>
                    {formatDate(item.responded_at)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#D32F2F"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="heart-outline"
              size={70}
              color="#E0E0E0"
            />
            <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
            <Text style={styles.emptySubtitle}>
              Anda belum pernah merespon permintaan darah.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10, // Kurangi padding top
    paddingBottom: 10, // Kurangi padding bottom
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: {
    fontSize: 20, // Kurangi dari 24
    fontWeight: "bold",
    color: "#333",
  },
  headerSub: {
    fontSize: 13, // Kurangi dari 14
    color: "#777",
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8, // Kurangi padding top
    paddingBottom: 8, // Padding bottom minimal
  },
  historyCard: {
    backgroundColor: "#FFF",
    borderRadius: 14, // Kurangi dari 16
    marginBottom: 10, // Kurangi dari 15
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12, // Kurangi dari 15
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  bloodBadge: {
    paddingHorizontal: 10, // Kurangi dari 12
    paddingVertical: 3, // Kurangi dari 4
    borderRadius: 16,
  },
  bloodBadgeText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 12, // Kurangi dari 14
  },
  statusBadge: {
    paddingHorizontal: 8, // Kurangi dari 10
    paddingVertical: 3, // Kurangi dari 4
    borderRadius: 10,
  },
  statusText: {
    fontSize: 9, // Kurangi dari 10
    fontWeight: "bold",
  },
  cardContent: {
    padding: 12, // Kurangi dari 15
  },
  hospitalInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8, // Kurangi dari 12
    gap: 6,
  },
  hospitalName: {
    fontSize: 14, // Kurangi dari 16
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  detailRow: {
    flexDirection: "row",
    gap: 16, // Kurangi dari 20
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12, // Kurangi dari 13
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#BBB",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#CCC",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
