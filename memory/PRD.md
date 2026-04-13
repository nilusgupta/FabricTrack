# Fabric Enquiry Tracking System - PRD

## Original Problem Statement
Build a fabric enquiry tracking system with overview of status of enquiry at various stages assigned to users.

## Core Requirements
- Mobile and web app interfaces
- Dynamic stage master (admin-defined workflow stages) with input types, mandatory/non-mandatory flags, and date input modes
- Per-stage lead times calculation to highlight delayed/early stages
- Ability to upload images (camera/gallery/file folder) per enquiry
- Per-stage comments and detailed history logs (user, date, time)
- Department, Customer, and Fabric Type master screens
- Reports with multi-field filtering and comprehensive data Export to Excel
- Stage-level permissions (only assigned users can complete or comment on a specific stage)

## Architecture
- Frontend: React + TailwindCSS + Shadcn UI
- Backend: FastAPI + Motor (Async MongoDB) + PyJWT
- Storage: Emergent Object Storage for images
- Excel: openpyxl + Pillow for embedded images

## Key Files
- `/app/backend/server.py` - All backend routes, DB queries, Excel export
- `/app/frontend/src/pages/ReportsPage.js` - Reports with filters + grid
- `/app/frontend/src/pages/EnquiriesPage.js` - Enquiry pipeline
- `/app/frontend/src/pages/EnquiryDetailPage.js` - Enquiry detail with stages
- `/app/frontend/src/pages/CustomerMasterPage.js` - Customer master
- `/app/frontend/src/pages/FabricTypeMasterPage.js` - Fabric type master
- `/app/frontend/src/lib/api.js` - Axios instance (relative /api paths)

## What's Been Implemented
- Auth system (JWT cookies, brute force protection, admin seeding)
- Stage Master CRUD with lead times, date input modes, assigned user permissions
- Enquiries CRUD with pagination, frozen columns, image upload
- Per-stage commenting and audit history
- Department, Customer, Fabric Type master screens with quick-create buttons
- Reports with 12+ standard filters + dynamic stage filters + inline grid column filters
- Excel export with all fields, embedded images, and stage filter support
- React Portal image hover previews
- CORS/cookie handling for cross-domain deployment

## Completed Features (Latest)
- Dynamic stage filters in Reports filter bar (server-side, sent as JSON to backend)
- Inline grid column filters on Reports result table (client-side, instant filtering)
- Stage filters support both text inputs and dropdown selects based on stage input_type
- Grid filter count indicator ("Grid: X of Y")
- Clear All resets both stage and grid filters
- Excel export respects stage filters

## Backlog
- P2: Mobile-responsive styling for frozen-column grids
