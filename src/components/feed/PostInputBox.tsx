import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../theme/index';
import React from 'react';
import { View, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Camera, ImageSquare, Globe, PaperPlaneTilt, XCircle } from 'phosphor-react-native';

interface PostInputBoxProps {
  user: any;
  newPostContent: string;
  setNewPostContent: (content: string) => void;
  selectedImage: { uri: string; base64?: string } | null;
  setSelectedImage: (image: { uri: string; base64?: string } | null) => void;
  isPosting: boolean;
  postVisibility: 'INTERNAL' | 'GLOBAL';
  setPostVisibility: React.Dispatch<React.SetStateAction<'INTERNAL' | 'GLOBAL'>>;
  handleImagePick: () => void;
  handleCameraPick: () => void;
  handleCreatePost: () => void;
}

export function PostInputBox({
  user,
  newPostContent,
  setNewPostContent,
  selectedImage,
  setSelectedImage,
  isPosting,
  postVisibility,
  setPostVisibility,
  handleImagePick,
  handleCameraPick,
  handleCreatePost,
}: PostInputBoxProps) {
  const { theme, globalStyles } = useTheme();
  const styles = getStyles(theme);
  return (
    <>
      <View style={styles.postInputCard}>
        <View style={styles.postInputHeader}>
          <Image 
            source={{ uri: user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.name || 'Voluntario'}&background=random` }} 
            style={styles.postAvatarSmall} 
          />
          <TextInput
            style={styles.postInput}
            placeholder="No que você está pensando?"
            placeholderTextColor={theme.colors.textSecondary}
            value={newPostContent}
            onChangeText={setNewPostContent}
            multiline
          />
        </View>
        
        <View style={styles.postInputFooter}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.postActionBtn} onPress={handleImagePick}>
              <ImageSquare size={22} color={theme.colors.primary} weight="regular" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.postActionBtn} onPress={handleCameraPick}>
              <Camera size={22} color={theme.colors.primary} weight="regular" />
            </TouchableOpacity>
            
            {user?.role === 'MASTER' && (
              <TouchableOpacity 
                style={[styles.postActionBtn, postVisibility === 'GLOBAL' && { backgroundColor: 'rgba(107, 197, 167, 0.1)' }]} 
                onPress={() => setPostVisibility(v => v === 'INTERNAL' ? 'GLOBAL' : 'INTERNAL')}
              >
                <Globe 
                  size={22} 
                  color={postVisibility === 'GLOBAL' ? theme.colors.success : theme.colors.textSecondary} 
                  weight={postVisibility === 'GLOBAL' ? 'fill' : 'regular'}
                />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.postButton, (!newPostContent.trim() && !selectedImage) && styles.postButtonDisabled]} 
            onPress={handleCreatePost}
            disabled={isPosting || (!newPostContent.trim() && !selectedImage)}
          >
            {isPosting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <PaperPlaneTilt size={18} color="#FFFFFF" weight="fill" />}
          </TouchableOpacity>
        </View>
      </View>

      {selectedImage && selectedImage.uri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
            <XCircle size={24} color={theme.colors.error} weight="fill" />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  postInputCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  postInputHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: theme.colors.border,
  },
  postInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    minHeight: 40,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  postInputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '40',
  },
  postActionBtn: {
    padding: 8,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButton: {
    backgroundColor: theme.colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  postButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  previewContainer: {
    marginBottom: 20,
    position: 'relative',
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
});
