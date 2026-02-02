import { useMutation } from '@tanstack/react-query'

import { uploadApi } from '../api'

export function useUploadImage() {
    return useMutation({
        mutationFn: (file: File) => uploadApi.uploadImage(file),
    })
}

export function useUploadImages() {
    return useMutation({
        mutationFn: (files: File[]) => uploadApi.uploadImages(files),
    })
}

export function useDeleteImage() {
    return useMutation({
        mutationFn: (filename: string) => uploadApi.deleteImage(filename),
    })
}
