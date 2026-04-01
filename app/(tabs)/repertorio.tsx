import { View, Text, StyleSheet } from 'react-native';
import { globalStyles, theme } from '../../src/theme';

export default function RepertorioScreen() {
  return (
    <View style={globalStyles.center}>
      <Text style={globalStyles.textTitle}>Repertório</Text>
      <Text style={globalStyles.textBody}>Músicas e materiais de ensaio.</Text>
    </View>
  );
}
