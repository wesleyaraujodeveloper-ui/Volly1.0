import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { PushPin, Megaphone, X } from 'phosphor-react-native';
import { theme } from '../../theme';
import { Announcement, announcementService } from '../../services/announcementService';

interface AnnouncementsSectionProps {
  announcements: Announcement[];
  user: any;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
}

export function AnnouncementsSection({ announcements, user, onRefresh, onOpenCreateModal }: AnnouncementsSectionProps) {
  const [expandedAnns, setExpandedAnns] = useState<Record<string, boolean>>({});

  const canManage = user?.role === 'LÍDER' || user?.role === 'ADMIN' || user?.role === 'MASTER';

  if (announcements.length === 0 && !canManage) return null;

  const handleDelete = async (id: string) => {
    await announcementService.deleteAnnouncement(id);
    onRefresh();
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <PushPin size={18} color={theme.colors.primary} weight="fill" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Avisos Oficiais</Text>
        </View>
        {canManage && (
          <TouchableOpacity onPress={onOpenCreateModal}>
            <Text style={styles.newAnnouncementBtn}>+ Novo Aviso</Text>
          </TouchableOpacity>
        )}
      </View>

      {announcements.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {announcements.map((ann) => {
            const isExpanded = expandedAnns[ann.id];
            return (
              <TouchableOpacity 
                key={ann.id} 
                activeOpacity={0.9}
                onPress={() => setExpandedAnns(prev => ({ ...prev, [ann.id]: !prev[ann.id] }))}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Megaphone size={16} color="#B8860B" weight="fill" style={{ marginRight: 4 }} />
                  <Text style={styles.cardTitle} numberOfLines={1}>{ann.title}</Text>
                  {(user?.role === 'ADMIN' || user?.role === 'MASTER' || ann.author_id === user?.id) && (
                    <TouchableOpacity onPress={() => handleDelete(ann.id)}>
                      <X size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.content} numberOfLines={isExpanded ? undefined : 3}>{ann.content}</Text>
                {ann.content.length > 120 && (
                  <Text style={styles.readMore}>
                    {isExpanded ? 'Mostrar menos' : 'Ler mais...'}
                  </Text>
                )}
                <View style={styles.authorRow}>
                  <Image source={{ uri: ann.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${ann.profiles?.full_name}` }} style={styles.authorAvatar} />
                  <Text style={styles.authorName}>Por {ann.profiles?.full_name}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.emptyTextSmaller}>Nenhum aviso no momento.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 25,
  },
  headerRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  newAnnouncementBtn: {
    color: theme.colors.primary, 
    fontSize: 12, 
    fontWeight: 'bold'
  },
  card: {
    width: 280, 
    backgroundColor: 'rgba(255, 215, 0, 0.1)', 
    padding: 12, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 215, 0, 0.3)'
  },
  cardHeader: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8
  },
  cardTitle: {
    color: '#B8860B', 
    fontWeight: 'bold', 
    fontSize: 12, 
    flex: 1
  },
  content: {
    color: theme.colors.text, 
    fontSize: 13
  },
  readMore: {
    color: '#B8860B', 
    fontSize: 11, 
    marginTop: 4, 
    fontWeight: 'bold'
  },
  authorRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8
  },
  authorAvatar: {
    width: 16, 
    height: 16, 
    borderRadius: 8, 
    marginRight: 6
  },
  authorName: {
    color: theme.colors.textSecondary, 
    fontSize: 10
  },
  emptyTextSmaller: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  }
});
