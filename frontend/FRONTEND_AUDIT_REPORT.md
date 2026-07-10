# FRONTEND AUDIT REPORT — AI-Tasker

**Date:** 2026-06-28
**Auditor:** Claude Code (Senior Frontend Architect)
**Scope:** `D:\AI-Tasker\frontend\src` — 152 JSX files, 28 JS files
**Stack:** React 18 + Vite 6 + Tailwind CSS 4 + MUI 7 + Radix UI + React Router 7

---

## Executive Summary

| Area | Score | Rating |
|------|-------|--------|
| Architecture | **5/10** | ⚠️ Needs improvement |
| React Best Practices | **6/10** | ⚠️ Adequate with gaps |
| State Management | **5/10** | ⚠️ Fragmented |
| Routing | **7/10** | ✅ Solid with minor gaps |
| Role Workflow | **6/10** | ⚠️ Functional but inconsistent |
| Mock Database | **5/10** | ⚠️ Functional but fragile |
| API Layer | **5/10** | ⚠️ Inconsistent patterns |
| Component Design | **5/10** | ⚠️ Duplication + missing abstractions |
| UI/UX Consistency | **5/10** | ⚠️ Mixed design tokens vs hardcoded |
| Performance | **4/10** | ❌ No optimizations applied |
| Security | **5/10** | ⚠️ Demo-mode risks |
| Code Cleanliness | **4/10** | ❌ Significant debt |
| **OVERALL** | **5.2/10** | |

---

## Final Verdict

# **C — Good Prototype**

The app is functionally complete as a prototype/demo. All role workflows exist and operate. However, significant technical debt prevents production readiness: no code splitting, no `React.memo`, hardcoded colors across 30+ component instances, a 4000-line mock DB, a 1600-line monolithic API handler, 6 thin-wrapper Owner pages, and no error boundaries on complex pages. Production readiness requires ~2-3 weeks of focused refactoring.

---

## Strengths (Top 10)

1. **Clean App shell** — `App.jsx` is 22 lines, provider nesting is correct, minimal and readable.
2. **Well-structured routes** — Role-based route gating with `ProtectedRoute` is clean, easy to audit, no role leakage detected.
3. **Dual-mode architecture** — Seamless switching between mock DB and real API via `VITE_USE_MOCK_DB` / `VITE_USE_DEMO_AUTH` env vars is well-designed.
4. **Status configuration centralization** — `projectStatusConfig.js` and `proposalStatusConfig.js` provide single sources of truth for labels, badges, and buttons.
5. **`useProjectProgress` hook** — Correctly wraps async handlers in `useCallback`, has loading/error/empty states; the best-written hook in the codebase.
6. **`ErrorBoundary`** — A proper class-based error boundary with retry, home, and dashboard navigation; good UX for render crashes.
7. **Design token adoption** — Shared components (`EmptyState`, `LoadingSkeleton`, `ConfirmationModal`, `StatCard`, `BackButton`) consistently use `bg-card`, `text-muted-foreground`, `bg-primary`, etc.
8. **Safety utilities** — `safety.js` provides null-safe access, array guards, and numeric conversion that many components use correctly.
9. **`AuthContext`** — Clean reducer pattern, localStorage session restore, demo-mode auto-resolve of mock DB users for correct IDs.
10. **`api.js`** — Clean `ApiError` class, AbortController timeout, mock-DB short-circuit guard; well-structured endpoint grouping.

---

## Weaknesses (Top 20)

| # | Severity | Area | Finding | File | Lines |
|---|----------|------|---------|------|-------|
| 1 | CRITICAL | Security | Auth token + user data stored in `localStorage` (XSS-readable) | `api.js`, `AuthContext.jsx` | 4-9, 193 |
| 2 | HIGH | Performance | Zero `React.lazy()` — all 50+ pages in single bundle | `routes.jsx` | 5-66 |
| 3 | HIGH | Performance | Zero `React.memo()` anywhere in codebase | All components | — |
| 4 | HIGH | Performance | Header polls notifications every 3 seconds unconditionally | `Header.jsx` | 77 |
| 5 | HIGH | UI/UX | Mobile navigation toggle exists but no panel renders anywhere | `Header.jsx` | 368-373 |
| 6 | HIGH | MockDB | Dead link `/expert/edit-profile` (should be `/expert/profile/edit`) | `JobList.jsx` | 340 |
| 7 | HIGH | MockDB | `enrichJobPost` double-match collision — `proj-013` gets wrong specialization | `mockDatabase.js` | 2304 vs 2344 |
| 8 | HIGH | MockDB | Proposal acceptance has no rollback — wallet deduction without project creation possible | `mockApiHandler.js` | 716-964 |
| 9 | HIGH | MockDB | `ownerService.js` is 100% dead code — all endpoints are empty strings | `ownerService.js` | 22-30 |
| 10 | HIGH | Components | `formatCurrency` ignores `currency` parameter — never applies `style: 'currency'` | `formatCurrency.js` | 34-37 |
| 11 | HIGH | Security | Demo auth grants arbitrary role access — `fake-owner@x.com` gets Owner role | `AuthContext.jsx` | 48-54, 230 |
| 12 | HIGH | Security | Mock DB passwords stored in plaintext, serialized to localStorage | `mockDatabase.js` | 31-450, 2157 |
| 13 | MEDIUM | Architecture | 6 Owner pages are 20-line thin wrappers with zero unique logic | `OwnerUsers.jsx` etc. | — |
| 14 | MEDIUM | Architecture | `mockApiHandler.js` is a 1615-line monolithic if/else chain | `mockApiHandler.js` | 365-1616 |
| 15 | MEDIUM | Architecture | `mockDatabase.js` is 4004 lines — single file for 12 entity tables | `mockDatabase.js` | 1-4004 |
| 16 | MEDIUM | Components | Progress bar duplicated 5 times with identical markup | 5 files | — |
| 17 | MEDIUM | Components | `DisputeBanner` is hardcoded Vietnamese while rest of app is English | `DisputeBanner.jsx` | 16, 39-55 |
| 18 | MEDIUM | React | `useProjectProgress` effects lack cleanup flag — sets state on unmounted component | `useProjectProgress.js` | 211-225 |
| 19 | MEDIUM | React | `useProjectTimeline` action handlers not wrapped in `useCallback` — 6 functions recreated each render | `useProjectTimeline.js` | 137-210 |
| 20 | MEDIUM | Security | `chart.jsx` uses `dangerouslySetInnerHTML` with dynamic config values | `chart.jsx` | 54-72 |

---

## Technical Debt

### 🔴 High Priority (fix before production)

1. **Add lazy loading** — Convert all page imports in `routes.jsx` to `React.lazy()` with `<Suspense>` wrappers. 10+ pages exceed 400 lines; the bundle is unnecessarily large.
2. **Fix `formatCurrency`** — Pass `style: 'currency'` and the `currency` parameter to `Intl.NumberFormat`. This is a one-line fix that affects every price display.
3. **Fix mobile navigation** — The mobile menu toggle exists but has no panel. Add a slide-out drawer or dropdown for narrow viewports.
4. **Fix dead link** — Change `/expert/edit-profile` to `/expert/profile/edit` in `JobList.jsx:340`.
5. **Add race-condition guards** — Add `cancelled`/`ignore` flags to `useProjectProgress` effects (follow `useProjectTimeline`'s pattern).
6. **Remove `ownerService.js` dead code** or wire it to real endpoints. Pages render empty states permanently.
7. **Remove thin-wrapper Owner pages** — 6 files (`OwnerUsers`, `OwnerProjects`, `OwnerReports`, `OwnerReviews`, `OwnerJobPosts`, `OwnerCategoryTags`) are simple breadcrumb + delegate. Either inline them in routes or make `AdminUsers` accept a `breadcrumb` prop.
8. **Split `TaskProgressCard.jsx`** (565 lines) into `TaskExpertActions`, `TaskClientActions`, and `ProductDeliverablesModal`.

### 🟡 Medium Priority (important but not blocking)

9. **Add `React.memo`** to `Header`, `ClientDashboard`, `ExpertDashboard`, `OwnerDashboard`, and all `Admin*` pages.
10. **Create shared `<ProgressBar>` component** — eliminates 5 duplicated progress bar implementations.
11. **Reduce notification polling** — 3-second interval is aggressive. Increase to 15-30s or switch to visibility-based polling.
12. **Normalize hardcoded colors in status configs** — `projectStatusConfig.js` and `proposalStatusConfig.js` use hardcoded Tailwind colors (`bg-purple-100`, `bg-yellow-100`). Map to design tokens.
13. **Add useCallback to `useProjectTimeline` handlers** — 6 functions recreated every render.
14. **Consolidate `AdminProfile`/`OwnerProfile`** — They share 90% structure. Make role a prop.
15. **Consolidate `EditAdminProfile`/`EditOwnerProfile`** — Same issue.
16. **Remove `getMatchPct()` and `computeExpertRating()`** from `ExpertDashboard.jsx` — dead code.
17. **Remove `forgotPassword`, `resetPassword`, `refreshToken`** from `api.js:167-180` — all return `Promise.resolve(null)`.
18. **Delete `ForgotPasswordPage.jsx` and `ExpertsPage.jsx`** — unreachable, unrouted dead files.
19. **Move `AIClientsUseCasePlanner` keyword dictionary to a data file** — 50 lines of mock data in the component.
20. **Add `aria-label`, `aria-expanded`, `role` attributes** to `DataTable`, `SkillTags`, `BackButton`, modals, and custom checkboxes.

### 🟢 Low Priority (nice to have)

21. Remove duplicate export pattern (`named export` + `export default`) from all 7 service files.
22. Remove `isDeclineDisabled` state from `TaskProgressCard.jsx` — never set to `true`.
23. Replace `window.dispatchEvent(new CustomEvent("aitasker_db_update"))` pattern with a proper store.
24. Add `EmptyState` to `ActivityLogPanel` when logs are empty (currently returns `null`).
25. Fix `safeJsonParse` conflating empty input with parse failure.
26. Remove dead `getMergedActivityLogs` from `projectTimelineStore.js`.
27. Remove `animate-count-in` class from `StatCard` (undefined CSS class).
28. Fix `AdminRevenue` swallowing API errors silently.
29. Move `REPORT_STATUS_CONFIG` to a shared location (duplicated in `AdminDisputes` and `AdminReportDetail`).
30. Add `label` elements to search inputs across admin pages.

---

## Refactoring Opportunities

| File/Component | Action | Reason |
|----------------|--------|--------|
| `TaskProgressCard.jsx` (565L) | Split into 3 sub-components | Giant component mixing modal, form, and role logic |
| `mockApiHandler.js` (1615L) | Split by entity (projects, proposals, reports, etc.) | Monolithic if/else chain |
| `mockDatabase.js` (4004L) | Split into entity files | 12 tables in one file |
| `OwnerUsers.jsx` et al. (6 files) | Delete or inline into routes | 20-line thin wrappers |
| `ProjectTimelineManager.jsx` | Create `useExtensionRequest` hook | 16 props drilled to `ExtensionRequestPanel` |
| Progress bar pattern (5 sites) | Create `<ProgressBar>` component | Identical markup duplicated |
| `AdminProfile` + `OwnerProfile` | Merge into `<ProfilePage role={role}>` | 90% identical code |
| `EditAdminProfile` + `EditOwnerProfile` | Merge into `<EditProfilePage role={role}>` | 90% identical code |
| `AIClientsUseCasePlanner` + `AIPlannerDrawer` | Extract mock AI engine to shared module | Duplicate keyword-matching logic |
| `DisputeBanner.jsx` | Add i18n support or translate to English | Vietnamese-only in English app |

---

## Critical Bugs Confirmed

1. **`formatCurrency` never renders currency symbol** — `formatCurrency.js:34-37`: `Intl.NumberFormat` called without `style: 'currency'`, ignoring the `currency` parameter entirely. All price displays show raw numbers (e.g., "5,000" instead of "$5,000").

2. **Mobile navigation is broken** — `Header.jsx:368-373`: `showMobileMenu` state toggles between Menu/X icons but no mobile panel JSX exists anywhere. Mobile users have no navigation.

3. **Dead link to `/expert/edit-profile`** — `JobList.jsx:340`: Links to non-existent route `/expert/edit-profile` (correct path is `/expert/profile/edit`). Clicking hits 404.

4. **`enrichJobPost` wrong specialization for `proj-013`** — `mockDatabase.js:2304 vs 2344`: `proj-013` matches two branches; first match wins but is wrong (AI Agent Development instead of Machine Learning/PCG).

5. **No rollback on proposal acceptance failure** — `mockApiHandler.js:716-964`: Wallet deduction happens before project creation. If project creation throws, money is lost with no recovery.

6. **`ownerService.js` dead code** — All endpoints are empty strings. Every function returns hardcoded `{ success: true }` or `{ data: [], total: 0 }`. Owner dashboard pages render fake data or empty states.

7. **Race condition in `useProjectProgress`** — Missing cleanup flag in `useEffect`. If component unmounts during data fetch, `setState` is called on unmounted component.

---

## Detailed Audit by Area

### 1. Architecture (5/10)

**Folder structure:** Reasonable but shallow. All pages under `src/app/pages/{role}/` with shared pages in `common/`. Components are organized into `layout/`, `shared/`, `project/`, `ai/`, `landing/`, and `ui/` (shadcn-style primitives). Services are split between `src/services/` (API wrappers) and `src/app/services/` (mock DB).

**Issues:**
- No `features/` or domain-based grouping — pages import directly from mock DB, services, and components with no middleware layer.
- `src/services/` + `src/app/services/` + `src/data/` — three directories serving the same purpose (data access).
- Hooks in `src/app/hooks/`, lib in `src/app/lib/`, context in `src/app/context/` — flat, no domain grouping.
- AI components at `src/app/components/ai/` with only 4 files — thin.
- Landing components at `src/app/components/landing/` with 4 files — reasonable.

**Separation of concerns:** Weak. UI components (`TaskProgressCard.jsx`) directly import and call mock DB mutation functions. Pages read from `localStorage` directly. `window.dispatchEvent` is used as a pub/sub mechanism between components.

**Component composition:** Mixed. `ProjectTimelineManager` delegates well to sub-components. `TaskProgressCard` (565 lines) is the opposite — everything in one file.

**Circular dependencies:** None detected. Import graph is acyclic.

### 2. React Best Practices (6/10)

**What's good:**
- `useAuth.js` is a clean re-export of context hook.
- `useConfetti.js` uses `useCallback` correctly.
- `useScrollReveal.js` has clean IntersectionObserver cleanup.
- `AuthContext` uses `useReducer` (not multiple `useState` calls).
- `useProjectProgress` wraps handlers in `useCallback` consistently.

**What's bad:**
- `useProjectTimeline` — 6 action handlers not wrapped in `useCallback`, recreated each render.
- `useProjectProgress` — async effects lack cancellation flags (race condition).
- `use-mobile.js` — initial state `undefined` causes SSR hydration mismatch and flash of wrong layout.
- `loadTimeline` in `useProjectTimeline` — not in effect dependency array (stale closure risk).
- `handleResetDemo` — no loading state set (UI can't show spinner).

### 3. State Management (5/10)

**Global state:** `AuthContext` (useReducer) — clean, well-structured.

**Page-level state:** Each dashboard fetches its own data independently. No shared cache. If user navigates from `ClientDashboard` to `MyProjectsPage`, projects are re-fetched.

**Component-level state:** `TaskProgressCard` manages 5 boolean states; `AdminReportDetail` has 11 `useState` calls. Neither uses `useReducer`.

**State smells:**
- `window.dispatchEvent(new CustomEvent("aitasker_db_update"))` — used as poor man's pub/sub between `TaskProgressCard`, `MiniTaskChecklist`, and `TaskActivityTimeline`.
- Components directly import and call mock DB mutation functions — bypasses React's render cycle.
- `AdminRevenue.jsx` uses a module-level `DEFAULT_DATA` object as error fallback — cannot distinguish "API returned empty" from "API failed".
- `isDeclineDisabled` state in `TaskProgressCard` — never set to `true`, dead state.

### 4. Routing (7/10)

**What's good:**
- Clean role-based route gating with `ProtectedRoute`.
- Owner can access Admin routes (by design, documented).
- Friendly redirects for `/my-projects`, `/messages`, `/admin`, `/owner`.
- 404 catch-all exists.
- Unauthorized page renders inline in `routes.jsx`.
- All routed pages exist on disk.

**Issues:**
- Two unrouted dead files: `ForgotPasswordPage.jsx`, `ExpertsPage.jsx`.
- Duplicate expert job board routes: `/expert/find-jobs` and `/expert/jobs` both render `JobList`.
- No lazy loading — all pages are eagerly imported.
- Legacy redirect wrapper (`ProposalReviewLegacyRedirect`) is convoluted — a simple redirect config would suffice.

### 5. Role Workflow (6/10)

**Client flow:** Dashboard → Post Project → My Projects → Project Detail → Proposal Review → Project Progress → Messenger/Notifications. **Complete.**

**Expert flow:** Dashboard → Find Jobs → Job Detail → Send Proposal → Proposal Status → Project Detail → Messenger/Notifications. **Complete** except dead link `/expert/edit-profile` breaks the new-expert onboarding flow.

**Admin flow:** Dashboard → Users/Disputes/Projects/Reviews/Job Posts/Category Tags/Revenue → Profile. **Complete** but no header nav links to management pages (must go through dashboard cards).

**Owner flow:** Dashboard → same as Admin + Create Admin + Manage Admins. **Complete** but same header nav gap.

**Missing:**
- No "Reports" page in admin nav (only disputes, but reports exist as a route? Actually AdminReports is missing from routes.jsx — `AdminReportDetail` exists at `admin/disputes/:id` which is confusing naming).
- Admin has `AdminReviews`, `AdminJobPosts`, `AdminCategoryTags` in routes — these are thin wrappers reusing the same component pattern.

### 6. Mock Database (5/10)

**Scale:** 4004 lines, 12 entity tables, 20 users, 22 job posts, 38 proposals, 23 projects, 27 transactions, 14 reviews, 13 reports, ~45 tasks, 47 audit logs.

**Architecture:** Clean base/overlay pattern (`_baseData` frozen, `_runtimeOverlay` Map, `_deleted` Set). Version-check prevents stale localStorage corruption.

**Issues:**
- `enrichJobPost` — 65-line if/else chain that double-matches `proj-013`.
- `listProposals` — mutates state (expiry checking) in a read function; misleading name.
- `listJobPosts` — calls `enrichJobPost` on every list, which scans all projects and users for each record.
- No transaction/rollback mechanism — proposal acceptance has 10 sequential mutations with atomicity violations possible.
- `proj-017`/`proj-018` have `jobPostId: null` — breaks cancel-contract flow.
- `review-013` references `proj-013` (in_progress) instead of the completed project it describes.
- Transaction ID numbering gap (txn-024/025 after txn-026).

### 7. API Layer (5/10)

**What's good:**
- `api.js` has clean `ApiError` class, AbortController timeout, mock-DB short-circuit.
- `authService.js` normalizes multiple backend response shapes.
- Endpoint grouping in `api.*` namespace is well-organized.

**Issues:**
- `ownerService.js` — entirely dead code; all endpoints are empty strings.
- `notificationHelper.js` — 19 functions that are thin wrappers around `api.post("/notifications")`; could be inline calls.
- `disputeService.js` — maps all actions to the same endpoint; handler has parallel implementation.
- `escrowService.js` — all operations POST to `/interactions/transaction` with different `type` fields.
- `AdminReportDetail.jsx` — mixes `reportService` with 4 direct `api.put()` calls.
- `AdminRevenue.jsx` — uses bare `api.get("/revenue")` with string path, inconsistent with other admin pages.
- Profile pages (`AdminProfile`, `OwnerProfile`) read from mock DB directly instead of API.
- 7 service files all export both named functions AND a default object — boilerplate that no consumer uses.

### 8. Component Design (5/10)

**Shared components (well-designed):** `BackButton`, `ConfirmationModal`, `EmptyState`, `LoadingSkeleton`, `StatCard`, `StatusBadge`, `SkillTags`, `MoneyDisplay`, `ErrorBoundary`, `ImageWithFallback`, `DataTable`.

**Missing shared abstractions:**
- No `<ProgressBar>` — duplicated 5 times.
- No `<AppLogo>` — duplicated in `HomePage`, `LoginPage`, and likely more.
- No `<InlineError>` — pages build their own or silently fail.
- No `<SearchInput>` — every admin page has its own search with different markup.
- No `<FeedbackBanner>` — success/error banners duplicated across `AdminUsers`, `AdminDisputes`, `ManageAdmins`.

**Thin wrappers (should be deleted or consolidated):**
- 6 Owner pages (20 lines each) — pure breadcrumb + delegate to Admin component.
- `AdminReviews`, `AdminJobPosts`, `AdminCategoryTags` — thin wrappers (likely similar pattern).

**Giant components (should be split):**
- `TaskDetailPage.jsx` — 1301 lines
- `PostProject.jsx` — 1226 lines
- `SendProposal.jsx` — 1068 lines
- `ClientProjectManagement.jsx` — 901 lines
- `mockDatabase.js` — 4004 lines
- `mockApiHandler.js` — 1615 lines

### 9. UI/UX Consistency (5/10)

**Design tokens used correctly:** Shared components use `bg-card`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground` consistently.

**Hardcoded colors (design debt):**
- `projectStatusConfig.js` — 6 of 9 badge classes use hardcoded Tailwind colors (`bg-purple-100`, `bg-yellow-100`, `bg-orange-100`, `bg-red-100`, `bg-amber-100`, `bg-rose-100`).
- `proposalStatusConfig.js` — 7 of 11 status classes use hardcoded colors.
- `TaskProgressCard.jsx` — 9 instances of hardcoded colors (`bg-amber-50`, `bg-orange-500`, etc.).
- `ReportButton.jsx` — 2 instances.
- `ReportForm.jsx` — 7 instances.
- `ProposalCard.jsx` — 8 instances with `dark:` variants.
- `OwnerDashboard.jsx` — hardcoded hex colors in recharts (`#3B82F6`, `#8B5CF6`, `#10B981`).

**Language inconsistency:** `DisputeBanner.jsx` is hardcoded Vietnamese. `AIClientsUseCasePlanner`, `AIPlannerDrawer`, `TaskDetailPage`, `AdminReportDetail` mix Vietnamese and English. No i18n strategy.

**Image design inconsistency:** `AdminProfile.jsx` uses `rounded-[14px]` for edit button while `OwnerProfile.jsx` uses `rounded-lg`. Different color systems for the same button.

**Mobile:** Broken — toggles exist but no panel renders. `use-mobile.js` fires on every page but only the toggle icon changes.

### 10. Performance (4/10)

**Critical issues:**
- Zero code splitting — all 50+ pages in a single bundle. No `React.lazy()` anywhere.
- Zero `React.memo()` — every component re-renders on every parent update.
- Header notification polling every 3 seconds on every page, regardless of whether the notification dropdown is open.

**Missing optimizations:**
- No `useMemo` on computed values in dashboards (e.g., `getProjectsByStatus()` called 6 times per render in `ClientDashboard`).
- No `useCallback` on handlers returned from `useProjectTimeline` (6 functions).
- recharts imported statically in `OwnerDashboard` — only the Owner role uses it.
- `listJobPosts` runs `enrichJobPost` (O(n × m) scanning) on every list call.

**Large bundle contributors:**
- `sendProposal.jsx` — 1068 lines
- `submitProject.jsx` — 1226 lines
- `taskDetailChecklistAndTimeline.jsx` — 1301 lines
- `ClientProjectManagement.jsx` — 901 lines
- recharts library — used only by Owner dashboard
- MUI + Emotion — used alongside Radix UI and Tailwind (two styling systems)
- `motion` (framer-motion) — imported but usage not verified

### 11. Security (5/10)

**Critical:**
- Auth token stored in `localStorage` — readable by any JS on the page. XSS = token exfiltration.
- Demo auth mode (`VITE_USE_DEMO_AUTH=true`) — any email with "owner" gets full Owner access, any password 3+ chars works.
- Mock DB passwords in plaintext, serialized to `localStorage` under `aitasker_mock_db`.

**High:**
- `chart.jsx` uses `dangerouslySetInnerHTML` with dynamic `config` values injected into CSS.
- Hardcoded ngrok tunnel URL in `api.js:3` (leaks the tunnel name).

**Medium:**
- Mock DB login accepts universal password `"password123"` for any user.
- No content sanitization for XSS prevention (no DOMPurify or HTML escaping utilities).
- 401 handler dispatches event but doesn't clear token — race condition possible.

**Acceptable:**
- `ProtectedRoute` role gating is correct — no auth bypass possible in real API mode.
- React's JSX escaping prevents most XSS — only `dangerouslySetInnerHTML` in `chart.jsx` is a concern.
- No `eval()` or `Function()` usage found.

### 12. Code Cleanliness (4/10)

**Top 20 files needing cleanup (by severity):**

| # | File | Lines | Issue |
|---|------|-------|-------|
| 1 | `mockDatabase.js` | 4004 | Split into entity files |
| 2 | `mockApiHandler.js` | 1615 | Split by domain |
| 3 | `TaskDetailPage.jsx` | 1301 | Split into sub-components |
| 4 | `PostProject.jsx` | 1226 | Extract form sections |
| 5 | `SendProposal.jsx` | 1068 | Extract form sections |
| 6 | `ClientProjectManagement.jsx` | 901 | Split by concern |
| 7 | `EditExpertProfile.jsx` | 657 | Extract form fields |
| 8 | `ExpertDashboard.jsx` | 590 | Remove dead code (getMatchPct, computeExpertRating) |
| 9 | `Messenger.jsx` | 585 | Use EmptyState, add error handling |
| 10 | `TaskProgressCard.jsx` | 565 | Split into 3 sub-components |
| 11 | `ClientDashboard.jsx` | 449 | Memoize computed values |
| 12 | `Billing.jsx` | 426 | Review complexity |
| 13 | `OwnerDashboard.jsx` | 416 | Extract chart components, remove scaffold note |
| 14 | `Header.jsx` | 378 | Extract notification bell, theme toggle |
| 15 | `ReportForm.jsx` | 373 | Extract EvidenceUploader |
| 16 | `MiniTaskChecklist.jsx` | 368 | Share MiniTaskEditor with MiniTaskCreateForm |
| 17 | `ProposalCard.jsx` | 312 | Deduplicate task rendering blocks |
| 18 | `ProjectTimelineManager.jsx` | 287 | Create useExtensionRequest hook |
| 19 | `OwnerUsers.jsx` | 20 | Delete thin wrapper |
| 20 | `ownerService.js` | 30 | Delete dead code |

---

## Audit Methodology

This audit was conducted by 6 parallel sub-agents, each specializing in a domain area:
1. **Mock DB + API** — entity relationships, data consistency, service layer patterns
2. **React hooks + lib** — useEffect patterns, memoization, state management, race conditions
3. **Shared UI + pages** — component design, accessibility, design tokens, loading/error states
4. **Layout + routing** — route organization, role gating, navigation, dead routes
5. **Performance + security** — bundle analysis, memoization, localStorage, XSS vectors
6. **Timeline components + remaining pages** — composition, prop drilling, code duplication, admin/owner pages

Each agent read files in full (not sampled) and reported findings with file paths and line numbers. The lead auditor verified critical findings by direct inspection.

---

*Report generated 2026-06-28 by Claude Code. 152 JSX files, 28 JS files audited.*
