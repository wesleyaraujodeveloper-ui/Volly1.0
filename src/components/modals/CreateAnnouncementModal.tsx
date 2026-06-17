import React from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../../src/theme';

interface CreateAnnouncementModalProps {
  visible: boolean;
  title: string;
  setTitle: (text: string) => void;
  content: string;
  setContent: (text: string) => void;
  days: string;
  setDays: (text: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPosting: boolean;
}

export function CreateAnnouncementModal({
  visible,
  title,
  setTitle,
  content,
  setContent,
  days,
  setDays,
  onCancel,
  onSubmit,
  isPosting
}: CreateAnnouncementModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlaySwap}>
        <View style={styles.modalCard}>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Novo Aviso Oficial</Text>
          
          <TextInput
            style={[styles.reasonInput, { minHeight: 40, marginBottom: 10 }]}
            placeholder="Título do Aviso"
            placeholderTextColor={theme.colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
          
          <TextInput
            style={[styles.reasonInput, { marginBottom: 10 }]}
            placeholder="Conteúdo..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            value={content}
            onChangeText={setContent}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: theme.colors.textSecondary, marginRight: 10 }}>Duração (dias):</Text>
            <TextInput
              style={[styles.reasonInput, { minHeight: 40, flex: 1, textAlign: 'center' }]}
              keyboardType="numeric"
              value={days}
              onChangeText={setDays}
            />
          </View>

          <View style={styles.modalActionsSwap}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalConfirmBtn, (!title.trim() || !content.trim()) && { opacity: 0.5 }]} 
              onPress={onSubmit}
              disabled={isPosting || !title.trim() || !content.trim()}
            >
              {isPosting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Fixar Aviso</Text>}
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
