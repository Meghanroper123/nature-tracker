import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Platform, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

type EventType = 'OCEAN' | 'WILDLIFE' | 'BOTANICAL' | 'ASTRONOMY';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  type: EventType;
  imageUrl: string | null;
  isBookmarked?: boolean;
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

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTimeFilter, setEventTimeFilter] = useState<'CURRENT' | 'UPCOMING'>('CURRENT');

  useEffect(() => {
    try {
      loadEvents();
    } catch (err) {
      console.error('Error in useEffect:', err);
      setError('Failed to initialize events screen');
      setLoading(false);
    }
  }, [eventTimeFilter]); // Reload when filter changes

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Implement API call to fetch events with eventTimeFilter
      // For now using mock data
      const mockEvents: Event[] = [
        {
          id: '1',
          title: 'Bioluminescence',
          description: 'Bioluminescent waves in Santa Monica',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Santa Monica',
          type: 'OCEAN',
          imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop',
          isBookmarked: true
        },
        {
          id: '2',
          title: 'Whale Migration',
          description: 'Whales migrating in the Bay',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Santa Monica Bay',
          type: 'WILDLIFE',
          imageUrl: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1000&auto=format&fit=crop',
          isBookmarked: false
        },
        {
          id: '3',
          title: 'Superbloom',
          description: 'Superbloom in Santa Monica',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          location: 'Santa Monica Mountains',
          type: 'BOTANICAL',
          imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000&auto=format&fit=crop',
          isBookmarked: false
        }
      ];
      
      // Filter events based on eventTimeFilter
      const now = new Date();
      const filteredEvents = mockEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventTimeFilter === 'CURRENT' ? eventDate <= now : eventDate > now;
      });
      
      setEvents(filteredEvents);
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = (eventId: string) => {
    setEvents(events.map(event => 
      event.id === eventId 
        ? { ...event, isBookmarked: !event.isBookmarked }
        : event
    ));
  };

  const renderEvent = ({ item }: { item: Event }) => {
    try {
      const tagColors = getTagColor(item.type);
      
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
                source={{ uri: item.imageUrl }}
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
                  {getRelativeTime(item.date)}
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
                  {item.location}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => toggleBookmark(item.id)}
                style={styles.bookmarkButton}
              >
                <Ionicons
                  name={item.isBookmarked ? "bookmark" : "bookmark-outline"}
                  size={24}
                  color={isDark ? '#888888' : '#666666'}
                />
              </TouchableOpacity>
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
          onPress={loadEvents}
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

      {/* Existing FlatList */}
      <FlatList
        data={events}
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