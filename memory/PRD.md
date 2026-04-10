# FabricTrack - Fabric Enquiry Tracking System PRD

## Original Problem Statement
Build a fabric enquiry tracking system with overview of status of enquiry at various stages assigned to users.

## User Personas
- **Admin**: Full system access - manages users, stages, enquiries, views all reports
- **Department Users** (Sales, Production, Quality, Design, Logistics): Create/manage enquiries, view reports

## Architecture
- **Backend**: FastAPI + MongoDB (motor) with JWT auth (httpOnly cookies)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Database**: MongoDB (collections: users, stages, enquiries, enquiry_history, login_attempts)

## Core Requirements
1. Email/password authentication with JWT
2. Admin + multiple department roles
3. Custom stage master (admin-configurable workflow stages)
4. Enquiry CRUD with stage tracking, assignment, department tagging
5. Dashboard with overview widgets and charts
6. 4 report types: Enquiry, Stage Summary, User Performance, Department

## What's Been Implemented (2026-04-10)
- ✅ JWT auth with admin seeding, brute force protection
- ✅ User management (CRUD, roles, departments, activate/deactivate)
- ✅ Stage Master (CRUD with visual pipeline, color coding)
- ✅ Enquiry management (CRUD, stage assignment, user assignment, filtering)
- ✅ Enquiry detail with stage progress visualization and history tracking
- ✅ Dashboard with stat cards and charts (Recharts)
- ✅ Reports: Enquiry (with date pickers, filters, CSV export), Stage Summary, User Performance, Department
- ✅ Responsive sidebar layout
- ✅ Modern/Minimal Swiss design theme

## Prioritized Backlog
### P0 (Critical)
- None remaining

### P1 (High)
- Email notifications on stage changes
- Bulk operations on enquiries
- Advanced search with more filters
- Mobile-specific optimizations

### P2 (Nice to have)
- Print/PDF export for reports
- Stage transition rules (enforce stage order)
- Audit log for all actions
- Custom fields per stage
- File attachments on enquiries

## Next Tasks
- Add more sample data for better report visualization
- Implement stage transition notifications
- Add bulk enquiry operations
