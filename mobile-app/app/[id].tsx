import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, ScrollView, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Comment {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: {
    lat: number;
    lng: number;
    description: string;
  };
  type: string;
  imageUrl: string;
  comments: Comment[];
}

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [event, setEvent] = useState<Event | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEventDetails();
  }, [id]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Replace with actual API call
      const mockEvent: Event = {
        id: '1',
        title: 'Bioluminescence',
        description: 'Bioluminescent waves in Santa Monica',
        date: new Date().toISOString(),
        location: {
          lat: 34.0195,
          lng: -118.4912,
          description: 'Santa Monica Beach'
        },
        type: 'OCEAN',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
        comments: [
          {
            id: '1',
            userId: 'user1',
            username: 'JohnDoe',
            text: 'Amazing sight! I saw this too last night.',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      };
      setEvent(mockEvent);
    } catch (err) {
      console.error('Error loading event details:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      // TODO: Replace with actual API call
      const comment: Comment = {
        id: Date.now().toString(),
        userId: 'currentUser',
        username: 'CurrentUser',
        text: newComment,
        timestamp: new Date().toISOString()
      };
      
      setEvent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: [...prev.comments, comment]
        };
      });
      
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      // Show error toast or message
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
      <ThemedView style={styles.container}>
        <ScrollView style={styles.scrollView}>
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
          </View>

          {/* Main image */}
          <Image
            source={{ uri: event.imageUrl }}
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

            <ThemedText style={styles.date}>{formatDate(event.date)}</ThemedText>
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
              >
                <Marker
                  coordinate={{
                    latitude: event.location.lat,
                    longitude: event.location.lng,
                  }}
                  title={event.title}
                  description={event.location.description}
                />
              </MapView>
            </View>

            {/* Comments section */}
            <View style={styles.commentsSection}>
              <ThemedText style={styles.commentsHeader}>
                Comments ({event.comments.length})
              </ThemedText>
              
              {event.comments.map(comment => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <ThemedText style={styles.commentUsername}>{comment.username}</ThemedText>
                    <ThemedText style={styles.commentTime}>
                      {formatRelativeTime(comment.timestamp)}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.commentText}>{comment.text}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Comment input */}
        <View style={styles.commentInputContainer}>
          <TextInput
            style={[
              styles.commentInput,
              { backgroundColor: isDark ? '#333333' : '#F0F0F0' }
            ]}
            placeholder="Add a comment..."
            placeholderTextColor={isDark ? '#888888' : '#666666'}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { opacity: newComment.trim() ? 1 : 0.5 }
            ]}
            onPress={handleAddComment}
            disabled={!newComment.trim()}
          >
            <Ionicons name="send" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </ThemedView>
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
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
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
  commentsSection: {
    marginTop: 20,
  },
  commentsHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  commentItem: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Platform.select({
      ios: 'rgba(0, 0, 0, 0.05)',
      android: 'rgba(0, 0, 0, 0.05)',
      default: '#F0F0F0',
    }),
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Platform.select({
      ios: 'rgba(0, 0, 0, 0.1)',
      android: 'rgba(0, 0, 0, 0.1)',
      default: '#E5E5E5',
    }),
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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