import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export type AuthenticatedRequest = {
  user: User;
  token: string;
  supabase: SupabaseClient<any, "public", any>;
};

export type AuthFailure = {
  status: 401 | 503;
  error: string;
};

export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedRequest | AuthFailure> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!url || !publishableKey) {
    return { status: 503, error: "Supabase is not configured." };
  }

  if (!token) {
    return { status: 401, error: "Authentication required." };
  }

  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { status: 401, error: "Session is no longer valid." };
  }

  return { user: data.user, token, supabase };
}

export function isAuthFailure(
  value: AuthenticatedRequest | AuthFailure
): value is AuthFailure {
  return "error" in value;
}
