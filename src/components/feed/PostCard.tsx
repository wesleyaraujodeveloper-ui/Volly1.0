import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../theme/index';
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Trash, Heart, ChatCircleText } from 'phosphor-react-native';
import { format } from 'date-fns';

interface PostCardProps {
  post: any;
  user: any;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  onComment: (post: any) => void;
}

export const PostCard = memo(function PostCard({ post, user, onDelete, onLike, onComment }: PostCardProps) {
  const { theme, globalStyles } = useTheme();
  const styles = getStyles(theme);
  const authorName = post.profiles?.full_name || 'Usuário';
  const authorAvatar = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${authorName}`;
  let displayDate = 'Recentemente';
  
  try {
    if (post.created_at) displayDate = format(new Date(post.created_at), "dd/MM 'às' HH:mm");
  } catch (e) {}

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image source={{ uri: authorAvatar }} style={styles.postAvatar} />
        <View style={styles.postAuthorInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.postAuthor}>{authorName}</Text>
            {user?.role === 'MASTER' && post.institutions && (
              <View style={styles.instBadge}>
                <Text style={styles.instBadgeText}>{post.institutions.name}</Text>
              </View>
            )}
            {post.visibility === 'GLOBAL' && (
              <View style={[styles.instBadge, { backgroundColor: 'rgba(107, 197, 167, 0.1)', borderColor: theme.colors.success }]}>
                <Text style={[styles.instBadgeText, { color: theme.colors.success }]}>GLOBAL</Text>
              </View>
            )}
          </View>
          <Text style={styles.postTime}>{displayDate}</Text>
        </View>
        {(user?.role === 'ADMIN' || user?.role === 'MASTER' || user?.role === 'LÍDER' || user?.role === 'CO-LÍDER' || post.user_id === user?.id) && (
          <TouchableOpacity 
            style={styles.moreOptionsBtn} 
            onPress={() => onDelete(post.id)}
          >
            <Trash size={18} color={theme.colors.error} weight="regular" />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.postContent}>{post.content}</Text>
      {post.image_url && <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />}
      <View style={styles.postFooter}>
        <TouchableOpacity style={styles.interactionBtn} onPress={() => onLike(post.id)}>
          <Heart 
            size={20} 
            color={post.post_likes?.some((l: any) => l.user_id === user?.id) ? theme.colors.error : theme.colors.textSecondary} 
            weight={post.post_likes?.some((l: any) => l.user_id === user?.id) ? 'fill' : 'regular'}
          />
          <Text style={styles.interactionText}>{post.likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.interactionBtn} onPress={() => onComment(post)}>
          <ChatCircleText size={18} color={theme.colors.textSecondary} weight="regular" />
          <Text style={styles.interactionText}>{post.commentsCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const getStyles = (theme: Theme) => StyleSheet.create({
  postCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: theme.colors.border,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  postTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  instBadge: {
    backgroundColor: theme.colors.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  instBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  moreOptionsBtn: {
    padding: 8,
    marginLeft: 'auto',
  },
  postContent: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '40',
  },
  interactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 4,
  },
  interactionText: {
    marginLeft: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
