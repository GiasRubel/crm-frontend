"use client";

import { useAuth } from "@/providers/keycloak-provider";

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={login}
        className="rounded-md bg-black px-4 py-2 text-white"
      >
        Sign in with Keycloak
      </button>
    </div>
  );
}