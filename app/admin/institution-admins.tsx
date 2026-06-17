import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'react-native-router-expo'; // mock or use expo-router
import { useLocalSearchParams as useLocal, useRouter as useRout } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, globalStyles } from '../../src/theme';
import { adminService } from '../../src/services/adminService';
import { CustomModal } from '../../src/components/CustomModal';

export default function InstitutionAdminsScreen() {
  const router = useRout();
  const { id, name } = useLocal<{ id: string, name: string }>();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAdmins = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const { data, error } = await adminService.listInstitutionAdmins(id);
      if (error) {
        Alert.alert('Erro', 'Não foi possível carregar os administradores.');
      } else {
        setAdmins(data || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleInvite = async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) {
      Alert.alert('Erro', 'Informe um e-mail válido.');
      return;
    }
    try {
      setIsSubmitting(true);
      const { error } = await adminService.inviteAdmin(id, newAdminEmail);
      if (error) {
        Alert.alert('Erro', 'Falha ao convidar: ' + error.message);
      } else {
        setModalVisible(false);
        setNewAdminEmail('');
        loadAdmins();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = (item: any) => {
    Alert.alert(
      'Remover Administrador',
      `Tem certeza que deseja remover ${item.email}? Eles perderão os privilégios de administração.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await adminService.removeAdmin(id, item.email, item.isPending);
            if (error) {
              Alert.alert('Erro', 'Falha ao remover: ' + error.message);
            } else {
              loadAdmins();
            }
          }
        }
      ]
    );
  };

  const renderAdminItem = ({ item }: { item: any }) => (
    <View style={styles.adminCard}>
      <View style={styles.avatarContainer}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color={theme.colors.primary} />
          </View>
        )}
      </View>
      <View style={styles.adminInfo}>
        <Text style={[styles.adminName, item.isPending && { color: theme.colors.textSecondary }]}>
          {item.full_name || 'Administrador'}
        </Text>
        <Text style={styles.adminEmail}>{item.email}</Text>
      </View>
      <View style={[styles.badge, item.isPending && { borderColor: theme.colors.textSecondary, backgroundColor: 'transparent' }]}>
        <Text style={[styles.badgeText, item.isPending && { color: theme.colors.textSecondary }]}>
          {item.isPending ? 'PENDENTE' : 'ADMIN'}
        </Text>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={globalStyles.textTitle}>Administradores</Text>
          <Text style={styles.subtitle}>{name}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="person-add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={globalStyles.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={admins}
          keyExtractor={(item) => item.id}
          renderItem={renderAdminItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => loadAdmins(true)} 
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={theme.colors.border} />
              <Text style={styles.emptyText}>Nenhum administrador encontrado.</Text>
            </View>
          }
        />
      )}

      <CustomModal
        visible={modalVisible}
        title="Adicionar Administrador"
        message="Informe o e-mail do novo administrador. Se ele não tiver conta, enviaremos um convite."
        confirmText={isSubmitting ? "Enviando..." : "Adicionar"}
        onConfirm={handleInvite}
        onCancel={() => {
          setModalVisible(false);
          setNewAdminEmail('');
        }}
      >
        <View style={{ padding: 20 }}>
          <Text style={{ color: theme.colors.text, marginBottom: 8, fontWeight: 'bold' }}>E-mail do Admin</Text>
          <TextInput
            style={{
              backgroundColor: theme.colors.surfaceHighlight,
              borderRadius: 8,
              padding: 12,
              color: theme.colors.text,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
            placeholder="admin@igreja.com"
            placeholderTextColor={theme.colors.textSecondary}
            value={newAdminEmail}
            onChangeText={setNewAdminEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
      </CustomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  backBtn: {
    marginRight: 15,
    padding: 5,
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    padding: 10,
    borderRadius: 12,
  },
  subtitle: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 40,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  adminInfo: {
    flex: 1,
    marginLeft: 15,
  },
  adminName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  adminEmail: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  badge: {
    backgroundColor: 'rgba(223, 114, 27, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  badgeText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  removeBtn: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    marginTop: 15,
    fontSize: 16,
  },
});

