import { supabase } from "@/integrations/supabase/client";

/**
 * Single-user personal app: there is no login screen.
 * The app silently signs into one fixed owner account on boot so that all
 * cloud data stays scoped to a single user and row-level security keeps working.
 */
const OWNER_EMAIL = "owner@learning-os.app";
const OWNER_PASSWORD = "lo5-owner-9f2c41ab-personal-device-key";

let inflight: Promise<void> | null = null;

async function signInOrCreate() {
  const signIn = await supabase.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
  });
  if (signIn.data.session) return;

  const signUp = await supabase.auth.signUp({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    options: { data: { display_name: "Me" } },
  });
  if (signUp.data.session) return;

  // Account exists but the first sign-in raced (or email confirmation lag) — retry once.
  const retry = await supabase.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
  });
  if (retry.data.session) return;

  throw new Error(retry.error?.message ?? signUp.error?.message ?? "Could not open your workspace");
}

/** Resolves once a session exists. Safe to call repeatedly. */
export function ensureSession() {
  if (!inflight) {
    inflight = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return;
      await signInOrCreate();
    })().catch((err) => {
      inflight = null;
      throw err;
    });
  }
  return inflight;
}
