'use strict';
/*
 * Auntie Tobi HQ — /.netlify/functions/studio-hq   (admin only; same sign-in as Business Studio Admin)
 *   POST { action: 'boot' | 'conv-list' | 'conv-get' | 'conv-rename' | 'conv-pin' | 'conv-delete' | 'search'
 *          | 'mem-list' | 'mem-save' | 'mem-delete' | 'mem-save-many' | 'prompt-save' | 'prompt-delete'
 *          | 'settings-save' | 'img' | 'snapshot' }
 *   GET  ?img=<id>                  an uploaded image
 *   POST ?stream=1 { convId?, text, images, files, mode, regenerate?, editIndex?, confirmed? }  → streamed reply (see hq.js)
 */
const core = require('../core');
const { HttpError, handler } = core;
const hq = require('../hq');

async function auth(ctx) {
  const a = await core.requireAdmin(ctx);
  await core.rateLimit('hq', a.email, 600, 60 * 60 * 1000);
  return a;
}

exports.handler = handler(async (ctx) => {
  const { event, body } = ctx;
  if (event.httpMethod === 'GET') {
    await core.requireAdmin(ctx);
    const img = await hq.getImage((event.queryStringParameters || {}).img);
    if (!img) throw new HttpError(404, 'not_found', 'Not found.');
    const m = /^data:([^;]+);base64,(.*)$/.exec(img.dataUrl);
    return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=86400' }, body: m[2], isBase64Encoded: true };
  }
  const admin = await auth(ctx);
  switch (body.action) {
    case 'boot': {
      const [convs, memory, prompts, settings, usage, snap] = await Promise.all([hq.listConvs(), hq.getMemory(), hq.getPrompts(), hq.getSettings(), hq.usage(), hq.snapshot(event)]);
      return { admin: admin.email, convs, memoryCount: memory.facts.length, cats: hq.CATS, prompts, settings, usage, snapshot: snap };
    }
    case 'snapshot': return { snapshot: await hq.snapshot(event) };
    case 'conv-list': return { convs: await hq.listConvs() };
    case 'conv-get': {
      const c = await hq.getConv(body.id);
      // Don't send stored file contents back — just names.
      return { conv: { ...c, messages: c.messages.map(m => ({ ...m, files: (m.files || []).map(f => ({ name: f.name, chars: f.chars })) })) } };
    }
    case 'conv-rename': await hq.renameConv(body.id, body.title); return { ok: true };
    case 'conv-pin': await hq.pinConv(body.id, body.on); return { ok: true };
    case 'conv-delete': await hq.deleteConv(body.id); return { ok: true };
    case 'search': return { results: await hq.search(body.q) };
    case 'mem-list': return { facts: (await hq.getMemory()).facts, cats: hq.CATS };
    case 'mem-save': { const f = await hq.saveFact(body.fact, body.source); await core.audit(admin.email, 'hq_memory_save', { id: f.id }); return { fact: f }; }
    case 'mem-save-many': {
      const out = [];
      for (const f of (Array.isArray(body.facts) ? body.facts : []).slice(0, 5)) {
        if (f.replacesId) { try { out.push(await hq.saveFact({ id: f.replacesId, cat: f.cat, text: f.text })); continue; } catch (e) { /* replaced fact gone → add new */ } }
        out.push(await hq.saveFact({ cat: f.cat, text: f.text }, 'chat'));
      }
      await core.audit(admin.email, 'hq_memory_save', { n: out.length, from: 'chat' });
      return { facts: out };
    }
    case 'mem-delete': await hq.deleteFact(String(body.id || '')); await core.audit(admin.email, 'hq_memory_delete', { id: body.id }); return { ok: true };
    case 'prompt-save': return { prompt: await hq.savePrompt(body.prompt) };
    case 'prompt-delete': await hq.deletePrompt(String(body.id || '')); return { ok: true };
    case 'settings-save': { const s = await hq.saveSettings(body.settings); await core.audit(admin.email, 'hq_settings', s); return { settings: s, usage: await hq.usage() }; }
    case 'img': return { id: await hq.saveImage(body.dataUrl) };
    default: throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { allowGet: true, maxBody: 2 * 1024 * 1024 });

// Streaming chat (bypasses the JSON adapter so the reply can arrive word by word).
exports.stream = async function (req, context) {
  const headers = {};
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  const event = { httpMethod: req.method, headers, queryStringParameters: {}, body: '' };
  const json = (status, o) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.');
    const ctx = { event, cookiesOut: [] };
    // Same-site check (X-Studio header + origin).
    if (headers['x-studio'] !== '1') throw new HttpError(403, 'forbidden', 'Request blocked.');
    if (headers.origin) { let h; try { h = new URL(headers.origin).host; } catch (e) { h = ''; } if (h !== headers.host) throw new HttpError(403, 'forbidden', 'Request blocked.'); }
    await auth(ctx);
    const raw = await req.text();
    if (raw.length > 400000) throw new HttpError(413, 'too_large', 'That message is too large — try a smaller file.');
    let body; try { body = JSON.parse(raw || '{}'); } catch (e) { throw new HttpError(400, 'bad_json', 'Invalid request.'); }
    const turn = await hq.prepareTurn(body);
    return new Response(hq.streamTurn(turn), { status: 200, headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
  } catch (e) {
    if (e instanceof HttpError) return json(e.status || 400, { error: e.code, message: e.message });
    console.error('[hq] stream setup failed', e);
    return json(500, { error: 'server_error', message: 'Something went wrong — please try again.' });
  }
};
