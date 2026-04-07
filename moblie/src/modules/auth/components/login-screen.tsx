import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useForm } from 'react-hook-form'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { userTheme } from '@/src/constants/user-theme'
import { tw } from '@/src/lib/utils'

import { useLogin } from '../hooks'
import { loginSchema, type LoginFormData } from '../schemas'

import { AuthShell } from './auth-shell'

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
                router.replace('/')
            },
        })
    }

    return (
        <AuthShell title="Đăng nhập" subtitle="Truy cập tài khoản để đặt vé và quản lý hành trình.">
            <View style={tw`mb-5 flex-row rounded-xl bg-gray-100 p-1`}>
                <View style={tw`flex-1 rounded-lg bg-white py-2`}>
                    <Text style={tw`text-center text-sm font-semibold text-gray-900`}>Đăng nhập</Text>
                </View>
                <TouchableOpacity style={tw`flex-1 rounded-lg py-2`} onPress={() => router.replace('/register')}>
                    <Text style={tw`text-center text-sm font-semibold text-gray-500`}>Đăng ký</Text>
                </TouchableOpacity>
            </View>

            <View style={tw`mb-4`}>
                <Text style={[tw`mb-1 text-xs`, { color: userTheme.colors.mutedText }]}>Số điện thoại / email / username</Text>
                <TextInput
                    placeholder="Nhập thông tin đăng nhập"
                    autoCapitalize="none"
                    value={identifier}
                    onChangeText={(text) => setValue('identifier', text, { shouldValidate: true })}
                    style={[tw`rounded-xl bg-white px-3 py-3 text-base`, { borderColor: userTheme.colors.border, borderWidth: 1, color: userTheme.colors.text }]}
                />
                {errors.identifier && <Text style={tw`mt-1 text-xs text-red-600`}>{errors.identifier.message}</Text>}
            </View>

            <View style={tw`mb-2`}>
                <Text style={[tw`mb-1 text-xs`, { color: userTheme.colors.mutedText }]}>Mật khẩu</Text>
                <TextInput
                    placeholder="Nhập mật khẩu"
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => setValue('password', text, { shouldValidate: true })}
                    style={[tw`rounded-xl bg-white px-3 py-3 text-base`, { borderColor: userTheme.colors.border, borderWidth: 1, color: userTheme.colors.text }]}
                />
                {errors.password && <Text style={tw`mt-1 text-xs text-red-600`}>{errors.password.message}</Text>}
            </View>

            {loginMutation.error && (
                <View style={tw`mb-3 rounded-xl border border-red-200 bg-red-50 p-3`}>
                    <Text style={tw`text-sm font-medium text-red-700`}>Đăng nhập thất bại</Text>
                    <Text style={tw`mt-1 text-xs text-red-600`}>{loginMutation.error.message}</Text>
                </View>
            )}

            <TouchableOpacity
                onPress={handleSubmit(onSubmit)}
                disabled={loginMutation.isPending}
                style={[
                    tw`mt-3 rounded-xl border-2 py-3`,
                    {
                        backgroundColor: loginMutation.isPending ? '#F8EE75' : '#FFF541',
                        borderColor: '#FFE81C',
                    },
                ]}
            >
                <View style={tw`flex-row items-center justify-center`}>
                    {loginMutation.isPending && <ActivityIndicator color="#1F2937" size="small" />}
                    <Text style={[tw`ml-2 text-center text-base font-bold`, { color: '#1F2937' }]}>Đăng nhập</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={tw`mt-4`} onPress={() => router.push('/register')}>
                <Text style={[tw`text-center text-sm`, { color: userTheme.colors.mutedText }]}>
                    Chưa có tài khoản? <Text style={[tw`font-semibold`, { color: userTheme.colors.primaryStrong }]}>Đăng ký ngay</Text>
                </Text>
            </TouchableOpacity>
        </AuthShell>
    )
}
