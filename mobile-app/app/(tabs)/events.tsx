import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Platform, Text, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db, getFirebasePublicUrl } from '@/services/firebase';

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
  imageUrl?: string | null;
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
    const diffInDays = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }
    return eventDate.toLocaleDateString();
  } catch (error) {
    return 'Invalid date';
  }
};

export default function EventsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTimeFilter, setEventTimeFilter] = useState<'CURRENT' | 'UPCOMING'>('CURRENT');
  const [sortType, setSortType] = useState<'recent' | 'trending'>('recent');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<EventType[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'ALL' | 'WEEK' | 'MONTH' | 'UPCOMING'>('ALL');
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

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

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchIncidents = async () => {
      try {
        const response = await fetch('http://192.168.50.2:3000/api/incidents');
        const data = await response.json();
        console.log('Fetched incidents from API:', data);
        setEvents(data);
      } catch (err) {
        console.error('Error fetching incidents from API:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, [eventTimeFilter]);

  // Apply filtering when events, selectedCategories, or selectedTimePeriod change
  useEffect(() => {
    applyFilters();
  }, [events, selectedCategories, selectedTimePeriod]);

  const applyFilters = () => {
    let filtered = [...events];
    // Filter by categories if any selected
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(event => selectedCategories.includes(event.type as EventType));
    }
    // Filter by time period
    if (selectedTimePeriod !== 'ALL') {
      const now = new Date();
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
          {item.imageUrl && (
            <View style={[
              styles.imageContainer,
              { backgroundColor: isDark ? '#444444' : '#f0f0f0' }
            ]}>
              <Image
                source={{ uri: getFirebasePublicUrl(item.imageUrl) }}
                style={styles.cardImage}
                resizeMode="cover"
                onError={(e) => {
                  console.warn(`Failed to load image for event ${item.id}:`, e.nativeEvent.error);
                }}
                onLoadStart={() => {
                  console.log(`Loading image for event ${item.id}: ${item.imageUrl}`);
                }}
                onLoadEnd={() => {
                  console.log(`Finished loading image for event ${item.id}`);
                }}
              />
            </View>
          )}
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.tagContainer}>
                <View style={[styles.tag, { backgroundColor: tagColors.bg }]}>
                  <Text style={[styles.tagText, { color: tagColors.text }]}>
                    {item.type}
                  </Text>
                </View>
                <Text style={styles.date}>
                  {getRelativeTime(item.timestamp)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text 
              style={styles.cardDescription}
              numberOfLines={2}
            >
              {item.description}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.locationContainer}>
                <Ionicons
                  name="location"
                  size={16}
                  color={isDark ? '#888888' : '#666666'}
                />
                <Text style={styles.locationText}>
                  {item.location ? `${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}` : 'Unknown location'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    } catch (err) {
      console.error('Error rendering event:', err);
      return (
        <View style={[styles.card, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]}>
          <Text style={styles.error}>Error displaying event</Text>
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

      {/* Sort and Filter Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginRight: 20, marginBottom: 4 }}>
        <TouchableOpacity onPress={() => setSortType(sortType === 'recent' ? 'trending' : 'recent')}>
          <Text style={{ fontSize: 12, color: '#888', textDecorationLine: 'underline', marginRight: 12 }}>
            Sort: {sortType === 'recent' ? 'Most Recent' : 'Trending'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={{ padding: 4 }}>
          <Ionicons name="filter" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, minHeight: 340 }}>
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
          </View>
        </View>
      </Modal>

      {/* Existing FlatList */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
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
  cardDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 16,
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