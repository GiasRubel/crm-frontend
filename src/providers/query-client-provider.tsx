"use client";

import { QueryClient, QueryClientProvider as ReactQueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function QueryClientProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  return (
    <ReactQueryClientProvider client={queryClient}>
      {children}
    </ReactQueryClientProvider>
  );
}
