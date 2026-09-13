# Real accounts and login (before phase 2)

Right now sign-in is fake — it just flips a switch in the browser, so nothing is really protected and you can't reliably move between screens. This step turns it into a real account system with Lovable Cloud, so you can sign up, sign in, and land in your library on any device.

## What you'll be able to do

- Create an account with name, email, club and role, or continue with Google
- Sign in and stay signed in across refreshes and devices
- Reset a forgotten password by email
- Land on onboarding the first time, and on the library every time after
- See your name and club in the header, and sign out from a menu there
- Onboarding answers (club, teams, targets) saved to your account, not just this browser

For quick testing, new email sign-ups are usable immediately — no need to click a confirmation link first. Say the word if you'd rather require email confirmation.

## Screens touched

- `/signin` — real email + password, working Google button, real inline errors ("wrong email or password")
- `/signup` — creates the account and saves name, club and role, then goes straight to onboarding
- `/reset` — sends a real reset email; a new `/reset-password` screen sets the new password
- `/onboarding`, `/library`, `/new`, `/processing`, `/match/...` — only reachable when signed in; signed-out visitors go to `/signin`
- `/` (landing) — the header shows "Go to library" instead of "Sign in" when you're already signed in
- Header avatar becomes a menu: your name, club, Sign out

Matches stay as local sample data for now; only accounts, club and onboarding go into the cloud. Phase 2 and 3 are parked until you approve this.

## Technical notes

- Enable Lovable Cloud, then `enable_email_auth` and `configure_social_auth` for Google; Google sign-in goes through `lovable.auth.signInWithOAuth`.
- Tables (all with RLS + explicit grants):
  - `profiles` — `id` FK `auth.users(id)` on delete cascade, `full_name`, `club_name`, `role`, `onboarded`, timestamps. Auto-created by an `on_auth_user_created` trigger from signup metadata. Policies: select/update/insert own row.
  - `clubs_settings` (one row per user) — club name, country, crest initial, targets (`press_within_2s`, `regain_within_5s`, `block_ceiling_min`), owner-scoped policies.
  - `teams` — name, age group, kit colours, `owner_id`, owner-scoped policies.
- Route structure: move `onboarding`, `library`, `new`, `processing`, `match.$matchId.insights` under `src/routes/_authenticated/`, and add the integration-managed `_authenticated/route.tsx` gate (`ssr: false`, redirect to `/auth` → point it at `/signin`) in the same edit. `src/routes/index.tsx` stays public; no `_authenticated/index.tsx`.
- Root: one `onAuthStateChange` subscriber filtered to `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED` calling `router.invalidate()`; mount `<Toaster />` from `@/components/ui/sonner`.
- New `src/hooks/use-session.ts` (browser `supabase` client) exposing session + profile; zustand store keeps match/UI state and drops `signedIn`/`user` in favour of the session. Profile and onboarding reads/writes go through `createServerFn` in `src/lib/profile.functions.ts` with `requireSupabaseAuth`, called from components via `useServerFn` + TanStack Query (not from public loaders).
- Sign-out: `cancelQueries` → `queryClient.clear()` → `supabase.auth.signOut()` → `navigate({ to: "/signin", replace: true })`.
- Design tokens, components and copy stay exactly as built; only wiring and route placement change.
