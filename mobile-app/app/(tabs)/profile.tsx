import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Platform, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { SightingCard } from '@/components/SightingCard';

const DEV_USER_ID = 'dev-user-123';

interface Sighting {
  id: string;
  type: string;
  title: string;
  description: string;
  imageUrl: string | null;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, loading } = useAuth();
  const [recentSightings, setRecentSightings] = useState<Sighting[]>([]);
  const [sightingsLoading, setSightingsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      console.log('Current user UID:', user.uid);
      loadRecentSightings();
    }
  }, [user]);

  const loadRecentSightings = async () => {
    try {
      setSightingsLoading(true);
      const effectiveUserId = user?.uid || DEV_USER_ID;
      console.log('Querying sightings for userId:', effectiveUserId);
      const q = query(
        collection(db, 'incidents'),
        where('userId', '==', effectiveUserId),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      console.log('Number of sightings found:', querySnapshot.size);
      const sightings: Sighting[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sightings.push({
          id: doc.id,
          type: data.type,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp || new Date().toISOString(),
          location: data.location,
        });
      });

      setRecentSightings(sightings);
    } catch (err) {
      console.error('Error loading recent sightings:', err);
    } finally {
      setSightingsLoading(false);
    }
  };

  const handleSightingsPress = () => {
    const effectiveUserId = user?.uid || DEV_USER_ID;
    router.push({
      pathname: '/sightings',
      params: { userId: effectiveUserId }
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!user && !__DEV__) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Please sign in to view your profile</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.profileIcon, { backgroundColor: isDark ? '#2B4C34' : '#E6F5ED' }]}>
            <Ionicons name="person" size={64} color={isDark ? '#80CFA9' : '#2F855A'} />
          </View>
          <ThemedText style={styles.name}>
            {user?.displayName || (__DEV__ ? 'Development User' : 'Anonymous User')}
          </ThemedText>
          <ThemedText style={styles.email}>
            {user?.email || (__DEV__ ? 'dev@example.com' : '')}
          </ThemedText>
        </View>

        {/* My Sightings Section */}
        <TouchableOpacity style={[styles.card, { backgroundColor: isDark ? '#222' : '#fff' }]} onPress={handleSightingsPress} activeOpacity={0.8}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={28} color={isDark ? '#80CFA9' : '#2F855A'} style={{ marginRight: 12 }} />
            <View>
              <ThemedText style={styles.cardTitle}>My Sightings</ThemedText>
              <ThemedText style={styles.cardSubtitle}>View your wildlife sightings</ThemedText>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  profileIcon: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    opacity: 0.7,
  },
  card: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  loadingText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
  },
  sightingsList: {
    paddingVertical: 8,
  },
  sightingCard: {
    marginBottom: 12,
  },
}); 