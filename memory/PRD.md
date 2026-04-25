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
