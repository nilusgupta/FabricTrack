# Fabric Enquiry Tracking System - PRD

## Original Problem Statement
Build a fabric enquiry tracking system with overview of status of enquiry at various stages assigned to users.

## Architecture
- Frontend: React + TailwindCSS + Shadcn UI (PWA - installable)
- Backend: FastAPI + Motor (Async MongoDB) + PyJWT + WebAuthn
- Storage: Emergent Object Storage for images and voice notes
- Excel: openpyxl + Pillow for embedded images

## What's Been Implemented
- **PWA**: manifest.json, service worker, installable on Android/iOS home screens
- **Biometric Login (WebAuthn)**: Fingerprint/Face ID registration and authentication
- **Mobile-responsive layout**: Sidebar drawer, card view for enquiries, stacked forms, sticky save button
- Auth system (JWT cookies, brute force protection, admin seeding)
- Stage Master CRUD with Text, Date, Dropdown, Image input types
- Department-Stage Hierarchy with per-stage user assignment
- Stages filtered by department in enquiry list and detail
- Enquiries CRUD with pagination, frozen columns, image upload
- Voice Notes: record & attach multiple per enquiry
- Enquiry status (open/closed), auto-close, admin close/reopen
- In-app notifications: bell icon with unread count
- Customer, Fabric Type master screens
- Reports: Enquiry Report, User Stages (pending+done), Excel export
- Blank/Filled grid filters, stage filters

## Mobile-Responsive Changes
- Sidebar: drawer with overlay on mobile (<768px), static on desktop
- Enquiries: card-based list on mobile, table on desktop
- Detail page: stacked forms, sticky save button at bottom on mobile
- Reports: scrollable tabs with compact labels on mobile
- Header: hamburger menu + notification bell, no email on small screens
- All filter/form grids stack to single column on mobile

## Backlog
- P1: Email notifications (awaiting Resend API key)
