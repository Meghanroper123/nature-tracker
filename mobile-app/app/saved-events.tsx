import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  type: string;
  imageUrl: string | null;
  isBookmarked?: boolean;
  comments: any[];
}

export default function SavedEventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSavedEvents();
    }
  }, [user]);

  const loadSavedEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const userRef = doc(db, 'users', user!.uid);
      const userSnap = await getDoc(userRef);
      const savedEvents: string[] = userSnap.exists() && userSnap.data().savedEvents ? userSnap.data().savedEvents : [];
      if (savedEvents.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }
      // Fetch events by IDs
      const incidentsRef = collection(db, 'incidents');
      const q = query(incidentsRef, where('__name__', 'in', savedEvents.slice(0, 10)));
      // Firestore 'in' queries are limited to 10 items at a time
      const querySnapshot = await getDocs(q);
      const fetchedEvents: Event[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedEvents.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          date: data.timestamp,
          location: data.location?.address || 'Unknown location',
          type: data.type.toUpperCase(),
          imageUrl: data.imageUrl,
          isBookmarked: true,
          comments: data.comments || [],
        });
      });
      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Error loading saved events:', err);
      setError('Failed to load saved events');
    } finally {
      setLoading(false);
    }
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/${item.id}`)}
    >
      {item.imageUrl && (
        <View style={styles.imageContainer}>
          <ThemedText>{item.title}</ThemedText>
        </View>
      )}
      <View style={styles.cardContent}>
        <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
        <ThemedText style={styles.cardDescription}>{item.description}</ThemedText>
        <ThemedText style={styles.date}>{item.date}</ThemedText>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Loading saved events...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={styles.error}>{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              You have not saved any events yet.
            </ThemedText>
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
  list: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
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
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 16,
  },
  date: {
    fontSize: 12,
    opacity: 0.6,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
}); 