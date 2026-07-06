import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../theme/index';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WarningCircle, ArrowsLeftRight } from 'phosphor-react-native';
import { RoleIcon } from '../ui/RoleIcon';

interface PanoramaTimelineProps {
  loading: boolean;
  data: any[];
  user: any;
  onRequestSwap: (scheduleId: string) => void;
}

export function PanoramaTimeline({ loading, data, user, onRequestSwap }: PanoramaTimelineProps) {
  const { theme, globalStyles } = useTheme();
  const styles = getStyles(theme);
  if (loading) {
    return <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 40 }} />;
  }

  if (data.length === 0) {
    return <Text style={[styles.emptyText, { marginTop: 40 }]}>Nenhuma escala gerada no momento.</Text>;
  }

  return (
    <View style={{ marginTop: 10, paddingBottom: 80 }}>
      {data.map((ev: any) => {
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
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.panoramaSchName}>{sch.profiles?.full_name || 'Voluntário'}</Text>
                                <Text style={styles.panoramaSchRole}>{sch.roles?.name || 'Membro'}</Text>
                              </View>
                              <View style={{ paddingRight: 15 }}>
                                <RoleIcon name={sch.roles?.icon_name} size={18} color={theme.colors.primary} />
                              </View>
                            </View>

                           {sch.status === 'TROCA_SOLICITADA' ? (
                             <View style={styles.swapRequestedBadge}>
                               <WarningCircle size={12} color="#fff" weight="fill" />
                               <Text style={styles.swapRequestedText}>Troca Solicitada</Text>
                             </View>
                           ) : sch.user_id === user?.id && sch.status !== 'AUSENTE' ? (
                             <TouchableOpacity 
                               style={styles.requestSwapBtn} 
                               onPress={() => onRequestSwap(sch.id)}
                             >
                               <ArrowsLeftRight size={14} color={theme.colors.accent} weight="bold" />
                               <Text style={styles.requestSwapBtnText}>Trocar</Text>
                             </TouchableOpacity>
                           ) : null}
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
}

const getStyles = (theme: Theme) => StyleSheet.create({
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
    backgroundColor: theme.colors.accent,
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
    backgroundColor: theme.colors.accent,
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
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  swapRequestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  swapRequestedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  requestSwapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 197, 167, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  requestSwapBtnText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: 'bold',
  },
});
