import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    console.log('DEBUG: AuthCallback montado. Processando redirect...');
    
    const handleRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('DEBUG: AuthCallback session check:', !!session);
      
      if (session) {
        console.log('DEBUG: Sessão confirmada, indo para o Feed.');
        router.replace('/(tabs)/feed');
      } else {
        console.log('DEBUG: Sem sessão no callback ainda...');
        // Tentaremos novamente em breve ou o _layout fará o trabalho
      }
    };

    // Pequeno delay para o Supabase processar a URL
    const timer = setTimeout(handleRedirect, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FF8C00" />
      <Text style={{ color: '#FFFFFF', marginTop: 20, fontSize: 16 }}>
        Finalizando login...
      </Text>
    </View>
  );
}
