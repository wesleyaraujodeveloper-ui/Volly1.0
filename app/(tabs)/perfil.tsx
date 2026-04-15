import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { globalStyles, theme } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';
import { supabase } from '../../src/services/supabase';
import { availabilityService, UserDepartment } from '../../src/services/availabilityService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PerfilScreen() {
  const router = useRouter();
  const { user, clearSession, setUser } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [userDepartments, setUserDepartments] = useState<UserDepartment[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const getTeamIcon = (name: string) => {
    const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes('streaming')) return require('../../assets/images/icons/Streaming.png');
    if (normalized.includes('iluminacao')) return require('../../assets/images/icons/Iluminação.png');
    if (normalized.includes('projecao')) return require('../../assets/images/icons/Projeção.png');
    if (normalized.includes('audio')) return require('../../assets/images/icons/Tecnica de Audio.png');
    return null;
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const { data } = await availabilityService.getUserDepartments();
      setUserDepartments(data || []);
    } catch (error) {
      console.error('Error loading depts:', error);
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleLogout = async () => {
    const executeLogout = async () => {
      try {
        setLoading(true);
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        clearSession();
        setLoading(false);
        router.replace('/(auth)/login');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Deseja realmente sair da sua conta?')) {
        executeLogout();
      }
      return;
    }

    Alert.alert(
      'Sair',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: executeLogout }
      ]
    );
  };

  const handleDeleteAccount = () => {
    const notifyAdmin = () => {
      if (Platform.OS === 'web') {
        window.alert('Funcionalidade em desenvolvimento. Contate o administrador.');
        return;
      }
      Alert.alert('Aviso', 'Funcionalidade em desenvolvimento. Contate o administrador.');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Esta ação é permanente e todos os seus dados serão perdidos. Deseja continuar?')) {
        notifyAdmin();
      }
      return;
    }

    Alert.alert(
      'Excluir Conta',
      'Esta ação é permanente e todos os seus dados serão perdidos. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir Permanentemente', style: 'destructive', onPress: notifyAdmin }
      ]
    );
  };

  const alertSoon = (title: string) => {
    const msg = 'Esta configuração será liberada em breve na próxima atualização!';
    if (Platform.OS === 'web') {
      window.alert(title + ': ' + msg);
      return;
    }
    Alert.alert(title, msg);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header com Gradiente */}
      <LinearGradient
        colors={[theme.colors.primary, '#FFA726']}
        style={styles.header}
      >
        <View style={styles.avatarContainer}>
           <View style={styles.avatarPlaceholder}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={50} color={theme.colors.primary} />
              )}
           </View>
           <View style={styles.roleBadge}>
             <Text style={styles.roleBadgeText}>{user?.role}</Text>
           </View>
         </View>
         <Text style={styles.userName}>{user?.name || 'Voluntário'}</Text>
         <Text style={styles.userEmail}>{user?.email}</Text>
       </LinearGradient>

      {/* Seção Equipes (Real time) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Minhas Equipes</Text>
        
        {loadingDepts ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : userDepartments.length > 0 ? (
          <View style={styles.teamsGrid}>
              {userDepartments.map((dept, index) => {
                const teamIcon = getTeamIcon(dept.departments.name);
                return (
                  <View key={index} style={styles.teamCard}>
                    <View style={styles.teamIconBox}>
                      {teamIcon ? (
                        <Image source={teamIcon} style={styles.teamIconImage} />
                      ) : (
                        <Ionicons name="people" size={24} color={theme.colors.primary} />
                      )}
                    </View>
                    <Text style={styles.teamNameText} numberOfLines={1}>
                      {dept.departments.name}
                    </Text>
                  </View>
                );
              })}
          </View>
        ) : (
          <View style={styles.emptyTeamsCard}>
            <Text style={styles.emptyTeamsText}>Você ainda não faz parte de nenhuma equipe.</Text>
          </View>
        )}
      </View>

      {/* Configurações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => alertSoon('Notificações')}>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
          <Text style={styles.menuItemText}>Notificações</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy')}>
          <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.text} />
          <Text style={styles.menuItemText}>Privacidade</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#F44336" />
          <Text style={[styles.menuItemText, { color: '#F44336' }]}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.deleteLink} onPress={handleDeleteAccount}>
        <Text style={styles.deleteLinkText}>Excluir minha conta permanentemente</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Volly v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },

  roleBadge: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    backgroundColor: '#121212',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'white',
  },
  roleBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  userName: {
    color: '#121212',
    fontSize: 24,
    fontWeight: '800',
  },
  userEmail: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 14,
    marginBottom: 10,
  },

  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  teamCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  teamIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 106, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  teamIconImage: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain',
  },
  teamNameText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyTeamsCard: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyTeamsText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemText: {
    color: theme.colors.text,
    fontSize: 16,
    flex: 1,
    marginLeft: 15,
  },
  deleteLink: {
    marginTop: 40,
    alignItems: 'center',
  },
  deleteLinkText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  versionText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 20,
  }
});
