# M1 Smoke Test — Offline Workout Flow

Run this on a physical Android device via Expo Go before considering M1 done.

1. Fresh install / clear app data. Sign up with a new account.
2. Create a routine with 2+ exercises via the routine builder.
3. From Routines, tap the new routine to start a workout.
4. Turn on Airplane Mode.
5. Log 2-3 sets per exercise. Confirm each "Log" tap succeeds instantly with no error and no spinner hang (this is the offline-write path — it must never block on network).
6. Tap "Finish Workout". Confirm it completes without error while still offline.
7. Force-quit the app while still in Airplane Mode. Reopen it — you should land on the Home screen (session persisted), and the completed workout should NOT have vanished from History.
8. Turn off Airplane Mode.
9. Wait a few seconds (or background/foreground the app once to trigger the reconnect listener).
10. In the Supabase dashboard (Table Editor), confirm the new `workout_sessions` and `workout_sets` rows now exist for this user — this proves the sync queue drained.
11. Start the same routine again. Confirm the suggested weight now reflects the sets logged in step 5 (e.g. weight increased if all sets hit the top of the rep range) — this is M1's actual exit criteria.

If any step fails, the bug is almost certainly in `apps/mobile/src/sync/engine.ts` (queue replay) or `apps/mobile/src/db/localWrite.ts` (write-through) — both have unit tests (Tasks 5-6) covering their logic in isolation, so a failure here likely means a wiring problem (e.g. `useSyncOnReconnect` not mounted, NetInfo listener not firing) rather than a logic bug.
