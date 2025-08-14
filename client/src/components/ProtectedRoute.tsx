import { useAuth } from "./AuthProvider";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const { data: subscriptionAccess, isLoading: subscriptionLoading } = useSubscriptionAccess();

  // Bypass authentication for print routes (used by PDF generation)
  const isPrintRoute = location.startsWith('/print/');
  
  useEffect(() => {
    if (!isPrintRoute && !isLoading && !isAuthenticated) {
      setLocation("/auth/login");
    }
  }, [isLoading, isAuthenticated, setLocation, isPrintRoute]);

  // Handle subscription access check after authentication
  useEffect(() => {
    if (!isPrintRoute && !isLoading && !subscriptionLoading && isAuthenticated && subscriptionAccess) {
      // For completely canceled subscriptions, redirect to settings for reactivation
      if ((subscriptionAccess.status === 'completely_canceled' || subscriptionAccess.status === 'canceled') && !location.startsWith('/settings')) {
        setLocation("/settings?tab=subscription");
      }
      // For other subscription issues (no subscription, etc.), check hasAccess
      else if (!subscriptionAccess.hasAccess && !location.startsWith('/settings')) {
        setLocation("/settings?tab=subscription");
      }
    }
  }, [isLoading, subscriptionLoading, isAuthenticated, subscriptionAccess, setLocation, location, isPrintRoute]);

  // Skip loading and authentication checks for print routes
  if (isPrintRoute) {
    return <>{children}</>;
  }

  // Show loading while checking authentication or subscription
  if (isLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#434BE6] mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Block access if subscription is inactive (except for settings page)
  if (subscriptionAccess && !subscriptionAccess.hasAccess && !location.startsWith('/settings')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#434BE6] mx-auto mb-4"></div>
          <p className="text-slate-600">Redirecionando para configurações...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}