import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client for the matches project.
 *
 * The browser client in ./client.ts reaches the same project with a publishable
 * key and no user identity, which means anyone holding that key — it ships in
 * the bundle — can list every match and mint signed URLs for every file in the
 * private bucket, including match video.
 *
 * This client uses a service-role key and must never be imported into anything
 * that reaches the browser. Everything it does is gated by a `match_access`
 * check in the auth project first.
 */

export const MATCHES_BUCKET = "matches";

function matchesFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    }
    // New-format keys are opaque strings, not bearer JWTs.
    if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function create() {
  const url = process.env["MATCHES_URL"];
  const key = process.env["MATCHES_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    const missing = [...(!url ? ["MATCHES_URL"] : []), ...(!key ? ["MATCHES_SERVICE_ROLE_KEY"] : [])];
    throw new Error(
      `Missing environment variable(s): ${missing.join(", ")}. ` +
        "The matches project is read from the server with a service-role key so the browser never holds one. " +
        "Set them in your deployment environment.",
    );
  }
  return createClient(url, key, {
    global: { fetch: matchesFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let cached: ReturnType<typeof create> | undefined;

export function matchesAdmin() {
  if (!cached) cached = create();
  return cached;
}
