import { useQuery } from '@tanstack/react-query';

export interface SubscriptionAccessCheck {
  status: 'active' | 'cancel_at_period_end' | 'completely_canceled' | 'no_subscription' | 'canceled' | 'trialing';
  hasAccess: boolean;
  message?: string;
  endDate?: string;
  redirectTo?: string;
}

export function useSubscriptionAccess() {
  return useQuery({
    queryKey: ['/api/users/subscription-access'],
    queryFn: async (): Promise<SubscriptionAccessCheck> => {
      const response = await fetch('/api/users/subscription-access');
      if (!response.ok) {
        throw new Error('Failed to check subscription access');
      }
      return response.json();
    },
    refetchInterval: 60000, // Check every minute
    staleTime: 30000 // Consider stale after 30 seconds
  });
}