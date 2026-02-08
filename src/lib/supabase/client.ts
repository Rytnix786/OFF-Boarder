import { createBrowserClient } from "@supabase/ssr";

const REMEMBER_ME_KEY = "offboard_remember_me";

export function setRememberMe(value: boolean) {
  if (typeof window !== "undefined") {
    if (value) {
      localStorage.setItem(REMEMBER_ME_KEY, "true");
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
      sessionStorage.setItem(REMEMBER_ME_KEY, "false");
    }
  }
}

export function getRememberMe(): boolean {
  if (typeof window === "undefined") return true;
  if (sessionStorage.getItem(REMEMBER_ME_KEY) === "false") return false;
  return localStorage.getItem(REMEMBER_ME_KEY) === "true";
}

export function clearRememberMe() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(REMEMBER_ME_KEY);
  }
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
