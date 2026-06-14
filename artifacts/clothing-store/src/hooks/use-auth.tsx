import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("wmh_token") : null
  );

  const logout = () => {
    const currentToken = localStorage.getItem("wmh_token");
    if (currentToken) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      }).catch(() => {});
    }
    localStorage.removeItem("wmh_token");
    setToken(null);
    queryClient.clear();
  };

  const { data: user, isLoading: isMeLoading, refetch, isError, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      refetchInterval: 10000,
      refetchIntervalInBackground: true,
    },
  });

  useEffect(() => {
    if (!isError || !token) return;
    const err = error as { status?: number } | null;
    if (err?.status === 401 || err?.status === 403) {
      logout();
    }
  }, [isError, error, token]);

  const isLoading = !!token && isMeLoading;

  const login = (newToken: string) => {
    localStorage.setItem("wmh_token", newToken);
    setToken(newToken);
    refetch();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
