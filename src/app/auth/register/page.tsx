"use client";

import { useAuth } from "@/providers/keycloak-provider";

export default function RegisterPage() {
  const { register } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={register}
        className="rounded-md bg-black px-4 py-2 text-white"
      >
        Create account
      </button>
    </div>
  );
}