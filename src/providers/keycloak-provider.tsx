"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { keycloak } from "@/lib/keycloak";

type AuthContextType = {
  authenticated: boolean;
  isLoading: boolean;
  token?: string;
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
      .then((auth) => {
        setAuthenticated(auth);
        setToken(keycloak.token);
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