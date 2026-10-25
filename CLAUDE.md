@AGENTS.md

# Ding — project rules for Claude

Ding (by Slightly Serious) is a mobile-first task/reminder app: "Alarmy for tasks, with
Duolingo-style personality and cozy gamification." The reminder loop is the product:

Create task → reminder fires → user deals with it → unfinished task returns/escalates → task gets completed

The founder is a beginner developer. Keep code small, readable, and explained in plain language.

## Current phase: reminders — R3 done, R4 next

Done so far: the MVP app shell (Today, Create Task, Task Detail, Settings, local persistence),
then the reminder steps, each tested on a real Android phone:

- **R1–R2:** one local notification per open task at its due time, kept in sync with the task
  list.
- **R2.5:** precise ("exact") timing on Android when "Alarms & reminders" is allowed.
- **R3:** Done and Snooze buttons on reminders, and tapping a reminder opens the task.

**Next: R4 — Persistent Reminder Loop.** An unfinished task reminds the user again by itself,
without a manual Snooze. Plan R4 before writing code, on a new feature branch.

Build order after that (handoff build order — do not jump ahead):
escalating copy → reminder intensity → basic recurring tasks → mascot states → coins → tiny room.

**Do not add** without explicit approval: backend/Supabase, auth, accounts/sync, subscriptions
(RevenueCat), ads (AdMob), analytics (PostHog), crash reporting (Sentry), AI features, social
features, or any feature just because other task apps have it.

## Architecture

```
index.ts                  Entry point: loads reminders/background-task first, then Expo Router
src/app/                  Routes only (Expo Router). One Stack navigator, no tabs.
  _layout.tsx             Stack + TasksProvider; tapping a reminder opens its task
  index.tsx               Today
  settings.tsx            Settings
  task/new.tsx            Create Task (modal)
  task/[id].tsx           Task Detail
src/components/           Reusable UI (task-form.tsx is shared by Create and Detail)
src/tasks/
  types.ts                Task model
  storage.ts              The ONLY file that touches persistence
  tasks-context.tsx       useTasks() — the only way screens read/write tasks
src/reminders/            Notifications (Android verified; *.web.ts versions do nothing)
  plan.ts                 Pure rules: which reminders to schedule or cancel
  sync.ts                 Keeps the phone's scheduled reminders in step with the tasks
  actions.ts              Pure rules for Done / Snooze presses, and the Snooze length
  reminder-responses.ts   Carries out presses (foreground listener + background handler)
  background-task.ts      TaskManager task Android runs for presses when Ding isn't on screen
  notifications.ts        The ONLY file that calls expo-notifications
  reminder-permission.ts  Asking for notification permission
modules/exact-alarm/      TEMPORARY native module for Android exact alarms (see its README)
src/constants/theme.ts    Colors, spacing, fonts
```

- **Persistence:** AsyncStorage, isolated in `src/tasks/storage.ts`. Web is the current preview
  environment, so storage must work on web. Planned migration to expo-sqlite later — only
  `storage.ts` should need to change.
- **State:** plain React context (`useTasks()`). No Redux/Zustand/etc.
- **Dates:** stored as ISO strings in the Task model.
- **Task model is minimal.** Only reminder fields a step actually needs are added, when that
  step starts. R3 added `snoozedUntil` (saved data format v3). Snooze never moves `dueAt`.

## Reminder actions (R3)

- **Who handles a Done / Snooze press.** Every press has exactly one handler:
  - Ding on screen → the listener in `useReminderButtons` (inside TasksProvider) changes the
    task like any other edit, which then saves and syncs as usual.
  - Ding in the background or closed → Android runs `background-task.ts`, which calls
    `handleBackgroundPress`: read saved tasks → apply → save → sync. When Ding comes back on
    screen, TasksProvider re-reads the saved tasks to pick up that change.
  - On Android the foreground listener ignores presses unless Ding is active. Remembering
    handled presses is only a safety net, not the main mechanism.
- **Done** completes the task and clears any snooze. It does NOT check which reminder it came
  from: an old notification still in the shade can complete a task whose due time has been
  edited since. On a task that is already completed (or deleted) it changes nothing.
- **Snooze** sets `snoozedUntil` and the reminder rings again then. It only works on the task's
  current reminder: if the notification's saved `remindAt` no longer matches (already snoozed,
  due time edited, completed), the press changes nothing.
- Editing the due time or completing/reopening a task clears `snoozedUntil`. Renaming keeps it.
- **Snooze length** (`SNOOZE_MINUTES` in `actions.ts`): 1 min in development builds
  (`__DEV__`), 2 min in the EAS `preview` APK (only that profile sets
  `EXPO_PUBLIC_DING_PREVIEW=1`), 10 min in production. Never set that variable anywhere else
  (EAS dashboard, `.env`, a future `production` profile).
- The DEV-only timing log in `configureNotifications` (`[Ding timing] … rang N s after …`) and
  the DEV "rings at" line on task rows are kept on purpose for checking timing.

**Known observations** (not reproducible; don't make speculative fixes):
- Reminders occasionally arrive about a minute late.
- Done sometimes needs a second tap during an app lifecycle transition. For about a second
  after leaving Ding, Android may still treat it as foreground while Ding's JS says background;
  that press is ignored and the notification stays.
- iOS notification actions have not been validated yet. Only Android is verified.
- Done/Snooze after a swipe-away did not run in the dev-client build, but works in the
  standalone `preview` APK. Test terminated-state behavior with the preview build.

## Conventions

- TypeScript strict. Import with the `@/` alias (`@/tasks/...`, `@/components/...`).
- File names in kebab-case; components in PascalCase.
- Use `ThemedText` / `ThemedView` and tokens from `@/constants/theme` instead of hard-coded colors.
- Every screen must work on web, iOS, and Android. Avoid iOS/Android-only APIs (e.g.
  `Stack.Toolbar`) unless there is a web fallback.
- Ask before adding any dependency. Install with `npx expo install <pkg>`.
- Small, testable increments. Run `npx expo lint` and `npx tsc --noEmit` before calling a step done.
- Commit after each stable checkpoint. Never push or merge without being asked.

## Reminder engine constraints

- Local-first: reminders must work with no network.
- iOS/Android may not allow truly non-dismissible notifications. Design around re-scheduling,
  escalation, and notification actions, and call out platform limits honestly.
- Android 12+ exact timing needs `SCHEDULE_EXACT_ALARM` (config), likely requiring a
  development build instead of Expo Go. Verify notification action buttons on a real device.
- Ads must never interrupt reminder → Done / Snooze / Task Detail.
