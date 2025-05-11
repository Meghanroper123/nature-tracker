import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions } from 'react-native';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'incidents'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incidentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIncidents(incidentsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getFirstImageUrl = (mediaFiles, imageUrl) => {
    if (Array.isArray(mediaFiles)) {
      const firstImage = mediaFiles.find(
        m => m && typeof m === 'object' && m.type && m.type.toLowerCase() === 'image' && m.url
      );
      if (firstImage) return firstImage.url;
    }
    return imageUrl || null;
  };

  const renderIncident = ({ item }) => {
    const imageToShow = getFirstImageUrl(item.mediaFiles, item.imageUrl);
    return (
      <TouchableOpacity
        style={styles.incidentCard}
        onPress={() => navigation.navigate('IncidentDetails', { incident: item })}
      >
        {imageToShow && (
          <Image
            source={{ uri: imageToShow }}
            style={styles.mediaPreview}
            resizeMode="cover"
          />
        )}
        <View style={styles.incidentContent}>
          <Text style={styles.incidentTitle}>{item.title}</Text>
          <Text style={styles.incidentType}>{item.type}</Text>
          <Text style={styles.incidentDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.incidentDate}>
            {new Date(item.timestamp?.toDate()).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading incidents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={incidents}
        renderItem={renderIncident}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.incidentsList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidentsList: {
    padding: 16,
  },
  incidentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mediaContainer: {
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: 200,
  },
  videoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mediaCountText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  incidentContent: {
    padding: 16,
  },
  incidentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  incidentType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  incidentDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  incidentDate: {
    fontSize: 12,
    color: '#999',
  },
});

export default HomeScreen; 