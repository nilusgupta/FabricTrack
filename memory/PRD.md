# Fabric Enquiry Tracking System - PRD

## Original Problem Statement
Build a fabric enquiry tracking system with overview of status of enquiry at various stages assigned to users.

## Architecture
- Frontend: React + TailwindCSS + Shadcn UI
- Backend: FastAPI + Motor (Async MongoDB) + PyJWT
- Storage: Emergent Object Storage for images and voice notes
- Excel: openpyxl + Pillow for embedded images

## What's Been Implemented
- Auth system (JWT cookies, brute force protection, admin seeding)
- Stage Master CRUD (stage templates - no user assignment, managed via department hierarchy)
- Department-Stage Hierarchy: stages assigned to departments with per-stage user assignment
- **Stages filtered by department**: Enquiry list and detail only show stages from the department's hierarchy
- Enquiries CRUD with pagination, frozen columns, image upload
- Voice Notes: record & attach multiple audio notes per enquiry
- Enquiry status (open/closed), auto-close when all hierarchy stages complete, admin close/reopen
- Per-stage commenting and audit history
- In-app notifications: bell icon with unread count
- Department, Customer, Fabric Type master screens
- Reports with filters, grid filters, blank/filled toggle, pending stages report
- Excel export with embedded images

## Removed from Forms
- Rate, PO No, PO Received Date, Quantity

## Backlog
- P1: Email notifications (Resend integration - needs API key)
- P2: Mobile-responsive styling
