import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../theme/index';
import React from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, FlatList } from 'react-native';
import { X, PaperPlaneTilt } from 'phosphor-react-native';

interface CommentsModalProps {
  visible: boolean;
  activeCommentPost: any;
  closeComments: () => void;
  loadingComments: boolean;
  postComments: any[];
  newCommentText: string;
  setNewCommentText: (text: string) => void;
  submitComment: () => void;
  isCommenting: boolean;
}

export function CommentsModal({
  visible,
  activeCommentPost,
  closeComments,
  loadingComments,
  postComments,
  newCommentText,
  setNewCommentText,
  submitComment,
  isCommenting
}: CommentsModalProps) {
  const { theme, globalStyles } = useTheme();
  const styles = getStyles(theme);
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView 
        style={styles.modalOverlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderGrabber} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 10 }}>
              <Text style={styles.modalTitle}>Comentários</Text>
              <TouchableOpacity onPress={closeComments} style={{ padding: 5 }}>
                <X size={24} color={theme.colors.textSecondary} weight="bold" />
              </TouchableOpacity>
            </View>
            {activeCommentPost && (
              <View style={{ width: '100%', marginTop: 15, paddingBottom: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Image 
                    source={{ uri: activeCommentPost.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${activeCommentPost.profiles?.full_name || 'U'}&background=random` }} 
                    style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8, backgroundColor: theme.colors.border }} 
                  />
                  <Text style={{ fontWeight: 'bold', color: theme.colors.text, fontSize: 13 }}>
                    {activeCommentPost.profiles?.full_name || 'Usuário'}
                  </Text>
                </View>
                <Text style={{ color: theme.colors.text, fontSize: 14, lineHeight: 20 }} numberOfLines={4}>
                  {activeCommentPost.content}
                </Text>
              </View>
            )}
          </View>
          
          {loadingComments ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
          ) : (
            <FlatList
              data={postComments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20 }}
              ListEmptyComponent={<Text style={styles.emptyCommentsText}>Seja o primeiro a comentar!</Text>}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <Image source={{ uri: item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${item.profiles?.full_name || 'U'}&background=random` }} style={styles.commentAvatar} />
                  <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthor}>{item.profiles?.full_name || 'Usuário'}</Text>
                    <Text style={styles.commentText}>{item.content}</Text>
                  </View>
                </View>
              )}
            />
          )}

          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Escreva um comentário..."
              placeholderTextColor={theme.colors.textSecondary}
              value={newCommentText}
              onChangeText={setNewCommentText}
              multiline
            />
            <TouchableOpacity style={styles.commentSendBtn} onPress={submitComment} disabled={isCommenting}>
              {isCommenting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <PaperPlaneTilt size={18} color="#fff" weight="fill" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  modalHeaderGrabber: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  emptyCommentsText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 20,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: theme.colors.border,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: theme.colors.surfaceHighlight,
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: theme.colors.text,
    fontSize: 13,
    marginBottom: 4,
  },
  commentText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 40,
    maxHeight: 100,
    color: theme.colors.text,
  },
  commentSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});
