@AGENTS.md

# Ding — project rules for Claude

Ding (by Slightly Serious) is a mobile-first task/reminder app: "Alarmy for tasks, with
Duolingo-style personality and cozy gamification." The reminder loop is the product:

Create task → reminder fires → user deals with it → unfinished task returns/escalates → task gets completed

The founder is a beginner developer. Keep code small, readable, and explained in plain language.

## Current phase: MVP app shell

In scope now: Today screen, Create Task, Task Detail (view/edit/complete/delete), Settings,
local persistence.

Next, in this order (handoff build order — do not jump ahead):
schedule local notification → Done action → Snooze → persistent reminder loop → escalating copy
→ reminder intensity → basic recurring tasks → mascot states → coins → tiny room.

**Do not add** without explicit approval: backend/Supabase, auth, accounts/sync, subscriptions
(RevenueCat), ads (AdMob), analytics (PostHog), crash reporting (Sentry), AI features, social
features, or any feature just because other task apps have it.

## Architecture

```
src/app/                  Routes only (Expo Router). One Stack navigator, no tabs.
  _layout.tsx             Stack + TasksProvider
  index.tsx               Today
  settings.tsx            Settings
  task/new.tsx            Create Task (modal)
  task/[id].tsx           Task Detail
src/components/           Reusable UI (task-form.tsx is shared by Create and Detail)
src/tasks/
  types.ts                Task model
  storage.ts              The ONLY file that touches persistence
  tasks-context.tsx       useTasks() — the only way screens read/write tasks
src/constants/theme.ts    Colors, spacing, fonts
```

- **Persistence:** AsyncStorage, isolated in `src/tasks/storage.ts`. Web is the current preview
  environment, so storage must work on web. Planned migration to expo-sqlite later — only
  `storage.ts` should need to change.
- **State:** plain React context (`useTasks()`). No Redux/Zustand/etc.
- **Dates:** stored as ISO strings in the Task model.
- **Task model is minimal.** Reminder fields (snooze count, reminders sent, intensity,
  recurrence, notification ids) are added when the reminder work starts, not before.

## Conventions

- TypeScript strict. Import with the `@/` alias (`@/tasks/...`, `@/components/...`).
- File names in kebab-case; components in PascalCase.
- Use `ThemedText` / `ThemedView` and tokens from `@/constants/theme` instead of hard-coded colors.
- Every screen must work on web, iOS, and Android. Avoid iOS/Android-only APIs (e.g.
  `Stack.Toolbar`) unless there is a web fallback.
- Ask before adding any dependency. Install with `npx expo install <pkg>`.
- Small, testable increments. Run `npx expo lint` and `npx tsc --noEmit` before calling a step done.
- Commit after each stable checkpoint. Never push or merge without being asked.

## Reminder engine constraints (for later)

- Local-first: reminders must work with no network.
- iOS/Android may not allow truly non-dismissible notifications. Design around re-scheduling,
  escalation, and notification actions, and call out platform limits honestly.
- Android 12+ exact timing needs `SCHEDULE_EXACT_ALARM` (config), likely requiring a
  development build instead of Expo Go. Verify notification action buttons on a real device.
- Ads must never interrupt reminder → Done / Snooze / Task Detail.
