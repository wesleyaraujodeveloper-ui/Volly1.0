import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Desktop, PlugsConnected, Plugs, X, WifiHigh } from 'phosphor-react-native';
import { theme } from '../../../src/theme';
import { holyricsService, HolyricsConfig } from '../../../src/services/holyricsService';
import { EventSong } from '../../../src/services/songService';

interface HolyricsExportModalProps {
  visible: boolean;
  onClose: () => void;
  songs: EventSong[];
}

export function HolyricsExportModal({ visible, onClose, songs }: HolyricsExportModalProps) {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('8080');
  const [token, setToken] = useState('');
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
    if (config) {
      setIp(config.ip);
      setPort(config.port);
      setToken(config.token);
    }
  };

  const handleTestConnection = async () => {
    if (!ip || !port || !token) {
      Alert.alert('Aviso', 'Preencha todos os campos antes de testar.');
      return;
    }
    
    setIsTesting(true);
    setConnectionStatus('idle');
    const config = { ip: ip.trim(), port: port.trim(), token: token.trim() };
    
    // Save locally
    await holyricsService.saveConfig(config);

    const { success, message } = await holyricsService.testConnection(config);
    setIsTesting(false);

    if (success) {
      setConnectionStatus('success');
      Alert.alert('Sucesso', 'Conexão com o Holyrics estabelecida!');
    } else {
      setConnectionStatus('error');
      Alert.alert('Erro de Conexão', message || 'Não foi possível conectar. Verifique se o celular está no mesmo Wi-Fi do computador da igreja.');
    }
  };

  const handleExport = async () => {
    if (!ip || !port || !token) {
      Alert.alert('Aviso', 'Preencha as configurações do Holyrics.');
      return;
    }

    if (songs.length === 0) {
      Alert.alert('Aviso', 'A playlist está vazia. Adicione músicas primeiro.');
      return;
    }

    setIsExporting(true);
    const config = { ip: ip.trim(), port: port.trim(), token: token.trim() };
    await holyricsService.saveConfig(config);

    const { success, message } = await holyricsService.exportPlaylist(config, songs);
    setIsExporting(false);

    if (success) {
      Alert.alert('Exportado com Sucesso! 🎉', 'As músicas foram enviadas para o Holyrics.', [
        { text: 'OK', onPress: onClose }
      ]);
    } else {
      Alert.alert('Falha na Exportação', message || 'Verifique o formato da API ou a conexão de rede.');
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
            Conecte-se ao PC da igreja pela mesma rede Wi-Fi e envie a playlist com um clique.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>IP do Computador (Rede Local)</Text>
            <View style={styles.inputContainer}>
              <WifiHigh size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Ex: 192.168.1.100"
                placeholderTextColor={theme.colors.textSecondary}
                value={ip}
                onChangeText={setIp}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 15 }}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Porta</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="8080"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={port}
                  onChangeText={setPort}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.formGroup, { flex: 2 }]}>
              <Text style={styles.label}>Token do Holyrics</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Seu token de API..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={token}
                  onChangeText={setToken}
                  secureTextEntry
                />
              </View>
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
                    {connectionStatus === 'success' ? 'Conectado!' : 'Testar Conexão'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.exportBtn, (!ip || !port || !token) && { opacity: 0.5 }]} 
              onPress={handleExport}
              disabled={isExporting || !ip || !port || !token}
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

const styles = StyleSheet.create({
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
  },
});
