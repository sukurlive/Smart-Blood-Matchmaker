import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
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
import MapView, { Marker, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabase";

interface BloodRequest {
  id: string;
  hospital_id: string;
  required_blood: string;
  bags_needed: number;
  urgency_level: string;
  status: string;
  created_at: string;
  hospital_name: string;
}

interface Hospital {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

// Region Default untuk Admin (Bisa disesuaikan titik kota Anda)
const DEFAULT_REGION: Region = {
  latitude: -6.4025, 
  longitude: 106.7942,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function AdminRequestsScreen() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  // --- STATE UNTUK PETA & ZOOM ---
  const mapRef = useRef<MapView>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(DEFAULT_REGION);

  // State untuk Modal Peta ala Donor
  const [selectedHospitalName, setSelectedHospitalName] = useState<string | null>(null);
  const [filteredRequests, setFilteredRequests] = useState<BloodRequest[]>([]);

  // State untuk form Tambah Request
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    hospital_id: "",
    required_blood: "A+",
    bags_needed: "1",
    urgency_level: "High",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await fetchRequests();
    await fetchHospitals();
    setLoading(false);
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("blood_requests")
        .select(`*, hospitals (name)`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = data.map((item: any) => ({
        ...item,
        hospital_name: item.hospitals?.name || "RS Tidak Diketahui",
      }));
      setRequests(formatted);
    } catch (error) {
      console.error(error);
    }
  };

 const fetchHospitals = async () => {
    try {
      const { data, error } = await supabase
        .from("hospitals")
        .select("id, name, latitude, longitude") 
        .order("name");
        
      if (error) throw error;
      
      if (data) {
        setHospitals(data);
      }
    } catch (error) {
      console.error("Gagal memuat rumah sakit", error);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    Alert.alert("Konfirmasi", "Apakah Anda yakin ingin menonaktifkan request ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Non-aktifkan",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("blood_requests")
            .update({ status: newStatus })
            .eq("id", id);
          if (error) Alert.alert("Error", error.message);
          else {
            await fetchRequests();
            setFilteredRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req));
          }
        },
      },
    ]);
  };

  const handleAddRequest = async () => {
    if (!form.hospital_id) {
      Alert.alert("Peringatan", "Silakan pilih Rumah Sakit terlebih dahulu.");
      return;
    }
    if (!form.bags_needed || parseInt(form.bags_needed) < 1) {
      Alert.alert("Peringatan", "Jumlah kantong minimal 1.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("blood_requests").insert({
        hospital_id: form.hospital_id,
        required_blood: form.required_blood,
        bags_needed: parseInt(form.bags_needed),
        urgency_level: form.urgency_level,
        status: "Active",
      });

      if (error) throw error;

      Alert.alert("Sukses", "Request darah berhasil ditambahkan");
      setShowAddModal(false);
      setForm({ ...form, bags_needed: "1" });
      await fetchRequests();
    } catch (error: any) {
      Alert.alert("Gagal menambahkan request", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkerPress = (hospital: Hospital) => {
    const activeReqsForHospital = requests.filter(
      (req) => req.hospital_id === hospital.id
    );
    setSelectedHospitalName(hospital.name);
    setFilteredRequests(activeReqsForHospital);
  };

  // --- FUNGSI ZOOM IN / OUT ---
  const handleZoomIn = () => {
    if (mapRef.current) {
      const newRegion = {
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta / 2,
        longitudeDelta: currentRegion.longitudeDelta / 2,
      };
      mapRef.current.animateToRegion(newRegion, 300); // 300ms animasi
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const newRegion = {
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta * 2,
        longitudeDelta: currentRegion.longitudeDelta * 2,
      };
      mapRef.current.animateToRegion(newRegion, 300);
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "#4CAF50";
      case "Completed": return "#2196F3";
      case "InActive": return "#999"; 
      case "Cancelled": return "#999"; 
      default: return "#666";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  const mapHospitals = hospitals.filter(h => h.latitude && h.longitude);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* HEADER ALA ADMIN TAPI GAYA PENDONOR */}
      <View style={styles.headerContainer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>Admin BloodHero</Text>
          <Text style={styles.userName}>Peta Request Darah</Text>
        </View>
        <TouchableOpacity style={styles.headerAddButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={24} color="#FFF" />
          <Text style={styles.headerAddButtonText}>Buat Request</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {/* PETA FULL SCREEN */}
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            showsUserLocation={true}
            onRegionChangeComplete={(region) => setCurrentRegion(region)} // Update posisi terakhir
          >
            {mapHospitals.map((hospital) => {
              const activeRequestsCount = requests.filter(
                (r) => r.hospital_id === hospital.id && r.status === "Active"
              ).length;

              return (
                <Marker
                  key={`marker-${hospital.id}`}
                  coordinate={{
                    latitude: hospital.latitude!,
                    longitude: hospital.longitude!,
                  }}
                  onPress={() => handleMarkerPress(hospital)}
                >
                  <View style={styles.customMarker}>
                    <MaterialCommunityIcons 
                      name="hospital-marker" 
                      size={38} 
                      color={activeRequestsCount > 0 ? "#D32F2F" : "#1976D2"} 
                    />
                    {activeRequestsCount > 0 && (
                      <View style={styles.markerBadge}>
                        <Text style={styles.markerBadgeText}>{activeRequestsCount}</Text>
                      </View>
                    )}
                  </View>
                </Marker>
              );
            })}
          </MapView>
          
          <View style={styles.totalAlertBadge}>
            <Text style={styles.totalAlertText}>
              {requests.filter(r => r.status === "Active").length} Request Aktif Terdeteksi
            </Text>
          </View>

          {/* KONTROL ZOOM IN / OUT */}
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
              <Ionicons name="add" size={24} color="#444" />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}>
              <Ionicons name="remove" size={24} color="#444" />
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* SINGLE MODAL LIST EMERGENCY (MIRIP HOME PENDONOR) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedHospitalName}
        onRequestClose={() => {
          setSelectedHospitalName(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <View style={{ flexShrink: 1 }}>
              
              {/* Header Dialog List */}
              <View style={styles.dialogHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dialogHospitalName}>{selectedHospitalName}</Text>
                  <Text style={styles.dialogSubTitle}>
                    Ada {filteredRequests.length} riwayat permintaan di RS ini
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.closeDialogButton} 
                  onPress={() => setSelectedHospitalName(null)}
                >
                  <Ionicons name="close-circle" size={28} color="#999" />
                </TouchableOpacity>
              </View>

              {/* List Request */}
              <ScrollView 
                style={styles.dialogScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.dialogScrollContent}
              >
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req, index) => (
                    <View key={req.id || index} style={styles.alertCard}>
                      <View style={styles.alertHeaderCard}>
                        <MaterialCommunityIcons
                          name="alert-decagram"
                          size={22}
                          color={getUrgencyColor(req.urgency_level)}
                        />
                        <View style={styles.headerTextContainer}>
                          <Text style={[styles.urgentTag, { color: getUrgencyColor(req.urgency_level) }]}>
                            {getUrgencyText(req.urgency_level)}
                          </Text>
                          <Text style={styles.requestId}>ID: {req.id.slice(-8)}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) }]}>
                           <Text style={styles.statusText}>{req.status}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.mainInfo}>
                        <View style={styles.infoBlock}>
                          <Text style={styles.infoLabel}>Dibutuhkan</Text>
                          <Text style={styles.infoValue}>
                            {req.bags_needed} <Text style={styles.infoUnit}>Kantong</Text>
                          </Text>
                        </View>
                        <View style={[styles.infoBlock, styles.borderLeft]}>
                          <Text style={styles.infoLabel}>Gol. Darah</Text>
                          <Text style={[styles.infoValue, { color: "#D32F2F" }]}>{req.required_blood}</Text>
                        </View>
                      </View>
                      
                      {req.status === "Active" && (
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={styles.declineButton}
                            onPress={() => updateStatus(req.id, "InActive")}
                          >
                            <Ionicons name="power" size={16} color="#666" />
                            <Text style={styles.declineText}>Non-aktifkan Request</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCardContainer}>
                     <Text style={styles.emptyText}>Tidak ada request di lokasi ini.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL TAMBAH REQUEST BARU */}
      <Modal visible={showAddModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.addModalContent}>
            <Text style={styles.modalTitle}>Buat Request Baru</Text>

            <Text style={styles.modalLabel}>Pilih Rumah Sakit</Text>
            <TouchableOpacity
              style={[
                styles.dropdownToggle,
                showHospitalDropdown && styles.dropdownToggleActive,
                !form.hospital_id && { borderColor: '#DDD' }
              ]}
              onPress={() => setShowHospitalDropdown((prev) => !prev)}
            >
              <Text style={[
                styles.dropdownToggleText,
                !form.hospital_id && { color: '#999' }
              ]}>
                {form.hospital_id
                  ? hospitals.find((hospital) => hospital.id === form.hospital_id)?.name || 'Pilih Rumah Sakit'
                  : 'Pilih Rumah Sakit'}
              </Text>
              <Ionicons
                name={showHospitalDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#444"
              />
            </TouchableOpacity>
            {showHospitalDropdown && (
              <View style={styles.hospitalDropdownList}>
                {hospitals.length > 0 ? (
                  hospitals.map((hospital) => (
                    <TouchableOpacity
                      key={hospital.id}
                      style={[
                        styles.hospitalOption,
                        form.hospital_id === hospital.id && styles.hospitalOptionActive
                      ]}
                      onPress={() => {
                        setForm({ ...form, hospital_id: hospital.id });
                        setShowHospitalDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.hospitalOptionText,
                        form.hospital_id === hospital.id && styles.hospitalOptionTextActive
                      ]}>
                        {hospital.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.modalHelperText}>Data RS Kosong</Text>
                )}
              </View>
            )}

            <Text style={styles.modalLabel}>Golongan Darah</Text>
            <View style={styles.optionsRow}>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionChip, form.required_blood === type && styles.optionChipActive]}
                  onPress={() => setForm({ ...form, required_blood: type })}
                >
                  <Text style={[styles.optionChipText, form.required_blood === type && styles.optionChipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Tingkat Urgensi</Text>
            <View style={styles.optionsRow}>
              {["Normal", "High", "Critical"].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.optionChip, form.urgency_level === level && styles.optionChipActive]}
                  onPress={() => setForm({ ...form, urgency_level: level })}
                >
                  <Text style={[styles.optionChipText, form.urgency_level === level && styles.optionChipTextActive]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Jumlah Kantong</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={form.bags_needed}
              onChangeText={(text) => setForm({ ...form, bags_needed: text.replace(/[^0-9]/g, '') })}
              maxLength={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButtonAdd}
                onPress={() => setShowAddModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelTextAdd}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, submitting && { opacity: 0.7 }]}
                onPress={handleAddRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Simpan Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  headerContainer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 10, 
    marginTop: 10, 
    paddingHorizontal: 20 
  },
  welcomeText: { fontSize: 14, color: "#666" },
  userName: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A" },
  
  headerAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D32F2F",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    elevation: 3,
  },
  headerAddButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
  
  mainContent: { flex: 1, paddingHorizontal: 20, paddingBottom: 15 },
  
  mapWrapper: { 
    flex: 1, 
    borderRadius: 20, 
    overflow: 'hidden', 
    elevation: 4, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 8 
  },
  map: { ...StyleSheet.absoluteFillObject },
  customMarker: { alignItems: 'center', justifyContent: 'center' },
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
    borderColor: '#FFF' 
  },
  markerBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  totalAlertBadge: { 
    position: 'absolute', 
    top: 15, 
    alignSelf: 'center', 
    backgroundColor: 'rgba(211, 47, 47, 0.95)', 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    elevation: 3 
  },
  totalAlertText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  // --- KONTROL ZOOM STYLES ---
  zoomControls: {
    position: 'absolute',
    right: 15,
    bottom: 25,
    backgroundColor: '#FFF',
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  zoomBtn: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    width: '100%',
  },
  
  // Dialog (Modal) Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-start", alignItems: "center", paddingTop: 60 },
  dialogContainer: { backgroundColor: "#F8F9FA", borderRadius: 24, padding: 20, width: "92%", maxHeight: "78%", elevation: 10, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', paddingBottom: 14, marginBottom: 16 },
  dialogHospitalName: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 2 },
  dialogSubTitle: { fontSize: 13, color: '#666', marginTop: 0 },
  closeDialogButton: { padding: 6 },
  dialogScrollView: { flex: 1 },
  dialogScrollContent: { paddingBottom: 16 },
  
  alertCard: { backgroundColor: "#FFF", borderRadius: 18, padding: 16, marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  alertHeaderCard: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  headerTextContainer: { flex: 1, marginLeft: 10 },
  urgentTag: { fontWeight: "800", fontSize: 13 },
  requestId: { fontSize: 10, color: "#999" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "bold", color: "#FFF" },
  
  mainInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  infoBlock: { flex: 1, alignItems: "center" },
  borderLeft: { borderLeftWidth: 1, borderLeftColor: "#EEE" },
  infoLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  infoValue: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A" },
  infoUnit: { fontSize: 11, fontWeight: "normal", color: "#666" },
  
  actionButtons: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  declineButton: { flex: 1, flexDirection: "row", justifyContent: "center", paddingVertical: 12, borderRadius: 12, backgroundColor: "#F5F5F5", alignItems: "center", gap: 6 },
  declineText: { color: "#666", fontWeight: "600", fontSize: 13 },

  emptyCardContainer: { padding: 24, alignItems: "center", backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  emptyText: { color: "#666", fontStyle: "italic", textAlign: 'center' },

  // Styles Khusus Modal Tambah Request
  addModalContent: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, width: "100%", elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 10, textAlign: "center" },
  modalLabel: { fontSize: 14, fontWeight: "600", marginBottom: 10, marginTop: 18, color: "#444" },
  modalInput: { borderWidth: 1, borderColor: "#DDD", borderRadius: 10, padding: 12, fontSize: 14, color: "#333", backgroundColor: "#FFF", marginTop: 4 },
  modalHelperText: { color: "#999", fontSize: 13, fontStyle: "italic" },
  
  hospitalListContainer: { maxHeight: 140, borderWidth: 1, borderColor: "#EEE", borderRadius: 10, backgroundColor: "#FAFAFA", padding: 6, marginBottom: 18 },
  dropdownToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF' },
  dropdownToggleActive: { borderColor: '#D32F2F', backgroundColor: '#FFF' },
  dropdownToggleText: { fontSize: 14, color: '#222' },
  hospitalDropdownList: { borderWidth: 1, borderColor: '#EEE', borderRadius: 12, backgroundColor: '#FFF', marginTop: 8, maxHeight: 180, overflow: 'hidden', elevation: 2 },
  hospitalOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: '#FFF' },
  hospitalOptionActive: { backgroundColor: '#FFEbee' },
  hospitalOptionText: { color: '#444' },
  hospitalOptionTextActive: { color: '#D32F2F', fontWeight: 'bold' },

  optionsRow: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6, marginBottom: 12 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: "#F5F5F5", borderWidth: 1, borderColor: "#DDD", margin: 6 },
  optionChipActive: { backgroundColor: "#D32F2F", borderColor: "#D32F2F" },
  optionChipText: { fontSize: 13, color: "#666" },
  optionChipTextActive: { color: "#FFF", fontWeight: "bold" },

  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24 },
  modalCancelButtonAdd: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#E0E0E0", alignItems: "center" },
  modalCancelTextAdd: { color: "#444", fontWeight: "600" },
  modalSave: { flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: "#D32F2F", alignItems: "center" },
  modalSaveText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
});