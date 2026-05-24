# FabricTrack Roadmap

## Deferred refactors (each needs a dedicated session)

### EnquiriesPage.js (~635 lines)
**Why deferred:** the New Enquiry dialog contains nested Quick-Add Customer
and Quick-Add Fabric dialogs that share parent state (`form`, `customers`,
`fabricTypes`, `quickCustomer`, `quickFabric`, image upload). Naive extraction
would require passing 10+ props down each dialog, increasing complexity rather
than reducing it. Proper fix is to lift state into a `useEnquiryForm()` hook
and pass that single hook return value to extracted child components.
**Estimated effort:** 1–2 hour session with focused regression testing.

### EnquiryDetailPage.js (~820 lines)
**Why deferred:** heaviest state coupling in the codebase — every stage's value,
comment, image upload, voice note recording, QR scanner, and history rendering
share state. Splitting requires creating multiple custom hooks
(`useEnquiryForm`, `useVoiceRecorder`, `useQRScanner`) plus child components
(EnquiryHeader, EnquiryStageList, EnquiryHistory). Done badly, breaks core
data entry flow. **Estimated effort:** 2–3 hour session.

### server.py (~2000 lines, complexity 58 on `update_enquiry`)
**Why deferred:** monolith with intertwined route handlers + helpers. Proper
split: routes (auth, enquiries, files, reports, masters), services
(stage_workflow.py, notifications.py, files_service.py), models
(pydantic schemas). Cross-handler dependencies (e.g. enquiry history,
notification triggers, permission checks) need careful extraction. Best done
when adding the Resend email integration since that already touches the
notification surface.
**Estimated effort:** 3+ hour session.

## P1 (high value, blocked on credentials)
- **Resend email notifications**: trigger on stage completion / overdue.
  Blocked on user providing Resend API key. Implementation playbook ready
  to call when key is available.

## P2 (nice-to-have)
- **Combobox with search** for Customer + Fabric `<Select>` dropdowns in the
  new-enquiry dialog (388+ items in a plain Select feels slow to scroll).
- **Bar-click → enquiry edit popover** on Gantt chart.
- **Export Gantt as PNG** for sharing.
- **"My Pending" badge** on the dashboard linking to User Stages report
  pre-filtered to overdue items.

## P3 (long-term)
- Daily digest emails (summarises pending stages per user).
- Mobile PWA polish: install prompt, offline fallback.
- Automated CI checks (ESLint + Ruff).
