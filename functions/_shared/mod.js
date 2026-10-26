// Shared helpers for owner moderation links: signed, expiring tokens and a push notification.
const enc = new TextEncoder();
const BASE = "https://latenightstack.com";

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex) => {
  if (!/^[0-9a-f]{64}$/.test(hex)) return null;
  return Uint8Array.from(hex.match(/../g).map((h) => parseInt(h, 16)));
};

// token = "<expiry unix seconds>.<hmac of id:action:expiry>"
export async function makeToken(secret, id, action, ttlSeconds = 14 * 24 * 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`${id}:${action}:${exp}`));
  return `${exp}.${toHex(sig)}`;
}

export async function checkToken(secret, id, action, token) {
  const [exp, mac] = String(token || "").split(".");
  if (!secret || !/^\d{1,12}$/.test(exp || "") || Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const sig = fromHex(mac || "");
  if (!sig) return false;
  return crypto.subtle.verify("HMAC", await hmacKey(secret), sig, enc.encode(`${id}:${action}:${exp}`));
}

export async function notifyOwner(env, { id, name, message }) {
  if (!env.NTFY_TOPIC || !env.MOD_SECRET) return;
  const token = await makeToken(env.MOD_SECRET, id, "review");
  const url = `${BASE}/api/review?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`;
  const base = env.NTFY_BASE || "https://ntfy.sh";
  const res = await fetch(`${base}/${env.NTFY_TOPIC}`, {
    method: "POST",
    headers: { Title: "New visitor mark", Tags: "writing_hand", Click: url, Actions: `view, Review, ${url}` },
    body: message ? `${name}: ${message}` : name,
  });
  if (!res.ok) console.error("ntfy responded", res.status, (await res.text()).slice(0, 200));
}
