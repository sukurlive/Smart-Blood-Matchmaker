import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { EmergencyAlert, useBloodAgent } from "../../hooks/use-blood-agent";

export default function HomeScreen() {
  const { profile, loading: authLoading } = useAuth();
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(
    null,
  );
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState("");

  const {
    currentLocation,
    emergencyAlerts,
    isAgentActive,
    acceptBloodRequest,
    declineBloodRequest,
    isLoading,
  } = useBloodAgent({
    id: profile?.id || "",
    name: profile?.name || "",
    blood_type: profile?.blood_type || "",
    is_available: profile?.is_available || false,
  });

  if (authLoading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  const handleAccept = (alert: EmergencyAlert) => {
    setSelectedAlert(alert);
    setNotes("");
    setShowNotesModal(true);
  };

  const handleConfirmAccept = async () => {
    if (selectedAlert) {
      await acceptBloodRequest(selectedAlert, notes);
      setShowNotesModal(false);
      setSelectedAlert(null);
      setNotes("");
    }
  };

  const handleDecline = async (alert: EmergencyAlert) => {
    Alert.alert("Konfirmasi", "Apakah Anda yakin tidak bisa membantu?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya, Saya Tidak Bisa",
        style: "destructive",
        onPress: async () => await declineBloodRequest(alert),
      },
    ]);
  };

  const getUrgencyColor = (level?: string) => {
    switch (level) {
      case "Critical":
        return "#D32F2F";
      case "High":
        return "#FF9800";
      default:
        return "#4CAF50";
    }
  };

  const getUrgencyText = (level?: string) => {
    switch (level) {
      case "Critical":
        return "KRITIS";
      case "High":
        return "TINGGI";
      default:
        return "NORMAL";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* edges={['left', 'right']} menghilangkan padding top & bottom */}
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.welcomeText}>Halo, Pahlawan!</Text>
          <Text style={styles.userName}>{profile.name}</Text>
        </View>
        <View style={styles.bloodBadge}>
          <Text style={styles.bloodType}>{profile.blood_type}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ flex: 1 }}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: isAgentActive ? "#4CAF50" : "#FF5252" },
              ]}
            />
            <Text style={styles.statusText}>
              {isAgentActive ? "Agen Aktif Memantau" : "Menghubungkan GPS..."}
            </Text>
          </View>
          {currentLocation && (
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.locationText}>
                {currentLocation.latitude.toFixed(5)},{" "}
                {currentLocation.longitude.toFixed(5)}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          Permintaan Darah Terdekat ({emergencyAlerts.length})
        </Text>

        {emergencyAlerts.length > 0 ? (
          emergencyAlerts.map((alert, index) => (
            <View key={alert.requestId || index} style={styles.alertCard}>
              {/* konten card tetap sama */}
              <View style={styles.alertHeader}>
                <MaterialCommunityIcons
                  name="alert-decagram"
                  size={24}
                  color={getUrgencyColor(alert.urgencyLevel)}
                />
                <View style={styles.headerTextContainer}>
                  <Text
                    style={[
                      styles.urgentTag,
                      { color: getUrgencyColor(alert.urgencyLevel) },
                    ]}
                  >
                    {getUrgencyText(alert.urgencyLevel)}
                  </Text>
                  <Text style={styles.requestId}>
                    ID: {alert.requestId.slice(-8)}
                  </Text>
                </View>
              </View>
              <View style={styles.mainInfo}>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Dibutuhkan</Text>
                  <Text style={styles.infoValue}>
                    {alert.bagsNeeded}{" "}
                    <Text style={styles.infoUnit}>Kantong</Text>
                  </Text>
                </View>
                <View style={[styles.infoBlock, styles.borderLeft]}>
                  <Text style={styles.infoLabel}>Gol. Darah</Text>
                  <Text style={[styles.infoValue, { color: "#D32F2F" }]}>
                    {alert.bloodType}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.hospitalInfo}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="hospital-building"
                    size={20}
                    color="#D32F2F"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hospitalName}>{alert.hospitalName}</Text>
                  <Text style={styles.distanceText}>
                    📍 {alert.distance} km dari lokasi Anda
                  </Text>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => handleDecline(alert)}
                  disabled={isLoading}
                >
                  <Text style={styles.declineText}>Tidak Bisa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAccept(alert)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.acceptText}>SAYA BISA</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="shield-check"
              size={80}
              color="#E0E0E0"
            />
            <Text style={styles.emptyTitle}>Semua Aman</Text>
            <Text style={styles.emptySubtitle}>
              Belum ada permintaan darah yang mendesak di sekitar Anda.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal tetap sama */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showNotesModal}
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Konfirmasi Kehadiran</Text>
            <Text style={styles.modalSubtitle}>
              Apakah Anda bersedia menuju {selectedAlert?.hospitalName}?
            </Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Catatan (opsional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowNotesModal(false)}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirmAccept}
              >
                <Text style={styles.modalConfirmText}>
                  YA, SAYA MENUJU SANA
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    paddingHorizontal: 20, // Hanya padding horizontal
    paddingTop: 0, // Hilangkan padding top
    paddingBottom: 0, // Hilangkan padding bottom
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15, // Kurangi dari 25 ke 15
    marginTop: 10, // Tambahkan margin top kecil
    paddingHorizontal: 20, // Padding horizontal
  },
  welcomeText: {
    fontSize: 14, // Kurangi dari 16
    color: "#666",
  },
  userName: {
    fontSize: 20, // Kurangi dari 22
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  bloodBadge: {
    width: 45, // Kurangi dari 50
    height: 45, // Kurangi dari 50
    borderRadius: 22.5,
    backgroundColor: "#D32F2F",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  bloodType: {
    color: "#FFF",
    fontSize: 16, // Kurangi dari 18
    fontWeight: "bold",
  },
  statusCard: {
    backgroundColor: "#FFF",
    padding: 12, // Kurangi dari 15
    borderRadius: 16,
    elevation: 2,
    marginBottom: 20, // Kurangi dari 25
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6, // Kurangi dari 8
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 12,
    color: "#888",
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 12, // Kurangi dari 15
  },
  alertCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16, // Kurangi dari 20
    marginBottom: 16, // Kurangi dari 20
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16, // Kurangi dari 20
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  urgentTag: {
    fontWeight: "800",
    fontSize: 14,
  },
  requestId: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  mainInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16, // Kurangi dari 20
  },
  infoBlock: {
    flex: 1,
    alignItems: "center",
  },
  borderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: "#EEE",
  },
  infoLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 22, // Kurangi dari 24
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  infoUnit: {
    fontSize: 12, // Kurangi dari 14
    fontWeight: "normal",
    color: "#666",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginBottom: 16, // Kurangi dari 20
  },
  hospitalInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20, // Kurangi dari 25
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  distanceText: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 10, // Kurangi dari 12
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  declineText: {
    color: "#666",
    fontWeight: "600",
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 10, // Kurangi dari 12
    borderRadius: 12,
    backgroundColor: "#D32F2F",
    alignItems: "center",
  },
  acceptText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14, // Kurangi dari 15
  },
  emptyState: {
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#BBB",
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#CCC",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    width: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    textAlign: "center",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  modalCancelText: {
    color: "#666",
    fontWeight: "600",
  },
  modalConfirmButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#D32F2F",
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
});
