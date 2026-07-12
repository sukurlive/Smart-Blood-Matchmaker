  import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
  import React, { useState, useRef } from "react";
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
    Dimensions,
  } from "react-native";
  import { SafeAreaView } from "react-native-safe-area-context";
  import MapView, { Marker, Region, Circle } from "react-native-maps";
  import { useAuth } from "../../contexts/AuthContext";
  import { EmergencyAlert, useBloodAgent } from "../../hooks/use-blood-agent";
  import { supabase } from "../../supabase";

  const { height: SCREEN_HEIGHT } = Dimensions.get("window");

  export default function HomeScreen() {
    const { profile, loading: authLoading } = useAuth();
    const mapRef = useRef<MapView>(null);
    
    // State untuk konfirmasi kehadiran (Notes)
    const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
    const [notes, setNotes] = useState("");

    // State untuk Bottom Sheet RS
    const [selectedHospitalName, setSelectedHospitalName] = useState<string | null>(null);
    const [filteredAlerts, setFilteredAlerts] = useState<EmergencyAlert[]>([]);
  const getUrgencyText = (level?: string) => {
      switch (level?.toLowerCase()) {
        case "critical": 
          return "KRITIS";
        case "high": 
          return "TINGGI";
        case "normal": 
        default: 
          return "NORMAL";
      }
    };
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

    // --- FUNGSI AKSI DONOR ---
    const handleAccept = (alert: EmergencyAlert) => {
      setSelectedAlert(alert);
      setNotes("");
    };

  const handleConfirmAccept = async () => {
    if (selectedAlert && profile?.id) {
      // 1. Catat respons donor ke database (via custom hook)
      await acceptBloodRequest(selectedAlert, notes);

      try {
        // 2. Tambahkan poin otomatis
        const { error: pointsError } = await supabase.from("humanity_points").insert({
          user_id: profile.id,
          points: 50,
          reason: `Bersedia membantu permintaan darah di ${selectedAlert.hospitalName}`,
        });
        
        if (pointsError) throw pointsError;

        // 3. LOGIC BARU: Kurangi bags_needed di tabel blood_requests
        // Pastikan tidak minus jika ternyata nilainya sudah 0
        const newBagsNeeded = selectedAlert.bagsNeeded > 0 ? selectedAlert.bagsNeeded - 1 : 0;
        
        const { error: updateError } = await supabase
          .from("blood_requests")
          .update({ bags_needed: newBagsNeeded })
          .eq("id", selectedAlert.requestId);

        if (updateError) {
          console.error("Gagal mengupdate kantong darah:", updateError.message);
        }

      } catch (err: any) {
        console.error("Terjadi kesalahan:", err.message);
      }
      
      // 4. Update UI (Hapus card dari list)
      const updatedList = filteredAlerts.filter(item => item.requestId !== selectedAlert.requestId);
      if (updatedList.length === 0) {
        setSelectedHospitalName(null);
      } else {
        setFilteredAlerts(updatedList);
      }

      setSelectedAlert(null);
      setNotes("");
    }
  };
    const handleDecline = async (alert: EmergencyAlert) => {
      Alert.alert("Konfirmasi", "Apakah Anda yakin tidak bisa membantu?", [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Tidak Bisa",
          style: "destructive",
          onPress: async () => {
            await declineBloodRequest(alert);
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

    // --- FUNGSI PETA ---
    const handleMarkerPress = (hospitalName: string) => {
      const alertsForHospital = emergencyAlerts.filter(
        (alert) => alert.hospitalName === hospitalName
      );
      setSelectedHospitalName(hospitalName);
      setFilteredAlerts(alertsForHospital);
      setSelectedAlert(null);
    };

    const handleRecenter = () => {
      if (mapRef.current && currentLocation) {
        mapRef.current.animateToRegion({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 500);
      }
    };

    const getUrgencyColor = (level?: string) => {
      switch (level) {
        case "Critical": return "#D32F2F";
        case "High": return "#FF9800";
        default: return "#4CAF50";
      }
    };

    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

        {/* PETA FULL SCREEN (Layer Paling Bawah) */}
        {currentLocation ? (
          
    <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.06,
              longitudeDelta: 0.06,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {/* Tambahkan komponen Circle di sini untuk memvisualisasikan radius 5km */}
            {currentLocation && (
              <Circle
                center={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                radius={5000} // 5000 meter = 5 km
                strokeWidth={2}
                strokeColor="rgba(211, 47, 47, 0.4)" // Warna garis tepi merah transparan
                fillColor="rgba(211, 47, 47, 0.08)"  // Area dalam dengan warna sangat lembut
              />
            )}

            {/* Marker Rumah Sakit */}
            {Array.from(new Set(emergencyAlerts.map(a => a.hospitalName))).map((hospName) => {
              const sampleAlert = emergencyAlerts.find(a => a.hospitalName === hospName);
              if (!sampleAlert?.latitude || !sampleAlert?.longitude) return null;
              const count = emergencyAlerts.filter(a => a.hospitalName === hospName).length;

              return (
                <Marker
                  key={`marker-${hospName}`}
                  coordinate={{ latitude: sampleAlert.latitude, longitude: sampleAlert.longitude }}
                  onPress={() => handleMarkerPress(hospName)}
                >
                  <View style={styles.customMarker}>
                    <MaterialCommunityIcons name="hospital-marker" size={42} color="#D32F2F" />
                    <View style={styles.markerBadge}>
                      <Text style={styles.markerBadgeText}>{count}</Text>
                    </View>
                  </View>
                </Marker>
              );
            })}
          </MapView>
        ) : (
          <View style={styles.loadingMap}>
            <ActivityIndicator size="large" color="#D32F2F" />
            <Text style={styles.loadingText}>Mencari Lokasi Anda...</Text>
          </View>
        )}

        {/* FLOATING HEADER AREA */}
        <SafeAreaView style={styles.floatingUIContainer} pointerEvents="box-none">
          
          {/* Header Profil */}
          <View style={styles.headerCard}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.welcomeText}>Halo, Pahlawan!</Text>
              <Text style={styles.userName}>{profile.name}</Text>
            </View>
            <View style={styles.bloodBadge}>
              <Text style={styles.bloodType}>{profile.blood_type}</Text>
            </View>
          </View>

          {/* Status GPS Pill */}
          <View style={styles.statusPill}>
            <View style={[styles.dot, { backgroundColor: isAgentActive ? "#4CAF50" : "#FF5252" }]} />
            <Text style={styles.statusText}>
              {isAgentActive ? "Radar Memantau" : "GPS Terputus"}
            </Text>
          </View>

        </SafeAreaView>

        {/* FLOATING BUTTONS (Bottom Right) */}
        <View style={styles.floatingControls} pointerEvents="box-none">
          <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter}>
            <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* BOTTOM INFO BAR (Jika tidak ada RS yang diklik) */}
        {!selectedHospitalName && emergencyAlerts.length > 0 && (
          <View style={styles.bottomInfoBar}>
            <MaterialCommunityIcons name="radar" size={24} color="#D32F2F" />
            <Text style={styles.bottomInfoText}>
              <Text style={{ fontWeight: "bold" }}>{emergencyAlerts.length} permintaan darah</Text> di sekitar Anda
            </Text>
          </View>
        )}

        {/* MODAL BOTTOM SHEET (Form List & Notes) */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!selectedHospitalName}
          onRequestClose={() => {
            setSelectedHospitalName(null);
            setSelectedAlert(null);
          }}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => {
              setSelectedHospitalName(null);
              setSelectedAlert(null);
            }}
          >
            {/* Prevent touches inside the sheet from closing the modal */}
            <TouchableOpacity activeOpacity={1} style={styles.bottomSheetContainer}>
              
              <View style={styles.dragHandle} />

              {selectedAlert ? (
                // FORM KONFIRMASI (NOTES)
                <View style={styles.sheetContent}>
                  <Text style={styles.sheetTitle}>Konfirmasi Kehadiran</Text>
                  <Text style={styles.sheetSubtitle}>
                    Menuju <Text style={{fontWeight: "bold", color: "#333"}}>{selectedAlert.hospitalName}</Text>
                  </Text>
                  
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Tambahkan catatan (opsional, cth: Saya OTW 10 menit lagi)"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                  />
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.modalCancelButton} onPress={() => setSelectedAlert(null)}>
                      <Text style={styles.modalCancelText}>Kembali</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalConfirmButton} onPress={handleConfirmAccept} disabled={isLoading}>
                      {isLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalConfirmText}>BERANGKAT SEKARANG</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // LIST REQUEST DARURAT
                <View style={[styles.sheetContent, { paddingBottom: 0 }]}>
                  <Text style={styles.sheetTitle}>{selectedHospitalName}</Text>
                  <Text style={styles.sheetSubtitle}>{filteredAlerts.length} permintaan aktif di lokasi ini</Text>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30, paddingTop: 10 }}>
                    {filteredAlerts.map((alert, index) => (
                      <View key={alert.requestId || index} style={styles.alertCard}>
                        
                        <View style={styles.alertHeaderCard}>
                          <MaterialCommunityIcons name="alert-decagram" size={24} color={getUrgencyColor(alert.urgencyLevel)} />
                          <View style={styles.headerTextContainer}>
                          <Text style={[styles.urgentTag, { color: getUrgencyColor(alert.urgencyLevel) }]}>
      {getUrgencyText(alert.urgencyLevel)}
    </Text>
                            <Text style={styles.requestId}>Req ID: {alert.requestId.slice(-8).toUpperCase()}</Text>
                          </View>
                          <View style={styles.distanceBadge}>
                            <Text style={styles.distanceText}>{alert.distance} km</Text>
                          </View>
                        </View>
                        
                        <View style={styles.mainInfo}>
                          <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Dibutuhkan</Text>
                            <Text style={styles.infoValue}>{alert.bagsNeeded} <Text style={styles.infoUnit}>Kantong</Text></Text>
                          </View>
                          <View style={styles.divider} />
                          <View style={styles.infoBlock}>
                            <Text style={styles.infoLabel}>Gol. Darah</Text>
                            <Text style={[styles.infoValue, { color: "#D32F2F" }]}>{alert.bloodType}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.actionButtons}>
                          <TouchableOpacity style={styles.declineButton} onPress={() => handleDecline(alert)} disabled={isLoading}>
                            <Text style={styles.declineText}>Abaikan</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.acceptButton} onPress={() => handleAccept(alert)} disabled={isLoading}>
                            <MaterialCommunityIcons name="hand-heart" size={18} color="#FFF" />
                            <Text style={styles.acceptText}>SAYA BANTU</Text>
                          </TouchableOpacity>
                        </View>

                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8F9FA" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    
    // --- PETA STYLES ---
    map: { ...StyleSheet.absoluteFillObject },
    loadingMap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
    loadingText: { marginTop: 12, color: '#666', fontWeight: "500" },
    
    customMarker: { alignItems: 'center', justifyContent: 'center' },
    markerBadge: {
      position: 'absolute', top: -6, right: -6, backgroundColor: '#1A1A1A',
      borderRadius: 12, minWidth: 20, height: 20, paddingHorizontal: 4,
      justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF',
    },
    markerBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    // --- FLOATING UI (ATAS) ---
    floatingUIContainer: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      paddingHorizontal: 20,
      paddingTop: 10,
      zIndex: 10,
    },
    headerCard: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      padding: 16, borderRadius: 20,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
    },
    welcomeText: { fontSize: 13, color: "#666", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
    userName: { fontSize: 20, fontWeight: "bold", color: "#1A1A1A", marginTop: 2 },
    bloodBadge: {
      width: 46, height: 46, borderRadius: 23, backgroundColor: "#D32F2F",
      justifyContent: "center", alignItems: "center",
      shadowColor: "#D32F2F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
    },
    bloodType: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
    
    statusPill: {
      flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 12,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { fontSize: 13, fontWeight: "bold", color: "#444" },

    // --- FLOATING CONTROLS (BAWAH) ---
    floatingControls: {
      position: 'absolute', bottom: 90, right: 20, zIndex: 10,
    },
    recenterButton: {
      backgroundColor: "#FFF", width: 50, height: 50, borderRadius: 25,
      justifyContent: "center", alignItems: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    },
    
    bottomInfoBar: {
      position: 'absolute', bottom: 30, alignSelf: "center",
      flexDirection: "row", alignItems: "center",
      backgroundColor: "#FFF", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
      gap: 8,
    },
    bottomInfoText: { fontSize: 14, color: "#333" },

    // --- BOTTOM SHEET MODAL ---
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    bottomSheetContainer: {
      backgroundColor: "#F8F9FA",
      borderTopLeftRadius: 30, borderTopRightRadius: 30,
      width: "100%", maxHeight: SCREEN_HEIGHT * 0.85,
      shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20,
    },
    dragHandle: {
      width: 40, height: 5, borderRadius: 3, backgroundColor: "#DDD",
      alignSelf: "center", marginTop: 12, marginBottom: 8,
    },
    sheetContent: { paddingHorizontal: 24, paddingBottom: 30 },
    sheetTitle: { fontSize: 22, fontWeight: "bold", color: "#1A1A1A", marginBottom: 4 },
    sheetSubtitle: { fontSize: 14, color: "#666", marginBottom: 16 },

    // --- KARTU REQUEST ---
    alertCard: { 
      backgroundColor: "#FFF", borderRadius: 20, padding: 18, marginBottom: 16, 
      borderWidth: 1, borderColor: "#F0F0F0",
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 
    },
    alertHeaderCard: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
    headerTextContainer: { flex: 1, marginLeft: 10 },
    urgentTag: { fontWeight: "900", fontSize: 12, letterSpacing: 0.5 },
    requestId: { fontSize: 11, color: "#999", marginTop: 2 },
    distanceBadge: { backgroundColor: "#F5F5F5", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    distanceText: { fontSize: 12, fontWeight: 'bold', color: '#444' },
    
    mainInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#Fcfcfc", borderRadius: 16, padding: 16, marginBottom: 20 },
    infoBlock: { flex: 1, alignItems: "center" },
    divider: { width: 1, height: 40, backgroundColor: "#EAEAEA" },
    infoLabel: { fontSize: 12, color: "#888", marginBottom: 4 },
    infoValue: { fontSize: 24, fontWeight: "900", color: "#1A1A1A" },
    infoUnit: { fontSize: 12, fontWeight: "600", color: "#888" },
    
    actionButtons: { flexDirection: "row", gap: 12 },
    declineButton: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#F5F5F5", alignItems: "center" },
    declineText: { color: "#666", fontWeight: "bold", fontSize: 14 },
    acceptButton: { flex: 2, flexDirection: "row", justifyContent: "center", paddingVertical: 14, borderRadius: 14, backgroundColor: "#D32F2F", alignItems: "center", gap: 8 },
    acceptText: { color: "#FFF", fontWeight: "bold", fontSize: 14, letterSpacing: 0.5 },

    // --- FORM CATATAN ---
    notesInput: { 
      backgroundColor: "#FFF", borderWidth: 1, borderColor: "#EAEAEA", borderRadius: 16, 
      padding: 16, minHeight: 100, textAlignVertical: "top", fontSize: 15, color: "#333", marginBottom: 24 
    },
    modalButtons: { flexDirection: "row", gap: 12 },
    modalCancelButton: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: "#F5F5F5", alignItems: "center" },
    modalCancelText: { color: "#444", fontWeight: "bold", fontSize: 14 },
    modalConfirmButton: { flex: 2, paddingVertical: 16, borderRadius: 16, backgroundColor: "#D32F2F", alignItems: "center" },
    modalConfirmText: { color: "#FFF", fontWeight: "bold", fontSize: 14, letterSpacing: 0.5 },
  });