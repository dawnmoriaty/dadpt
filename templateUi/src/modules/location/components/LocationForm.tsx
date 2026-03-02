import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MapPin, Search, Upload, X } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useProvinces, useDistricts, useWards } from '@/hooks/useVietnamProvinces'
import { useUploadImage } from '@/modules/upload'

import { createLocationSchema, type CreateLocationFormData } from '../schemas'
import type { Location } from '../types'

interface LocationFormProps {
    location?: Location | null
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: { name: string; city: string; address: string; keywords: string; imageUrl?: string }) => void
    isLoading?: boolean
}

export function LocationForm({ location, isOpen, onClose, onSubmit, isLoading }: LocationFormProps) {
    const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null)
    const [selectedDistrictCode, setSelectedDistrictCode] = useState<number | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const [provinceSearch, setProvinceSearch] = useState('')
    const [districtSearch, setDistrictSearch] = useState('')
    const [wardSearch, setWardSearch] = useState('')

    const uploadMutation = useUploadImage()

    const { data: provinces = [], isLoading: loadingProvinces } = useProvinces()
    const { data: districts = [], isLoading: loadingDistricts } = useDistricts(selectedProvinceCode)
    const { data: wards = [], isLoading: loadingWards } = useWards(selectedDistrictCode)

    const filteredProvinces = useMemo(() => {
        if (!provinceSearch) return provinces
        const q = provinceSearch.toLowerCase()
        return provinces.filter((p) => p.name.toLowerCase().includes(q))
    }, [provinces, provinceSearch])

    const filteredDistricts = useMemo(() => {
        if (!districtSearch) return districts
        const q = districtSearch.toLowerCase()
        return districts.filter((d) => d.name.toLowerCase().includes(q))
    }, [districts, districtSearch])

    const filteredWards = useMemo(() => {
        if (!wardSearch) return wards
        const q = wardSearch.toLowerCase()
        return wards.filter((w) => w.name.toLowerCase().includes(q))
    }, [wards, wardSearch])

    const form = useForm<CreateLocationFormData>({
        resolver: zodResolver(createLocationSchema),
        defaultValues: {
            name: '',
            provinceCode: undefined,
            provinceName: '',
            districtCode: undefined,
            districtName: '',
            wardCode: undefined,
            wardName: '',
            streetAddress: '',
            keywords: '',
            imageUrl: '',
        },
    })

    const imageUrl = useWatch({ control: form.control, name: 'imageUrl' })

    // When editing, parse existing location data back into province/district/ward
    useEffect(() => {
        if (isOpen && location) {
            form.reset({
                name: location.name ?? '',
                provinceCode: undefined,
                provinceName: location.city ?? '',
                districtCode: undefined,
                districtName: '',
                wardCode: undefined,
                wardName: '',
                streetAddress: location.address ?? '',
                keywords: location.keywords ?? '',
                imageUrl: location.imageUrl ?? '',
            })
            // Try to match province by name for edit mode
            if (provinces.length > 0 && location.city) {
                const matched = provinces.find((p) => p.name === location.city)
                if (matched) {
                    setSelectedProvinceCode(matched.code)
                    form.setValue('provinceCode', matched.code)
                    form.setValue('provinceName', matched.name)
                }
            }
        } else if (isOpen) {
            form.reset({
                name: '',
                provinceCode: undefined,
                provinceName: '',
                districtCode: undefined,
                districtName: '',
                wardCode: undefined,
                wardName: '',
                streetAddress: '',
                keywords: '',
                imageUrl: '',
            })
            setSelectedProvinceCode(null)
            setSelectedDistrictCode(null)
        }
        setProvinceSearch('')
        setDistrictSearch('')
        setWardSearch('')
        setPreviewUrl(null)
    }, [isOpen, location, form, provinces])

    const composeAddress = (
        wardName?: string,
        districtName?: string,
        streetAddress?: string,
    ): string => {
        const parts: string[] = []
        if (streetAddress) parts.push(streetAddress)
        if (wardName) parts.push(wardName)
        if (districtName) parts.push(districtName)
        return parts.join(', ')
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0]
        if (!file) return

        // Instant local preview via FileReader
        const reader = new FileReader()
        reader.onload = (ev) => setPreviewUrl(ev.target?.result as string)
        reader.readAsDataURL(file)

        uploadMutation.mutate(
            { file, folder: 'locations' },
            { onSuccess: (data) => form.setValue('imageUrl', data.url) },
        )
    }

    const handleFormSubmit = (values: CreateLocationFormData): void => {
        const address = composeAddress(
            values.wardName,
            values.districtName,
            values.streetAddress,
        )

        onSubmit({
            name: values.name,
            city: values.provinceName,
            address,
            keywords: values.keywords ?? '',
            imageUrl: imageUrl || undefined,
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-500" />
                        {location ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm mới'}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                        {/* Location Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tên địa điểm <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="VD: Bến xe Miền Đông Mới" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Province / City */}
                        <FormField
                            control={form.control}
                            name="provinceCode"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Tỉnh / Thành phố <span className="text-destructive">*</span></FormLabel>
                                    <Select
                                        value={selectedProvinceCode?.toString() ?? ''}
                                        onValueChange={(val) => {
                                            const code = Number(val)
                                            const prov = provinces.find((p) => p.code === code)
                                            if (prov) {
                                                setSelectedProvinceCode(code)
                                                setSelectedDistrictCode(null)
                                                form.setValue('provinceCode', code)
                                                form.setValue('provinceName', prov.name)
                                                form.setValue('districtCode', undefined as unknown as number)
                                                form.setValue('districtName', '')
                                                form.setValue('wardCode', undefined)
                                                form.setValue('wardName', '')
                                            }
                                        }}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={loadingProvinces ? 'Đang tải...' : 'Chọn Tỉnh/Thành phố'} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <div className="p-2">
                                                <div className="flex items-center gap-2 px-2 pb-2 border-b">
                                                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <input
                                                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                                        placeholder="Tìm tỉnh/thành phố..."
                                                        value={provinceSearch}
                                                        onChange={(e) => setProvinceSearch(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <ScrollArea className="h-[200px]">
                                                {filteredProvinces.map((p) => (
                                                    <SelectItem key={p.code} value={p.code.toString()}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                                {filteredProvinces.length === 0 && (
                                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                                        Không tìm thấy
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* District */}
                        <FormField
                            control={form.control}
                            name="districtCode"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Quận / Huyện <span className="text-destructive">*</span></FormLabel>
                                    <Select
                                        value={selectedDistrictCode?.toString() ?? ''}
                                        onValueChange={(val) => {
                                            const code = Number(val)
                                            const dist = districts.find((d) => d.code === code)
                                            if (dist) {
                                                setSelectedDistrictCode(code)
                                                form.setValue('districtCode', code)
                                                form.setValue('districtName', dist.name)
                                                form.setValue('wardCode', undefined)
                                                form.setValue('wardName', '')
                                            }
                                        }}
                                        disabled={!selectedProvinceCode}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue
                                                    placeholder={
                                                        !selectedProvinceCode
                                                            ? 'Chọn Tỉnh/TP trước'
                                                            : loadingDistricts
                                                              ? 'Đang tải...'
                                                              : 'Chọn Quận/Huyện'
                                                    }
                                                />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <div className="p-2">
                                                <div className="flex items-center gap-2 px-2 pb-2 border-b">
                                                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <input
                                                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                                        placeholder="Tìm quận/huyện..."
                                                        value={districtSearch}
                                                        onChange={(e) => setDistrictSearch(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <ScrollArea className="h-[200px]">
                                                {filteredDistricts.map((d) => (
                                                    <SelectItem key={d.code} value={d.code.toString()}>
                                                        {d.name}
                                                    </SelectItem>
                                                ))}
                                                {filteredDistricts.length === 0 && (
                                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                                        {loadingDistricts ? 'Đang tải...' : 'Không tìm thấy'}
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Ward */}
                        <FormField
                            control={form.control}
                            name="wardCode"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Phường / Xã</FormLabel>
                                    <Select
                                        value={form.watch('wardCode')?.toString() ?? ''}
                                        onValueChange={(val) => {
                                            const code = Number(val)
                                            const ward = wards.find((w) => w.code === code)
                                            if (ward) {
                                                form.setValue('wardCode', code)
                                                form.setValue('wardName', ward.name)
                                            }
                                        }}
                                        disabled={!selectedDistrictCode}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue
                                                    placeholder={
                                                        !selectedDistrictCode
                                                            ? 'Chọn Quận/Huyện trước'
                                                            : loadingWards
                                                              ? 'Đang tải...'
                                                              : 'Chọn Phường/Xã (tùy chọn)'
                                                    }
                                                />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <div className="p-2">
                                                <div className="flex items-center gap-2 px-2 pb-2 border-b">
                                                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <input
                                                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                                        placeholder="Tìm phường/xã..."
                                                        value={wardSearch}
                                                        onChange={(e) => setWardSearch(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <ScrollArea className="h-[200px]">
                                                {filteredWards.map((w) => (
                                                    <SelectItem key={w.code} value={w.code.toString()}>
                                                        {w.name}
                                                    </SelectItem>
                                                ))}
                                                {filteredWards.length === 0 && (
                                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                                        {loadingWards ? 'Đang tải...' : 'Không tìm thấy'}
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Street Address (optional detail) */}
                        <FormField
                            control={form.control}
                            name="streetAddress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Số nhà / Đường (tùy chọn)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="VD: 292 Đinh Bộ Lĩnh" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Address Preview */}
                        {(form.watch('provinceName') || form.watch('districtName') || form.watch('wardName')) && (
                            <div className="rounded-lg border bg-muted/30 p-3">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Địa chỉ đầy đủ:</p>
                                <p className="text-sm">
                                    {[
                                        form.watch('streetAddress'),
                                        form.watch('wardName'),
                                        form.watch('districtName'),
                                        form.watch('provinceName'),
                                    ]
                                        .filter(Boolean)
                                        .join(', ')}
                                </p>
                            </div>
                        )}

                        {/* Keywords */}
                        <FormField
                            control={form.control}
                            name="keywords"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Từ khóa tìm kiếm</FormLabel>
                                    <FormControl>
                                        <Input placeholder="VD: sài gòn, sgn, miền đông" {...field} />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">
                                        Phân cách bằng dấu phẩy, giúp khách hàng tìm kiếm dễ hơn
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Image Upload */}
                        <div>
                            <p className="text-sm font-medium mb-2">Hình ảnh địa điểm</p>
                            {(previewUrl || imageUrl) ? (
                                <div className="relative inline-block">
                                    <img
                                        src={previewUrl || imageUrl}
                                        alt="Location preview"
                                        className="w-32 h-32 object-cover rounded"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6"
                                        onClick={() => {
                                            form.setValue('imageUrl', '')
                                            setPreviewUrl(null)
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground mt-2">Upload</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={uploadMutation.isPending}
                                    />
                                </label>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading || uploadMutation.isPending}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {location ? 'Cập nhật' : 'Tạo'} địa điểm
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
