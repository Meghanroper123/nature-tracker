import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import * as AuthSession from 'expo-auth-session';
import { app, getAuth, GoogleAuthProvider, db } from '@/services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { signInWithCredential, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';

// Google OAuth Client IDs for each platform
const GOOGLE_CLIENT_IDS = {
  web: '1078091725984-p7gssf5ebpq0i1snia0sv32v2tn1hs55.apps.googleusercontent.com',
  ios: '1078091725984-9ehedgmnb0sd4vfomjgq2ik44gmpl56.apps.googleusercontent.com',
  // android: 'YOUR_ANDROID_CLIENT_ID', // TODO: Add Android client ID later
};

const getGoogleClientId = () => {
  if (Platform.OS === 'web') return GOOGLE_CLIENT_IDS.web;
  if (Platform.OS === 'ios') return GOOGLE_CLIENT_IDS.ios;
  // if (Platform.OS === 'android') return GOOGLE_CLIENT_IDS.android;
  return GOOGLE_CLIENT_IDS.web; // fallback
};

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

  // Email/password state
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google sign-in
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getGoogleClientId(),
      scopes: ['openid', 'profile', 'email'],
      redirectUri: AuthSession.makeRedirectUri(),
      responseType: 'code',
      usePKCE: true,
    },
    discovery
  );

  React.useEffect(() => {
    const exchangeCodeAsync = async (code: string) => {
      try {
        const tokenResult = await AuthSession.exchangeCodeAsync({
          clientId: getGoogleClientId(),
          code,
          redirectUri: AuthSession.makeRedirectUri(),
          extraParams: {},
        }, discovery);
        return tokenResult.accessToken;
      } catch (err) {
        console.log('Google code exchange error:', err);
        setError('Google sign-in failed.');
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
        router.replace('/(tabs)');
      } catch (error) {
        console.log('Google sign-in error:', error);
        setError('Google sign-in failed.');
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

  // Email/password sign in
  const handleSignIn = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const auth = getAuth(app);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date().toISOString(),
      }, { merge: true });
      setUser(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.log('Sign in error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else {
        setError('Sign in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email/password sign up
  const handleSignUp = async () => {
    setError(null);
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const auth = getAuth(app);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const displayName = email.split('@')[0];
      await updateProfile(user, { displayName });
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName,
        email: user.email,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });
      setUser(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.log('Sign up error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Sign up failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Toggle between sign in and sign up
  const toggleMode = () => {
    setError(null);
    setMode(mode === 'signIn' ? 'signUp' : 'signIn');
  };

  // Development bypass
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

        {/* Email/password form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {mode === 'signUp' && (
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#888"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          )}
          {error && <ThemedText style={styles.error}>{error}</ThemedText>}
          <TouchableOpacity
            style={[styles.emailButton, loading && styles.buttonDisabled]}
            onPress={mode === 'signIn' ? handleSignIn : handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.emailButtonText}>
                {mode === 'signIn' ? 'Sign In' : 'Sign Up'}
              </ThemedText>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleMode} style={styles.toggleButton}>
            <ThemedText style={styles.toggleText}>
              {mode === 'signIn'
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Sign In'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Google sign-in */}
        <TouchableOpacity
          style={[
            styles.googleButton,
            { backgroundColor: isDark ? '#333333' : '#FFFFFF' }
          ]}
          onPress={() => promptAsync()}
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
  form: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  emailButton: {
    backgroundColor: '#2B4C34',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  toggleText: {
    color: '#2B4C34',
    fontSize: 15,
  },
  error: {
    color: '#E53E3E',
    marginBottom: 8,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginTop: 8,
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
    color: '#888',
  },
}); 