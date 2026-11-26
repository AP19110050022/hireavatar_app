import { useAuth } from "@clerk/expo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { reloadAppAsync } from "expo";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { request, User } from "@/src/api";

const RAW_KEY = (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "").trim();
// Only a real publishable key turns Clerk on; anything else keeps the app usable in "not configured" mode.
export const CLERK_KEY = /^pk_(test|live)_[A-Za-z0-9+/=_-]+$/.test(RAW_KEY) ? RAW_KEY : "";

type AuthState = {
  status: "loading" | "signedOut" | "signedIn" | "recovery";
  me: User | null;
  configured: boolean;
  error: string;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  retry: () => Promise<void>;
  setMe: (u: User) => void;
};

const Ctx = createContext<AuthState | null>(null);

export function useAppAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppAuth outside provider");
  return v;
}

/** Typed API call that always carries the current Clerk session token. */
export function useApi() {
  const { getToken } = useAppAuth();
  return useCallback(
    async <T,>(path: string, init?: RequestInit) => request<T>(path, await getToken(), init),
    [getToken],
  );
}

function ClerkBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const qc = useQueryClient();
  const [initializationTimedOut, setInitializationTimedOut] = useState(false);
  useEffect(() => {
    if (isLoaded) return;
    const timeout = setTimeout(() => setInitializationTimedOut(true), 15000);
    return () => clearTimeout(timeout);
  }, [isLoaded]);
  const meQ = useQuery({
    queryKey: ["me"],
    enabled: !!isSignedIn,
    retry: 1,
    queryFn: async () => {
      const token = await getToken();
      return request<User>("/me", token);
    },
  });
  const { data, error, isError, refetch } = meQ;

  const value = useMemo<AuthState>(() => {
    let status: AuthState["status"] = "loading";
    if (initializationTimedOut && !isLoaded) status = "recovery";
    else if (isLoaded && !isSignedIn) status = "signedOut";
    else if (isLoaded && isSignedIn && data) status = "signedIn";
    else if (isLoaded && isSignedIn && isError) status = "recovery";
    return {
      status,
      me: isSignedIn ? data ?? null : null,
      configured: true,
      error: initializationTimedOut && !isLoaded
        ? "We couldn’t reach the secure sign-in service. Please try again once your connection is restored."
        : error instanceof Error ? error.message : "We couldn’t connect your account.",
      getToken: () => getToken(),
      signOut: async () => {
        await signOut();
        qc.clear();
      },
      retry: async () => {
        if (initializationTimedOut && !isLoaded) await reloadAppAsync();
        else await refetch();
      },
      setMe: (u) => qc.setQueryData(["me"], u),
    };
  }, [isLoaded, isSignedIn, initializationTimedOut, data, isError, error, refetch, getToken, signOut, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const unconfigured: AuthState = {
  status: "signedOut",
  me: null,
  configured: false,
  error: "",
  getToken: async () => null,
  signOut: async () => {},
  retry: async () => {},
  setMe: () => {},
};

export function AppAuthProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  if (!enabled) return <Ctx.Provider value={unconfigured}>{children}</Ctx.Provider>;
  return <ClerkBridge>{children}</ClerkBridge>;
}
