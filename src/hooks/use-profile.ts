import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export type MyProfile = {
  id: string;
  fullName: string;
  role: string;
  clubName: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  email: string;
};

export function useMyProfile() {
  const { user } = useSession();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ["my-profile", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MyProfile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, club_name, avatar_path")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);

      let avatarUrl: string | null = null;
      if (data?.avatar_path) {
        const signed = await supabase.storage
          .from("avatars")
          .createSignedUrl(data.avatar_path, 60 * 60);
        avatarUrl = signed.data?.signedUrl ?? null;
      }

      return {
        id: userId!,
        fullName: data?.full_name ?? "",
        role: data?.role ?? "",
        clubName: data?.club_name ?? "",
        avatarPath: data?.avatar_path ?? null,
        avatarUrl,
        email: user?.email ?? "",
      };
    },
  });
}

export function useUpdateProfile() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: { fullName?: string; role?: string; clubName?: string }) => {
      if (!user) throw new Error("Not signed in");
      const row = {
        id: user.id,
        ...(patch.fullName !== undefined ? { full_name: patch.fullName.trim() } : {}),
        ...(patch.role !== undefined ? { role: patch.role.trim() } : {}),
        ...(patch.clubName !== undefined ? { club_name: patch.clubName.trim() } : {}),
      };
      const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
      if (error) throw new Error(error.message);
      if (patch.fullName !== undefined) {
        await supabase.auth.updateUser({ data: { full_name: patch.fullName.trim() } });
      }
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useUploadAvatar() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not signed in");
      if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
      if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB");

      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/avatar-${Date.now()}.${ext || "jpg"}`;
      const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (up.error) throw new Error(up.error.message);

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_path: path }, { onConflict: "id" });
      if (error) throw new Error(error.message);
      return path;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useRemoveAvatar() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (path: string | null) => {
      if (!user) throw new Error("Not signed in");
      if (path) await supabase.storage.from("avatars").remove([path]);
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_path: null }, { onConflict: "id" });
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}
