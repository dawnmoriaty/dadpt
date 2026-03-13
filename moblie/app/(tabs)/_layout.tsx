import { Tabs } from 'expo-router';
import { Home, Ticket, User } from 'lucide-react-native';
import React from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb', // blue-600
        tabBarInactiveTintColor: '#64748b', // slate-500
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9', // slate-100
          elevation: 0,
          shadowOpacity: 0,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tìm chuyến',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Vé của tôi',
          tabBarIcon: ({ color }) => <Ticket size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
