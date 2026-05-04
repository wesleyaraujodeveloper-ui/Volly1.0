import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../src/store/useAppStore';
import { adminService, Profile } from '../../src/services/adminService';
import { useVolunteers, useDepartments, useRoles, useLeaderDepartments } from '../../src/hooks/queries/useAdmin';
import { useQueryClient } from '@tanstack/react-query';
import { 
  LockSimple, 
  MagnifyingGlass, 
  CheckCircle, 
  WarningCircle, 
  Wrench, 
  Users, 
  PencilSimple, 
  UserPlus, 
  Trash, 
  X, 
  ShieldCheck, 
  Star, 
  User, 
  CheckSquare, 
  Square, 
  UserCircle, 
  XCircle,
  RadioButton
} from 'phosphor-react-native';
import { STRINGS } from '../../src/constants/strings';
import { EmptyState } from '../../src/components/EmptyState';
import { CustomModal } from '../../src/components/CustomModal';

export default function GestaoMembrosScreen() {
  const { user } = useAppStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'MEMBROS' | 'EQUIPES' | 'FUNÇÕES'>('MEMBROS');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; message: string; onConfirm: () => void; type: 'danger' | 'info' | 'success' }>({
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  const queryClient = useQueryClient();
  const instId = user?.access_level === 'MASTER' ? null : user?.institution_id;

  const { data: volunteers = [], isLoading: loadingVolunteers } = useVolunteers(instId);
  const { data: departments = [], isLoading: loadingDepts } = useDepartments(instId);
  const { data: roles = [], isLoading: loadingRoles } = useRoles();
  const { data: leaderTeamsData = [] } = useLeaderDepartments(user?.id);
  const leaderTeams = leaderTeamsData.map(d => d.id);

  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [selectedCoLeaderId, setSelectedCoLeaderId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const [searchTerm, setSearchTerm] = useState(''); 
  const [selectedInviteDeptId, setSelectedInviteDeptId] = useState<string | null>(null);
  const [managingTeamProfile, setManagingTeamProfile] = useState<Profile | null>(null);
  const [userDepts, setUserDepts] = useState<string[]>([]);
  const [deptChangingLeader, setDeptChangingLeader] = useState<string | null>(null);
  const [deptChangingCoLeader, setDeptChangingCoLeader] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<any | null>(null);


  const [newRoleName, setNewRoleName] = useState('');
  const [selectedDeptIdForRule, setSelectedDeptIdForRule] = useState<string>('');
  
  const [managingRoleProfile, setManagingRoleProfile] = useState<Profile | null>(null);
  const [userAssignedRoles, setUserAssignedRoles] = useState<string[]>([]);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    if (user?.role !== 'VOLUNTÁRIO') {
      // Assina múltiplas tabelas para atualização em tempo real
      subscription = adminService.subscribeToAdminChanges(() => {
        queryClient.invalidateQueries({ queryKey: ['volunteers'] });
        queryClient.invalidateQueries({ queryKey: ['departments'] });
        queryClient.invalidateQueries({ queryKey: ['roles'] });
        queryClient.invalidateQueries({ queryKey: ['leaderDepartments'] });
      });
    }
    
    if (user?.id && user?.role !== 'VOLUNTÁRIO' && leaderTeams.length === 1) {
       setSelectedInviteDeptId(leaderTeams[0]);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [user?.id, user?.role, leaderTeams.length, queryClient]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['volunteers'] });
    queryClient.invalidateQueries({ queryKey: ['departments'] });
    queryClient.invalidateQueries({ queryKey: ['roles'] });
  };

  const handleEmailChange = (text: string) => {
    let value = text.trim().toLowerCase();
    // Auto-preenche @gmail.com se o usuário digitar @ ao final do texto
    if (value.endsWith('@')) {
      value = value + 'gmail.com';
    }
    setEmail(value);
  };

  const isGmail = email.trim().toLowerCase().endsWith('@gmail.com');
  const isDeptSelected = !!selectedInviteDeptId;
  const isAdminOrMaster = user?.role === 'ADMIN' || user?.role === 'MASTER';
  const canInvite = isGmail && isDeptSelected && !loading;

  if (user?.role === 'VOLUNTÁRIO') {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <LockSimple size={64} color={theme.colors.primary} weight="fill" />
        <Text style={[globalStyles.textTitle, { marginTop: 20 }]}>Acesso Restrito</Text>
        <Text style={globalStyles.textBody}>Apenas Líderes e Admins podem acessar esta área.</Text>
      </View>
    );
  }

  const handleAddVolunteer = async () => {
    if (!['MASTER', 'ADMIN', 'LÍDER', 'CO-LÍDER'].includes(user?.role || '')) {
      Alert.alert('Erro', 'Usuário Não Autorizado a enviar Convite!');
      return;
    }

    let finalEmail = email.trim().toLowerCase();
    if (!finalEmail.includes('@')) {
      finalEmail += '@gmail.com';
    }

    if (!finalEmail.endsWith('@gmail.com')) {
      Alert.alert('E-mail Inválido', 'Apenas contas @gmail.com são permitidas.');
      return;
    }

    setLoading(true);
    const { error, emailError, emailSent } = await adminService.inviteVolunteer(finalEmail, name, selectedInviteDeptId, user.institution_id);
    if (error) {
      setModalData({
        title: 'Atenção',
        message: error.message,
        type: 'info',
        onConfirm: () => setModalVisible(false)
      });
      setModalVisible(true);
    } else {
      if (emailError) {
        setModalData({
          title: 'Convite Registrado',
          message: `O voluntário foi adicionado à lista, mas o e-mail de convite falhou: ${emailError}. Você pode pedir que ele se cadastre com este e-mail.`,
          type: 'info',
          onConfirm: () => setModalVisible(false)
        });
      } else {
        setModalData({
          title: 'Sucesso!',
          message: emailSent ? 'O convite foi enviado para o e-mail informado.' : 'O convite foi registrado com sucesso.',
          type: 'success',
          onConfirm: () => setModalVisible(false)
        });
      }
      setModalVisible(true);
      setEmail(''); setName('');
      if (leaderTeams.length !== 1) setSelectedInviteDeptId(null);
      refreshAll();
    }
    setLoading(false);
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim() || !selectedLeaderId) {
      Alert.alert('Erro', 'Nome e Líder são obrigatórios.');
      return;
    }
    setLoading(true);
    const { error } = await adminService.createDepartment(newDeptName, newDeptDesc, selectedLeaderId, selectedCoLeaderId || undefined, user.institution_id);
    setLoading(false);
    if (error) Alert.alert('Erro DB', error.message);
    else {
      setNewDeptName(''); setNewDeptDesc(''); setSelectedLeaderId(null); setSelectedCoLeaderId(null);
      refreshAll();
    }
  };

  const handleDeleteDepartment = (dept: any) => {
    setModalData({
      title: 'Excluir Equipe',
      message: `Deseja realmente excluir a equipe ${dept.name}? Esta ação é irreversível e removerá todos os vínculos desta equipe.`,
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        const { error } = await adminService.deleteDepartment(dept.id);
        setLoading(false);
        if (error) Alert.alert('Erro', error.message);
        else {
          refreshAll();
          setModalVisible(false);
        }
      }
    });
    setModalVisible(true);
  };

  const handleUpdateLeader = (deptId: string) => setDeptChangingLeader(deptId);

  const confirmUpdateLeader = async (leaderId: string) => {
    if (!deptChangingLeader) return;
    setLoading(true);
    const { error } = await adminService.updateDepartmentLeader(deptChangingLeader, leaderId);
    setLoading(false);
    if (error) Alert.alert('Erro', error.message);
    else {
      setDeptChangingLeader(null);
      refreshAll();
    }
  };
  
  const handleUpdateCoLeader = (deptId: string) => setDeptChangingCoLeader(deptId);

  const confirmUpdateCoLeader = async (coLeaderId: string | null) => {
    if (!deptChangingCoLeader) return;
    setLoading(true);
    const { error } = await adminService.updateDepartmentCoLeader(deptChangingCoLeader, coLeaderId);
    setLoading(false);
    if (error) Alert.alert('Erro', error.message);
    else {
      setDeptChangingCoLeader(null);
      refreshAll();
    }
  };

  const confirmDeleteAction = async () => {
    if (!deptToDelete) return;
    try {
      setLoading(true);
      const { error } = await adminService.deleteDepartment(deptToDelete.id);
      if (error) {
        Alert.alert('Erro ao Excluir', error.message);
      } else {
        setDeptToDelete(null);
        refreshAll();
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditDepartment = async () => {
    if (!editingDept || !editingDept.name.trim()) return;
    setLoading(true);
    const { error } = await adminService.updateDepartment(editingDept.id, editingDept.name, editingDept.description);
    setLoading(false);
    if (error) Alert.alert('Erro', error.message);
    else {
      setEditingDept(null);
      refreshAll();
    }
  };

  const handleManageUserTeams = async (p: Profile) => {
    setManagingTeamProfile(p);
    const { data } = await adminService.getUserDepartments(p.id!);
    if (data) setUserDepts(data.map((d: any) => d.department_id));
  };

  const toggleUserDept = (deptId: string) => {
    setUserDepts(prev => 
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const handleSaveTeams = async () => {
    if (!managingTeamProfile?.id) return;
    setLoading(true);
    
    try {
      // 1. Pega os vínculos atuais do banco para saber o que adicionar e o que remover
      const { data: currentDepts } = await adminService.getUserDepartments(managingTeamProfile.id);
      const currentIds = currentDepts?.map((d: any) => d.department_id) || [];
      
      // 2. Identifica mudanças
      const toAdd = userDepts.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !userDepts.includes(id));
      
      // 3. Executa as operações em paralelo
      const promises = [
        ...toAdd.map(id => adminService.manageUserDepartment(managingTeamProfile.id!, id, 'ADD')),
        ...toRemove.map(id => adminService.manageUserDepartment(managingTeamProfile.id!, id, 'REMOVE'))
      ];
      
      await Promise.all(promises);
      
      setManagingTeamProfile(null);
      refreshAll();
    } catch (error) {
      console.error('Save teams error:', error);
      Alert.alert('Erro', 'Não foi possível salvar todos os vínculos.');
    } finally {
      setLoading(false);
    }
  };

  const handleManageUserRoles = async (p: Profile) => {
    setManagingRoleProfile(p);
    const { data } = await adminService.getUserRoles(p.id!);
    if (data) setUserAssignedRoles(data.map((r: any) => r.role_id));
  };

  const toggleUserRoleAction = async (roleId: string) => {
    if (!managingRoleProfile?.id) return;
    const isAdding = !userAssignedRoles.includes(roleId);
    setUserAssignedRoles(prev => isAdding ? [...prev, roleId] : prev.filter(id => id !== roleId));
    const { error } = await adminService.toggleUserRole(managingRoleProfile.id, roleId, isAdding ? 'ADD' : 'REMOVE');
    if (error) Alert.alert('Erro', error.message);
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !selectedDeptIdForRule) return;
    setLoading(true);
    const { error } = await adminService.createDepartmentRole(selectedDeptIdForRule, newRoleName);
    setLoading(false);
    if (error) {
      Alert.alert('Erro ao criar Função', error.message);
    } else {
      setNewRoleName('');
      refreshAll();
    }
  };

  const updateRole = async (newRole: 'ADMIN' | 'LÍDER' | 'CO-LÍDER' | 'VOLUNTÁRIO') => {
    if (!selectedProfile?.id) return;
    setLoading(true);
    const { error } = await adminService.updateVolunteerRole(selectedProfile.id, newRole);
    setLoading(false);
    
    if (error) {
      Alert.alert('Erro', error.message || 'Falha ao alterar cargo.');
    } else {
      setSelectedProfile(null);
      refreshAll();
    }
  };

  const filteredVolunteers = volunteers.filter(v => {
    const search = searchTerm.toLowerCase();
    return (v.name?.toLowerCase() || '').includes(search) || 
           v.email.toLowerCase().includes(search) ||
           (v.teams && v.teams.some(team => team.toLowerCase().includes(search)));
  });

  return (
    <View style={globalStyles.container}>
      {/* HEADER */}
      <View style={styles.headerArea}>
        <Text style={globalStyles.textTitle}>Gestão de Equipes</Text>
        <Text style={globalStyles.textBody}>Administre membros e departamentos.</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'MEMBROS' && styles.activeTabItem]} onPress={() => setActiveTab('MEMBROS')}>
          <Text style={[styles.tabText, activeTab === 'MEMBROS' && styles.activeTabText]}>MEMBROS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'EQUIPES' && styles.activeTabItem]} onPress={() => setActiveTab('EQUIPES')}>
          <Text style={[styles.tabText, activeTab === 'EQUIPES' && styles.activeTabText]}>EQUIPES</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'FUNÇÕES' && styles.activeTabItem]} onPress={() => setActiveTab('FUNÇÕES')}>
          <Text style={[styles.tabText, activeTab === 'FUNÇÕES' && styles.activeTabText]}>FUNÇÕES</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={{ flex: 1 }}>
        {activeTab === 'MEMBROS' && (
          <FlatList
            data={filteredVolunteers}
            keyExtractor={(item) => item.id || item.email}
            ListEmptyComponent={
              <EmptyState 
                title={STRINGS.gestao.emptyState} 
                description={STRINGS.gestao.emptyStateSub} 
                image={require('../../assets/images/illustrations/empty_illustration.png')} 
              />
            }
            ListHeaderComponent={
              <View style={styles.formCard}>
                <View style={styles.searchArea}>
                  <MagnifyingGlass size={20} color={theme.colors.textSecondary} weight="bold" />
                  <TextInput style={styles.searchInput} placeholder="Buscar membro..." placeholderTextColor={theme.colors.textSecondary} value={searchTerm} onChangeText={setSearchTerm} />
                </View>
                <View style={styles.inputWithIcon}>
                  <TextInput 
                    style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                    placeholder="Nome do usuário ou e-mail" 
                    placeholderTextColor={theme.colors.textSecondary} 
                    value={email} 
                    onChangeText={handleEmailChange} 
                    autoCapitalize="none" 
                    keyboardType="email-address"
                  />
                  {email.length > 0 && (
                     isGmail ? (
                       <CheckCircle size={20} color={theme.colors.primary} weight="fill" style={{ marginLeft: 8 }} />
                     ) : (
                       <WarningCircle size={20} color={theme.colors.error} weight="fill" style={{ marginLeft: 8 }} />
                     )
                   )}
                </View>
                {!isGmail && email.length > 0 && (
                  <TouchableOpacity onPress={() => handleEmailChange(email + '@')}>
                    <Text style={{ color: theme.colors.primary, fontSize: 12, marginBottom: 12, fontWeight: 'bold' }}>
                      Clique para completar com @gmail.com
                    </Text>
                  </TouchableOpacity>
                )}
                
                {(isAdminOrMaster || leaderTeams.length > 0) && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.inputLabel}>Vincular à Equipe:</Text>
                    <View style={styles.chipsContainer}>
                      {(isAdminOrMaster ? departments : departments.filter(d => leaderTeams.includes(d.id))).map(dept => (
                        <TouchableOpacity 
                          key={dept.id} 
                          style={[
                            styles.chip, 
                            selectedInviteDeptId === dept.id && styles.chipSelected
                          ]} 
                          onPress={() => setSelectedInviteDeptId(selectedInviteDeptId === dept.id ? null : dept.id)}
                        >
                          <Text style={[
                            styles.chipText, 
                            selectedInviteDeptId === dept.id && styles.chipTextSelected
                          ]}>
                            {dept.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.addButton, !canInvite && { backgroundColor: theme.colors.border, opacity: 0.5 }]} 
                  onPress={handleAddVolunteer} 
                  disabled={!canInvite}
                >
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addButtonText}>Convidar Membro</Text>}
                </TouchableOpacity>

                {!canInvite && !loading && (
                  <Text style={styles.inviteInstruction}>
                    {!isDeptSelected ? '• Selecione uma equipe acima' : ''}
                    {!isGmail ? '\n• Use um e-mail @gmail.com' : ''}
                  </Text>
                )}
              </View>
            }
            renderItem={({ item }) => (
                <View style={styles.memberCard}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.name || 'Sem Nome'}</Text>
                    <Text style={styles.memberEmail}>{item.email}</Text>
                    {item.teams && item.teams.length > 0 && (
                      <Text style={{ color: theme.colors.primary, fontSize: 10, marginTop: 4, fontWeight: 'bold' }}>
                        EQUIPES: {item.teams.join(', ')}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity style={styles.manageTeamBtn} onPress={() => handleManageUserRoles(item)}>
                      <Wrench size={18} color={theme.colors.primary} weight="regular" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.manageTeamBtn} onPress={() => handleManageUserTeams(item)}>
                      <Users size={18} color={theme.colors.primary} weight="regular" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.roleBadge, isAdminOrMaster && { borderColor: theme.colors.primary, borderWidth: 1 }]}
                      disabled={!isAdminOrMaster}
                      onPress={() => setSelectedProfile(item)}
                    >
                      <Text style={styles.roleText}>{item.role}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
        )}

        {activeTab === 'EQUIPES' && (
          <FlatList
            data={departments}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              isAdminOrMaster ? (
                <View style={styles.formCard}>
                  <TextInput style={styles.input} placeholder="Nome da Equipe" placeholderTextColor={theme.colors.textSecondary} value={newDeptName} onChangeText={setNewDeptName} />
                  <Text style={styles.inputLabel}>Selecionar Líder:</Text>
                  <View style={[styles.leaderPickerGrid, { maxHeight: 150 }]}>
                    <ScrollView nestedScrollEnabled>
                      {volunteers.filter(v => v.role === 'LÍDER').map(l => (
                        <TouchableOpacity key={l.id} style={[styles.leaderPickerItem, selectedLeaderId === l.id && styles.leaderPickerItemSelected]} onPress={() => setSelectedLeaderId(l.id || null)}>
                          {selectedLeaderId === l.id ? (
                             <RadioButton size={16} color={theme.colors.primary} weight="fill" />
                           ) : (
                             <Square size={16} color={theme.colors.textSecondary} weight="regular" />
                           )}
                          <Text style={[styles.leaderPickerLabel, selectedLeaderId === l.id && { color: theme.colors.primary }]}>{l.name || l.email.split('@')[0]}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <Text style={styles.inputLabel}>Selecionar Co-Líder (Opcional):</Text>
                  <View style={[styles.leaderPickerGrid, { maxHeight: 150 }]}>
                    <ScrollView nestedScrollEnabled>
                      <TouchableOpacity style={[styles.leaderPickerItem, !selectedCoLeaderId && styles.leaderPickerItemSelected]} onPress={() => setSelectedCoLeaderId(null)}>
                        {!selectedCoLeaderId ? (
                           <RadioButton size={16} color={theme.colors.primary} weight="fill" />
                         ) : (
                           <Square size={16} color={theme.colors.textSecondary} weight="regular" />
                         )}
                        <Text style={[styles.leaderPickerLabel, !selectedCoLeaderId && { color: theme.colors.primary }]}>Nenhum</Text>
                      </TouchableOpacity>
                      {volunteers.filter(v => v.role === 'LÍDER' || v.role === 'CO-LÍDER').map(l => (
                        <TouchableOpacity key={l.id} style={[styles.leaderPickerItem, selectedCoLeaderId === l.id && styles.leaderPickerItemSelected]} onPress={() => setSelectedCoLeaderId(l.id || null)} disabled={selectedLeaderId === l.id}>
                          {selectedCoLeaderId === l.id ? (
                             <RadioButton size={16} color={theme.colors.primary} weight="fill" />
                           ) : (
                             <Square size={16} color={theme.colors.textSecondary} weight="regular" />
                           )}
                          <Text style={[styles.leaderPickerLabel, selectedCoLeaderId === l.id && { color: theme.colors.primary }, selectedLeaderId === l.id && { opacity: 0.5 }]}>
                            {l.name || l.email.split('@')[0]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <TouchableOpacity style={[styles.addButton, (loading || !selectedLeaderId) && { opacity: 0.7 }]} onPress={handleAddDepartment} disabled={loading || !selectedLeaderId}>
                    <Text style={styles.addButtonText}>Criar Equipe</Text>
                  </TouchableOpacity>
                </View>
              ) : undefined
            }
            renderItem={({ item }) => (
                <View style={styles.memberCard}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberEmail}>Líder: <Text style={{ color: theme.colors.primary }}>{item.leader?.full_name || 'N/A'}</Text></Text>
                    {item.co_leader && (
                      <Text style={styles.memberEmail}>Co-Líder: <Text style={{ color: theme.colors.primary }}>{item.co_leader?.full_name}</Text></Text>
                    )}
                  </View>
                  {isAdminOrMaster && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity style={styles.manageTeamBtn} onPress={() => setEditingDept({ id: item.id, name: item.name, description: item.description || '' })}>
                        <PencilSimple size={20} color={theme.colors.primary} weight="regular" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.manageTeamBtn} onPress={() => handleUpdateLeader(item.id)}>
                        <UserPlus size={20} color={theme.colors.primary} weight="regular" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.manageTeamBtn} onPress={() => handleUpdateCoLeader(item.id)}>
                        <Users size={20} color={theme.colors.primary} weight="regular" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.manageTeamBtn} onPress={() => handleDeleteDepartment(item)}>
                        <Trash size={20} color={theme.colors.error} weight="regular" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            />
        )}

        {activeTab === 'FUNÇÕES' && (
          <FlatList
            data={roles}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListHeaderComponent={
              <>
                <View style={styles.formCard}>
                  <Text style={styles.inputLabel}>Vincular a qual Departamento?</Text>
                  <View style={[styles.leaderPickerGrid, { maxHeight: 150 }]}>
                    <ScrollView nestedScrollEnabled>
                      {departments.length === 0 ? (
                         <Text style={{ color: theme.colors.textSecondary, fontStyle: 'italic', padding: 10 }}>Nenhum departamento disponível.</Text>
                      ) : (
                        (isAdminOrMaster ? departments : departments.filter(d => leaderTeams.includes(d.id))).map(dept => (
                          <TouchableOpacity 
                            key={dept.id} 
                            style={[styles.leaderPickerItem, selectedDeptIdForRule === dept.id && styles.leaderPickerItemSelected]} 
                            onPress={() => setSelectedDeptIdForRule(dept.id)}
                          >
                            {selectedDeptIdForRule === dept.id ? (
                               <RadioButton size={16} color={theme.colors.primary} weight="fill" />
                             ) : (
                               <Square size={16} color={theme.colors.textSecondary} weight="regular" />
                             )}
                            <Text style={[styles.leaderPickerLabel, selectedDeptIdForRule === dept.id && { color: theme.colors.primary }]}>
                              {dept.name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                  <TextInput style={[styles.input, !selectedDeptIdForRule && { opacity: 0.5 }]} placeholder="Nome da Função (ex: Guitarrista)" placeholderTextColor={theme.colors.textSecondary} value={newRoleName} onChangeText={setNewRoleName} editable={!!selectedDeptIdForRule} />
                  <TouchableOpacity style={[styles.addButton, (loading || !selectedDeptIdForRule) && { opacity: 0.5 }]} onPress={handleAddRole} disabled={loading || !selectedDeptIdForRule}>
                    <Text style={styles.addButtonText}>Criar Função</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.listHeader}><Text style={styles.listTitle}>Funções Catalogadas ({roles.length})</Text></View>
              </>
            }
            renderItem={({ item }) => (
                <View style={styles.memberCard}>
                   <View style={styles.memberInfo}>
                     <Text style={styles.memberName}>{item.name}</Text>
                     <Text style={styles.memberEmail}>{item.departments?.name}</Text>
                   </View>
                </View>
              )}
            />
        )}
      </View>

      {/* MODALS */}
      {selectedProfile && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alterar Acesso</Text>
              <TouchableOpacity onPress={() => setSelectedProfile(null)}><X size={24} color={theme.colors.text} weight="bold" /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={{ color: theme.colors.text, marginBottom: 16 }}>Novo cargo para <Text style={{fontWeight: 'bold'}}>{selectedProfile.name || selectedProfile.email}</Text>:</Text>
              <TouchableOpacity style={styles.roleOptionRow} onPress={() => updateRole('ADMIN')}>
                <ShieldCheck size={20} color={theme.colors.error} weight="fill" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.roleOptionTitle}>ADMIN</Text>
                  <Text style={styles.roleOptionDesc}>Acesso total do sistema.</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roleOptionRow} onPress={() => updateRole('LÍDER')}>
                <Star size={20} color={theme.colors.primary} weight="fill" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.roleOptionTitle}>LÍDER</Text>
                  <Text style={styles.roleOptionDesc}>Gestão das próprias equipes.</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roleOptionRow} onPress={() => updateRole('CO-LÍDER')}>
                <Star size={20} color={theme.colors.primary} weight="regular" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.roleOptionTitle}>CO-LÍDER</Text>
                  <Text style={styles.roleOptionDesc}>Mesmos direitos do Líder.</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roleOptionRow} onPress={() => updateRole('VOLUNTÁRIO')}>
                <User size={20} color={theme.colors.textSecondary} weight="fill" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.roleOptionTitle}>VOLUNTÁRIO</Text>
                  <Text style={styles.roleOptionDesc}>Padrão. Visão operacional.</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {managingTeamProfile && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vincular Equipes</Text>
              <TouchableOpacity onPress={() => setManagingTeamProfile(null)}><X size={24} color={theme.colors.text} weight="bold" /></TouchableOpacity>
            </View>
            <ScrollView>
              {departments.map(dept => {
                const isMember = userDepts.includes(dept.id);
                const canManage = isAdminOrMaster || leaderTeams.includes(dept.id);
                return (
                  <TouchableOpacity 
                    key={dept.id} 
                    style={[styles.roleOptionRow, !canManage && { opacity: 0.5 }]} 
                    onPress={() => canManage && toggleUserDept(dept.id)}
                    disabled={!canManage}
                  >
                    {isMember ? (
                       <CheckSquare size={24} color={theme.colors.primary} weight="fill" />
                     ) : (
                       <Square size={24} color={theme.colors.textSecondary} weight="regular" />
                     )}
                    <Text style={[styles.roleOptionTitle, { marginLeft: 12 }]}>{dept.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity 
              style={[styles.addButton, loading && { opacity: 0.7 }]} 
              onPress={handleSaveTeams}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addButtonText}>SALVAR VÍNCULOS</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {managingRoleProfile && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vincular Funções (Skills)</Text>
              <TouchableOpacity onPress={() => setManagingRoleProfile(null)}><X size={24} color={theme.colors.text} weight="bold" /></TouchableOpacity>
            </View>
            <ScrollView>
              {roles.map(role => {
                const isAssigned = userAssignedRoles.includes(role.id);
                // Só pode alterar de funções dentro de um departamento que ele é LÍDER (ou ADMIN)
                const canManage = isAdminOrMaster || leaderTeams.includes(role.department_id);
                return (
                  <TouchableOpacity 
                    key={role.id} 
                    style={[styles.roleOptionRow, !canManage && { opacity: 0.5 }]} 
                    onPress={() => canManage && toggleUserRoleAction(role.id)}
                    disabled={!canManage}
                  >
                    {isAssigned ? (
                       <CheckSquare size={24} color={theme.colors.primary} weight="fill" />
                     ) : (
                       <Square size={24} color={theme.colors.textSecondary} weight="regular" />
                     )}
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.roleOptionTitle}>{role.name}</Text>
                      <Text style={styles.roleOptionDesc}>{role.departments?.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {roles.length === 0 && (
                <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, marginTop: 20 }}>Nenhuma função cadastrada ainda.</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.addButton} onPress={() => setManagingRoleProfile(null)}>
              <Text style={styles.addButtonText}>CONFIRMAR FUNÇÕES</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {deptChangingLeader && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trocar Líder</Text>
              <TouchableOpacity onPress={() => setDeptChangingLeader(null)}><X size={24} color={theme.colors.text} weight="bold" /></TouchableOpacity>
            </View>
            <ScrollView>
              {volunteers.filter(v => v.role === 'LÍDER').map(l => (
                <TouchableOpacity 
                  key={l.id} 
                  style={styles.roleOptionRow} 
                  onPress={() => confirmUpdateLeader(l.id!)}
                >
                  <UserCircle size={24} color={theme.colors.primary} weight="regular" />
                  <Text style={[styles.roleOptionTitle, { marginLeft: 12 }]}>{l.name || l.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
      
      {deptChangingCoLeader && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trocar Co-Líder</Text>
              <TouchableOpacity onPress={() => setDeptChangingCoLeader(null)}><X size={24} color={theme.colors.text} weight="bold" /></TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity 
                style={styles.roleOptionRow} 
                onPress={() => confirmUpdateCoLeader(null)}
              >
                <XCircle size={24} color={theme.colors.textSecondary} weight="regular" />
                <Text style={[styles.roleOptionTitle, { marginLeft: 12 }]}>Remover Co-Líder</Text>
              </TouchableOpacity>
              {volunteers.filter(v => v.role === 'LÍDER' || v.role === 'CO-LÍDER').map(l => (
                <TouchableOpacity 
                  key={l.id} 
                  style={styles.roleOptionRow} 
                  onPress={() => confirmUpdateCoLeader(l.id!)}
                >
                  <UserCircle size={24} color={theme.colors.primary} weight="regular" />
                  <Text style={[styles.roleOptionTitle, { marginLeft: 12 }]}>{l.name || l.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* MODAL DE EDIÇÃO DE EQUIPE (MANTIDO COMO MODAL DE FORMULÁRIO) */}
      {editingDept && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Equipe</Text>
              <TouchableOpacity onPress={() => setEditingDept(null)}><X size={24} color={theme.colors.text} weight="bold" /></TouchableOpacity>
            </View>
            <View style={styles.formCard}>
              <TextInput 
                style={styles.input} 
                placeholder="Nome da Equipe" 
                placeholderTextColor={theme.colors.textSecondary} 
                value={editingDept.name} 
                onChangeText={(text) => setEditingDept({...editingDept, name: text})} 
              />
              <TextInput 
                style={[styles.input, { height: 80 }]} 
                placeholder="Descrição (opcional)" 
                placeholderTextColor={theme.colors.textSecondary} 
                value={editingDept.description} 
                onChangeText={(text) => setEditingDept({...editingDept, description: text})} 
                multiline
              />
            </View>
            <TouchableOpacity 
              style={[styles.addButton, loading && { opacity: 0.7 }]} 
              onPress={handleSaveEditDepartment}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addButtonText}>SALVAR ALTERAÇÕES</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CustomModal 
        visible={modalVisible}
        title={modalData.title}
        message={modalData.message}
        type={modalData.type}
        onConfirm={() => {
          modalData.onConfirm();
          setModalVisible(false);
        }}
        onCancel={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerArea: { marginBottom: 20 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border, marginBottom: 20 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTabItem: { borderBottomWidth: 2, borderBottomColor: '#6BC5A7' },
  tabText: { color: theme.colors.textSecondary, fontWeight: 'bold' },
  activeTabText: { color: '#6BC5A7' },
  formCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  input: { backgroundColor: theme.colors.background, color: theme.colors.text, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  addButton: { backgroundColor: theme.colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  memberCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberInfo: { flex: 1 },
  memberName: { color: theme.colors.text, fontWeight: 'bold', fontSize: 16 },
  memberEmail: { color: theme.colors.textSecondary, fontSize: 12 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(107, 197, 167, 0.1)' },
  roleText: { color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  inviteInstruction: {
    color: theme.colors.primary,
    fontSize: 11,
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    textAlign: 'center',
  },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: theme.colors.text, fontSize: 18, fontWeight: 'bold' },
  roleOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.colors.background },
  roleOptionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: 'bold' },
  roleOptionDesc: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  searchArea: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, color: theme.colors.text, paddingVertical: 10, marginLeft: 8 },
  manageTeamBtn: { padding: 8 },
  inputLabel: { color: theme.colors.textSecondary, fontSize: 12, marginBottom: 8, fontWeight: 'bold' },
  listHeader: { marginBottom: 12, marginTop: 20 },
  listTitle: { color: theme.colors.text, fontWeight: 'bold', fontSize: 16 },
  leaderPickerGrid: { backgroundColor: theme.colors.background, borderRadius: 8, marginBottom: 12, padding: 4, borderWidth: 1, borderColor: theme.colors.border },
  leaderPickerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  leaderPickerItemSelected: { backgroundColor: 'rgba(107, 197, 167, 0.1)' },
  leaderPickerLabel: { color: theme.colors.text, fontSize: 14, marginLeft: 10 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  chipSelected: { backgroundColor: '#6BC5A7', borderColor: '#6BC5A7' },
  chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  chipTextSelected: { color: '#FFFFFF' }
});
