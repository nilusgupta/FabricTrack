# Fabric Enquiry Tracking System - PRD

## Original Problem Statement
Build a fabric enquiry tracking system with overview of status of enquiry at various stages assigned to users.

## Core Requirements
- Dynamic stage master (admin-defined workflow stages) with input types, mandatory/non-mandatory flags, and date input modes
- Department-stage hierarchy: stages assigned to departments with per-stage user assignment
- Per-stage lead times calculation to highlight delayed/early stages
- Ability to upload images (camera/gallery/file folder) per enquiry
- Per-stage comments and detailed history logs (user, date, time)
- Department, Customer, and Fabric Type master screens
- Reports with multi-field filtering and comprehensive data Export to Excel
- Stage-level permissions via department hierarchy (only assigned users can complete or comment)
- In-app notifications when previous stage is completed (next stage users notified)
- Enquiry close/reopen: auto-close when all stages complete, admin can force-close
- Pending stages report showing work by user

## Architecture
- Frontend: React + TailwindCSS + Shadcn UI
- Backend: FastAPI + Motor (Async MongoDB) + PyJWT
- Storage: Emergent Object Storage for images
- Excel: openpyxl + Pillow for embedded images

## Key Files
- `/app/backend/server.py` - All backend routes, DB queries, Excel export
- `/app/frontend/src/pages/ReportsPage.js` - Reports with filters + grid + pending stages
- `/app/frontend/src/pages/EnquiriesPage.js` - Enquiry pipeline
- `/app/frontend/src/pages/EnquiryDetailPage.js` - Enquiry detail with stages, close/reopen
- `/app/frontend/src/pages/DepartmentMasterPage.js` - Department master + stage hierarchy management
- `/app/frontend/src/pages/StageMasterPage.js` - Stage templates (no assigned_users, managed via dept hierarchy)
- `/app/frontend/src/components/Layout.js` - Layout with notification bell
- `/app/frontend/src/lib/api.js` - Axios instance (relative /api paths)

## What's Been Implemented
- Auth system (JWT cookies, brute force protection, admin seeding)
- Stage Master CRUD (without assigned_users - managed via department hierarchy)
- Department-Stage Hierarchy: two-panel UI, add/reorder stages, assign users per stage per department
- Enquiries CRUD with pagination, frozen columns, image upload, PO fields, fabric received
- Enquiry status (open/closed), auto-close when all hierarchy stages complete, admin close/reopen
- Per-stage commenting and audit history
- In-app notifications: bell icon, unread count, notification when previous stage completed
- Department, Customer, Fabric Type master screens with quick-create buttons
- Reports with 12+ standard filters + dynamic stage filters + inline grid column filters
- Blank/Filled filter toggle on all grid columns
- Pending Stages report tab (shows pending work by user based on hierarchy)
- Excel export with all fields, embedded images, and full filter support
- React Portal image hover previews
- CORS/cookie handling for cross-domain deployment

## Backlog
- P1: Email notifications (Resend integration - needs API key from user)
- P2: Mobile-responsive styling for frozen-column grids
