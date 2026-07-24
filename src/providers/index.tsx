"use client";

import { ReactNode } from "react";
import { QueryClientProvider } from "./query-client-provider";
import { KeycloakProvider } from "./keycloak-provider";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider>
        <KeycloakProvider>
          {children}
        </KeycloakProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
