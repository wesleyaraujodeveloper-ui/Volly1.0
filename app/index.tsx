import { Redirect } from 'expo-router';

/**
 * Root index file that redirects to the appropriate initial route.
 * The _layout.tsx will handle the actual logic for redirection based on auth.
 */
export default function Index() {
  // We can just redirect to the tab group or auth group initially.
  // The RootLayout will catch this and redirect to login if necessary.
  return <Redirect href="/(auth)/login" />;
}
