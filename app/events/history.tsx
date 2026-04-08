import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { eventService, Event } from '../../src/services/eventService';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, subDays } from 'date-fns';

export default function HistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  
  // Período padrão: Últimos 30 dias
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const { data } = await eventService.listHistory(startDate, endDate);
    setEvents(data || []);
    setLoading(false);
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={globalStyles.textTitle}>Histórico de Eventos</Text>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Filtrar Período (Máx 365 dias)</Text>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputLabel}>Desde</Text>
            <TextInput 
              style={styles.input} 
              value={startDate} 
              onChangeText={setStartDate} 
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputLabel}>Até</Text>
            <TextInput 
              style={styles.input} 
              value={endDate} 
              onChangeText={setEndDate} 
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={loadHistory}>
           <Ionicons name="search" size={18} color="#121212" />
           <Text style={styles.searchBtnText}>Aplicar Filtro</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id!}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.eventCard}
              onPress={() => router.push(`/events/${item.id}?tab=CHAT`)}
            >
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventMeta}>
                  {format(parseISO(item.event_date), 'dd/MM/yyyy')} • {format(parseISO(item.event_date), 'HH:mm')}
                </Text>
                <View style={styles.deptsRow}>
                   {item.event_departments?.map(ed => (
                     <View key={ed.departments.id} style={styles.deptBadge}>
                        <Text style={styles.deptText}>{ed.departments.name}</Text>
                     </View>
                   ))}
                </View>
              </View>
              <Ionicons name="chatbubbles-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.border} />
              <Text style={styles.emptyText}>Nenhum evento encontrado no período.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { marginRight: 12 },
  filterCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16, marginBottom: 20 },
  filterLabel: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 13, marginBottom: 12, textTransform: 'uppercase' },
  row: { flexDirection: 'row', marginBottom: 12 },
  inputLabel: { color: theme.colors.textSecondary, fontSize: 11, marginBottom: 4 },
  input: { backgroundColor: theme.colors.background, color: theme.colors.text, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  searchBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10 },
  searchBtnText: { color: '#121212', fontWeight: 'bold', marginLeft: 8 },
  eventCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: theme.colors.border },
  eventInfo: { flex: 1 },
  eventTitle: { color: theme.colors.text, fontWeight: 'bold', fontSize: 15 },
  eventMeta: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 },
  deptsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  deptBadge: { backgroundColor: theme.colors.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 6, marginBottom: 4 },
  deptText: { color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: theme.colors.textSecondary, marginTop: 12 }
});
