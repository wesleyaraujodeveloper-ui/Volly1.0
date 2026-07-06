import { useTheme } from '../../src/hooks/useTheme';
import { Theme } from '../../src/theme/index';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, FlatList, ActivityIndicator, RefreshControl, Linking, Alert, Platform, Modal, KeyboardAvoidingView, Animated as RNAnimated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { 
  Bell, 
  ChatTeardropDots, 
  House, 
  CalendarBlank, 
  Camera, 
  Globe, 
  PaperPlaneTilt, 
  Heart, 
  ChatCircleText, 
  Trash, 
  CaretRight, 
  Users, 
  MusicNotes, 
  YoutubeLogo, 
  User,
  XCircle,
  X,
  ArrowsLeftRight,
  WarningCircle,
  Star,
  Megaphone,
  PushPin
} from 'phosphor-react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { useState, useEffect, useCallback, useRef } from 'react';
import { feedService } from '../../src/services/feedService';
import { announcementService, Announcement } from '../../src/services/announcementService';
import { feedbackService } from '../../src/services/feedbackService';
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
import { useSyncCalendar, useRequestSwap } from '../../src/hooks/queries/useSchedules';
import { FeedHeader } from '../../src/components/feed/FeedHeader';
import { AnnouncementsSection } from '../../src/components/feed/AnnouncementsSection';
import { MissionCard } from '../../src/components/feed/MissionCard';
import { RecommendedSongs } from '../../src/components/feed/RecommendedSongs';
import { PanoramaTimeline } from '../../src/components/feed/PanoramaTimeline';
import { PostCard } from '../../src/components/feed/PostCard';
import { PostInputBox } from '../../src/components/feed/PostInputBox';
import { CommentsModal } from '../../src/components/modals/CommentsModal';
import { SwapScheduleModal } from '../../src/components/modals/SwapScheduleModal';
import { FeedbackModal } from '../../src/components/modals/FeedbackModal';
import { CreateAnnouncementModal } from '../../src/components/modals/CreateAnnouncementModal';

export default function FeedScreen() {
  const { theme, globalStyles } = useTheme();
  const styles = getStyles(theme);
  const { user, providerToken, selectedInstitutionId, setSelectedInstitutionId } = useAppStore();
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
  const [postVisibility, setPostVisibility] = useState<'INTERNAL' | 'GLOBAL'>('INTERNAL');

  // Estado de Notificações
  const [unreadCount, setUnreadCount] = useState(0);

  // Estado de Troca de Escala
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [swapReason, setSwapReason] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  // Controle de Hidratação
  const [isMounted, setIsMounted] = useState(false);
  
  // Animação do botão de chat
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  const queryClient = useQueryClient();
  const instId = user?.access_level === 'MASTER' ? null : user?.institution_id;
  const feedInstId = selectedInstitutionId || instId;

  // Mural é Global (usa instId)
  const { data: posts = [], isLoading: loadingPosts, isFetching: isFetchingPosts, refetch: refetchPosts } = useFeedPosts(instId ?? null);
  
  // Escalas são Locais (usam feedInstId)
  const { data: panoramaData = [], isLoading: loadingPanorama } = useGlobalSchedulePanorama(feedInstId ?? null);
  const { data: nextGlobalEvent } = useNextGlobalEvent(feedInstId ?? null);
  
  const { data: nextEvent } = useNextUserEvent(user?.id);
  const { data: songs = [] } = useRecommendedSongs(10);

  const createPostMutation = useCreatePost();
  const deletePostMutation = useDeletePost();
  const toggleLikeMutation = useToggleLike();
  const syncCalendarMutation = useSyncCalendar();
  const requestSwapMutation = useRequestSwap();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pendingFeedbackEvent, setPendingFeedbackEvent] = useState<any>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [createAnnModalVisible, setCreateAnnModalVisible] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnDays, setNewAnnDays] = useState('7');
  const [isPostingAnn, setIsPostingAnn] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedAnns, setExpandedAnns] = useState<Record<string, boolean>>({});

  const loading = loadingPosts;
  const refreshing = isFetchingPosts || isRefreshing;

  const loadAnnouncements = async () => {
    // Avisos são globais (usa instId)
    const { data } = await announcementService.getActiveAnnouncements(instId || null);
    if (data) setAnnouncements(data);
  };

  const checkPendingFeedback = async () => {
    if (!user) return;
    const { data } = await feedbackService.getPendingFeedbackEvent(user.id);
    if (data) {
      setPendingFeedbackEvent(data);
      setFeedbackModalVisible(true);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    if (user?.role === 'MASTER' && allInstitutions.length === 0) {
      const { adminService } = require('../../src/services/adminService');
      adminService.listInstitutions().then((res: any) => {
        setAllInstitutions(res.data || []);
      });
    }

    if (user) {
      loadAnnouncements();
      checkPendingFeedback();
    }
  }, [user, feedInstId]);

  useEffect(() => {
    let isActive = false;
    const currentEvent = (nextEvent?.events || nextGlobalEvent) as any;
    
    if (currentEvent) {
      isActive = chatService.isChatActive(currentEvent.event_date, currentEvent.end_date);
    }
    
    setIsChatActive(isActive);

    if (isActive) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [nextEvent, nextGlobalEvent, pulseAnim]);

  useEffect(() => {
    if (nextEvent && !(nextEvent as any).google_event_id && providerToken) {
      syncCalendarMutation.mutate({ scheduleId: nextEvent.id, token: providerToken });
    }
  }, [nextEvent, providerToken]);

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

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchPosts(),
        loadAnnouncements(),
        queryClient.invalidateQueries({ queryKey: ['panorama'] }),
        queryClient.invalidateQueries({ queryKey: ['nextUserEvent'] }),
        queryClient.invalidateQueries({ queryKey: ['nextGlobalEvent'] }),
        queryClient.invalidateQueries({ queryKey: ['recommendedSongs'] })
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImagePick = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão Negada', 'Precisamos de acesso à galeria para selecionar fotos.');
          return;
        }
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
    } catch (error) {
      console.log('Error picking image', error);
    }
  };

  const handleCameraPick = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão Negada', 'Precisamos de acesso à câmera para tirar fotos.');
          return;
        }
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
    } catch (error) {
      console.log('Error taking photo', error);
      Alert.alert('Erro', 'Não foi possível acessar a câmera no momento.');
    }
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
        imageUrl: imageUrl ? (imageUrl as string) : undefined, 
        institutionId: user.institution_id || undefined,
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

  const handleRequestSwap = async () => {
    if (!selectedScheduleId) return;
    try {
      await requestSwapMutation.mutateAsync({ scheduleId: selectedScheduleId, reason: swapReason });
      Alert.alert('Solicitação Enviada', 'Seu líder foi notificado sobre a sua necessidade de troca.');
      setSwapModalVisible(false);
      setSwapReason('');
      queryClient.invalidateQueries({ queryKey: ['panorama'] });
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível enviar a solicitação: ' + error.message);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!user || !pendingFeedbackEvent || feedbackRating === 0) return;
    setIsSubmittingFeedback(true);
    try {
      await feedbackService.submitFeedback({
        event_id: pendingFeedbackEvent.id,
        user_id: user.id,
        rating: feedbackRating,
        comment: feedbackComment.trim()
      });
      // Notificar líder do departamento (simplificado: insere notificação caso o backend resolva o líder ou envia para o Master)
      if (pendingFeedbackEvent.department_id) {
        const { data: dept } = await supabase.from('departments').select('leader_id').eq('id', pendingFeedbackEvent.department_id).single();
        if (dept && dept.leader_id) {
          await supabase.from('notifications').insert([{
            user_id: dept.leader_id,
            title: 'Novo Feedback',
            message: `${user.name} avaliou o evento ${pendingFeedbackEvent.title} com nota ${feedbackRating}.`,
            link_url: `/events/${pendingFeedbackEvent.id}`
          }]);
        }
      }
      setFeedbackSuccess(true);
      setTimeout(() => {
        setFeedbackModalVisible(false);
        setPendingFeedbackEvent(null);
      }, 2000);
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível enviar seu feedback.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!user || !newAnnTitle.trim() || !newAnnContent.trim()) return;
    setIsPostingAnn(true);
    try {
      const days = parseInt(newAnnDays) || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      await announcementService.createAnnouncement({
        institution_id: user.institution_id || undefined,
        author_id: user.id,
        title: newAnnTitle.trim(),
        content: newAnnContent.trim(),
        expires_at: expiresAt.toISOString()
      });

      setCreateAnnModalVisible(false);
      setNewAnnTitle('');
      setNewAnnContent('');
      loadAnnouncements();
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível criar o aviso.');
    } finally {
      setIsPostingAnn(false);
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


  const renderChatFAB = () => {
    const currentEvent = (nextEvent?.events || nextGlobalEvent) as any;
    const eventId = currentEvent?.id;
    if (!eventId) return null;
    
    const isVolunteer = user?.role === 'VOLUNTÁRIO';
    // if (isVolunteer && !nextEvent?.events) return null; // Removido para permitir visualização como leitura

    return (
      <RNAnimated.View style={[styles.chatFABContainer, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity 
          style={styles.chatFAB}
          onPress={() => router.push(`/events/${eventId}?tab=CHAT` as any)}
          activeOpacity={0.9}
        >
          <ChatTeardropDots size={28} color="#FFFFFF" weight="fill" />
          <View style={[styles.activeIndicator, !isChatActive && { backgroundColor: theme.colors.textSecondary }]} />
        </TouchableOpacity>
      </RNAnimated.View>
    );
  };

  return (
    <View style={globalStyles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <FeedHeader user={user} unreadCount={unreadCount} />

        {user?.role !== 'MASTER' && (
          <View style={styles.modeTabs}>
            <TouchableOpacity 
              style={[styles.modeTab, feedMode === 'MURAL' && styles.activeModeTab]}
              onPress={() => setFeedMode('MURAL')}
            >
              <House size={16} color={feedMode === 'MURAL' ? '#FFFFFF' : theme.colors.textSecondary} weight={feedMode === 'MURAL' ? 'fill' : 'regular'} />
              <Text 
                style={[styles.modeTabText, feedMode === 'MURAL' && styles.activeModeTabText]}
              >
                Volly Connect
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeTab, feedMode === 'PANORAMA' && styles.activeModeTab]}
              onPress={() => setFeedMode('PANORAMA')}
            >
              <CalendarBlank size={16} color={feedMode === 'PANORAMA' ? '#FFFFFF' : theme.colors.textSecondary} weight={feedMode === 'PANORAMA' ? 'fill' : 'regular'} />
              <Text 
                style={[styles.modeTabText, feedMode === 'PANORAMA' && styles.activeModeTabText]}
              >
                Escalas
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {feedMode === 'PANORAMA' ? (
          <PanoramaTimeline 
            loading={loadingPanorama} 
            data={panoramaData} 
            user={user} 
            onRequestSwap={(id) => {
              setSelectedScheduleId(id);
              setSwapModalVisible(true);
            }} 
          />
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

            <AnnouncementsSection 
              announcements={announcements} 
              user={user} 
              onRefresh={loadAnnouncements} 
              onOpenCreateModal={() => setCreateAnnModalVisible(true)} 
            />
            {nextEvent && <MissionCard event={nextEvent.events} role={nextEvent.roles} />}
            {nextGlobalEvent && <MissionCard event={nextGlobalEvent} isGlobal={true} />}
            <RecommendedSongs songs={songs} />

            <PostInputBox 
              user={user}
              newPostContent={newPostContent}
              setNewPostContent={setNewPostContent}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              isPosting={isPosting}
              postVisibility={postVisibility}
              setPostVisibility={setPostVisibility}
              handleImagePick={handleImagePick}
              handleCameraPick={handleCameraPick}
              handleCreatePost={handleCreatePost}
            />

            {renderLoadingFeedback()}

            {posts.length > 0 ? posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                user={user} 
                onDelete={handleDeletePost} 
                onLike={handleLike} 
                onComment={openComments} 
              />
            )) : (
              <EmptyState 
                title={STRINGS.feed.emptyState}
                description={STRINGS.feed.emptyStateSub}
                image={require('../../assets/empty_state.jpg')}
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

      <CommentsModal 
        visible={!!activeCommentPost}
        activeCommentPost={activeCommentPost}
        closeComments={closeComments}
        loadingComments={loadingComments}
        postComments={postComments}
        newCommentText={newCommentText}
        setNewCommentText={setNewCommentText}
        submitComment={submitComment}
        isCommenting={isCommenting}
      />

      <SwapScheduleModal 
        visible={swapModalVisible}
        swapReason={swapReason}
        setSwapReason={setSwapReason}
        onCancel={() => setSwapModalVisible(false)}
        onConfirm={handleRequestSwap}
      />

      <FeedbackModal 
        visible={feedbackModalVisible && !!pendingFeedbackEvent}
        pendingFeedbackEvent={pendingFeedbackEvent}
        feedbackSuccess={feedbackSuccess}
        feedbackRating={feedbackRating}
        setFeedbackRating={setFeedbackRating}
        feedbackComment={feedbackComment}
        setFeedbackComment={setFeedbackComment}
        onCancel={() => {setFeedbackModalVisible(false); setPendingFeedbackEvent(null);}}
        onSubmit={handleSubmitFeedback}
        isSubmitting={isSubmittingFeedback}
      />

      <CreateAnnouncementModal 
        visible={createAnnModalVisible}
        title={newAnnTitle}
        setTitle={setNewAnnTitle}
        content={newAnnContent}
        setContent={setNewAnnContent}
        days={newAnnDays}
        setDays={setNewAnnDays}
        onCancel={() => setCreateAnnModalVisible(false)}
        onSubmit={handleCreateAnnouncement}
        isPosting={isPostingAnn}
      />
    </View>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
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
  chatFABContainer: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    zIndex: 999,
  },
  chatFAB: {
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
    maxHeight: 45, // Fix height to prevent layout jumps
    minHeight: 45,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: 'rgba(107, 197, 167, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  instBadgeText: {
    color: theme.colors.accent,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  requestSwapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 197, 167, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.accent + '40',
    marginLeft: 10,
  },
  requestSwapBtnText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  swapRequestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  swapRequestedText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
