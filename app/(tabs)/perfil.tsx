import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';

export default function PerfilScreen() {
  const { user, setUser } = useAppStore();

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <View style={globalStyles.center}>
      <Text style={globalStyles.textTitle}>Perfil de Usuário</Text>
      <Text style={globalStyles.textBody}>{user?.name} - {user?.email}</Text>
      
      <TouchableOpacity 
        style={[styles.button, { marginTop: 20 }]} 
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Sair (Logout)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
