# Fabric Enquiry Tracking System - PRD

## Architecture
- Frontend: React + TailwindCSS + Shadcn UI (PWA - installable)
- Backend: FastAPI + Motor (Async MongoDB) + PyJWT + WebAuthn
- Storage: Emergent Object Storage for images and voice notes

## What's Been Implemented
- **PWA** with biometric login (WebAuthn fingerprint/Face ID)
- **Mobile-responsive**: Sidebar drawer, card view for enquiries with pagination, sticky save
- **Performance**: MongoDB indexes, asyncio.gather, in-memory cache, code splitting
- Auth system with JWT cookies
- Stage Master: Text, Date, Dropdown, Image (Camera/Gallery), QR Code Scanner input types
- Department-Stage Hierarchy with per-stage user assignment
- Enquiries CRUD with single image upload (Camera/Gallery) + Bulk create (multi-image = multi-enquiry)
- Voice Notes: record & attach multiple per enquiry
- Enquiry status (open/closed), auto-close, admin close/reopen
- In-app notifications
- Reports: Enquiry Report, User Stages (pending+done with overdue), Excel export
- Blank/Filled grid filters, stage filters
- Customer, Fabric Type, Department master screens

## Backlog
- P1: Email notifications (awaiting Resend API key)
- P2: SSL/HTTPS on EC2 once deployment is stable
- P2: Refactor monolithic server.py into routes/models/services

## Recent Fixes
- 2026-05-01: Fixed infinite `/api/auth/refresh` 401 loop on EC2 deployment.
  Root cause: `frontend/src/lib/api.js` axios interceptor kept retrying refresh
  when refresh itself returned 401 (each call = new config object, `_retry` flag
  never propagated). Fix: bypass interceptor entirely for auth endpoints
  (`/auth/refresh`, `/auth/login`, `/auth/logout`, `/auth/me`) and only redirect
  to `/login` if not already there. Requires `npm run build` + Nginx reload on EC2.
