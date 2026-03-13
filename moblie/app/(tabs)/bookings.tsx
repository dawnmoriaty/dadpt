import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ticket } from 'lucide-react-native';

import { tw } from '@/src/lib/utils';
import { useMyBookings } from '@/src/modules/booking/hooks';
import type { Booking } from '@/src/modules/booking/api';

export default function BookingsScreen() {
  const { data, isLoading } = useMyBookings();

  const getStatusColor = (status: Booking['status']) => {
    switch(status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: Booking['status']) => {
    switch(status) {
      case 'success': return 'Thành công';
      case 'pending': return 'Chờ thanh toán';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const statusStyle = getStatusColor(item.status);
    return (
      <View style={tw`bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100`}>
        <View style={tw`flex-row justify-between items-center mb-3`}>
          <Text style={tw`text-sm font-mono text-gray-500`}>Mã: <Text style={tw`font-bold text-gray-900`}>{item.code}</Text></Text>
          <View style={tw`px-2 py-1 rounded-md border ${statusStyle.split(' ')[2]} ${statusStyle.split(' ')[1]}`}>
            <Text style={tw`text-xs font-semibold ${statusStyle.split(' ')[0]}`}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={tw`flex-row justify-between items-center bg-gray-50 p-3 rounded-lg`}>
          <Text style={tw`text-gray-600`}>Tổng tiền:</Text>
          <Text style={tw`text-lg font-bold text-blue-600`}>{formatCurrency(item.totalAmount)}</Text>
        </View>
        
        {item.status === 'pending' && (
          <Text style={tw`text-xs text-center text-yellow-600 mt-3`}>
            Vui lòng hoàn tất thanh toán để xác nhận vé.
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`bg-white px-4 py-4 border-b border-gray-100 shadow-sm z-10`}>
        <Text style={tw`text-xl font-bold text-gray-900`}>Vé của tôi</Text>
      </View>

      <View style={tw`flex-1 px-4 pt-4`}>
        {isLoading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : !data || data.items.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <Ticket size={48} color="#9CA3AF" style={tw`mb-4`} />
            <Text style={tw`text-gray-500 text-center text-lg`}>Bạn chưa có vé nào.</Text>
          </View>
        ) : (
          <FlatList
            data={data.items}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderBookingCard}
            contentContainerStyle={tw`pb-20`}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
