import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ArrowRight, Clock, Users, Calendar } from 'lucide-react-native';

import { tw } from '@/src/lib/utils';
import { useSearchTrips } from '@/src/modules/trip/hooks';
import type { Trip } from '@/src/modules/trip/types';

export default function SearchResultsScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const origin = (searchParams.origin as string) || '';
  const destination = (searchParams.destination as string) || '';
  const date = (searchParams.date as string) || '';

  const { data, isLoading, error } = useSearchTrips({
    origin,
    destination,
    departureDate: date,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleBookTrip = (tripId: number) => {
    router.push({
      pathname: '/booking/[id]',
      params: { id: tripId.toString() }
    });
  };

  const renderTripCard = ({ item: trip }: { item: Trip }) => (
    <View style={tw`bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100`}>
      <View style={tw`flex-row justify-between items-start mb-4`}>
        <View>
          <Text style={tw`text-lg font-bold text-gray-900`}>{trip.providerName}</Text>
          <View style={tw`flex-row items-center mt-1`}>
            <Clock size={14} color="#6B7280" style={tw`mr-1`} />
            <Text style={tw`text-sm text-gray-500`}>
              {new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -
              {new Date(trip.arrivalTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
        <Text style={tw`text-xl font-bold text-blue-600`}>
          {formatCurrency(trip.finalPrice)}
        </Text>
      </View>

      <View style={tw`flex-row items-center justify-between`}>
        <View style={tw`flex-row items-center`}>
          <Users size={16} color="#10B981" style={tw`mr-1`} />
          <Text style={tw`text-sm text-emerald-600 font-medium`}>
            Còn {trip.availableSeats} chỗ
          </Text>
        </View>
        
        <TouchableOpacity 
          style={tw`bg-blue-50 px-4 py-2 rounded-lg`}
          onPress={() => handleBookTrip(trip.id)}
        >
          <Text style={tw`text-blue-600 font-bold`}>Chọn chuyến</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 flex-row items-center border-b border-gray-100 shadow-sm z-10`}>
        <TouchableOpacity onPress={() => router.back()} style={tw`mr-4 p-1`}>
          <ChevronLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={tw`flex-1 flex-row items-center`}>
          <Text style={tw`text-base font-bold text-gray-900`} numberOfLines={1}>
            {origin}
          </Text>
          <ArrowRight size={16} color="#4B5563" style={tw`mx-2`} />
          <Text style={tw`text-base font-bold text-gray-900`} numberOfLines={1}>
            {destination}
          </Text>
        </View>
      </View>

      <View style={tw`px-4 py-2 bg-blue-50 flex-row items-center`}>
        <Calendar size={16} color="#3B82F6" style={tw`mr-2`} />
        <Text style={tw`text-blue-700 font-medium`}>{date}</Text>
      </View>

      {/* Content */}
      <View style={tw`flex-1 px-4 pt-4`}>
        {isLoading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={tw`mt-4 text-gray-500`}>Đang tìm chuyến xe...</Text>
          </View>
        ) : error ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={tw`text-red-500 text-center`}>Có lỗi xảy ra khi tải dữ liệu.</Text>
            <TouchableOpacity style={tw`mt-4 bg-gray-200 px-4 py-2 rounded`} onPress={() => router.back()}>
              <Text>Quay lại</Text>
            </TouchableOpacity>
          </View>
        ) : !data || data.items.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={tw`text-gray-500 text-center text-lg`}>Không tìm thấy chuyến xe nào phù hợp.</Text>
            <TouchableOpacity style={tw`mt-4 bg-blue-600 px-6 py-3 rounded-xl`} onPress={() => router.back()}>
              <Text style={tw`text-white font-bold`}>Tìm ngày khác</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={data.items}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTripCard}
            contentContainerStyle={tw`pb-10`}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
