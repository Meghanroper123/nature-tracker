import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

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

const FloatingActionButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={24} color="#000" style={styles.fabIcon} />
    </TouchableOpacity>
  );
};

const FilterButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <TouchableOpacity
      style={styles.filterButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="filter" 
        size={24} 
        color="#0F6B42"
      />
    </TouchableOpacity>
  );
};

export default function SightingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSightings();
  }, []);

  const loadSightings = async () => {
    try {
      // TODO: Implement API call to fetch user's sightings
      // For now using mock data
      setSightings([
        {
          id: '1',
          type: 'bird',
          title: 'Red Cardinal',
          description: 'Beautiful red cardinal spotted in the backyard',
          imageUrl: null,
          timestamp: new Date().toISOString(),
          location: {
            latitude: 37.7749,
            longitude: -122.4194
          }
        },
        {
          id: '2',
          type: 'plant',
          title: 'Wild Rose',
          description: 'Found a beautiful wild rose bush in bloom',
          imageUrl: null,
          timestamp: new Date().toISOString(),
          location: {
            latitude: 37.7749,
            longitude: -122.4194
          }
        }
      ]);
    } catch (err) {
      setError('Failed to load sightings');
    } finally {
      setLoading(false);
    }
  };

  const renderSighting = ({ item }: { item: Sighting }) => (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
      ]}
      onPress={() => {
        // TODO: Navigate to sighting detail view
        console.log('View sighting:', item.id);
      }}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View>
            <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
            <ThemedText style={styles.cardType}>{item.type}</ThemedText>
          </View>
          <ThemedText style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleDateString()}
          </ThemedText>
        </View>
        
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
        
        <ThemedText 
          style={styles.cardDescription}
          numberOfLines={2}
        >
          {item.description}
        </ThemedText>

        <View style={styles.cardFooter}>
          <View style={styles.locationContainer}>
            <Ionicons
              name="location"
              size={16}
              color={isDark ? '#888888' : '#666666'}
            />
            <ThemedText style={styles.locationText}>
              {`${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`}
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={() => {
              // TODO: Implement share functionality
              console.log('Share sighting:', item.id);
            }}
          >
            <Ionicons
              name="share-outline"
              size={24}
              color={isDark ? '#888888' : '#666666'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

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
      <View style={styles.topBar}>
        <ThemedText style={styles.title}>NATURE TRACKER</ThemedText>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            console.log('Open filters');
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="options" 
            size={24} 
            color="#0F6B42"
          />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={sightings}
        renderItem={renderSighting}
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
  list: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardType: {
    fontSize: 14,
    opacity: 0.7,
    textTransform: 'capitalize',
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.5,
  },
  cardImage: {
    height: 200,
    width: '100%',
    borderRadius: 8,
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 12,
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabIcon: {
    textAlign: 'center',
    lineHeight: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F6B42',
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
}); 