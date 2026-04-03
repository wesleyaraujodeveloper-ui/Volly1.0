import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../src/store/useAppStore';
import { adminService, Profile } from '../../src/services/adminService';
import { Ionicons } from '@expo/vector-icons';

export default function GestaoMembrosScreen() {
  const { user } = useAppStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [volunteers, setVolunteers] = useState<Profile[]>([]);

  // Bloqueio de Segurança UI (Caso o roteamento falhe)
  if (user?.role === 'VOLUNTÁRIO') {
    return (
      <View style={[globalStyles.container, globalStyles.center]}>
        <Ionicons name="lock-closed" size={64} color={theme.colors.primary} />
        <Text style={[globalStyles.textTitle, { marginTop: 20 }]}>Acesso Restrito</Text>
        <Text style={globalStyles.textBody}>Apenas Líderes e Admins podem acessar esta área.</Text>
      </View>
    );
  }

  const loadVolunteers = async () => {
    setRefreshing(true);
    const { data, error } = await adminService.listVolunteers();
    if (error) {
       console.error('Erro ao carregar:', error.message);
    } else if (data) {
       setVolunteers(data);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadVolunteers();
  }, []);

  const handleAddVolunteer = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('E-mail Inválido', 'Por favor, insira um e-mail válido do Google.');
      return;
    }

    setLoading(true);
    const { error } = await adminService.inviteVolunteer(email, name);
    
    if (error) {
      Alert.alert('Erro ao Adicionar', error.message);
    } else {
      Alert.alert('Sucesso!', `${email} foi adicionado à lista de permissões.`);
      setEmail('');
      setName('');
      loadVolunteers();
    }
    setLoading(false);
  };

  const handleRemoveVolunteer = (id: string, name: string) => {
    Alert.alert(
      'Remover Voluntário',
      `Tem certeza que deseja remover ${name || 'este membro'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive',
          onPress: async () => {
             const { error } = await adminService.removeVolunteer(id);
             if (error) {
               Alert.alert('Erro', 'Não foi possível remover o voluntário.');
             } else {
               loadVolunteers();
             }
          }
        }
      ]
    );
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.headerArea}>
        <Text style={globalStyles.textTitle}>Gestão de Equipe</Text>
        <Text style={globalStyles.textBody}>Controle quem tem acesso à aplicação nesta unidade.</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder="Nome do Voluntário (Opcional)"
          placeholderTextColor={theme.colors.textSecondary}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="E-mail do Google"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TouchableOpacity 
          style={[styles.addButton, loading && { opacity: 0.7 }]} 
          onPress={handleAddVolunteer}
          disabled={loading}
        >
          {loading ? (
             <ActivityIndicator color="#121212" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color="#121212" style={{ marginRight: 8 }} />
              <Text style={styles.addButtonText}>Adicionar à Lista</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          Membros Ativos ({volunteers.length})
        </Text>
      </View>

      <FlatList
        data={volunteers}
        keyExtractor={(item) => item.id || item.email}
        onRefresh={loadVolunteers}
        refreshing={refreshing}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{item.name || 'Sem Nome'}</Text>
              <Text style={styles.memberEmail}>{item.email}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.role}</Text>
              </View>
              
              <TouchableOpacity 
                onPress={() => item.id && handleRemoveVolunteer(item.id, item.name || '')}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={18} color="#FF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={theme.colors.border} />
            <Text style={styles.emptyText}>Nenhum voluntário cadastrado.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    marginBottom: theme.spacing.lg,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
  },
  addButtonText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  memberCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  memberEmail: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  roleBadge: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
});
