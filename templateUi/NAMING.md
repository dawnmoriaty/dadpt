# Naming Convention (Template UI)

Muc tieu: dat ten de doc nhanh, tim nhanh, khong bi khoa cung vao role hoac man hinh cu the.

## 1) File naming

- `routes/**`: theo TanStack Router file-based convention.
  - Vi du: `_public/payment.$bookingCode.tsx`, `admin/refund-requests/index.tsx`.
- `modules/**/components/**`: dung `PascalCase.tsx`.
  - Vi du: `RefundRequestsPage.tsx`, `VoiceBookingPanel.tsx`.
- `modules/**/hooks/**`: dung `kebab-case.ts` va prefix `use-`.
  - Vi du: `use-refund-requests-page.ts`, `use-booking-hooks.ts`.
- `modules/**/api/**`, `modules/**/utils/**`, `modules/**/schemas/**`, `modules/**/types/**`: `kebab-case.ts`.

## 2) Symbol naming

- React component: `PascalCase`.
  - Vi du: `RefundRequestsPage`, `MyBookingCard`.
- Hook: `useXxx`.
  - Vi du: `useRefundRequestsPage`, `useVoiceBooking`.
- Helper function/variable: `camelCase`.
  - Vi du: `buildPaymentResumePath`, `refundRequestKeys`.

## 3) Domain-first, role-agnostic

- Uu tien ten theo domain/business thay vi role.
  - Tot: `RefundRequestsPage`, `useRefundRequests`.
  - Han che: `AdminRefundRequestsPage`, `useAdminRefund...`.
- Role nam o route/permission, khong dong cung vao ten module khi khong can thiet.

## 4) Query keys / i18n namespace

- Query key dat theo domain trung tinh:
  - `refundRequestKeys.root`, `refundRequestKeys.list(...)`.
- i18n namespace theo domain trung tinh:
  - `refundRequests.*`, `myBookings.*`, `booking.*`.

## 5) Column/table component files

- Dat theo mau `EntityColumns.tsx`.
  - Vi du: `UsersColumns.tsx`, `TripsColumns.tsx`.

## 6) Tranh dat ten qua sau hoac qua UI-specific

- Han che ten gan chat vao layout/man hinh cu the neu logic co the tai su dung.
- Neu la component ngan han, co the giu ten theo view; neu logic tai su dung, doi thanh domain-focused.
