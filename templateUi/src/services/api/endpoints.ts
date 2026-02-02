export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        ME: '/auth/me',
    },
    
    // Admin endpoints
    ADMIN: {
        LOCATIONS: {
            LIST: '/admin/locations',
            CREATE: '/admin/locations',
            DETAIL: (id: number) => `/admin/locations/${id}`,
            UPDATE: (id: number) => `/admin/locations/${id}`,
            DELETE: (id: number) => `/admin/locations/${id}`,
        },
        TRIPS: {
            LIST: '/admin/trips',
            CREATE: '/admin/trips',
            UPDATE: (id: number) => `/admin/trips/${id}`,
            DELETE: (id: number) => `/admin/trips/${id}`,
            UPDATE_STATUS: (id: number) => `/admin/trips/${id}/status`,
        },
        PROVIDERS: {
            LIST: '/admin/providers',
            CREATE: '/admin/providers',
            DETAIL: (id: number) => `/admin/providers/${id}`,
            UPDATE: (id: number) => `/admin/providers/${id}`,
            DELETE: (id: number) => `/admin/providers/${id}`,
            TOGGLE_ACTIVE: (id: number) => `/admin/providers/${id}/toggle`,
        },
        UPLOAD: '/admin/upload',
    },

    // Public endpoints
    LOCATIONS: {
        SEARCH: '/locations/search',
    },
    TRIPS: {
        LIST: '/trips',
        DETAIL: (id: number) => `/trips/${id}`,
    },
    PROVIDERS: {
        LIST: '/providers',
    },
} as const
