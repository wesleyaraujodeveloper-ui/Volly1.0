import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { theme } from '../theme';

interface EmptyStateProps {
  title: string;
  description?: string;
  image?: ImageSourcePropType;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, image }) => {
  return (
    <View style={styles.container}>
      {image && (
        <Image 
          source={image} 
          style={styles.image} 
          resizeMode="contain"
        />
      )}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 40,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
    opacity: 0.8,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
