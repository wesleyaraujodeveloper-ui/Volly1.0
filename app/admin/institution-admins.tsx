import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, globalStyles } from '../../src/theme';
import { adminService } from '../../src/services/adminService';
import { CustomModal } from '../../src/components/CustomModal';

export default function InstitutionAdminsScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string, name: string }>();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdmins();
  }, [id]);

  const loadAdmins = async () => {
    setLoading(true);
    const { data, error } = await adminService.listInstitutionAdmins(id);
    if (error) {
      Alert.alert('Erro', 'Não foi possível carregar os administradores.');
    } else {
      setAdmins(data || []);
    }
    setLoading(false);
  };

  const renderAdminItem = ({ item }: { item: any }) => (
    <View style={styles.adminCard}>
      <Image 
        source={{ uri: item.avatar_url || `https://ui-avatars.com/api/?name=${item.full_name}&background=DF721B&color=fff` }} 
        style={styles.avatar} 
      />
      <View style={styles.adminInfo}>
        <Text style={styles.adminName}>{item.full_name}</Text>
        <Text style={styles.adminEmail}>{item.email}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>ADMIN</Text>
      </View>
    </View>
  );

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={globalStyles.textTitle}>Administradores</Text>
          <Text style={styles.subtitle}>{name}</Text>
        </View>
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={theme.colors.border} />
              <Text style={styles.emptyText}>Nenhum administrador encontrado.</Text>
            </View>
          }
        />
      )}
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.background,
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
