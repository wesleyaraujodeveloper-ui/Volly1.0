import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../theme/index';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CaretRight, Users } from 'phosphor-react-native';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { EventDetailsModal } from '../modals/EventDetailsModal';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Desktop } from 'phosphor-react-native';
import { HolyricsExportModal } from '../modals/HolyricsExportModal';
import { songService, EventSong } from '../../services/songService';
import { RoleIcon } from '../ui/RoleIcon';

interface MissionCardProps {
  event: any;
  role?: any;
  isGlobal?: boolean;
}

export function MissionCard({ event, role, isGlobal = false }: MissionCardProps) {
  const { theme, globalStyles } = useTheme();
  const styles = getStyles(theme);
  const [modalVisible, setModalVisible] = useState(false);
  const [holyricsModalVisible, setHolyricsModalVisible] = useState(false);
  const [songs, setSongs] = useState<EventSong[]>([]);
  const { user } = useAppStore();
  const eventDate = new Date(event.event_date);

  const canExportHolyrics = user?.role === 'MASTER' || user?.role === 'ADMIN' || 
    (event?.event_departments?.some((ed: any) => ed.departments?.can_export_holyrics) ?? false);

  const handleOpenHolyrics = async () => {
    const { data } = await songService.getEventSongs(event.id);
    if (data) {
      setSongs(data);
      setHolyricsModalVisible(true);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {isGlobal ? 'Nosso próximo compromisso!' : 'Sua Próxima Missão'}
      </Text>
      <TouchableOpacity 
        style={styles.missionCard} 
        activeOpacity={0.9}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.missionHeader}>
          <View style={[styles.missionTag, isGlobal && { backgroundColor: theme.colors.surfaceHighlight }]}>
            <Text style={[styles.missionTagText, isGlobal && { color: theme.colors.accent }]}>
              {isGlobal ? 'GERAL' : 'EM BREVE'}
            </Text>
          </View>
          <Text style={styles.missionTime}>{format(eventDate, 'HH:mm')}</Text>
        </View>
        
        <Text style={styles.missionTitle}>{event.title}</Text>
        
        {isGlobal ? (
          <Text style={styles.missionRole}>
            Data: <Text style={{ color: theme.colors.textSecondary }}>{format(eventDate, "dd 'de' MMMM", { locale: ptBR })}</Text>
          </Text>
        ) : (
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.missionRole}>Sua função: </Text>
            <RoleIcon name={role?.icon_name} size={14} color={theme.colors.accent} />
            <Text style={[styles.missionRole, { color: theme.colors.accent, marginLeft: 4 }]}>{role?.name || 'Geral'}</Text>
          </View>
        )}
        
        <View style={styles.missionFooter}>
          <View style={styles.deptInfo}>
            {event.event_departments?.[0]?.departments?.icon_url ? (
              <Image 
                source={{ uri: event.event_departments[0].departments.icon_url }} 
                style={{ width: 18, height: 18, borderRadius: 9 }} 
                contentFit="cover" 
              />
            ) : (
              <Users size={14} color={theme.colors.textSecondary} weight="regular" />
            )}
            <Text style={styles.deptName}>
              {isGlobal 
                ? 'Evento Geral' 
                : (event.event_departments?.[0]?.departments?.name || 'Equipe Principal')
              }
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {canExportHolyrics && (
              <TouchableOpacity 
                style={styles.holyricsSmallBtn}
                onPress={handleOpenHolyrics}
              >
                <Desktop size={14} color="#FFF" weight="bold" />
                <Text style={styles.holyricsSmallBtnText}>Holyrics</Text>
              </TouchableOpacity>
            )}
            <CaretRight size={18} color={theme.colors.accent} weight="bold" />
          </View>
        </View>
      </TouchableOpacity>

      <EventDetailsModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        event={event} 
        role={role} 
        isGlobal={isGlobal}
      />
      
      <HolyricsExportModal
        visible={holyricsModalVisible}
        onClose={() => setHolyricsModalVisible(false)}
        songs={songs}
      />
    </View>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
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
    borderLeftColor: theme.colors.accent,
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
    color: theme.colors.accent,
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
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  holyricsSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  holyricsSmallBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  }
});
