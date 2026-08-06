# Lance QA Master Checklist

Durable tracker for the full QA program. Update status inline as items are
verified in the packaged/browser app. NEVER delete items; mark status and add
notes. This file survives context compressions — always re-read it first.

Status legend:
- `[ ]` not started
- `[~]` in progress
- `[x]` PASSED (verified working)
- `[!]` FAILED / BROKEN (bug found, must fix)
- `[-]` skip / N/A (with reason)
- `[?]` needs manual verification

## Counter (keep in sync)
- Total items: 0
- Passed: 0
- Failed: 0
- Open: 0

---

## CORE FLOWS

### Clients
- [ ] Create client, all fields filled
- [ ] Create client, only required fields
- [ ] Edit a client
- [ ] Add communication log entry
- [ ] Import clients from CSV
- [ ] Client metrics update after projects/invoices added
- [ ] Delete client — cascade projects/invoices/comms gone

### Projects
- [ ] Create project linked to a client
- [ ] Add milestones with due dates
- [ ] Mark milestones complete
- [ ] Create project from a template
- [ ] Kanban — add columns, add cards, move cards between columns
- [ ] Project budget tracks against time entries

### Time
- [ ] Start live timer, run, stop
- [ ] Log manual time entry with start/end
- [ ] Mark entry billable vs non-billable
- [ ] Year heatmap renders with logged data
- [ ] Time entries roll up to project totals

### Invoices
- [ ] Create invoice with multiple line items
- [ ] Apply discount
- [ ] Mark as sent
- [ ] Record partial payment
- [ ] Record full payment — status flips to paid
- [ ] Recurring invoice generates on schedule
- [ ] Export invoice as PDF
- [ ] Export invoice as DOCX
- [ ] Aging report surfaces overdue invoices

### Proposals
- [ ] Create proposal manually
- [ ] AI generation (if enabled)
- [ ] Send proposal — share token generates
- [ ] Mark proposal accepted
- [ ] Mark proposal expired
- [ ] Export as PDF and DOCX

### Contracts
- [ ] Create contract from each of 6 built-in templates
- [ ] Link to a client and project
- [ ] Mark as signed with a date
- [ ] Share via client portal — portal link works
- [ ] Export as PDF and DOCX

### Finance
- [ ] Add expenses in multiple categories
- [ ] Add a recurring expense
- [ ] Revenue forecast chart renders with real data
- [ ] Cash flow projection updates with actual expenses
- [ ] Scenario modeling (if available)

### Follow-Ups
- [ ] Checker surfaces overdue invoices
- [ ] Checker surfaces sent proposals
- [ ] Action a follow-up — mark as sent
- [ ] Dismiss a follow-up
- [ ] Follow-up log records entries

## ARCHETYPE SYSTEM
- [ ] Pick 5 archetypes: one Creative, one Technical, one Strategic, one Service, one Custom
- [ ] Each loads correct metric cards
- [ ] Each shows correct sidebar nav items
- [ ] Each loads correct feature tabs
- [ ] Each shows profession-specific insights
- [ ] Switch archetypes mid-session — everything re-renders

## POWER USER FLOWS

### Global Search
- [ ] Search client by name
- [ ] Search a project
- [ ] Search an invoice number
- [ ] Search a proposal
- [ ] Results accurate and clickable

### Command Palette
- [ ] Open with keyboard shortcut
- [ ] Navigate to every major screen
- [ ] Every palette command works

### Import System
- [ ] Import clients from CSV with column mapping
- [ ] Import from DOCX
- [ ] Import log records the operation
- [ ] Malformed CSV — error handling

### Export Templates
- [ ] Create a custom export template
- [ ] Apply to proposal export
- [ ] Apply to invoice export

### Client Portal
- [ ] Generate share token for proposal
- [ ] Generate share token for contract
- [ ] Open portal URL in browser
- [ ] Proposal renders for client view
- [ ] Contract renders, client signature field works
- [ ] Token expiry works
- [ ] Rate limiting works (60 req/min)

### Backup + Restore
- [ ] Trigger manual backup
- [ ] Backup file created
- [ ] Restore from backup
- [ ] All data survived the restore

### Multi-Currency
- [ ] Set profile to non-USD currency
- [ ] Create invoice in different currency
- [ ] Currency symbols render correctly throughout

### Themes
- [ ] Switch through all 7 themes
- [ ] Light and dark variants work
- [ ] Profession→theme mapping applies on archetype switch

### Achievements
- [ ] Achievement checker runs on load
- [ ] Trigger at least 2 achievements with real actions
- [ ] Toast notification fires on unlock
- [ ] Achievements gallery shows unlocked state

## BACKGROUND ENGINES
- [ ] Recurring invoice: next_due=today, restart, invoice generated
- [ ] Follow-up checker runs every 30 minutes
- [ ] Proposal expiry: expires_at=yesterday, status flips
- [ ] Auto-backup runs on mount if enabled
- [ ] Auto-updater polls without crashing

## EDGE CASES
- [ ] Every form: submit empty — validation
- [ ] Every form: paste 1000-char strings — no overflow/crash
- [ ] Every form: special chars (!@#$%^&*) — sanitization
- [ ] Every table: sort works on every sortable column
- [ ] Every table: 50+ records — performance
- [ ] Delete chains: client with projects/invoices/proposals — no orphans
- [ ] Concurrent timers: try starting two — only one runs

## FINAL CHECKS
- [ ] `tsc --noEmit` — 0 errors
- [ ] ESLint — errors fixed, warnings reviewed
- [ ] No console.error during any normal user flow
- [ ] SQLite FK constraints satisfied
- [ ] All 32 tables have expected data after full run

## REPORT
- [ ] Pass/fail per section written to QA report
- [ ] Screenshots of every graph/chart/heatmap/portal view
- [ ] List of every bug found
- [ ] List of every bug fixed
- [ ] List of anything still open