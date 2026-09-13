import { createClient } from "@supabase/supabase-js";

// Read-only analysis backend that holds the processed matches, their labels and
// the private `matches` storage bucket. Publishable key — safe in client code.
const MATCHES_URL = "https://qnfjmzlwazqxhvveiovg.supabase.co";
const MATCHES_KEY = "sb_publishable_IRlZAJ8JyrmY-aKqoBkTkw_5fM0PJjQ";

function matchesFetch(): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    // New-format keys are opaque strings, not bearer JWTs.
    if (headers.get("Authorization") === `Bearer ${MATCHES_KEY}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", MATCHES_KEY);
    return fetch(input, { ...init, headers });
  };
}

function create() {
  return createClient(MATCHES_URL, MATCHES_KEY, {
    global: { fetch: matchesFetch() },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let _client: ReturnType<typeof create> | undefined;

export const matchesDb = new Proxy({} as ReturnType<typeof create>, {
  get(_, prop, receiver) {
    if (!_client) _client = create();
    return Reflect.get(_client, prop, receiver);
  },
});

export const MATCHES_BUCKET = "matches";
