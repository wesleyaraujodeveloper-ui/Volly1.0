import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../src/services/supabase';
import { useAppStore } from '../src/store/useAppStore';
import { notificationService } from '../src/services/notificationService';
import { theme, globalStyles } from '../src/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notificationService.getUserNotifications(user.id);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();

    // Inscrição em tempo real para novas notificações
    const subscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadNotifications, user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (item: any) => {
    if (!item.is_read) {
      await notificationService.markAsRead(item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
    }

    if (item.type === 'NEW_EVENT' && item.related_id) {
      router.push(`/events/${item.related_id}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.notificationCard, !item.is_read && styles.unreadCard]} 
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, !item.is_read && styles.unreadIconBox]}>
        <Ionicons 
          name={item.type === 'NEW_EVENT' ? 'calendar' : 'notifications'} 
          size={24} 
          color={!item.is_read ? theme.colors.primary : theme.colors.textSecondary} 
        />
        {!item.is_read && <View style={styles.unreadDot} />}
      </View>
      
      <View style={styles.contentBox}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, !item.is_read && styles.unreadText]}>{item.title}</Text>
          <Text style={styles.timeText}>
            {format(new Date(item.created_at), 'HH:mm', { locale: ptBR })}
          </Text>
        </View>
        <Text style={[styles.body, !item.is_read && styles.unreadBodyText]} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.dateText}>
          {format(new Date(item.created_at), "dd 'de' MMMM", { locale: ptBR })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={globalStyles.textTitle}>Notificações</Text>
        {notifications.some(n => !n.is_read) && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.clearAllText}>Ler tudo</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Image 
            source={require('../assets/images/illustrations/empty_illustration.png')} 
            style={styles.emptyImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>Tudo em ordem!</Text>
          <Text style={styles.emptySub}>Você não tem novas notificações no momento.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  clearAllText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  unreadCard: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  unreadIconBox: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  contentBox: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  unreadText: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 15,
  },
  timeText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  unreadBodyText: {
    color: theme.colors.text,
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
    opacity: 0.6,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySub: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
