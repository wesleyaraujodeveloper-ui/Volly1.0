import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useState } from 'react';
import { Event } from '../../src/services/eventService';
import { useUpcomingEventsList, usePastEventsList } from '../../src/hooks/queries/useEvents';
import { Calendar } from 'react-native-calendars';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MagnifyingGlass, XCircle, CalendarBlank, List, Plus, CaretRight } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../src/store/useAppStore';
import { STRINGS } from '../../src/constants/strings';
import { EmptyState } from '../../src/components/EmptyState';

type ViewMode = 'LISTA' | 'CALENDARIO';
type ListTab = 'PROXIMOS' | 'HISTORICO';

export default function EventosScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('LISTA');
  const [listTab, setListTab] = useState<ListTab>('PROXIMOS');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const isLeader = user?.role === 'ADMIN' || user?.role === 'MASTER' || user?.role === 'LÍDER' || user?.role === 'CO-LÍDER';
  const instId = user?.access_level === 'MASTER' ? null : user?.institution_id;

  const isPast = listTab === 'HISTORICO' && !selectedDate;

  // React Query Hooks
  const { data: upcomingEvents = [], isLoading: loadingUpcoming } = useUpcomingEventsList({
    date: selectedDate || undefined,
    name: search || undefined,
    institutionId: instId
  });

  const { data: pastEvents = [], isLoading: loadingPast } = usePastEventsList(10, instId);

  const events = isPast ? pastEvents : upcomingEvents;
  const loading = isPast ? loadingPast : loadingUpcoming;

  const renderEventItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.eventCard} 
      onPress={() => router.push(`/events/${item.id}?readonly=${listTab === 'HISTORICO'}` as any)}
    >
      <View style={styles.dateBadge}>
        <Text style={styles.dayText}>{format(parseISO(item.event_date), 'dd')}</Text>
        <Text style={styles.monthText}>{format(parseISO(item.event_date), 'MMM', { locale: ptBR }).toUpperCase()}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventSubtitle}>
          {item.event_departments?.map((ed: any) => ed.departments?.name).join(', ') || 'Sem departamento'} • {format(parseISO(item.event_date), 'HH:mm')}{item.end_date ? ` - ${format(parseISO(item.end_date), 'HH:mm')}` : ''}
        </Text>
      </View>
      <CaretRight size={20} color={theme.colors.border} weight="bold" />
    </TouchableOpacity>
  );

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <MagnifyingGlass size={18} color={theme.colors.textSecondary} weight="bold" />
          <TextInput
            style={styles.searchInput}
            placeholder={selectedDate ? `Filtrando: ${format(parseISO(selectedDate), 'dd/MM/yyyy')}` : "Buscar eventos..."}
            placeholderTextColor={theme.colors.textSecondary}
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              if (selectedDate) setSelectedDate(null); // Limpa data ao digitar texto
            }}
          />
          {(search !== '' || selectedDate !== null) && (
            <TouchableOpacity onPress={() => { setSearch(''); setSelectedDate(null); }}>
              <XCircle size={20} color={theme.colors.textSecondary} weight="fill" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.modeToggle}
          onPress={() => setViewMode(viewMode === 'LISTA' ? 'CALENDARIO' : 'LISTA')}
        >
          {viewMode === 'LISTA' ? (
            <CalendarBlank size={24} color={theme.colors.primary} weight="regular" />
          ) : (
            <List size={24} color={theme.colors.primary} weight="regular" />
          )}
        </TouchableOpacity>
      </View>

      {viewMode === 'LISTA' ? (
        <>
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, listTab === 'PROXIMOS' && styles.activeTab]}
              onPress={() => setListTab('PROXIMOS')}
            >
              <Text style={[styles.tabText, listTab === 'PROXIMOS' && styles.activeTabText]}>Próximos</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, listTab === 'HISTORICO' && styles.activeTab]}
              onPress={() => setListTab('HISTORICO')}
            >
              <Text style={[styles.tabText, listTab === 'HISTORICO' && styles.activeTabText]}>Histórico</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id!}
              renderItem={renderEventItem}
              contentContainerStyle={{ paddingBottom: 80 }}
              ListEmptyComponent={
                <EmptyState 
                  title="Nenhum evento encontrado"
                  description="Tente ajustar sua busca ou mudar o filtro de data."
                  image={require('../../assets/images/illustrations/empty_illustration.png')}
                />
              }
            />
          )}
        </>
      ) : (
        <View style={styles.calendarContainer}>
          <Calendar
            theme={{
              backgroundColor: theme.colors.background,
              calendarBackground: theme.colors.background,
              textSectionTitleColor: theme.colors.primary,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.text,
              textDisabledColor: theme.colors.border,
              monthTextColor: theme.colors.text,
              arrowColor: theme.colors.primary,
            }}
            markedDates={events.reduce((acc: any, ev) => {
              const d = format(parseISO(ev.event_date), 'yyyy-MM-dd');
              acc[d] = { marked: true, dotColor: theme.colors.primary };
              return acc;
            }, {})}
            onDayPress={(day: any) => {
              setSelectedDate(day.dateString);
              setSearch(''); // Limpa busca por texto
              setViewMode('LISTA');
            }}
          />
        </View>
      )}

      {isLeader && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push('/events/new' as any)}
        >
          <Plus size={32} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    height: 45,
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  modeToggle: {
    width: 45,
    height: 45,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  activeTab: {
    backgroundColor: '#6BC5A7',
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateBadge: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    width: 60,
    marginRight: theme.spacing.md,
  },
  dayText: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  monthText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    opacity: 0.5,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
  calendarContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    padding: theme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
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
    shadowRadius: 10,
  },
});
