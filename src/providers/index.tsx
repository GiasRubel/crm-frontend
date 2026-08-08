"use client";

import { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClientProvider } from "./query-client-provider";
import { KeycloakProvider } from "./keycloak-provider";
import { ThemeProvider } from "./theme-provider";

export function Providers({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider>
        <QueryClientProvider>
          <KeycloakProvider>
            {children}
          </KeycloakProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
