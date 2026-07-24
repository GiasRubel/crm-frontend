"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  clearOAuthHashFromUrl,
  clearStaleOAuthCallbackHash,
  hasOAuthCallbackHash,
  keycloak,
  rememberProcessedOAuthCallback,
} from "@/lib/keycloak";
import { apiClient } from "@/lib/api-client";

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
}

type AuthContextType = {
  authenticated: boolean;
  isLoading: boolean;
  token?: string;
  user: UserProfile | null;
  login: () => void;
  loginWithProvider: (provider: "google" | "facebook") => void;
  register: () => void;
  logout: () => void;
  getToken: () => Promise<string | undefined>;
};

const AuthContext = createContext<AuthContextType | null>(null);

let initPromise: Promise<boolean> | null = null;

async function loadUserProfile(): Promise<UserProfile | null> {
  try {
    return await apiClient.get<UserProfile>("/users/me");
  } catch (error) {
    console.error("Failed to load user profile from backend", error);
    return null;
  }
}

function syncAuthFromKeycloak(
  setAuthenticated: (value: boolean) => void,
  setToken: (value: string | undefined) => void,
): boolean {
  const auth = Boolean(keycloak.authenticated);
  setAuthenticated(auth);
  setToken(keycloak.token);
  return auth;
}

export function KeycloakProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | undefined>();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    keycloak.onAuthSuccess = () => {
      setAuthenticated(true);
      setToken(keycloak.token);
    };

    keycloak.onAuthLogout = () => {
      setAuthenticated(false);
      setToken(undefined);
      setUser(null);
    };

    keycloak.onAuthRefreshSuccess = () => {
      setToken(keycloak.token);
    };

    keycloak.onAuthRefreshError = () => {
      console.error("Keycloak token refresh failed. Redirecting to login...");
      setAuthenticated(false);
      setToken(undefined);
      setUser(null);
      keycloak.login({ redirectUri: `${window.location.origin}/dashboard` });
    };

    // Browser back can land on /dashboard#code=… with an already-used code.
    // Strip it before init so keycloak-js does not hang retrying token exchange.
    const staleCallback = clearStaleOAuthCallbackHash();

    if (!initPromise) {
      initPromise = keycloak.init({
        onLoad: "check-sso",
        // Check the SSO session inside a hidden iframe instead of a full-page
        // redirect to Keycloak — otherwise public pages (e.g. the landing page)
        // visibly load twice while bouncing to Keycloak and back.
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: "S256",
        checkLoginIframe: false,
      });
    }

    initPromise
      .then(async (auth) => {
        if (auth) {
          rememberProcessedOAuthCallback();
        } else {
          clearOAuthHashFromUrl();
        }

        setAuthenticated(auth);
        setToken(keycloak.token);
        if (auth) {
          const profile = await loadUserProfile();
          if (profile) setUser(profile);
        }
        setIsLoading(false);
      })
      .catch(async (error) => {
        console.error("Keycloak init failed", error);

        if (hasOAuthCallbackHash()) {
          clearOAuthHashFromUrl();
          if (syncAuthFromKeycloak(setAuthenticated, setToken)) {
            const profile = await loadUserProfile();
            if (profile) setUser(profile);
          } else {
            // Full reload without the stale hash lets check-sso restore the session.
            window.location.replace(
              window.location.pathname + window.location.search,
            );
            return;
          }
        } else if (staleCallback) {
          syncAuthFromKeycloak(setAuthenticated, setToken);
        }

        setIsLoading(false);
      });

    const handlePopState = () => {
      if (!hasOAuthCallbackHash()) return;

      const wasStale = clearStaleOAuthCallbackHash();
      if (wasStale || keycloak.authenticated) {
        if (!wasStale) clearOAuthHashFromUrl();
        if (syncAuthFromKeycloak(setAuthenticated, setToken)) {
          void loadUserProfile().then((profile) => {
            if (profile) setUser(profile);
          });
        }
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      keycloak.onAuthSuccess = undefined;
      keycloak.onAuthLogout = undefined;
      keycloak.onAuthRefreshSuccess = undefined;
      keycloak.onAuthRefreshError = undefined;
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const login = () => {
    keycloak.login({ redirectUri: `${window.location.origin}/dashboard` });
  };

  const register = () => {
    keycloak.register({ redirectUri: `${window.location.origin}/dashboard` });
  };

  const loginWithProvider = (provider: "google" | "facebook") => {
    keycloak.login({
      idpHint: provider,
      redirectUri: `${window.location.origin}/dashboard`,
    });
  };

  const logout = () => {
    keycloak.logout({ redirectUri: `${window.location.origin}/` });
  };

  const getToken = async () => {
    if (!keycloak.authenticated) return undefined;
    try {
      await keycloak.updateToken(30);
      setToken(keycloak.token);
      return keycloak.token;
    } catch (error) {
      console.error("Failed to refresh token", error);
      return undefined;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        isLoading,
        token,
        user,
        login,
        loginWithProvider,
        register,
        logout,
        getToken,
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