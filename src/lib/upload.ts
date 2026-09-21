import { supabase } from "@/integrations/supabase/client";

/** Upload API on Modal (holds the storage keys; the app never sees them). */
export const IPANEMA_API =
  (import.meta.env["VITE_IPANEMA_API"] as string | undefined) ?? "https://danielmatros1--ipanema-api.modal.run";

export type UploadMeta = {
  team: string;
  opponent: string;
  date: string;
  competition: string;
  venue: "home" | "away";
  ageGroup?: string | undefined;
  kitColour?: string | undefined;
};

export type UploadProgress = { sentBytes: number; totalBytes: number; partsDone: number; partsTotal: number; bytesPerSec: number };

type Session = {
  match_id: string;
  key: string;
  upload_id: string;
  part_size: number;
  urls: string[];
  done: Record<number, string>;
  fileKey: string;
};

const STORE = "ipanema-upload-session";
const CONCURRENCY = 6;
const RETRIES = 5;

const fileKeyOf = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;
const load = (): Session | null => {
  try {
    const raw = window.localStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
};
const save = (s: Session) => {
  try {
    window.localStorage.setItem(STORE, JSON.stringify(s));
  } catch {
    /* private mode: the upload still works, it just can't resume after a reload */
  }
};
const clear = () => {
  try {
    window.localStorage.removeItem(STORE);
  } catch {
    /* ignore */
  }
};

async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to upload a match.");
  return token;
}

async function call<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${IPANEMA_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Upload service error (${res.status})`;
    try {
      const j = (await res.json()) as { detail?: string };
      if (j.detail) message = j.detail;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

function putPart(url: string, blob: Blob, onBytes: (loaded: number) => void, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => onBytes(e.loaded);
    xhr.onload = () => {
      if (xhr.status === 403) return reject(Object.assign(new Error("expired"), { expired: true }));
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(`part failed (${xhr.status})`));
      const etag = xhr.getResponseHeader("ETag");
      if (!etag) return reject(new Error("Storage did not confirm the part (CORS: ETag not exposed)."));
      resolve(etag);
    };
    xhr.onerror = () => reject(new Error("network"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(blob);
  });
}

/**
 * Resumable multipart upload straight to storage, then registers the match.
 * Re-selecting the same file after a dropped connection or a reload continues from the last finished part.
 */
export async function uploadMatch(
  file: File,
  meta: UploadMeta,
  onProgress: (p: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<{ match_id: string }> {
  const token = await accessToken();
  // Idempotent: lets the browser read each part's ETag. Harmless if storage already allows it.
  await call("/admin/r2-cors", {}, token).catch(() => undefined);

  let s = load();
  if (!s || s.fileKey !== fileKeyOf(file)) {
    const started = await call<Omit<Session, "done" | "fileKey">>(
      "/upload/start",
      { size: file.size, date: meta.date, team: meta.team, opponent: meta.opponent },
      token,
    );
    s = { ...started, done: {}, fileKey: fileKeyOf(file) };
    save(s);
  }
  const session = s;
  const total = session.urls.length;
  const partBytes = (n: number) => Math.min(session.part_size, file.size - (n - 1) * session.part_size);
  const inflight = new Map<number, number>();
  const hadDoneAtStart = Object.keys(session.done).length > 0;
  let anySucceeded = hadDoneAtStart;
  let finishedBytes = Object.keys(session.done).reduce((sum, n) => sum + partBytes(Number(n)), 0);
  let lastT = performance.now();
  let lastB = finishedBytes;
  let rate = 0;
  const report = () => {
    const sent = finishedBytes + [...inflight.values()].reduce((a, b) => a + b, 0);
    const now = performance.now();
    if (now - lastT > 500) {
      const inst = ((sent - lastB) * 1000) / (now - lastT);
      rate = rate ? rate * 0.7 + inst * 0.3 : inst;
      lastT = now;
      lastB = sent;
    }
    onProgress({ sentBytes: sent, totalBytes: file.size, partsDone: Object.keys(session.done).length, partsTotal: total, bytesPerSec: rate });
  };
  report();

  const queue = Array.from({ length: total }, (_, i) => i + 1).filter((n) => !session.done[n]);
  const worker = async () => {
    for (let n = queue.shift(); n !== undefined; n = queue.shift()) {
      const start = (n - 1) * session.part_size;
      const blob = file.slice(start, start + partBytes(n));
      for (let attempt = 1; ; attempt++) {
        if (signal?.aborted) throw new Error("Upload paused.");
        try {
          const etag = await putPart(session.urls[n - 1] ?? "", blob, (b) => { inflight.set(n, b); report(); }, signal);
          inflight.delete(n);
          session.done[n] = etag;
          anySucceeded = true;
          finishedBytes += blob.size;
          save(session);
          report();
          break;
        } catch (e) {
          inflight.delete(n);
          if ((e as { expired?: boolean }).expired) {
            clear();
            throw new Error("The upload link expired. Start the upload again.");
          }
          if (attempt >= RETRIES)
            throw new Error(
              anySucceeded
                ? "The connection keeps dropping. Try again — it will continue where it stopped."
                : "Storage refused the upload from this browser. This is a setup issue on our side, not your connection — tell us and we'll fix it.",
            );
          await new Promise((r) => setTimeout(r, Math.min(30_000, 1000 * 2 ** attempt)));
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, worker));

  const result = await call<{ match_id: string }>(
    "/upload/complete",
    {
      match_id: session.match_id,
      key: session.key,
      upload_id: session.upload_id,
      parts: Object.entries(session.done).map(([n, etag]) => ({ n: Number(n), etag })),
      meta: {
        team: meta.team,
        opponent: meta.opponent,
        date: meta.date,
        competition: meta.competition,
        venue: meta.venue,
        age_group: meta.ageGroup,
        kit_colour: meta.kitColour,
      },
    },
    token,
  );
  clear();
  return result;
}
