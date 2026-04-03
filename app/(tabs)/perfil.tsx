import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';
import { supabase } from '../../src/services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PerfilScreen() {
  const { user, clearSession } = useAppStore();
  const [loading, setLoading] = useState(false);

  // Mock de dados financeiros (isso virá do banco depois)
  const billInfo = {
    currentBalance: 125.50,
    monthlyCost: 45.00,
    dueDate: '10/10/2026'
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            clearSession();
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir Conta',
      'Esta ação é permanente e todos os seus dados serão perdidos. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir Permanentemente', 
          style: 'destructive',
          onPress: async () => {
            Alert.alert('Aviso', 'Funcionalidade em desenvolvimento. Contate o administrador.');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header com Gradiente */}
      <LinearGradient
        colors={[theme.colors.primary, '#FFA726']}
        style={styles.header}
      >
        <View style={styles.avatarContainer}>
           <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={50} color={theme.colors.primary} />
           </View>
           <View style={styles.roleBadge}>
             <Text style={styles.roleBadgeText}>{user?.role}</Text>
           </View>
        </View>
        <Text style={styles.userName}>{user?.name || 'Voluntário'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </LinearGradient>

      {/* Seção Financeira */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financeiro</Text>
        
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.cardLabel}>Saldo Atual</Text>
              <Text style={[styles.cardValue, { color: '#4CAF50' }]}>
                R$ {billInfo.currentBalance.toFixed(2)}
              </Text>
            </View>
            <Ionicons name="wallet-outline" size={32} color="#4CAF50" />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.row}>
            <View>
              <Text style={styles.cardLabel}>Gasto do Mês</Text>
              <Text style={[styles.cardValue, { color: '#F44336' }]}>
                R$ {billInfo.monthlyCost.toFixed(2)}
              </Text>
            </View>
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Vence em</Text>
              <Text style={styles.dateValue}>{billInfo.dueDate}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.payButton}>
            <Text style={styles.payButtonText}>Ver Detalhes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Configurações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
          <Text style={styles.menuItemText}>Notificações</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
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
  },
  userName: {
    color: '#121212',
    fontSize: 24,
    fontWeight: '800',
  },
  userEmail: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 14,
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 15,
  },
  dateInfo: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  dateValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  payButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  payButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
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
