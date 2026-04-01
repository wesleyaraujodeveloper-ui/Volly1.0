import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';

export default function FeedScreen() {
  const user = useAppStore(state => state.user);

  return (
    <ScrollView style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá, {user?.name || 'Voluntário'}</Text>
        <Text style={styles.subtitle}>Confira os próximos eventos e recados.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Geral - Louvor</Text>
          <Ionicons name="megaphone-outline" size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.cardBody}>
          Temos um novo ensaio programado para sexta-feira. Confirmem presença!
        </Text>
      </View>

      <TouchableOpacity style={styles.eventCard}>
        <View style={styles.eventDate}>
          <Text style={styles.eventDateDay}>12</Text>
          <Text style={styles.eventDateMonth}>OUT</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>Culto de Domingo</Text>
          <Text style={styles.eventTime}>19:00 - Escala: Bateria, Baixo</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  greeting: {
    ...globalStyles.textTitle,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...globalStyles.textBody,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: theme.colors.text,
  },
  cardBody: {
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  eventCard: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  eventDate: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    width: 60,
  },
  eventDateDay: {
    fontWeight: 'bold',
    fontSize: 20,
    color: theme.colors.primary,
  },
  eventDateMonth: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  eventInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  eventTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  eventTime: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});
