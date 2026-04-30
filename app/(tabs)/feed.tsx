import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, FlatList, ActivityIndicator, RefreshControl, Linking, Alert, Platform, Modal, KeyboardAvoidingView } from 'react-native';
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
import { STRINGS } from '../../src/constants/strings';
import { EmptyState } from '../../src/components/EmptyState';
import { CustomModal } from '../../src/components/CustomModal';
import { notificationService } from '../../src/services/notificationService';
import { supabase } from '../../src/services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useFeedPosts, useGlobalSchedulePanorama, useNextUserEvent, useNextGlobalEvent, useRecommendedSongs, useCreatePost, useDeletePost, useToggleLike } from '../../src/hooks/queries/useFeed';

export default function FeedScreen() {
  const { user } = useAppStore();
  const router = useRouter();
  const [isChatActive, setIsChatActive] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<{uri: string, base64: string} | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState<any>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  // Estados do Panorama
  const [feedMode, setFeedMode] = useState<'MURAL' | 'PANORAMA'>('MURAL');
  
  // Estados de Filtro para MASTER
  const [allInstitutions, setAllInstitutions] = useState<any[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [postVisibility, setPostVisibility] = useState<'INTERNAL' | 'GLOBAL'>('INTERNAL');

  // Estado de Notificações
  const [unreadCount, setUnreadCount] = useState(0);

  // Controle de Hidratação
  const [isMounted, setIsMounted] = useState(false);

  const queryClient = useQueryClient();
  const instId = user?.access_level === 'MASTER' ? null : user?.institution_id;
  const feedInstId = selectedInstitutionId || instId;

  const { data: posts = [], isLoading: loadingPosts, isFetching: isFetchingPosts, refetch: refetchPosts } = useFeedPosts(feedInstId ?? null);
  const { data: panoramaData = [], isLoading: loadingPanorama } = useGlobalSchedulePanorama(instId ?? null);
  const { data: nextEvent } = useNextUserEvent(user?.id);
  const { data: nextGlobalEvent } = useNextGlobalEvent(instId ?? null);
  const { data: songs = [] } = useRecommendedSongs(10);

  const createPostMutation = useCreatePost();
  const deletePostMutation = useDeletePost();
  const toggleLikeMutation = useToggleLike();

  const loading = loadingPosts;
  const refreshing = isFetchingPosts;

  useEffect(() => {
    setIsMounted(true);
    if (user?.role === 'MASTER' && allInstitutions.length === 0) {
      const { adminService } = require('../../src/services/adminService');
      adminService.listInstitutions().then((res: any) => {
        setAllInstitutions(res.data || []);
      });
    }
  }, [user]);

  useEffect(() => {
    if (nextEvent?.events) {
      const eventData = nextEvent.events as any;
      setIsChatActive(chatService.isChatActive(eventData.event_date, eventData.end_date));
    } else {
      setIsChatActive(false);
    }
  }, [nextEvent]);

  useEffect(() => {
    if (user) {
      notificationService.getUnreadCount(user.id).then(res => setUnreadCount(res.count || 0));

      const notifSubscription = supabase
        .channel('unread_count')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
          notificationService.getUnreadCount(user.id).then(res => setUnreadCount(res.count || 0));
        }).subscribe();

      const subscription = feedService.subscribeToFeed(() => {
        queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
      });

      return () => {
        subscription.unsubscribe();
        notifSubscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    if (activeCommentPost) {
      feedService.getComments(activeCommentPost.id).then(res => setPostComments(res.data || []));
    }
  }, [posts, activeCommentPost]);

  const onRefresh = () => {
    refetchPosts();
    queryClient.invalidateQueries({ queryKey: ['panorama'] });
    queryClient.invalidateQueries({ queryKey: ['nextUserEvent'] });
    queryClient.invalidateQueries({ queryKey: ['nextGlobalEvent'] });
    queryClient.invalidateQueries({ queryKey: ['recommendedSongs'] });
  };

  const handleImagePick = async () => {
    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        setSelectedImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
      }
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
                base64: true,
              });
              if (!result.canceled && result.assets[0].base64) {
                setSelectedImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
              }
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
                base64: true,
              });
              if (!result.canceled && result.assets[0].base64) {
                setSelectedImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
              }
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
      if (selectedImage && selectedImage.base64) {
        const uploadRes = await feedService.uploadPostImage(selectedImage.base64);
        if (uploadRes.error) throw new Error('Falha ao fazer upload da imagem.');
        imageUrl = uploadRes.publicUrl;
      }

      await createPostMutation.mutateAsync({
        userId: user.id, 
        content: newPostContent.trim(), 
        imageUrl: imageUrl || undefined, 
        institutionId: user.institution_id,
        visibility: user.role === 'MASTER' ? postVisibility : 'INTERNAL'
      });
      
      setNewPostContent('');
      setSelectedImage(null);
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Erro', error.message || 'Falha ao criar postagem.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    toggleLikeMutation.mutate({ postId, userId: user.id });
  };

  const openComments = async (post: any) => {
    setActiveCommentPost(post);
    setLoadingComments(true);
    const { data } = await feedService.getComments(post.id);
    setPostComments(data || []);
    setLoadingComments(false);
  };

  const closeComments = () => {
    setActiveCommentPost(null);
    setPostComments([]);
    setNewCommentText('');
  };

  const submitComment = async () => {
    if (!newCommentText.trim() || !user || !activeCommentPost) return;
    setIsCommenting(true);
    const { data, error } = await feedService.addComment(activeCommentPost.id, user.id, newCommentText.trim());
    if (!error && data) {
      // Refresh comments and clear input
      const res = await feedService.getComments(activeCommentPost.id);
      setPostComments(res.data || []);
      setNewCommentText('');
      queryClient.invalidateQueries({ queryKey: ['feedPosts'] }); // To update the comment count on the feed background
    } else {
      Alert.alert('Erro', 'Falha ao enviar comentário.');
    }
    setIsCommenting(false);
  };
  
  const handleDeletePost = (postId: string) => {
    if (user?.role !== 'ADMIN' && user?.role !== 'LÍDER' && user?.role !== 'CO-LÍDER' && !posts.find(p => p.id === postId && p.user_id === user?.id)) return;
    setPostToDelete(postId);
    setModalVisible(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    try {
      await deletePostMutation.mutateAsync(postToDelete);
    } catch (error: any) {
      Alert.alert(STRINGS.common.error, 'Não foi possível excluir a postagem.');
      console.error('Delete post error:', error);
    } finally {
      setModalVisible(false);
      setPostToDelete(null);
    }
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
        <Text style={styles.dateText}>
          {isMounted ? format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR }) : '...'}
        </Text>
        <Text style={styles.greeting}>
          {isMounted ? `Olá, ${user?.name?.split(' ')[0] || 'Voluntário'}! 👋` : 'Olá! 👋'}
        </Text>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity 
          style={styles.notificationBtn} 
          onPress={() => router.push('/notifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={26} color={theme.colors.text} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

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

  const renderPanorama = () => {
    if (loadingPanorama) return <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />;
    if (panoramaData.length === 0) return <Text style={[styles.emptyText, { marginTop: 40 }]}>Nenhuma escala gerada no momento.</Text>;

    return (
      <View style={{ marginTop: 10, paddingBottom: 80 }}>
        {panoramaData.map((ev: any) => {
          const groupedDepts: Record<string, { deptName: string, schedules: any[] }> = {};
          
          if (ev.schedules) {
            ev.schedules.forEach((sch: any) => {
              const deptId = sch.roles?.departments?.id || 'unknown';
              const deptName = sch.roles?.departments?.name || 'Geral';
              if (!groupedDepts[deptId]) groupedDepts[deptId] = { deptName, schedules: [] };
              groupedDepts[deptId].schedules.push(sch);
            });
          }

          return (
            <View key={ev.id} style={styles.panoramaTimelineCard}>
               <View style={styles.panoramaTimelineHeader}>
                 <View style={styles.panoramaDateBadge}>
                   <Text style={styles.panoramaDateDay}>{format(new Date(ev.event_date), "dd")}</Text>
                   <Text style={styles.panoramaDateMonth}>{format(new Date(ev.event_date), "MMM", { locale: ptBR })}</Text>
                 </View>
                 <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.panoramaEventTitle}>{ev.title}</Text>
                    <Text style={styles.panoramaEventDayName}>{format(new Date(ev.event_date), "EEEE", { locale: ptBR })}</Text>
                 </View>
               </View>
               
               <View style={styles.panoramaContent}>
                 {Object.values(groupedDepts).length === 0 ? (
                   <Text style={[styles.emptyText, { marginTop: 10, fontSize: 12 }]}>Ninguém escalado ainda.</Text>
                 ) : (
                   Object.values(groupedDepts).map((group, idx) => (
                     <View key={idx} style={styles.panoramaDeptGroup}>
                       <View style={styles.panoramaDeptLabel}>
                         <View style={styles.panoramaDeptDot} />
                         <Text style={styles.panoramaDeptName}>{group.deptName}</Text>
                       </View>
                       
                       <View style={styles.panoramaVolunteersList}>
                         {group.schedules.map((sch: any) => (
                           <View key={sch.id} style={styles.panoramaVolunteerCard}>
                             <Image 
                               source={{ uri: sch.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${sch.profiles?.full_name}&background=1A1A1A&color=fff` }} 
                               style={styles.panoramaAvatar} 
                             />
                             <View style={{ flex: 1 }}>
                               <Text style={styles.panoramaSchName}>{sch.profiles?.full_name || 'Voluntário'}</Text>
                               <Text style={styles.panoramaSchRole}>{sch.roles?.name || 'Membro'}</Text>
                             </View>
                           </View>
                         ))}
                       </View>
                     </View>
                   ))
                 )}
               </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderChatFAB = () => {
    const eventId = nextEvent?.events?.id;
    if (!eventId) return null;

    return (
      <TouchableOpacity 
        style={styles.chatFAB}
        onPress={() => router.push(`/events/${eventId}?tab=CHAT`)}
      >
        <Ionicons name="chatbubbles" size={26} color="#FFFFFF" />
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

        {user?.role !== 'MASTER' && (
          <View style={styles.modeTabs}>
            <TouchableOpacity 
              style={[styles.modeTab, feedMode === 'MURAL' && styles.activeModeTab]}
              onPress={() => setFeedMode('MURAL')}
            >
              <Ionicons name="home" size={16} color={feedMode === 'MURAL' ? '#FFFFFF' : theme.colors.textSecondary} />
              <Text 
                style={[styles.modeTabText, feedMode === 'MURAL' && styles.activeModeTabText]}
                translate="no"
                className="notranslate"
              >
                Volly Connect
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeTab, feedMode === 'PANORAMA' && styles.activeModeTab]}
              onPress={() => setFeedMode('PANORAMA')}
            >
              <Ionicons name="calendar" size={16} color={feedMode === 'PANORAMA' ? '#FFFFFF' : theme.colors.textSecondary} />
              <Text 
                style={[styles.modeTabText, feedMode === 'PANORAMA' && styles.activeModeTabText]}
                translate="no"
                className="notranslate"
              >
                Escalas
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {feedMode === 'PANORAMA' ? (
          renderPanorama()
        ) : (
          <>
            {user?.role === 'MASTER' && allInstitutions.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContainer}
              >
                <TouchableOpacity 
                  style={[styles.filterChip, selectedInstitutionId === null && styles.filterChipActive]}
                  onPress={() => setSelectedInstitutionId(null)}
                >
                  <Text style={[styles.filterText, selectedInstitutionId === null && styles.filterTextActive]}>Tudo</Text>
                </TouchableOpacity>
                {allInstitutions.map((inst) => (
                  <TouchableOpacity 
                    key={inst.id}
                    style={[styles.filterChip, selectedInstitutionId === inst.id && styles.filterChipActive]}
                    onPress={() => setSelectedInstitutionId(inst.id)}
                  >
                    <Text style={[styles.filterText, selectedInstitutionId === inst.id && styles.filterTextActive]}>{inst.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.postInputCard}>
              <View style={styles.postInputHeader}>
                <Image 
                  source={{ uri: user?.avatar_url || 'https://via.placeholder.com/40' }} 
                  style={styles.postAvatarSmall} 
                />
                <TextInput
                  style={styles.postInput}
                  placeholder="No que você está pensando?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                  multiline
                />
              </View>
              
              <View style={styles.postInputFooter}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={styles.postActionBtn} onPress={handleImagePick}>
                    <Ionicons name="camera-outline" size={22} color={theme.colors.primary} />
                  </TouchableOpacity>
                  
                  {user?.role === 'MASTER' && (
                    <TouchableOpacity 
                      style={[styles.postActionBtn, postVisibility === 'GLOBAL' && { backgroundColor: 'rgba(107, 197, 167, 0.1)' }]} 
                      onPress={() => setPostVisibility(v => v === 'INTERNAL' ? 'GLOBAL' : 'INTERNAL')}
                    >
                      <Ionicons 
                        name={postVisibility === 'GLOBAL' ? "globe" : "globe-outline"} 
                        size={22} 
                        color={postVisibility === 'GLOBAL' ? theme.colors.success : theme.colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  )}
                </View>
                
                <TouchableOpacity 
                  style={[styles.postButton, (!newPostContent.trim() && !selectedImage) && styles.postButtonDisabled]} 
                  onPress={handleCreatePost}
                  disabled={isPosting || (!newPostContent.trim() && !selectedImage)}
                >
                  {isPosting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={18} color="#FFFFFF" />}
                </TouchableOpacity>
              </View>
            </View>

            {selectedImage && selectedImage.uri && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            )}

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
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.postAuthor}>{authorName}</Text>
                        {user?.role === 'MASTER' && post.institutions && (
                          <View style={styles.instBadge}>
                            <Text style={styles.instBadgeText}>{post.institutions.name}</Text>
                          </View>
                        )}
                        {post.visibility === 'GLOBAL' && (
                          <View style={[styles.instBadge, { backgroundColor: 'rgba(107, 197, 167, 0.1)', borderColor: theme.colors.success }]}>
                            <Text style={[styles.instBadgeText, { color: theme.colors.success }]}>GLOBAL</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.postTime}>{displayDate}</Text>
                    </View>
                    {(user?.role === 'ADMIN' || user?.role === 'MASTER' || user?.role === 'LÍDER' || user?.role === 'CO-LÍDER' || post.user_id === user?.id) && (
                      <TouchableOpacity 
                        style={styles.moreOptionsBtn} 
                        onPress={() => handleDeletePost(post.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    )}
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
                    <TouchableOpacity style={styles.interactionBtn} onPress={() => openComments(post)}>
                      <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
                      <Text style={styles.interactionText}>{post.commentsCount}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }) : (
              <EmptyState 
                title={STRINGS.feed.emptyState}
                description={STRINGS.feed.emptyStateSub}
                image={require('../../assets/images/illustrations/empty_state.png')}
              />
            )}

            <CustomModal 
              visible={modalVisible}
              title={STRINGS.feed.deletePostTitle}
              message={STRINGS.feed.deletePostConfirm}
              type="danger"
              confirmText="Excluir"
              onConfirm={confirmDeletePost}
              onCancel={() => setModalVisible(false)}
            />
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      {renderChatFAB()}

      {/* Comentários Modal */}
      <Modal visible={!!activeCommentPost} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderGrabber} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 10 }}>
                <Text style={styles.modalTitle}>Comentários</Text>
                <TouchableOpacity onPress={closeComments} style={{ padding: 5 }}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {activeCommentPost && (
                <View style={{ width: '100%', marginTop: 15, paddingBottom: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Image 
                      source={{ uri: activeCommentPost.profiles?.avatar_url || 'https://via.placeholder.com/40' }} 
                      style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: theme.colors.border }} 
                    />
                    <Text style={{ fontWeight: 'bold', color: theme.colors.text, fontSize: 13 }}>
                      {activeCommentPost.profiles?.full_name || 'Usuário'}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 20 }} numberOfLines={4}>
                    {activeCommentPost.content}
                  </Text>
                </View>
              )}
            </View>
            
            {loadingComments ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
            ) : (
              <FlatList
                data={postComments}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20 }}
                ListEmptyComponent={<Text style={styles.emptyCommentsText}>Seja o primeiro a comentar!</Text>}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Image source={{ uri: item.profiles?.avatar_url || 'https://via.placeholder.com/40' }} style={styles.commentAvatar} />
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentAuthor}>{item.profiles?.full_name || 'Usuário'}</Text>
                      <Text style={styles.commentText}>{item.content}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Escreva um comentário..."
                placeholderTextColor={theme.colors.textSecondary}
                value={newCommentText}
                onChangeText={setNewCommentText}
                multiline
              />
              <TouchableOpacity style={styles.commentSendBtn} onPress={submitComment} disabled={isCommenting}>
                {isCommenting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  modeTabs: { flexDirection: 'row', backgroundColor: theme.colors.surface, padding: 4, borderRadius: 12, marginBottom: 20 },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  activeModeTab: { backgroundColor: '#6BC5A7' },
  modeTabText: { color: theme.colors.textSecondary, fontWeight: 'bold', marginLeft: 8 },
  activeModeTabText: { color: '#FFFFFF' },
  panoramaTimelineCard: {
    marginBottom: 30,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  panoramaTimelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  panoramaDateBadge: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panoramaDateDay: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  panoramaDateMonth: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  panoramaEventTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  panoramaEventDayName: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  panoramaContent: {
    padding: 16,
  },
  panoramaDeptGroup: {
    marginBottom: 20,
  },
  panoramaDeptLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  panoramaDeptDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: 8,
  },
  panoramaDeptName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  panoramaVolunteersList: {
    gap: 10,
  },
  panoramaVolunteerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 12,
  },
  panoramaAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: theme.colors.background,
  },
  panoramaSchName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  panoramaSchRole: {
    color: theme.colors.textSecondary,
    fontSize: 11,
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
  notificationBtn: {
    marginRight: 15,
    padding: 5,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: theme.colors.error,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
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
  postInputCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  postInputHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: theme.colors.border,
  },
  postInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    minHeight: 40,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  postInputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '40',
  },
  postActionBtn: {
    padding: 8,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreOptionsBtn: {
    padding: 8,
    marginLeft: 'auto',
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
    bottom: 30,
    right: 25,
    backgroundColor: theme.colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 999,
  },
  activeIndicator: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6BC5A7', // Verde menta moderno
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 30 : 0,
  },
  modalHeader: {
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalHeaderGrabber: {
    width: 40,
    height: 5,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  emptyCommentsText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 20,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: theme.colors.border,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: theme.colors.text,
    fontSize: 13,
    marginBottom: 4,
  },
  commentText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'flex-end',
    backgroundColor: theme.colors.background,
  },
  commentInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 40,
    maxHeight: 100,
    color: theme.colors.text,
    marginRight: 10,
  },
  commentSendBtn: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScroll: {
    marginBottom: 20,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterContainer: {
    paddingRight: 40,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  instBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(223, 114, 27, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  instBadgeText: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
