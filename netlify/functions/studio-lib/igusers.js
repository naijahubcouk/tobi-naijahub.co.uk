'use strict';
/*
 * 📸 Instagram usernames from a post's comments (HQ → Instagram Growth → Usernames from comments).
 *  1. Screenshots of the comments → AI reads the usernames (any post)
 *  2. Pasted comment text → usernames picked out (any post, free)
 *  3. A link to one of YOUR posts (@auntietobi_uk) → every commenter, via Instagram's official API
 *     Netlify env: IG_ACCESS_TOKEN (long-lived Instagram token, "Instagram API with Instagram Login").
 *     The token is refreshed automatically every few weeks and kept in ig/token.
 */
const core = require('./core');
const { HttpError, getJson, setJson } = core;
const gen = require('./generate');

const RESERVED = /^(p|reel|reels|explore|stories|accounts|direct|about|developer|legal|tv|instagram|liked|reply|view|hide|see|more|translation|verified|follow|following|edited|author|pinned)$/i;
const clean = u => String(u || '').replace(/^@/, '').replace(/[.\s]+$/, '').toLowerCase();
const valid = u => /^[a-z0-9._]{2,30}$/.test(u) && !/^\d+[smhdw]?$/.test(u) && !/\.\./.test(u) && !RESERVED.test(u);
function uniq(list) { const seen = new Set(), out = []; for (const u of list.map(clean)) if (valid(u) && !seen.has(u)) { seen.add(u); out.push(u); } return out; }

// 2. pasted text: Instagram shows each comment as "username" on its own line, then the comment, plus @mentions
function fromText(text) {
  text = String(text || '').slice(0, 200000);
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean), out = [];
  const timeLine = l => /^(\d+\s*[smhdw]|\d+\s*(sec|min|hour|day|week)s?( ago)?|verified|•.*|edited)$/i.test(l);
  lines.forEach((t, i) => {
    const solo = t.match(/^@?([A-Za-z0-9._]{2,30})(?:\s*(?:✓|✔️|·|•)\s*.*|\s+\d+\s*[smhdw])?$/);
    // a name on its own line counts when it has a dot / underscore / digit, or the next line is a time like "2w" / "Verified"
    if (solo && (/[._\d]/.test(solo[1]) || timeLine(lines[i + 1] || '') || /\s\d+\s*[smhdw]$/.test(t))) out.push(solo[1]);
    const lead = t.match(/^([A-Za-z0-9._]{2,30})\s+\S/);   // "user.name the comment…" on one line
    if (lead && /[._\d]/.test(lead[1])) out.push(lead[1]);
  });
  for (const m of text.matchAll(/@([A-Za-z0-9._]{2,30})/g)) out.push(m[1]);
  return uniq(out);
}

// 2b. pasted LIKES list ("Liked by" / Likes page): each person shows as
//   username ↵ Full Name (optional) ↵ Follow / Following / Remove …  (and sometimes "username's profile picture")
// Only the username line is taken — never the display name or buttons.
function fromLikes(text) {
  text = String(text || '').slice(0, 300000);
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean), out = [];
  const BTN = /^(follow|following|follow back|requested|remove|message|unfollow|verified|·|•)$/i;
  const HANDLE = /^@?([A-Za-z0-9._]{2,30})(?:\s*(?:✓|✔️|Verified))?$/;
  let lastTaken = -9;
  lines.forEach((t, i) => {
    const pic = t.match(/^@?([A-Za-z0-9._]{2,30})['’]s profile picture$/i);
    if (pic) { out.push(pic[1]); lastTaken = i; return; }
    const h = t.match(HANDLE); if (!h || BTN.test(t)) return;
    const n1 = lines[i + 1] || '', n2 = lines[i + 2] || '';
    if (BTN.test(n2) && !BTN.test(n1)) { out.push(h[1]); lastTaken = i; return; }             // username, display name, button
    if (BTN.test(n1) && lastTaken !== i - 1) { out.push(h[1]); lastTaken = i; return; }      // username, button (no display name)
    if (/[._\d]/.test(h[1]) && !/^[A-Z][a-z]+$/.test(t) && lastTaken !== i - 1 && !BTN.test(n1) && (!n1 || !HANDLE.test(n1) || /\s/.test(n1))) { out.push(h[1]); lastTaken = i; }   // a clear handle (dot/underscore/digit) followed by a display name
  });
  return uniq(out);
}

// 1. screenshots (data URLs) → usernames, read by AI
async function fromImages(images) {
  images = (Array.isArray(images) ? images : []).filter(x => /^data:image\/(png|jpe?g|webp);base64,/.test(String(x))).slice(0, 8);
  if (!images.length) throw new HttpError(400, 'invalid', 'Add at least one screenshot.');
  const settings = await core.getSettings();
  const out = await gen.callModel([
    { role: 'system', content: 'You read screenshots of Instagram comments or of a post\'s Likes list. For a Likes list, take ONLY the username line of each person (the handle above or beside their full name), never the full/display name or Follow buttons. For comments, list EVERY commenter username exactly as shown (the bold name above or before each comment, including replies), plus any @mentions in the comments. Ignore the post author caption header, "Reply", "See translation", times like "2w", like counts and buttons. Return ONLY JSON: {"usernames":["name1","name2"]}. Never guess or invent a name you cannot read clearly.' },
    { role: 'user', content: [{ type: 'text', text: 'Usernames in these comment screenshots:' }].concat(images.map(u => ({ type: 'image_url', image_url: { url: u } }))) },
  ], 1500, settings, { json: true, raw: true, timeoutMs: 24000 });
  gen.addGlobal(core.monthKey(), { cost: 0, inTok: out.inTok, outTok: out.outTok, costUsd: out.costUsd }, settings).catch(() => {});
  let list = [];
  try { list = JSON.parse(String(out.text).replace(/^```(?:json)?\s*|\s*```$/g, '')).usernames || []; } catch (_) { list = (String(out.text).match(/[A-Za-z0-9._]{2,30}/g) || []); }
  return uniq(list);
}

// 3. your own post via the Instagram API
const API = 'https://graph.instagram.com/v21.0';
async function token() {
  const saved = await getJson('ig/token').catch(() => null);
  let t = (saved && saved.token) || core.env('IG_ACCESS_TOKEN');
  if (!t) throw new HttpError(400, 'not_connected', 'Your Instagram isn’t connected yet — add IG_ACCESS_TOKEN in Netlify (see the steps in HQ).');
  // long-lived tokens last 60 days: refresh when it's more than 20 days old
  if (!saved || !saved.at || Date.now() - Date.parse(saved.at) > 20 * 864e5) {
    try {
      const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t)}`);
      const j = await r.json();
      if (r.ok && j.access_token) { t = j.access_token; await setJson('ig/token', { token: t, at: core.nowIso() }); }
      else if (!saved) await setJson('ig/token', { token: t, at: core.nowIso() });
    } catch (_) { /* keep the current token */ }
  }
  return t;
}
async function api(path, t) {
  const r = await fetch(path.startsWith('http') ? path : `${API}${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(t)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const msg = (j.error && j.error.message) || `Instagram said ${r.status}`;
    if (/expired|session|token/i.test(msg)) throw new HttpError(401, 'ig_token', 'Your Instagram connection has expired — make a new token and update IG_ACCESS_TOKEN in Netlify.');
    throw new HttpError(502, 'ig_error', 'Instagram: ' + msg);
  }
  return j;
}
function shortcodeOf(link) { const m = String(link || '').match(/instagram\.com\/(?:[A-Za-z0-9._]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/); return m ? m[1] : ''; }
async function fromOwnPost(link) {
  const code = shortcodeOf(link);
  if (!code) throw new HttpError(400, 'invalid', 'Paste a link to one of your Instagram posts or Reels (instagram.com/p/… or /reel/…).');
  const t = await token();
  // find the post among your recent posts (up to 500)
  let next = `/me/media?fields=id,permalink,caption,comments_count&limit=50`, media = null, pages = 0;
  while (next && !media && pages < 10) {
    const j = await api(next, t); pages++;
    media = (j.data || []).find(m => String(m.permalink || '').includes('/' + code));
    next = j.paging && j.paging.next ? j.paging.next : '';
  }
  if (!media) throw new HttpError(404, 'not_found', 'That post isn’t on your connected Instagram account (only your own posts can be read this way). For other posts, use screenshots or paste the comments.');
  const names = [], comments = []; let c = `/${media.id}/comments?fields=username,text,timestamp,replies{username,text}&limit=50`, n = 0;
  while (c && n < 20) {
    const j = await api(c, t); n++;
    for (const x of j.data || []) { names.push(x.username); comments.push({ u: x.username, t: String(x.text || '').slice(0, 200) }); for (const r of (x.replies && x.replies.data) || []) { names.push(r.username); comments.push({ u: r.username, t: String(r.text || '').slice(0, 200), reply: true }); } }
    c = j.paging && j.paging.next ? j.paging.next : '';
  }
  for (const x of comments) for (const m of String(x.t).matchAll(/@([A-Za-z0-9._]{2,30})/g)) names.push(m[1]);   // people tagged in the comments too
  const own = String(core.env('IG_USERNAME', 'auntietobi_uk')).toLowerCase();
  return { usernames: uniq(names).filter(u => u !== own), comments: comments.slice(0, 500), caption: String(media.caption || '').slice(0, 120), total: media.comments_count };
}
async function connected() { return !!(core.env('IG_ACCESS_TOKEN') || ((await getJson('ig/token').catch(() => null)) || {}).token); }

// Which usernames are already in your directory (by Instagram handle)
async function matchDirectory(usernames) {
  const dir = await require('./bizdir').all(), by = new Map();
  for (const b of dir) if (b.ig) by.set(String(b.ig).toLowerCase(), { slug: b.slug, name: b.name });
  const out = {}; for (const u of usernames) if (by.has(u)) out[u] = by.get(u);
  return out;
}

module.exports = { fromLikes, fromText, fromImages, fromOwnPost, connected, matchDirectory, shortcodeOf };
