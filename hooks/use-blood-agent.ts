import * as Location from "expo-location";
import { getDistance } from "geolib";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { supabase } from "../supabase";

export interface UserProfile {
  id: string;
  name: string;
  blood_type: string;
  is_available: boolean;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface EmergencyAlert {
  hospitalName: string;
  distance: string;
  bagsNeeded: number;
  bloodType: string;
  requestId: string;
  urgencyLevel?: string;
  latitude?: number;
  longitude?: number;
}

interface BloodAgentResult {
  currentLocation: LocationCoords | null;
  emergencyAlerts: EmergencyAlert[];
  setEmergencyAlerts: React.Dispatch<React.SetStateAction<EmergencyAlert[]>>;
  isAgentActive: boolean;
  acceptBloodRequest: (
    alert: EmergencyAlert,
    notes?: string,
  ) => Promise<boolean>;
  declineBloodRequest: (alert: EmergencyAlert) => Promise<boolean>;
  isLoading: boolean;
}

export const useBloodAgent = (userProfile: UserProfile): BloodAgentResult => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(
    null,
  );
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([]);
  const [isAgentActive, setIsAgentActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const locationRef = useRef<LocationCoords | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription;
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (location) => {
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setCurrentLocation(coords);
          locationRef.current = coords;
          setIsAgentActive(true);
        },
      );
    };
    startTracking();
    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  const acceptBloodRequest = async (
    alert: EmergencyAlert,
    notes?: string,
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("donor_responses").upsert(
        {
          request_id: alert.requestId,
          donor_id: userProfile.id,
          response_status: "accepted",
          notes: notes || null,
          responded_at: new Date().toISOString(),
        },
        { onConflict: "request_id,donor_id" },
      );
      if (error) throw error;
      setEmergencyAlerts((prev) =>
        prev.filter((a) => a.requestId !== alert.requestId),
      );
      Alert.alert(
        "✅ Berhasil!",
        `Anda telah menyetujui permintaan darah di ${alert.hospitalName}.`,
      );
      return true;
    } catch (error) {
      Alert.alert("Error", (error as any).message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const declineBloodRequest = async (
    alert: EmergencyAlert,
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from("donor_responses").upsert(
        {
          request_id: alert.requestId,
          donor_id: userProfile.id,
          response_status: "declined",
          responded_at: new Date().toISOString(),
        },
        { onConflict: "request_id,donor_id" },
      );
      if (error) throw error;
      setEmergencyAlerts((prev) =>
        prev.filter((a) => a.requestId !== alert.requestId),
      );
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBloodRequests = useCallback(async () => {
    if (!locationRef.current || !userProfile.is_available) return;
    try {
      const { data: requests, error } = await supabase.rpc(
        "get_active_blood_requests",
        { p_blood_type: userProfile.blood_type },
      );
      if (error) return;
      const { data: responded } = await supabase
        .from("donor_responses")
        .select("request_id")
        .eq("donor_id", userProfile.id)
        .in("response_status", ["accepted", "declined", "completed"]);
      const respondedIds = new Set(responded?.map((r) => r.request_id) || []);
      const currentLoc = locationRef.current;
      const alerts: EmergencyAlert[] = [];
      for (const req of requests || []) {
        if (respondedIds.has(req.request_id)) continue;
        if (!req.lat || !req.lng) continue;
        const dist =
          getDistance(currentLoc, { latitude: req.lat, longitude: req.lng }) /
          1000;
        if (dist <= 5)
          alerts.push({
            hospitalName: req.hospital_name,
            distance: dist.toFixed(1),
            bagsNeeded: req.bags,
            bloodType: req.blood_type,
            requestId: req.request_id,
            urgencyLevel: req.urgency_level,
            latitude: req.lat,
            longitude: req.lng,
          });
      }
      setEmergencyAlerts(alerts);
    } catch (error) {
      console.error(error);
    }
  }, [userProfile]);

  useEffect(() => {
    if (locationRef.current && userProfile.is_available)
      setTimeout(() => fetchBloodRequests(), 1000);
    intervalRef.current = setInterval(() => {
      if (locationRef.current && userProfile.is_available) fetchBloodRequests();
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBloodRequests, userProfile.is_available]);

  return {
    currentLocation,
    emergencyAlerts,
    setEmergencyAlerts,
    isAgentActive,
    acceptBloodRequest,
    declineBloodRequest,
    isLoading,
  };
};
