import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, TextInput, Keyboard, Image, Modal, AppState } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getFirebasePublicUrl } from '@/services/firebase';

type Incident = {
  id: string;
  type: 'OCEAN' | 'WILDLIFE' | 'BOTANICAL' | 'ASTRONOMY';
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  imageUrl?: string;
};

// Define marker colors for each type
const markerColors = {
  OCEAN: '#3B82F6', // blue
  WILDLIFE: '#F59E0B', // yellow
  BOTANICAL: '#EF4444', // red
  ASTRONOMY: '#6366F1', // purple
  default: '#2F855A', // default green
};

// Add this after the markerColors definition
const typeIcons = {
  OCEAN: 'water',
  WILDLIFE: 'paw',
  BOTANICAL: 'leaf',
  ASTRONOMY: 'star',
} as const;

// Helper function to get the system font family
const getSystemFont = (weight: 'regular' | 'medium' | 'semibold' | 'bold') => {
  if (Platform.OS === 'ios') {
    // iOS uses SF Pro
    switch (weight) {
      case 'bold':
        return 'SFProDisplay-Bold';
      case 'semibold':
        return 'SFProDisplay-Semibold';
      case 'medium':
        return 'SFProDisplay-Medium';
      default:
        return 'SFProDisplay-Regular';
    }
  } else {
    // Android uses Roboto
    switch (weight) {
      case 'bold':
        return 'Roboto-Bold';
      case 'semibold':
      case 'medium':
        return 'Roboto-Medium';
      default:
        return 'Roboto-Regular';
    }
  }
};

export default function MapScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'WEEK' | 'MONTH' | 'UPCOMING'>('ALL');
  const [mapRegion, setMapRegion] = useState({
    latitude: 33.979763142639406,
    longitude: -118.46862699581484,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  const incidentTypes = ['OCEAN', 'WILDLIFE', 'BOTANICAL', 'ASTRONOMY'];

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const applyFilters = () => {
    setIsFilterModalVisible(false);
  };

  const resetFilters = () => {
    setSelectedTypes([]);
    setTimeFilter('ALL');
    setIsFilterModalVisible(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    map: {
      width: '100%',
      height: '100%',
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    errorText: {
      textAlign: 'center',
    },
    calloutContainer: {
      // Remove default callout background
      backgroundColor: 'transparent',
    },
    calloutContent: {
      backgroundColor: Platform.select({
        ios: 'rgba(255, 255, 255, 0.95)',
        android: 'white',
      }),
      borderRadius: 16,
      padding: 16,
      minWidth: 200,
      maxWidth: 300,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    calloutTitle: {
      fontSize: 18,
      fontFamily: getSystemFont('semibold'),
      marginBottom: 8,
      color: '#1A202C',
    },
    calloutDescription: {
      fontSize: 14,
      fontFamily: getSystemFont('regular'),
      lineHeight: 20,
      color: '#4A5568',
      marginBottom: 12,
    },
    calloutTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    calloutTagText: {
      color: 'white',
      fontSize: 12,
      fontFamily: getSystemFont('medium'),
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    calloutArrow: {
      backgroundColor: 'transparent',
      borderWidth: 16,
      borderColor: 'transparent',
      borderTopColor: Platform.select({
        ios: 'rgba(255, 255, 255, 0.95)',
        android: 'white',
      }),
      alignSelf: 'center',
      marginTop: -1,
    },
    searchContainer: {
      display: 'none',
    },
    searchBarContainer: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 15 : 15,
      left: 16,
      right: 16,
      zIndex: 1,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(26, 32, 44, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: isDark ? '#FFFFFF' : '#000000',
      padding: 0,
    },
    topBar: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 45 : 45,
      left: 0,
      right: 0,
      height: 120,
      backgroundColor: isDark ? '#1A202C' : '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logo: {
      width: 24,
      height: 24,
      marginRight: 10,
    },
    title: {
      fontSize: 18,
      fontFamily: Platform.OS === 'ios' ? 'SFProDisplay-Semibold' : 'Roboto-Medium',
      color: isDark ? '#fff' : '#1A202C',
    },
    filterButton: {
      position: 'absolute',
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      right: 20,
      bottom: 20,
      borderRadius: 28,
      backgroundColor: isDark ? '#2F855A' : '#48BB78',
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      fontFamily: Platform.select({
        ios: 'SF Pro Display',
        android: 'Roboto',
        default: 'system',
      }),
    },
    filterSection: {
      marginBottom: 24,
    },
    filterSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      fontFamily: Platform.select({
        ios: 'SF Pro Display',
        android: 'Roboto',
        default: 'system',
      }),
    },
    typeFilters: {
      flexDirection: 'column',
      gap: 8,
    },
    typeFilterButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      width: '100%',
    },
    typeFilterButtonActive: {
      borderColor: 'transparent',
    },
    typeFilterText: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
      fontFamily: Platform.select({
        ios: 'SF Pro Text',
        android: 'Roboto',
        default: 'system',
      }),
    },
    typeFilterTextActive: {
      color: '#FFFFFF',
    },
    timeFilters: {
      flexDirection: 'row',
      gap: 8,
    },
    timeFilterButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      alignItems: 'center',
    },
    timeFilterButtonActive: {
      backgroundColor: '#F59E0B',
      borderColor: 'transparent',
    },
    timeFilterText: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: Platform.select({
        ios: 'SF Pro Text',
        android: 'Roboto',
        default: 'system',
      }),
    },
    timeFilterTextActive: {
      color: '#FFFFFF',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 20,
      alignItems: 'center',
    },
    resetButton: {
      backgroundColor: '#E2E8F0',
    },
    applyButton: {
      backgroundColor: '#2F855A',
    },
    resetButtonText: {
      color: '#4A5568',
      fontWeight: '600',
      fontFamily: Platform.select({
        ios: 'SF Pro Display',
        android: 'Roboto',
        default: 'system',
      }),
    },
    applyButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontFamily: Platform.select({
        ios: 'SF Pro Display',
        android: 'Roboto',
        default: 'system',
      }),
    },
    typeFilterContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
  });

  const filteredIncidents = useMemo(() => {
    let filtered = [...incidents];  // Create a copy of incidents array

    // Type filter - only apply if types are selected
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(incident => selectedTypes.includes(incident.type));
    }

    // Time filter
    const now = new Date();
    filtered = filtered.filter(incident => {
      const incidentDate = new Date(incident.timestamp);
      const diffTime = Math.abs(now.getTime() - incidentDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      switch (timeFilter) {
        case 'WEEK':
          return diffDays <= 7;
        case 'MONTH':
          return diffDays <= 30;
        case 'UPCOMING':
          return incidentDate > now;
        default:
          return true;
      }
    });

    // Search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(incident =>
        incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [incidents, selectedTypes, timeFilter, searchQuery]);

  const fetchIncidents = useCallback(async () => {
    try {
      const response = await fetch('http://192.168.50.2:3000/api/incidents');
      const data = await response.json();
      setIncidents(data);
    } catch (err) {
      setErrorMsg('Failed to load incidents');
    }
  }, []);

  // Initial location and incidents fetch
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      await fetchIncidents();
    })();
  }, [fetchIncidents]);

  // Refresh incidents when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchIncidents();
    }, [fetchIncidents])
  );

  // Add this useEffect to update map region when incidents change
  useEffect(() => {
    if (incidents.length > 0) {
      // Calculate the center point of all incidents
      const lats = incidents.map(inc => inc.location.lat);
      const lngs = incidents.map(inc => inc.location.lng);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      
      // Calculate the delta to show all points with some padding
      const latDelta = Math.max((Math.max(...lats) - Math.min(...lats)) * 1.5, 0.02);
      const lngDelta = Math.max((Math.max(...lngs) - Math.min(...lngs)) * 1.5, 0.02);

      const newRegion = {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
      setMapRegion(newRegion);
    }
  }, [incidents]);

  // Add AppState listener to refresh data when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        fetchIncidents();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [fetchIncidents]);

  const mapStyle = isDark ? [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#242f3e" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#746855" }]
    }
  ] : [];

  const handleSearch = () => {
    Keyboard.dismiss();
  };

  return (
    <ThemedView style={styles.container}>
      {errorMsg && incidents.length === 0 ? (
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.container}>
          <View style={styles.topBar}>
            <View style={styles.logoContainer}>
              <Ionicons 
                name="location" 
                size={24} 
                color={isDark ? '#fff' : '#1A202C'} 
                style={styles.logo}
              />
              <ThemedText style={styles.title}>NATURE TRACKER</ThemedText>
            </View>
          </View>
          
          <View style={styles.searchBarContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={isDark ? '#fff' : '#1A202C'} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search events..."
                placeholderTextColor={isDark ? '#888888' : '#666666'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={() => Keyboard.dismiss()}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={isDark ? '#fff' : '#1A202C'} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {location && (
            <MapView
              key={`map-${mapRegion.latitude}-${mapRegion.longitude}`}
              style={styles.map}
              customMapStyle={mapStyle}
              onPress={() => Keyboard.dismiss()}
              region={mapRegion}
              showsUserLocation={true}
              showsMyLocationButton={true}>
              {/* Incident markers */}
              {filteredIncidents.map((incident) => (
                <Marker
                  key={incident.id}
                  coordinate={{
                    latitude: incident.location.lat,
                    longitude: incident.location.lng,
                  }}
                  pinColor={markerColors[incident.type as keyof typeof markerColors] || markerColors.default}>
                  <Callout tooltip>
                    <View style={styles.calloutContainer}>
                      <View style={styles.calloutContent}>
                        <ThemedText style={styles.calloutTitle}>{incident.title}</ThemedText>
                        {incident.imageUrl && (
                          <Image
                            source={{ uri: getFirebasePublicUrl(incident.imageUrl) }}
                            style={{ width: 180, height: 100, borderRadius: 8, marginBottom: 8 }}
                            resizeMode="cover"
                          />
                        )}
                        <ThemedText style={styles.calloutDescription}>{incident.description}</ThemedText>
                        <View style={[styles.calloutTag, { backgroundColor: markerColors[incident.type as keyof typeof markerColors] || markerColors.default }]}>
                          <ThemedText style={styles.calloutTagText}>{incident.type}</ThemedText>
                        </View>
                      </View>
                      <View style={styles.calloutArrow} />
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
          )}

          {/* Floating Filter Button */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setIsFilterModalVisible(true)}
          >
            <Ionicons 
              name="filter" 
              size={24} 
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Filter Modal */}
          <Modal
            visible={isFilterModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsFilterModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setIsFilterModalVisible(false)}
            >
              <View style={[
                styles.modalContent,
                { backgroundColor: isDark ? '#1A202C' : '#FFFFFF' }
              ]}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>Filter</ThemedText>
                  <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                    <Ionicons name="close" size={24} color={isDark ? '#fff' : '#1A202C'} />
                  </TouchableOpacity>
                </View>

                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterSectionTitle}>Categories</ThemedText>
                  <View style={styles.typeFilters}>
                    {incidentTypes.map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeFilterButton,
                          selectedTypes.includes(type) && styles.typeFilterButtonActive,
                          selectedTypes.includes(type) && {
                            backgroundColor: type === 'OCEAN' ? '#3B82F6' :
                                          type === 'WILDLIFE' ? '#F59E0B' :
                                          type === 'BOTANICAL' ? '#EF4444' :
                                          type === 'ASTRONOMY' ? '#6366F1' : '#2F855A'
                          }
                        ]}
                        onPress={() => toggleTypeFilter(type)}
                      >
                        <View style={styles.typeFilterContent}>
                          <Ionicons
                            name={typeIcons[type as keyof typeof typeIcons]}
                            size={18}
                            color={selectedTypes.includes(type) ? '#FFFFFF' : '#666666'}
                          />
                          <ThemedText style={[
                            styles.typeFilterText,
                            selectedTypes.includes(type) && styles.typeFilterTextActive
                          ]}>
                            {type}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.filterSection}>
                  <ThemedText style={styles.filterSectionTitle}>Time Period</ThemedText>
                  <View style={styles.timeFilters}>
                    {['ALL', 'WEEK', 'MONTH', 'UPCOMING'].map(period => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.timeFilterButton,
                          timeFilter === period && styles.timeFilterButtonActive
                        ]}
                        onPress={() => setTimeFilter(period as 'ALL' | 'WEEK' | 'MONTH' | 'UPCOMING')}
                      >
                        <ThemedText style={[
                          styles.timeFilterText,
                          timeFilter === period && styles.timeFilterTextActive
                        ]}>
                          {period}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.resetButton]}
                    onPress={resetFilters}
                  >
                    <ThemedText style={styles.resetButtonText}>Reset</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.applyButton]}
                    onPress={applyFilters}
                  >
                    <ThemedText style={styles.applyButtonText}>Apply</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      )}
    </ThemedView>
  );
}
