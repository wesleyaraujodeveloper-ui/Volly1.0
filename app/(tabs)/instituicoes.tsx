import { useTheme } from '../../src/hooks/useTheme';
import { Theme } from '../../src/theme/index';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, ScrollView, RefreshControl } from 'react-native';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { adminService, Institution } from '../../src/services/adminService';
import { useAllInstitutions, useCreateInstitution, useUpdateInstitution, useDeleteInstitution, useStartTrial } from '../../src/hooks/queries/useInstitutions';
import { CustomModal } from '../../src/components/CustomModal';
import { useAppStore } from '../../src/store/useAppStore';
import { useRouter } from 'expo-router';
import { systemService } from '../../src/services/systemService';
import { APP_VERSION } from '../../src/constants/config';

export default function GestaoInstituicoesScreen() {
  const { theme, globalStyles } = useTheme();
  const styles = getStyles(theme);
  const { user } = useAppStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const { data: institutions = [], isLoading, refetch } = useAllInstitutions();
  const createMutation = useCreateInstitution();
  const updateMutation = useUpdateInstitution();
  const deleteMutation = useDeleteInstitution();
  const startTrialMutation = useStartTrial();
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [instToDelete, setInstToDelete] = useState<Institution | null>(null);
  const [editingInst, setEditingInst] = useState<Institution | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [userLimit, setUserLimit] = useState('15');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [isSlugManual, setIsSlugManual] = useState(false);

  // Controle de versão (OTA)
  const [dbVersion, setDbVersion] = useState<string>('');
  const [editingVersion, setEditingVersion] = useState(false);
  const [newVersionInput, setNewVersionInput] = useState('');

  useEffect(() => {
    if (user?.role === 'MASTER') {
      systemService.getLatestVersion().then(res => {
        if (res.app_version) {
          setDbVersion(res.app_version);
          setNewVersionInput(res.app_version);
        }
      });
    }
  }, [user]);

  const handleUpdateVersion = async () => {
    if (!newVersionInput.trim()) return;
    try {
      setLoading(true);
      await systemService.updateVersion(newVersionInput.trim());
      setDbVersion(newVersionInput.trim());
      setEditingVersion(false);
      Alert.alert('Sucesso', 'Versão atualizada no banco. Usuários receberão o aviso de atualização.');
    } catch (e: any) {
      Alert.alert('Erro', 'Falha ao atualizar versão: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setLogoPreview(result.assets[0].uri);
      setLogoBase64(result.assets[0].base64);
    }
  };

  const handleNameChange = (text: string) => {
    setName(text);
    if (!editingInst && !isSlugManual) {
      const generated = text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(generated);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim() || (!editingInst && !adminEmail.trim())) {
      Alert.alert('Erro', 'Nome, Slug e E-mail do Administrador são obrigatórios para novas instituições');
      return;
    }

    setLoading(true);
    try {
      let currentLogoUrl = editingInst?.logo_url || null;

      if (logoBase64) {
        const { publicUrl, error: uploadError } = await adminService.uploadInstitutionLogo(logoBase64);
        if (uploadError) throw uploadError;
        currentLogoUrl = publicUrl;
      }

      const finalUserLimit = parseInt(userLimit);
      if (isNaN(finalUserLimit) || finalUserLimit <= 0) {
        Alert.alert('Erro', 'O limite de usuários deve ser um número válido e maior que zero.');
        setLoading(false);
        return;
      }

      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        user_limit: finalUserLimit,
        logo_url: currentLogoUrl
      };

      if (editingInst) {
        await updateMutation.mutateAsync({ id: editingInst.id, updates: payload });
      } else {
        await createMutation.mutateAsync({ 
          name: payload.name, 
          slug: payload.slug, 
          userLimit: payload.user_limit, 
          logoUrl: payload.logo_url, 
          adminEmail: adminEmail.trim() 
        });
      }

      setModalVisible(false);
      resetForm();
    } catch (err: any) {
      Alert.alert('Erro ao Salvar', err.message);
    } finally {
      setLoading(false);
      refetch(); // Força atualização pra refletir admins
    }
  };

  const resetForm = () => {
    setEditingInst(null);
    setName('');
    setSlug('');
    setUserLimit('15');
    setLogoBase64(null);
    setLogoPreview(null);
    setAdminEmail('');
    setIsSlugManual(false);
  };

  const openEdit = (inst: Institution) => {
    setEditingInst(inst);
    setName(inst.name);
    setSlug(inst.slug);
    setUserLimit(inst.user_limit?.toString() || '15');
    setLogoPreview(inst.logo_url);
    setModalVisible(true);
  };

  const toggleStatus = async (inst: Institution) => {
    const newStatus = !inst.active;
    try {
      await updateMutation.mutateAsync({ id: inst.id, updates: { active: newStatus } });
    } catch (error: any) {
      Alert.alert('Erro', 'Falha ao mudar status: ' + error.message);
    }
  };

  const handleDeleteClick = (inst: Institution) => {
    setInstToDelete(inst);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!instToDelete) return;
    try {
      setLoading(true);
      await deleteMutation.mutateAsync(instToDelete.id);
      setDeleteModalVisible(false);
      setInstToDelete(null);
    } catch (err: any) {
      Alert.alert('Erro ao excluir', err.message || 'Falha ao remover a instituição. Tente desativá-la ou remover seus dependentes primeiro.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrialClick = (inst: Institution) => {
    Alert.alert(
      'Iniciar Teste Grátis',
      `Tem certeza que deseja iniciar um período de teste de 30 dias para a instituição "${inst.name}"?\nIsso reativará o acesso e definirá a data de expiração para daqui a 30 dias.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Iniciar 30 Dias', 
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await startTrialMutation.mutateAsync(inst.id);
              Alert.alert('Sucesso', 'Teste de 30 dias iniciado com sucesso!');
            } catch (err: any) {
              Alert.alert('Erro', 'Não foi possível iniciar o teste: ' + err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderStatsDashboard = useMemo(() => {
    if (institutions.length === 0) return null;

    const totalInst = institutions.length;
    const totalUsers = institutions.reduce((acc, inst) => acc + (inst.userCount || 0), 0);
    const activeInst = institutions.filter(inst => inst.active).length;
    const totalLimit = institutions.reduce((acc, inst) => acc + (inst.user_limit || 0), 0);
    const capacityUsage = totalLimit > 0 ? (totalUsers / totalLimit) * 100 : 0;

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.statsDashboard}
        contentContainerStyle={styles.statsDashboardContent}
      >
        <View style={[styles.statsCard, { borderColor: theme.colors.primary }]}>
          <View style={styles.statsIconCircle}>
            <Ionicons name="business" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.statsValue}>{totalInst}</Text>
          <Text style={styles.statsLabel}>Igrejas</Text>
          <Text style={styles.statsSubLabel}>{activeInst} Ativas</Text>
        </View>

        <View style={[styles.statsCard, { borderColor: theme.colors.success }]}>
          <View style={[styles.statsIconCircle, { backgroundColor: 'rgba(107, 197, 167, 0.1)' }]}>
            <Ionicons name="people" size={20} color={theme.colors.success} />
          </View>
          <Text style={styles.statsValue}>{totalUsers}</Text>
          <Text style={styles.statsLabel}>Membros</Text>
          <Text style={styles.statsSubLabel}>Total Ativo</Text>
        </View>

        <View style={[styles.statsCard, { borderColor: '#5D5FEF' }]}>
          <View style={[styles.statsIconCircle, { backgroundColor: 'rgba(93, 95, 239, 0.1)' }]}>
            <Ionicons name="pie-chart" size={20} color="#5D5FEF" />
          </View>
          <Text style={styles.statsValue}>{capacityUsage.toFixed(1)}%</Text>
          <Text style={styles.statsLabel}>Capacidade</Text>
          <Text style={styles.statsSubLabel}>SaaS Global</Text>
        </View>
      </ScrollView>
    );
  }, [institutions]);

  const renderInstitutionCard = useCallback(({ item }: { item: Institution }) => {
    const userCount = item.userCount || 0;
    const usage = (userCount / item.user_limit) * 100;
    const isCritical = usage > 90;

    const now = new Date();
    const trialEnd = item.trial_end_date ? new Date(item.trial_end_date) : null;
    const isTrialActive = trialEnd && trialEnd > now;
    const isTrialExpired = trialEnd && trialEnd <= now;
    let trialDaysRemaining = 0;
    if (isTrialActive && trialEnd) {
      const diffTime = Math.abs(trialEnd.getTime() - now.getTime());
      trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.logoContainer}>
            {item.logo_url ? (
              <Image source={{ uri: item.logo_url }} style={styles.logo} />
            ) : (
              <Ionicons name="business" size={30} color={theme.colors.primary} />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.instName}>{item.name}</Text>
            <Text style={styles.instSlug}>/{item.slug}</Text>
            
            {/* TAG DE TRIAL */}
            {trialEnd && (
              <Text style={[
                styles.statsSubLabel, 
                { color: isTrialExpired ? theme.colors.error : theme.colors.warning, fontWeight: 'bold' }
              ]}>
                {isTrialExpired ? '⏳ Teste Expirado' : `⏳ Expira em: ${trialDaysRemaining} dias`}
              </Text>
            )}
          </View>

          {!isTrialActive && (
            <TouchableOpacity 
              style={[styles.editBtn, { marginRight: 8, backgroundColor: 'rgba(223, 114, 27, 0.1)' }]} 
              onPress={() => handleStartTrialClick(item)}
            >
              <Ionicons name="hourglass-outline" size={20} color={theme.colors.warning} />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => toggleStatus(item)}>
            <Ionicons 
              name={item.active ? "checkmark-circle" : "pause-circle"} 
              size={28} 
              color={item.active ? theme.colors.success : theme.colors.error} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.statsLabels}>
              <Text style={styles.statsText}>Membros (Atuais / Limite)</Text>
              <Text style={[styles.statsText, { fontWeight: 'bold', color: isCritical ? theme.colors.error : theme.colors.primary }]}>
                {userCount} / {item.user_limit}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(usage, 100)}%`, backgroundColor: isCritical ? theme.colors.error : theme.colors.primary }]} />
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => router.push(`/admin/institution-admins?id=${item.id}&name=${encodeURIComponent(item.name)}` as any)}
          >
            <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Ionicons name="settings-outline" size={20} color={theme.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.editBtn, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]} 
            onPress={() => handleDeleteClick(item)}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [router]);

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={globalStyles.textTitle}>Gestão Global</Text>
        <Text style={globalStyles.textBody}>Controle de instituições e cotas SaaS.</Text>
      </View>

      {renderStatsDashboard}

      <View style={styles.versionCard}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10}}>
          <Ionicons name="cloud-upload" size={24} color={theme.colors.primary} />
          <Text style={styles.instName}>Motor de Atualização OTA</Text>
        </View>
        <Text style={styles.statsText}>Versão Interna do Código: <Text style={{fontWeight: 'bold', color: theme.colors.text}}>{APP_VERSION}</Text></Text>
        
        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10}}>
          <Text style={styles.statsText}>Versão Forçada no Banco:</Text>
          {editingVersion ? (
            <TextInput 
              style={[styles.input, { flex: 1, height: 40, padding: 8 }]} 
              value={newVersionInput}
              onChangeText={setNewVersionInput}
              keyboardType="numeric"
            />
          ) : (
            <Text style={{fontWeight: 'bold', color: dbVersion === APP_VERSION ? theme.colors.success : theme.colors.error, fontSize: 16}}>
              {dbVersion || 'Carregando...'}
            </Text>
          )}
        </View>

        <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10}}>
          {editingVersion ? (
            <>
              <TouchableOpacity style={{marginRight: 15, padding: 8}} onPress={() => setEditingVersion(false)}>
                <Text style={{color: theme.colors.textSecondary}}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{backgroundColor: theme.colors.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8}} onPress={handleUpdateVersion}>
                <Text style={{color: '#FFF', fontWeight: 'bold'}}>Salvar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={{backgroundColor: theme.colors.surfaceHighlight, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8}} onPress={() => setEditingVersion(true)}>
              <Text style={{color: theme.colors.primary, fontWeight: 'bold'}}>Editar Versão</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );

  return (
    <View style={globalStyles.container}>
      <FlatList
        data={institutions}
        keyExtractor={(item) => item.id}
        renderItem={renderInstitutionCard}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={globalStyles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
        <Ionicons name="add" size={32} color="#121212" />
      </TouchableOpacity>

      <CustomModal
        visible={modalVisible}
        title={editingInst ? 'Editar Instituição' : 'Nova Instituição'}
        message=""
        onConfirm={handleSave}
        onCancel={() => setModalVisible(false)}
      >
        <ScrollView style={{ maxHeight: 400 }}>
          <View style={styles.form}>
            <TouchableOpacity style={styles.logoPicker} onPress={handlePickImage}>
              {logoPreview ? (
                <Image source={{ uri: logoPreview }} style={styles.pickerLogo} />
              ) : (
                <View style={styles.pickerPlaceholder}>
                  <Ionicons name="camera" size={32} color={theme.colors.textSecondary} />
                  <Text style={styles.pickerText}>Logo da Igreja</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Nome da Instituição</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: Lagoinha Porto" 
              placeholderTextColor={theme.colors.textSecondary}
              value={name}
              onChangeText={handleNameChange}
            />

            <Text style={styles.label}>Slug (URL amigável)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="ex: lagoinha-porto" 
              placeholderTextColor={theme.colors.textSecondary}
              value={slug}
              onChangeText={(text) => {
                setSlug(text);
                setIsSlugManual(true);
              }}
              autoCapitalize="none"
            />

            {!editingInst && (
              <>
                <Text style={styles.label}>E-mail do Administrador Inicial</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="admin@igreja.com" 
                  placeholderTextColor={theme.colors.textSecondary}
                  value={adminEmail}
                  onChangeText={setAdminEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </>
            )}

            <Text style={styles.label}>Limite de Usuários</Text>
            <TextInput 
              style={styles.input} 
              placeholder="15" 
              placeholderTextColor={theme.colors.textSecondary}
              value={userLimit}
              onChangeText={setUserLimit}
              keyboardType="numeric"
            />
            <Text style={[styles.statsText, { marginTop: 4, marginLeft: 4, fontStyle: 'italic' }]}>
              💡 Dica: 15 usuários (Plano Teste Grátis).
            </Text>
          </View>
        </ScrollView>
      </CustomModal>

      <CustomModal
        visible={deleteModalVisible}
        title="Excluir Instituição"
        message={`Tem certeza que deseja excluir a instituição "${instToDelete?.name}"?\nEsta ação não pode ser desfeita.`}
        type="danger"
        confirmText="Excluir Definitivamente"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setInstToDelete(null);
        }}
      />
    </View>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  header: {
    marginBottom: theme.spacing.md,
  },
  statsDashboard: {
    marginBottom: 24,
    marginHorizontal: -16, // Bleed out to screen edges
    paddingHorizontal: 16,
  },
  statsDashboardContent: {
    paddingRight: 32,
    gap: 12,
  },
  statsCard: {
    width: 140,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  statsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(223, 114, 27, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  statsLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  statsSubLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  versionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  instName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  instSlug: {
    color: theme.colors.primary,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  statsLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statsText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  form: {
    padding: theme.spacing.md,
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logoPicker: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  pickerLogo: {
    width: '100%',
    height: '100%',
  },
  pickerPlaceholder: {
    alignItems: 'center',
  },
  pickerText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
});

