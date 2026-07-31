"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface UserProfile {
  id: string;
  keycloakId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
}

type DeploymentMode = "standalone" | "saas";

type AuthContextType = {
  authenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null;
  deploymentMode: DeploymentMode | null;
  login: () => void;
  loginWithProvider: (provider: "google" | "facebook") => void;
  register: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

interface SessionResponse {
  authenticated: boolean;
  user: UserProfile | null;
  deploymentMode: DeploymentMode;
}

export function KeycloakProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null>(null);
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // The only "auth state" fetch on mount — the Next.js server already
        // resolved the session cookie into this payload; no token ever reaches
        // the browser and no Keycloak round-trip happens client-side.
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data: SessionResponse = await res.json();
        if (cancelled) return;

        setDeploymentMode(data.deploymentMode);
        setAuthenticated(data.authenticated);
        setUser(data.user);

        if (data.authenticated && data.user) {
          // Standalone (Regular License) installs have no billing to enforce — skip the call entirely.
          if (data.deploymentMode === "standalone" || data.user.role === "PlatformAdmin") {
            setSubscriptionStatus("active");
          } else {
            try {
              const sub = await apiClient.get<{ status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' }>("/subscriptions/me");
              if (!cancelled) setSubscriptionStatus(sub.status);
            } catch (error) {
              console.error("Failed to load subscription status", error);
              if (!cancelled) setSubscriptionStatus(null);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load session", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    window.location.href = "/api/auth/login";
  }, []);

  const register = useCallback(() => {
    // Standalone (Regular License) installs are single-tenant with no self-serve
    // signup: there is no backend flow to provision a Keycloak self-registration
    // into a Mongo user, so it would only create an orphaned, unusable account.
    // Default to the safe behavior (no orphan accounts) while /config is still
    // loading — only skip it once we positively know this is a "saas" install.
    if (deploymentMode !== "saas") {
      login();
      return;
    }
    window.location.href = "/api/auth/login?register=true";
  }, [deploymentMode, login]);

  const loginWithProvider = useCallback((provider: "google" | "facebook") => {
    window.location.href = `/api/auth/login?idpHint=${provider}`;
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/auth/logout";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        isLoading,
        user,
        subscriptionStatus,
        deploymentMode,
        login,
        loginWithProvider,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside KeycloakProvider");
  }
  return context;
}
