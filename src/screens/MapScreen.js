import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

const MapScreen = ({ navigation }) => {
  const [incidents, setIncidents] = useState([]);
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    const q = query(collection(db, 'incidents'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incidentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIncidents(incidentsList);
    });

    return () => unsubscribe();
  }, []);

  const getMarkerColor = (type) => {
    switch (type) {
      case 'wildlife':
        return '#FF9800';
      case 'pollution':
        return '#F44336';
      case 'conservation':
        return '#4CAF50';
      default:
        return '#2196F3';
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={{
              latitude: incident.location?.lat || 0,
              longitude: incident.location?.lng || 0,
            }}
            pinColor={getMarkerColor(incident.type)}
          >
            <Callout
              onPress={() => navigation.navigate('IncidentDetails', { incident })}
            >
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{incident.title}</Text>
                <Text style={styles.calloutType}>{incident.type}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  callout: {
    padding: 8,
    maxWidth: 200,
  },
  calloutTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calloutType: {
    color: '#666',
    fontSize: 12,
  },
});

export default MapScreen; 