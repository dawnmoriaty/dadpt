import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useForm } from 'react-hook-form'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { userTheme } from '@/src/constants/user-theme'
import { tw } from '@/src/lib/utils'

import { useRegister } from '../hooks'
import { registerSchema, type RegisterFormData } from '../schemas'

import { AuthShell } from './auth-shell'

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
                router.replace('/')
            },
        })
    }

    return (
        <AuthShell title="Đăng ký" subtitle="Tạo tài khoản để đặt vé nhanh và theo dõi vé của bạn.">
            <View style={tw`mb-5 flex-row rounded-xl bg-gray-100 p-1`}>
                <TouchableOpacity style={tw`flex-1 rounded-lg py-2`} onPress={() => router.replace('/login')}>
                    <Text style={tw`text-center text-sm font-semibold text-gray-500`}>Đăng nhập</Text>
                </TouchableOpacity>
                <View style={tw`flex-1 rounded-lg bg-white py-2`}>
                    <Text style={tw`text-center text-sm font-semibold text-gray-900`}>Đăng ký</Text>
                </View>
            </View>

            {[
                { key: 'fullName', label: 'Họ và tên', placeholder: 'Nguyễn Văn A', secure: false },
                { key: 'phone', label: 'Số điện thoại', placeholder: '0912345678', secure: false },
                { key: 'username', label: 'Username', placeholder: 'nguyenvana', secure: false },
                { key: 'email', label: 'Email (tùy chọn)', placeholder: 'ten@email.com', secure: false },
                { key: 'password', label: 'Mật khẩu', placeholder: 'Tối thiểu 6 ký tự', secure: true },
            ].map((field) => (
                <View style={tw`mb-4`} key={field.key}>
                    <Text style={[tw`mb-1 text-xs`, { color: userTheme.colors.mutedText }]}>{field.label}</Text>
                    <TextInput
                        placeholder={field.placeholder}
                        autoCapitalize="none"
                        secureTextEntry={field.secure}
                        value={values[field.key as keyof RegisterFormData] as string}
                        onChangeText={(text) =>
                            setValue(field.key as keyof RegisterFormData, text, { shouldValidate: true })
                        }
                        style={[tw`rounded-xl bg-white px-3 py-3 text-base`, { borderColor: userTheme.colors.border, borderWidth: 1, color: userTheme.colors.text }]}
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
                    <Text style={tw`text-sm font-medium text-red-700`}>Đăng ký thất bại</Text>
                    <Text style={tw`mt-1 text-xs text-red-600`}>{registerMutation.error.message}</Text>
                </View>
            )}

            <TouchableOpacity
                onPress={handleSubmit(onSubmit)}
                disabled={registerMutation.isPending}
                style={[
                    tw`mt-2 rounded-xl border-2 py-3`,
                    {
                        backgroundColor: registerMutation.isPending ? '#F8EE75' : '#FFF541',
                        borderColor: '#FFE81C',
                    },
                ]}
            >
                <View style={tw`flex-row items-center justify-center`}>
                    {registerMutation.isPending && <ActivityIndicator color="#1F2937" size="small" />}
                    <Text style={[tw`ml-2 text-center text-base font-bold`, { color: '#1F2937' }]}>Đăng ký tài khoản</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={tw`mt-5`} onPress={() => router.push('/login')}>
                <Text style={[tw`text-center text-sm`, { color: userTheme.colors.mutedText }]}> 
                    Đã có tài khoản? <Text style={[tw`font-semibold`, { color: userTheme.colors.primaryStrong }]}>Đăng nhập</Text>
                </Text>
            </TouchableOpacity>
        </AuthShell>
    )
}
