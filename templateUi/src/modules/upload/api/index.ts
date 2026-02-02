import { api } from '@/services/api/client'

import type { UploadResponse } from '../types'

const BASE_URL = '/admin/upload'

export const uploadApi = {
    uploadImage: async (file: File): Promise<UploadResponse> => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await api.post(BASE_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        return response.data.data
    },

    uploadImages: async (files: File[]): Promise<UploadResponse[]> => {
        const formData = new FormData()
        files.forEach((file) => {
            formData.append('files', file)
        })

        const response = await api.post(`${BASE_URL}/multiple`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        return response.data.data
    },

    deleteImage: async (filename: string): Promise<void> => {
        await api.delete(`${BASE_URL}/${filename}`)
    },
}
