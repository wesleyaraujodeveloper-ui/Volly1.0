import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../theme/index';
import React from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Star, CheckSquare, Square } from 'phosphor-react-native';

interface FeedbackModalProps {
  visible: boolean;
  pendingFeedbackEvent: any;
  feedbackSuccess: boolean;
  feedbackRating: number;
  setFeedbackRating: (rating: number) => void;
  feedbackComment: string;
  setFeedbackComment: (comment: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isPublicFeedback: boolean;
  setIsPublicFeedback: (isPublic: boolean) => void;
}

export function FeedbackModal({
  visible,
  pendingFeedbackEvent,
  feedbackSuccess,
  feedbackRating,
  setFeedbackRating,
  feedbackComment,
  setFeedbackComment,
  onCancel,
  onSubmit,
  isSubmitting,
  isPublicFeedback,
  setIsPublicFeedback
}: FeedbackModalProps) {
  const { theme, globalStyles } = useTheme();
  const styles = getStyles(theme);
  if (!pendingFeedbackEvent && !feedbackSuccess) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlaySwap}>
        <View style={styles.modalCard}>
          {feedbackSuccess ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Star size={48} color={theme.colors.primary} weight="fill" />
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 15, textAlign: 'center' }}>
                Obrigado pelo seu feedback!
              </Text>
              <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 10 }}>
                Sua opinião ajuda a melhorar nossa equipe.
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
                Como foi servir no evento "{pendingFeedbackEvent?.title}"?
              </Text>
              <Text style={styles.modalSubtitle}>
                Sua resposta ajuda seus líderes a acompanharem a equipe.
              </Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 20 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)}>
                    <Star size={40} color={feedbackRating >= star ? theme.colors.primary : theme.colors.border} weight={feedbackRating >= star ? "fill" : "regular"} />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.reasonInput}
                placeholder="Algum comentário ou sugestão? (Opcional)"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                value={feedbackComment}
                onChangeText={setFeedbackComment}
              />

              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 10 }}
                onPress={() => setIsPublicFeedback(!isPublicFeedback)}
              >
                {isPublicFeedback ? (
                  <CheckSquare size={24} color={theme.colors.primary} weight="fill" />
                ) : (
                  <Square size={24} color={theme.colors.textSecondary} />
                )}
                <Text style={{ color: theme.colors.text, flex: 1 }}>
                  Publicar este feedback no Mural da equipe
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActionsSwap}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
                  <Text style={styles.modalCancelText}>Agora Não</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalConfirmBtn, feedbackRating === 0 && { opacity: 0.5 }]} 
                  onPress={onSubmit}
                  disabled={isSubmitting || feedbackRating === 0}
                >
                  {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Enviar Feedback</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
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
