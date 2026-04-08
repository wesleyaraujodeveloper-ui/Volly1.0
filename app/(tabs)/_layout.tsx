import { Tabs } from 'expo-router';
import { theme } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/useAppStore';
import { Image, View } from 'react-native';

export default function TabsLayout() {
  const { user } = useAppStore();
  const isAdminOrLeader = user?.role === 'ADMIN' || user?.role === 'LÍDER';

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
          <View style={{ marginRight: 15 }}>
            <Image 
              source={require('../../assets/images/icons/Volly.png')} 
              style={{ width: 60, height: 30 }}
              resizeMode="contain"
            />
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* Aba de Gestão visível apenas para Líderes e Admins */}
      <Tabs.Screen
        name="gestao"
        options={{
          title: 'Equipe',
          href: (isAdminOrLeader ? '/(tabs)/gestao' : null) as any,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

       <Tabs.Screen
        name="eventos"
        options={{
          title: 'Eventos',
          href: (isAdminOrLeader ? '/(tabs)/eventos' : null) as any,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="escalas"
        options={{
          title: 'Escalas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
