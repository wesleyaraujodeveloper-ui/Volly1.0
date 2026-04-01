import { View, Text, StyleSheet } from 'react-native';
import { globalStyles, theme } from '../../src/theme';

export default function EscalasScreen() {
  return (
    <View style={globalStyles.center}>
      <Text style={globalStyles.textTitle}>Minhas Escalas</Text>
      <Text style={globalStyles.textBody}>Acompanhe seus próximos serviços.</Text>
    </View>
  );
}
