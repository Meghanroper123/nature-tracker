import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Platform, Text, Image, Modal, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db, getFirebasePublicUrl } from '@/services/firebase';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

type EventType = 'OCEAN' | 'WILDLIFE' | 'BOTANICAL' | 'ASTRONOMY';

interface Event {
  id: string;
  type: EventType | string;
  title: string;
  description: string;
  location: { lat: number; lng: number };
  timestamp: string;
  eventDate: string;
  imageUrl?: string | null;
  mediaFiles?: { type: string; url: string; thumbnailUrl?: string }[];
}

const getTagColor = (type: Event['type']) => {
  switch (type) {
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

const getRelativeTime = (date: string) => {
  try {
    const now = new Date();
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return 'Invalid date';
    }
    const diffInSeconds = Math.floor((now.getTime() - eventDate.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes === 1 ? '' : 's'} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    }
    return eventDate.toLocaleDateString();
  } catch (error) {
    return 'Invalid date';
  }
};

// Helper to calculate distance between two lat/lng points in miles
function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 3958.8; // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to get a human-readable area from lat/lng using reverse geocoding
const geocodeCache: Record<string, string> = {};
async function getAreaName(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache[key]) return geocodeCache[key];
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (results && results.length > 0) {
      const { city, district, subregion, region, name } = results[0];
      const area = city || district || subregion || region || name || 'Unknown area';
      geocodeCache[key] = area;
      return area;
    }
  } catch (e) {
    // ignore
  }
  return 'Unknown area';
}

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

export default function EventsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTimeFilter, setEventTimeFilter] = useState<'CURRENT' | 'UPCOMING'>('CURRENT');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<EventType[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'ALL' | 'WEEK' | 'MONTH' | 'UPCOMING'>('ALL');
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [areaNames, setAreaNames] = useState<Record<string, string>>({});

  const categoryOptions: { type: EventType; label: string; icon: any }[] = [
    { type: 'OCEAN', label: 'OCEAN', icon: <Ionicons name="water" size={20} color="#3B82F6" style={{ marginRight: 8 }} /> },
    { type: 'WILDLIFE', label: 'WILDLIFE', icon: <Ionicons name="paw" size={20} color="#F59E0B" style={{ marginRight: 8 }} /> },
    { type: 'BOTANICAL', label: 'BOTANICAL', icon: <Ionicons name="leaf" size={20} color="#22C55E" style={{ marginRight: 8 }} /> },
    { type: 'ASTRONOMY', label: 'ASTRONOMY', icon: <Ionicons name="star" size={20} color="#6366F1" style={{ marginRight: 8 }} /> },
  ];
  const timePeriodOptions = [
    { key: 'ALL', label: 'ALL' },
    { key: 'WEEK', label: 'WEEK' },
    { key: 'MONTH', label: 'MONTH' },
    { key: 'UPCOMING', label: 'UPCOMING' },
  ];

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      setError(null);

      const fetchIncidents = async () => {
        try {
          const response = await fetch('http://192.168.50.2:3000/api/incidents');
          const data = await response.json();
          // Normalize eventDate and timestamp robustly
          const normalized = (Array.isArray(data) ? data : []).map((item) => ({
            ...item,
            eventDate: normalizeDateField(item.eventDate),
            timestamp: normalizeDateField(item.timestamp),
          }));
          setEvents(normalized);
        } catch (err) {
          console.error('Error fetching incidents from API:', err);
          setError('Failed to load events');
          setEvents([]); // fallback to empty array on error
        } finally {
          setLoading(false);
        }
      };

      fetchIncidents();
    }, [eventTimeFilter])
  );

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Preload area names for visible events
  useEffect(() => {
    (async () => {
      if (!events) return;
      const updates: Record<string, string> = {};
      await Promise.all(events.map(async (item) => {
        if (item.location) {
          const key = `${item.location.lat.toFixed(4)},${item.location.lng.toFixed(4)}`;
          if (!areaNames[key]) {
            updates[key] = await getAreaName(item.location.lat, item.location.lng);
          }
        }
      }));
      if (Object.keys(updates).length > 0) {
        setAreaNames(prev => ({ ...prev, ...updates }));
      }
    })();
  }, [events]);

  // Apply filtering when events, selectedCategories, or selectedTimePeriod change
  useEffect(() => {
    applyFilters();
  }, [events, selectedCategories, selectedTimePeriod]);

  const applyFilters = () => {
    // Ensure events is always an array
    const safeEvents = Array.isArray(events) ? events : [];
    let filtered = [...safeEvents];
    // Sort by most recent (descending by timestamp)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const now = new Date();
    // Filter by tab (CURRENT or UPCOMING)
    if (eventTimeFilter === 'CURRENT') {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate <= now;
      });
    } else if (eventTimeFilter === 'UPCOMING') {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate > now;
      });
    }
    // Filter by categories if any selected
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(event => selectedCategories.includes(event.type as EventType));
    }
    // Filter by time period
    if (selectedTimePeriod !== 'ALL') {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.timestamp);
        if (selectedTimePeriod === 'WEEK') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return eventDate >= weekAgo && eventDate <= now;
        } else if (selectedTimePeriod === 'MONTH') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          return eventDate >= monthAgo && eventDate <= now;
        } else if (selectedTimePeriod === 'UPCOMING') {
          return eventDate > now;
        }
        return true;
      });
    }
    setFilteredEvents(filtered);
  };

  const toggleBookmark = async (eventId: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const savedEvents: string[] = userSnap.exists() && userSnap.data().savedEvents ? userSnap.data().savedEvents : [];
      const isBookmarked = savedEvents.includes(eventId);
      // Update Firestore
      await updateDoc(userRef, {
        savedEvents: isBookmarked ? arrayRemove(eventId) : arrayUnion(eventId)
      });
      // Update local state
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, isBookmarked: !isBookmarked }
          : event
      ));
    } catch (err) {
      console.error('Error updating bookmarks:', err);
    }
  };

  const toggleCategory = (type: EventType) => {
    setSelectedCategories((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };
  const handleReset = () => {
    setSelectedCategories([]);
    setSelectedTimePeriod('ALL');
  };
  const handleApply = () => {
    setFilterModalVisible(false);
    applyFilters();
  };

  const renderEvent = ({ item }: { item: Event }) => {
    try {
      const tagColors = getTagColor(item.type as EventType);
      const key = item.location ? `${item.location.lat.toFixed(4)},${item.location.lng.toFixed(4)}` : '';
      const area = key && areaNames[key] ? areaNames[key] : '...';
      let distanceText = '';
      if (userLocation && item.location) {
        const dist = getDistanceMiles(userLocation.latitude, userLocation.longitude, item.location.lat, item.location.lng);
        distanceText = ` • ${dist.toFixed(1)} mi`;
      }
      
      // Get the first image URL from either mediaFiles or imageUrl
      const getFirstImageUrl = () => {
        if (item.mediaFiles && item.mediaFiles.length > 0) {
          const firstImage = item.mediaFiles.find(file => file.type === 'image');
          if (firstImage) return firstImage.url;
        }
        return item.imageUrl;
      };

      const imageUrl = getFirstImageUrl();
      
      return (
        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
          ]}
          onPress={() => {
            console.log('View event:', item.id);
            router.push(`/${item.id}`);
          }}
        >
          {imageUrl && (
            <View style={[
              styles.imageContainer,
              { backgroundColor: isDark ? '#444444' : '#f0f0f0' }
            ]}>
              <Image
                source={{ uri: getFirebasePublicUrl(imageUrl) }}
                style={styles.cardImage}
                resizeMode="cover"
                onError={(e) => {
                  console.warn(`Failed to load image for event ${item.id}:`, e.nativeEvent.error);
                }}
                onLoadStart={() => {
                  console.log(`Loading image for event ${item.id}: ${imageUrl}`);
                }}
                onLoadEnd={() => {
                  console.log(`Finished loading image for event ${item.id}`);
                }}
              />
            </View>
          )}
          <View style={styles.cardContent}>
            <View style={[styles.cardHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={[
                styles.date,
                { color: isDark ? '#CCCCCC' : undefined }
              ]}>
                {getRelativeTime(item.timestamp)}
              </Text>
              <View style={[styles.locationContainer, { flexDirection: 'row', alignItems: 'center' }]}>
                <Ionicons
                  name="location"
                  size={16}
                  color={isDark ? '#AAAAAA' : '#666666'}
                />
                <Text style={[
                  styles.locationText,
                  { color: isDark ? '#BBBBBB' : undefined }
                ]}>
                  {item.location ? `${area}${distanceText}` : 'Unknown location'}
                </Text>
              </View>
            </View>
            <Text style={[
              styles.cardTitle,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}>
              {item.title}
            </Text>
          </View>
        </TouchableOpacity>
      );
    } catch (error) {
      console.error('Error rendering event:', error);
      return (
        <View style={[styles.card, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]}>
          <Text style={[styles.error, { color: isDark ? '#FF6B6B' : '#E53E3E' }]}>Error displaying event</Text>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading events...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            const q = query(collection(db, 'incidents'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
              const incidentsList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  type: (data.type || 'UNKNOWN').toUpperCase(),
                  title: data.title || 'Untitled',
                  description: data.description || '',
                  location: data.location || { lat: 0, lng: 0 },
                  timestamp: typeof data.timestamp === 'string'
                    ? data.timestamp
                    : (data.timestamp && data.timestamp.toDate ? data.timestamp.toDate().toISOString() : ''),
                  eventDate: typeof data.eventDate === 'string'
                    ? data.eventDate
                    : (data.eventDate && data.eventDate.toDate ? data.eventDate.toDate().toISOString() : ''),
                  imageUrl: data.imageUrl || null,
                };
              });
              console.log('Fetched incidents (MapScreen style):', incidentsList);
              setEvents(incidentsList);
              setLoading(false);
            }, (err) => {
              console.error('Error fetching incidents with onSnapshot:', err);
              setError('Failed to load events');
              setLoading(false);
            });
            return () => unsubscribe();
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Event Type Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            eventTimeFilter === 'CURRENT' && styles.toggleButtonActive,
            { borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }
          ]}
          onPress={() => setEventTimeFilter('CURRENT')}
        >
          <Text style={[
            styles.toggleButtonText,
            eventTimeFilter === 'CURRENT' && styles.toggleButtonTextActive
          ]}>
            CURRENT
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            eventTimeFilter === 'UPCOMING' && styles.toggleButtonActive,
            { borderTopRightRadius: 20, borderBottomRightRadius: 20 }
          ]}
          onPress={() => setEventTimeFilter('UPCOMING')}
        >
          <Text style={[
            styles.toggleButtonText,
            eventTimeFilter === 'UPCOMING' && styles.toggleButtonTextActive
          ]}>
            UPCOMING
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' }}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable
            style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, minHeight: 340 }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 20 }}>Filter</Text>
            {/* Categories */}
            <Text style={{ fontWeight: '600', fontSize: 16, marginBottom: 8 }}>Categories</Text>
            {categoryOptions.map((cat) => (
              <TouchableOpacity
                key={cat.type}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: selectedCategories.includes(cat.type) ? '#2B4C34' : '#E5E7EB',
                  backgroundColor: selectedCategories.includes(cat.type) ? '#E6F4EA' : '#fff',
                  borderRadius: 24,
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  marginBottom: 10,
                }}
                onPress={() => toggleCategory(cat.type as EventType)}
              >
                {cat.icon}
                <Text style={{ fontWeight: '500', fontSize: 15, color: '#222' }}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
            {/* Time Period */}
            <Text style={{ fontWeight: '600', fontSize: 16, marginTop: 18, marginBottom: 8 }}>Time Period</Text>
            <View style={{ flexDirection: 'row', marginBottom: 18 }}>
              {timePeriodOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={{
                    backgroundColor: selectedTimePeriod === opt.key ? '#F9B233' : '#fff',
                    borderColor: selectedTimePeriod === opt.key ? '#F9B233' : '#E5E7EB',
                    borderWidth: 1,
                    borderRadius: 20,
                    paddingVertical: 8,
                    paddingHorizontal: 18,
                    marginRight: 10,
                  }}
                  onPress={() => setSelectedTimePeriod(opt.key as any)}
                >
                  <Text style={{ fontWeight: '600', color: selectedTimePeriod === opt.key ? '#fff' : '#222' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity
                onPress={handleReset}
                style={{ flex: 1, backgroundColor: '#E5E7EB', borderRadius: 16, paddingVertical: 12, marginRight: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#222', fontWeight: '600', fontSize: 16 }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApply}
                style={{ flex: 1, backgroundColor: '#2B4C34', borderRadius: 16, paddingVertical: 12, marginLeft: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Filter Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginRight: 20, marginBottom: 4 }}>
        <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={{ padding: 4 }}>
          <Ionicons name="filter" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Existing FlatList */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[
              styles.emptyText,
              { color: isDark ? '#CCCCCC' : undefined }
            ]}>
              No {eventTimeFilter.toLowerCase()} events available.
            </Text>
          </View>
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
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 12,
    opacity: 0.6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.7,
  },
  bookmarkButton: {
    padding: 4,
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
    opacity: 0.7,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2B4C34',
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: '#2B4C34',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B4C34',
    letterSpacing: 0.5,
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
}); 