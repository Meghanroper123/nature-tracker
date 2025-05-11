import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { db, storage } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const AddIncidentScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('wildlife');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant media library permissions to upload files.');
      return;
    }

    Alert.alert(
      'Add Media',
      'Choose media type',
      [
        {
          text: 'Photo',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

            if (!result.canceled && result.assets) {
              setMediaFiles(prev => [...prev, { uri: result.assets[0].uri, type: 'image' }]);
            }
          },
        },
        {
          text: 'Video',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Videos,
              allowsEditing: true,
              quality: 1,
              videoMaxDuration: 30, // 30 seconds limit
            });

            if (!result.canceled && result.assets) {
              setMediaFiles(prev => [...prev, { uri: result.assets[0].uri, type: 'video' }]);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const removeMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant location permissions to add incidents.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setLocation({
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    });
  };

  const uploadMedia = async (uri, type) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = uri.substring(uri.lastIndexOf('/') + 1);
    const storageRef = ref(storage, `incidents/${filename}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    if (!title || !description || !location) {
      Alert.alert('Error', 'Please fill in all required fields and get location.');
      return;
    }

    if (mediaFiles.length === 0) {
      Alert.alert('Error', 'Please add at least one photo or video.');
      return;
    }

    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user');
      const user = JSON.parse(userData);

      const uploadedMedia = await Promise.all(
        mediaFiles.map(async (file) => {
          const url = await uploadMedia(file.uri, file.type);
          return {
            url,
            type: file.type,
          };
        })
      );

      const incidentData = {
        title,
        description,
        type,
        location,
        mediaFiles: uploadedMedia,
        userId: user.id,
        timestamp: new Date(),
      };

      await addDoc(collection(db, 'incidents'), incidentData);
      
      Alert.alert('Success', 'Incident reported successfully!');
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error submitting incident:', error);
      Alert.alert('Error', 'Failed to submit incident. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderMediaItem = ({ item, index }) => (
    <View style={styles.mediaItem}>
      {item.type === 'image' ? (
        <Image source={{ uri: item.uri }} style={styles.mediaPreview} />
      ) : (
        <View style={styles.videoPreview}>
          <Ionicons name="videocam" size={24} color="white" />
        </View>
      )}
      <TouchableOpacity
        style={styles.removeMediaButton}
        onPress={() => removeMedia(index)}
      >
        <Ionicons name="close-circle" size={24} color="red" />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter incident title"
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the incident"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeContainer}>
          {['wildlife', 'pollution', 'conservation'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeButton,
                type === t && styles.typeButtonSelected,
              ]}
              onPress={() => setType(t)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  type === t && styles.typeButtonTextSelected,
                ]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Location *</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={getLocation}
        >
          <Text style={styles.locationButtonText}>
            {location ? 'Location Set' : 'Get Current Location'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Media (Up to 5 files) *</Text>
        <TouchableOpacity
          style={styles.mediaButton}
          onPress={pickMedia}
          disabled={mediaFiles.length >= 5}
        >
          <Text style={styles.mediaButtonText}>
            {mediaFiles.length >= 5 ? 'Maximum files reached' : 'Add Photo/Video'}
          </Text>
        </TouchableOpacity>

        <FlatList
          data={mediaFiles}
          renderItem={renderMediaItem}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          style={styles.mediaList}
          contentContainerStyle={styles.mediaListContent}
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Incident'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeButtonText: {
    color: '#333',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  locationButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  locationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mediaButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  mediaButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mediaList: {
    marginBottom: 16,
  },
  mediaListContent: {
    paddingRight: 16,
  },
  mediaItem: {
    marginRight: 8,
    position: 'relative',
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  videoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AddIncidentScreen; 