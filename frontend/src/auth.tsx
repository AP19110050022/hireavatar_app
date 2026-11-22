import { useAuth, useUser } from "@clerk/expo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useMemo } from "react";

import { request, User } from "@/src/api";

const RAW_KEY = (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "").trim();
// Only a real publishable key turns Clerk on; anything else keeps the app usable in "not configured" mode.
export const CLERK_KEY = /^pk_(test|live)_[A-Za-z0-9+/=_-]+$/.test(RAW_KEY) ? RAW_KEY : "";

type AuthState = {
  status: "loading" | "signedOut" | "signedIn";
  me: User | null;
  configured: boolean;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
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
  const { user } = useUser();
  const qc = useQueryClient();
  const meQ = useQuery({
    queryKey: ["me"],
    enabled: !!isSignedIn,
    retry: 1,
    queryFn: async () => {
      const token = await getToken();
      return request<User>("/me/sync", token, {
        method: "POST",
        body: JSON.stringify({
          email: user?.primaryEmailAddress?.emailAddress ?? "",
          name: user?.fullName ?? "",
          picture: user?.imageUrl ?? "",
        }),
      });
    },
  });

  const value = useMemo<AuthState>(() => {
    let status: AuthState["status"] = "loading";
    if (isLoaded && !isSignedIn) status = "signedOut";
    else if (isLoaded && isSignedIn && meQ.data) status = "signedIn";
    else if (isLoaded && isSignedIn && meQ.isError) status = "signedOut";
    return {
      status,
      me: isSignedIn ? meQ.data ?? null : null,
      configured: true,
      getToken: () => getToken(),
      signOut: async () => {
        await signOut();
        qc.clear();
      },
      setMe: (u) => qc.setQueryData(["me"], u),
    };
  }, [isLoaded, isSignedIn, meQ.data, meQ.isError, getToken, signOut, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const unconfigured: AuthState = {
  status: "signedOut",
  me: null,
  configured: false,
  getToken: async () => null,
  signOut: async () => {},
  setMe: () => {},
};

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  if (!CLERK_KEY) return <Ctx.Provider value={unconfigured}>{children}</Ctx.Provider>;
  return <ClerkBridge>{children}</ClerkBridge>;
}
