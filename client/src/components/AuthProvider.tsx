import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/users/current'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/auth/login");
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/users/current'] });
  };

  const isAuthenticated = !!user && !error;

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading,
      isAuthenticated,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}