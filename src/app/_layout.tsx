import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';

import { HeaderLink } from '@/components/header-link';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
    </ThemeProvider>
  );
}
