import { api } from '@/services/api/client'

import type { UploadResponse } from '../types'

const BASE_URL = '/admin/upload'

interface UploadParams {
    file: File
    folder?: string
}

export const uploadApi = {
    uploadImage: async ({ file, folder = 'uploads' }: UploadParams): Promise<UploadResponse> => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)

        const response = await api.post(BASE_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        return response.data.data
    },

    uploadImages: async (files: File[], folder = 'uploads'): Promise<UploadResponse[]> => {
        const promises = files.map(file => uploadApi.uploadImage({ file, folder }))
        return Promise.all(promises)
    },

    deleteImage: async (url: string): Promise<void> => {
        await api.delete(BASE_URL, { params: { url }})
    },
}
