import { useUser } from "@clerk/clerk-react";

export function useClerkUser() {
  const bypassClerk = typeof window !== 'undefined' && window.localStorage.getItem('bypass-clerk') === 'true';
  
  let clerkData = { user: null, isLoaded: true };
  
  // Only call useUser if not in bypass mode
  if (!bypassClerk) {
    try {
      clerkData = useUser();
    } catch (error) {
      // If Clerk fails, continue with bypass mode
      console.log('Clerk not available, using bypass mode');
    }
  }
  
  // Use demo user if bypassing Clerk or if user is null
  if (bypassClerk || !clerkData.user) {
    return {
      user: {
        firstName: 'Demo',
        lastName: 'User',
        primaryEmailAddress: { emailAddress: 'demo@roimob.com' },
        imageUrl: null
      },
      isLoaded: true
    };
  }
  
  return clerkData;
}