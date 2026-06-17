import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { YoutubeLogo, MusicNotes } from 'phosphor-react-native';
import { theme } from '../../theme';

interface RecommendedSongsProps {
  songs: any[];
}

export function RecommendedSongs({ songs }: RecommendedSongsProps) {
  if (songs.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Músicas para se Inspirar</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.songsScroll}>
        {songs.map((song, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.songCard}
            onPress={() => song.youtube ? Linking.openURL(song.youtube) : song.spotify ? Linking.openURL(song.spotify) : null}
          >
            <View style={styles.songIconBox}>
              {song.youtube ? (
                <YoutubeLogo size={24} color="#FF0000" weight="fill" />
              ) : (
                <MusicNotes size={24} color={theme.colors.primary} weight="regular" />
              )}
            </View>
            <View style={styles.songDetails}>
              <Text style={styles.songName} numberOfLines={1}>{song.name}</Text>
              <Text style={styles.songSub}>Tocado recentemente</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 15,
  },
  songsScroll: {
    paddingRight: 20,
  },
  songCard: {
    backgroundColor: theme.colors.surface,
    width: 160,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  songIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  songDetails: {},
  songName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  songSub: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
});
