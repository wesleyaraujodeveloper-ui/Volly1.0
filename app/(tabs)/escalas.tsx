import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Image, Platform } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  PlusCircle, 
  Trash, 
  CheckSquare, 
  Square, 
  CaretUp, 
  CaretDown, 
  WarningCircle, 
  ArrowsLeftRight, 
  CaretLeft, 
  CaretRight, 
  DownloadSimple 
} from 'phosphor-react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { STRINGS } from '../../src/constants/strings';
import { EmptyState } from '../../src/components/EmptyState';
import { CustomModal } from '../../src/components/CustomModal';
import { availabilityService, Availability, Absence, UserDepartment } from '../../src/services/availabilityService';
import { eventService, Event } from '../../src/services/eventService';
import { scheduleService } from '../../src/services/scheduleService';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useUserDepartments, useUserAbsences, useUpcomingEventsByDept, 
  useEventAvailability, useTeamAvailability, useEventSchedules, 
  useMonthlyData, useUpdateAvailability, useAddAbsence, 
  useRemoveAbsence, useAutoGenerateSchedule, useCompleteSchedule, 
  useRequestSwap 
} from '../../src/hooks/queries/useSchedules';
import { supabase } from '../../src/services/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { useRef } from 'react';
import * as htmlToImage from 'html-to-image';

type subTab = 'DISPONIBILIDADE' | 'ESCALAS' | 'MENSAL';

const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

export default function EscalasTabsScreen() {
  const { user, providerToken } = useAppStore();
  const [activeTab, setActiveTab] = useState<subTab>('DISPONIBILIDADE');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const viewShotRef = useRef<any>(null);

  // Contexto
  const { data: departments = [], isLoading: loadingDepts } = useUserDepartments();
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  useEffect(() => {
    if (departments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(departments[0].department_id);
    }
  }, [departments]);

  // Consultas
  const { data: userAbsences = [] } = useUserAbsences();
  const { data: upcomingEvents = [], isLoading: loadingEvents } = useUpcomingEventsByDept(selectedDeptId);
  const pendingEvents = upcomingEvents.filter((e: any) => {
    if (!e.schedules || e.schedules.length === 0) return true;
    // Verifica se há alguma escala para o departamento selecionado
    return !e.schedules.some((s: any) => s.roles?.department_id === selectedDeptId);
  });
  const monthEvents = pendingEvents;

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);

  useEffect(() => {
    if (pendingEvents.length > 0 && !expandedEventId) {
      setExpandedEventId(pendingEvents[0].id!);
    } else if (pendingEvents.length === 0) {
      setExpandedEventId(null);
    }
  }, [pendingEvents]);

  const toggleEventSelection = (id: string) => {
    setSelectedEventIds(prev => 
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const eventIds = pendingEvents.map((e: any) => e.id!);
  
  const { data: serverAvailabilities = [] } = useEventAvailability(eventIds);
  const { data: teamAvailabilities = [] } = useTeamAvailability(selectedDeptId, eventIds);
  const [eventAvailabilities, setEventAvailabilities] = useState<any[]>([]);

  useEffect(() => {
    setEventAvailabilities(serverAvailabilities);
  }, [serverAvailabilities]);

  const { data: eventSchedules = [] } = useEventSchedules(expandedEventId);

  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const { data: monthlyData, isLoading: loadingMonthly } = useMonthlyData(selectedDeptId, selectedMonth);
  const monthlyEvents = monthlyData?.events || [];
  const allMonthlySchedules = monthlyData?.schedules || [];
  const roles = monthlyData?.roles || [];

  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [newAbsence, setNewAbsence] = useState({ start_date: '', end_date: '', description: '' });

  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [swapReason, setSwapReason] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  const loading = loadingDepts || loadingEvents;
  const isAdminOrLeader = user?.role === 'ADMIN' || user?.role === 'MASTER' || user?.role === 'LÍDER' || user?.role === 'CO-LÍDER';

  const updateAvailabilityMutation = useUpdateAvailability();
  const addAbsenceMutation = useAddAbsence();
  const removeAbsenceMutation = useRemoveAbsence();
  const autoGenerateScheduleMutation = useAutoGenerateSchedule();
  const completeScheduleMutation = useCompleteSchedule();
  const requestSwapMutation = useRequestSwap();

  useEffect(() => {
    if (activeTab === 'DISPONIBILIDADE' && selectedDeptId) {
      const subscription = availabilityService.subscribeToAvailabilities(() => {
        queryClient.invalidateQueries({ queryKey: ['teamAvailability'] });
      });
      return () => subscription.unsubscribe();
    }
  }, [activeTab, selectedDeptId]);

  const changeMonth = (offset: number) => {
    if (!selectedMonth) return;
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + offset, 1);
    setSelectedMonth(newMonth);
  };

  const setAvailabilityStatus = (eventId: string, status: boolean) => {
    const existing = eventAvailabilities.find(a => a.event_id === eventId);
    if (existing) {
      setEventAvailabilities(prev => prev.map(a => 
        a.event_id === eventId ? { ...a, is_available: status } : a
      ));
    } else {
      setEventAvailabilities(prev => [...prev, { 
        user_id: user?.id!, 
        event_id: eventId, 
        periods: [], 
        is_available: status 
      }]);
    }
  };

  const handleSaveAvailability = async () => {
    setSaving(true);
    try {
      await updateAvailabilityMutation.mutateAsync({ eventAvailabilities });
      showAlert('Sucesso', 'Sua disponibilidade para os eventos foi atualizada!', 'success');
    } catch (error) {
      showAlert('Erro', 'Não foi possível salvar as alterações.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const parseBrazilianDate = (ptStr: string) => {
    const parts = ptStr.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return ptStr;
  };

  const handleAddAbsence = async () => {
    const startDb = parseBrazilianDate(newAbsence.start_date);
    const endDb = parseBrazilianDate(newAbsence.end_date);

    if (!startDb || !endDb || startDb.length < 10) {
      showAlert('Erro', 'Por favor, preencha as datas completamente (DD/MM/AAAA).', 'danger');
      return;
    }
    try {
      await addAbsenceMutation.mutateAsync({ startDb, endDb, description: newAbsence.description });
      setShowAbsenceModal(false);
      setNewAbsence({ start_date: '', end_date: '', description: '' });
    } catch (error) {
      showAlert('Erro', 'Erro ao adicionar ausência.', 'danger');
    }
  };

  const handleDateMask = (text: string) => {
    let cleaned = ('' + text).replace(/\D/g, '');
    let match = cleaned.match(/^(\d{0,2})(\d{0,2})(\d{0,4})$/);
    if (!match) return cleaned.substring(0, 8);
    let formatted = match[1];
    if (match[2]) formatted += '/' + match[2];
    if (match[3]) formatted += '/' + match[3];
    return formatted;
  };
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ title: '', message: '', type: 'info' as 'info' | 'success' | 'danger' });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'danger' = 'info') => {
    setModalData({ title, message, type });
    setModalVisible(true);
  };

  const handleAutoGenerateScale = async () => {
    if (selectedEventIds.length === 0 || !selectedDeptId) {
      showAlert('Atenção', 'Selecione ao menos um evento.', 'info');
      return;
    }
    setSaving(true);
    try {
      let totalAlocados = 0;
      for (const eventId of selectedEventIds) {
        try {
          const data = await autoGenerateScheduleMutation.mutateAsync({ eventId, deptId: selectedDeptId, token: providerToken });
          if (data && data.length > 0) totalAlocados += data.length;
        } catch (error: any) {
          console.log(`Erro ao gerar para o evento ${eventId}:`, error.message);
        }
      }
      showAlert('Sucesso', `Processamento em lote finalizado! ${totalAlocados} voluntários alocados no total.`, 'success');
      setSelectedEventIds([]);
    } catch (error: any) {
      showAlert('Atenção', 'Ocorreu um erro durante o processamento em lote.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteScale = async () => {
    if (selectedEventIds.length === 0) {
      showAlert('Atenção', 'Selecione ao menos um evento.', 'info');
      return;
    }
    setSaving(true);
    try {
      for (const eventId of selectedEventIds) {
        try {
          await completeScheduleMutation.mutateAsync(eventId);
        } catch (err) {
          console.log(`Erro ao concluir evento ${eventId}`, err);
        }
      }
      showAlert('Sucesso', 'Escalas concluídas e voluntários notificados para os eventos selecionados!', 'success');
      setSelectedEventIds([]);
    } catch (error) {
      showAlert('Erro', 'Erro ao concluir escalas em lote.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestSwap = async () => {
    if (!selectedScheduleId) return;
    setSaving(true);
    try {
      await requestSwapMutation.mutateAsync({ scheduleId: selectedScheduleId, reason: swapReason });
      showAlert('Solicitação Enviada', 'Seu líder foi notificado sobre a sua necessidade de troca.', 'success');
      setSwapModalVisible(false);
      setSwapReason('');
    } catch (error: any) {
      showAlert('Erro', 'Não foi possível enviar a solicitação: ' + error.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadMonthlyScale = async () => {
    if (monthlyEvents.length === 0 || roles.length === 0) {
      showAlert('Atenção', 'Não há dados para exportar neste mês.', 'info');
      return;
    }

    setSaving(true);
    try {
      if (Platform.OS === 'web') {
        // PNG para Web usando html-to-image
        const node = document.getElementById('export-template');
        if (node) {
          // Aumentar a escala para melhor qualidade
          const dataUrl = await htmlToImage.toPng(node, {
            quality: 1,
            pixelRatio: 2,
            backgroundColor: '#000000'
          });
          
          const link = document.createElement('a');
          link.download = `Escala_${format(selectedMonth, 'MMMM_yyyy', { locale: ptBR })}.png`;
          link.href = dataUrl;
          link.click();
        } else {
          throw new Error('Template de exportação não encontrado');
        }
      } else {
        // PNG para Mobile usando ViewShot
        const uri = await captureRef(viewShotRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile'
        });
        
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartilhar Escala Mensal',
        });
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      showAlert('Erro', 'Ocorreu um erro ao gerar a imagem da escala.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const renderExportTemplate = () => (
    <View style={styles.exportTemplateContainer} nativeID="export-template">
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
        <View style={styles.exportContent}>
          <View style={styles.exportHeader}>
            <Text style={styles.exportAppTitle}>VOLLY APP</Text>
            <Text style={styles.exportTitle}>ESCALA MENSAL</Text>
            <Text style={styles.exportSubtitle}>
              {departments.find(d => d.department_id === selectedDeptId)?.departments.name.toUpperCase()} • {format(selectedMonth, 'MMMM / yyyy', { locale: ptBR }).toUpperCase()}
            </Text>
          </View>

          <View style={styles.exportTable}>
            <View style={styles.exportTableHeader}>
              <View style={[styles.exportCell, { width: 140, backgroundColor: '#1A1A1A' }]}>
                <Text style={styles.exportHeaderText}>FUNÇÃO</Text>
              </View>
              {monthlyEvents.map(ev => {
                const evDate = parseISO(ev.event_date);
                return (
                  <View key={ev.id} style={styles.exportDayHeader}>
                    <Text style={styles.exportDayNum}>{format(evDate, 'dd')}</Text>
                    <Text style={styles.exportDayName}>{format(evDate, 'eee', { locale: ptBR }).toUpperCase()}</Text>
                  </View>
                );
              })}
            </View>

            {roles.map((role) => (
              <View key={role.id} style={styles.exportTableRow}>
                <View style={[styles.exportCell, { width: 140 }]}>
                  <Text style={styles.exportRoleText}>{role.name}</Text>
                </View>
                {monthlyEvents.map(ev => {
                  const sch = allMonthlySchedules.find(s => s.event_id === ev.id && s.role_id === role.id);
                  return (
                    <View key={ev.id} style={styles.exportNameCell}>
                      <Text style={[styles.exportNameText, !sch && { color: '#444' }]}>
                        {sch ? sch.profiles?.full_name?.split(' ')[0] : '--'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.exportFooter}>
            <Text style={styles.exportFooterText}>Gerado via Volly App • Gestão Eficiente de Voluntários</Text>
          </View>
        </View>
      </ViewShot>
    </View>
  );

  const renderDepartmentChips = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.deptChipsContainer}
      contentContainerStyle={styles.deptChipsContent}
    >
      {departments.map((dept) => (
        <TouchableOpacity 
          key={dept.department_id} 
          style={[styles.deptChip, selectedDeptId === dept.department_id && styles.activeDeptChip]}
          onPress={() => setSelectedDeptId(dept.department_id)}
        >
          <Text style={[styles.deptChipText, selectedDeptId === dept.department_id && styles.activeDeptChipText]}>
            {dept.departments.name.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderTabHeader = () => (
    <View style={styles.tabHeader}>
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'DISPONIBILIDADE' && styles.activeTabButton]}
        onPress={() => setActiveTab('DISPONIBILIDADE')}
      >
        <Text style={[styles.tabButtonText, activeTab === 'DISPONIBILIDADE' && styles.activeTabButtonText]}>Disponibilidade</Text>
      </TouchableOpacity>

      {isAdminOrLeader && (
        <>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'ESCALAS' && styles.activeTabButton]}
            onPress={() => setActiveTab('ESCALAS')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'ESCALAS' && styles.activeTabButtonText]}>Escalas</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'MENSAL' && styles.activeTabButton]}
            onPress={() => setActiveTab('MENSAL')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'MENSAL' && styles.activeTabButtonText]}>Escala Mensal</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderDisponibilidade = () => {
    if (loading) return <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />;

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Dias disponíveis</Text>
        <Text style={styles.sectionSubtitle}>Aqui você atualizará os dias de disponibilidade da semana e também períodos de ausência programada.</Text>
        
        {monthEvents.length === 0 ? (
          <EmptyState 
            title="Nenhum evento neste departamento"
            description="Não há eventos programados para o período selecionado."
            image={require('../../assets/empty.png')}
          />
        ) : (
          monthEvents.map((event) => {
            const avail = eventAvailabilities.find(a => a.event_id === event.id);
            const isEnabled = avail ? avail.is_available : false;
            const eventDate = parseISO(event.event_date);
            
            return (
              <View key={event.id} style={styles.eventAvailCard}>
                <View style={styles.dayHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayName}>{event.title}</Text>
                    <Text style={styles.eventDateLabel}>{format(eventDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</Text>
                  </View>
                  <View style={styles.availabilityOptions}>
                    <TouchableOpacity 
                      style={[styles.availOptionBtn, avail?.is_available === true && styles.availOptionBtnSelected]} 
                      onPress={() => setAvailabilityStatus(event.id!, true)}
                    >
                      <CheckCircle size={18} color={avail?.is_available === true ? '#000' : theme.colors.textSecondary} weight={avail?.is_available === true ? 'fill' : 'regular'} />
                      <Text style={[styles.availOptionText, avail?.is_available === true && { color: '#000', fontWeight: 'bold' }]}>Vou</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.availOptionBtn, avail?.is_available === false && styles.availOptionBtnError]} 
                      onPress={() => setAvailabilityStatus(event.id!, false)}
                    >
                      <XCircle size={18} color={avail?.is_available === false ? '#fff' : theme.colors.textSecondary} weight={avail?.is_available === false ? 'fill' : 'regular'} />
                      <Text style={[styles.availOptionText, avail?.is_available === false && { color: '#fff', fontWeight: 'bold' }]}>Não vou</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.teamAvailList}>
                  <Text style={styles.teamAvailTitle}>Disponibilidade da Equipe:</Text>
                  {teamAvailabilities.filter(ta => ta.event_id === event.id).length > 0 ? (
                    teamAvailabilities
                      .filter(ta => ta.event_id === event.id)
                      .map((ta, idx) => (
                        <View key={idx} style={styles.memberStatusRow}>
                          <View style={styles.memberInfo}>
                            <Image 
                              source={{ uri: ta.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${ta.profiles?.full_name}` }} 
                              style={styles.memberAvatar} 
                            />
                            <Text style={styles.memberName}>{ta.profiles?.full_name}</Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: ta.is_available ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                            <Text style={[styles.statusBadgeText, { color: ta.is_available ? theme.colors.success : theme.colors.error }]}>
                              {ta.is_available ? 'Disponível' : 'Indisponível'}
                            </Text>
                          </View>
                        </View>
                      ))
                  ) : (
                    <Text style={styles.emptyTeamText}>Nenhum voluntário marcou disponibilidade ainda.</Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={styles.absenceHeader}>
          <View>
            <Text style={styles.sectionTitle}>Bloqueio de data</Text>
            <Text style={[styles.sectionSubtitle, { marginTop: 4 }]}>Informe o período que deseja estar fora da Escala</Text>
          </View>
          <TouchableOpacity onPress={() => setShowAbsenceModal(true)}>
            <PlusCircle size={32} color={theme.colors.primary} weight="fill" />
          </TouchableOpacity>
        </View>

        {userAbsences.map(absence => (
          <View key={absence.id} style={styles.absenceCard}>
            <View style={styles.absenceInput}>
              <Text style={styles.labelSmall}>{absence.description || 'Período de ausência'}</Text>
              <Text style={styles.dateText}>{new Date(absence.start_date).toLocaleDateString(undefined, { timeZone: 'UTC' })} - {new Date(absence.end_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</Text>
            </View>
            <TouchableOpacity onPress={() => removeAbsenceMutation.mutate(absence.id!)}>
              <Trash size={20} color={theme.colors.error} weight="regular" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.primaryButton} onPress={handleSaveAvailability} disabled={saving}>
          {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Salvar Disponibilidade</Text>}
        </TouchableOpacity>

        <Modal visible={showAbsenceModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Nova Ausência</Text>
              <TextInput 
                placeholder="Descrição (Ex: Viagem)" 
                placeholderTextColor="#666"
                style={styles.modalInput}
                onChangeText={(t) => setNewAbsence({...newAbsence, description: t})}
              />
              <TextInput 
                placeholder="Início (DD/MM/AAAA)" 
                placeholderTextColor="#666"
                style={styles.modalInput}
                keyboardType="numeric"
                maxLength={10}
                value={newAbsence.start_date}
                onChangeText={(t) => setNewAbsence({...newAbsence, start_date: handleDateMask(t)})}
              />
              <TextInput 
                placeholder="Fim (DD/MM/AAAA)" 
                placeholderTextColor="#666"
                style={styles.modalInput}
                keyboardType="numeric"
                maxLength={10}
                value={newAbsence.end_date}
                onChangeText={(t) => setNewAbsence({...newAbsence, end_date: handleDateMask(t)})}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowAbsenceModal(false)} style={[styles.modalButton, { backgroundColor: '#444' }]}>
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddAbsence} style={styles.modalButton}>
                  <Text style={styles.modalButtonText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  };

  const renderEscalasTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {isAdminOrLeader && (
        <View style={styles.adminActions}>
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: '#333', opacity: selectedEventIds.length === 0 ? 0.5 : 1 }]} 
            onPress={handleAutoGenerateScale}
            disabled={saving || selectedEventIds.length === 0}
          >
            <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
              Gerar escalas ({selectedEventIds.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.primaryButton, { marginTop: 10, opacity: selectedEventIds.length === 0 ? 0.5 : 1 }]} 
            onPress={handleCompleteScale} 
            disabled={saving || selectedEventIds.length === 0}
          >
            <Text style={styles.buttonText}>Concluir e Notificar ({selectedEventIds.length})</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAdminOrLeader && pendingEvents.length > 0 && (
        <View style={styles.selectAllRow}>
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => {
              if (selectedEventIds.length === pendingEvents.length) {
                setSelectedEventIds([]);
              } else {
                setSelectedEventIds(pendingEvents.map(e => e.id!));
              }
            }}
          >
            {selectedEventIds.length === pendingEvents.length ? (
              <CheckSquare size={24} color={theme.colors.primary} weight="fill" />
            ) : (
              <Square size={24} color={theme.colors.primary} weight="regular" />
            )}
            <Text style={styles.selectAllText}>Selecionar Todos os Eventos</Text>
          </TouchableOpacity>
        </View>
      )}

      {pendingEvents.length > 0 ? (
        pendingEvents.map((event) => {
          const isExpanded = expandedEventId === event.id;
          const isSelected = selectedEventIds.includes(event.id!);
          const eventDate = parseISO(event.event_date);
          
          return (
            <View key={event.id} style={styles.eventGroup}>
              <View style={[styles.eventHeaderRow, isExpanded && styles.activeEventHeader]}>
                {isAdminOrLeader && (
                  <TouchableOpacity 
                    style={styles.eventCheckbox}
                    onPress={() => toggleEventSelection(event.id!)}
                  >
                    {isSelected ? (
                      <CheckSquare size={24} color={theme.colors.primary} weight="fill" />
                    ) : (
                      <Square size={24} color={theme.colors.primary} weight="regular" />
                    )}
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.eventHeaderClickable}
                  onPress={() => setExpandedEventId(event.id!)}
                >
                  <View style={styles.eventDateGroup}>
                    <Text style={styles.eventDayName}>{format(eventDate, 'eee', { locale: ptBR })}</Text>
                    <Text style={styles.eventDayNumber}>{format(eventDate, 'dd', { locale: ptBR })}</Text>
                  </View>
                  <View style={styles.eventTitleGroup}>
                    <Text style={styles.eventTimeText}>{format(eventDate, 'HH:mm', { locale: ptBR })}</Text>
                    <Text style={styles.eventTitleText}>{event.title}</Text>
                  </View>
                  {isExpanded ? (
                    <CaretUp size={20} color={theme.colors.textSecondary} weight="bold" />
                  ) : (
                    <CaretDown size={20} color={theme.colors.textSecondary} weight="bold" />
                  )}
                </TouchableOpacity>
              </View>

              {isExpanded && (
                <View style={styles.scheduleTable}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.columnHeader, { width: 120 }]}>Função</Text>
                    <Text style={styles.columnHeader}>Voluntário</Text>
                  </View>
                  {eventSchedules.length > 0 ? (
                    eventSchedules.map((sch, index) => (
                      <View key={index} style={styles.tableRow}>
                        <View style={styles.roleCellSmall}>
                          <Text style={styles.roleTextSmall}>{sch.roles?.name}</Text>
                        </View>
                        <View style={styles.volunteerCell}>
                          <View style={styles.avatarMini} />
                          <Text style={styles.volunteerNameText}>{sch.profiles?.full_name}</Text>
                          
                          {sch.status === 'TROCA_SOLICITADA' ? (
                            <View style={styles.swapRequestedBadge}>
                              <WarningCircle size={12} color="#fff" weight="fill" />
                              <Text style={styles.swapRequestedText}>Troca Pedida</Text>
                            </View>
                          ) : (
                            <View style={[styles.smallDot, { backgroundColor: sch.status === 'CONFIRMADO' ? theme.colors.success : '#ff9000' }]} />
                          )}

                          {sch.user_id === user?.id && sch.status !== 'TROCA_SOLICITADA' && sch.status !== 'AUSENTE' && (
                            <TouchableOpacity 
                              style={styles.requestSwapBtn} 
                              onPress={() => {
                                setSelectedScheduleId(sch.id);
                                setSwapModalVisible(true);
                              }}
                            >
                              <ArrowsLeftRight size={14} color={theme.colors.primary} weight="bold" />
                              <Text style={styles.requestSwapBtnText}>Trocar</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyTableText}>Ninguém escalado.</Text>
                  )}
                </View>
              )}
            </View>
          );
        })
      ) : (
        <EmptyState 
          title="Sem eventos"
          description="Não há eventos próximos para gerenciar escalas neste grupo."
          image={require('../../assets/empty.png')}
        />
      )}
    </ScrollView>
  );

  const renderMensalTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.mensalHeader}>
        <View style={styles.mensalControls}>
          <View style={styles.dateControl}>
            <TouchableOpacity onPress={() => changeMonth(-1)}>
              <CaretLeft size={20} color={theme.colors.primary} weight="bold" />
            </TouchableOpacity>
            <Text style={styles.dateRangeText}>
              {selectedMonth ? format(selectedMonth, 'MMMM / yyyy', { locale: ptBR }) : '...'}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)}>
              <CaretRight size={20} color={theme.colors.primary} weight="bold" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={handleDownloadMonthlyScale}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <DownloadSimple size={18} color="#000" weight="bold" />
            )}
          </TouchableOpacity>
        </View>
      </View>

       <View style={styles.statusLegend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#ff9000' }]} /><Text style={styles.legendText}>Pendente</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: theme.colors.success }]} /><Text style={styles.legendText}>Confirmado</Text></View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { width: 100 }]}>Funções</Text>
            {monthlyEvents.map(ev => {
              const evDate = parseISO(ev.event_date);
              return (
                <View key={ev.id} style={styles.dayColumn}>
                  <View style={styles.dayBlockWrapper}>
                    <Text style={styles.dayHeaderNumber}>
                      {format(evDate, 'dd', { locale: ptBR })}
                    </Text>
                    <Text style={styles.dayHeaderText}>
                      {format(evDate, 'eee', { locale: ptBR }).replace('.', '').substring(0, 3)}
                    </Text>
                    <Text style={[styles.dayHeaderText, { color: theme.colors.primary, fontWeight: 'bold' }]}>
                      {format(evDate, 'HH:mm')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {roles.map((role) => (
            <View key={role.id} style={styles.tableRow}>
              <View style={styles.roleCell}>
                <Text style={styles.roleText} numberOfLines={3}>{role.name}</Text>
              </View>
              
              {monthlyEvents.map(ev => {
                const sch = allMonthlySchedules.find(s => s.event_id === ev.id && s.role_id === role.id);
                return (
                  <View key={ev.id} style={styles.nameCellDetailed}>
                    {sch ? (
                      <>
                        <View style={[styles.avatarSmall, { backgroundColor: sch.status === 'CONFIRMADO' ? theme.colors.success : '#ff9000' }]} />
                        <Text style={styles.nameTextSmall} numberOfLines={1}>{sch.profiles?.full_name?.split(' ')[0]}</Text>
                      </>
                    ) : (
                      <>
                        <View style={styles.avatarEmpty} />
                        <Text style={styles.nameTextSmallEmpty}>--</Text>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  );

  return (
    <View style={globalStyles.container}>
      {renderDepartmentChips()}
      {renderTabHeader()}
      {activeTab === 'DISPONIBILIDADE' && renderDisponibilidade()}
      {activeTab === 'ESCALAS' && renderEscalasTab()}
      {activeTab === 'MENSAL' && renderMensalTab()}
      
      {/* Template invisível para exportação de PNG */}
      {renderExportTemplate()}

      <CustomModal 
        visible={modalVisible}
        title={modalData.title}
        message={modalData.message}
        type={modalData.type}
        onConfirm={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
        confirmText="OK"
      />

      <Modal visible={swapModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Solicitar Troca de Escala</Text>
            <Text style={styles.modalSubtitle}>Explique brevemente ao seu líder o motivo da troca (opcional).</Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Ex: Tive um imprevisto no trabalho..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
              value={swapReason}
              onChangeText={setSwapReason}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setSwapModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmBtn} 
                onPress={handleRequestSwap}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.modalConfirmText}>Enviar Solicitação</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  deptChipsContainer: {
    maxHeight: 52,
    marginBottom: 8,
  },
  deptChipsContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
    height: '100%',
  },
  deptChip: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDeptChip: {
    backgroundColor: '#6BC5A7',
    borderColor: '#6BC5A7',
    // Sombra leve para destacar o ativo
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  deptChipText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
  },
  activeDeptChipText: {
    color: '#000',
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 2,
    borderRadius: 8,
    marginBottom: 15,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: 'rgba(107, 197, 167, 0.1)',
    borderWidth: 1,
    borderColor: '#6BC5A7',
  },
  tabButtonText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: 'normal',
  },
  activeTabButtonText: {
    color: '#6BC5A7',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 16,
  },
  dayCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 15,
    fontWeight: 'normal',
    color: theme.colors.text,
  },
  availabilityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  availOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  availOptionBtnSelected: {
    backgroundColor: '#6BC5A7',
    borderColor: '#6BC5A7',
  },
  availOptionBtnError: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  availOptionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  absenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 5,
  },
  absenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  absenceInput: {
    flex: 1,
  },
  labelSmall: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  adminActions: {
    marginBottom: 20,
  },
  statusLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  smallDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 5,
  },
  legendText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  eventGroup: {
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventCheckbox: {
    padding: 15,
    paddingRight: 5,
  },
  eventHeaderClickable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  selectAllRow: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectAllText: {
    marginLeft: 8,
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  activeEventHeader: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eventDateGroup: {
    alignItems: 'center',
    width: 60,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    marginRight: 15,
  },
  eventDayName: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
  },
  eventDayNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  eventTitleGroup: {
    flex: 1,
  },
  eventTimeText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  eventTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  scheduleTable: {
    backgroundColor: theme.colors.surfaceHighlight,
    padding: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 5,
  },
  columnHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  roleCellSmall: {
    width: 120,
  },
  roleTextSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
  },
  volunteerCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333',
    marginRight: 8,
  },
  volunteerNameText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyTableText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 11,
    padding: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    marginTop: 10,
    fontSize: 13,
  },
  mensalHeader: {
    marginBottom: 15,
  },
  mensalControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    height: 40,
  },
  dateRangeText: {
    fontSize: 13,
    color: theme.colors.text,
    marginHorizontal: 15,
  },
  exportButton: {
    backgroundColor: theme.colors.primary,
    height: 40,
    width: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayColumn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBlockWrapper: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  dayHeaderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  dayHeaderText: {
    fontSize: 10,
    fontWeight: 'normal',
    textTransform: 'uppercase',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  roleCell: {
    width: 100,
    justifyContent: 'center',
    paddingRight: 5,
  },
  roleText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  nameCellDetailed: {
    width: 60,
    alignItems: 'center',
    paddingVertical: 5,
  },
  eventDateLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize'
  },
  emptyEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20
  },
  avatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333',
    marginBottom: 2,
  },
  avatarEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    marginBottom: 2,
  },
  nameTextSmall: {
    fontSize: 9,
    color: theme.colors.textSecondary,
  },
  nameTextSmallEmpty: {
    fontSize: 8,
    color: theme.colors.border,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 10,
    padding: 15,
    color: theme.colors.text,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  eventAvailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  teamAvailList: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '40',
  },
  teamAvailTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  memberStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 10,
  },
  memberName: {
    color: theme.colors.text,
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyTeamText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 5,
  },
  requestSwapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
    marginLeft: 10,
  },
  requestSwapBtnText: {
    color: theme.colors.primary,
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
  reasonInput: {
    backgroundColor: theme.colors.surfaceHighlight,
    color: theme.colors.text,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    textAlignVertical: 'top',
    height: 80,
    marginBottom: 20,
    fontSize: 14,
  },
  modalSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: 15,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: '100%',
  },
  modalCancelBtn: {
    padding: 12,
    marginRight: 10,
  },
  modalCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalConfirmText: {
    color: '#000',
    fontWeight: 'bold',
  },
  // Estilos para Exportação PNG
  exportTemplateContainer: {
    position: 'absolute',
    left: -2000, // Fora da tela
    width: 1000, // Largura fixa para garantir qualidade
  },
  exportContent: {
    backgroundColor: '#000000',
    padding: 40,
    borderRadius: 0,
  },
  exportHeader: {
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#6BC5A7',
    paddingBottom: 20,
  },
  exportAppTitle: {
    fontFamily: 'CreamCake',
    fontSize: 48,
    color: '#6BC5A7',
    marginBottom: 5,
  },
  exportTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  exportSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  exportTable: {
    borderWidth: 1,
    borderColor: '#333',
  },
  exportTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
  },
  exportDayHeader: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#333',
    minWidth: 60,
  },
  exportDayNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6BC5A7',
  },
  exportDayName: {
    fontSize: 10,
    color: '#666',
  },
  exportTableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  exportCell: {
    padding: 12,
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
  },
  exportRoleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  exportHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  exportNameCell: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#333',
    minWidth: 60,
  },
  exportNameText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  exportFooter: {
    marginTop: 30,
    alignItems: 'center',
  },
  exportFooterText: {
    fontSize: 10,
    color: '#444',
    fontStyle: 'italic',
  }
});
