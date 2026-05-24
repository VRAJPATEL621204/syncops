import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 1 minute
      staleTime: 1000 * 60,
      // Refetch every 30 seconds when window is focused
      refetchInterval: 1000 * 30,
      refetchIntervalInBackground: false,
      // Refetch on window focus
      refetchOnWindowFocus: true,
      // Retry failed requests 3 times
      retry: 3,
      // Keep data for 5 minutes even if unused
      gcTime: 1000 * 60 * 5,
    },
  },
});
