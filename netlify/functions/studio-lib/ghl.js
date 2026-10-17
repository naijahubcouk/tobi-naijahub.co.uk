'use strict';
/*
 * GoHighLevel (LeadConnector) — send Business Club invite emails from Admin through GHL.
 * Netlify environment variables (Production):
 *   GHL_TOKEN         Private Integration token (GHL → Settings → Private Integrations; scopes: Contacts + Conversations/Messages)
 *   GHL_LOCATION_ID   Location (sub-account) ID
 *   GHL_EMAIL_FROM    optional — default "Auntie Tobi <info@auntietobi.com>"
 * API: https://services.leadconnectorhq.com
 *   POST /contacts/upsert          (Version 2021-07-28)  → { contact: { id } }
 *   POST /conversations/messages   (Version 2021-04-15)  { type: 'Email', contactId, subject, html, message, emailFrom, emailTo }
 */
const core = require('./core');
const { HttpError, env } = core;

const BASE = 'https://services.leadconnectorhq.com';
const DEFAULT_FROM = 'Auntie Tobi <info@auntietobi.com>';

function config() {
  const token = env('GHL_TOKEN') || env('GHL_PRIVATE_TOKEN') || env('GHL_API_KEY');
  const locationId = env('GHL_LOCATION_ID');
  return { token, locationId, from: env('GHL_EMAIL_FROM', DEFAULT_FROM), ok: !!(token && locationId) };
}
function status() { const c = config(); return { connected: c.ok, from: c.from, locationId: c.locationId || '', missing: [!c.token && 'GHL_TOKEN', !c.locationId && 'GHL_LOCATION_ID'].filter(Boolean) }; }

async function call(path, version, body) {
  const c = config();
  if (!c.ok) throw new HttpError(409, 'ghl_not_connected', 'GHL isn’t connected yet — add GHL_TOKEN and GHL_LOCATION_ID in Netlify.');
  let res, data;
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    res = await fetch(BASE + path, { method: 'POST', signal: ctrl.signal, headers: { Authorization: `Bearer ${c.token}`, Version: version, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    throw new HttpError(504, 'ghl_timeout', 'GHL didn’t respond — please try again.');
  } finally { clearTimeout(timer); }
  if (!res.ok) {
    const msg = String((data && (Array.isArray(data.message) ? data.message.join(', ') : data.message || data.error)) || `HTTP ${res.status}`).slice(0, 300);
    console.error('[ghl] error', path, res.status, msg);
    const e = new HttpError(502, res.status === 401 || res.status === 403 ? 'ghl_auth' : 'ghl_error',
      res.status === 401 || res.status === 403 ? 'GHL refused the request — check the token has Contacts and Conversations access, and the Location ID is right.' : `GHL couldn’t do that: ${msg}`);
    e.ghlStatus = res.status; e.ghlMessage = msg;
    throw e;
  }
  return data || {};
}

async function upsertContact(p) {
  const c = config();
  const body = { locationId: c.locationId, email: p.email, name: p.name || undefined, companyName: p.companyName || undefined, phone: p.phone || undefined, website: p.website || undefined, tags: p.tags && p.tags.length ? p.tags : undefined, source: 'Auntie Tobi Admin' };
  const r = await call('/contacts/upsert', '2021-07-28', body);
  const id = r.contact && r.contact.id;
  if (!id) throw new HttpError(502, 'ghl_error', 'GHL didn’t return a contact.');
  return { id, created: !!r.new };
}

// Plain text → simple HTML email (escaped, links clickable, paragraphs).
function toHtml(text) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paras = String(text || '').replace(/\r/g, '').trim().split(/\n{2,}/).map(p => esc(p)
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#057A44">$1</a>')
    .replace(/\n/g, '<br>'));
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#0F1E36;max-width:560px">${paras.map(p => `<p style="margin:0 0 14px">${p}</p>`).join('')}</div>`;
}

async function sendEmail({ contactId, to, subject, text }) {
  const c = config();
  const body = { type: 'Email', contactId, subject, html: toHtml(text), message: String(text || ''), emailFrom: c.from, emailTo: to || undefined };
  let r;
  try { r = await call('/conversations/messages', '2021-04-15', body); }
  catch (e) {
    // Some accounts only accept a bare address for emailFrom — retry once without the display name.
    const bare = /<([^>]+)>/.exec(c.from);
    if (e.ghlStatus && e.ghlStatus >= 400 && e.ghlStatus < 500 && e.ghlStatus !== 401 && e.ghlStatus !== 403 && bare && /from/i.test(e.ghlMessage || '')) {
      r = await call('/conversations/messages', '2021-04-15', { ...body, emailFrom: bare[1] });
    } else throw e;
  }
  return { messageId: r.messageId || r.emailMessageId || '', conversationId: r.conversationId || '' };
}

function contactUrl(contactId) { const c = config(); return c.locationId && contactId ? `https://app.gohighlevel.com/v2/location/${encodeURIComponent(c.locationId)}/contacts/detail/${encodeURIComponent(contactId)}` : ''; }

module.exports = { config, status, upsertContact, sendEmail, toHtml, contactUrl, DEFAULT_FROM };
