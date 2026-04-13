import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, FlatList, ActivityIndicator, RefreshControl, Linking, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { globalStyles, theme } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { useState, useEffect, useCallback } from 'react';
import { feedService } from '../../src/services/feedService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { chatService } from '../../src/services/chatService';

export default function FeedScreen() {
  const { user } = useAppStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [nextGlobalEvent, setNextGlobalEvent] = useState<any>(null);
  const [isChatActive, setIsChatActive] = useState(false);
  const [songs, setSongs] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const loadData = useCallback(() => {
    if (!user) return;
    
    // Inicia o carregamento das seções de forma não bloqueante
    feedService.getNextUserEvent(user.id).then(nextEv => {
      setNextEvent(nextEv.data);
      const eventData = nextEv.data?.events as any;
      if (eventData) {
        setIsChatActive(chatService.isChatActive(eventData.event_date, eventData.end_date));
      } else {
        setIsChatActive(false);
      }
    });

    feedService.getNextGlobalEvent().then(nextGlobalEv => {
      setNextGlobalEvent(nextGlobalEv.data);
    });

    feedService.getRecommendedSongs(10).then(recommendedSongs => {
      setSongs(recommendedSongs.data || []);
    });

    feedService.listPosts().then(socialPosts => {
      setPosts(socialPosts.data || []);
      // Removemos o loading global somente após o carregamento principal do feed (posts)
      setLoading(false);
      setRefreshing(false);
    });
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadData();
    }
  }, [loadData, user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleImagePick = async () => {
    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (!result.canceled) setSelectedImage(result.assets[0].uri);
      return;
    }

    Alert.alert(
      'Selecionar Foto',
      'Escolha de onde você deseja selecionar a imagem para o mural:',
      [
        {
          text: 'Câmera',
          onPress: () => {
            setTimeout(async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permissão Negada', 'Precisamos de acesso à câmera para tirar fotos.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
              });
              if (!result.canceled) setSelectedImage(result.assets[0].uri);
            }, 300);
          }
        },
        {
          text: 'Galeria',
          onPress: () => {
            setTimeout(async () => {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permissão Negada', 'Precisamos de acesso à galeria para selecionar fotos.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
              });
              if (!result.canceled) setSelectedImage(result.assets[0].uri);
            }, 300);
          }
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const handleCreatePost = async () => {
    if ((!newPostContent.trim() && !selectedImage) || !user) return;
    setIsPosting(true);
    
    try {
      let imageUrl = null;
      if (selectedImage) {
        const uploadRes = await feedService.uploadPostImage(selectedImage);
        if (uploadRes.error) throw new Error('Falha ao fazer upload da imagem.');
        imageUrl = uploadRes.publicUrl;
      }

      const { error } = await feedService.createPost(user.id, newPostContent.trim(), imageUrl || undefined);
      
      if (!error) {
        setNewPostContent('');
        setSelectedImage(null);
        loadData();
      } else {
        throw error;
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Erro', error.message || 'Falha ao criar postagem.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    await feedService.toggleLike(postId, user.id);
    loadData();
  };

  // A tela principal renderiza imediatamente, os dados "pipocam" quando prontos.
  const renderLoadingFeedback = () => {
    if (loading && !refreshing) {
      return (
        <View style={{ marginVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }
    return null;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.dateText}>{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</Text>
        <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0] || 'Voluntário'}! 👋</Text>
      </View>
      <View style={styles.avatarContainer}>
        {user?.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
          </View>
        )}
      </View>
    </View>
  );

  const renderNextMission = () => {
    if (!nextEvent) return null;
    const event = nextEvent.events;
    const role = nextEvent.roles;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sua Próxima Missão</Text>
        <TouchableOpacity style={styles.missionCard} activeOpacity={0.9}>
          <View style={styles.missionHeader}>
            <View style={styles.missionTag}>
              <Text style={styles.missionTagText}>EM BREVE</Text>
            </View>
            <Text style={styles.missionTime}>{format(new Date(event.event_date), 'HH:mm')}</Text>
          </View>
          
          <Text style={styles.missionTitle}>{event.title}</Text>
          <Text style={styles.missionRole}>Sua função: <Text style={{ color: theme.colors.primary }}>{role?.name || 'Geral'}</Text></Text>
          
          <View style={styles.missionFooter}>
            <View style={styles.deptInfo}>
              <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.deptName}>
                {event.event_departments?.[0]?.departments?.name || 'Equipe Principal'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRecommendedSongs = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Músicas para se Inspirar</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.songsScroll}>
        {songs.length > 0 ? songs.map((song, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.songCard}
            onPress={() => song.youtube ? Linking.openURL(song.youtube) : song.spotify ? Linking.openURL(song.spotify) : null}
          >
            <View style={styles.songIconBox}>
              <Ionicons name={song.youtube ? "logo-youtube" : "musical-notes"} size={24} color={song.youtube ? '#FF0000' : theme.colors.primary} />
            </View>
            <View style={styles.songDetails}>
              <Text style={styles.songName} numberOfLines={1}>{song.name}</Text>
              <Text style={styles.songSub}>Tocado recentemente</Text>
            </View>
          </TouchableOpacity>
        )) : (
          <Text style={styles.emptyText}>Nenhuma música sugerida no momento.</Text>
        )}
      </ScrollView>
    </View>
  );

  const renderNextGlobalEvent = () => {
    if (!nextGlobalEvent) return null;
    const eventDate = new Date(nextGlobalEvent.event_date);
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nosso próximo compromisso!</Text>
        <View style={styles.missionCard}>
          <View style={styles.missionHeader}>
            <View style={[styles.missionTag, { backgroundColor: theme.colors.surfaceHighlight }]}>
              <Text style={[styles.missionTagText, { color: theme.colors.primary }]}>GERAL</Text>
            </View>
            <Text style={styles.missionTime}>{format(eventDate, 'HH:mm')}</Text>
          </View>
          
          <Text style={styles.missionTitle}>{nextGlobalEvent.title}</Text>
          <Text style={styles.missionRole}>Data: <Text style={{ color: theme.colors.textSecondary }}>{format(eventDate, "dd 'de' MMMM", { locale: ptBR })}</Text></Text>
        </View>
      </View>
    );
  };

  const renderChatFAB = () => {
    if (!nextEvent?.events) return null;
    const eventId = (nextEvent.events as any).id;

    return (
      <TouchableOpacity 
        style={styles.chatFAB}
        onPress={() => router.push(`/events/${eventId}?tab=CHAT`)}
      >
        <Ionicons name="chatbubbles-outline" size={26} color="#121212" />
        <View style={[styles.activeIndicator, !isChatActive && { backgroundColor: theme.colors.textSecondary }]} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={globalStyles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {renderHeader()}
        {renderNextMission()}
        {renderRecommendedSongs()}
        {renderNextGlobalEvent()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>News</Text>
          
          <View style={styles.newPostContainer}>
            <View style={styles.newPostCard}>
              <TextInput
                style={styles.newPostInput}
                placeholder="No que você está pensando?"
                placeholderTextColor={theme.colors.textSecondary}
                value={newPostContent}
                onChangeText={setNewPostContent}
                multiline
              />
              <View style={styles.newPostActions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleImagePick}>
                  <Ionicons name="camera-outline" size={22} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.postButton, (!newPostContent.trim() && !selectedImage) && styles.postButtonDisabled]} 
                  onPress={handleCreatePost}
                  disabled={isPosting || (!newPostContent.trim() && !selectedImage)}
                >
                  {isPosting ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="send" size={18} color="#000" />}
                </TouchableOpacity>
              </View>
            </View>

            {selectedImage && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {renderLoadingFeedback()}

          {posts.length > 0 ? posts.map((post) => {
            const authorName = post.profiles?.full_name || 'Usuário';
            const authorAvatar = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${authorName}`;
            let displayDate = 'Recentemente';
            
            try {
              if (post.created_at) displayDate = format(new Date(post.created_at), "dd/MM 'às' HH:mm");
            } catch (e) {}

            return (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Image source={{ uri: authorAvatar }} style={styles.postAvatar} />
                  <View style={styles.postAuthorInfo}>
                    <Text style={styles.postAuthor}>{authorName}</Text>
                    <Text style={styles.postTime}>{displayDate}</Text>
                  </View>
                </View>
                <Text style={styles.postContent}>{post.content}</Text>
                {post.image_url && <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />}
                <View style={styles.postFooter}>
                  <TouchableOpacity style={styles.interactionBtn} onPress={() => handleLike(post.id)}>
                    <Ionicons 
                      name={post.post_likes?.some((l: any) => l.user_id === user?.id) ? "heart" : "heart-outline"} 
                      size={20} 
                      color={post.post_likes?.some((l: any) => l.user_id === user?.id) ? theme.colors.error : theme.colors.textSecondary} 
                    />
                    <Text style={styles.interactionText}>{post.likesCount}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.interactionBtn} activeOpacity={0.7}>
                    <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={styles.interactionText}>{post.commentsCount}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }) : (
            <View style={styles.emptyFeedCard}>
              <Ionicons name="newspaper-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={styles.emptyFeedText}>Nada por aqui ainda. Seja o primeiro a postar!</Text>
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
      {renderChatFAB()}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 4,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 15,
  },
  missionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 5,
    borderLeftColor: theme.colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionTag: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  missionTagText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  missionTime: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  missionRole: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  missionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '40',
    paddingTop: 15,
  },
  deptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deptName: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 6,
  },
  songsScroll: {
    paddingRight: 20,
  },
  songCard: {
    backgroundColor: theme.colors.surface,
    width: 160,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  songIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  songDetails: {},
  songName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  songSub: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  newPostContainer: {
    marginBottom: 20,
  },
  newPostCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  newPostInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    maxHeight: 100,
    paddingTop: 8,
  },
  newPostActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginRight: 4,
  },
  previewContainer: {
    marginTop: 10,
    position: 'relative',
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  emptyFeedCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyFeedText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  postButton: {
    backgroundColor: theme.colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  postButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  postCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.border,
  },
  postAuthorInfo: {
    marginLeft: 12,
  },
  postAuthor: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  postTime: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  postContent: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.border,
  },
  postFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '40',
    paddingTop: 12,
  },
  interactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  interactionText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  chatFAB: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    backgroundColor: theme.colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  activeIndicator: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
});
