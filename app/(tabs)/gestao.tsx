import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../src/store/useAppStore';
import { adminService, Profile } from '../../src/services/adminService';
import { Ionicons } from '@expo/vector-icons';
import { STRINGS } from '../../src/constants/strings';
import { EmptyState } from '../../src/components/EmptyState';
import { CustomModal } from '../../src/components/CustomModal';

export default function GestaoMembrosScreen() {
  const { user } = useAppStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [volunteers, setVolunteers] = useState<Profile[]>([]);
  
  const [activeTab, setActiveTab] = useState<'MEMBROS' | 'EQUIPES' | 'FUNÇÕES'>('MEMBROS');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; message: string; onConfirm: () => void; type: 'danger' | 'info' | 'success' }>({
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [selectedCoLeaderId, setSelectedCoLeaderId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [leaderTeams, setLeaderTeams] = useState<string[]>([]); 
  const [selectedInviteDeptId, setSelectedInviteDeptId] = useState<string | null>(null);
  const [managingTeamProfile, setManagingTeamProfile] = useState<Profile | null>(null);
  const [userDepts, setUserDepts] = useState<string[]>([]);
  const [deptChangingLeader, setDeptChangingLeader] = useState<string | null>(null);
  const [deptChangingCoLeader, setDeptChangingCoLeader] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<any | null>(null);

  const [roles, setRoles] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedDeptIdForRule, setSelectedDeptIdForRule] = useState<string>('');
  
  const [managingRoleProfile, setManagingRoleProfile] = useState<Profile | null>(null);
  const [userAssignedRoles, setUserAssignedRoles] = useState<string[]>([]);

  const loadVolunteers = async (silent: boolean = false) => {
    if (!silent) setRefreshing(true);
    const { data, error } = await adminService.listVolunteers();
    if (error && !silent) Alert.alert('Erro Membros', error.message);
    else if (data) setVolunteers(data);
    if (!silent) setRefreshing(false);
  };

  const loadDepartments = async () => {
    setRefreshing(true);
    const { data, error } = await adminService.listDepartments();
    if (error) {
      console.error('Erro Equipes:', error.message);
      Alert.alert('Erro ao carregar Equipes', 'Não foi possível carregar a lista. Verifique se a coluna leader_id existe no banco.');
    } else if (data) {
      setDepartments(data);
    }
    setRefreshing(false);
  };

  const loadRoles = async () => {
    setRefreshing(true);
    const { data } = await adminService.listAllRoles();
    if (data) setRoles(data);
    setRefreshing(false);
  };

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    if (user?.role !== 'VOLUNTÁRIO') {
      loadVolunteers();
      loadDepartments();
      loadRoles();

      // Assina a tabela de perfis para atualizar quando alguém logar pela 1ª vez
      subscription = adminService.subscribeToVolunteers(() => {
        loadVolunteers(true); // Atualização silenciosa
      });
    }
    
    if (user?.id && user?.role !== 'VOLUNTÁRIO') {
       adminService.getLeaderDepartments(user.id).then(({ data }) => {
         if (data) {
           const ids = data.map(d => d.id);
           setLeaderTeams(ids);
           if (ids.length === 1) setSelectedInviteDeptId(ids[0]);
         }
       });
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [user?.id, user?.role]);

  if (user?.role === 'VOLUNTÁRIO') {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <Ionicons name="lock-closed" size={64} color={theme.colors.primary} />
        <Text style={[globalStyles.textTitle, { marginTop: 20 }]}>Acesso Restrito</Text>
        <Text style={globalStyles.textBody}>Apenas Líderes e Admins podem acessar esta área.</Text>
      </View>
    );
  }

  const handleAddVolunteer = async () => {
    if (user?.role !== 'LÍDER' && user?.role !== 'ADMIN') {
      Alert.alert('Erro', 'Usuário Não Autorizado a enviar Convite!');
      return;
    }

    if (!email || !email.includes('@')) {
      Alert.alert('E-mail Inválido', 'E-mail do Google é obrigatório.');
      return;
    }
    setLoading(true);
    const { error } = await adminService.inviteVolunteer(email, name, selectedInviteDeptId);
    if (error) {
      setModalData({
        title: 'Atenção',
        message: error.message,
        type: 'info',
        onConfirm: () => setModalVisible(false)
      });
      setModalVisible(true);
    } else {
      setModalData({
        title: 'Sucesso!',
        message: 'O convite foi enviado para o e-mail informado.',
        type: 'success',
        onConfirm: () => setModalVisible(false)
      });
      setModalVisible(true);
      setEmail(''); setName('');
      if (leaderTeams.length !== 1) setSelectedInviteDeptId(null);
      loadVolunteers();
    }
    setLoading(false);
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim() || !selectedLeaderId) {
      Alert.alert('Erro', 'Nome e Líder são obrigatórios.');
      return;
    }
    setLoading(true);
    const { error } = await adminService.createDepartment(newDeptName, newDeptDesc, selectedLeaderId, selectedCoLeaderId || undefined);
    setLoading(false);
    if (error) Alert.alert('Erro DB', error.message);
    else {
      setNewDeptName(''); setNewDeptDesc(''); setSelectedLeaderId(null); setSelectedCoLeaderId(null);
      loadDepartments();
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
          loadDepartments();
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
      loadDepartments();
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
      loadDepartments();
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
        loadDepartments();
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
      loadDepartments();
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
      loadVolunteers();
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
      loadRoles();
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
      loadVolunteers();
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
                image={require('../../assets/images/illustrations/empty_state.png')} 
              />
            }
            ListHeaderComponent={
              <View style={styles.formCard}>
                <View style={styles.searchArea}>
                  <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
                  <TextInput style={styles.searchInput} placeholder="Buscar membro..." placeholderTextColor={theme.colors.textSecondary} value={searchTerm} onChangeText={setSearchTerm} />
                </View>
                <TextInput style={styles.input} placeholder="E-mail do Google" placeholderTextColor={theme.colors.textSecondary} value={email} onChangeText={setEmail} autoCapitalize="none" />
                
                {((user?.role === 'ADMIN' ? departments.length : leaderTeams.length) > 0) && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.inputLabel}>Vincular à Equipe:</Text>
                    <View style={styles.chipsContainer}>
                      {(user?.role === 'ADMIN' ? departments : departments.filter(d => leaderTeams.includes(d.id))).map(dept => (
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

                <TouchableOpacity style={[styles.addButton, loading && { opacity: 0.7 }]} onPress={handleAddVolunteer} disabled={loading}>
                  {loading ? <ActivityIndicator color="#121212" /> : <Text style={styles.addButtonText}>Convidar Membro</Text>}
                </TouchableOpacity>
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
                      <Ionicons name="construct-outline" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.manageTeamBtn} onPress={() => handleManageUserTeams(item)}>
                      <Ionicons name="people" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.roleBadge, user?.role === 'ADMIN' && { borderColor: theme.colors.primary, borderWidth: 1 }]}
                      disabled={user?.role !== 'ADMIN'}
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
              user?.role === 'ADMIN' ? (
                <View style={styles.formCard}>
                  <TextInput style={styles.input} placeholder="Nome da Equipe" placeholderTextColor={theme.colors.textSecondary} value={newDeptName} onChangeText={setNewDeptName} />
                  <Text style={styles.inputLabel}>Selecionar Líder:</Text>
                  <View style={[styles.leaderPickerGrid, { maxHeight: 150 }]}>
                    <ScrollView nestedScrollEnabled>
                      {volunteers.filter(v => v.role === 'LÍDER').map(l => (
                        <TouchableOpacity key={l.id} style={[styles.leaderPickerItem, selectedLeaderId === l.id && styles.leaderPickerItemSelected]} onPress={() => setSelectedLeaderId(l.id || null)}>
                          <Ionicons name={selectedLeaderId === l.id ? "radio-button-on" : "radio-button-off"} size={16} color={selectedLeaderId === l.id ? theme.colors.primary : theme.colors.textSecondary} />
                          <Text style={[styles.leaderPickerLabel, selectedLeaderId === l.id && { color: theme.colors.primary }]}>{l.name || l.email.split('@')[0]}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <Text style={styles.inputLabel}>Selecionar Co-Líder (Opcional):</Text>
                  <View style={[styles.leaderPickerGrid, { maxHeight: 150 }]}>
                    <ScrollView nestedScrollEnabled>
                      <TouchableOpacity style={[styles.leaderPickerItem, !selectedCoLeaderId && styles.leaderPickerItemSelected]} onPress={() => setSelectedCoLeaderId(null)}>
                        <Ionicons name={!selectedCoLeaderId ? "radio-button-on" : "radio-button-off"} size={16} color={!selectedCoLeaderId ? theme.colors.primary : theme.colors.textSecondary} />
                        <Text style={[styles.leaderPickerLabel, !selectedCoLeaderId && { color: theme.colors.primary }]}>Nenhum</Text>
                      </TouchableOpacity>
                      {volunteers.filter(v => v.role === 'LÍDER' || v.role === 'CO-LÍDER').map(l => (
                        <TouchableOpacity key={l.id} style={[styles.leaderPickerItem, selectedCoLeaderId === l.id && styles.leaderPickerItemSelected]} onPress={() => setSelectedCoLeaderId(l.id || null)} disabled={selectedLeaderId === l.id}>
                          <Ionicons name={selectedCoLeaderId === l.id ? "radio-button-on" : "radio-button-off"} size={16} color={selectedCoLeaderId === l.id ? theme.colors.primary : theme.colors.textSecondary} />
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
                  {user?.role === 'ADMIN' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity style={styles.manageTeamBtn} onPress={() => setEditingDept({ id: item.id, name: item.name, description: item.description || '' })}>
                        <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.manageTeamBtn} onPress={() => handleUpdateLeader(item.id)}>
                        <Ionicons name="person-add-outline" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.manageTeamBtn} onPress={() => handleUpdateCoLeader(item.id)}>
                        <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.manageTeamBtn} onPress={() => handleDeleteDepartment(item)}>
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
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
                        (user?.role === 'ADMIN' ? departments : departments.filter(d => leaderTeams.includes(d.id))).map(dept => (
                          <TouchableOpacity 
                            key={dept.id} 
                            style={[styles.leaderPickerItem, selectedDeptIdForRule === dept.id && styles.leaderPickerItemSelected]} 
                            onPress={() => setSelectedDeptIdForRule(dept.id)}
                          >
                            <Ionicons 
                              name={selectedDeptIdForRule === dept.id ? "radio-button-on" : "radio-button-off"} 
                              size={16} 
                              color={selectedDeptIdForRule === dept.id ? theme.colors.primary : theme.colors.textSecondary} 
                            />
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
              <TouchableOpacity onPress={() => setSelectedProfile(null)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={{ color: theme.colors.text, marginBottom: 16 }}>Novo cargo para <Text style={{fontWeight: 'bold'}}>{selectedProfile.name || selectedProfile.email}</Text>:</Text>
              <TouchableOpacity style={styles.roleOptionRow} onPress={() => updateRole('ADMIN')}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.error} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.roleOptionTitle}>ADMIN</Text>
                  <Text style={styles.roleOptionDesc}>Acesso total do sistema.</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roleOptionRow} onPress={() => updateRole('LÍDER')}>
                <Ionicons name="star" size={20} color={theme.colors.primary} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.roleOptionTitle}>LÍDER</Text>
                  <Text style={styles.roleOptionDesc}>Gestão das próprias equipes.</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roleOptionRow} onPress={() => updateRole('CO-LÍDER')}>
                <Ionicons name="star-outline" size={20} color={theme.colors.primary} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.roleOptionTitle}>CO-LÍDER</Text>
                  <Text style={styles.roleOptionDesc}>Mesmos direitos do Líder.</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.roleOptionRow} onPress={() => updateRole('VOLUNTÁRIO')}>
                <Ionicons name="person" size={20} color={theme.colors.textSecondary} />
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
              <TouchableOpacity onPress={() => setManagingTeamProfile(null)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              {departments.map(dept => {
                const isMember = userDepts.includes(dept.id);
                const canManage = user?.role === 'ADMIN' || leaderTeams.includes(dept.id);
                return (
                  <TouchableOpacity 
                    key={dept.id} 
                    style={[styles.roleOptionRow, !canManage && { opacity: 0.5 }]} 
                    onPress={() => canManage && toggleUserDept(dept.id)}
                    disabled={!canManage}
                  >
                    <Ionicons name={isMember ? "checkbox" : "square-outline"} size={24} color={isMember ? theme.colors.primary : theme.colors.textSecondary} />
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
              {loading ? <ActivityIndicator color="#121212" /> : <Text style={styles.addButtonText}>SALVAR VÍNCULOS</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {managingRoleProfile && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vincular Funções (Skills)</Text>
              <TouchableOpacity onPress={() => setManagingRoleProfile(null)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              {roles.map(role => {
                const isAssigned = userAssignedRoles.includes(role.id);
                // Só pode alterar de funções dentro de um departamento que ele é LÍDER (ou ADMIN)
                const canManage = user?.role === 'ADMIN' || leaderTeams.includes(role.department_id);
                return (
                  <TouchableOpacity 
                    key={role.id} 
                    style={[styles.roleOptionRow, !canManage && { opacity: 0.5 }]} 
                    onPress={() => canManage && toggleUserRoleAction(role.id)}
                    disabled={!canManage}
                  >
                    <Ionicons name={isAssigned ? "checkbox" : "square-outline"} size={24} color={isAssigned ? theme.colors.primary : theme.colors.textSecondary} />
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
              <TouchableOpacity onPress={() => setDeptChangingLeader(null)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              {volunteers.filter(v => v.role === 'LÍDER').map(l => (
                <TouchableOpacity 
                  key={l.id} 
                  style={styles.roleOptionRow} 
                  onPress={() => confirmUpdateLeader(l.id!)}
                >
                  <Ionicons name="person-circle-outline" size={24} color={theme.colors.primary} />
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
              <TouchableOpacity onPress={() => setDeptChangingCoLeader(null)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity 
                style={styles.roleOptionRow} 
                onPress={() => confirmUpdateCoLeader(null)}
              >
                <Ionicons name="close-circle-outline" size={24} color={theme.colors.textSecondary} />
                <Text style={[styles.roleOptionTitle, { marginLeft: 12 }]}>Remover Co-Líder</Text>
              </TouchableOpacity>
              {volunteers.filter(v => v.role === 'LÍDER' || v.role === 'CO-LÍDER').map(l => (
                <TouchableOpacity 
                  key={l.id} 
                  style={styles.roleOptionRow} 
                  onPress={() => confirmUpdateCoLeader(l.id!)}
                >
                  <Ionicons name="person-circle-outline" size={24} color={theme.colors.primary} />
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
              <TouchableOpacity onPress={() => setEditingDept(null)}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity>
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
              {loading ? <ActivityIndicator color="#121212" /> : <Text style={styles.addButtonText}>SALVAR ALTERAÇÕES</Text>}
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
  activeTabItem: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
  tabText: { color: theme.colors.textSecondary, fontWeight: 'bold' },
  activeTabText: { color: theme.colors.primary },
  formCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
  input: { backgroundColor: theme.colors.background, color: theme.colors.text, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  addButton: { backgroundColor: theme.colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#121212', fontWeight: 'bold' },
  memberCard: { backgroundColor: theme.colors.surface, padding: 16, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberInfo: { flex: 1 },
  memberName: { color: theme.colors.text, fontWeight: 'bold', fontSize: 16 },
  memberEmail: { color: theme.colors.textSecondary, fontSize: 12 },
  roleBadge: { backgroundColor: theme.colors.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 10 },
  roleText: { color: theme.colors.primary, fontSize: 10, fontWeight: 'bold' },
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
  leaderPickerItemSelected: { backgroundColor: 'rgba(255, 144, 0, 0.05)' },
  leaderPickerLabel: { color: theme.colors.text, fontSize: 14, marginLeft: 10 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  chipTextSelected: { color: '#121212' }
});
