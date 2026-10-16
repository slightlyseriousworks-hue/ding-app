import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';

import { HeaderLink } from '@/components/header-link';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { configureNotifications } from '@/reminders/notifications';
import { useOpenTaskFromReminder } from '@/reminders/reminder-responses';
import { TasksProvider } from '@/tasks/tasks-context';

// Lets notifications show while the app is open. Does not ask for permission.
configureNotifications();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Tapping a task reminder opens that task.
  useOpenTaskFromReminder();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <TasksProvider>
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              title: 'Today',
              headerRight: () => <HeaderLink href="/settings" label="Settings" />,
            }}
          />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="task/new" options={{ title: 'New task', presentation: 'modal' }} />
          <Stack.Screen name="task/[id]" options={{ title: 'Task' }} />
        </Stack>
      </TasksProvider>
    </ThemeProvider>
  );
}
