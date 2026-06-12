"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { keycloak } from "@/lib/keycloak";
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
  register: () => void;
  logout: () => void;
  getToken: () => Promise<string | undefined>;
};

const AuthContext = createContext<AuthContextType | null>(null);

let initPromise: Promise<boolean> | null = null;

export function KeycloakProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | undefined>();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Prevent duplicate Keycloak initialization in React 18/19 strict mode
    if (!initPromise) {
      initPromise = keycloak.init({
        onLoad: "check-sso",
        pkceMethod: "S256",
        checkLoginIframe: false,
      });
    }

    initPromise
      .then(async (auth) => {
        setAuthenticated(auth);
        setToken(keycloak.token);
        if (auth) {
          try {
            const profile = await apiClient.get<UserProfile>("/users/me");
            setUser(profile);
          } catch (error) {
            console.error("Failed to load user profile from backend", error);
          }
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Keycloak init failed", error);
        setIsLoading(false);
      });
  }, []);

  const login = () => {
    keycloak.login({
      redirectUri: `${window.location.origin}/dashboard`,
    });
  };

  const register = () => {
    keycloak.register({
      redirectUri: `${window.location.origin}/dashboard`,
    });
  };

  const logout = () => {
    keycloak.logout({
      redirectUri: `${window.location.origin}/auth/login`,
    });
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