# Fabric Enquiry Tracking System - PRD

## Original Problem Statement
Build a fabric enquiry tracking system with overview of status of enquiry at various stages assigned to users.

## Architecture
- Frontend: React + TailwindCSS + Shadcn UI
- Backend: FastAPI + Motor (Async MongoDB) + PyJWT
- Storage: Emergent Object Storage for images and voice notes
- Excel: openpyxl + Pillow for embedded images

## Key Files
- `/app/backend/server.py` - All backend routes, DB queries, Excel export
- `/app/frontend/src/pages/ReportsPage.js` - Reports with filters + grid + pending stages
- `/app/frontend/src/pages/EnquiriesPage.js` - Enquiry pipeline
- `/app/frontend/src/pages/EnquiryDetailPage.js` - Enquiry detail with stages, voice notes, close/reopen
- `/app/frontend/src/pages/DepartmentMasterPage.js` - Department master + stage hierarchy
- `/app/frontend/src/pages/StageMasterPage.js` - Stage templates (no assigned_users)
- `/app/frontend/src/components/Layout.js` - Layout with notification bell

## What's Been Implemented
- Auth system (JWT cookies, brute force protection, admin seeding)
- Stage Master CRUD (without assigned_users - managed via department hierarchy)
- Department-Stage Hierarchy: two-panel UI, add/reorder stages, assign users per stage per department
- Enquiries CRUD with pagination, frozen columns, image upload
- Voice Notes: record & attach multiple audio notes per enquiry (MediaRecorder API + Object Storage)
- Enquiry status (open/closed), auto-close when all hierarchy stages complete, admin close/reopen
- Per-stage commenting and audit history
- In-app notifications: bell icon, unread count, notification when previous stage completed
- Department, Customer, Fabric Type master screens with quick-create buttons
- Reports with 12+ standard filters + dynamic stage filters + inline grid column filters
- Blank/Filled filter toggle on all grid columns
- Pending Stages report tab
- Excel export with all fields, embedded images

## Removed from Forms
- Rate, PO No, PO Received Date, Quantity (removed from create and edit forms)
- Fabric Received + Qty Received: KEPT

## Backlog
- P1: Email notifications (Resend integration - needs API key)
- P2: Mobile-responsive styling
