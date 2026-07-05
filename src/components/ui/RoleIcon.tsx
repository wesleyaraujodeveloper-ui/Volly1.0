import React from 'react';
import * as PhosphorIcons from 'phosphor-react-native';
import { View } from 'react-native';

interface RoleIconProps {
  name: string | null | undefined;
  size?: number;
  color?: string;
  weight?: 'regular' | 'bold' | 'fill' | 'light' | 'duotone' | 'thin';
}

export const RoleIcon: React.FC<RoleIconProps> = ({ 
  name, 
  size = 16, 
  color = '#000', 
  weight = 'bold' 
}) => {
  if (!name) return null;

  // Usa o ícone passado pelo nome ou um fallback (Star) se não encontrar
  const IconComponent = (PhosphorIcons as any)[name] || PhosphorIcons.Star;

  return (
    <View style={{ marginRight: 4, justifyContent: 'center', alignItems: 'center' }}>
      <IconComponent size={size} color={color} weight={weight} />
    </View>
  );
};
