# FabricTrack - Fabric Enquiry Tracking System PRD

## Original Problem Statement
Build a fabric enquiry tracking system with overview of status of enquiry at various stages assigned to users.

## What's Been Implemented (2026-04-10)
- JWT auth with admin seeding, brute force protection
- User management (CRUD, roles, departments)
- Enhanced Stage Master: input_type (text/date/select), is_mandatory, select_options, lead_time_days, date_input_mode (auto/manual)
- Enquiry management with dynamic stage_values, style_no, rate, po_no, po_del_date, image upload
- Lead time tracking: calculates delay/early status per stage based on previous stage completion + lead_time_days
- Date input modes: "auto" captures current date on button click, "manual" shows date picker
- Delay indicators: DELAYED (red), ON TIME (green), pending with due date shown in enquiry list & detail
- Dashboard with stat cards and Recharts charts
- Reports: Enquiry (multi-field filters), Stage Summary, User Performance, Department
- Excel export matching TASK.xlsx format
- Object Storage for fabric images

## Backlog
P1: Email notifications, Bulk import/export, PDF reports, Stage transition rules
P2: Audit log, Custom fields, File attachments, Customer grouping view
