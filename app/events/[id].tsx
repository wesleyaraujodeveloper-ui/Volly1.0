import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Alert, ActivityIndicator, Linking } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { eventService, Event } from '../../src/services/eventService';
import { scheduleService, Schedule } from '../../src/services/scheduleService';
import { supabase } from '../../src/services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore } from '../../src/store/useAppStore';
import { chatService } from '../../src/services/chatService';
import { useRef } from 'react';

type Tab = 'INFO' | 'ESCALAS' | 'CHAT';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, providerToken } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('INFO');
  const [loading, setLoading] = useState(true);
  
  const [event, setEvent] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [playlist, setPlaylist] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [canChat, setCanChat] = useState(false);
  const [chatActive, setChatActive] = useState(true);
  const listRef = useRef<FlatList>(null);

  // Form states for adding songs
  const [newSong, setNewSong] = useState({ name: '', youtube: '', spotify: '' });
  
  // Selection states for schedules
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [balancedVolunteers, setBalancedVolunteers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    
    // Realtime chat
    const channel = supabase
      .channel(`event_chat_${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `event_id=eq.${id}` }, 
        (payload) => {
          // Recarregar mensagens para obter o profile name se necessário
          loadMessages();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function loadData() {
    setLoading(true);
    const { data: ev } = await eventService.getEventDetails(id);
    const { data: sch } = await scheduleService.listSchedulesByEvent(id);
    const { data: pl } = await supabase.from('playlists').select('*').eq('event_id', id).maybeSingle();
    
    if (ev) {
      setEvent(ev);
      // Busca funções de todos os departamentos vinculados ao evento
      const deptIds = ev.event_departments?.map((ed: any) => ed.departments?.id).filter(Boolean) || [];
      
      if (deptIds.length > 0) {
        const { data: r } = await supabase
          .from('roles')
          .select('*')
          .in('department_id', deptIds);
        setRoles(r || []);
      } else if (ev.department_id) {
        // Fallback para o campo antigo caso a junção falhe
        const { data: r } = await supabase.from('roles').select('*').eq('department_id', ev.department_id);
        setRoles(r || []);
      } else {
        setRoles([]);
      }
    }
    
    setSchedules(sch || []);
    if (pl) {
      setPlaylist(pl);
      setSongs(pl.links || []);
    }
    await loadMessages();

    if (ev && user) {
      const active = chatService.isChatActive(ev.event_date, ev.end_date);
      const can = await chatService.canUserPost(id, user.id, user.role || 'VOLUNTÁRIO');
      setChatActive(active);
      setCanChat(can);
    }

    setLoading(false);
  }

  async function loadMessages() {
    const { data: msg } = await supabase
      .from('messages')
      .select('*, profiles(full_name)')
      .eq('event_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    setMessages(msg || []);
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !canChat || !chatActive) return;
    
    const { error } = await chatService.sendMessage(id, user.id, newMessage.trim());

    if (!error) {
      setNewMessage('');
      // listRef.current?.scrollToOffset({ offset: 0, animated: true }); // Inverted list
    } else {
       Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
    }
  };

  const handleAddSong = async () => {
    if (!newSong.name) return;
    const updatedSongs = [...songs, newSong];
    
    const { error } = await supabase
      .from('playlists')
      .upsert({ event_id: id, name: 'Default', links: updatedSongs }, { onConflict: 'event_id' });

    if (!error) {
      setSongs(updatedSongs);
      setNewSong({ name: '', youtube: '', spotify: '' });
    }
  };

  const openSearchVolunteers = async (roleId: string) => {
    setSelectedRoleId(roleId);
    setIsAddingSchedule(true);
    const { data } = await scheduleService.getVolunteerBalancing(event.department_id, event.event_date);
    setBalancedVolunteers(data || []);
  };

  const assignVolunteer = async (userId: string) => {
    if (!selectedRoleId) return;
    const { error } = await scheduleService.assignVolunteer({
      event_id: id,
      user_id: userId,
      role_id: selectedRoleId,
      status: 'PENDENTE'
    }, providerToken);

    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      setIsAddingSchedule(false);
      loadData();
    }
  };

  if (loading) return <View style={[globalStyles.container, globalStyles.center]}><ActivityIndicator color={theme.colors.primary} /></View>;

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{event?.title}</Text>
          <Text style={styles.headerDate}>
            {event?.event_date && format(parseISO(event.event_date), "eeee, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
          </Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <TabButton title="Info" active={activeTab === 'INFO'} onPress={() => setActiveTab('INFO')} />
        <TabButton title="Escalas" active={activeTab === 'ESCALAS'} onPress={() => setActiveTab('ESCALAS')} />
        <TabButton title="Chat" active={activeTab === 'CHAT'} onPress={() => setActiveTab('CHAT')} />
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'INFO' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.infoContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sobre o Evento</Text>
                <Text style={styles.descriptionText}>{event?.description || 'Nenhuma descrição fornecida.'}</Text>
                <View style={styles.deptBadge}>
                  <Ionicons name="pricetag-outline" size={12} color={theme.colors.primary} />
                  <Text style={styles.deptText}>
                    {event?.event_departments?.map((ed: any) => ed.departments?.name).join(', ') || 'Sem departamento'}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Playlist / Setlist</Text>
                {songs.map((song, index) => (
                  <View key={index} style={styles.songCard}>
                    <View style={{ flex: 1 }}><Text style={styles.songName}>{song.name}</Text></View>
                    <View style={styles.songActions}>
                      {song.youtube && (
                        <TouchableOpacity onPress={() => Linking.openURL(song.youtube)}>
                          <Ionicons name="logo-youtube" size={20} color="#FF0000" style={styles.songIcon} />
                        </TouchableOpacity>
                      )}
                      {song.spotify && (
                        <TouchableOpacity onPress={() => Linking.openURL(song.spotify)}>
                          <Ionicons name="musical-notes" size={20} color="#1DB954" style={styles.songIcon} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}

                <View style={styles.addSongForm}>
                  <TextInput
                    style={styles.songInput}
                    placeholder="Nome da música"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={newSong.name}
                    onChangeText={(t) => setNewSong({ ...newSong, name: t })}
                  />
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.songInput, { flex: 1, marginRight: 4 }]}
                      placeholder="Link YouTube"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={newSong.youtube}
                      onChangeText={(t) => setNewSong({ ...newSong, youtube: t })}
                    />
                    <TextInput
                      style={[styles.songInput, { flex: 1, marginLeft: 4 }]}
                      placeholder="Link Spotify"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={newSong.spotify}
                      onChangeText={(t) => setNewSong({ ...newSong, spotify: t })}
                    />
                  </View>
                  <TouchableOpacity style={styles.confirmAddSong} onPress={handleAddSong}>
                    <Text style={styles.confirmAddSongText}>Adicionar Música</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        )}

        {activeTab === 'ESCALAS' && (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.scalesContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Composição da Equipe</Text>
                {roles.map((role) => {
                  const assigned = schedules.find(s => s.role_id === role.id);
                  return (
                    <View key={role.id} style={styles.roleAssignmentRow}>
                      <View style={styles.roleLabelArea}><Text style={styles.roleLabel}>{role.name}</Text></View>
                      <View style={styles.assigneeArea}>
                        {assigned ? (
                          <View style={styles.assignedUserCard}>
                            <Text style={styles.assignedUserName}>{assigned.profiles?.full_name}</Text>
                            <TouchableOpacity onPress={() => scheduleService.removeSchedule(assigned.id!, providerToken).then(() => loadData())}>
                              <Ionicons name="close-circle" size={18} color={theme.colors.error} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.emptyAssignButton} onPress={() => openSearchVolunteers(role.id)}>
                            <Text style={styles.emptyAssignText}>+ Escalar Alguém</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}

        {activeTab === 'CHAT' && (
          <View style={styles.chatContainer}>
            <FlatList
              ref={listRef}
              data={messages}
              inverted
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 10 }}
              renderItem={({ item }) => (
                <View style={[styles.messageBubble, item.user_id === user?.id && styles.myMessage]}>
                   <Text style={[styles.messageUser, item.user_id === user?.id && { color: '#121212' }]}>
                     {item.profiles?.full_name || 'Usuário'}
                   </Text>
                   <Text style={[styles.messageContent, item.user_id === user?.id && { color: '#121212' }]}>
                     {item.content}
                   </Text>
                   <Text style={[styles.messageTime, item.user_id === user?.id && { color: 'rgba(0,0,0,0.5)' }]}>
                     {format(new Date(item.created_at), 'HH:mm')}
                   </Text>
                </View>
              )}
            />
            
            {!chatActive ? (
              <View style={styles.chatLocked}>
                <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.chatLockedText}>Chat encerrado para este evento.</Text>
              </View>
            ) : !canChat ? (
              <View style={styles.chatLocked}>
                <Ionicons name="warning" size={20} color={theme.colors.primary} />
                <Text style={styles.chatLockedText}>Apenas voluntários escalados ou líderes podem falar aqui.</Text>
              </View>
            ) : (
              <View style={styles.inputArea}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Diga algo aos voluntários..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newMessage}
                  onChangeText={setNewMessage}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                  <Ionicons name="send" size={20} color="#121212" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {isAddingSchedule && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sugeridos (Menos Escalados)</Text>
              <TouchableOpacity onPress={() => setIsAddingSchedule(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={balancedVolunteers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.volunteerItem} onPress={() => assignVolunteer(item.id)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.volunteerName}>{item.name}</Text>
                    <Text style={styles.volunteerCount}>{item.count} escalas este mês</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function TabButton({ title, active, onPress }: { title: string, active: boolean, onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabItem, active && styles.activeTabItem]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  headerInfo: {
    marginLeft: theme.spacing.md,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerDate: {
    color: theme.colors.primary,
    fontSize: 12,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  infoContent: {},
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
  },
  descriptionText: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
    fontSize: 14,
  },
  deptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  deptText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  songName: {
    color: theme.colors.text,
    fontSize: 14,
  },
  songActions: {
    flexDirection: 'row',
  },
  songIcon: {
    marginLeft: 12,
  },
  addSongForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background,
  },
  songInput: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
  },
  confirmAddSong: {
    backgroundColor: theme.colors.primaryLight,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmAddSongText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 13,
  },
  scalesContent: {},
  roleAssignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  roleLabelArea: {
    width: 100,
  },
  roleLabel: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  assigneeArea: {
    flex: 1,
  },
  assignedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    padding: 8,
    borderRadius: 8,
  },
  assignedUserName: {
    color: theme.colors.text,
    fontSize: 14,
  },
  emptyAssignButton: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyAssignText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
  },
  messageBubble: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 12,
    borderTopLeftRadius: 2,
    marginBottom: 10,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: theme.colors.primaryDark,
    alignSelf: 'flex-end',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 2,
  },
  messageUser: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageContent: {
    color: theme.colors.text,
    fontSize: 14,
  },
  messageTime: {
    color: theme.colors.textSecondary,
    fontSize: 9,
    marginTop: 4,
    textAlign: 'right',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 10,
  },
  chatInput: {
    flex: 1,
    color: theme.colors.text,
    paddingHorizontal: 15,
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  volunteerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  volunteerName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  volunteerCount: {
    color: theme.colors.primary,
    fontSize: 12,
  },
  chatLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  chatLockedText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 8,
    fontWeight: 'bold',
  },
});
