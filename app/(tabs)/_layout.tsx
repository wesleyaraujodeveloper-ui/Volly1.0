import { Tabs } from 'expo-router';
import { theme } from '../../src/theme';
import { House, Users, Calendar, ClipboardText, User, Buildings } from 'phosphor-react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { Image, View, Text } from 'react-native';

export default function TabsLayout() {
  const { user } = useAppStore();
  const isAdminOrLeader = user?.role === 'ADMIN' || user?.role === 'MASTER' || user?.role === 'LÍDER' || user?.role === 'CO-LÍDER';

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background,
          elevation: 0, // Tirar sombra android
          shadowOpacity: 0, // Tirar sombra iOS
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => (
          <View style={{ marginRight: 15, flexDirection: 'row', alignItems: 'center' }}>
            <Image 
              source={require('../../Icones/Volly_1.png')} 
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
            <Text 
              style={{ fontFamily: 'CreamCake', color: theme.colors.primary, fontSize: 30, marginLeft: 6 }}
              // @ts-ignore - Propriedades para evitar tradução automática no navegador
              translate="no"
              className="notranslate"
            >
              Volly
            </Text>
          </View>
        ),
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size, focused }) => (
            <House size={size} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      
      {/* Aba de Gestão visível apenas para Líderes e Admins */}
      <Tabs.Screen
        name="gestao"
        options={{
          title: 'Equipe',
          href: (isAdminOrLeader ? '/(tabs)/gestao' : null) as any,
          tabBarIcon: ({ color, size, focused }) => (
            <Users size={size} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />

       <Tabs.Screen
        name="eventos"
        options={{
          title: 'Eventos',
          href: (isAdminOrLeader ? '/(tabs)/eventos' : null) as any,
          tabBarIcon: ({ color, size, focused }) => (
            <Calendar size={size} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />

      <Tabs.Screen
        name="escalas"
        options={{
          title: 'Escalas',
          href: (user?.role === 'MASTER' ? null : '/(tabs)/escalas') as any,
          tabBarIcon: ({ color, size, focused }) => (
            <ClipboardText size={size} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <User size={size} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />

      {/* Aba de Gerenciamento Global (SaaS) visível apenas para MASTER */}
      <Tabs.Screen
        name="instituicoes"
        options={{
          title: 'Instituições',
          href: (user?.role === 'MASTER' ? '/(tabs)/instituicoes' : null) as any,
          tabBarIcon: ({ color, size, focused }) => (
            <Buildings size={size} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
    </Tabs>
  );
}
