'use strict';
/*
 * 🌐 Website sync — businesses approved in HQ go to the directory website by themselves.
 *
 * The directory website (DirectoryEasy) two-way syncs with the Google Sheet "Auntie Tobi - Listings" every 2 hours.
 * A small Google Apps Script in that sheet (Extensions → Apps Script → Deploy as web app) lets HQ:
 *   • add new rows with Status = PENDING  (never edits or deletes existing rows; skips a slug/name that's already there)
 *   • read back the Status of the rows it added — when Auntie Tobi publishes one in DirectoryEasy it turns PUBLISHED.
 * When a row is PUBLISHED, HQ marks the business "on the website" (uploadedAt) — the same as the old CSV upload — so the
 * "You're listed" email appears in HQ ready to send (it never sends by itself).
 *
 *   websheet/cfg   { url, connectedAt, lastSync, lastError }
 * The script is keyed with a private secret (HMAC of the studio secret) that HQ puts inside the script text.
 */
const core = require('./core');
const { HttpError, getJson, setJson, cas } = core;
const bizdir = require('./bizdir');

const KEY = 'websheet/cfg';
const secret = () => core.hmac('websheet-v1').slice(0, 32);
async function cfg() { return (await getJson(KEY).catch(() => null)) || {}; }

// The Apps Script Auntie Tobi pastes into the sheet (shown in HQ, with the secret filled in).
function script() {
  return `// Auntie Tobi HQ → website sync. Paste into Extensions → Apps Script, then Deploy → New deployment → Web app
// (Execute as: Me · Who has access: Anyone). Copy the Web app URL into HQ.
const SECRET = '${secret()}';
const SHEET = 'Listings';
function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents || '{}'); } catch (x) {}
  if (b.secret !== SECRET) return out({ error: 'not allowed' });
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
  if (!sh) return out({ error: 'No sheet called ' + SHEET });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const data = sh.getDataRange().getValues(), head = data[0].map(h => String(h).trim());
    const iSlug = head.indexOf('Slug'), iName = head.indexOf('Name'), iStatus = head.indexOf('Status');
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (b.action === 'ping') return out({ ok: true, rows: data.length - 1, columns: head.length });
    if (b.action === 'status') {
      const want = {}; (b.slugs || []).forEach(s => { want[s] = ''; });
      for (let r = 1; r < data.length; r++) { const s = String(data[r][iSlug]); if (s in want) want[s] = String(data[r][iStatus] || ''); }
      return out({ ok: true, status: want });
    }
    if (b.action === 'add') {
      const slugs = {}, names = {}; for (let r = 1; r < data.length; r++) { slugs[String(data[r][iSlug])] = 1; names[norm(data[r][iName])] = 1; }
      const added = [], skipped = [];
      (b.rows || []).forEach(row => {
        if (slugs[row.Slug] || names[norm(row.Name)]) { skipped.push(row.Slug); return; }
        sh.appendRow(head.map(h => row[h] != null ? row[h] : ''));
        slugs[row.Slug] = 1; names[norm(row.Name)] = 1; added.push(row.Slug);
      });
      return out({ ok: true, added: added, skipped: skipped });
    }
    return out({ error: 'unknown action' });
  } finally { lock.releaseLock(); }
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
`;
}

async function call(url, body) {
  if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url || '')) throw new HttpError(400, 'bad_url', 'That doesn’t look like the Web app address from Apps Script.');
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 25000);
  let r, j = null; const payload = JSON.stringify(Object.assign({ secret: secret() }, body));
  try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: payload, redirect: 'follow', signal: ctl.signal }); }
  catch (e) { throw new HttpError(502, 'sheet_down', 'Couldn’t reach the Google Sheet just now — please try again.'); }
  finally { clearTimeout(t); }
  try { j = JSON.parse(await r.text()); } catch (_) {}
  if (!j) throw new HttpError(502, 'sheet_bad', 'The Google Sheet didn’t answer properly — check the script is deployed as a Web app with access “Anyone”.');
  if (j.error) throw new HttpError(400, 'sheet_err', j.error === 'not allowed' ? 'The script in the sheet has a different key — copy the script from HQ again.' : 'Google Sheet: ' + j.error);
  return j;
}

// a business → one sheet row (the website's own column names)
const childCat = c => String(c || '').split('>').pop().trim().toLowerCase();
function row(b) {
  const finder = require('./finder');
  const short = b.short || String(b.desc || '').slice(0, 160), tags = (b.tags || []).join(', ');
  const cat = (b.cats && b.cats[0]) || finder.CATS.find(c => childCat(c) === String(b.cat || '').toLowerCase()) || '';
  const phone = b.phone || (b.wa ? '+' + String(b.wa).replace(/\D/g, '') : '');
  return {
    Slug: b.slug, Name: b.name, Description: short, 'Detailed Description': b.long || b.desc || '', Categories: cat, Tags: tags, Images: b.img || '',
    'Main Link': b.website || '', 'Contact Name': b.ownerName || 'Auntie Tobi', 'Location Address': b.addr || ((b.loc && b.loc !== 'UK' ? b.loc + ', ' : '') + 'UK'),
    'Location Latitude': b.lat != null ? b.lat : '', 'Location Longitude': b.lng != null ? b.lng : '', 'Business Phone': phone, 'Business Email': b.email || b.ownerEmail || '',
    Facebook: b.fb || '', Instagram: b.ig ? 'https://www.instagram.com/' + b.ig + '/' : '', TikTok: b.tt || '',
    Status: 'PENDING', 'Is Featured': 'No', 'Exempt From Automation': 'No', 'Admin Note': 'Added by Auntie Tobi HQ ' + core.nowIso().slice(0, 10),
    'SEO Title': b.name, 'SEO Description': short, 'SEO Keywords': tags, 'Focus Keyword': String(b.name || '').toLowerCase(), 'OG Title': b.name, 'OG Description': short,
    'Twitter Title': b.name, 'Twitter Description': short, 'Twitter Card': 'summary_large_image', 'Schema Type': 'LocalBusiness',
    'Created At': new Date().toISOString(), 'Updated At': new Date().toISOString(),   // the website's own rows always have these
  };
}
// approved in HQ and not on the website yet
const toSend = all => all.filter(b => b.src === 'hq' && !b.hidden && b.status !== 'pending' && !b.uploadedAt && !b.sheetAt);
const onSheet = all => all.filter(b => b.src === 'hq' && !b.hidden && b.sheetAt && !b.uploadedAt);

// ➕ send new ones, then 🔄 check which have been published — safe to run any time
async function sync(who) {
  const c = await cfg(); if (!c.url) return { off: true };
  let all = await bizdir.all(), sent = 0, live = 0, skipped = 0;
  try {
    const rows = toSend(all).slice(0, 40);
    if (rows.length) {
      const r = await call(c.url, { action: 'add', rows: rows.map(row) }), now = core.nowIso(), ok = new Set([].concat(r.added || [], r.skipped || []));
      sent = (r.added || []).length; skipped = (r.skipped || []).length;
      if (ok.size) await bizdir.markSheet([...ok], now);
      all = await bizdir.all();
    }
    const wait = onSheet(all);
    if (wait.length) {
      const st = (await call(c.url, { action: 'status', slugs: wait.map(b => b.slug) })).status || {};
      const pub = wait.filter(b => /^PUBLISHED$/i.test(String(st[b.slug] || '').trim())).map(b => b.slug);
      if (pub.length) { await bizdir.markUploaded(pub, core.nowIso()); live = pub.length;
        await cas('finder/state', cur => { if (!cur) return undefined; const s = new Set(pub); cur.items = cur.items.map(x => x.status === 'approved' && s.has(x.slug) ? Object.assign({}, x, { status: 'uploaded', uploadedAt: core.nowIso() }) : x); return cur; }).catch(() => {}); }
    }
    await cas(KEY, cur => Object.assign(cur || {}, { lastSync: core.nowIso(), lastError: '' }));
  } catch (e) {
    await cas(KEY, cur => Object.assign(cur || {}, { lastError: e.message, lastErrorAt: core.nowIso() })).catch(() => {});
    throw e;
  }
  return { sent, skipped, live };
}

async function status() {
  const c = await cfg(), all = await bizdir.all();
  return { connected: !!c.url, url: c.url ? c.url.replace(/\/exec.*$/, '/exec') : '', connectedAt: c.connectedAt || '', lastSync: c.lastSync || '', lastError: c.lastError || '',
    waiting: toSend(all).length, pending: onSheet(all).map(b => ({ slug: b.slug, name: b.name, at: b.sheetAt })), script: script() };
}
async function connect(url, who) {
  url = String(url || '').trim();
  const r = await call(url, { action: 'ping' });
  await setJson(KEY, Object.assign(await cfg(), { url, connectedAt: core.nowIso(), by: who, lastError: '' }));
  return { rows: r.rows };
}
async function disconnect() { await setJson(KEY, Object.assign(await cfg(), { url: '' })); return { ok: true }; }
// after an approval in HQ — best effort, never blocks the approval
function soon(who) { return sync(who).catch(e => console.error('[websheet] sync failed', e && e.message)); }

module.exports = { sync, status, connect, disconnect, soon, script };
