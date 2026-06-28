# MockDB Test Guide

**Date**: 2026-06-28  
**Requires**: `VITE_USE_MOCK_DB=true` in `.env`  
**Version**: `MOCK_DB_VERSION = 3` (stale localStorage overlay auto-cleared on mismatch)

---

## If UI Shows Stale Data

Run any of these in the browser console:

```js
// Option 1: Full reset — clears overlay and localStorage
__resetMockDatabase();

// Option 2: Manual clear
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## Demo Accounts

| Role | Email | Password | User ID |
|------|-------|----------|---------|
| **Owner** | `owner@aitasker.com` | `owner123` | user-001 |
| **Admin** | `admin1@aitasker.com` | `admin123` | user-002 |
| **Admin** | `admin2@aitasker.com` | `admin123` | user-003 |
| **Admin** | `admin3@aitasker.com` | `admin123` | user-004 |
| **Expert** | `alice.expert@example.com` | `expert123` | user-005 |
| **Expert** | `bob.expert@example.com` | `expert123` | user-006 |
| **Expert** | `carol.expert@example.com` | `expert123` | user-007 |
| **Expert** | `david.expert@example.com` | `expert123` | user-008 |
| **Expert** | `emma.expert@example.com` | `expert123` | user-009 |
| **Expert** | `frank.expert@example.com` | `expert123` | user-010 |
| **Expert** | `grace.expert@example.com` | `expert123` | user-011 |
| **Expert** | `henry.expert@example.com` | `expert123` | user-012 |
| **Client** | `john.client@example.com` | `client123` | user-013 |
| **Client** | `kate.client@example.com` | `client123` | user-014 |
| **Client** | `liam.client@example.com` | `client123` | user-015 |
| **Client** | `mia.client@example.com` | `client123` | user-016 |
| **Client** | `noah.client@example.com` | `client123` | user-017 |
| **Client** | `olivia.client@example.com` | `client123` | user-018 |
| **Client** | `paul.client@example.com` | `client123` | user-019 |
| **Client** | `quinn.client@example.com` | `client123` | user-020 |

---

## Test Matrix — Client Accounts

### John Smith (user-013) — john.client@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Open Job (with useCases+tasks) | job-017 | Expert JobList → SendProposal | 3 use cases, each with client tasks visible |
| Open Job (fallback test) | job-019 | Expert JobList → SendProposal | 3 use cases, each with fallback task (empty tasks in seed) |
| Pending Proposal Review | proposal-027 | ProposalReview | Structured proposal with AI miniTasks for job-017 |
| Active Project | proj-014 | ClientProjectManagement | Active project with use cases |
| Contract Cancel 30% | proj-017 | ClientProjectManagement → Cancel | ~30% progress, refund ~550K, expert ~400K, platform ~50K |
| Final Delivery Submitted | proj-019 | ClientProjectManagement | Accept/Decline final delivery |
| Disputed (reporter) | report-013 | Dispute flow | Report filed against expert |

### Kate Wilson (user-014) — kate.client@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Active Projects (4) | proj-001, 004, 016, 018 | MyProjectsPage | 4 projects listed |
| Final Delivery Pending | proj-016 | ClientProjectManagement | Final product submitted, can accept |
| Contract Cancel 80% | proj-018 | ClientProjectManagement → Cancel | ~80% progress, refund ~50K, expert ~900K, platform ~50K |
| Completed Project | proj-009 | MyProjectsPage | Fraud detection project completed |

### Liam O'Brien (user-015) — liam.client@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Open Job (with tasks) | job-020 | Expert JobList | 3 use cases with client tasks |
| Checklist Completed | proj-020 | ClientProjectManagement | All miniTasks done, waiting expert product |
| Completed Project | proj-002 | MyProjectsPage | Retail CV project completed |

### Mia Garcia (user-016) — mia.client@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Open Job (fallback test) | job-021 | Expert JobList → SendProposal | 3 use cases, empty tasks → fallback tasks created |
| Waiting Expert Product | proj-021 | ClientProjectManagement | Task in_progress, productRequested=true |
| Active Project | proj-010 | ClientProjectManagement | Active adaptive learning project |
| Completed Project | proj-003 | MyProjectsPage | AI tutor project completed |

### Noah Taylor (user-017) — noah.client@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Active Project | proj-013 | ClientProjectManagement | Game NPC AI project |
| Disputed (reporter) | proj-015 / report-012 | Dispute flow | Client reports expert |

### Olivia Martinez (user-018) — olivia.client@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Rework Project | proj-023 | ClientProjectManagement | 1 task in rework with clientFeedback |
| Active Project | proj-007 | ClientProjectManagement | Virtual staging project active |
| Disputed (respondent) | proj-011 | Dispute flow | Expert reported client |

### Paul Anderson (user-019) — paul.client@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Open Job (with tasks) | job-022 | Expert JobList | 3 use cases with client tasks |
| Waiting Client Approval | proj-022 | ClientProjectManagement | 2 tasks waiting_for_approval, handoverEvidence present |
| Completed Project | proj-006 | MyProjectsPage | Contract analysis project completed |

### Quinn Thomas (user-020) — quinn.client@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Completed Projects | proj-008, 012 | MyProjectsPage | 2 completed projects visible |
| Disputed | proj-012 | Dispute flow | Content generation project disputed |

---

## Test Matrix — Expert Accounts

### Alice Johnson (user-005) — alice.expert@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| SendProposal (job-017) | job-017 | JobList → SendProposal | 3 use cases with client tasks, AI planner available |
| SendProposal (job-019) | job-019 | JobList → SendProposal | Fallback tasks test |
| Active Project | proj-014 | ExpertProjectManagement | Medical imaging project |
| Contract Cancel 30% | proj-017 | ExpertProjectManagement | Cancel with 30% progress |
| Final Delivery Submitted | proj-019 | ExpertProjectManagement | All tasks completed, waiting client |

### Bob Williams (user-006) — bob.expert@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Active Project | proj-016 | ExpertProjectManagement | Risk dashboard, final work submitted |
| Contract Cancel 80% | proj-018 | ExpertProjectManagement | Cancel with 80% progress |
| Disputed (respondent) | proj-011 / report-001 | Dispute flow | Client reported expert |

### Carol Zhang (user-007) — carol.expert@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Completed Projects | proj-003, 006 | ExpertDashboard | 2 completed projects |
| Disputed (reporter) | proj-003 / report-003 | Dispute flow | Expert reports client |

### David Park (user-008) — david.expert@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Pending Proposal | proposal-037 | ProposalStatus | Structured proposal for job-021 (fallback test) |
| Active Project | proj-021 | ExpertProjectManagement | Client requested product |
| Completed Project | proj-002 | ExpertDashboard | Retail CV project completed |

### Emma Brown (user-009) — emma.expert@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Pending Proposal | proposal-038 | ProposalStatus | Structured proposal for job-022 |
| Active Projects | proj-001, 004 | ExpertProjectManagement | 2 active projects |
| Waiting Client Approval | proj-022 | ExpertProjectManagement | Tasks submitted, waiting client |

### Frank Mueller (user-010) — frank.expert@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Pending Proposal | proposal-036 | ProposalStatus | Structured proposal for job-020 |
| Checklist Completed | proj-020 | ExpertProjectManagement | All miniTasks done, need to submit product |
| Completed Project | proj-009 | ExpertDashboard | Fraud detection project completed |

### Grace Kim (user-011) — grace.expert@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Rework Project | proj-023 | ExpertProjectManagement | 1 task in rework with client feedback |
| Active Project | proj-007 | ExpertProjectManagement | Virtual staging project |
| Disputed (reporter) | proj-012 / report-002 | Dispute flow | Expert reports client |

### Henry Davis (user-012) — henry.expert@example.com / client123

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Disputed (reporter) | proj-005 / report-013 | Dispute flow | Expert reports client |
| Active Project | proj-010 | ExpertProjectManagement | Adaptive learning project |

---

## Test Matrix — Admin Accounts

All admins (user-002, user-003, user-004) have access to:

| Scenario | Seed ID | Entry Page | Expected Result |
|----------|---------|------------|-----------------|
| Pending Reports | report-001..013 | AdminDisputes | Multiple reports in various statuses |
| Awaiting Expert | report-004, 005, 008, 010, 011 | AdminDisputes | Reports waiting expert response |
| Awaiting Client | report-001, 002, 003, 006, 007, 009 | AdminDisputes | Reports waiting client response |
| Resolved | report-012, 013 (after resolution) | AdminDisputes | Resolved disputes visible |
| Force Payout | Any disputed project | AdminReportDetail | Force payout to expert |
| Force Refund | Any disputed project | AdminReportDetail | Force refund to client |
| More Evidence | Any pending report | AdminReportDetail | Request additional evidence |

---

## Scenario Coverage Map

| # | Scenario | Seed IDs | Account Pair |
|---|----------|----------|-------------|
| 1 | Open JobPost with Use Cases + Client Tasks | job-017, 020, 022 | John, Liam, Paul |
| 2 | Open JobPost with Use Cases, no Tasks | job-019, 021 | John, Mia |
| 3 | Pending Proposal with AI MiniTasks | proposal-027, 036, 038 | Alice, Frank, Emma |
| 4 | Pending Proposal with Expert Proposed Task | proposal-028, 037 | Henry, David |
| 5 | Active Project in progress | proj-014, 016, 021 | John/Alice, Kate/Bob, Mia/David |
| 6 | Checklist Completed | proj-020 | Liam/Frank |
| 7 | Waiting Expert Product | proj-021 | Mia/David |
| 8 | Waiting Client Approval | proj-022 | Paul/Emma |
| 9 | Rework | proj-023 | Olivia/Grace |
| 10 | Final Delivery Submitted | proj-016, 019 | Kate/Bob, John/Alice |
| 11 | Payment Released / Completed | proj-002..009 | Various |
| 12 | Contract Cancellation 30% | proj-017 | John/Alice |
| 13 | Contract Cancellation 80% | proj-018 | Kate/Bob |
| 14 | Client reports Expert | report-011, 012 | Liam, Noah |
| 15 | Expert reports Client | report-001, 002, 003, 007, 013 | Bob, Grace, Carol, Alice, Henry |
| 16 | Admin request more evidence | Any pending report | Admin |
| 17 | Admin force payout | Any disputed project | Admin |
| 18 | Admin force refund | Any disputed project | Admin |
| 19 | Resolved dispute | Any after resolution | Admin |
| 20 | Rejected report | Any | Admin |

---

## Contract Cancellation Expected Numbers

### proj-017 (30% Progress)
- Budget: 1,000,000
- Expert payout: ~400,000 (40%)
- Platform fee: ~50,000 (5%)
- Client refund: ~550,000 (55%)

### proj-018 (80% Progress)
- Budget: 1,000,000
- Expert payout: ~900,000 (90%)
- Platform fee: ~50,000 (5%)  
- Client refund: ~50,000 (5%)
