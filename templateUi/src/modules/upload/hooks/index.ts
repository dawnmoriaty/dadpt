import { useMutation } from '@tanstack/react-query'

import { uploadApi } from '../api'

interface UploadParams {
    file: File
    folder?: string
}

export function useUploadImage() {
    return useMutation({
        mutationFn: (params: UploadParams) => uploadApi.uploadImage(params),
    })
}

export function useUploadImages() {
    return useMutation({
        mutationFn: ({ files, folder }: { files: File[]; folder?: string }) => 
            uploadApi.uploadImages(files, folder),
    })
}

export function useDeleteImage() {
    return useMutation({
        mutationFn: (url: string) => uploadApi.deleteImage(url),
    })
}
