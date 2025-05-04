import React from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.profileIcon, { backgroundColor: isDark ? '#2B4C34' : '#E6F5ED' }]}>
            <Ionicons name="person" size={64} color={isDark ? '#80CFA9' : '#2F855A'} />
          </View>
          <ThemedText style={styles.name}>Meghan Roper</ThemedText>
          <ThemedText style={styles.email}>meghan.roper@example.com</ThemedText>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]}
            onPress={() => router.push('/sightings')}
          >
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2B4C34' : '#E6F5ED' }]}>
              <Ionicons name="location" size={24} color={isDark ? '#80CFA9' : '#2F855A'} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>My Sightings</ThemedText>
              <ThemedText style={styles.actionSubtitle}>View your wildlife sightings</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]}
            onPress={() => router.push('/events')}
          >
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2B4C34' : '#E6F5ED' }]}>
              <Ionicons name="calendar" size={24} color={isDark ? '#80CFA9' : '#2F855A'} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Saved Events</ThemedText>
              <ThemedText style={styles.actionSubtitle}>View your saved events</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]}
            onPress={() => router.push('/notifications')}
          >
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2B4C34' : '#E6F5ED' }]}>
              <Ionicons name="notifications" size={24} color={isDark ? '#80CFA9' : '#2F855A'} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Notifications</ThemedText>
              <ThemedText style={styles.actionSubtitle}>Manage your notifications</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isDark ? '#333333' : '#FFFFFF' }]}
            onPress={() => router.push('/settings')}
          >
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2B4C34' : '#E6F5ED' }]}>
              <Ionicons name="settings" size={24} color={isDark ? '#80CFA9' : '#2F855A'} />
            </View>
            <View style={styles.actionContent}>
              <ThemedText style={styles.actionTitle}>Settings</ThemedText>
              <ThemedText style={styles.actionSubtitle}>App preferences and settings</ThemedText>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  profileIcon: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    opacity: 0.7,
  },
  actionsContainer: {
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
}); 