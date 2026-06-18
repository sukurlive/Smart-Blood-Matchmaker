import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
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
import { supabase } from "../../supabase";

type ForumPost = {
    id: string;
    user_name: string;
    blood_type: string;
    content: string;
    created_at: string;
    likes_count: number;
    comments_count: number;
    hospital_name?: string | null;
    is_liked?: boolean; // Menyimpan status apakah user ini sudah like
};

type Hospital = {
    id: string;
    name: string;
};

const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return "Baru saja";
    if (minutes < 60) return `${minutes} menit yang lalu`;
    if (hours < 24) return `${hours} jam yang lalu`;
    return `${days} hari yang lalu`;
};

export default function ForumScreen() {
    const { profile } = useAuth();

    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [isModalVisible, setModalVisible] = useState(false);
    const [newPostContent, setNewPostContent] = useState("");
    const [selectedHospital, setSelectedHospital] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchPosts = async () => {
        try {
            // Ambil semua postingan
            const { data: postsData, error: postsError } = await supabase
                .from("forum_posts_with_users")
                .select("*")
                .order("created_at", { ascending: false });

            if (postsError) throw postsError;

            // Ambil data postingan yang sudah di-like oleh user yang sedang login
            let userLikes: string[] = [];
            if (profile?.id) {
                const { data: likesData, error: likesError } = await supabase
                    .from("post_likes")
                    .select("post_id")
                    .eq("user_id", profile.id);

                if (!likesError && likesData) {
                    userLikes = likesData.map(like => like.post_id);
                }
            }

            // Gabungkan data agar aplikasi tahu mana yang harus warna merah
            if (postsData) {
                const formattedPosts = postsData.map(post => ({
                    ...post,
                    is_liked: userLikes.includes(post.id)
                }));
                setPosts(formattedPosts);
            }
        } catch (error: any) {
            Alert.alert("Gagal memuat forum", error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchHospitals = async () => {
        try {
            const { data, error } = await supabase
                .from("hospitals")
                .select("id, name")
                .order("name", { ascending: true });

            if (error) throw error;
            if (data) setHospitals(data);
        } catch (error: any) {
            console.error("Gagal memuat daftar rumah sakit:", error.message);
        }
    };

    useEffect(() => {
        fetchPosts();
        fetchHospitals(); 
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPosts();
    }, []);

    const handleAddPost = async () => {
        if (!newPostContent.trim()) {
            Alert.alert("Peringatan", "Postingan tidak boleh kosong!");
            return;
        }

        if (!profile?.id) {
            Alert.alert("Error", "Anda harus login untuk membuat postingan.");
            return;
        }

        setSubmitting(true);
        try {
            const { error } = await supabase.from("forum_posts").insert({
                user_id: profile.id,
                content: newPostContent.trim(),
                hospital_name: selectedHospital || null,
            });

            if (error) throw error;

            setNewPostContent("");
            setSelectedHospital("");
            setModalVisible(false);
            fetchPosts();
        } catch (error: any) {
            Alert.alert("Gagal mengirim", error.message);
        } finally {
            setSubmitting(false);
        }
    };

  const handleLike = async (postId: string, currentLikes: number, isLiked: boolean) => {
        if (!profile?.id) {
            Alert.alert("Peringatan", "Anda harus login untuk menyukai postingan.");
            return;
        }

        // 1. Optimistic Update (Berubah merah seketika)
        setPosts(currentPosts => 
            currentPosts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        is_liked: !isLiked,
                        likes_count: isLiked ? currentLikes - 1 : currentLikes + 1
                    };
                }
                return post;
            })
        );

        // 2. Tembak ke Database
        try {
            if (isLiked) {
                // Unlike
                const { error } = await supabase
                    .from("post_likes")
                    .delete()
                    .match({ post_id: postId, user_id: profile.id });
                if (error) throw error;
            } else {
                // Like
                const { error } = await supabase
                    .from("post_likes")
                    .insert({ post_id: postId, user_id: profile.id });
                if (error) throw error;
            }
        } catch (error: any) {
            // MUNCULKAN ALERT JIKA GAGAL
            Alert.alert("Gagal Menyukai Postingan", error.message);
            
            // Kembalikan ke keadaan semula
            setPosts(currentPosts => 
                currentPosts.map(post => {
                    if (post.id === postId) {
                        return { ...post, is_liked: isLiked, likes_count: currentLikes };
                    }
                    return post;
                })
            );
        }
    };
    const renderPostCard = ({ item }: { item: ForumPost }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                        {item.user_name ? item.user_name.charAt(0).toUpperCase() : "?"}
                    </Text>
                </View>
                <View style={styles.headerTextContainer}>
                    <View style={styles.nameRow}>
                        <Text style={styles.userName}>{item.user_name}</Text>
                        {item.blood_type && (
                            <View style={styles.bloodTypeBadge}>
                                <Text style={styles.bloodTypeText}>{item.blood_type}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>
                </View>
            </View>

            <Text style={styles.postContent}>{item.content}</Text>

            {item.hospital_name ? (
                <View style={styles.hospitalTag}>
                    <Ionicons name="location" size={14} color="#D32F2F" />
                    <Text style={styles.hospitalTagText}>Mendonor di {item.hospital_name}</Text>
                </View>
            ) : null}

            <View style={styles.cardFooter}>
                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleLike(item.id, item.likes_count, !!item.is_liked)}
                >
                    <Ionicons 
                        name={item.is_liked ? "heart" : "heart-outline"} 
                        size={20} 
                        color={item.is_liked ? "#D32F2F" : "#666"} 
                    />
                    <Text style={[styles.actionText, item.is_liked && { color: "#D32F2F" }]}>
                        {item.likes_count}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["left", "right"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Ruang Pahlawan</Text>
                <Text style={styles.headerSubtitle}>Bagikan pengalaman dan ceritamu</Text>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#D32F2F" />
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
                    renderItem={renderPostCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#D32F2F"]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="chat-sleep-outline" size={60} color="#CCC" />
                            <Text style={styles.emptyText}>Belum ada diskusi.</Text>
                            <Text style={styles.emptySubText}>Jadilah yang pertama berbagi pengalaman!</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={() => {
                    setIsDropdownOpen(false); 
                    setModalVisible(true);
                }}
            >
                <MaterialCommunityIcons name="pencil-plus" size={24} color="#FFF" />
            </TouchableOpacity>

            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Buat Diskusi Baru</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.dropdownWrapper}>
                            <TouchableOpacity
                                style={styles.dropdownSelector}
                                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.dropdownSelectorLeft}>
                                    <MaterialCommunityIcons name="hospital-building" size={20} color="#666" />
                                    <Text style={[styles.dropdownSelectorText, !selectedHospital && { color: "#999" }]}>
                                        {selectedHospital || "Pilih Lokasi Donor (Opsional)"}
                                    </Text>
                                </View>
                                <Ionicons
                                    name={isDropdownOpen ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color="#666"
                                />
                            </TouchableOpacity>

                            {isDropdownOpen && (
                                <View style={styles.dropdownListContainer}>
                                    <ScrollView nestedScrollEnabled style={styles.dropdownList}>
                                        {hospitals.length > 0 ? (
                                            hospitals.map((hospital, index) => (
                                                <TouchableOpacity
                                                    key={hospital?.id ? String(hospital.id) : String(index)}
                                                    style={styles.dropdownItem}
                                                    onPress={() => {
                                                        setSelectedHospital(hospital.name);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                >
                                                    <Text style={styles.dropdownItemText}>{hospital.name}</Text>
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <Text style={styles.dropdownEmptyText}>Memuat data...</Text>
                                        )}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <TextInput
                            style={styles.textInput}
                            placeholder="Ceritakan pengalaman donormu hari ini..."
                            multiline
                            autoFocus={false}
                            numberOfLines={6}
                            textAlignVertical="top"
                            value={newPostContent}
                            onChangeText={setNewPostContent}
                            editable={!submitting}
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                            onPress={handleAddPost}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.submitButtonText}>Bagikan</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8F9FA" },
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#EEE",
    },
    headerTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
    headerSubtitle: { fontSize: 13, color: "#777", marginTop: 2 },
    listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 80 },
    card: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5 },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFEBEE", justifyContent: "center", alignItems: "center", marginRight: 12 },
    avatarText: { color: "#D32F2F", fontSize: 18, fontWeight: "bold" },
    headerTextContainer: { flex: 1, justifyContent: "center" },
    nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
    userName: { fontSize: 15, fontWeight: "bold", color: "#1A1A1A", marginRight: 8 },
    bloodTypeBadge: { backgroundColor: "#D32F2F", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    bloodTypeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
    timeText: { fontSize: 12, color: "#888" },
    postContent: { fontSize: 14, color: "#333", lineHeight: 22, marginBottom: 12 },
    hospitalTag: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF5F5", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignSelf: "flex-start", marginBottom: 16 },
    hospitalTagText: { fontSize: 12, color: "#D32F2F", fontWeight: "600", marginLeft: 4 },
    cardFooter: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 12, gap: 20 },
    actionButton: { flexDirection: "row", alignItems: "center", gap: 6 },
    actionText: { fontSize: 14, color: "#666", fontWeight: "600" },
    emptyContainer: { alignItems: "center", marginTop: 60 },
    emptyText: { fontSize: 16, fontWeight: "bold", color: "#666", marginTop: 12 },
    emptySubText: { fontSize: 14, color: "#999", marginTop: 4 },
    fab: { position: "absolute", bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#D32F2F", justifyContent: "center", alignItems: "center", elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 5 },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: "50%", maxHeight: "90%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1A1A1A" },

    dropdownWrapper: { marginBottom: 16, zIndex: 10 },
    dropdownSelector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F8F9FA", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#EEE" },
    dropdownSelectorLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
    dropdownSelectorText: { marginLeft: 10, fontSize: 15, color: "#333", flex: 1 },
    dropdownListContainer: { backgroundColor: "#FFF", borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: "#EEE", maxHeight: 150, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    dropdownList: { flexGrow: 1 },
    dropdownItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
    dropdownItemText: { fontSize: 15, color: "#333" },
    dropdownEmptyText: { padding: 16, textAlign: "center", color: "#999", fontSize: 14 },

    textInput: { backgroundColor: "#F8F9FA", borderRadius: 12, padding: 16, fontSize: 16, color: "#333", minHeight: 120, marginBottom: 20, borderWidth: 1, borderColor: "#EEE" },
    submitButton: { backgroundColor: "#D32F2F", borderRadius: 12, padding: 16, alignItems: "center" },
    submitButtonDisabled: { backgroundColor: "#E57373" },
    submitButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});