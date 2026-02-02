// Provider module types

export interface Provider {
    id: number
    name: string
    hotline: string
    slug: string
    policyRefund: string
    isActive: boolean
    logoUrl?: string
}

export interface CreateProviderRequest {
    name: string
    hotline?: string
    slug?: string
    policyRefund?: string
}

export interface UpdateProviderRequest {
    name?: string
    hotline?: string
    slug?: string
    policyRefund?: string
}
