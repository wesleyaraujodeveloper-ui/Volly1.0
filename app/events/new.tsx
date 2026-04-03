import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { eventService, Event } from '../../src/services/eventService';
import { supabase } from '../../src/services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

type CreateMode = 'NOVO' | 'COPIAR' | 'RECORRENTE';

export default function CreateEventScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<CreateMode>('NOVO');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('19:00');
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [chatWindow, setChatWindow] = useState('4');
  
  // Recurrence
  const [recType, setRecType] = useState<'SEMANAL' | 'MENSAL'>('SEMANAL');
  const [recCount, setRecCount] = useState('4');

  // Copy
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null);

  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    async function loadInitialData() {
      const { data: depts } = await supabase.from('departments').select('id, name');
      setDepartments(depts || []);
      
      const { data: past } = await eventService.listPastEvents(20);
      setPastEvents(past || []);
    }
    loadInitialData();
  }, []);

  const handleCreate = async () => {
    if (!title || !departmentId) {
      Alert.alert('Erro', 'Por favor, preencha o título e o departamento.');
      return;
    }

    setLoading(true);
    try {
      const fullDate = `${date}T${time}:00Z`;
      
      const baseEvent: Event = {
        title,
        description,
        department_id: departmentId,
        event_date: fullDate,
        chat_window_hours: parseInt(chatWindow) || 4
      };

      if (mode === 'NOVO') {
        const { error } = await eventService.createEvent(baseEvent);
        if (error) throw error;
      } else if (mode === 'COPIAR') {
        if (!selectedCopyId) throw new Error('Selecione um evento para copiar.');
        const { error } = await eventService.copyEvent(selectedCopyId, fullDate);
        if (error) throw error;
      } else {
        const { error } = await eventService.createRecurringEvents(baseEvent, recType, parseInt(recCount));
        if (error) throw error;
      }

      Alert.alert('Sucesso!', 'Evento(s) criado(s) com sucesso.');
      router.back();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={globalStyles.textTitle}>Criar Evento</Text>
      </View>

      <View style={styles.modeTabs}>
        {(['NOVO', 'COPIAR', 'RECORRENTE'] as CreateMode[]).map((m) => (
          <TouchableOpacity 
            key={m}
            style={[styles.modeTab, mode === m && styles.activeModeTab]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeTabText, mode === m && styles.activeModeTabText]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Título do Evento</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Culto de Celebração"
          placeholderTextColor={theme.colors.textSecondary}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Departamento Responsável</Text>
        <View style={styles.departmentsList}>
          {departments.map((dept) => (
            <TouchableOpacity 
              key={dept.id}
              style={[styles.deptBadge, departmentId === dept.id && styles.activeDeptBadge]}
              onPress={() => setDepartmentId(dept.id)}
            >
              <Text style={[styles.deptBadgeText, departmentId === dept.id && styles.activeDeptBadgeText]}>
                {dept.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Data (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="2024-04-20"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>Hora (HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="19:00"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </View>

        <Text style={styles.label}>Descrição (Opcional)</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Detalhes sobre o evento..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Janela de Chat (Horas)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={chatWindow}
              onChangeText={setChatWindow}
              placeholder="4"
            />
          </View>
        </View>

        {mode === 'COPIAR' && (
          <View style={styles.section}>
            <Text style={styles.label}>Evento Base para Cópia</Text>
            <View style={styles.copyList}>
              {pastEvents.map((ev) => (
                <TouchableOpacity 
                  key={ev.id}
                  style={[styles.copyItem, selectedCopyId === ev.id && styles.activeCopyItem]}
                  onPress={() => {
                    setSelectedCopyId(ev.id!);
                    setTitle(ev.title);
                  }}
                >
                  <Text style={[styles.copyItemText, selectedCopyId === ev.id && styles.activeCopyItemText]}>
                    {ev.title} ({format(new Date(ev.event_date), 'dd/MM/yy')})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {mode === 'RECORRENTE' && (
          <View style={styles.section}>
            <Text style={styles.label}>Configuração de Recorrência</Text>
            <View style={styles.row}>
               <TouchableOpacity 
                style={[styles.toggleBtn, recType === 'SEMANAL' && styles.activeToggleBtn]}
                onPress={() => setRecType('SEMANAL')}
              >
                <Text style={styles.toggleText}>Semanal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, recType === 'MENSAL' && styles.activeToggleBtn]}
                onPress={() => setRecType('MENSAL')}
              >
                <Text style={styles.toggleText}>Mensal</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.label, { marginTop: 12 }]}>Quantidade de Ocorrências</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={recCount}
              onChangeText={setRecCount}
            />
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, loading && { opacity: 0.7 }]} 
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#121212" />
        ) : (
          <Text style={styles.submitButtonText}>Confirmar Criação</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 4,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  activeModeTab: {
    backgroundColor: theme.colors.primary,
  },
  modeTabText: {
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  activeModeTabText: {
    color: '#121212',
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
  },
  departmentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  deptBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.pill,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeDeptBadge: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  deptBadgeText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  activeDeptBadgeText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  section: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  copyList: {
    maxHeight: 150,
    marginTop: theme.spacing.xs,
  },
  copyItem: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: 4,
  },
  activeCopyItem: {
    backgroundColor: theme.colors.primaryLight,
  },
  copyItemText: {
    color: theme.colors.text,
    fontSize: 13,
  },
  activeCopyItemText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  toggleBtn: {
    flex: 1,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    marginRight: 4,
  },
  activeToggleBtn: {
    backgroundColor: theme.colors.primaryLight,
  },
  toggleText: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    height: 55,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
