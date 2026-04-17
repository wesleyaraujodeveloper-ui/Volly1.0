import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { globalStyles, theme } from '../src/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termos de Uso</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updatedText}>Última atualização: 15 de Abril de 2026</Text>

        <Text style={styles.paragraph}>
          Bem-vindo ao <Text style={styles.bold}>Volly</Text>. Ao acessar ou usar nosso aplicativo, você concorda em ficar vinculado a estes Termos de Uso. 
          Se você não concordar com alguma parte destes termos, você não poderá acessar o serviço.
        </Text>

        <Text style={styles.sectionTitle}>1. Aceitação e Escopo</Text>
        <Text style={styles.paragraph}>
          Estes Termos de Uso constituem um acordo legalmente vinculativo entre o voluntário (você) e a plataforma Volly. Destinam-se a regular o uso das ferramentas de agendamento, comunicação e gestão de voluntariado oferecidas pelo aplicativo.
        </Text>

        <Text style={styles.sectionTitle}>2. Uso do Aplicativo</Text>
        <Text style={styles.paragraph}>
          O Volly é um ambiente de colaboração para equipes. Ao utilizá-lo, você concorda em:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Fornecer informações precisas durante o seu registro de conta.</Text>
          <Text style={styles.bulletItem}>• Não utilizar a plataforma para fins ilegais, difamatórios ou maliciosos.</Text>
          <Text style={styles.bulletItem}>• Manter as interações na aba &quot;Volly Connect&quot; (Mural Social) e nas abas de chat respeitosas com todos os demais voluntários.</Text>
          <Text style={styles.bulletItem}>• Honrar, na medida do possível, com a disponibilidade e compromissos marcados através das nossas escalas integradas.</Text>
        </View>

        <Text style={styles.sectionTitle}>3. Suas Credenciais e Conta</Text>
        <Text style={styles.paragraph}>
          O seu acesso baseia-se no serviço de autenticação do Google (Auth). Você é o único responsável por manter a confidencialidade das credenciais de sua conta Google e de todos os acessos gerados a partir dela no aplicativo. A administração de contas no Volly é gerenciada pelos líderes de seu departamento.
        </Text>

        <Text style={styles.sectionTitle}>4. Conteúdo Gerado pelo Usuário</Text>
        <Text style={styles.paragraph}>
          Qualquer texto, foto ou vídeo compartilhado no Volly Connect ou no ambiente de Chat é considerado &quot;Conteúdo Gerado pelo Usuário&quot;. Nós da equipe do Volly App não nos responsabilizamos pelo teor desse conteúdo..., garantindo o direito aos administradores e líderes da sua própria equipe apagarem ou moderarem o conteúdo inapto à plataforma.
        </Text>

        <Text style={styles.sectionTitle}>5. Propriedade Intelectual</Text>
        <Text style={styles.paragraph}>
          Todos os direitos de design, logotipos, arquitetura do software, banco de dados e layout gráfico são propriedade exclusiva do Volly e não podem ser replicados ou usados de forma comercial sem autorização direta e explícita dos criadores do sistema.
        </Text>

        <Text style={styles.sectionTitle}>6. Disponibilidade de Serviço e Bugs</Text>
        <Text style={styles.paragraph}>
          Trabalhamos duro para manter o serviço operando de forma perfeita (&quot;as is&quot;). No entanto, por se tratar de um software dependente da infraestrutura web (Supabase Cloud e servidores de autenticação), podem existir janelas de interrupção ou bugs inesperados. Não nos responsabilizamos por perdas de agendamento ou outros ônus devidos às falhas técnicas.
        </Text>

        <Text style={styles.sectionTitle}>7. Modificações nestes Termos</Text>
        <Text style={styles.paragraph}>
          Reservamo-nos o privilégio de atualizar estes Termos a qualquer momento. Modificações substanciais serão comunicadas a todos por intermédio das notas de atualização ou avisos na tela inicial. Continuar usando o aplicativo após a modificação significa sua total concordância com as novidades.
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    paddingVertical: 20,
    paddingBottom: 40,
  },
  updatedText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  bold: {
    fontWeight: 'bold',
  },
  bulletList: {
    marginBottom: 10,
    paddingLeft: 10,
  },
  bulletItem: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  }
});
