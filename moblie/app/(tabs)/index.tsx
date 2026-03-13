import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, MapPin, Calendar } from 'lucide-react-native';
// Assuming lucide-react-native map aligns with web's lucide-react, if not we fall back visually

import { tw } from '@/src/lib/utils';
// Note: In real app, we would use an explicit DateTime picker
// like @react-native-community/datetimepicker, 
// for MVP we use basic string input or simplified picker.

export default function HomeScreen() {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('2026-03-15'); // Dummy date

  const handleSearch = () => {
    if (!origin || !destination || !date) return;
    // Push to results page (which we will build)
    router.push({
      pathname: '/search-results',
      params: { origin, destination, date }
    });
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <ScrollView contentContainerStyle={tw`p-4 pb-10`}>
        {/* Header Hero Section */}
        <View style={tw`bg-blue-600 rounded-2xl p-6 mb-6 mt-4 items-center`}>
          <Text style={tw`text-white text-2xl font-bold mb-2`}>
            Đặt vé xe khách
          </Text>
          <Text style={tw`text-blue-100 text-center`}>
            Nhanh chóng, tiện lợi và an toàn
          </Text>
        </View>

        {/* Search Card */}
        <View style={tw`bg-white rounded-2xl p-4 shadow-sm border border-gray-100`}>
          {/* Origin */}
          <View style={tw`flex-row items-center border-b border-gray-100 py-3`}>
            <MapPin size={20} color="#3B82F6" style={tw`mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs text-gray-500 mb-1`}>Điểm đi</Text>
              <TextInput
                style={tw`text-base font-medium text-gray-900`}
                placeholder="Chọn điểm đi"
                value={origin}
                onChangeText={setOrigin}
              />
            </View>
          </View>

          {/* Destination */}
          <View style={tw`flex-row items-center border-b border-gray-100 py-3`}>
            <MapPin size={20} color="#EF4444" style={tw`mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs text-gray-500 mb-1`}>Điểm đến</Text>
              <TextInput
                style={tw`text-base font-medium text-gray-900`}
                placeholder="Chọn điểm đến"
                value={destination}
                onChangeText={setDestination}
              />
            </View>
          </View>

          {/* Date */}
          <View style={tw`flex-row items-center py-3 mb-4`}>
            <Calendar size={20} color="#10B981" style={tw`mr-3`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs text-gray-500 mb-1`}>Ngày đi</Text>
              <TextInput
                style={tw`text-base font-medium text-gray-900`}
                placeholder="YYYY-MM-DD"
                value={date}
                onChangeText={setDate}
              />
            </View>
          </View>

          {/* Search Button */}
          <TouchableOpacity 
            style={tw`bg-blue-600 rounded-xl py-4 flex-row justify-center items-center opacity-${(!origin || !destination) ? '50' : '100'}`}
            onPress={handleSearch}
            disabled={!origin || !destination}
          >
            <Search size={20} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white font-bold text-lg`}>Tìm chuyến xe</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
