import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { globalStyles, theme } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';
import { supabase } from '../../src/services/supabase';
import { useUserDepartmentsProfile, useUserInstitution } from '../../src/hooks/queries/useProfile';
import { User, Users, Bell, ShieldCheck, FileText, SignOut, CaretRight } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { STRINGS } from '../../src/constants/strings';
import { CustomModal } from '../../src/components/CustomModal';
import { Platform } from 'react-native';

export default function PerfilScreen() {
  const router = useRouter();
  const { user, clearSession, setUser } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; message: string; type: 'info' | 'success' | 'danger'; onConfirm?: () => void }>({ title: '', message: '', type: 'info' });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'danger' = 'info') => {
    setModalData({ title, message, type });
    setModalVisible(true);
  };

  const getTeamIcon = (name: string) => {
    const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes('streaming')) return require('../../assets/images/icons/Streaming.png');
    if (normalized.includes('iluminacao')) return require('../../assets/images/icons/Iluminação.png');
    if (normalized.includes('projecao')) return require('../../assets/images/icons/Projeção.png');
    if (normalized.includes('audio')) return require('../../assets/images/icons/Tecnica de Audio.png');
    return null;
  };

  const { data: userDepartments = [], isLoading: loadingDepts } = useUserDepartmentsProfile();
  const { data: institution } = useUserInstitution(user?.institution_id);

  const handleLogout = () => {
    setModalData({
      title: 'Sair da Conta',
      message: 'Deseja realmente sair da sua conta?',
      type: 'danger',
      onConfirm: async () => {
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
      }
    });
    setModalVisible(true);
  };



  const alertSoon = (title: string) => {
    showAlert(title, 'Esta configuração será liberada em breve na próxima atualização!', 'info');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header com Gradiente */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.avatarContainer}>
           <View style={styles.avatarPlaceholder}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <User size={50} color={theme.colors.primary} weight="fill" />
              )}
           </View>
           <View style={styles.roleBadge}>
             <Text style={styles.roleBadgeText}>{user?.role}</Text>
           </View>
         </View>
         <Text style={styles.userName}>{user?.name || 'Voluntário'}</Text>
         <Text style={styles.userEmail}>{user?.email}</Text>
         
         {institution && (
           <View style={styles.institutionBadge}>
             {institution.logo_url && (
               <Image source={{ uri: institution.logo_url }} style={styles.institutionLogoMini} />
             )}
             <Text style={styles.institutionNameText}>{institution.name}</Text>
           </View>
         )}
       </LinearGradient>

      {/* Seção Equipes (Real time) - Oculta para MASTER */}
      {user?.role !== 'MASTER' && (
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
                          <Users size={24} color={theme.colors.primary} weight="regular" />
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
      )}

      {/* Configurações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')}>
          <Bell size={24} color={theme.colors.text} weight="regular" />
          <Text style={styles.menuItemText}>Notificações</Text>
          <CaretRight size={20} color={theme.colors.textSecondary} weight="bold" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy')}>
          <ShieldCheck size={24} color={theme.colors.text} weight="regular" />
          <Text style={styles.menuItemText}>Privacidade</Text>
          <CaretRight size={20} color={theme.colors.textSecondary} weight="bold" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/terms')}>
          <FileText size={24} color={theme.colors.text} weight="regular" />
          <Text style={styles.menuItemText}>Termos de Uso</Text>
          <CaretRight size={20} color={theme.colors.textSecondary} weight="bold" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <SignOut size={24} color="#F44336" weight="bold" />
          <Text style={[styles.menuItemText, { color: '#F44336' }]}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>


      <Text style={styles.versionText}>{STRINGS.profile.version}</Text>

      <CustomModal 
        visible={modalVisible}
        title={modalData.title}
        message={modalData.message}
        type={modalData.type}
        onConfirm={() => {
          if (modalData.title === 'Sair da Conta') {
             // onConfirm no modalData já tem a lógica de logout
             modalData.onConfirm();
          }
          setModalVisible(false);
        }}
        onCancel={() => setModalVisible(false)}
        confirmText={modalData.title === 'Sair da Conta' ? 'Sair' : 'OK'}
      />
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
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  userEmail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 10,
  },
  institutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 5,
  },
  institutionLogoMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
  },
  institutionNameText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
    backgroundColor: 'rgba(223, 114, 27, 0.1)', // #DF721B com opacidade
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
  versionText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 20,
  }
});
