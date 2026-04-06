import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useForm } from 'react-hook-form'
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { tw } from '@/src/lib/utils'

import { useRegister } from '../hooks'
import { registerSchema, type RegisterFormData } from '../schemas'

export function RegisterScreen() {
    const router = useRouter()
    const registerMutation = useRegister()

    const {
        setValue,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            fullName: '',
            username: '',
            phone: '',
            email: '',
            password: '',
        },
    })

    const values = watch()

    const onSubmit = (payload: RegisterFormData) => {
        registerMutation.mutate(payload, {
            onSuccess: () => {
                router.replace('/(tabs)')
            },
        })
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            <ScrollView contentContainerStyle={tw`px-5 py-6 pb-10`}>
                <View style={tw`mb-6`}>
                    <Text style={tw`text-3xl font-bold text-gray-900`}>Dang ky</Text>
                    <Text style={tw`mt-2 text-sm text-gray-500`}>Tao tai khoan de dat ve nhanh va theo doi ve cua ban.</Text>
                </View>

                {[
                    { key: 'fullName', label: 'Ho va ten', placeholder: 'Nguyen Van A', secure: false },
                    { key: 'phone', label: 'So dien thoai', placeholder: '0912345678', secure: false },
                    { key: 'username', label: 'Username', placeholder: 'nguyenvana', secure: false },
                    { key: 'email', label: 'Email (tuy chon)', placeholder: 'ten@email.com', secure: false },
                    { key: 'password', label: 'Mat khau', placeholder: 'Toi thieu 6 ky tu', secure: true },
                ].map((field) => (
                    <View style={tw`mb-4`} key={field.key}>
                        <Text style={tw`mb-1 text-xs text-gray-500`}>{field.label}</Text>
                        <TextInput
                            placeholder={field.placeholder}
                            autoCapitalize="none"
                            secureTextEntry={field.secure}
                            value={values[field.key as keyof RegisterFormData] as string}
                            onChangeText={(text) =>
                                setValue(field.key as keyof RegisterFormData, text, { shouldValidate: true })
                            }
                            style={tw`rounded-xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-900`}
                        />
                        {errors[field.key as keyof RegisterFormData] && (
                            <Text style={tw`mt-1 text-xs text-red-600`}>
                                {errors[field.key as keyof RegisterFormData]?.message as string}
                            </Text>
                        )}
                    </View>
                ))}

                {registerMutation.error && (
                    <View style={tw`mb-3 rounded-xl border border-red-200 bg-red-50 p-3`}>
                        <Text style={tw`text-sm font-medium text-red-700`}>Dang ky that bai</Text>
                        <Text style={tw`mt-1 text-xs text-red-600`}>{registerMutation.error.message}</Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={handleSubmit(onSubmit)}
                    disabled={registerMutation.isPending}
                    style={tw`${registerMutation.isPending ? 'bg-blue-400' : 'bg-blue-600'} mt-2 rounded-xl py-4`}
                >
                    <View style={tw`flex-row items-center justify-center`}>
                        {registerMutation.isPending && <ActivityIndicator color="#FFFFFF" size="small" />}
                        <Text style={tw`ml-2 text-center text-base font-bold text-white`}>Dang ky tai khoan</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={tw`mt-5`} onPress={() => router.push('/login')}>
                    <Text style={tw`text-center text-sm text-gray-600`}>
                        Da co tai khoan? <Text style={tw`font-semibold text-blue-600`}>Dang nhap</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    )
}
