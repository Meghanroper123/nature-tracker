import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Image, TextInput, Platform, Alert, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';

type EventType = 'OCEAN' | 'WILDLIFE' | 'BOTANICAL' | 'ASTRONOMY';

interface FormData {
  type: EventType | '';
  title: string;
  description: string;
  image: string | null;
  location: {
    latitude: number;
    longitude: number;
  } | null;
}

interface FormErrors {
  type?: string;
  title?: string;
  description?: string;
  image?: string;
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
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  errorInput: {
    borderColor: '#E53E3E',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 14,
    marginTop: 4,
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
  imageButton: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  typeIcon: {
    marginRight: 12,
  },
  typeLabel: {
    fontSize: 16,
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
    image: null,
    location: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        }));
      }
    })();
  }, []);

  const validateForm = () => {
    const errors: FormErrors = {};
    if (!formData.type) errors.type = 'Please select a type';
    if (!formData.title.trim()) errors.title = 'Please enter a title';
    if (!formData.description.trim()) errors.description = 'Please enter a description';
    if (!formData.image) errors.image = 'Please add a photo';
    if (!formData.location) errors.location = 'Please enable location access';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to add photos');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        setFormData(prev => ({
          ...prev,
          image: result.assets[0].uri,
        }));
        setFormErrors(prev => ({ ...prev, image: undefined }));
      }
    } catch (err) {
      setError('Failed to pick image. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;
    
    setLoading(true);
    setError(null);

    try {
      // Create a new sighting document in Firestore
      const sightingRef = await addDoc(collection(db, 'sightings'), {
        userId: user.uid,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        imageUrl: formData.image,
        location: formData.location,
        timestamp: serverTimestamp(),
      });

      console.log('Sighting saved with ID:', sightingRef.id);
      
      // Navigate back to map on success
      router.back();
    } catch (err) {
      console.error('Error saving sighting:', err);
      setError('Failed to save sighting. Please try again.');
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

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <ThemedView style={styles.form}>
          {formData.location && (
            <View style={[
              styles.formGroup,
              { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
            ]}>
              <ThemedText style={[
                styles.label,
                { color: isDark ? '#FFFFFF' : '#000000' }
              ]}>Location</ThemedText>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: formData.location.latitude,
                    longitude: formData.location.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: formData.location.latitude,
                      longitude: formData.location.longitude,
                    }}
                  />
                </MapView>
              </View>
            </View>
          )}

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
            ]}>Photo</ThemedText>
            <TouchableOpacity 
              style={[
                styles.imageButton,
                { 
                  backgroundColor: isDark ? '#444444' : '#F9FAFB',
                  borderColor: isDark ? '#444444' : '#E5E7EB'
                },
                formErrors.image && styles.errorInput
              ]} 
              onPress={pickImage}
            >
              {formData.image ? (
                <Image source={{ uri: formData.image }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons 
                    name="camera" 
                    size={24} 
                    color={isDark ? '#FFFFFF' : '#000000'} 
                  />
                  <ThemedText>Add Photo</ThemedText>
                </View>
              )}
            </TouchableOpacity>
            {formErrors.image && (
              <ThemedText style={styles.errorText}>{formErrors.image}</ThemedText>
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