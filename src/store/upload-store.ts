import { create } from "zustand";
import type { UploadMeta } from "@/lib/upload";

/** Hands the chosen File from the upload form to the processing screen (in memory only: a File can't go in a URL). */
export const usePendingUpload = create<{ file: File | null; meta: UploadMeta | null; set: (file: File, meta: UploadMeta) => void; clear: () => void }>((set) => ({
  file: null,
  meta: null,
  set: (file, meta) => set({ file, meta }),
  clear: () => set({ file: null, meta: null }),
}));
