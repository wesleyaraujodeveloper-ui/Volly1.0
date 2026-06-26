import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { X, CalendarBlank, Clock, Info, Users, MusicNotes } from 'phosphor-react-native';
import { theme } from '../../theme';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { songService } from '../../services/songService';

interface EventDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  event: any;
  role?: any;
  isGlobal?: boolean;
}

export function EventDetailsModal({ visible, onClose, event, role, isGlobal }: EventDetailsModalProps) {
  const router = useRouter();
  const [songs, setSongs] = useState<any[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);

  useEffect(() => {
    if (visible && event?.id) {
      loadSongs();
    } else {
      setSongs([]);
    }
  }, [visible, event?.id]);

  const loadSongs = async () => {
    setLoadingSongs(true);
    try {
      const { data, error } = await songService.getEventSongs(event.id);
      if (!error && data) {
        setSongs(data);
      }
    } catch (err) {
      console.error('Erro ao carregar músicas:', err);
    } finally {
      setLoadingSongs(false);
    }
  };

  if (!event) return null;

  const eventDate = new Date(event.event_date);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Detalhes do Evento</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.colors.textSecondary} weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <Text style={styles.eventName}>{event.title}</Text>
            
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <CalendarBlank size={20} color={theme.colors.primary} />
                <Text style={styles.infoText}>
                  {format(eventDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Clock size={20} color={theme.colors.primary} />
                <Text style={styles.infoText}>{format(eventDate, "HH:mm")}h</Text>
              </View>

              {role && (
                <View style={styles.infoRow}>
                  <Users size={20} color={theme.colors.primary} />
                  <Text style={styles.infoText}>Sua Função: <Text style={{fontWeight: 'bold', color: theme.colors.text}}>{role.name}</Text></Text>
                </View>
              )}
            </View>

            {!!event.description && (
              <View style={styles.descriptionBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Info size={18} color={theme.colors.textSecondary} />
                  <Text style={styles.descriptionTitle}>Descrição / Observações</Text>
                </View>
                <Text style={styles.descriptionText}>{event.description}</Text>
              </View>
            )}

            {/* Preview da Playlist */}
            <View style={styles.playlistBox}>
              <View style={styles.playlistHeader}>
                <MusicNotes size={18} color={theme.colors.textSecondary} />
                <Text style={styles.playlistTitle}>Músicas do Evento</Text>
              </View>

              {loadingSongs ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ padding: 10 }} />
              ) : songs.length > 0 ? (
                <View style={styles.songList}>
                  {songs.map((song, index) => (
                    <View key={song.id || index} style={styles.songItem}>
                      <Text style={styles.songNumber}>{index + 1}.</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.songName} numberOfLines={1}>
                          {song.global_song?.title || 'Música desconhecida'}
                        </Text>
                        <Text style={styles.songArtist} numberOfLines={1}>
                          {song.global_song?.artist || 'Artista desconhecido'}
                        </Text>
                      </View>
                      {song.tonalidade ? (
                        <View style={styles.toneTag}>
                          <Text style={styles.toneText}>{song.tonalidade}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyPlaylistText}>Nenhuma música adicionada ainda.</Text>
              )}
            </View>
            
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Esta é apenas uma visualização das informações básicas. Para detalhes complexos, procure a liderança.
              </Text>
            </View>

          </ScrollView>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Fechar</Text>
            </TouchableOpacity>

            {!isGlobal && (
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={() => {
                  onClose();
                  router.push(`/events/${event.id}` as any);
                }}
              >
                <Text style={styles.primaryButtonText}>Acessar Painel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    marginBottom: 20,
  },
  eventName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: theme.colors.surfaceHighlight,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    marginLeft: 10,
    textTransform: 'capitalize',
  },
  descriptionBox: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  descriptionTitle: {
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  descriptionText: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 12,
    borderRadius: 12,
  },
  warningText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  playlistBox: {
    backgroundColor: theme.colors.surfaceHighlight,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playlistTitle: {
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  songList: {
    gap: 8,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 12,
  },
  songNumber: {
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
    marginRight: 12,
    width: 20,
  },
  songName: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  songArtist: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  emptyPlaylistText: {
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  toneTag: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  toneText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
});
