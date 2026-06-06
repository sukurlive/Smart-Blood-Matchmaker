import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";

interface Donor {
  id: string;
  name: string;
  blood_type: string;
  distance?: string;
  is_available: boolean;
  phone?: string;
}

export default function DonorsScreen() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const [filterBlood, setFilterBlood] = useState<string>("all");

  const bloodTypes = ["all", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  useEffect(() => {
    const fetchDonors = async () => {
      try {
        let query = supabase
          .from("user_profiles")
          .select("*")
          .eq("is_available", true);

        if (profile?.id) {
          query = query.neq("id", profile.id);
        }

        if (filterBlood !== "all") {
          query = query.eq("blood_type", filterBlood);
        }

        const { data, error } = await query;

        if (error) throw error;

        const mappedDonors = (data || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          blood_type: item.blood_type,
          distance: Math.floor(Math.random() * 5) + 1 + " km",
          is_available: item.is_available,
          phone: item.phone,
        }));

        setDonors(mappedDonors);
      } catch (error) {
        console.error("Error fetching donors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonors();
  }, [filterBlood, profile?.id]);

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
        <Text style={styles.headerTitle}>Pendonor Terdekat</Text>
        <Text style={styles.headerSub}>Siap membantu kapan saja</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {bloodTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterChip,
              filterBlood === type && styles.filterChipActive,
            ]}
            onPress={() => setFilterBlood(type)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterBlood === type && styles.filterChipTextActive,
              ]}
            >
              {type === "all" ? "Semua" : type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={donors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.blood_type}</Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userDistance}>
                📍 {item.distance} dari Anda
              </Text>
              {item.phone && (
                <Text style={styles.userPhone}>📞 {item.phone}</Text>
              )}
            </View>
            <View style={styles.statusContainer}>
              <View
                style={[styles.statusDot, { backgroundColor: "#4CAF50" }]}
              />
              <Text style={styles.statusText}>Siap</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada pendonor ditemukan.</Text>
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
    paddingHorizontal: 20,
    paddingTop: 10, // Kurangi padding top
    paddingBottom: 10, // Kurangi padding bottom
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: {
    fontSize: 20, // Kurangi dari 22
    fontWeight: "bold",
    color: "#333",
  },
  headerSub: {
    fontSize: 13, // Kurangi dari 14
    color: "#777",
    marginTop: 2,
  },
  filterScroll: {
    maxHeight: 50,
    marginVertical: 10, // Kurangi margin
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14, // Kurangi dari 16
    paddingVertical: 6, // Kurangi dari 8
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  filterChipActive: {
    backgroundColor: "#D32F2F",
  },
  filterChipText: {
    fontSize: 13, // Kurangi dari 14
    color: "#666",
  },
  filterChipTextActive: {
    color: "#FFF",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 0, // Hilangkan padding top
    paddingBottom: 8, // Padding bottom minimal
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12, // Kurangi dari 16
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10, // Kurangi dari 12
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 45, // Kurangi dari 50
    height: 45, // Kurangi dari 50
    borderRadius: 22.5,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EF5350",
  },
  avatarText: {
    fontSize: 15, // Kurangi dari 16
    fontWeight: "bold",
    color: "#D32F2F",
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12, // Kurangi dari 16
  },
  userName: {
    fontSize: 15, // Kurangi dari 16
    fontWeight: "600",
    color: "#222",
  },
  userDistance: {
    fontSize: 12, // Kurangi dari 13
    color: "#666",
    marginTop: 2,
  },
  userPhone: {
    fontSize: 11, // Kurangi dari 12
    color: "#888",
    marginTop: 2,
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  statusDot: {
    width: 8, // Kurangi dari 10
    height: 8, // Kurangi dari 10
    borderRadius: 4,
    marginBottom: 3,
  },
  statusText: {
    fontSize: 11, // Kurangi dari 12
    color: "#888",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
  },
});
