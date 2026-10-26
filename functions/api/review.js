// Owner-only moderation page, reached from the push notification. Every link is signed and expires.
//   GET  /api/review?id=...&t=...   shows the entry with Approve / Reject / Delete buttons
//   POST /api/review                applies one action (each button carries its own signed token)
import { checkToken, makeToken } from "../_shared/mod.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
};
const page = (title, body, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>
body{margin:0;font:17px/1.5 system-ui,sans-serif;background:#07100d;color:#eef3f0;display:grid;place-items:center;min-height:100vh;padding:20px}
main{width:min(520px,100%);background:#0f1a16;border:1px solid #243a33;border-radius:20px;padding:22px}
h1{font-size:1.3rem;margin:0 0 4px}.m{color:#9db0a8;font-size:14px;margin:0 0 14px}
.sig{background:#16241f;border-radius:12px;padding:10px;color:#fff;margin:12px 0}.sig svg{width:100%;height:auto;display:block}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}button{flex:1;min-width:110px;font:inherit;font-weight:700;border:0;border-radius:12px;padding:14px;cursor:pointer}
.a{background:#3de8b0;color:#04201c}.r{background:#2a3a35;color:#eef3f0}.d{background:#5a2433;color:#ffd7e0}
.tag{display:inline-block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:2px 10px;border-radius:99px;border:1px solid #3a5a50;color:#9db0a8}
</style></head><body><main>${body}</main></body></html>`,
    { status, headers: HEADERS }
  );

function signature(strokes) {
  let d = "";
  for (const s of strokes) s.forEach((p, i) => { d += `${i ? "L" : "M"}${Number(p[0]) | 0} ${Number(p[1]) | 0}`; });
  return `<svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!env.DB || !env.MOD_SECRET || !ID.test(id) || !(await checkToken(env.MOD_SECRET, id, "review", url.searchParams.get("t")))) {
    return page("Link not valid", `<h1>This link is not valid</h1><p class="m">It may have expired. Use ./scripts/guestbook.sh instead.</p>`, 403);
  }
  const row = await env.DB.prepare("SELECT id, name, message, strokes, status FROM entries WHERE id = ?").bind(id).first();
  if (!row) return page("Not found", `<h1>Not found</h1><p class="m">This mark was already deleted.</p>`, 404);
  const [a, r, d] = await Promise.all(["approve", "reject", "delete"].map((act) => makeToken(env.MOD_SECRET, id, act, 3600)));
  const btn = (act, label, cls, tok) =>
    `<form method="post" action="/api/review" style="flex:1;display:flex"><input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="action" value="${act}"><input type="hidden" name="t" value="${esc(tok)}"><button class="${cls}" style="width:100%">${label}</button></form>`;
  return page(
    "Review a visitor mark",
    `<span class="tag">${esc(row.status)}</span><h1>${esc(row.name)}</h1>${row.message ? `<p class="m">${esc(row.message)}</p>` : '<p class="m">(no message)</p>'}
<div class="sig">${signature(JSON.parse(row.strokes))}</div>
<div class="row">${btn("approve", "Approve", "a", a)}${btn("reject", "Hide", "r", r)}${btn("delete", "Delete", "d", d)}</div>
<p class="m" style="margin-top:14px">Buttons expire after an hour. Reload this link for fresh ones.</p>`
  );
}

export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const id = String(form.get("id") || "");
  const action = String(form.get("action") || "");
  if (!env.DB || !env.MOD_SECRET || !ID.test(id) || !["approve", "reject", "delete"].includes(action) ||
      !(await checkToken(env.MOD_SECRET, id, action, form.get("t")))) {
    return page("Not allowed", `<h1>Not allowed</h1><p class="m">That button has expired. Open the notification link again.</p>`, 403);
  }
  const sql = action === "delete" ? "DELETE FROM entries WHERE id = ?" : "UPDATE entries SET status = ? WHERE id = ?";
  const stmt = action === "delete" ? env.DB.prepare(sql).bind(id) : env.DB.prepare(sql).bind(action === "approve" ? "approved" : "rejected", id);
  const res = await stmt.run();
  const done = { approve: "Approved. It will appear on the site within about a minute.", reject: "Hidden. It stays in the database but is not shown.", delete: "Deleted for good." }[action];
  return page("Done", `<h1>Done</h1><p class="m">${esc(res.meta?.changes ? done : "Nothing changed (already handled?).")}</p>`);
}
