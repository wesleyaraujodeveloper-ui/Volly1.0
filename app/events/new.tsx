import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, FlatList } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { eventService, Event } from '../../src/services/eventService';
import { supabase } from '../../src/services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInHours, parseISO } from 'date-fns';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// Configuração do calendário para PT-BR
LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
};
LocaleConfig.defaultLocale = 'pt-br';

export default function EventsScreen() {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<'NOVO' | 'GERENCIAR'>('NOVO');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- ESTADOS DO MODO NOVO ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');
  const [selectedDates, setSelectedDates] = useState<{[key: string]: any}>({});
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

  // --- ESTADOS DO MODO GERENCIAR ---
  const [futureEvents, setFutureEvents] = useState<Event[]>([]);

  useEffect(() => {
    loadInitialData();
  }, [activeMode]);

  const loadInitialData = async () => {
    setRefreshing(true);
    const { data: depts, error: deptsErr } = await supabase.from('departments').select('id, name');
    
    if (deptsErr) {
      console.error('Erro ao carregar departamentos:', deptsErr);
      Alert.alert('Erro de Banco', 'Não foi possível carregar os departamentos. Verifique se as tabelas existem.');
    } else {
      setDepartments(depts || []);
    }

    if (activeMode === 'GERENCIAR') {
      const { data, error: evErr } = await eventService.listUpcomingEvents();
      if (evErr) {
        console.error('Erro ao carregar eventos:', evErr);
        Alert.alert('Erro de Banco', 'Não foi possível carregar os eventos. Verifique se a tabela event_departments foi criada no Supabase.');
      } else {
        setFutureEvents(data || []);
      }
    }
    setRefreshing(false);
    setLoading(false);
  };

  const handleDayPress = (day: any) => {
    const dateString = day.dateString;
    const newSelectedDates = { ...selectedDates };
    if (newSelectedDates[dateString]) {
      delete newSelectedDates[dateString];
    } else {
      newSelectedDates[dateString] = { selected: true, selectedColor: theme.colors.primary, selectedTextColor: '#121212' };
    }
    setSelectedDates(newSelectedDates);
  };

  const handleCreateEvents = async () => {
    const dateKeys = Object.keys(selectedDates);
    if (!title || dateKeys.length === 0 || selectedDeptIds.length === 0) {
      Alert.alert('Atenção', 'Preencha o título, selecione ao menos uma data e um departamento.');
      return;
    }

    setLoading(true);
    try {
      const events: Event[] = dateKeys.map(dString => {
        // Lógica de Janela de Chat: 1h antes do início, 1h depois do fim.
        // Diferença entre (End + 1h) e (Start - 1h) = (End - Start) + 2h.
        const [hStart, mStart] = startTime.split(':').map(Number);
        const [hEnd, mEnd] = endTime.split(':').map(Number);
        
        const startISO = `${dString}T${startTime}:00-03:00`;
        const endISO = `${dString}T${endTime}:00-03:00`;
        
        // Janela de chat total em horas
        const diff = (hEnd + (mEnd/60)) - (hStart + (mStart/60));
        const chatWindowTotal = Math.ceil(diff + 2); 

        return {
          title,
          description,
          event_date: startISO,
          end_date: endISO,
          department_ids: selectedDeptIds,
          chat_window_hours: chatWindowTotal
        };
      });

      const { error } = await eventService.createEvents(events);
      
      if (error) {
        throw error;
      }

      // Reset form states
      setSelectedDates({});
      setTitle('');
      setDescription('');
      setSelectedDeptIds([]);

      // 1. Switch tab first so the render happens
      setActiveMode('GERENCIAR');
      
      // 2. Fetch the new list immediately to ensure it's updated when the tab renders
      const { data: reloaded } = await eventService.listUpcomingEvents();
      if (reloaded) {
        setFutureEvents(reloaded);
      }

      // 3. Show success alert
      Alert.alert('Sucesso!', `${events.length} evento(s) criado(s).`);
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = (id: string) => {
    Alert.alert('Excluir Evento', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await eventService.deleteEvent(id);
        loadInitialData();
      }}
    ]);
  };

  const handleCopyEvent = (ev: Event) => {
    // Abre aba Novo com os dados pré-preenchidos (simplificado)
    setTitle(ev.title);
    setDescription(ev.description || '');
    setSelectedDeptIds(ev.event_departments?.map(d => d.departments.id) || []);
    setActiveMode('NOVO');
    Alert.alert('Copiado', 'Os dados do evento foram carregados. Selecione as novas datas no calendário.');
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={globalStyles.textTitle}>Eventos</Text>
      </View>

      <Text style={styles.question}>O que você deseja fazer?</Text>
      
      <View style={styles.modeTabs}>
        <TouchableOpacity 
          style={[styles.modeTab, activeMode === 'NOVO' && styles.activeModeTab]}
          onPress={() => setActiveMode('NOVO')}
        >
          <Ionicons name="add-circle" size={18} color={activeMode === 'NOVO' ? '#121212' : theme.colors.textSecondary} />
          <Text style={[styles.modeTabText, activeMode === 'NOVO' && styles.activeModeTabText]}>NOVO</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeTab, activeMode === 'GERENCIAR' && styles.activeModeTab]}
          onPress={() => setActiveMode('GERENCIAR')}
        >
          <Ionicons name="settings" size={18} color={activeMode === 'GERENCIAR' ? '#121212' : theme.colors.textSecondary} />
          <Text style={[styles.modeTabText, activeMode === 'GERENCIAR' && styles.activeModeTabText]}>GERENCIAR</Text>
        </TouchableOpacity>
      </View>

      {activeMode === 'NOVO' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <Text style={styles.label}>Título e Descrição</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Ensaio do Louvor"
              placeholderTextColor={theme.colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>Informações / Descrição</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Ex: Trazer partituras e chegar 15min antes..."
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            
            <Text style={styles.label}>Selecione as Datas no Calendário</Text>
            <View style={styles.calendarContainer}>
              <Calendar
                theme={{
                  calendarBackground: theme.colors.surface,
                  textSectionTitleColor: theme.colors.primary,
                  selectedDayBackgroundColor: theme.colors.primary,
                  todayTextColor: theme.colors.primary,
                  dayTextColor: theme.colors.text,
                  monthTextColor: theme.colors.text,
                  arrowColor: theme.colors.primary,
                }}
                markedDates={selectedDates}
                onDayPress={handleDayPress}
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Início (HH:mm)</Text>
                <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="19:00" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Fim (HH:mm)</Text>
                <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="21:00" />
              </View>
            </View>

            <Text style={styles.label}>Departamentos</Text>
            <View style={styles.deptsList}>
              {departments.map(d => {
                const isSelected = selectedDeptIds.includes(d.id);
                return (
                  <TouchableOpacity 
                    key={d.id} 
                    style={[styles.deptChip, isSelected && styles.activeDeptChip]}
                    onPress={() => setSelectedDeptIds(prev => isSelected ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                  >
                    <Text style={[styles.deptChipText, isSelected && styles.activeDeptChipText]}>{d.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateEvents} disabled={loading}>
              {loading ? <ActivityIndicator color="#121212" /> : <Text style={styles.submitBtnText}>Criar Eventos Selecionados</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.manageHeader}>
            <Text style={styles.label}>Eventos Futuros</Text>
            <TouchableOpacity style={styles.historyBtn} onPress={() => router.push('/events/history')}>
               <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
               <Text style={styles.historyBtnText}>Histórico</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={futureEvents}
            keyExtractor={item => item.id!}
            onRefresh={loadInitialData}
            refreshing={refreshing}
            renderItem={({ item }) => (
              <View style={styles.eventCard}>
                <View style={styles.eventMain}>
                   <Text style={styles.eventTitle}>{item.title}</Text>
                   <Text style={styles.eventDate}>{format(parseISO(item.event_date), 'dd/MM/yy')} • {format(parseISO(item.event_date), 'HH:mm')}</Text>
                </View>
                <View style={styles.eventActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleCopyEvent(item)}>
                    <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteEvent(item.id!)}>
                    <Ionicons name="trash-outline" size={20} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Nenhum evento futuro.</Text>}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backButton: { marginRight: 12 },
  question: { color: theme.colors.textSecondary, fontSize: 16, marginBottom: 20 },
  modeTabs: { flexDirection: 'row', backgroundColor: theme.colors.surface, padding: 4, borderRadius: 12, marginBottom: 20 },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  activeModeTab: { backgroundColor: theme.colors.primary },
  modeTabText: { color: theme.colors.textSecondary, fontWeight: 'bold', marginLeft: 8 },
  activeModeTabText: { color: '#121212' },
  formCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 16 },
  label: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: theme.colors.background, color: theme.colors.text, padding: 14, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  calendarContainer: { borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
  row: { flexDirection: 'row' },
  deptsList: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  deptChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8, marginBottom: 8 },
  activeDeptChip: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  deptChipText: { color: theme.colors.textSecondary, fontSize: 12 },
  activeDeptChipText: { color: '#121212', fontWeight: 'bold' },
  submitBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#121212', fontWeight: 'bold', fontSize: 16 },
  manageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary },
  historyBtnText: { color: theme.colors.primary, fontWeight: 'bold', marginLeft: 6, fontSize: 13 },
  eventCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  eventMain: { flex: 1 },
  eventTitle: { color: theme.colors.text, fontWeight: 'bold', fontSize: 15 },
  eventDate: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 },
  eventActions: { flexDirection: 'row' },
  actionBtn: { padding: 10, marginLeft: 5 },
  emptyText: { color: theme.colors.textSecondary, textAlign: 'center', marginTop: 40 }
});

