import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../theme/index';
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { ArrowClockwise, WarningCircle } from 'phosphor-react-native';

interface UpdateAvailableModalProps {
  visible: boolean;
  onUpdate: () => void;
}

export function UpdateAvailableModal({ visible, onUpdate }: UpdateAvailableModalProps) {
  const { theme, globalStyles } = useTheme();
  const styles = getStyles(theme);
  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <WarningCircle size={48} color={theme.colors.primary} weight="duotone" />
          </View>
          
          <Text style={styles.title}>Atualização Disponível!</Text>
          <Text style={styles.subtitle}>
            Uma nova versão do aplicativo está disponível. Para continuar utilizando sem problemas de compatibilidade, precisamos recarregar a tela.
          </Text>

          <TouchableOpacity style={styles.updateButton} onPress={onUpdate}>
            <ArrowClockwise size={20} color="#FFF" weight="bold" />
            <Text style={styles.updateButtonText}>Recarregar Aplicativo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    padding: 20,
    borderRadius: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  updateButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
