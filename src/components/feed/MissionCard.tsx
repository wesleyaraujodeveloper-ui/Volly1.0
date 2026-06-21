import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CaretRight, Users } from 'phosphor-react-native';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { theme } from '../../theme';
import { EventDetailsModal } from '../modals/EventDetailsModal';
import { useState } from 'react';

interface MissionCardProps {
  event: any;
  role?: any;
  isGlobal?: boolean;
}

export function MissionCard({ event, role, isGlobal = false }: MissionCardProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const eventDate = new Date(event.event_date);

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
            <Text style={[styles.missionTagText, isGlobal && { color: theme.colors.primary }]}>
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
          <Text style={styles.missionRole}>
            Sua função: <Text style={{ color: theme.colors.primary }}>{role?.name || 'Geral'}</Text>
          </Text>
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
          <CaretRight size={18} color={theme.colors.primary} weight="bold" />
        </View>
      </TouchableOpacity>

      <EventDetailsModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        event={event} 
        role={role} 
        isGlobal={isGlobal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
