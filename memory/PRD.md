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
- 2026-05-04: **Critical perf fix** — Customer Master & Fabric Type Master
  pages were rendering every row in a single non-paginated table. With ~388
  records in production this caused the browser to freeze ("Page Unresponsive")
  after any edit (re-fetch → re-render all rows). Fix: client-side search
  box + chunked render (50 rows initial, "Show more" button to load next 50).
  Saving guard added to Save buttons to prevent double-submit on slow links.
  Files: `frontend/src/pages/CustomerMasterPage.js`, `frontend/src/pages/FabricTypeMasterPage.js`.
- 2026-05-04: **Refactor — `ReportsPage.js` split into 6 focused files.**
  Was a 1326-line monolith with 5 Report components, 4 helper components,
  and orchestration code mixed together. Now:
  - `ReportsPage.js` (57 lines) — thin orchestrator: tab list + dispatch.
  - `reports/EnquiryReport.js` (633 lines) — main editable grid; includes
    co-located helpers `ReportThumbnail`, `GridFilterCell`, `StageEditCell`.
  - `reports/UserStagesReport.js` (531 lines) — pending/done stage tracker;
    includes `PendingStageInlineEdit` and its own `ReportThumbnail`.
  - `reports/StageSummary.js` (65), `reports/UserPerformance.js` (56),
    `reports/DepartmentReport.js` (48) — self-contained chart reports.
  Functional behaviour unchanged. Lint clean. All 6 tabs (Enquiries / Stages /
  Users / Dept / User Stages / Gantt) verified — zero runtime errors;
  Fill modal & inline stage edit popover both work.
  Files: `frontend/src/pages/ReportsPage.js` (rewritten),
  `frontend/src/pages/reports/*.js` (new directory, 5 files).
- 2026-05-04: **Critical UX fix** — duplicate enquiry creation. The New Enquiry
  "Create Enquiry" button was clickable while the POST was in flight. On the
  user's EC2 box with slow Atlas latency, users would click, see no immediate
  response, click again — creating duplicate records. Fix: `creating` state
  added; button now shows "Creating..." + disabled while the request is
  pending. Re-entrant guard at handler start also rejects double-submits.
  Verified with 3000ms artificial latency: second click did nothing.
  File: `frontend/src/pages/EnquiriesPage.js`.
- 2026-05-04: New **Gantt** report — visualize enquiry timelines as
  horizontal bars per stage. Each row is an enquiry, each bar is a stage with
  start = previous-stage completion (or enquiry creation), end = max(planned
  end, actual/today). Planned end = previous-stage completion + stage's
  `lead_time_days`. Bar fill = stage color (from Stage Master), border =
  status: green (done on time), orange (done late), amber (in progress),
  red (overdue). Today is shown as a vertical red line. Enquiries are
  grouped by department (collapsible). Filters: department, status (default
  Open), customer, fabric. Zoom in/out + Fit-to-data; auto switches between
  monthly / weekly / daily ticks based on zoom level. New tab in Reports.
  Files: `frontend/src/pages/GanttView.js` (new), `frontend/src/pages/ReportsPage.js`.
- 2026-05-04: Code-review triage — replaced `key={idx}` with stable
  `key={entry.name}` on Recharts `<Cell>` mappings (ReportsPage.js bar +
  pie). Most other items in the review were false positives (see CHANGELOG).
- 2026-05-04: Date prefill — Reports → Enquiries inline edit popover and
  User Stages "Fill" modal now default empty date stages to today (YYYY-MM-DD).
  User can change before saving; saves typical 2-click date entry into 1 click.
  Files: `frontend/src/pages/ReportsPage.js` (StageEditCell, PendingStageInlineEdit).
- 2026-05-04: Reports → Enquiries — two improvements.
  (1) Pass/Fail approval missing in the grid: `StageEditCell` popover only
      handled select/date/text. Added `yes_no` branch with Pass/Fail radio
      buttons + rewind warning. `hierarchyByDept` memo now also returns
      `fallbackMap`, threaded into the cell. Verified end-to-end: clicking
      Pass on a yes_no cell saves "yes" and the toast confirms update.
  (2) Sticky table header: wrapper now uses `overflow-auto` with
      `max-h: calc(100vh - 220px)`. Both header rows (column titles +
      filter inputs) are pinned via inline `<style>` rules — first row
      `top:0`, filter row `top:40px`. Cells with horizontal `left:` sticky
      get a higher z-index so the corner stays correct.
  Files: `frontend/src/pages/ReportsPage.js`.
- 2026-05-04: Image loading speed — root cause analysis and full fix.
  Diagnosis: every `<img>` was rendered from a `URL.createObjectURL(blob)`
  fetched via axios (`responseType:'blob'`). That bypasses the browser HTTP
  cache → every page navigation re-downloaded every image. There were also
  no cache headers on `/api/files/`. Fix:
  (1) Backend `/api/files/{path}` now returns
      `Cache-Control: private, max-age=31536000, immutable` + ETag,
      and supports `If-None-Match` → returns 304. Storage paths are immutable
      (uuid-based) so safe to cache forever. HEAD method also supported.
  (2) Frontend dropped the blob workaround and uses native `<img src="/api/files/...">`
      with `loading="lazy"` and `decoding="async"`. The auth cookie is sent
      automatically on same-origin requests. Browser parallelism + HTTP cache
      now do the heavy lifting.
  Verified locally: first hit 200 with proper headers; second hit returns 304.
  Note: in the Emergent preview (Cloudflare proxy) cache headers are stripped,
  but on the user's EC2 + Nginx box the headers pass through unchanged.
  Files: `backend/server.py` (download_file), `frontend/src/pages/EnquiriesPage.js`,
  `frontend/src/pages/ReportsPage.js`, `frontend/src/pages/EnquiryDetailPage.js`.
- 2026-05-04: UX defaults — Enquiries list & User Stages report ship with smart defaults.
  Enquiries page: new "Status" dropdown (Open / Closed / All) defaulting to **Open**.
  Backend `/api/enquiries` accepts `?status=open|closed`; `open` includes legacy
  records with missing/empty status (via `$and` + `$or` to compose with search).
  Smaller default payload → faster initial load. User Stages report defaults
  Status to **Pending** so users see what needs action first; switching/clearing
  resets to "pending" not "all".
  Files: `backend/server.py` (get_enquiries), `frontend/src/pages/EnquiriesPage.js`,
  `frontend/src/pages/ReportsPage.js`.
- 2026-05-04: New conditional/branching workflow stage type — `yes_no` (Pass/Fail).
  Stage Master adds "Yes / No (Pass / Fail)" input type. Department hierarchy
  rows for yes_no stages now show an "On No, reset to:" selector listing only
  earlier stages in the same department's hierarchy. Backend PUT
  `/api/enquiries/{id}` detects yes_no rejections (`value=="no"`) and:
  (a) clears stage_values for every stage with `fallback_order ≤ order ≤
  yes_no_order`, (b) writes a `stage_rejected` history entry with
  `fallback_stage_name` and rejection comment, (c) returns 400 if no
  `fallback_stage_id` is configured. EnquiryDetailPage and ReportsPage Fill
  modal both render Pass/Fail radio buttons with a red rewind warning when
  Fail is selected. History timeline shows rejected entries with a distinct
  red badge — "Rejected — reset to <fallback>".
  Files: `backend/server.py` (DepartmentHierarchyItem, update_enquiry),
  `frontend/src/pages/StageMasterPage.js`, `frontend/src/pages/DepartmentMasterPage.js`,
  `frontend/src/pages/EnquiryDetailPage.js`, `frontend/src/pages/ReportsPage.js`.
- 2026-05-04: User Stages report — fixed two bugs:
  (1) User filter combo did not isolate the selected user. Root cause: race
      condition — first unfiltered request fired before `currentUser` arrived
      and resolved AFTER the second filtered request, overwriting the data.
      Fix: gate first fetch until default filter applied, and abort in-flight
      requests via `AbortController` when filters change.
  (2) "Fill" popup was clipped/off-screen. Fix already in place — replaced
      Popover with a full-screen portal Dialog rendered to `document.body`,
      verified centered and unclipped.
  Files: `frontend/src/pages/ReportsPage.js` (UserStagesReport, PendingStageInlineEdit).
- 2026-05-03: UX — Sign Out moved to top-right header dropdown; click avatar/name → menu shows user info + Sign Out (red hover). Sidebar user section is now compact (no Sign Out button there). Image uploads auto-compressed: resized to max 1600px on longest side, JPEG quality 82 (PNG kept for transparent images). Reduces typical phone-camera 3-5 MB images to ~150-300 KB.
- 2026-05-03: Reports — department-scoped access + inline stage editing + memoized hierarchy maps for perf (50-100x faster render with 8000+ stage cells).
  `GET /api/reports/enquiries` now filters by `user.department` for non-admin.
  `PUT /api/enquiries/{id}` rejects stage updates where previous stages
  (lower `order` in department hierarchy) are incomplete. ReportsPage.js adds
  `StageEditCell` popover with value/comment/image upload per row. Admins bypass
  both restrictions.
- 2026-05-03: Migration to AWS EC2 + MongoDB Atlas complete.
  Root causes of login bounce: (1) cookie flags mismatched HTTPS scheme,
  (2) imported `_id` values were strings not ObjectId, (3) PWA service worker
  cached broken api.js, (4) COOKIE_SCHEME typo in .env. Deployed with
  Let's Encrypt SSL at crm.ramanujgroup.com. 1945 documents imported via
  mongoexport (--jsonArray) / mongoimport.
- 2026-05-01: Fixed login bounce-back on plain-HTTP EC2 deployment.
  Root cause: backend set auth cookies with `Secure=True; SameSite=none`. Browsers
  reject `Secure` cookies on `http://` origins, so login succeeded but cookie
  never persisted → `/auth/me` returned 401 → user redirected back to /login.
  Fix: cookie flags now driven by `COOKIE_SECURE` env var
  (default `true` for HTTPS preview/prod). On HTTP-only EC2, set
  `COOKIE_SECURE=false` in `backend/.env` → cookies become `Secure=False; SameSite=Lax`.
- 2026-05-01: Fixed infinite `/api/auth/refresh` 401 loop on EC2 deployment.
  Root cause: `frontend/src/lib/api.js` axios interceptor kept retrying refresh
  when refresh itself returned 401 (each call = new config object, `_retry` flag
  never propagated). Fix: bypass interceptor entirely for auth endpoints
  (`/auth/refresh`, `/auth/login`, `/auth/logout`, `/auth/me`) and only redirect
  to `/login` if not already there. Requires `npm run build` + Nginx reload on EC2.
