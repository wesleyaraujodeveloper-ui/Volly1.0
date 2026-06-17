import React from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';
import { theme } from '../../../src/theme';

interface SwapScheduleModalProps {
  visible: boolean;
  swapReason: string;
  setSwapReason: (text: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SwapScheduleModal({ visible, swapReason, setSwapReason, onCancel, onConfirm }: SwapScheduleModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlaySwap}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Solicitar Troca de Escala</Text>
          <Text style={styles.modalSubtitle}>Explique brevemente ao seu líder o motivo da troca (opcional).</Text>
          
          <TextInput
            style={styles.reasonInput}
            placeholder="Ex: Tive um imprevisto no trabalho..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={4}
            value={swapReason}
            onChangeText={setSwapReason}
          />

          <View style={styles.modalActionsSwap}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={onConfirm}>
              <Text style={styles.modalConfirmText}>Enviar Solicitação</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlaySwap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    color: theme.colors.textSecondary,
    marginBottom: 15,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActionsSwap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  modalCancelBtn: {
    padding: 12,
  },
  modalCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
  },
  modalConfirmBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
