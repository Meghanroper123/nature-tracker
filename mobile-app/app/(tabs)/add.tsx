import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Image, TextInput, Platform, Alert, Modal, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';

const DEV_USER_ID = 'dev-user-123';

type EventType = 'OCEAN' | 'WILDLIFE' | 'BOTANICAL' | 'ASTRONOMY';

interface FormData {
  type: string;
  title: string;
  description: string;
  mediaFiles: { uri: string; type: 'image' | 'video' }[];
  location: { latitude: number; longitude: number } | null;
  eventDate: Date;
}

interface FormErrors {
  type?: string;
  title?: string;
  description?: string;
  mediaFiles?: string;
  location?: string;
}

const typeOptions = [
  { label: 'Ocean', value: 'OCEAN', icon: 'water' },
  { label: 'Wildlife', value: 'WILDLIFE', icon: 'paw' },
  { label: 'Botanical', value: 'BOTANICAL', icon: 'leaf' },
  { label: 'Astronomy', value: 'ASTRONOMY', icon: 'moon' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    justifyContent: 'center',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  imageButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageGridItem: {
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  videoPreview: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addMoreButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: 'red',
    marginTop: 4,
  },
  errorInput: {
    borderColor: 'red',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
  },
  typeIcon: {
    marginRight: 8,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    flex: 1,
  },
  error: {
    color: '#E53E3E',
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  typeList: {
    maxHeight: 300,
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeSelectorText: {
    marginLeft: 8,
  },
  inputText: {
    fontSize: 16,
    color: '#000000',
    textAlignVertical: 'center',
  },
});

export default function AddSightingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    type: '',
    title: '',
    description: '',
    mediaFiles: [],
    location: null,
    eventDate: new Date(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editingLocation, setEditingLocation] = useState(false);
  const [pinLocation, setPinLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState({ latitude: 34.0195, longitude: -118.4912, latitudeDelta: 0.01, longitudeDelta: 0.01 });
  const originalLocation = formData.location;
  const SANTA_MONICA = { latitude: 34.0195, longitude: -118.4912, latitudeDelta: 0.01, longitudeDelta: 0.01 };
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const userLoc = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setPinLocation({ latitude: userLoc.latitude, longitude: userLoc.longitude });
          setMapRegion(userLoc);
          setFormData(prev => ({ ...prev, location: { latitude: userLoc.latitude, longitude: userLoc.longitude } }));
        } else {
          setPinLocation({ latitude: SANTA_MONICA.latitude, longitude: SANTA_MONICA.longitude });
          setMapRegion(SANTA_MONICA);
          setFormData(prev => ({ ...prev, location: { latitude: SANTA_MONICA.latitude, longitude: SANTA_MONICA.longitude } }));
          setLocationError('Location permission denied. Using Santa Monica, CA as default.');
        }
      } catch (e) {
        setPinLocation({ latitude: SANTA_MONICA.latitude, longitude: SANTA_MONICA.longitude });
        setMapRegion(SANTA_MONICA);
        setFormData(prev => ({ ...prev, location: { latitude: SANTA_MONICA.latitude, longitude: SANTA_MONICA.longitude } }));
        setLocationError('Could not get location. Using Santa Monica, CA as default.');
      }
    })();
  }, []);

  const validateForm = () => {
    const errors: FormErrors = {};
    
    if (!formData.type) {
      errors.type = 'Please select a type';
    }
    
    if (!formData.title.trim()) {
      errors.title = 'Please enter a title';
    }
    
    if (!formData.mediaFiles.length) {
      errors.mediaFiles = 'Please add at least one photo or video';
    }
    
    if (!formData.location) {
      errors.location = 'Please set a location';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const pickMedia = async () => {
    Alert.alert(
      'Add Media',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Please grant camera permissions to take photos');
              return;
            }

            try {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
              });

              if (!result.canceled && result.assets) {
                setFormData(prev => ({
                  ...prev,
                  mediaFiles: [...prev.mediaFiles, { uri: result.assets[0].uri, type: 'image' }],
                }));
                setFormErrors(prev => ({ ...prev, mediaFiles: undefined }));
              }
            } catch (err) {
              console.error('Error taking photo:', err);
              Alert.alert('Error', 'Failed to take photo. Please try again.');
            }
          },
        },
        {
          text: 'Record Video',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Please grant camera permissions to record videos');
              return;
            }

            try {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
                videoMaxDuration: 30,
              });

              if (!result.canceled && result.assets) {
                setFormData(prev => ({
                  ...prev,
                  mediaFiles: [...prev.mediaFiles, { uri: result.assets[0].uri, type: 'video' }],
                }));
                setFormErrors(prev => ({ ...prev, mediaFiles: undefined }));
              }
            } catch (err) {
              console.error('Error recording video:', err);
              Alert.alert('Error', 'Failed to record video. Please try again.');
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Please grant media library permissions to add files');
              return;
            }

            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: false,
                allowsMultipleSelection: true,
                selectionLimit: 5,
                quality: 1,
              });

              if (!result.canceled && result.assets) {
                const newMediaFiles = result.assets.map(asset => ({
                  uri: asset.uri,
                  type: asset.type === 'video' ? 'video' as const : 'image' as const
                }));
                
                setFormData(prev => ({
                  ...prev,
                  mediaFiles: [...prev.mediaFiles, ...newMediaFiles].slice(0, 5),
                }));
                setFormErrors(prev => ({ ...prev, mediaFiles: undefined }));
              }
            } catch (err) {
              console.error('Error picking media:', err);
              Alert.alert('Error', 'Failed to pick media. Please try again.');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const removeMedia = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Please fill out all required fields and upload at least one photo or video.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the current location if not already set
      let currentLocation = formData.location;
      if (!currentLocation) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            currentLocation = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            };
          } else {
            currentLocation = {
              latitude: SANTA_MONICA.latitude,
              longitude: SANTA_MONICA.longitude
            };
          }
        } catch (e) {
          currentLocation = {
            latitude: SANTA_MONICA.latitude,
            longitude: SANTA_MONICA.longitude
          };
        }
      }

      const form = new FormData();
      form.append('title', formData.title);
      form.append('description', formData.description || '');
      form.append('type', formData.type);
      form.append('lat', String(currentLocation.latitude));
      form.append('lng', String(currentLocation.longitude));
      form.append('userId', user?.uid || DEV_USER_ID);
      form.append('eventDate', formData.eventDate.toISOString());
      
      // Append all media files
      formData.mediaFiles.forEach((file, index) => {
        const uriParts = file.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        form.append('mediaFiles', {
          uri: file.uri,
          name: `${file.type}_${index}.${fileType}`,
          type: file.type === 'video' ? `video/${fileType}` : `image/${fileType}`,
        } as any);
      });

      const response = await fetch('http://192.168.50.2:3000/api/incidents', {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save incident. Please check your input and try again.');
        setLoading(false);
        return;
      }

      const savedIncident = await response.json();
      console.log('Incident saved:', savedIncident);
      
      // Reset form data
      setFormData({
        type: '',
        title: '',
        description: '',
        mediaFiles: [],
        location: null,
        eventDate: new Date(),
      });
      setFormErrors({});
      setError(null);
      
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save incident. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeItem = ({ item }: { item: { label: string; value: string; icon: string } }) => (
    <TouchableOpacity
      style={[
        styles.typeItem,
        { 
          backgroundColor: isDark ? '#333' : '#fff',
          borderColor: formData.type === item.value ? (isDark ? '#48BB78' : '#2F855A') : 'transparent',
        }
      ]}
      onPress={() => {
        setFormData(prev => ({ ...prev, type: item.value as EventType }));
        setFormErrors(prev => ({ ...prev, type: undefined }));
        setIsTypeModalVisible(false);
      }}
    >
      <Ionicons 
        name={item.icon as any} 
        size={24} 
        color={isDark ? '#FFFFFF' : '#000000'} 
        style={styles.typeIcon}
      />
      <ThemedText style={styles.typeLabel}>{item.label}</ThemedText>
    </TouchableOpacity>
  );

  const handleSaveLocation = () => {
    // Only update if the mapRegion is different from the previous location
    if (
      formData.location &&
      formData.location.latitude === mapRegion.latitude &&
      formData.location.longitude === mapRegion.longitude
    ) {
      setEditingLocation(false);
      return;
    }
    setFormData(prev => ({
      ...prev,
      location: { latitude: mapRegion.latitude, longitude: mapRegion.longitude }
    }));
    setEditingLocation(false);
  };

  const handleResetLocation = () => {
    if (pinLocation) {
      setMapRegion({ ...pinLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    }
  };

  // Keep pinLocation in sync with formData.location
  useEffect(() => {
    if (formData.location && formData.location.latitude && formData.location.longitude) {
      setPinLocation({ latitude: formData.location.latitude, longitude: formData.location.longitude });
    }
  }, [formData.location]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <ThemedView style={styles.form}>
          <View style={[
            styles.formGroup,
            { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
          ]}>
            <ThemedText style={[
              styles.label,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}>Media (Up to 5 files)</ThemedText>
            <TouchableOpacity 
              style={[
                styles.imageButton,
                { 
                  backgroundColor: isDark ? '#444444' : '#F9FAFB',
                  borderColor: isDark ? '#444444' : '#E5E7EB'
                },
                formErrors.mediaFiles && styles.errorInput
              ]} 
              onPress={pickMedia}
              disabled={formData.mediaFiles.length >= 5}
            >
              {formData.mediaFiles.length > 0 ? (
                <View style={styles.imageGrid}>
                  {formData.mediaFiles.map((file, index) => (
                    <View key={index} style={styles.imageGridItem}>
                      {file.type === 'image' ? (
                        <Image source={{ uri: file.uri }} style={styles.imagePreview} />
                      ) : (
                        <View style={[styles.imagePreview, styles.videoPreview]}>
                          <Image 
                            source={{ uri: file.uri }} 
                            style={[styles.imagePreview, { position: 'absolute' }]} 
                          />
                          <View style={styles.videoOverlay}>
                            <Ionicons name="videocam" size={24} color="white" />
                          </View>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeMedia(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="red" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {formData.mediaFiles.length < 5 && (
                    <TouchableOpacity
                      style={styles.addMoreButton}
                      onPress={pickMedia}
                    >
                      <Ionicons name="add" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons 
                    name="camera" 
                    size={24} 
                    color={isDark ? '#FFFFFF' : '#000000'} 
                  />
                  <ThemedText>Add Photos or Videos</ThemedText>
                </View>
              )}
            </TouchableOpacity>
            {formErrors.mediaFiles && (
              <ThemedText style={styles.errorText}>{formErrors.mediaFiles}</ThemedText>
            )}
          </View>

          <View style={[
            styles.formGroup,
            { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
          ]}>
            <ThemedText style={[
              styles.label,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}>Title</ThemedText>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? '#444444' : '#F9FAFB',
                  borderColor: isDark ? '#444444' : '#E5E7EB',
                  color: isDark ? '#FFFFFF' : '#000000'
                },
                formErrors.title && styles.errorInput
              ]}
              placeholder="What did you see?"
              placeholderTextColor={isDark ? '#888888' : '#666666'}
              value={formData.title}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, title: text }));
                setFormErrors(prev => ({ ...prev, title: undefined }));
              }}
            />
            {formErrors.title && (
              <ThemedText style={styles.errorText}>{formErrors.title}</ThemedText>
            )}
          </View>

          <View style={[
            styles.formGroup,
            { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
          ]}>
            <ThemedText style={[
              styles.label,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}>Type</ThemedText>
            <TouchableOpacity
              style={[
                styles.typeSelector,
                { 
                  backgroundColor: isDark ? '#444444' : '#F9FAFB',
                  borderColor: isDark ? '#444444' : '#E5E7EB'
                }
              ]}
              onPress={() => setIsTypeModalVisible(true)}
            >
              <View style={styles.typeSelectorContent}>
                {formData.type ? (
                  <>
                    <Ionicons 
                      name={typeOptions.find(opt => opt.value === formData.type)?.icon as any} 
                      size={20} 
                      color={isDark ? '#FFFFFF' : '#000000'} 
                    />
                    <ThemedText style={styles.typeSelectorText}>
                      {typeOptions.find(opt => opt.value === formData.type)?.label}
                    </ThemedText>
                  </>
                ) : (
                  <ThemedText style={styles.typeSelectorText}>Select a type</ThemedText>
                )}
              </View>
              <Ionicons
                name="chevron-down"
                size={20}
                color={isDark ? '#FFFFFF' : '#000000'}
              />
            </TouchableOpacity>
            {formErrors.type && (
              <ThemedText style={styles.errorText}>{formErrors.type}</ThemedText>
            )}
          </View>

          <View style={[
            styles.formGroup,
            { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
          ]}>
            <ThemedText style={[
              styles.label,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}>Description</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { 
                  backgroundColor: isDark ? '#444444' : '#F9FAFB',
                  borderColor: isDark ? '#444444' : '#E5E7EB',
                  color: isDark ? '#FFFFFF' : '#000000'
                },
                formErrors.description && styles.errorInput
              ]}
              placeholder="Describe what you observed..."
              placeholderTextColor={isDark ? '#888888' : '#666666'}
              multiline
              numberOfLines={4}
              value={formData.description}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, description: text }));
                setFormErrors(prev => ({ ...prev, description: undefined }));
              }}
            />
            {formErrors.description && (
              <ThemedText style={styles.errorText}>{formErrors.description}</ThemedText>
            )}
          </View>

          <View style={[
            styles.formGroup,
            { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
          ]}>
            <ThemedText style={[
              styles.label,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}>Event Date</ThemedText>
            <TouchableOpacity
              style={[
                styles.input,
                { backgroundColor: isDark ? '#444444' : '#F9FAFB' }
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <ThemedText style={[
                styles.inputText,
                { color: isDark ? '#FFFFFF' : '#000000' }
              ]}>
                {formData.eventDate.toLocaleString()}
              </ThemedText>
            </TouchableOpacity>
            <DateTimePickerModal
              isVisible={showDatePicker}
              mode="datetime"
              date={formData.eventDate}
              onConfirm={(selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setFormData(prev => ({ ...prev, eventDate: selectedDate }));
                }
              }}
              onCancel={() => setShowDatePicker(false)}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
            />
          </View>

          <View style={[styles.formGroup, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]}> 
            <ThemedText style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>Location</ThemedText>
            {locationError && (
              <ThemedText style={{ color: '#E53E3E', marginBottom: 8 }}>{locationError}</ThemedText>
            )}
            <View style={styles.mapContainer}>
              {mapRegion && pinLocation ? (
                <MapView
                  style={styles.map}
                  region={mapRegion}
                  scrollEnabled={editingLocation}
                  zoomEnabled={editingLocation}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  onRegionChangeComplete={editingLocation ? setMapRegion : undefined}
                >
                  {/* Only show marker when not editing and pinLocation is set */}
                  {!editingLocation && pinLocation && (
                    <Marker coordinate={pinLocation} />
                  )}
                </MapView>
              ) : (
                <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                  <ThemedText>Loading map...</ThemedText>
                </View>
              )}
              {/* Only show overlay pin when editing */}
              {editingLocation && mapRegion && (
                <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -24, marginTop: -48 }}>
                  <Ionicons name="location" size={48} color={isDark ? '#48BB78' : '#2F855A'} />
                </View>
              )}
            </View>
            {!editingLocation && (
              <TouchableOpacity
                style={{ marginTop: 12, alignSelf: 'flex-end', backgroundColor: isDark ? '#2F855A' : '#48BB78', padding: 10, borderRadius: 8 }}
                onPress={() => setEditingLocation(true)}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Change Location</ThemedText>
              </TouchableOpacity>
            )}
            {editingLocation && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <TouchableOpacity
                  style={{ marginRight: 10, backgroundColor: '#E53E3E', padding: 10, borderRadius: 8 }}
                  onPress={handleResetLocation}
                >
                  <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Reset</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ backgroundColor: isDark ? '#2F855A' : '#48BB78', padding: 10, borderRadius: 8 }}
                  onPress={handleSaveLocation}
                >
                  <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Save</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {error && (
            <ThemedText style={styles.error}>{error}</ThemedText>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              { 
                backgroundColor: isDark ? '#2F855A' : '#48BB78',
                opacity: loading ? 0.7 : 1
              }
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <ThemedText style={styles.submitButtonText}>
              {loading ? 'Saving...' : 'Save Sighting'}
            </ThemedText>
          </TouchableOpacity>

          <Modal
            visible={isTypeModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsTypeModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setIsTypeModalVisible(false)}
            >
              <View 
                style={[
                  styles.modalContent,
                  { backgroundColor: isDark ? '#333' : '#fff' }
                ]}
              >
                <ThemedText style={styles.modalTitle}>Select Type</ThemedText>
                <FlatList
                  data={typeOptions}
                  renderItem={renderTypeItem}
                  keyExtractor={(item) => item.value}
                  style={styles.typeList}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
} 