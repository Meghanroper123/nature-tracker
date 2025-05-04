import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { SightingCard } from '@/components/SightingCard';

interface Sighting {
  id: string;
  type: string;
  title: string;
  description: string;
  imageUrl: string | null;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export default function SightingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSightings();
    }
  }, [user]);

  const loadSightings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Query Firestore for user's sightings
      const q = query(
        collection(db, 'sightings'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const userSightings: Sighting[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        userSightings.push({
          id: doc.id,
          type: data.type,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(),
          location: data.location,
        });
      });

      setSightings(userSightings);
    } catch (err) {
      console.error('Error loading sightings:', err);
      setError('Failed to load sightings');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (sightingId: string) => {
    // TODO: Implement share functionality
    console.log('Share sighting:', sightingId);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Loading sightings...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={styles.error}>{error}</ThemedText>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadSightings}
        >
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? '#FFFFFF' : '#000000'}
          />
        </TouchableOpacity>
        <ThemedText style={styles.title}>My Sightings</ThemedText>
      </View>

      <FlatList
        data={sightings}
        renderItem={({ item }) => (
          <SightingCard
            {...item}
            onShare={() => handleShare(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              No sightings yet. Start by adding your first nature sighting!
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: isDark ? '#2F855A' : '#48BB78' }
              ]}
              onPress={() => router.push('/add')}
            >
              <ThemedText style={styles.addButtonText}>
                Add Sighting
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  error: {
    color: '#E53E3E',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#4A5568',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 