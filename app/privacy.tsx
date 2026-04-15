import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { globalStyles, theme } from '../src/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Política de Privacidade</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updatedText}>Última atualização: 15 de Abril de 2026</Text>

        <Text style={styles.paragraph}>
          O <Text style={styles.bold}>Volly</Text> respeita a sua privacidade e está comprometido em proteger os seus dados pessoais. 
          Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e compartilhamos as suas informações quando você utiliza o nosso aplicativo. 
          Ao utilizar o Volly, você concorda com as práticas descritas neste documento.
        </Text>

        <Text style={styles.sectionTitle}>1. Informações que Coletamos</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Dados fornecidos por você:</Text> Coletamos informações de registro básico, como seu nome, endereço de e-mail e foto do perfil, 
          fornecidos primariamente através da sua autenticação com a conta Google.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Dados operacionais:</Text> Registramos sua disponibilidade na agenda, departamentos aos quais 
          pertence, interações no mural (Volly Connect) e mensagens enviadas no chat institucional.
        </Text>

        <Text style={styles.sectionTitle}>2. Como Usamos Seus Dados</Text>
        <Text style={styles.paragraph}>
          Os dados coletados são utilizados exclusivamente para:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Facilitar o seu login e manter a segurança da sua conta.</Text>
          <Text style={styles.bulletItem}>• Montagem e balanceamento inteligente das escalas de voluntariado.</Text>
          <Text style={styles.bulletItem}>• Permitir a interação entre os membros da sua equipe através de posts, comentários e bate-papo.</Text>
          <Text style={styles.bulletItem}>• Envio de notificações importantes referentes a novos eventos e escalas.</Text>
        </View>

        <Text style={styles.sectionTitle}>3. Compartilhamento de Informações</Text>
        <Text style={styles.paragraph}>
          O Volly não vende, aluga ou monetiza suas informações pessoais sob nenhuma circunstância. Seus dados são visíveis apenas para:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>•  <Text style={styles.bold}>Sua Organização:</Text> Líderes e administradores terão acesso às suas escalas, disponibilidade e perfil.</Text>
          <Text style={styles.bulletItem}>•  <Text style={styles.bold}>Serviços Terceirizados (Infraestrutura):</Text> Operamos utilizando prestadores de serviço com certificações de segurança internacionais (como Supabase, Google Cloud e Vercel) apenas para hospedar e processar os dados.</Text>
        </View>

        <Text style={styles.sectionTitle}>4. Armazenamento e Segurança</Text>
        <Text style={styles.paragraph}>
          Empregamos medidas de segurança técnicas e organizacionais rígidas (criptografia de dados em repouso e em trânsito e padrões rigorosos de controle de acesso (RLS)) para proteger as suas informações contra acessos não autorizados. No entanto, lembre-se de que nenhum método de transmissão eletrônica é 100% infalível.
        </Text>

        <Text style={styles.sectionTitle}>5. Retenção e Exclusão de Dados</Text>
        <Text style={styles.paragraph}>
          Nós retemos suas informações enquanto sua conta estiver ativa na organização. Você tem o direito de solicitar a exclusão definitiva dos seus dados a qualquer momento entrando em contato com os administradores da sua equipe ou utilizando a função de exclusão de conta dentro das configurações do aplicativo. Ao solicitar a deleção, seus dados pessoais serão anonimizados ou apagados de nossos bancos de dados de forma irreversível.
        </Text>

        <Text style={styles.sectionTitle}>6. Seus Direitos de Privacidade</Text>
        <Text style={styles.paragraph}>
          De acordo com as leis mundiais de proteção de dados (como LGPD e GDPR), você tem o direito a: acessar, corrigir, portar ou apagar os seus dados. Para exercer qualquer um destes direitos, basta entrar em contato com os administradores ou com nosso suporte técnico.
        </Text>

        <Text style={styles.sectionTitle}>7. Consentimentos de Dispositivo</Text>
        <Text style={styles.paragraph}>
          O aplicativo pode solicitar acesso a câmera, microfone, galeria de fotos e sistema de notificações push, sendo sempre requerido o seu consentimento explícito prévio do sistema operacional do seu celular.
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
