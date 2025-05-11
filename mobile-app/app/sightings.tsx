import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Platform, Text, Image, TextInput, ScrollView, Modal, Pressable } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebasePublicUrl } from '@/services/firebase';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Location from 'expo-location';

const DEV_USER_ID = 'dev-user-123';

interface Sighting {
  id: string;
  type: string;
  title: string;
  description?: string;
  imageUrl: string | null;
  mediaFiles?: { url: string; type: string }[];
  timestamp: string | { toDate: () => Date };
  location: {
    lat: number;
    lng: number;
  };
}

const getTagColor = (type: string) => {
  switch (type.toUpperCase()) {
    case 'OCEAN':
      return { bg: '#E6F4FF', text: '#3B82F6' };
    case 'WILDLIFE':
      return { bg: '#FEF3C7', text: '#F59E0B' };
    case 'BOTANICAL':
      return { bg: '#DCFCE7', text: '#22C55E' };
    case 'ASTRONOMY':
      return { bg: '#E0E7FF', text: '#6366F1' };
    default:
      return { bg: '#F3F4F6', text: '#6B7280' };
  }
};

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

const getRelativeTime = (timestamp: string | { toDate: () => Date }) => {
  const normalized = normalizeDateField(timestamp);
  const date = normalized ? new Date(normalized) : new Date();
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const getDistanceMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const SIGHTING_TYPES = ['OCEAN', 'WILDLIFE', 'BOTANICAL', 'ASTRONOMY'];

const categoryOptions = [
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

export default function SightingsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [filteredSightings, setFilteredSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'ALL' | 'WEEK' | 'MONTH' | 'UPCOMING'>('ALL');
  const [areaNames, setAreaNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user || __DEV__) {
      loadSightings();
    }
  }, [user]);

  useEffect(() => {
    filterSightings();
  }, [searchQuery, selectedCategories, selectedTimePeriod, sightings]);

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

  useEffect(() => {
    (async () => {
      if (!sightings) return;
      const updates: Record<string, string> = {};
      await Promise.all(sightings.map(async (item) => {
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
  }, [sightings]);

  React.useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadSightings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Only allow access if user is logged in or we're in dev mode
      if (!user && !__DEV__) {
        throw new Error('User not authenticated');
      }

      // Use the incidents endpoint
      const response = await fetch(`http://192.168.50.2:3000/api/incidents?userId=${user?.uid || DEV_USER_ID}`);
      if (!response.ok) {
        throw new Error('Failed to fetch incidents');
      }
      
      const data = await response.json();
      setSightings(data);
    } catch (err) {
      console.error('Error loading incidents:', err);
      setError('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  const filterSightings = () => {
    let filtered = [...sightings];
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(sighting => 
        selectedCategories.includes(sighting.type.toUpperCase())
      );
    }
    
    // Apply time period filter
    const now = new Date();
    if (selectedTimePeriod !== 'ALL') {
      filtered = filtered.filter(sighting => {
        const sightingDate = typeof sighting.timestamp === 'string' ? 
          new Date(sighting.timestamp) : 
          sighting.timestamp.toDate();
        if (selectedTimePeriod === 'WEEK') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return sightingDate >= weekAgo && sightingDate <= now;
        } else if (selectedTimePeriod === 'MONTH') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          return sightingDate >= monthAgo && sightingDate <= now;
        } else if (selectedTimePeriod === 'UPCOMING') {
          return sightingDate > now;
        }
        return true;
      });
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sighting =>
        sighting.title.toLowerCase().includes(query) ||
        (sighting.description?.toLowerCase().includes(query) ?? false)
      );
    }
    
    setFilteredSightings(filtered);
  };

  const renderSighting = ({ item }: { item: Sighting }) => {
    const tagColors = getTagColor(item.type);
    let distanceText = '';
    if (userLocation && item.location) {
      const dist = getDistanceMiles(userLocation.latitude, userLocation.longitude, item.location.lat, item.location.lng);
      distanceText = ` • ${dist.toFixed(1)} mi`;
    }
    const key = item.location ? `${item.location.lat.toFixed(4)},${item.location.lng.toFixed(4)}` : '';
    const area = key && areaNames[key] ? areaNames[key] : '...';

    // Get the first image URL from either mediaFiles array or imageUrl field
    const imageUrl = item.mediaFiles?.find(file => file.type === 'image')?.url || item.imageUrl;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
        ]}
        onPress={() => {
          console.log('View sighting:', item.id);
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
  };

  const toggleCategory = (type: string) => {
    setSelectedCategories((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleReset = () => {
    setSelectedCategories([]);
    setSelectedTimePeriod('ALL');
  };

  const handleApply = () => {
    setIsFilterModalVisible(false);
    applyFilters();
  };

  const applyFilters = () => {
    let filtered = [...sightings];
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(sighting => 
        selectedCategories.includes(sighting.type.toUpperCase())
      );
    }
    
    // Apply time period filter
    const now = new Date();
    if (selectedTimePeriod !== 'ALL') {
      filtered = filtered.filter(sighting => {
        const sightingDate = typeof sighting.timestamp === 'string' ? 
          new Date(sighting.timestamp) : 
          sighting.timestamp.toDate();
        if (selectedTimePeriod === 'WEEK') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return sightingDate >= weekAgo && sightingDate <= now;
        } else if (selectedTimePeriod === 'MONTH') {
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          return sightingDate >= monthAgo && sightingDate <= now;
        } else if (selectedTimePeriod === 'UPCOMING') {
          return sightingDate > now;
        }
        return true;
      });
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sighting =>
        sighting.title.toLowerCase().includes(query) ||
        (sighting.description?.toLowerCase().includes(query) ?? false)
      );
    }
    
    setFilteredSightings(filtered);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText>Loading sightings...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.error}>{error}</ThemedText>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadSightings}
        >
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.proposedHeader}>
        <TouchableOpacity
          style={styles.proposedBackButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={28}
            color={isDark ? '#222' : '#222'}
            style={{ fontWeight: 'bold' }}
          />
        </TouchableOpacity>
        <ThemedText style={styles.proposedTitle}>My Sightings</ThemedText>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setIsFilterModalVisible(true)}
        >
          <Ionicons
            name="filter"
            size={24}
            color={isDark ? '#222' : '#222'}
          />
          {(selectedCategories.length > 0 || selectedTimePeriod !== 'ALL') && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      <View style={styles.searchContainer}>
        <View style={[
          styles.searchInputContainer,
          { backgroundColor: isDark ? '#444444' : '#F3F4F6' }
        ]}>
          <Ionicons
            name="search"
            size={20}
            color={isDark ? '#AAAAAA' : '#666666'}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}
            placeholder="Search sightings..."
            placeholderTextColor={isDark ? '#AAAAAA' : '#666666'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={isDark ? '#AAAAAA' : '#666666'}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' }}
          onPress={() => setIsFilterModalVisible(false)}
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
                onPress={() => toggleCategory(cat.type)}
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

      <FlatList
        data={filteredSightings}
        renderItem={renderSighting}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedView style={styles.proposedEmptyContainer}>
            <ThemedText style={styles.proposedEmptyText}>
              {searchQuery || selectedCategories.length > 0 || selectedTimePeriod !== 'ALL'
                ? 'No sightings match your search criteria'
                : 'No sightings yet. Start by adding your first nature sighting!'}
            </ThemedText>
            {!searchQuery && selectedCategories.length === 0 && selectedTimePeriod === 'ALL' && (
              <TouchableOpacity
                style={styles.proposedAddButton}
                onPress={() => router.push('/add')}
              >
                <ThemedText style={styles.proposedAddButtonText}>
                  Add Sighting
                </ThemedText>
              </TouchableOpacity>
            )}
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
  proposedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  proposedBackButton: {
    marginRight: 12,
  },
  proposedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'left',
    color: '#222',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 12,
    marginHorizontal: 0,
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
  proposedEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  proposedEmptyText: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  proposedAddButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#5CB883',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  proposedAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    padding: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5CB883',
  },
});

export const screenOptions = {
  headerShown: false,
}; 