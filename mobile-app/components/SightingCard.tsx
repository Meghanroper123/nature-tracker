import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getFirebasePublicUrl } from '@/services/firebase';

interface SightingCardProps {
  id: string;
  type: string;
  title: string;
  description?: string;
  imageUrl: string | null;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  onShare?: () => void;
}

export function SightingCard({
  id,
  type,
  title,
  description,
  imageUrl,
  timestamp,
  location,
  onShare,
}: SightingCardProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handlePress = () => {
    router.push(`/sighting/${id}`);
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <ThemedView style={styles.card}>
        {imageUrl && (
          <Image
            source={{ uri: getFirebasePublicUrl(imageUrl) }}
            style={styles.image}
            contentFit="cover"
          />
        )}
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity onPress={onShare}>
              <Ionicons
                name="share-outline"
                size={24}
                color={isDark ? '#FFFFFF' : '#000000'}
              />
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.type}>{type}</ThemedText>
          {description && (
            <ThemedText style={styles.description} numberOfLines={2}>
              {description}
            </ThemedText>
          )}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Ionicons
                name="time-outline"
                size={16}
                color={isDark ? '#CCCCCC' : '#666666'}
                style={styles.icon}
              />
              <ThemedText style={styles.timestamp}>{timestamp}</ThemedText>
            </View>
            <View style={styles.footerRight}>
              <Ionicons
                name="location-outline"
                size={16}
                color={isDark ? '#CCCCCC' : '#666666'}
                style={styles.icon}
              />
              <ThemedText style={styles.location}>
                {location.lat.toFixed(2)}, {location.lng.toFixed(2)}
              </ThemedText>
            </View>
          </View>
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  type: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  timestamp: {
    fontSize: 14,
    opacity: 0.7,
  },
  location: {
    fontSize: 14,
    opacity: 0.7,
  },
}); 