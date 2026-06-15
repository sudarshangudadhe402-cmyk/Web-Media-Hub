import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, User, setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "wmh_super_token";

// Use sessionStorage so token is cleared when tab/browser is closed
function readToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function writeToken(t: string): void {
  try { sessionStorage.setItem(TOKEN_KEY, t); } catch {}
}
function deleteToken(): void {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch {}
}

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
    typeof window !== "undefined" ? readToken() : null
  );

  useEffect(() => {
    setAuthTokenGetter(() => readToken());
  }, []);

  const { data: user, isLoading: isMeLoading, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  const isLoading = !!token && isMeLoading;

  const login = (newToken: string) => {
    writeToken(newToken);
    setToken(newToken);
    setAuthTokenGetter(() => newToken);
    refetch();
  };

  const logout = () => {
    deleteToken();
    setToken(null);
    setAuthTokenGetter(() => null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, logout }}>
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
