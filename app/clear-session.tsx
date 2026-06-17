import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { supabase } from "../supabase";

export default function ClearSessionScreen() {
  useEffect(() => {
    const clearAndRedirect = async () => {
      try {
        // Clear all storage
        await AsyncStorage.multiRemove([
          "supabase.auth.token",
          "supabase.auth.expires_at",
          "expo-dev-menu",
        ]);

        // Sign out from Supabase
        await supabase.auth.signOut();

        // Redirect to login after 1 second
        setTimeout(() => {
          router.replace("/");
        }, 1000);
      } catch (error) {
        console.error("Clear error:", error);
        router.replace("/");
      }
    };

    clearAndRedirect();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#D32F2F" />
      <Text style={{ marginTop: 20 }}>Clearing session...</Text>
    </View>
  );
}
