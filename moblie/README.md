# Mobile App (Expo)

Ứng dụng mobile được build từ luồng UI của `templateUi`, dùng Expo Router + React Query + axios.

## Quick Start

1. Cài dependency:

```bash
pnpm install
```

2. Tạo file môi trường:

```bash
cp .env.example .env
```

3. Cấu hình backend API trong `.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-backend-domain/api/v1
```

Nếu không có env, app sẽ fallback:
- Android emulator: `http://10.0.2.2:8080/api/v1`
- iOS/Web local: `http://localhost:8080/api/v1`

4. Chạy app:

```bash
pnpm start
```

## Build Web (deploy Vercel)

```bash
pnpm dlx expo export --platform web
```

Output static nằm ở `dist/`.

## Vercel

Trong Vercel Project Settings:
- Framework Preset: `Other`
- Root Directory: `moblie`
- Build Command: `pnpm dlx expo export --platform web`
- Output Directory: `dist`

Environment Variables trên Vercel:
- `EXPO_PUBLIC_API_BASE_URL` = backend public URL + `/api/v1`
