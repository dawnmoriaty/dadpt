# Template UI Context

## Purpose
React frontend for the bus ticketing app (search, booking, and user flows).

## Routing / Pages
- `src/routes/_public`: public pages (home, search).
- `src/routes/_auth`: login/register flows.

## Booking Module
- `src/modules/booking/components`: search form, trip cards, booking UI.
- `src/modules/booking/hooks`: API hooks (search, detail).
- `src/modules/booking/schemas`: Zod schemas for forms.

## Auth Module
- `src/modules/auth`: login/register forms and logic.

## API Usage
- Uses REST endpoints from backend (`/api/v1/*`).
- Search uses `useSearchTrips` in `src/modules/booking/hooks` and expects backend response shape.

## Notes
- Form validation uses Zod; keep schemas synced with backend DTOs.
