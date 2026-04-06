import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useForm } from 'react-hook-form'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { tw } from '@/src/lib/utils'

import { useLogin } from '../hooks'
import { loginSchema, type LoginFormData } from '../schemas'

export function LoginScreen() {
    const router = useRouter()
    const loginMutation = useLogin()

    const {
        setValue,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            identifier: '',
            password: '',
        },
    })

    const identifier = watch('identifier')
    const password = watch('password')

    const onSubmit = (values: LoginFormData) => {
        loginMutation.mutate(values, {
            onSuccess: () => {
                router.replace('/(tabs)')
            },
        })
    }

    return (
        <SafeAreaView style={tw`flex-1 bg-gray-50`}>
            <View style={tw`flex-1 justify-center px-5`}>
                <View style={tw`mb-8`}>
                    <Text style={tw`text-3xl font-bold text-gray-900`}>Dang nhap</Text>
                    <Text style={tw`mt-2 text-sm text-gray-500`}>Truy cap tai khoan de dat ve va quan ly hanh trinh.</Text>
                </View>

                <View style={tw`mb-4`}>
                    <Text style={tw`mb-1 text-xs text-gray-500`}>So dien thoai / email / username</Text>
                    <TextInput
                        placeholder="Nhap thong tin dang nhap"
                        autoCapitalize="none"
                        value={identifier}
                        onChangeText={(text) => setValue('identifier', text, { shouldValidate: true })}
                        style={tw`rounded-xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-900`}
                    />
                    {errors.identifier && <Text style={tw`mt-1 text-xs text-red-600`}>{errors.identifier.message}</Text>}
                </View>

                <View style={tw`mb-2`}>
                    <Text style={tw`mb-1 text-xs text-gray-500`}>Mat khau</Text>
                    <TextInput
                        placeholder="Nhap mat khau"
                        secureTextEntry
                        value={password}
                        onChangeText={(text) => setValue('password', text, { shouldValidate: true })}
                        style={tw`rounded-xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-900`}
                    />
                    {errors.password && <Text style={tw`mt-1 text-xs text-red-600`}>{errors.password.message}</Text>}
                </View>

                {loginMutation.error && (
                    <View style={tw`mb-3 rounded-xl border border-red-200 bg-red-50 p-3`}>
                        <Text style={tw`text-sm font-medium text-red-700`}>Dang nhap that bai</Text>
                        <Text style={tw`mt-1 text-xs text-red-600`}>{loginMutation.error.message}</Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={handleSubmit(onSubmit)}
                    disabled={loginMutation.isPending}
                    style={tw`${loginMutation.isPending ? 'bg-blue-400' : 'bg-blue-600'} mt-3 rounded-xl py-4`}
                >
                    <View style={tw`flex-row items-center justify-center`}>
                        {loginMutation.isPending && <ActivityIndicator color="#FFFFFF" size="small" />}
                        <Text style={tw`ml-2 text-center text-base font-bold text-white`}>Dang nhap</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={tw`mt-5`} onPress={() => router.push('/register')}>
                    <Text style={tw`text-center text-sm text-gray-600`}>
                        Chua co tai khoan? <Text style={tw`font-semibold text-blue-600`}>Dang ky ngay</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}
