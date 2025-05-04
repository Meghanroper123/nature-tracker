import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import * as AuthSession from 'expo-auth-session';
import { app, getAuth, GoogleAuthProvider, db } from '@/services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { signInWithCredential } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';

const GOOGLE_CLIENT_ID = '1078091725984-p7gssf5ebpq0i1snia0sv32v2tn1hs55.apps.googleusercontent.com';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export default function SignInScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { setUser } = useAuth();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
      responseType: 'code',
      usePKCE: true,
    },
    discovery
  );

  React.useEffect(() => {
    const exchangeCodeAsync = async (code: string) => {
      try {
        const tokenResult = await AuthSession.exchangeCodeAsync({
          clientId: GOOGLE_CLIENT_ID,
          code,
          redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
          extraParams: {},
        }, discovery);
        return tokenResult.accessToken;
      } catch (err) {
        console.error('Error exchanging code for token:', err);
        return null;
      }
    };

    const signInWithGoogleToFirebase = async (accessToken: string) => {
      try {
        const auth = getAuth(app);
        const credential = GoogleAuthProvider.credential(null, accessToken);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;
        // Create or update user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          lastLogin: new Date().toISOString(),
        }, { merge: true });
        setUser(user); // Set user in context
        // Redirect to main app
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Firebase sign-in error:', error);
      }
    };

    if (response?.type === 'success' && response.params.code) {
      (async () => {
        const accessToken = await exchangeCodeAsync(response.params.code);
        if (accessToken) {
          signInWithGoogleToFirebase(accessToken);
        }
      })();
    }
  }, [response]);

  console.log('Redirect URI:', AuthSession.makeRedirectUri());
  console.log('Google Client ID:', GOOGLE_CLIENT_ID);
  console.log('Actual redirect URI:', AuthSession.makeRedirectUri());

  // Add development bypass function
  const handleDevBypass = () => {
    const mockUser = {
      uid: 'dev-user-123',
      displayName: 'Development User',
      email: 'dev@example.com',
      photoURL: null,
    };
    setUser(mockUser);
    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { marginBottom: 24 }]}>
        <ThemedText style={styles.title}>Nature Tracker</ThemedText>
        <ThemedText style={styles.subtitle}>
          Track and report nature sightings in your area
        </ThemedText>

        <TouchableOpacity
          style={[
            styles.googleButton,
            { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
          ]}
          onPress={() => promptAsync({ useProxy: true })}
          disabled={!request}
        >
          <ThemedText style={styles.googleButtonText}>
            Sign in with Google
          </ThemedText>
        </TouchableOpacity>

        {/* Development bypass button */}
        <TouchableOpacity
          style={[
            styles.devButton,
            { backgroundColor: isDark ? '#444444' : '#EEEEEE' }
          ]}
          onPress={handleDevBypass}
        >
          <ThemedText style={styles.devButtonText}>
            Development Bypass
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  devButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
}); 