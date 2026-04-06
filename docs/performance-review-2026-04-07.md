# Syncrio Performance Review

Date: 2026-04-07

## Executive Summary

The slowness is primarily architectural, not visual.

The app currently behaves like a set of large standalone client pages instead of a persistent App Router application shell. On every route change, the sidebar, top controls, auth checks, and page-level data loaders remount. Each page then issues fresh client-side requests, so navigation feels like a full reload even when Next.js is doing a client transition.

The second major issue is that the data layer has no shared client cache. The same resources, especially `social_accounts`, posts, dashboard stats, and analytics, are fetched independently on multiple pages and components. Some pages also force extra refreshes on focus/visibility, and the Posts screen triggers cleanup APIs immediately after loading data.

The third major issue is API latency. Several endpoints run many database queries per request, and the analytics route performs external Bundle.social requests in series. That creates slow time-to-data even after the page has already mounted.

## What I Found

### 1. No persistent authenticated route layout

There is only one app layout at `app/layout.tsx`, and it wraps the whole site with providers. There is no nested authenticated layout for dashboard routes, and there are no route-level `loading.tsx` files under `app/`.

Because of that, each app page renders its own shell:

- `app/dashboard/page.tsx:612`
- `app/analytics/page.tsx:101`
- `app/posts/page.tsx:902`
- `app/calendar/page.tsx:1153`
- `app/integrations/page.tsx:415`
- `app/settings/page.tsx:64`
- `app/create/page.tsx:95`

Each of those pages also owns its own `collapsed` sidebar state and localStorage sync:

- `app/dashboard/page.tsx:122`
- `app/analytics/page.tsx:20`
- `app/posts/page.tsx:96`
- `app/calendar/page.tsx:76`
- `app/integrations/page.tsx:122`
- `app/settings/page.tsx:16`
- `app/create/page.tsx:57`

Impact:

- layout shell remounts on every navigation
- page transitions lose continuity
- every page repeats setup work before content appears
- App Router layout reuse benefits are largely not being used

### 2. Most important pages are large client components

The biggest page files are very large:

- `app/posts/page.tsx` ~76 KB
- `app/calendar/page.tsx` ~65 KB
- `app/page.tsx` ~59 KB
- `app/integrations/page.tsx` ~53 KB
- `app/dashboard/page.tsx` ~48 KB

This increases JavaScript parse, hydrate, and render cost. The size by itself is not the bug, but it amplifies every navigation because the app is page-centric and client-heavy.

### 3. Pages refetch their own data after auth resolves

Examples:

- Dashboard fetches stats and notifications after session mount:
  - `app/dashboard/page.tsx:160`
  - `app/dashboard/page.tsx:161`
- Dashboard calendar data fetches again when month changes:
  - `app/dashboard/page.tsx:509`
- Posts fetch on session load:
  - `app/posts/page.tsx:114`
- Analytics fetches overview plus account list:
  - `components/analytics/analytics-overview.tsx:280`
  - `components/analytics/analytics-overview.tsx:287`
- Create page fetches social accounts through the hook:
  - `hooks/use-create-post-v2.ts:207`
  - `hooks/use-create-post-v2.ts:239`
- Integrations fetches social accounts on mount:
  - `app/integrations/page.tsx` via `fetchSocialAccounts()`

There is no shared query cache coordinating these requests across routes.

### 4. The same `social_accounts` data is fetched repeatedly in different places

The same account list is fetched from `/api/social/accounts` in:

- `hooks/use-create-post-v2.ts:207`
- `components/analytics/analytics-overview.tsx:471`
- `app/integrations/page.tsx:148`
- `components/social/ChannelSelector.tsx:46`
- `components/social/social-accounts-manager.tsx:74`

This is a strong contributor to the “data loads every time I navigate” feeling.

### 5. Posts page triggers extra server work during normal page load

Posts loads posts and then immediately runs duplicate cleanup:

- initial fetch: `app/posts/page.tsx:216`
- immediate cleanup call: `app/posts/page.tsx:229`
- cleanup API trigger: `app/posts/page.tsx:262`
- follow-up refresh after cleanup: `app/posts/page.tsx:274`

The page also refetches in the background on focus and when the tab becomes visible:

- `app/posts/page.tsx:173`
- `app/posts/page.tsx:176`
- listeners: `app/posts/page.tsx:179`, `app/posts/page.tsx:180`

Impact:

- normal navigation can cause fetch -> cleanup mutation -> fetch again
- focus/visibility causes more background traffic than necessary
- page feels unstable and busy

### 6. Calendar intentionally disables browser caching

The calendar page sends:

- `app/calendar/page.tsx:138` with `Cache-Control: no-cache`

That guarantees a fresh network round trip even when the month data was just loaded recently.

### 7. Some navigation paths still force hard reload behavior

Examples:

- sign-out redirects with `window.location.href`:
  - `components/providers/auth-provider.tsx:37`
- calendar “create” buttons use `window.location.href`:
  - `app/calendar/page.tsx:1139`
  - `app/calendar/page.tsx:1237`
- analytics overview includes `window.location.reload()`:
  - `components/analytics/analytics-overview.tsx:997`

These bypass smooth in-app transitions and reset client state.

### 8. API auth adds extra work to every protected request

The shared API auth middleware does:

- `supabase.auth.getUser()` on every request: `lib/middleware.ts:13`
- then fetches the user profile and subscription: `lib/middleware.ts:24`

That means every dashboard, posts, calendar, and analytics request pays auth lookup cost plus an extra DB read before the real handler even starts.

### 9. Dashboard stats API is chatty

`app/api/dashboard/stats/route.ts` performs multiple reads:

- social accounts query: `app/api/dashboard/stats/route.ts:30`
- full posts query with publications join: `app/api/dashboard/stats/route.ts:60`
- exact total count query: `app/api/dashboard/stats/route.ts:103`
- monthly count query: `app/api/dashboard/stats/route.ts:108`
- recent posts query: `app/api/dashboard/stats/route.ts:116`
- analytics join query further down in the same handler

Impact:

- dashboard depends on several sequential DB calls
- slowest subquery determines the first meaningful paint of dashboard data

### 10. Analytics overview can be slow because external calls are serial

`app/api/analytics/overview/route.ts`:

- loads all connected social accounts: `app/api/analytics/overview/route.ts:35`
- iterates accounts in a `for ... of` loop: `app/api/analytics/overview/route.ts:47`
- performs external Bundle fetch per account: `app/api/analytics/overview/route.ts:102`

The code does use a one-hour cache, which helps repeat requests, but cold or forced refreshes still do remote calls one account at a time.

Impact:

- analytics waits on external network latency
- multiple connected accounts multiply response time
- user sees loading spinners longer than necessary

### 11. `/api/social/accounts` is a hot endpoint across the app

The route itself is simple:

- GET handler: `app/api/social/accounts/route.ts:106`
- DB read: `app/api/social/accounts/route.ts:114`

But because many pages independently call it, it becomes a system-wide hotspot. This is a cache-orchestration problem more than a handler problem.

### 12. Production build is currently unhealthy

I verified `npm run build`. It does not complete successfully.

Observed result:

- compile succeeds
- build fails during page data collection with `PageNotFoundError: Cannot find module for page: /_document`

Impact:

- production verification is incomplete
- bundle and route output stats are harder to trust
- deployment performance may differ from local development behavior

## Why Navigation Feels Slow

The current navigation flow is roughly:

1. user clicks a route
2. current page unmounts
3. new page mounts its own shell
4. auth provider/page logic settles
5. page-level effects fire
6. page requests its own data
7. some pages then trigger more follow-up requests

That is why the app feels heavy. The slowness is not mainly from CSS or visual richness. It is from repeated mount + refetch + recompute cycles.

## Root Causes Ranked

### Highest impact

1. Missing persistent dashboard route layout
2. No shared client cache for API data
3. Heavy client-only pages with page-local fetch logic
4. Repeated fetching of the same resources across routes

### Medium impact

5. Overeager refresh rules on focus/visibility
6. Expensive dashboard stats endpoint
7. Serial external analytics fetching
8. Hard reload navigation in some flows

### Lower impact but worth fixing

9. Duplicate-cleanup work in the hot path of Posts page
10. Build instability
11. Repeated sidebar/localStorage logic across pages

## Recommended Fix Plan

### Phase 1: Fastest wins

1. Create an authenticated route group layout, for example `app/(app)/layout.tsx`, and move `Sidebar`, `TopRightControls`, auth gating, and collapsed-state persistence there.
2. Add route-level `loading.tsx` files for the major app routes.
3. Stop using `window.location.href` for internal navigation and use `Link` or `router.push`.
4. Remove `Cache-Control: no-cache` from the calendar fetch unless the user explicitly refreshes.
5. Remove duplicate-cleanup APIs from the normal page-load path and move that work to:
   - write-time validation
   - admin maintenance job
   - explicit one-off repair action

### Phase 2: Shared client data layer

Adopt one shared cache for app data.

Best fit here: `@tanstack/react-query`

Why:

- best control over `staleTime`, `gcTime`, background refetch, optimistic updates, and invalidation
- ideal when the app has many route-level data dependencies and mutations
- fits the current client-heavy architecture while you gradually move data server-side

Good secondary option: use the already-installed `swr` package for lighter screens if you want minimal setup, but it is less complete for mutation-heavy flows than TanStack Query.

Suggested first query keys:

- `['auth-user']`
- `['social-accounts']`
- `['dashboard-stats']`
- `['dashboard-posts', month, year]`
- `['posts', filters]`
- `['analytics-overview', params]`

Suggested defaults:

- `staleTime`: 30s to 5m depending on resource
- `refetchOnWindowFocus`: off by default for heavy queries
- `refetchOnReconnect`: on
- optimistic updates for publish/schedule/edit/delete

### Phase 3: Move hot reads to server-driven rendering

For the highest-value routes:

- dashboard
- posts
- calendar
- analytics shell

Move first-render data loading into server components where possible, then hydrate the client cache with initial data. That gives faster first paint and keeps client navigation warm.

### Phase 4: Make APIs cheaper

1. Dashboard stats:
   - collapse repeated reads into fewer queries or DB views/RPCs
   - pre-aggregate monthly counters
   - cache short-lived dashboard summaries server-side
2. Analytics overview:
   - fetch remote account analytics concurrently with bounded `Promise.all`
   - continue caching results in `analytics_cache`
   - refresh cold data in the background instead of blocking UI when possible
3. Auth middleware:
   - avoid fetching full profile data on every API call when it is not needed
   - split auth-only middleware from subscription-aware middleware

### Phase 5: Background sync and instant-feeling UX

1. Use optimistic UI for:
   - publish now
   - schedule/reschedule
   - account toggle active/inactive
   - post edit/delete
2. Queue mutation retries when offline or transiently failed.
3. Revalidate in the background after navigation instead of blocking page display.
4. Use skeletons that match final layout so route changes feel immediate.
5. Prefetch route data the moment links enter the viewport or on hover for the major app destinations.

## Recommended Dependencies / Tech

### Strong recommendations

#### `@tanstack/react-query`

Use for:

- cross-route API caching
- stale-while-revalidate behavior
- optimistic updates
- mutation invalidation
- background refresh without full page loading spinners

Expected benefit:

- removes repeated fetches when moving between dashboard, posts, calendar, create, and analytics
- gives instant back/forward navigation for recently visited pages

#### `@next/bundle-analyzer`

Use for:

- identifying oversized page bundles
- validating chunk splitting after layout/page refactors

Expected benefit:

- helps reduce route payloads after the large page files are broken up

### Good recommendations

#### `serwist`

Use for:

- service worker setup in Next.js
- runtime caching
- background sync queues for failed POST/PUT/DELETE requests

Expected benefit:

- better resilience on flaky networks
- lets the app feel more reliable without changing the visible UX

#### Existing `swr`

This is already in `package.json` but not currently used.

Use only if you want a lighter caching layer on simpler read-only screens. For this app, TanStack Query is the stronger primary choice.

### Conditional recommendations

#### `BroadcastChannel`

Use for:

- syncing invalidation events between tabs
- keeping posts/account state consistent without full reloads

#### Server-side queue / cron refresh

Use for:

- analytics refresh jobs
- duplicate cleanup
- import status refresh

This can be done with Supabase scheduled jobs, Edge Functions, or an app-owned worker pattern, depending on your deployment plan.

## Best-Practice Guidance From Current Docs

The current external guidance aligns very closely with what this codebase is missing:

1. Next.js App Router gets its smoothest navigation from shared layouts, streaming, and route-level loading UI.
2. Query libraries should keep data fresh in the background instead of refetching everything on every mount.
3. Background Sync is useful for failed write operations, but it should not be the primary read strategy.
4. Stale-while-revalidate is the right mental model for an instant-feeling dashboard app.

Useful references:

- Next.js linking, navigation, streaming, and `loading.tsx`:
  - https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating
- Next.js App Router layouts and reusable rendering model:
  - https://nextjs.org/docs/app/getting-started/layouts-and-pages
- TanStack Query important defaults:
  - https://tanstack.com/query/v3/guides/important-defaults
- SWR mental model:
  - https://swr.vercel.app/docs/advanced/understanding
- Workbox background sync:
  - https://developer.chrome.com/docs/workbox/modules/workbox-background-sync
- Background Sync API support caveat:
  - https://developer.mozilla.org/en-US/docs/Web/API/SyncManager
- Stale-while-revalidate strategy overview:
  - https://web.dev/articles/stale-while-revalidate

## Recommended Implementation Order

### Week 1

1. Add `app/(app)/layout.tsx`
2. Centralize sidebar/topbar/auth gating there
3. Replace hard reload navigation
4. Add `loading.tsx` for dashboard, posts, calendar, analytics, integrations, create

### Week 2

1. Introduce `@tanstack/react-query`
2. Centralize `social-accounts` query
3. Centralize `dashboard-stats`, `posts`, and `calendar` queries
4. Turn off aggressive focus refetch for heavy screens

### Week 3

1. Remove cleanup-from-load behavior
2. Parallelize external analytics fetches
3. Split auth-only vs subscription-aware middleware
4. Add short-lived server caching for dashboard summaries

### Week 4

1. Add service worker runtime caching
2. Add background sync for write operations
3. Add bundle analysis and trim oversized page chunks
4. Fix the production build failure

## Final Assessment

The app can become dramatically faster without changing the UI direction.

The biggest unlock is not visual simplification. It is:

- persistent layout reuse
- shared cached data
- background revalidation instead of mount-time blocking fetches
- cheaper server endpoints

If those four things are addressed, the app should move from “heavy and reloading” to “instant and continuous” without sacrificing functionality.
