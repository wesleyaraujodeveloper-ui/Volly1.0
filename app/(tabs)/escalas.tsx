import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { STRINGS } from '../../src/constants/strings';
import { EmptyState } from '../../src/components/EmptyState';
import { CustomModal } from '../../src/components/CustomModal';
import { availabilityService, Availability, Absence, UserDepartment } from '../../src/services/availabilityService';
import { eventService, Event } from '../../src/services/eventService';
import { scheduleService } from '../../src/services/scheduleService';
import { supabase } from '../../src/services/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type subTab = 'DISPONIBILIDADE' | 'ESCALAS' | 'MENSAL';

const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

export default function EscalasTabsScreen() {
  const { user, providerToken } = useAppStore();
  const [activeTab, setActiveTab] = useState<subTab>('DISPONIBILIDADE');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados para Contexto (Departamentos)
  const [departments, setDepartments] = useState<UserDepartment[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  // Estados para Disponibilidade
  const [monthEvents, setMonthEvents] = useState<Event[]>([]);
  const [eventAvailabilities, setEventAvailabilities] = useState<any[]>([]);
  const [teamAvailabilities, setTeamAvailabilities] = useState<any[]>([]);
  const [userAbsences, setUserAbsences] = useState<Absence[]>([]);

  // Estados para Escalas (Aba 2)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventSchedules, setEventSchedules] = useState<any[]>([]);

  // Estados para Escala Mensal (Aba 3)
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [monthlyEvents, setMonthlyEvents] = useState<Event[]>([]);
  const [allMonthlySchedules, setAllMonthlySchedules] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Estado para Modal de Ausência
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [newAbsence, setNewAbsence] = useState({ start_date: '', end_date: '', description: '' });

  const isAdminOrLeader = user?.role === 'ADMIN' || user?.role === 'LÍDER' || user?.role === 'CO-LÍDER';

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedDeptId) {
      loadUpcomingEvents();
    }
  }, [selectedDeptId]);

  // Adiciona a assinatura de tempo real para atualizações de disponibilidade
  useEffect(() => {
    if (activeTab === 'DISPONIBILIDADE' && selectedDeptId && isAdminOrLeader) {
      const subscription = availabilityService.subscribeToAvailabilities(() => {
        // Quando alguém atualizar a disponibilidade, recarregamos sutilmente os dados da equipe
        if (monthEvents.length > 0) {
          const eventIds = monthEvents.map(e => e.id!);
          availabilityService.getEventAvailabilitiesForTeam(selectedDeptId, eventIds).then(res => {
            if (res.data) setTeamAvailabilities(res.data);
          });
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [activeTab, selectedDeptId, monthEvents, isAdminOrLeader]);

  useEffect(() => {
    if (selectedEventId) {
      loadEventSchedules();
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (activeTab === 'MENSAL' && selectedDeptId && selectedMonth) {
      loadMonthlyData();
    }
  }, [activeTab, selectedMonth, selectedDeptId]);

  useEffect(() => {
    setSelectedMonth(new Date());
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const { data: depts } = await availabilityService.getUserDepartments();
      if (depts && depts.length > 0) {
        setDepartments(depts);
        const initialDeptId = depts[0].department_id;
        setSelectedDeptId(initialDeptId);
      }
      
      const { data: abs } = await availabilityService.getAbsences();
      setUserAbsences(abs || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingEvents = async () => {
    if (!selectedDeptId) return;
    
    try {
      // 1. Busca os próximos eventos do departamento
      const { data: events } = await eventService.listUpcomingEvents({ 
        department_id: selectedDeptId 
      });
      
      const eventList = events || [];
      setUpcomingEvents(eventList);
      setMonthEvents(eventList); // Sincroniza a aba de disponibilidade

      // 2. Se houver eventos, busca as disponibilidades
      if (eventList.length > 0) {
        const eventIds = eventList.map(e => e.id!);
        
        // Disponibilidade Própria
        const { data: avail } = await availabilityService.getEventAvailability(eventIds);
        setEventAvailabilities(avail || []);

        // Se for Gestor, busca da Equipe inteira
        if (isAdminOrLeader) {
          const { data: tAvail } = await availabilityService.getEventAvailabilitiesForTeam(selectedDeptId, eventIds);
          setTeamAvailabilities(tAvail || []);
        }
        
        // Seleciona o primeiro evento por padrão para a aba de Escalas
        setSelectedEventId(eventList[0].id!);
      } else {
        setEventAvailabilities([]);
        setTeamAvailabilities([]);
        setSelectedEventId(null);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadEventSchedules = async () => {
    try {
      const { data } = await scheduleService.listSchedulesByEvent(selectedEventId!);
      setEventSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadMonthlyData = async () => {
    if (!selectedDeptId || !selectedMonth) return;
    setLoading(true);
    try {
      const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString().split('T')[0];

      // 1. Buscar roles do depto
      const { data: deptRoles } = await supabase.from('roles').select('*').eq('department_id', selectedDeptId);
      setRoles(deptRoles || []);

      // 2. Buscar eventos no intervalo
      const { data: events } = await eventService.listUpcomingEvents({ date: undefined }); // Limpa o "upcoming" e usa range?
      // Melhor usar filtro de data customizado
      const { data: mEvents } = await supabase
        .from('events')
        .select('*, event_departments!inner(*)')
        .eq('event_departments.department_id', selectedDeptId)
        .gte('event_date', `${start}T00:00:00Z`)
        .lte('event_date', `${end}T23:59:59Z`)
        .order('event_date', { ascending: true });
      
      setMonthlyEvents(mEvents || []);

      // 3. Buscar TODAS as escalas desses eventos
      if (mEvents && mEvents.length > 0) {
        const { data: mSchedules } = await supabase
          .from('schedules')
          .select('*, profiles(full_name), roles(id, name)')
          .in('event_id', mEvents.map((e: any) => e.id));
        setAllMonthlySchedules(mSchedules || []);
      } else {
        setAllMonthlySchedules([]);
      }
    } catch (error) {
      console.error('Error monthly data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      const promises = eventAvailabilities.map(a => 
        availabilityService.updateEventAvailability(a.event_id, a.periods, a.is_available)
      );
      await Promise.all(promises);
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
      const { error } = await availabilityService.addAbsence(
        startDb, 
        endDb, 
        newAbsence.description
      );
      if (error) throw error;
      setShowAbsenceModal(false);
      setNewAbsence({ start_date: '', end_date: '', description: '' });
      loadInitialData();
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
    if (!selectedEventId || !selectedDeptId) return;
    setSaving(true);
    const { error, data } = await scheduleService.autoGenerateSchedule(selectedEventId, selectedDeptId, providerToken);
    
    if (error) {
      showAlert('Atenção', error, 'info');
    } else {
      showAlert('Sucesso', `Escalas sugeridas com sucesso! ${data?.length || 0} voluntários alocados.`, 'success');
      loadEventSchedules();
    }
    setSaving(false);
  };

  const handleCompleteScale = async () => {
    if (!selectedEventId) return;
    setSaving(true);
    const { error } = await scheduleService.completeAndNotify(selectedEventId);
    if (error) {
      showAlert('Erro', 'Erro ao concluir escalas.', 'danger');
    } else {
      showAlert('Sucesso', 'Escalas concluídas e voluntários notificados!', 'success');
      loadEventSchedules();
    }
    setSaving(false);
  };

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
            image={require('../../assets/images/illustrations/empty_state.png')}
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
                      <Ionicons name="checkmark-circle-outline" size={18} color={avail?.is_available === true ? '#000' : theme.colors.textSecondary} />
                      <Text style={[styles.availOptionText, avail?.is_available === true && { color: '#000', fontWeight: 'bold' }]}>Vou</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.availOptionBtn, avail?.is_available === false && styles.availOptionBtnError]} 
                      onPress={() => setAvailabilityStatus(event.id!, false)}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={avail?.is_available === false ? '#fff' : theme.colors.textSecondary} />
                      <Text style={[styles.availOptionText, avail?.is_available === false && { color: '#fff', fontWeight: 'bold' }]}>Não vou</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {isAdminOrLeader && (
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
                )}
              </View>
            );
          })
        )}

        <View style={styles.absenceHeader}>
          <Text style={styles.sectionTitle}>Bloqueio de data</Text>
          <TouchableOpacity onPress={() => setShowAbsenceModal(true)}>
            <Ionicons name="add-circle" size={32} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {userAbsences.map(absence => (
          <View key={absence.id} style={styles.absenceCard}>
            <View style={styles.absenceInput}>
              <Text style={styles.labelSmall}>{absence.description || 'Período de ausência'}</Text>
              <Text style={styles.dateText}>{new Date(absence.start_date).toLocaleDateString(undefined, { timeZone: 'UTC' })} - {new Date(absence.end_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</Text>
            </View>
            <TouchableOpacity onPress={() => availabilityService.removeAbsence(absence.id!).then(loadInitialData)}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
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
            style={[styles.primaryButton, { backgroundColor: '#333' }]} 
            onPress={handleAutoGenerateScale}
            disabled={saving}
          >
            <Text style={[styles.buttonText, { color: theme.colors.primary }]}>Gerar escalas automáticamente</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.primaryButton, { marginTop: 10 }]} 
            onPress={handleCompleteScale} 
            disabled={saving}
          >
            <Text style={styles.buttonText}>Concluir escala e Notificar</Text>
          </TouchableOpacity>
        </View>
      )}

      {upcomingEvents.length > 0 ? (
        upcomingEvents.map((event) => {
          const isSelected = selectedEventId === event.id;
          const eventDate = parseISO(event.event_date);
          
          return (
            <View key={event.id} style={styles.eventGroup}>
              <TouchableOpacity 
                style={[styles.eventHeaderRow, isSelected && styles.activeEventHeader]}
                onPress={() => setSelectedEventId(event.id!)}
              >
                <View style={styles.eventDateGroup}>
                  <Text style={styles.eventDayName}>{format(eventDate, 'eee', { locale: ptBR })}</Text>
                  <Text style={styles.eventDayNumber}>{format(eventDate, 'dd', { locale: ptBR })}</Text>
                </View>
                <View style={styles.eventTitleGroup}>
                  <Text style={styles.eventTimeText}>{format(eventDate, 'HH:mm', { locale: ptBR })}</Text>
                  <Text style={styles.eventTitleText}>{event.title}</Text>
                </View>
                <Ionicons name={isSelected ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {isSelected && (
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
                          <View style={[styles.smallDot, { backgroundColor: sch.status === 'CONFIRMADO' ? theme.colors.success : '#ff9000' }]} />
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
          image={require('../../assets/images/illustrations/empty_state.png')}
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
              <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.dateRangeText}>
              {selectedMonth ? format(selectedMonth, 'MMMM / yyyy', { locale: ptBR }) : '...'}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="download-outline" size={18} color="#000" />
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

      <CustomModal 
        visible={modalVisible}
        title={modalData.title}
        message={modalData.message}
        type={modalData.type}
        onConfirm={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
        confirmText="OK"
      />
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
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
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
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  tabButtonText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: 'normal',
  },
  activeTabButtonText: {
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
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
    padding: 15,
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
});
