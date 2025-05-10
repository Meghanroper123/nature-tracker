import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, ScrollView, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getFirebasePublicUrl } from '@/services/firebase';

interface Comment {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: string;
}

interface Event {
  id: string;
  type: string;
  title: string;
  description: string;
  location: { lat: number; lng: number };
  timestamp: string;
  imageUrl?: string | null;
}

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEventDetails();
    fetchComments();
  }, [id]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch from backend API
      const response = await fetch(`http://192.168.50.2:3000/api/incidents`);
      const data = await response.json();
      console.log('Fetched incidents from API:', data);
      const found = data.find((incident: Event) => incident.id === id);
      if (!found) {
        throw new Error('Event not found');
      }
      setEvent(found);
    } catch (err) {
      console.error('Error loading event details:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`http://192.168.50.2:3000/api/incidents/${id}/comments`);
      const data = await response.json();
      setComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      // Get user info (customize as needed)
      const userData = await AsyncStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : { id: 'anon', name: 'Anonymous' };
      const body = {
        userId: user.id,
        username: user.name || 'Anonymous',
        text: newComment,
      };
      const response = await fetch(`http://192.168.50.2:3000/api/incidents/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setNewComment('');
        fetchComments();
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText>Loading event details...</ThemedText>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.error}>{error || 'Event not found'}</ThemedText>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadEventDetails}
        >
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ThemedView style={styles.container}>
          <ScrollView style={styles.scrollView}>
            {/* Header with back button */}
            <View style={styles.header}>
              <TouchableOpacity 
                onPress={() => router.back()} 
                style={[
                  styles.backButton,
                  { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
                ]}
              >
                <Ionicons 
                  name="arrow-back" 
                  size={24} 
                  color={isDark ? '#FFFFFF' : '#000000'} 
                />
              </TouchableOpacity>
            </View>

            {/* Main image */}
            <Image
              source={{ uri: getFirebasePublicUrl(event.imageUrl) }}
              style={styles.mainImage}
              resizeMode="cover"
            />

            {/* Event details */}
            <View style={styles.detailsContainer}>
              <View style={styles.titleRow}>
                <ThemedText style={styles.title}>{event.title}</ThemedText>
                <View style={[styles.tag, { backgroundColor: getTagColor(event.type).bg }]}>
                  <ThemedText style={[styles.tagText, { color: getTagColor(event.type).text }]}>
                    {event.type}
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={styles.date}>{formatDate(event.timestamp)}</ThemedText>
              <ThemedText style={styles.description}>{event.description}</ThemedText>

              {/* Map view */}
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: event.location.lat,
                    longitude: event.location.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  toolbarEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: event.location.lat,
                      longitude: event.location.lng,
                    }}
                    title={event.title}
                    description={event.description}
                  />
                </MapView>
              </View>
            </View>

            {/* Comments section */}
            <View style={{ marginTop: 20 }}>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>
                Comments ({comments.length})
              </ThemedText>
              {comments.map(comment => (
                <View key={comment.id} style={{ marginBottom: 12, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
                  <ThemedText style={{ fontWeight: '600' }}>{comment.username}</ThemedText>
                  <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>{formatRelativeTime(comment.timestamp)}</ThemedText>
                  <ThemedText>{comment.text}</ThemedText>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}
                  placeholder="Add a comment..."
                  value={newComment}
                  onChangeText={setNewComment}
                  editable={!submitting}
                />
                <TouchableOpacity onPress={handleAddComment} disabled={!newComment.trim() || submitting}>
                  <Ionicons name="send" size={24} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </>
  );
}

const getTagColor = (type: string) => {
  switch (type.toUpperCase()) {
    case 'OCEAN':
      return { bg: '#3B82F6', text: '#FFFFFF' }; // blue
    case 'WILDLIFE':
      return { bg: '#F59E0B', text: '#FFFFFF' }; // yellow
    case 'BOTANICAL':
      return { bg: '#EF4444', text: '#FFFFFF' }; // red
    case 'ASTRONOMY':
      return { bg: '#6366F1', text: '#FFFFFF' }; // purple
    default:
      return { bg: '#6B7280', text: '#FFFFFF' };
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const commentTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return commentTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  mainImage: {
    width: '100%',
    height: 300,
  },
  detailsContainer: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  map: {
    flex: 1,
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
}); 