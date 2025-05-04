import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Platform, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
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

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user, loading } = useAuth();
  const [recentSightings, setRecentSightings] = useState<Sighting[]>([]);
  const [sightingsLoading, setSightingsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRecentSightings();
    }
  }, [user]);

  const loadRecentSightings = async () => {
    try {
      setSightingsLoading(true);
      const q = query(
        collection(db, 'sightings'),
        where('userId', '==', user?.uid),
        orderBy('timestamp', 'desc'),
        limit(3)
      );

      const querySnapshot = await getDocs(q);
      const sightings: Sighting[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sightings.push({
          id: doc.id,
          type: data.type,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(),
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
    if (!user) return;
    router.push({
      pathname: '/sightings',
      params: { userId: user.uid }
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!user) {
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
          <ThemedText style={styles.name}>{user.displayName || 'Anonymous User'}</ThemedText>
          <ThemedText style={styles.email}>{user.email}</ThemedText>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]}
            onPress={handleSightingsPress}
          >
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2B4C34' : '#E6F5ED' }]}>
              <Ionicons name="location" size={24} color={isDark ? '#80CFA9' : '#2F855A'} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>My Sightings</ThemedText>
              <ThemedText style={styles.actionSubtitle}>View your wildlife sightings</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]}
            onPress={() => router.push('/saved-events')}
          >
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2B4C34' : '#E6F5ED' }]}>
              <Ionicons name="calendar" size={24} color={isDark ? '#80CFA9' : '#2F855A'} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Saved Events</ThemedText>
              <ThemedText style={styles.actionSubtitle}>View your saved events</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]}
            onPress={() => router.push('/notifications')}
          >
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2B4C34' : '#E6F5ED' }]}>
              <Ionicons name="notifications" size={24} color={isDark ? '#80CFA9' : '#2F855A'} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Notifications</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Manage your notifications</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]}
            onPress={() => router.push('/settings')}
          >
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2B4C34' : '#E6F5ED' }]}>
              <Ionicons name="settings" size={24} color={isDark ? '#80CFA9' : '#2F855A'} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Settings</ThemedText>
              <ThemedText style={styles.actionSubtitle}>App preferences and settings</ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Sightings */}
        <View style={styles.sightingsSection}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Recent Sightings</ThemedText>
            <TouchableOpacity onPress={handleSightingsPress}>
              <ThemedText style={styles.seeAllText}>See All</ThemedText>
            </TouchableOpacity>
          </View>

          {sightingsLoading ? (
            <ThemedText>Loading recent sightings...</ThemedText>
          ) : recentSightings.length > 0 ? (
            <FlatList
              data={recentSightings}
              renderItem={({ item }) => (
                <SightingCard
                  {...item}
                  onShare={() => {}}
                />
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <ThemedText style={styles.emptyText}>
              No sightings yet. Start by adding your first nature sighting!
            </ThemedText>
          )}
        </View>
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
  actionsContainer: {
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  sightingsSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  seeAllText: {
    color: '#2F855A',
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 16,
  },
}); 