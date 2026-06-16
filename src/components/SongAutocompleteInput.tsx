import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { theme } from '../theme';
import { songService, GlobalSong } from '../services/songService';
import { MagnifyingGlass, Plus, X, Hash } from 'phosphor-react-native';

interface Props {
  onSelectSong: (song: GlobalSong) => void;
  onClose: () => void;
  visible: boolean;
}

export function SongAutocompleteInput({ onSelectSong, onClose, visible }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSong[]>([]);
  const [loading, setLoading] = useState(false);

  // New Song form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newTags, setNewTags] = useState('');
  const [creating, setCreating] = useState(false);
  const [popularTags, setPopularTags] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setShowNewForm(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && showNewForm) {
      // Carregar histórico de tags baseado nas músicas mais tocadas
      songService.getTopGlobalSongs(100).then(res => {
        if (res.data) {
          const allTags = res.data.flatMap(s => s.tags || []);
          const counts: Record<string, number> = {};
          allTags.forEach(t => {
            const cleanTag = t.trim();
            if (cleanTag) counts[cleanTag] = (counts[cleanTag] || 0) + 1;
          });
          const top = Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, 10);
          
          const defaults = ["Adoração", "Louvor", "Celebração", "Santa Ceia", "Apelo"];
          const finalTags = Array.from(new Set([...top, ...defaults])).slice(0, 15);
          setPopularTags(finalTags);
        }
      });
    }
  }, [visible, showNewForm]);

  const toggleTag = (tag: string) => {
    const currentTags = newTags.split(',').map(t => t.trim()).filter(Boolean);
    if (currentTags.includes(tag)) {
      setNewTags(currentTags.filter(t => t !== tag).join(', '));
    } else {
      setNewTags(currentTags.length > 0 ? `${newTags}, ${tag}` : tag);
    }
  };

  const searchSongs = useCallback(async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    const { data } = await songService.searchGlobalSongs(text);
    setResults(data || []);
    setLoading(false);
  }, []);

  const handleCreateNew = async () => {
    if (!newTitle.trim() || !newArtist.trim()) return;
    
    setCreating(true);
    const tagsArray = newTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    const { data, error } = await songService.createGlobalSong({
      title: newTitle.trim(),
      artist: newArtist.trim(),
      tags: tagsArray
    });

    setCreating(false);

    if (data) {
      onSelectSong(data);
      onClose();
    } else {
      // Show error, handled silently for now
      console.log("Error creating song", error);
    }
  };

  const renderItem = ({ item }: { item: GlobalSong }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => { onSelectSong(item); onClose(); }}>
      <View style={styles.songInfo}>
        <Text style={styles.songTitle}>{item.title}</Text>
        <Text style={styles.songArtist}>{item.artist}</Text>
      </View>
      <View style={styles.addBtn}>
        <Text style={styles.addBtnText}>Adicionar</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Adicionar Música</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {!showNewForm ? (
          <>
            <View style={styles.searchBox}>
              <MagnifyingGlass size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Buscar pelo nome da música ou artista..."
                placeholderTextColor={theme.colors.textSecondary}
                value={query}
                onChangeText={searchSongs}
                autoFocus
              />
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListFooterComponent={() => (
                  query.length > 1 ? (
                    <TouchableOpacity 
                      style={styles.createNewBtn} 
                      onPress={() => {
                        setNewTitle(query);
                        setShowNewForm(true);
                      }}
                    >
                      <Plus size={20} color={theme.colors.primary} />
                      <Text style={styles.createNewText}>Não encontrou? Cadastrar "{query}"</Text>
                    </TouchableOpacity>
                  ) : null
                )}
              />
            )}
          </>
        ) : (
          <View style={styles.newFormContainer}>
            <Text style={styles.newFormTitle}>Cadastrar Nova Música Global</Text>
            
            <Text style={styles.label}>Título da Música</Text>
            <TextInput
              style={styles.formInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Ex: Oceanos"
              placeholderTextColor={theme.colors.textSecondary}
            />

            <Text style={styles.label}>Artista / Banda</Text>
            <TextInput
              style={styles.formInput}
              value={newArtist}
              onChangeText={setNewArtist}
              placeholder="Ex: Hillsong"
              placeholderTextColor={theme.colors.textSecondary}
            />

            <Text style={styles.label}>Tags (separadas por vírgula)</Text>
            {popularTags.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, maxHeight: 35 }}>
                {popularTags.map(tag => {
                  const currentTags = newTags.split(',').map(t => t.trim()).filter(Boolean);
                  const isSelected = currentTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        backgroundColor: isSelected ? 'rgba(223, 114, 27, 0.15)' : theme.colors.background,
                        marginRight: 8,
                        justifyContent: 'center'
                      }}
                    >
                      <Text style={{
                        color: isSelected ? theme.colors.primary : theme.colors.textSecondary,
                        fontWeight: isSelected ? 'bold' : 'normal',
                        fontSize: 12
                      }}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            <TextInput
              style={styles.formInput}
              value={newTags}
              onChangeText={setNewTags}
              placeholder="Ex: Adoração, Louvor, Lenta"
              placeholderTextColor={theme.colors.textSecondary}
            />

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewForm(false)}>
                <Text style={styles.cancelBtnText}>Voltar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.saveBtn, (!newTitle || !newArtist) && { opacity: 0.5 }]} 
                onPress={handleCreateNew}
                disabled={!newTitle || !newArtist || creating}
              >
                {creating ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Salvar e Adicionar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    flex: 1,
    height: 50,
    color: theme.colors.text,
    marginLeft: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  songArtist: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  addBtn: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBtnText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  createNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  createNewText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  newFormContainer: {
    padding: 16,
  },
  newFormTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    color: theme.colors.text,
    padding: 12,
    marginBottom: 16,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelBtnText: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  saveBtn: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    marginLeft: 8,
  },
  saveBtnText: {
    color: '#000',
    fontWeight: 'bold',
  }
});
