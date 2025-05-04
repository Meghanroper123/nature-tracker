import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth } from '../src/services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from '../src/navigation/AppNavigator';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthState();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await AsyncStorage.setItem('user', JSON.stringify({
          id: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL
        }));
        setIsAuthenticated(true);
      } else {
        await AsyncStorage.removeItem('user');
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator initialRouteName={isAuthenticated ? 'MainApp' : 'Login'} />
    </SafeAreaProvider>
  );
} 