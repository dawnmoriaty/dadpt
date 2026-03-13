import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { tw } from '@/src/lib/utils';
import { usePublicTrip } from '@/src/modules/trip/hooks';
import { useCreateBooking, usePaymentStatus } from '@/src/modules/booking/hooks';

export default function BookingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const tripId = Number(id);

  const { isLoading: isTripLoading } = usePublicTrip(tripId);
  const { mutateAsync: createBooking } = useCreateBooking();

  // Basic mock state for form (using simple state instead of react-hook-form for brevity)
  // In a real app we would use react-hook-form mapped from the web
  const [name] = useState('Khách mẫu');
  const [phone] = useState('0987654321');
  const [seat] = useState('A01');
  const [paymentMethod] = useState('BANK_TRANSFER');
  const [pickup] = useState('Bến Xe Nội Tỉnh');
  const [dropoff] = useState('Bến Xe Cuối');

  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const { data: payStatus } = usePaymentStatus(orderCode || '', !!orderCode);

  useEffect(() => {
    if (payStatus?.status === 'success') {
      Alert.alert('Thành công', 'Thanh toán thành công!');
      router.replace('/(tabs)/bookings');
    }
  }, [payStatus, router]);

  // Temporary fix to avoid unused variable warning (demo button)
  const onMockBookingPress = async () => {
    try {
      const res = await createBooking({
        tripId,
        seatCodes: [seat],
        guestInfo: { name, phone },
        pickupInfo: { name: pickup, surcharge: 0 },
        dropoffInfo: { name: dropoff, surcharge: 0 },
        paymentMethod,
      });

      if (paymentMethod === 'BANK_TRANSFER' && res.qrCode) {
        setOrderCode(res.orderCode);
        setQrCode(res.qrCode);
      } else {
        Alert.alert('Thành công', 'Đặt vé thành công!');
        router.replace('/(tabs)/bookings');
      }
    } catch {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi đặt vé');
    }
  };

  if (isTripLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // If QR code is received, show payment screen
  if (qrCode) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white items-center justify-center p-4`}>
        <Text style={tw`text-xl font-bold mb-6 text-center text-gray-900`}>
          Quét mã QR để thanh toán
        </Text>
        <View style={tw`p-4 bg-white border border-gray-100 shadow-sm rounded-2xl mb-6`}>
           <Text style={tw`text-center text-gray-500 mb-4`}>[Base64 QR Image Here]</Text>
        </View>
        <Text style={tw`text-gray-600 text-center mb-6`}>
          Mã đơn hàng: <Text style={tw`font-bold`}>{orderCode}</Text>
        </Text>
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text style={tw`text-gray-500 mt-2`}>Đang chờ thanh toán...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 flex-row items-center justify-between border-b border-gray-100`}>
         <Text style={tw`text-lg font-bold`}>Xác nhận đặt vé</Text>
      </View>
      <ScrollView contentContainerStyle={tw`p-4 pb-20`}>
         <Text style={tw`text-gray-600 mb-4`}>Form goes here. For brevity replacing React Hook Form logic</Text>
         <Text style={tw`text-blue-600 font-bold mb-8`} onPress={onMockBookingPress}>[Bấm vào đây để GIẢ LẬP ĐẶT VÉ VÀ HIỂN THỊ QR]</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
