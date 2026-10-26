// Visitor marks API (Cloudflare Pages Function, D1 binding `DB`).
//   GET  /api/guestbook  -> approved entries only
//   POST /api/guestbook  -> saves a new entry as 'pending' (hidden until approved with scripts/guestbook.sh)
//
// What is stored: a display name, an optional short message, the drawn signature as numbers, an art seed,
// and a one-way hash of the IP (for rate limiting only). No fingerprints or other biometrics are read.

import { notifyOwner } from "../_shared/mod.js";

const PAD_W = 600;
const PAD_H = 240;
const MAX_BODY_BYTES = 40_000;
const MAX_STROKES = 12;
const MAX_POINTS_PER_STROKE = 400;
const MAX_POINTS_TOTAL = 1800;
const MAX_NAME = 30;
const MAX_MESSAGE = 140;
const RATE_LIMIT_PER_HOUR = 3;
const MAX_PENDING = 300;
const MIN_SECONDS_ON_PAD = 2;

const ORIGIN_OK = [
  /^https:\/\/(www\.)?latenightstack\.com$/,
  /^https:\/\/([a-z0-9-]+\.)?latenightstack\.pages\.dev$/,
  /^http:\/\/localhost(:\d+)?$/,
];

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", ...extra },
  });

const clean = (value, max) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const LINKISH = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|io|ru|cn|xyz|top|info|co|in|me|ly)\b)/i;

function cleanStrokes(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_STROKES) return null;
  const out = [];
  let total = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const stroke of input) {
    if (!Array.isArray(stroke) || stroke.length < 2 || stroke.length > MAX_POINTS_PER_STROKE) return null;
    const pts = [];
    for (const p of stroke) {
      if (!Array.isArray(p) || p.length !== 2) return null;
      const x = Number(p[0]), y = Number(p[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const xi = Math.min(PAD_W, Math.max(0, Math.round(x)));
      const yi = Math.min(PAD_H, Math.max(0, Math.round(y)));
      pts.push([xi, yi]);
      minX = Math.min(minX, xi); maxX = Math.max(maxX, xi);
      minY = Math.min(minY, yi); maxY = Math.max(maxY, yi);
    }
    total += pts.length;
    if (total > MAX_POINTS_TOTAL) return null;
    out.push(pts);
  }
  if (maxX - minX < 24 && maxY - minY < 12) return null; // a dot is not a signature
  return out;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ entries: [], unavailable: true }, 503);
  const { results } = await env.DB.prepare(
    "SELECT id, name, message, strokes, seed, created_at FROM entries WHERE status = 'approved' ORDER BY created_at DESC LIMIT 80"
  ).all();
  const entries = results.map((r) => ({
    id: r.id, name: r.name, message: r.message, strokes: JSON.parse(r.strokes), seed: r.seed, at: r.created_at,
  }));
  return json({ entries }, 200, { "cache-control": "public, max-age=60" });
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return json({ error: "Guestbook is unavailable right now." }, 503);

  const origin = request.headers.get("origin") || "";
  if (!ORIGIN_OK.some((re) => re.test(origin))) return json({ error: "Not allowed from this site." }, 403);

  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) return json({ error: "That is too large." }, 413);
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: "That is too large." }, 413);

  let body;
  try { body = JSON.parse(text); } catch { return json({ error: "Could not read that." }, 400); }

  // Honeypot: real visitors never fill this in. Pretend it worked so bots do not adapt.
  if (body.website) return json({ ok: true, id: "dropped" });

  if (body.consent !== true) return json({ error: "Please tick the box to agree." }, 400);
  const seconds = Number(body.seconds);
  if (!Number.isFinite(seconds) || seconds < MIN_SECONDS_ON_PAD) return json({ error: "Take a moment, then sign." }, 400);

  const name = clean(body.name, MAX_NAME);
  const message = clean(body.message, MAX_MESSAGE);
  if (!name) return json({ error: "Please add your name." }, 400);
  if (LINKISH.test(name) || LINKISH.test(message)) return json({ error: "Links are not allowed here." }, 400);
  const strokes = cleanStrokes(body.strokes);
  if (!strokes) return json({ error: "Please draw a signature." }, 400);
  const seed = Number(body.seed);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return json({ error: "Could not read that." }, 400);

  const now = Math.floor(Date.now() / 1000);
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = await sha256Hex(`${ip}|${day}|${env.HASH_SALT || ""}`);

  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM entries WHERE ip_hash = ? AND created_at > ?")
    .bind(ipHash, now - 3600).first();
  if ((recent?.n ?? 0) >= RATE_LIMIT_PER_HOUR) return json({ error: "That is enough for now. Try again later." }, 429);

  const pending = await env.DB.prepare("SELECT COUNT(*) AS n FROM entries WHERE status = 'pending'").first();
  if ((pending?.n ?? 0) >= MAX_PENDING) return json({ error: "The guestbook is full for now. Please try later." }, 503);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO entries (id, name, message, strokes, seed, status, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)"
  ).bind(id, name, message, JSON.stringify(strokes), seed, now, ipHash).run();

  // Tell the owner (push notification with a signed review link). Never block or fail the visitor's request.
  const tell = notifyOwner(env, { id, name, message }).catch(() => {});
  if (typeof waitUntil === "function") waitUntil(tell);

  return json({ ok: true, id });
}
