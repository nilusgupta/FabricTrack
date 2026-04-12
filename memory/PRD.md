# FabricTrack - Fabric Enquiry Tracking System

## Problem Statement
Build a fabric enquiry tracking system with overview of status of enquiry at various stages assigned to users. Mobile and web interfaces, dynamic stage master, per-stage lead times, image uploads, per-stage comments and history, department master, reports with Excel export, and stage-level user permissions.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT (port 8001)
- **Storage**: Emergent Object Storage for images
- **Database**: MongoDB

## Completed Features
- [x] Auth system (Admin/Sales/Production/Quality roles, JWT cookies, brute-force protection)
- [x] Stage Master CRUD (input_type, is_mandatory, lead_time_days, date_input_mode, assigned_users)
- [x] Enquiry Pipeline UI with delay/early status tracking
- [x] Image uploads via Emergent Object Storage (camera/gallery/file)
- [x] Per-stage commenting and audit history
- [x] Excel export via openpyxl (with Created By, Department, Created Date columns)
- [x] Dashboard with stats and recent enquiries
- [x] Department Master CRUD (seeded: Sales, Production, Quality, Admin, Design, Logistics)
- [x] Removed "Assigned To" from enquiries (replaced with Department-based assignment)
- [x] Stage-level user permissions (assigned_users on stages, UI gating + backend enforcement)
- [x] Reports: stage summary, user performance, department breakdown

- [x] Enquiry list pagination (server-side, 20 per page, page controls with first/prev/next/last)
- [x] Customer Master CRUD (name field)
- [x] Fabric Type Master CRUD (name, gsm, width, composition, construction)
- [x] Master-based dropdowns in enquiry forms with "+" quick-create buttons
- [x] Fabric Received yes/no field with conditional Qty Received
- [x] PO Del Date renamed to PO Received Date
- [x] Image thumbnails in enquiry list with hover preview

## Key Pages
- `/login` - Authentication
- `/` - Dashboard
- `/enquiries` - Enquiry list with filters
- `/enquiries/:id` - Enquiry detail with stage values, comments, history
- `/stages` - Stage Master (admin)
- `/customers` - Customer Master (admin)
- `/fabric-types` - Fabric Type Master (admin)
- `/departments` - Department Master (admin)
- `/users` - User Management (admin)
- `/reports` - Reports with Excel export

## Key API Endpoints
- `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/stages`, `PUT/DELETE /api/stages/:id`
- `GET/POST /api/customers`, `PUT/DELETE /api/customers/:id`
- `GET/POST /api/fabric-types`, `PUT/DELETE /api/fabric-types/:id`
- `GET/POST /api/departments`, `PUT/DELETE /api/departments/:id`
- `GET/POST /api/enquiries`, `PUT/DELETE /api/enquiries/:id`
- `POST /api/enquiries/:id/comments` (permission enforced)
- `GET /api/reports/export-excel`
- `POST /api/upload`, `GET /api/files/:path`

## Backlog
- No pending items
