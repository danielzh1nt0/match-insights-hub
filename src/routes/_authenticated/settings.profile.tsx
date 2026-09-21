import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppHeader, Screen } from "@/components/ip/chrome";
import { Card, PrimaryButton, SecondaryButton, GhostButton } from "@/components/ip/primitives";
import { Avatar } from "@/components/ip/avatar";
import { useMyProfile, useRemoveAvatar, useUpdateProfile, useUploadAvatar } from "@/hooks/use-profile";
import { useApp } from "@/store/app-store";

const meta = {
  title: "Your profile — Ipanema",
  description: "Update your photo, name, role and teams in Ipanema.",
};

export const Route = createFileRoute("/_authenticated/settings/profile")({
  head: () => ({
    meta: [
      { title: meta.title },
      { name: "description", content: meta.description },
      { property: "og:title", content: meta.title },
      { property: "og:description", content: meta.description },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfileSettings,
});

const ROLES = ["Head coach", "Assistant coach", "Analyst", "Goalkeeping coach", "Academy lead"];

function ProfileSettings() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useMyProfile();
  const update = useUpdateProfile();
  const upload = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const { teams } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [clubName, setClubName] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setRole(profile.role || "Head coach");
    setClubName(profile.clubName);
  }, [profile]);

  const dirty =
    Boolean(profile) &&
    (fullName !== profile!.fullName ||
      (role || "") !== (profile!.role || "Head coach") ||
      clubName !== profile!.clubName);

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      await upload.mutateAsync(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload that image");
    }
  }

  async function onSave() {
    setError(null);
    try {
      await update.mutateAsync({ fullName, role, clubName });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile");
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader backTo="/library" />
      <Screen className="tactical-grid min-h-[calc(100vh-64px)] py-7">
        <p className="section-kicker">Settings</p>
        <h1 className="display mt-2 text-[28px] uppercase text-text">Your profile</h1>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <Card>
            <h2 className="display text-[16px] uppercase text-cream">Photo</h2>
            <div className="mt-4 flex items-center gap-4">
              <Avatar url={profile?.avatarUrl} name={fullName} email={profile?.email} size={88} />
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onPickFile(e.target.files?.[0])}
                />
                <SecondaryButton type="button" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
                  {upload.isPending ? "Uploading" : profile?.avatarUrl ? "Change photo" : "Upload a photo"}
                </SecondaryButton>
                {profile?.avatarPath ? (
                  <GhostButton
                    type="button"
                    onClick={() => void removeAvatar.mutateAsync(profile.avatarPath)}
                    disabled={removeAvatar.isPending}
                  >
                    Remove
                  </GhostButton>
                ) : null}
                <p className="text-[11.5px] text-text-faint">JPG or PNG, up to 5 MB.</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="display text-[16px] uppercase text-cream">Details</h2>
            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-text-faint" htmlFor="profile-name">
              Full name
            </label>
            <input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isLoading ? "" : "Your name"}
              className="tap mt-1 w-full rounded-[6px] border border-wire bg-surface-2 px-3 text-[14px] text-text outline-none focus:border-cream"
            />

            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-text-faint" htmlFor="profile-role">
              Role
            </label>
            <select
              id="profile-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="tap mt-1 w-full rounded-[6px] border border-wire bg-surface-2 px-3 text-[14px] text-text outline-none focus:border-cream"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-text-faint" htmlFor="profile-club">
              Club
            </label>
            <input
              id="profile-club"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="Club name"
              className="tap mt-1 w-full rounded-[6px] border border-wire bg-surface-2 px-3 text-[14px] text-text outline-none focus:border-cream"
            />

            <div className="mt-5 flex items-center gap-3">
              <PrimaryButton type="button" onClick={() => void onSave()} disabled={!dirty || update.isPending}>
                {update.isPending ? "Saving" : "Save changes"}
              </PrimaryButton>
              {saved ? <span className="text-[12.5px] text-reaction-good">Saved</span> : null}
            </div>
            {error ? <p className="mt-3 text-[12.5px] text-reaction-bad">{error}</p> : null}
          </Card>

          <Card>
            <h2 className="display text-[16px] uppercase text-cream">Teams</h2>
            {teams.length > 0 ? (
              <div className="mt-2 space-y-2">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between border-t border-wire-2 pt-2 text-[13px]">
                    <span className="text-text">{team.name}</span>
                    <span className="text-text-faint">{team.ageGroup}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-text-dim">No teams yet.</p>
            )}
            <PrimaryButton type="button" className="mt-5" onClick={() => navigate({ to: "/signup/club" })}>
              Add a team
            </PrimaryButton>
            <p className="mt-2 text-[11.5px] text-text-faint">
              Takes you through club, team and your first upload.
            </p>
          </Card>

          <Card>
            <h2 className="display text-[16px] uppercase text-text-faint">Sign-in</h2>
            <p className="mt-2 text-[13px] text-text-dim">{profile?.email || "—"}</p>
            <SecondaryButton type="button" className="mt-5" onClick={() => navigate({ to: "/settings/account" })}>
              Account settings
            </SecondaryButton>
          </Card>
        </div>
      </Screen>
    </div>
  );
}
