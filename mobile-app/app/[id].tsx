import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Image, ScrollView, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView, Dimensions, FlatList, Modal, StatusBar, PanResponder, Animated } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Video, ResizeMode } from 'expo-av';

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
  mediaFiles?: { type: string; url: string; thumbnailUrl?: string }[];
}

const { width } = Dimensions.get('window');

// Robust date normalization for Firestore Timestamp, Admin SDK, and string
function normalizeDateField(field: any): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object') {
    // Firestore Admin SDK: _seconds/_nanoseconds or seconds/nanoseconds
    const seconds = field._seconds ?? field.seconds;
    const nanos = field._nanoseconds ?? field.nanoseconds ?? 0;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000 + Math.floor(nanos / 1e6)).toISOString();
    }
    // Firestore JS SDK Timestamp
    if (typeof field.toDate === 'function') return field.toDate().toISOString();
  }
  return '';
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
  const [areaName, setAreaName] = React.useState('');
  const [userLocation, setUserLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = React.useState<string>('');
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const mediaListRef = useRef<FlatList>(null);
  const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const videoRef = useRef<Video>(null);
  const [modalPan] = useState(new Animated.Value(0));
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          modalPan.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          if (videoRef.current) videoRef.current.stopAsync();
          setIsMediaModalVisible(false);
          Animated.timing(modalPan, { toValue: 0, duration: 0, useNativeDriver: true }).start();
        } else {
          Animated.spring(modalPan, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(modalPan, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  useFocusEffect(
    React.useCallback(() => {
      loadEventDetails();
      fetchComments();
    }, [id])
  );

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

  const renderMediaItem = ({ item, index }: { item: any; index: number }) => {
    if (item.type === 'image') {
      return (
        <TouchableOpacity onPress={() => {
          setSelectedMediaIndex(index);
          setIsMediaModalVisible(true);
        }}>
          <Image
            source={{ uri: getFirebasePublicUrl(item.url) }}
            style={styles.mediaItem}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity 
          onPress={() => {
            setSelectedMediaIndex(index);
            setIsMediaModalVisible(true);
          }}
          style={styles.videoContainer}
        >
          <Image
            source={{ uri: item.thumbnailUrl || 'https://via.placeholder.com/150?text=Video' }}
            style={styles.mediaItem}
            resizeMode="cover"
          />
          <View style={styles.videoOverlay}>
            <Ionicons name="play-circle" size={48} color="white" />
          </View>
        </TouchableOpacity>
      );
    }
  };

  const renderMediaPagination = () => {
    if (!event?.mediaFiles || event.mediaFiles.length <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        {event.mediaFiles.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentMediaIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderMediaModal = () => {
    if (!event?.mediaFiles) return null;

    return (
      <Modal
        visible={isMediaModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (videoRef.current) {
            videoRef.current.stopAsync();
          }
          setIsMediaModalVisible(false);
        }}
      >
        <Animated.View
          style={[styles.modalContainer, { transform: [{ translateY: modalPan }] }]}
        >
          {/* Swipe-down overlay at the top */}
          <Animated.View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, zIndex: 10 }}
            {...panResponder.panHandlers}
          />
          <StatusBar hidden />
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => {
              if (videoRef.current) {
                videoRef.current.stopAsync();
              }
              setIsMediaModalVisible(false);
              Animated.timing(modalPan, { toValue: 0, duration: 0, useNativeDriver: true }).start();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.modalCloseButtonCircle}>
              <Ionicons name="close" size={28} color="#222" />
            </View>
          </TouchableOpacity>
          <FlatList
            data={event.mediaFiles}
            horizontal
            pagingEnabled
            initialScrollIndex={selectedMediaIndex}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
              setSelectedMediaIndex(newIndex);
              if (videoRef.current) {
                videoRef.current.stopAsync();
              }
            }}
            renderItem={({ item, index }) => (
              <View style={{ width, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                {item.type === 'image' ? (
                  <Image
                    source={{ uri: getFirebasePublicUrl(item.url) || '' }}
                    style={styles.modalMedia}
                    resizeMode={'contain' as const}
                  />
                ) : (
                  <Video
                    ref={index === selectedMediaIndex ? videoRef : undefined}
                    source={{ uri: getFirebasePublicUrl(item.url) || '' }}
                    style={styles.modalMedia}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping
                    shouldPlay={index === selectedMediaIndex}
                    onPlaybackStatusUpdate={(status) => {
                      if (status.isLoaded && status.didJustFinish) {
                        videoRef.current?.replayAsync();
                      }
                    }}
                  />
                )}
              </View>
            )}
            keyExtractor={(_, idx) => idx.toString()}
            extraData={selectedMediaIndex}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            initialNumToRender={1}
            windowSize={2}
          />
          {event.mediaFiles.length > 1 && (
            <View style={styles.modalPagination}>
              {event.mediaFiles.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalPaginationDot,
                    index === selectedMediaIndex && styles.modalPaginationDotActive,
                  ]}
                  onPress={() => {
                    if (videoRef.current) {
                      videoRef.current.stopAsync();
                    }
                    setSelectedMediaIndex(index);
                  }}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </Modal>
    );
  };

  React.useEffect(() => {
    if (!event?.location) return;
    // Get area name
    async function fetchArea() {
      try {
        if (!event?.location) return;
        const results = await Location.reverseGeocodeAsync({ 
          latitude: event.location.lat, 
          longitude: event.location.lng 
        });
        if (results && results.length > 0) {
          const { city, district, subregion, region, name } = results[0];
          setAreaName(city || district || subregion || region || name || 'Unknown area');
        } else {
          setAreaName('Unknown area');
        }
      } catch {
        setAreaName('Unknown area');
      }
    }
    fetchArea();
    // Get user location and distance
    async function fetchDistance() {
      try {
        if (!event?.location) return;
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          const R = 3958.8;
          const dLat = (event.location.lat - loc.coords.latitude) * Math.PI / 180;
          const dLon = (event.location.lng - loc.coords.longitude) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                   Math.cos(loc.coords.latitude * Math.PI / 180) * 
                   Math.cos(event.location.lat * Math.PI / 180) * 
                   Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const dist = R * c;
          setDistance(`${dist.toFixed(1)} mi`);
        } else {
          setDistance('');
        }
      } catch {
        setDistance('');
      }
    }
    fetchDistance();
  }, [event?.location]);

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
          <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 80 }}>
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

            {/* Media carousel */}
            <View style={styles.mediaContainer}>
              {event.mediaFiles && event.mediaFiles.length > 0 ? (
                <FlatList
                  ref={mediaListRef}
                  data={event.mediaFiles}
                  renderItem={renderMediaItem}
                  keyExtractor={(_, index) => index.toString()}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                    setCurrentMediaIndex(newIndex);
                  }}
                />
              ) : event.imageUrl ? (
                <Image
                  source={{ uri: getFirebasePublicUrl(event.imageUrl) }}
                  style={styles.mediaItem}
                  resizeMode="cover"
                />
              ) : null}
              {event.mediaFiles && event.mediaFiles.length > 1 && renderMediaPagination()}
            </View>

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
              {event?.location && (
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
              )}
            </View>

            {/* Show area name and distance under the map */}
            {event?.location && (
              <View style={{ marginTop: 12, marginBottom: 8, alignItems: 'center' }}>
                <ThemedText style={{ fontSize: 16, fontWeight: '500', color: isDark ? '#fff' : '#222' }}>
                  {areaName}
                  {distance ? ` • ${distance}` : ''}
                </ThemedText>
              </View>
            )}

            {/* Comments section */}
            <View style={{ marginTop: 20 }}>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>
                Comments ({comments.length})
              </ThemedText>
              {comments.map(comment => (
                <View
                  key={comment.id}
                  style={{
                    marginBottom: 16,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    backgroundColor: isDark ? '#23272b' : '#f0f0f0',
                    borderRadius: 12,
                    borderWidth: isDark ? 0 : 1,
                    borderColor: isDark ? 'transparent' : '#e0e0e0',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <ThemedText style={{ fontWeight: '700', color: isDark ? '#fff' : '#222', fontSize: 15 }}>
                      {comment.username}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: isDark ? '#bbb' : '#888', marginLeft: 8 }}>
                      {formatRelativeTime(comment.timestamp)}
                    </ThemedText>
                  </View>
                  <ThemedText style={{ color: isDark ? '#f5f5f5' : '#222', fontSize: 16, marginTop: 4, lineHeight: 22 }}>
                    {comment.text}
                  </ThemedText>
                </View>
              ))}
            </View>
          </ScrollView>
          {/* Fixed comment input bar at the bottom */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 16,
            backgroundColor: isDark ? '#181a1b' : '#fff',
            borderTopWidth: 1,
            borderColor: isDark ? '#23272b' : '#e0e0e0',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
          }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: isDark ? '#23272b' : '#f0f0f0',
                color: isDark ? '#fff' : '#222',
                borderRadius: 24,
                paddingHorizontal: 20,
                paddingVertical: 14,
                marginRight: 12,
                fontSize: 18,
              }}
              placeholder="Add a comment..."
              placeholderTextColor={isDark ? '#888' : '#888'}
              value={newComment}
              onChangeText={setNewComment}
              editable={!submitting}
            />
            <TouchableOpacity onPress={handleAddComment} disabled={!newComment.trim() || submitting}>
              <Ionicons name="send" size={30} color="#4CAF50" />
            </TouchableOpacity>
          </View>
          {renderMediaModal()}
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
  const normalizedDate = normalizeDateField(date);
  if (!normalizedDate) return 'Invalid date';
  return new Date(normalizedDate).toLocaleDateString('en-US', {
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
  mediaContainer: {
    height: 300,
    position: 'relative',
  },
  mediaItem: {
    width: width,
    height: 300,
  },
  videoContainer: {
    position: 'relative',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 12,
    height: 12,
    borderRadius: 6,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalMedia: {
    width: '100%',
    height: '100%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  modalCloseButtonCircle: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  modalPagination: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalPaginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  modalPaginationDotActive: {
    backgroundColor: 'white',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
}); 