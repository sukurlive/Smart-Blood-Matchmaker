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
import MapView, { Marker } from "react-native-maps";
import { useAuth } from "../../contexts/AuthContext";
import { EmergencyAlert, useBloodAgent } from "../../hooks/use-blood-agent";

export default function HomeScreen() {
  const { profile, loading: authLoading } = useAuth();
  
  // State untuk konfirmasi kehadiran (Notes)
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState("");

  // State baru untuk menampung Rumah Sakit terpilih & List Emergency di RS tersebut
  const [selectedHospitalName, setSelectedHospitalName] = useState<string | null>(null);
  const [filteredAlerts, setFilteredAlerts] = useState<EmergencyAlert[]>([]);

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

  // Fungsi ketika menekan tombol "SAYA BISA"
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
      
      // Update list di dalam modal agar item yang diterima hilang/diperbarui
      const updatedList = filteredAlerts.filter(item => item.requestId !== selectedAlert.requestId);
      if(updatedList.length === 0) {
        setSelectedHospitalName(null); // Tutup modal jika sudah habis
      } else {
        setFilteredAlerts(updatedList);
      }
    }
  };

  const handleDecline = async (alert: EmergencyAlert) => {
    Alert.alert("Konfirmasi", "Apakah Anda yakin tidak bisa membantu?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya, Saya Tidak Bisa",
        style: "destructive",
        onPress: async () => {
          await declineBloodRequest(alert);
          // Update list di dalam modal
          const updatedList = filteredAlerts.filter(item => item.requestId !== alert.requestId);
          if(updatedList.length === 0) {
            setSelectedHospitalName(null);
          } else {
            setFilteredAlerts(updatedList);
          }
        },
      },
    ]);
  };

  // Fungsi ketika Marker Peta ditekan
  const handleMarkerPress = (hospitalName: string) => {
    // Filter semua alert yang memiliki nama rumah sakit yang sama
    const alertsForHospital = emergencyAlerts.filter(
      (alert) => alert.hospitalName === hospitalName
    );
    setSelectedHospitalName(hospitalName);
    setFilteredAlerts(alertsForHospital);
  };

  const getUrgencyColor = (level?: string) => {
    switch (level) {
      case "Critical": return "#D32F2F";
      case "High": return "#FF9800";
      default: return "#4CAF50";
    }
  };

  const getUrgencyText = (level?: string) => {
    switch (level) {
      case "Critical": return "KRITIS";
      case "High": return "TINGGI";
      default: return "NORMAL";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
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

      <View style={styles.mainContent}>
        {/* Status GPS */}
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
                {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
              </Text>
            </View>
          )}
        </View>

        {/* PETA FULL SCREEN (Memenuhi sisa layar bawah) */}
        {currentLocation ? (
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
              }}
              showsUserLocation={true}
            >
              {/* Mengelompokkan Marker Berdasarkan Rumah Sakit Unik */}
              {Array.from(new Set(emergencyAlerts.map(a => a.hospitalName))).map((hospName) => {
                const sampleAlert = emergencyAlerts.find(a => a.hospitalName === hospName);
                if (!sampleAlert?.latitude || !sampleAlert?.longitude) return null;
                
                const count = emergencyAlerts.filter(a => a.hospitalName === hospName).length;

                return (
                  <Marker
                    key={`marker-${hospName}`}
                    coordinate={{
                      latitude: sampleAlert.latitude,
                      longitude: sampleAlert.longitude,
                    }}
                    onPress={() => handleMarkerPress(hospName)}
                  >
                    <View style={styles.customMarker}>
                      <MaterialCommunityIcons name="hospital-marker" size={38} color="#D32F2F" />
                      <View style={styles.markerBadge}>
                        <Text style={styles.markerBadgeText}>{count}</Text>
                      </View>
                    </View>
                  </Marker>
                );
              })}
            </MapView>
            
            {/* Info overlay jumlah total emergency */}
            <View style={styles.totalAlertBadge}>
              <Text style={styles.totalAlertText}>
                {emergencyAlerts.length} Permintaan Darurat Terdekat
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.loadingMap}>
            <ActivityIndicator size="large" color="#D32F2F" />
            <Text style={{ marginTop: 10, color: '#666' }}>Memuat Peta Posisi...</Text>
          </View>
        )}
      </View>

      {/* MODAL DIALOG: LIST EMERGENCY PER RUMAH SAKIT */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedHospitalName}
        onRequestClose={() => setSelectedHospitalName(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            {/* Header Dialog */}
            <View style={styles.dialogHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dialogHospitalName}>{selectedHospitalName}</Text>
                <Text style={styles.dialogSubTitle}>
                  Ada {filteredAlerts.length} permintaan darah di lokasi ini
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.closeDialogButton} 
                onPress={() => setSelectedHospitalName(null)}
              >
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            {/* List Emergency di Rumah Sakit Terpilih */}
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {filteredAlerts.map((alert, index) => (
                <View key={alert.requestId || index} style={styles.alertCard}>
                  <View style={styles.alertHeaderCard}>
                    <MaterialCommunityIcons
                      name="alert-decagram"
                      size={22}
                      color={getUrgencyColor(alert.urgencyLevel)}
                    />
                    <View style={styles.headerTextContainer}>
                      <Text style={[styles.urgentTag, { color: getUrgencyColor(alert.urgencyLevel) }]}>
                        {getUrgencyText(alert.urgencyLevel)}
                      </Text>
                      <Text style={styles.requestId}>ID: {alert.requestId.slice(-8)}</Text>
                    </View>
                    <Text style={styles.distanceTextBadge}>📍 {alert.distance} km</Text>
                  </View>
                  
                  <View style={styles.mainInfo}>
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoLabel}>Dibutuhkan</Text>
                      <Text style={styles.infoValue}>
                        {alert.bagsNeeded} <Text style={styles.infoUnit}>Kantong</Text>
                      </Text>
                    </View>
                    <View style={[styles.infoBlock, styles.borderLeft]}>
                      <Text style={styles.infoLabel}>Gol. Darah</Text>
                      <Text style={[styles.infoValue, { color: "#D32F2F" }]}>{alert.bloodType}</Text>
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
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL KONFIRMASI KEHADIRAN (NOTES) */}
      <Modal
        animationType="fade"
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
                <Text style={styles.modalConfirmText}>YA, SAYA MENUJU SANA</Text>
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
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 14,
    color: "#666",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  bloodBadge: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#D32F2F",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  bloodType: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  statusCard: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
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
  // Style Maps Layout
  mapWrapper: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  markerBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  totalAlertBadge: {
    position: 'absolute',
    top: 15,
    alignSelf: 'center',
    backgroundColor: 'rgba(211, 47, 47, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 3,
  },
  totalAlertText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  // Style Dialog List Emergency
  dialogContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 24,
    padding: 20,
    width: "92%",
    maxHeight: "75%", // Agar dialog tidak mentok ke layar atas-bawah jika item sangat banyak
    elevation: 10,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 12,
    marginBottom: 15,
  },
  dialogHospitalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  dialogSubTitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  closeDialogButton: {
    padding: 2,
  },
  // Style Card Di dalam Dialog List
  alertCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  alertHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  urgentTag: {
    fontWeight: "800",
    fontSize: 13,
  },
  requestId: {
    fontSize: 10,
    color: "#999",
  },
  distanceTextBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    backgroundColor: '#F0F0F0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  mainInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 14,
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
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  infoUnit: {
    fontSize: 11,
    fontWeight: "normal",
    color: "#666",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  declineText: {
    color: "#666",
    fontWeight: "600",
  },
  acceptButton: {
    flex: 1.8,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#D32F2F",
    alignItems: "center",
  },
  acceptText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  // Style Modal Notes Konfirmasi
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    width: "85%",
    elevation: 5,
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