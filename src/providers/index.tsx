"use client";

import { ReactNode } from "react";
import { QueryClientProvider } from "./query-client-provider";
import { KeycloakProvider } from "./keycloak-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider>
      <KeycloakProvider>
        {children}
      </KeycloakProvider>
    </QueryClientProvider>
  );
}
