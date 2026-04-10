# FabricTrack - Fabric Enquiry Tracking System PRD

## Original Problem Statement
Build a fabric enquiry tracking system with overview of status of enquiry at various stages assigned to users. Report format matching TASK.xlsx with columns: SR NO, IMAGE, STYLE NO., FABRIC, [dynamic stage columns], RATE, PO No., PO DEL DATE, comment.

## User Personas
- **Admin**: Full system access - manages users, stages, enquiries, views all reports
- **Department Users** (Sales, Production, Quality, Design, Logistics): Create/manage enquiries, view reports

## Architecture
- **Backend**: FastAPI + MongoDB (motor) + JWT auth (httpOnly cookies) + Emergent Object Storage
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Database**: MongoDB (collections: users, stages, enquiries, enquiry_history, login_attempts, files)

## What's Been Implemented (2026-04-10)
- ✅ JWT auth with admin seeding, brute force protection
- ✅ User management (CRUD, roles, departments, activate/deactivate)
- ✅ Enhanced Stage Master (input_type: text/date/select, is_mandatory, select_options, color coding)
- ✅ Enquiry management with dynamic stage_values, style_no, rate, po_no, po_del_date
- ✅ Image upload via Emergent Object Storage
- ✅ Stage values: date fields with "Today" button, select dropdowns, text inputs
- ✅ Change history tracking per stage value
- ✅ Dashboard with stat cards and Recharts charts
- ✅ Reports: Enquiry (multi-field filters), Stage Summary, User Performance, Department
- ✅ Excel export matching TASK.xlsx format (SR NO, IMAGE, STYLE NO., FABRIC, stages..., RATE, PO, comment)
- ✅ Responsive sidebar layout with Swiss/High-Contrast design

## Prioritized Backlog
### P1 - Email notifications, Bulk operations, Print/PDF export
### P2 - Stage transition rules, Audit log, Custom fields, File attachments
