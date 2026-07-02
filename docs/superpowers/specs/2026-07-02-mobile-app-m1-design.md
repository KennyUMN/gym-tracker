# Design: Gym Tracker Mobile App — M1 (Phase 1 MVP)

**Status:** Approved
**Date:** 2026-07-02
**Scope:** Phase 1 / M1 only, per `gymtrackermobileprd.md`. Phases 2–4 (RPE autoregulation, AI coaching chat, pose estimation) are explicitly out of scope and will get their own design cycles after M1 ships.

## 1. Problem

The existing gym-tracker is a Next.js web app. The PRD's premise is that people train with their phone, not a laptop, and a browser tab doesn't give the "real installable app" impression the PRD's portfolio goals require (native push, offline SQLite, install-from-store artifact). M1 is the smallest slice that proves the core differentiator — a progression engine that tells the user what to lift next — works end-to-end on a real mobile device, including offline.

## 2. Goals (M1 exit criteria)

A user can, on a physical Android device:
1. Sign up / log in (Supabase email/password, same backend as the web app)
2. Create a routine (pick exercises from the existing 1,324-exercise dataset, set target sets/rep range)
3. Start a workout from that routine and log sets **with the phone in airplane mode**
4. Reconnect — logged data syncs to Supabase
5. On the next session, see a correct rule-based suggested weight for each exercise, computed from that logged history

## 3. Non-goals

- RPE logging, 1RM estimation, autoregulation, deload suggestions (Phase 2)
- AI chat / RAG assistant (Phase 3)
- Push notifications (not listed in PRD §5.1 MVP scope; deferred)
- Pose estimation / CV (Phase 4)
- Play Store / App Store public listing, monetization
- Social features
- Retiring or changing the existing web app's functionality

## 4. Repo restructure: monorepo

Convert `gym-tracker` to a **pnpm workspace** monorepo. Rationale: pnpm is already installed, it's the standard tool for this, and it avoids the phantom-dependency problems npm workspaces has. This is a bigger lever than the mobile app itself, so it happens first and is verified in isolation before any mobile code is written.

```
gym-tracker/
├── apps/
│   ├── web/                  # existing Next.js app, moved as-is
│   │   └── (current src/, tests/, next.config.ts, etc.)
│   └── mobile/                # new Expo app
├── packages/
│   └── engine/                  # progression.ts + its dependent types, extracted
│       ├── src/
│       │   ├── progression.ts
│       │   ├── types.ts
│       │   └── index.ts
│       ├── tests/
│       │   └── progression.test.ts
│       └── package.json
├── supabase/                      # schema stays at root, shared by both apps
├── pnpm-workspace.yaml
├── package.json                     # root workspace scripts (dev:web, dev:mobile, test)
└── docs/
```

**Migration steps, in order, each independently verified:**
1. Move `src/`, `tests/`, `vitest.config.ts`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `public/` into `apps/web/`. Update any root-relative imports/configs as needed.
2. Verify: `pnpm --filter web build` succeeds, `pnpm --filter web test` passes (all 21 tests), routes still resolve as they do today.
3. Extract `src/engine/progression.ts` and its type dependencies (`ProgressionContext`, `ProgressionState`, `ProgressionRecommendation`, `ProgressionRule`, `WorkoutSet`, `Exercise` — only the subset the engine actually touches) into `packages/engine`. Leave `apps/web`'s remaining domain types (`Routine`, `WorkoutSession`, etc. — anything UI/DB-shape-only, not engine input/output) in `apps/web/src/types`.
4. Update `apps/web` to import the engine from `@gym-tracker/engine` instead of its local `src/engine/progression.ts`; delete the local copy.
5. Move `tests/progression.test.ts` into `packages/engine/tests/`, update its import path.
6. Verify: `pnpm --filter web build` and `pnpm --filter engine test` both pass. The web app's behavior must be unchanged — this step is pure extraction, no logic changes.
7. Only after steps 1–6 are green: scaffold `apps/mobile` with Expo.

## 5. Mobile app architecture

- **Expo, managed workflow.** Nothing in M1 needs a native module outside Expo's SDK; ejecting is unnecessary complexity.
- **Expo Router** for file-based navigation — same mental model as the Next.js App Router already in use.
- **NativeWind** (Tailwind for React Native) for styling, keeping utility-class continuity with the web app.
- **TypeScript** throughout, matching the rest of the repo.

### Screens (M1)

| Screen | Purpose |
|---|---|
| `auth/login`, `auth/signup` | Supabase email/password, mirrors web app's flow |
| `routines/index` | List of the user's routines |
| `routines/[id]/edit` | Routine builder: search/pick exercises, set target sets/rep range |
| `exercises/index` | Browse/search the exercise dataset (name, muscle group, equipment filter) |
| `workout/active` | Active session: shows suggested weight per exercise, logs sets, rest timer |
| `history/index` | Per-exercise history list |
| `history/[exerciseId]` | Weight/volume trend for one exercise |
| `settings/index` | Unit system, experience level, plate increments, sign out — mirrors web app's settings |

## 6. Offline-first data flow

- **Local SQLite** (`expo-sqlite`) is the source of truth for anything written during an active workout. A set logged offline writes to SQLite immediately — the UI never blocks on network.
- A `sync_queue` table records pending mutations:
  ```sql
  CREATE TABLE sync_queue (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,      -- 'workout_session' | 'workout_set' | 'routine' | 'routine_exercise'
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,        -- 'insert' | 'update' | 'delete'
    payload_json TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  ```
- A sync process runs on app foreground and on network reconnect (via `@react-native-community/netinfo`): replays unsynced rows to Supabase in `created_at` order, marks each `synced = 1` on success, retains failed rows for retry.
- **Conflict resolution: last-write-wins.** Per the PRD, this is an explicitly acceptable simplification for a portfolio project — no vector clocks, no merge UI.
- Routines and the exercise library are read from Supabase via TanStack Query with local caching (React Query's persisted cache), so browsing/starting a workout from a previously-loaded routine works offline too, not just set-logging.

## 7. Progression engine reuse

Both apps depend on `@gym-tracker/engine` (workspace package). The mobile app calls it as a **local pure function** against data already cached in SQLite/React Query — no network round trip for the recommendation itself, so it renders instantly even offline. This matches the PRD's non-functional latency requirement (suggestion must render instantly; only the AI chat, out of scope here, tolerates round-trip latency).

## 8. Auth

Identical approach to the web app: Supabase `signUp` / `signInWithPassword`, same Supabase project and `profiles` table (with its existing `handle_new_user` trigger) — an account works interchangeably on web and mobile. Session persistence uses Supabase's Expo-compatible storage adapter (`expo-secure-store` or `AsyncStorage`, per Supabase's official Expo guide) so login survives app restarts.

## 9. Error handling

- Sync failures (network drop mid-sync, Supabase error) leave the row `synced = 0` and retry on the next sync trigger — never silently drop a logged set.
- Auth errors surface inline on the login/signup form (mirrors web app's existing pattern).
- If SQLite read/write fails unexpectedly (corrupt DB, disk full) — surface a visible error rather than silently losing the in-progress workout; this is health-adjacent data and must not fail silently.

## 10. Testing

- `packages/engine` keeps its existing 21 Vitest unit tests, moved unchanged — this is the correctness backbone the PRD calls out as a success criterion.
- New: a manual smoke test procedure for the offline flow (log workout in airplane mode → reconnect → verify sync) since this is the highest-risk new behavior and isn't practically unit-testable without a device/simulator network toggle.
- No new automated integration/E2E suite for M1 — out of scope given the portfolio timeline and PRD's explicit warning against over-engineering.

## 11. Risks (carried from PRD)

- Monorepo migration touches currently-working web app code; mitigated by verifying build+tests pass immediately after each migration step (§4) before any mobile code exists.
- Offline sync is the most technically novel piece here; scope is deliberately minimal (last-write-wins, single retry-on-reconnect trigger) to avoid the distributed-systems rabbit hole the PRD explicitly warns against.
- Per the PRD's own note: "M1 alone, fully polished, is a legitimate stopping point." This design does not assume Phase 2/3 will follow immediately.
