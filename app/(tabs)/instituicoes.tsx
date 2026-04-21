import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme, globalStyles } from '../../src/theme';
import { adminService } from '../../src/services/adminService';
import { CustomModal } from '../../src/components/CustomModal';
import { useAppStore } from '../../src/store/useAppStore';

export default function GestaoInstituicoesScreen() {
  const { user } = useAppStore();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInst, setEditingInst] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [userLimit, setUserLimit] = useState('30');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [isSlugManual, setIsSlugManual] = useState(false);

  const loadInstitutions = async (silent = false) => {
    if (!silent) setRefreshing(true);
    const { data, error } = await adminService.listInstitutions();
    if (error) {
      console.error('Instituicoes Load Error:', error);
      Alert.alert('Erro de Carregamento', error.message || 'Falha ao carregar instituições. Verifique os logs do console para detalhes técnicos.');
    } else if (data) {
      setInstitutions(data);
    }
    if (!silent) setRefreshing(false);
  };

  useEffect(() => {
    if (user?.role === 'MASTER') {
      loadInstitutions();
    }
  }, [user]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
        .normalize('NFD') // Remove acentos
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '-') // Espaços para hífens
        .replace(/-+/g, '-'); // Remove hífens duplicados
      setSlug(generated);
    }
  };

  const handleSave = async () => {
    if (!name || !slug || (!editingInst && !adminEmail)) {
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
      if (isNaN(finalUserLimit)) {
        Alert.alert('Erro', 'O limite de usuários deve ser um número válido.');
        setLoading(false);
        return;
      }

      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        user_limit: finalUserLimit,
        logo_url: currentLogoUrl
      };

      console.log('Salvando Instituição - Payload:', payload);

      let error;
      if (editingInst) {
        const res = await adminService.updateInstitution(editingInst.id, payload);
        error = res.error;
      } else {
        const res = await adminService.createInstitution(
          payload.name, 
          payload.slug, 
          payload.user_limit, 
          payload.logo_url,
          adminEmail
        );
        error = res.error;
      }

      if (error) throw error;

      setModalVisible(false);
      resetForm();
      loadInstitutions();
    } catch (err: any) {
      Alert.alert('Erro ao Salvar', err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingInst(null);
    setName('');
    setSlug('');
    setUserLimit('30');
    setLogoBase64(null);
    setLogoPreview(null);
    setAdminEmail('');
    setIsSlugManual(false);
  };

  const openEdit = (inst: any) => {
    console.log('Abrindo edição para:', inst.name);
    setEditingInst(inst);
    setName(inst.name);
    setSlug(inst.slug);
    setUserLimit(inst.user_limit?.toString() || '30');
    setLogoPreview(inst.logo_url);
    setModalVisible(true);
  };

  const toggleStatus = async (inst: any) => {
    console.log('Alternando status de:', inst.name, 'Ativo:', inst.active);
    const newStatus = !inst.active;
    const { error } = await adminService.updateInstitution(inst.id, { active: newStatus });
    if (error) {
      console.error('Toggle Status Error:', error);
      Alert.alert('Erro', 'Falha ao mudar status: ' + error.message);
    } else {
      loadInstitutions(true);
    }
  };

  const renderInstitutionCard = ({ item }: { item: any }) => {
    const usage = (item.userCount / item.user_limit) * 100;
    const isCritical = usage > 90;

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
          </View>
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
                {item.userCount} / {item.user_limit}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(usage, 100)}%`, backgroundColor: isCritical ? theme.colors.error : theme.colors.primary }]} />
            </View>
          </View>
          
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Ionicons name="settings-outline" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={globalStyles.textTitle}>Gestão Global</Text>
        <Text style={globalStyles.textBody}>Controle de instituições e cotas SaaS.</Text>
      </View>

      <FlatList
        data={institutions}
        keyExtractor={(item) => item.id}
        renderItem={renderInstitutionCard}
        refreshing={refreshing}
        onRefresh={loadInstitutions}
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
              placeholder="30" 
              placeholderTextColor={theme.colors.textSecondary}
              value={userLimit}
              onChangeText={setUserLimit}
              keyboardType="numeric"
            />
          </View>
        </ScrollView>
      </CustomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.lg,
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
