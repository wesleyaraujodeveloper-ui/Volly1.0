import { useTheme } from '../../hooks/useTheme';
import { Theme } from '../../theme/index';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Desktop, PlugsConnected, Plugs, X, Password } from 'phosphor-react-native';
import { holyricsService, HolyricsConfig } from '../../../src/services/holyricsService';
import { EventSong } from '../../../src/services/songService';

interface HolyricsExportModalProps {
  visible: boolean;
  onClose: () => void;
  songs: EventSong[];
}

export function HolyricsExportModal({ visible, onClose, songs }: HolyricsExportModalProps) {
  const { theme, globalStyles } = useTheme();
  const styles = getStyles(theme);
  const [connectionCode, setConnectionCode] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (visible) {
      loadSavedConfig();
      setConnectionStatus('idle');
    }
  }, [visible]);

  const loadSavedConfig = async () => {
    const config = await holyricsService.loadConfig();
    if (config && config.connectionCode) {
      setConnectionCode(config.connectionCode);
    }
  };

  const handleTestConnection = async () => {
    if (!connectionCode) {
      Alert.alert('Aviso', 'Preencha o Código de Conexão antes de testar.');
      return;
    }
    
    setIsTesting(true);
    setConnectionStatus('idle');
    const config = { connectionCode: connectionCode.trim() };
    
    // Save locally
    await holyricsService.saveConfig(config);

    const { success, message } = await holyricsService.testConnection(config);
    setIsTesting(false);

    if (success) {
      setConnectionStatus('success');
      Alert.alert('Sucesso', 'Código salvo! O envio será direcionado para o Volly Connector associado a este código.');
    } else {
      setConnectionStatus('error');
      Alert.alert('Erro', message || 'Código inválido.');
    }
  };

  const handleExport = async () => {
    if (!connectionCode) {
      Alert.alert('Aviso', 'Preencha o Código de Conexão do PC da Igreja.');
      return;
    }

    if (songs.length === 0) {
      Alert.alert('Aviso', 'A playlist está vazia. Adicione músicas primeiro.');
      return;
    }

    setIsExporting(true);
    const config = { connectionCode: connectionCode.trim() };
    await holyricsService.saveConfig(config);

    const { success, message } = await holyricsService.exportPlaylist(config, songs);
    setIsExporting(false);

    if (success) {
      Alert.alert('Exportado com Sucesso! 🎉', 'As músicas chegaram no computador da Igreja.', [
        { text: 'OK', onPress: onClose }
      ]);
    } else {
      Alert.alert('Falha na Exportação', message || 'Não foi possível completar o envio para a Igreja.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView 
        style={styles.modalOverlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Desktop size={28} color={theme.colors.primary} weight="duotone" />
              <Text style={styles.title}>Exportar para Holyrics</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={theme.colors.textSecondary} weight="bold" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Digite o Código de Conexão configurado no Volly Connector do computador da sua igreja. O envio é feito pela nuvem de onde você estiver.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Código de Conexão</Text>
            <View style={styles.inputContainer}>
              <Password size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' } as any]}
                placeholder="Ex: 123456"
                placeholderTextColor={theme.colors.textSecondary}
                value={connectionCode}
                onChangeText={setConnectionCode}
                keyboardType="default"
              />
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.testBtn, connectionStatus === 'success' && { borderColor: theme.colors.success }]} 
              onPress={handleTestConnection}
              disabled={isTesting || isExporting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <>
                  {connectionStatus === 'success' ? (
                    <PlugsConnected size={20} color={theme.colors.success} weight="bold" />
                  ) : (
                    <Plugs size={20} color={theme.colors.text} weight="regular" />
                  )}
                  <Text style={[styles.testBtnText, connectionStatus === 'success' && { color: theme.colors.success }]}>
                    {connectionStatus === 'success' ? 'Salvo!' : 'Salvar Código'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.exportBtn, (!connectionCode) && { opacity: 0.5 }]} 
              onPress={handleExport}
              disabled={isExporting || !connectionCode}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.exportBtnText}>Enviar {songs.length} Músicas</Text>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 10,
  },
  closeBtn: {
    padding: 5,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    height: 48,
    color: theme.colors.text,
    fontSize: 15,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    height: 50,
    gap: 8,
  },
  testBtnText: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  exportBtn: {
    flex: 1.5,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 50,
  },
  exportBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
