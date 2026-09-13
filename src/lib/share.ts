/**
 * Share links carry everything a public page needs, so a visitor without an
 * account can open them: the match id (which the analysis is derived from) plus
 * the names and score to print at the top.
 */

export type SharePayload = {
  m: string; // match id
  d: number; // duration in seconds
  a: string; // team A
  b: string; // team B
  sa: number;
  sb: number;
  p?: string; // player id, player share only
};

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(token: string) {
  const padded = token.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShareToken(payload: SharePayload) {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeShareToken(token: string): SharePayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(token)) as SharePayload;
    if (!parsed || typeof parsed.m !== "string" || typeof parsed.d !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}
