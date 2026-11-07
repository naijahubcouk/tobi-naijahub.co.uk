'use strict';
/*
 * Auntie Tobi HQ Content Hub — /.netlify/functions/studio-hq
 * Who can use it: admins (STUDIO_ADMIN_EMAILS) and the HQ team (hq/team — e.g. an assistant).
 * The HQ team signs in with an "hq" session, which never works in Business Studio Admin.
 *   POST { action: 'login-request' | 'login-verify' | 'logout' }                 (no session needed)
 *   POST { action: 'boot' | 'save' | 'save-many' | 'delete' | 'restore' | 'img' }
 *   POST { action: 'team-save', emails: [] }                                      (admins only)
 *   POST { action: 'app-save' | 'app-delete' }   Publish to App (updates, articles, events shown in the main app)
 *   POST { action: 'app-ai', notes, kind, category }   ✨ Write with AI — returns a draft only, never publishes
 *   POST { action: 'igc-gen' | 'igc-posted' | 'igc-delete' }   💬 Comment Assistant — drafts Instagram comments, never posts them
 *   POST { action: 'subs' | 'sub-approve' | 'sub-decline' | 'sub-delete' }   public event submissions (review queue)
 *   GET  ?subimg=<id>  a submitted event flyer
 *   GET  ?img=<id>     a card image
 */
const core = require('../core');
const { HttpError, handler } = core;
const hq = require('../hq');
const apppub = require('../apppub');
const appai = require('../appai');
const eventsub = require('../eventsub');
const igcomment = require('../igcomment');
const carousel = require('../carousel');
const tplcar = require('../tplcarousel');
const videoad = require('../videoad');
const videoai = require('../videoai');
const directory = require('../directory');

function requireEmail(e) {
  const email = core.normalizeEmail(e);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'invalid_email', 'Please enter a valid email address.');
  return email;
}

// Admin cookie (admins) or HQ cookie (HQ team, re-checked against the team list every time).
async function requireHq(ctx) {
  const cookies = core.parseCookies(ctx.event);
  if (cookies[core.COOKIE_ADMIN]) {
    try { const a = await core.requireAdmin(ctx); return { email: a.email, isAdmin: true }; } catch (e) { /* fall through to HQ cookie */ }
  }
  const token = cookies[core.COOKIE_HQ];
  if (token && token.length <= 100) {
    const sess = await core.getJson(`sess/${core.sha256(token)}`);
    if (sess && sess.role === 'hq' && sess.expiresAt > Date.now() && (await hq.team()).includes(sess.email)) return { email: sess.email, isAdmin: false, sections: await hq.sectionsFor(sess.email) };
    ctx.cookiesOut.push(core.clearCookie(core.COOKIE_HQ));
  }
  throw new HttpError(401, 'signed_out', 'Please sign in.');
}

// Per-person access: which section(s) each action belongs to. Admins and "everything" members pass.
const CARDS = ['today', 'board', 'calendar', 'posted'];
const ACTION_SECTIONS = {
  save: CARDS, 'save-many': CARDS, delete: CARDS, img: CARDS, bin: ['bin'], restore: ['bin'],
  'app-picture': ['app', 'subs', 'cars', 'vads'], 'app-img': ['app', 'subs', 'cars', 'vads'],
  subs: ['subs'], 'team-save': [],
};
function sectionsOf(action) {
  if (ACTION_SECTIONS[action]) return ACTION_SECTIONS[action];
  if (/^app-/.test(action)) return ['app'];
  if (/^sub-/.test(action)) return ['subs'];
  if (/^igc-/.test(action)) return ['igc'];
  if (/^car-/.test(action)) return ['cars'];
  if (/^tc-/.test(action)) return ['cars'];
  if (/^(va|vm|md)-/.test(action)) return ['vads'];
  return null; // boot, purge (admin-only) etc. are checked where they run
}
function can(who, list) { return who.isAdmin || !who.sections || list.some(x => who.sections.includes(x)); }
function mustAllow(who, list) { if (!can(who, list)) throw new HttpError(403, 'no_access', 'You don’t have access to this part of HQ — ask Auntie Tobi.'); }

exports.handler = handler(async (ctx) => {
  const { event, body } = ctx;
  if (event.httpMethod === 'GET') {
    const whoG = await requireHq(ctx);
    const q = event.queryStringParameters || {};
    if (q.vfinal || q.vaudio) mustAllow(whoG, ['vads']);
    else if (q.subimg) mustAllow(whoG, ['app', 'subs', 'cars', 'vads']);
    if (q.vfinal) {
      const part = await videoai.getFinalPart(q.vfinal, q.part || '0');
      if (!part) throw new HttpError(404, 'not_found', 'Not found.');
      return { statusCode: 200, headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'private, max-age=86400' }, body: part.b64, isBase64Encoded: true };
    }
    const img = q.vaudio ? await videoai.getAudio(q.vaudio) : q.subimg ? await eventsub.getImage(q.subimg) : await hq.getImage(q.img);
    if (!img) throw new HttpError(404, 'not_found', 'Not found.');
    const m = /^data:([^;]+);base64,(.*)$/.exec(img.dataUrl);
    return { statusCode: 200, headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=86400' }, body: m[2], isBase64Encoded: true };
  }

  // ── sign-in ──
  if (body.action === 'login-request') {
    const email = requireEmail(body.email);
    await core.rateLimit('hq-otp-ip', ctx.ip, 10, 60 * 60 * 1000);
    if (core.adminEmails().includes(email)) await core.issueOtp(email, 'admin');
    else if ((await hq.team()).includes(email)) await core.issueOtp(email, 'hq');
    else await core.sleep(300 + Math.random() * 400);
    return { ok: true, message: 'If that address has HQ access, a code is on its way.' };
  }
  if (body.action === 'login-verify') {
    const email = requireEmail(body.email);
    await core.rateLimit('hq-verify-ip', ctx.ip, 20, 60 * 60 * 1000);
    const role = core.adminEmails().includes(email) ? 'admin' : (await hq.team()).includes(email) ? 'hq' : '';
    if (!role || !(await core.checkOtp(email, role, body.code))) throw new HttpError(400, 'invalid_code', 'That code is incorrect or has expired.');
    const s = await core.createSession(email, role, event);
    ctx.cookiesOut.push(s.cookie);
    await core.audit(email, role === 'admin' ? 'admin_login' : 'hq_login', { ip: ctx.ip, via: 'hq' });
    return { ok: true };
  }
  if (body.action === 'logout') {
    const c = core.parseCookies(event);
    for (const name of [core.COOKIE_HQ, core.COOKIE_ADMIN]) {
      if (c[name]) await core.del(`sess/${core.sha256(c[name])}`).catch(() => {});
      ctx.cookiesOut.push(core.clearCookie(name));
    }
    return { ok: true };
  }

  const who = await requireHq(ctx);
  await core.rateLimit('hq', who.email, 1200, 60 * 60 * 1000);
  { const need = sectionsOf(String(body.action || '')); if (need) mustAllow(who, need); }
  const has = list => can(who, list);
  switch (body.action) {
    case 'boot': return { admin: who.email, me: who.email, isAdmin: who.isAdmin, names: await hq.names(), team: who.isAdmin ? await hq.teamFull() : undefined, sections: who.isAdmin ? null : (who.sections || null), items: has(CARDS) || has(['bin']) ? await hq.list() : [], bin: has(['bin']) ? await hq.bin() : [], trashDays: hq.TRASH_DAYS, today: core.dayKey(), types: hq.TYPES, topics: hq.TOPICS, statuses: hq.STATUSES, app: has(['app']) ? await apppub.list() : [], appCategories: apppub.CATEGORIES, subs: has(['subs']) ? await eventsub.list() : [], igc: has(['igc']) ? await igcomment.list() : [], igcTarget: igcomment.DAILY_TARGET, cars: has(['cars']) ? await carousel.list() : [], tcars: has(['cars']) ? await tplcar.list() : [], vads: has(['vads']) ? await videoad.list() : [], abizNew: who.isAdmin ? await require('../addbiz').hqList().then(r => r.subs.filter(x => x.status === 'new').length + r.listed.length).catch(() => 0) : 0 };
    case 'save': return { item: await hq.save(body.item, who.email) };
    case 'save-many': return { items: await hq.saveMany(body.items, body.source, who.email) };
    case 'delete': return { n: await hq.remove(body.ids || body.id, false, who.email) };
    case 'restore': return { n: await hq.remove(body.ids || body.id, true, who.email), items: await hq.list() };
    case 'bin': return { bin: await hq.bin() };
    case 'purge': {
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can delete cards forever.');
      const n = await hq.purge(body.ids || body.id);
      await core.audit(who.email, 'hq_purge', { n });
      return { n, bin: await hq.bin() };
    }
    case 'img': return { id: await hq.saveImage(body.dataUrl) };
    case 'app-save': {
      const item = await apppub.save(body.item, who.email);
      await core.audit(who.email, 'hq_app_save', { id: item.id, kind: item.kind, status: item.status });
      return { item };
    }
    case 'app-link': {
      await core.rateLimit('hq-ai', who.email, 60, 60 * 60 * 1000, 'That\u2019s a lot of AI drafts this hour — please wait a little.');
      if (body.kind && body.kind !== 'event') { // 📰 News / 📝 Article from a link
        const media = require('../eventmedia');
        const page = await media.readLink(body.url, true);
        const notes = page.notes + (body.notes ? `\n\nExtra notes:\n${String(body.notes).slice(0, 2000)}` : '');
        const [draft, image] = await Promise.all([appai.write(notes, body.kind, body.category), media.fetchImage(page.imageUrl)]);
        if (!draft.link) draft.link = appai.cleanLink(page.link);
        await core.audit(who.email, 'hq_app_ai', { kind: body.kind, from: 'link' });
        return { draft, image };
      }
      const r = await eventsub.fromLink(body.url, body.notes);
      return { draft: { kind: 'event', ...r.draft }, image: r.image };
    }
    case 'app-flyer': {
      await core.rateLimit('hq-ai', who.email, 60, 60 * 60 * 1000, 'That\u2019s a lot of AI drafts this hour — please wait a little.');
      return { draft: { kind: 'event', ...(await eventsub.readFlyer(body.image)) } };
    }
    case 'app-picture': {
      await core.rateLimit('hq-pic', who.email, 80, 60 * 60 * 1000, 'That\u2019s a lot of images this hour — please wait a little.');
      return { image: await require('../eventmedia').makePicture(body) };
    }
    case 'app-img': return { imgId: await eventsub.saveImage(body.image) };
    case 'app-ai': {
      await core.rateLimit('hq-ai', who.email, 60, 60 * 60 * 1000, 'That\u2019s a lot of AI drafts this hour — please wait a little.');
      const draft = await appai.write(body.notes, body.kind, body.category, { rewrite: !!body.rewrite });
      await core.audit(who.email, 'hq_app_ai', { kind: body.kind, rewrite: !!body.rewrite });
      return { draft };
    }
    case 'igc-gen': {
      await core.rateLimit('hq-igc', who.email, 80, 60 * 60 * 1000, 'That\u2019s a lot of comment ideas this hour — please wait a little.');
      const entry = await igcomment.generate(body, who.email);
      await core.audit(who.email, 'hq_igc', { style: entry.style, goal: entry.goal });
      return { entry };
    }
    case 'igc-posted': return { entry: await igcomment.markPosted(body.id, body.i, body.text, who.email) };
    case 'car-ai': {
      await core.rateLimit('hq-ai', who.email, 60, 60 * 60 * 1000, 'That\u2019s a lot of AI drafts this hour — please wait a little.');
      let notes = String(body.notes || '');
      if (body.url) { const page = await require('../eventmedia').readLink(body.url, true); notes = page.notes + (notes ? `\n\nExtra notes:\n${notes.slice(0, 2000)}` : ''); }
      return { draft: await carousel.write(notes, { count: body.count }) };
    }
    case 'va-biz': return { results: await directory.search(ctx.event, String(body.q || '').slice(0, 80), 8).catch(() => []) };
    case 'va-biz-get': { const b = await directory.bySlug(ctx.event, String(body.slug || '')); return { biz: b ? { name: b.name, slug: b.slug, cat: b.cat, loc: b.loc, desc: b.desc, wa: b.wa, ig: b.ig, website: b.website || b.shop || '' } : null }; }
    case 'va-plan': {
      await core.rateLimit('hq-ai', who.email, 60, 60 * 60 * 1000, 'That\u2019s a lot of AI drafts this hour — please wait a little.');
      let extra = String(body.extra || '');
      if (body.brief && body.brief.link && body.readLink) {
        try { const page = await require('../eventmedia').readLink(body.brief.link, true); body.brief.notes = `${body.brief.notes || ''}\n\nFrom their page:\n${page.notes.slice(0, 2500)}`.trim(); } catch (_) { /* carry on without it */ }
      }
      return videoad.planStep1(body.brief, extra);
    }
    case 'va-prompts': return videoad.planPrompts(body.brief, body.plan, Number(body.from) || 0, Number(body.to) || 4);
    case 'va-finish': return videoad.planFinish(body.brief, body.plan);
    case 'va-rewrite': {
      await core.rateLimit('hq-ai', who.email, 60, 60 * 60 * 1000, 'That\u2019s a lot of AI drafts this hour — please wait a little.');
      return { text: await videoad.rewrite(body.brief, body.field, body.text, body.how, body.context) };
    }
    case 'vm-settings': return { settings: await videoai.publicSettings(who.isAdmin) };
    case 'vm-settings-save': {
      if (!who.isAdmin) throw new core.HttpError(403, 'admin_only', 'Only an admin can change the video AI settings.');
      await videoai.saveSettings(body.settings); await core.audit(who.email, 'hq_videoai_settings', {});
      return { settings: await videoai.publicSettings(true) };
    }
    case 'vm-clip': {
      await core.rateLimit('hq-vclip', who.email, 120, 60 * 60 * 1000, 'That\u2019s a lot of clips this hour — please wait a little.');
      return { job: await videoai.submitClip(body) };
    }
    case 'vm-audio-save': return { aid: await videoai.saveAudio(body.dataUrl, who.email) };
    case 'md-concepts': case 'md-outline': case 'md-scenes': case 'md-check': case 'md-fix': case 'md-import': case 'md-import-scenes': {
      await core.rateLimit('hq-ai', who.email, 120, 60 * 60 * 1000, 'That\u2019s a lot of AI writing this hour — please wait a little.');
      const md = require('../minidrama');
      if (body.action === 'md-concepts') return { concepts: await md.concepts(body.brief) };
      if (body.action === 'md-outline') return md.outline(body.brief);
      if (body.action === 'md-scenes') return md.scenes(body.brief, body.plan, Number(body.from) || 0, Number(body.to) || 3);
      if (body.action === 'md-check') return { storyCheck: await md.check(body.brief, body.plan) };
      if (body.action === 'md-import') return md.importOutline(body.brief, body.prev && typeof body.prev === 'object' ? body.prev : null);
      if (body.action === 'md-import-scenes') return md.importScenes(body.brief, body.plan, Number(body.from) || 0, Number(body.to) || 3);
      return md.fix(body.brief, body.plan, body.nums, body.how);
    }
    case 'va-concepts': {
      await core.rateLimit('hq-ai', who.email, 60, 60 * 60 * 1000, 'That\u2019s a lot of AI drafts this hour — please wait a little.');
      return { concepts: await videoad.concepts(body.brief) };
    }
    case 'va-refvideo': {
      await core.rateLimit('hq-ai', who.email, 60, 60 * 60 * 1000, 'That\u2019s a lot of AI drafts this hour — please wait a little.');
      return { style: await videoad.analyseReference(body.frames, body.seconds, body.notes) };
    }
    case 'vm-check': return { check: await videoad.checkClip(body.frame, body.refs, body.scene) };
    case 'vm-voice-save': return { voices: await videoai.saveVoice(String(body.id || ''), body.label) };
    case 'vm-voice-del': return { voices: await videoai.deleteVoice(String(body.id || '')) };
    case 'vm-lipsync': return { job: await videoai.submitLipsync(body) };
    case 'vm-sfx': return { job: await videoai.submitSfx(body) };
    case 'vm-final-part': return { ok: await videoai.saveFinalPart(body.fid, Number(body.idx), body.b64) };
    case 'vm-final-delete': { await videoai.deleteFinal(body.fid, body.parts); return { ok: true }; }
    case 'vm-music': return { job: await videoai.submitMusic(body) };
    case 'vm-status': return { results: await videoai.status(body.jobs), spentGbp: await videoai.spent() };
    case 'vm-tts': {
      await core.rateLimit('hq-vtts', who.email, 200, 60 * 60 * 1000, 'That\u2019s a lot of voiceovers this hour — please wait a little.');
      return videoai.tts(body);
    }
    case 'va-save': return { item: await videoad.save(body.item, who.email) };
    case 'va-delete': { await videoad.remove(String(body.id || '')); return { ok: true }; }
    case 'car-save': return { item: await carousel.save(body.item, who.email) };
    case 'car-delete': { await carousel.remove(String(body.id || '')); return { ok: true }; }
    case 'tc-ai': {
      await core.rateLimit('hq-ai', who.email, 60, 60 * 60 * 1000, 'That\u2019s a lot of AI drafts this hour — please wait a little.');
      let notes = String(body.notes || '');
      if (body.url) { const page = await require('../eventmedia').readLink(body.url, true); notes = page.notes + (notes ? `\n\nExtra notes:\n${notes.slice(0, 2000)}` : ''); }
      return { draft: await tplcar.write(notes, { count: body.count, end: body.end !== false }) };
    }
    case 'tc-save': return { item: await tplcar.save(body.item, who.email) };
    case 'tc-delete': { await tplcar.remove(String(body.id || '')); return { ok: true }; }
    case 'igc-delete': { await igcomment.remove(body.id); return { ok: true }; }
    case 'subs': return { subs: await eventsub.list() };
    case 'sub-approve': {
      const post = await eventsub.approve(String(body.id || ''), body.item, who.email);
      await core.audit(who.email, 'hq_sub_approve', { id: body.id, post: post.id });
      return { post, subs: await eventsub.list(), app: await apppub.list() };
    }
    case 'sub-decline': {
      await eventsub.decline(String(body.id || ''), who.email);
      await core.audit(who.email, 'hq_sub_decline', { id: body.id });
      return { subs: await eventsub.list() };
    }
    case 'sub-delete': {
      await eventsub.remove(String(body.id || ''));
      return { subs: await eventsub.list() };
    }
    case 'app-delete': {
      await apppub.remove(String(body.id || ''));
      await core.audit(who.email, 'hq_app_delete', { id: String(body.id || '') });
      return { ok: true, app: await apppub.list() };
    }
    case 'bday-art': case 'bday-art-make': case 'bday-art-del': {
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can change the birthday card art.');
      const bday = require('../bday');
      if (body.action === 'bday-art-make') { await core.rateLimit('hq-pic', who.email, 80, 60 * 60 * 1000, 'That\u2019s a lot of images this hour — please wait a little.'); return { art: await bday.makeArt(String(body.key || ''), String(body.size || '')), designs: Object.keys(bday.ART), groups: bday.GROUPS }; }
      if (body.action === 'bday-art-del') return { art: await bday.removeArt(String(body.key || ''), String(body.size || '')), designs: Object.keys(bday.ART), groups: bday.GROUPS };
      return { art: await bday.artIndex(), designs: Object.keys(bday.ART), groups: bday.GROUPS };
    }
    case 'dir-list': case 'dir-save': case 'dir-delete': case 'dir-preview': case 'dir-apply': {
      // 🏢 the business directory (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can change the directory.');
      const bizdir = require('../bizdir');
      if (body.action === 'dir-preview') return { preview: await bizdir.previewImport(String(body.csv || '')) };
      if (body.action === 'dir-apply') { const stats = await bizdir.applyImport(String(body.csv || ''), !!body.hideGone, who.email); await core.audit(who.email, 'hq_dir_import', stats); return { stats, items: await bizdir.all(), info: await bizdir.info() }; }
      if (body.action === 'dir-save') {
        const raw = Object.assign({}, body.item || {}); const data = raw.imgData; delete raw.imgData;
        if (data) { const slug = raw.origSlug || raw.slug || bizdir.slugify(raw.name); raw.slug = raw.slug || slug; raw.img = await require('../bizimg').put(slug, data, raw.imgSrc === 'card' ? 'card' : 'upload'); }
        delete raw.imgSrc;
        // 📸 gallery (up to 6 photos, shown on Featured business pages): keep the ones still listed, add new uploads, delete removed ones
        if (Array.isArray(raw.galleryAdd) || Array.isArray(raw.gallery)) {
          const bizimg = require('../bizimg'), slug = raw.origSlug || raw.slug || bizdir.slugify(raw.name);
          const old = ((await bizdir.all()).find(x => x.slug === slug) || {}).gallery || [];
          const keep = (Array.isArray(raw.gallery) ? raw.gallery : old).filter(u => old.includes(u));
          const add = (Array.isArray(raw.galleryAdd) ? raw.galleryAdd : []).slice(0, Math.max(0, 6 - keep.length));
          const added = []; for (const d of add) added.push(await bizimg.put(slug + '~g' + Date.now().toString(36) + added.length, d, 'upload'));
          for (const u of old.filter(u => !keep.includes(u))) { const m = String(u).match(/\/bimg\/([^/]+)-[a-z0-9]{1,8}\.(jpg|png|webp)$/i); if (m) await bizimg.remove(decodeURIComponent(m[1])); }
          raw.gallery = keep.concat(added);
        }
        delete raw.galleryAdd;
        // ✏️ changed a listing that's on the directory website → keep your words (the website sync won't overwrite them) and list them under “Changes to copy to the website”
        { const old = (await bizdir.all()).find(x => x.slug === (raw.origSlug || raw.slug));
          if (old && (old.src === 'website' || old.uploadedAt)) {
            const ch = {}; for (const k of bizdir.OWNER_FIELDS) if (k !== 'img' && raw[k] !== undefined && String(raw[k] || '').trim() !== String(old[k] || '').trim() && String(raw[k] || '').trim()) ch[k] = raw[k];
            if (Object.keys(ch).length) { raw.ownerEd = Object.assign({}, old.ownerEd || {}, ch); raw.ownerEdAt = core.nowIso(); }
          } }
        const item = await bizdir.save(raw, who.email); await core.audit(who.email, 'hq_dir_save', { slug: item.slug }); }
      if (body.action === 'dir-delete') {
        const slug = String(body.slug || ''), b = (await bizdir.all()).find(x => x.slug === slug);
        if (b && body.never) await require('../finder').neverAdd(b, 'Removed from the directory (asked not to be listed)');
        await bizdir.remove(slug, who.email); await require('../bizimg').remove(slug); await core.audit(who.email, 'hq_dir_delete', { slug, never: !!body.never });
      }
      return { items: await bizdir.all(), info: await bizdir.info() };
    }
    case 'dm-share': case 'dm-share-stop': case 'dm-today': case 'dm-all': case 'dm-add': case 'dm-act': case 'dm-pages': case 'dm-tpl': case 'dm-ideas': case 'dm-search': case 'dm-shots': case 'dm-detail': case 'dm-remove': {
      // 📨 DM Outreach — cold DMs sent by hand from your marketing pages, tracked here (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can use this.');
      const dm = require('../igdm');
      if (body.action === 'dm-share') { await dm.setShare(body); return await dm.today(); }
      if (body.action === 'dm-share-stop') { await dm.stopShare(); return await dm.today(); }
      if (body.action === 'dm-today') return await dm.today();
      if (body.action === 'dm-detail') return { rec: await dm.detail(body.u) };
      if (body.action === 'dm-remove') { const r = await dm.removeMany(body.us); await core.audit(who.email, 'hq_dm_remove', { n: r.removed }); return Object.assign(r, await dm.overview()); }
      if (body.action === 'dm-add') return Object.assign(await dm.add(body.usernames, body.source), await dm.overview());
      if (body.action === 'dm-shots') { await core.rateLimit('hq-igu', who.email, 60, 3600000, 'That’s a lot of screenshots — try again in an hour.'); return { usernames: await require('../igusers').fromImages(body.images) }; }
      if (body.action === 'dm-act') { const r = await dm.act(body.u, String(body.what || ''), { page: body.page, pageName: body.pageName, ver: body.ver, notes: body.notes }); return { rec: r }; }
      if (body.action === 'dm-pages') { await dm.savePages(body.pages); await core.audit(who.email, 'hq_dm_pages', {}); }
      if (body.action === 'dm-tpl') { await dm.saveTpl(body.tpl || {}); await core.audit(who.email, 'hq_dm_tpl', {}); }
      if (body.action === 'dm-ideas') { await core.rateLimit('hq-dmai', who.email, 60, 3600000, 'Try again in a little while.'); return await dm.ideas(body.city, body.interest); }
      if (body.action === 'dm-search') { await core.rateLimit('hq-dmai', who.email, 60, 3600000, 'Try again in a little while.'); return { accounts: await dm.searchPages(body.q) }; }
      return await dm.overview();
    }
    case 'market-list': case 'market-get': case 'market-img': case 'market-save': case 'market-delete': case 'market-allowance': case 'market-review': case 'market-ai': {
      // 🛍️ Marketplace (HQ), admin only — the same actions as Studio Admin, plus ✨ fill a product from photos + your words
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can manage the Marketplace.');
      if (body.action === 'market-ai') return await require('../marketai').fill(body.images, body.text, who.email);
      return await require('./admin').marketAction(body.action, body, ctx, who.email);
    }
    case 'hq-fill': case 'hq-write': {   // ✨ fill a listing from a website / Instagram / screenshots, ✍️ rewrite its descriptions (admin only, like the directory)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can change the directory.');
      const ab = require('../addbiz');
      if (body.action === 'hq-fill') return await ab.hqFill({ web: body.web, ig: body.ig, shots: body.shots, notes: body.notes, current: body.current, wantPic: !!body.wantPic }, who.email);
      return await ab.hqWrite(body.current, body.notes, who.email);
    }
    case 'abiz-list': case 'abiz-review': case 'abiz-delete': case 'abiz-listed': case 'abiz-preview': case 'abiz-announce': {
      // ➕ Add your business — owners' new listings, claims and name changes (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can use this.');
      const ab = require('../addbiz');
      if (body.action === 'abiz-review') await ab.review(String(body.id || ''), body.decision === 'approve' ? 'approve' : 'decline', body.edits || null, who.email);
      if (body.action === 'abiz-delete') await ab.removeSub(String(body.id || ''));
      if (body.action === 'abiz-listed') { const r = await ab.sendListed(Array.isArray(body.slugs) ? body.slugs : null, who.email); await core.audit(who.email, 'hq_addbiz_listed', r); return Object.assign(await ab.hqList(), { sentNow: r.sent }); }
      if (body.action === 'abiz-preview') return { mail: await ab.previewEmail(String(body.id || ''), String(body.slug || '')) };
      if (body.action === 'abiz-announce') { const r = await ab.announceSend(who.email, body.test ? who.email : ''); return Object.assign(await ab.hqList(), { announceNow: r }); }
      return await ab.hqList();
    }
    case 'photos-status': case 'photos-run': case 'photos-retry': case 'photos-check': {
      // 📷 copy the website's business photos to Auntie Tobi (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can use this.');
      const bp = require('../bizphotos');
      if (body.action === 'photos-retry') { await bp.retry(); return await bp.run(14000); }
      if (body.action === 'photos-run') return await bp.run(14000);
      if (body.action === 'photos-check') { const c = await bp.check(12000); return Object.assign(await bp.summary(), { check: c }); }
      return await bp.summary();
    }
    case 'dirhook-status': case 'dirsync-test': case 'dirsync-live': case 'dirsync-retry': case 'dirsync-dismiss': {
      // 🔄 live sync from the directory website (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can use this.');
      const ds = require('../dirsync');
      if (body.action === 'dirsync-test') return { read: await ds.testRead(body.url) };
      if (body.action === 'dirsync-live') await ds.setLive(!!body.on);
      if (body.action === 'dirsync-retry') { const r = await ds.retry(String(body.name || '')); const st = await require('../dirhook').status(); return Object.assign(st, { retried: r }); }
      if (body.action === 'dirsync-dismiss') await ds.dismiss(String(body.name || ''));
      return await require('../dirhook').status();
    }
    case 'img-settings': case 'img-compare': {
      // 🎨 which AI makes HQ's pictures, and a side-by-side test (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can use this.');
      const em = require('../eventmedia');
      if (body.action === 'img-compare') { await core.rateLimit('hq-imgcmp', who.email, 30, 60 * 60 * 1000, 'That’s a lot of test images this hour — please wait a little.'); return { results: await em.compareImages(body.prompt, body.aspect, body.models, body.ref, body.quality) }; }
      if (body.set) { const r = await em.saveImageSettings(body.set); await core.audit(who.email, 'hq_image_model', r); }
      return await em.imageSettings();
    }
    case 'boost-list': case 'boost-save': {
      // 🚀 After posting checklist + 24-hour numbers (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can use this.');
      const boost = require('../boost');
      if (body.action === 'boost-save') return { item: await boost.save(body.item) };
      return { items: await boost.list() };
    }
    case 'disc-list': case 'disc-save': case 'disc-del': case 'disc-img-put': case 'disc-img': case 'disc-dirpic': case 'disc-posted': case 'disc-unpost': case 'disc-club': case 'disc-mkt': case 'disc-mktpic': {
      // 📣 Business discovery posts (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can use this.');
      const disc = require('../discovery');
      if (body.action === 'disc-club') return { slugs: await disc.clubSlugs() };
      if (body.action === 'disc-mkt') return { items: await disc.mktList() };
      if (body.action === 'disc-mktpic') return { dataUrl: await disc.mktPic(body.id) };
      if (body.action === 'disc-img-put') return { id: await disc.putImg(body.dataUrl) };
      if (body.action === 'disc-img') return { dataUrl: await disc.getImg(body.id) };
      if (body.action === 'disc-dirpic') return { dataUrl: await disc.dirPic(String(body.slug || '')) };
      if (body.action === 'disc-save') return { part: await disc.save(body.part || {}), items: await disc.list() };
      if (body.action === 'disc-del') await disc.remove(String(body.id || ''));
      if (body.action === 'disc-posted') await disc.posted(String(body.id || ''), body.url, who.email);
      if (body.action === 'disc-unpost') await disc.unpost(String(body.id || ''));
      return { items: await disc.list() };
    }
    case 'iga-all': case 'iga-rules': case 'iga-connect': case 'iga-disconnect': case 'iga-ice': {
      // ⚡ Auto-replies (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can use this.');
      const ig = require('../igauto');
      if (body.action === 'iga-connect') { const ts = String(Date.now()); return { url: ig.connectUrl(ts + '.' + core.hmac('igconnect:' + ts).slice(0, 32)) }; }
      if (body.action === 'iga-disconnect') { await ig.disconnect(String(body.id || '')); await core.audit(who.email, 'hq_iga_disconnect', { id: body.id }); }
      if (body.action === 'iga-rules') { await ig.saveRules(body.rules || {}); await core.audit(who.email, 'hq_iga_rules', {}); }
      if (body.action === 'iga-ice') { await ig.saveRules(Object.assign(await ig.rules(), { ice: body.ice || [] })); return Object.assign(await ig.overview(), { iceResult: await ig.applyIce() }); }
      return await ig.overview();
    }
    case 'igu-status': case 'igu-text': case 'igu-img': case 'igu-post': {
      // 👥 Instagram usernames from a post's comments (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can use this.');
      const igu = require('../igusers');
      if (body.action === 'igu-status') return { connected: await igu.connected() };
      let r;
      if (body.action === 'igu-text') r = { usernames: body.likes ? igu.fromLikes(body.text) : igu.fromText(body.text) };
      if (body.action === 'igu-img') { await core.rateLimit('hq-igu', who.email, 60, 3600000, 'That’s a lot of screenshots — try again in an hour.'); r = { usernames: await igu.fromImages(body.images) }; }
      if (body.action === 'igu-post') { await core.rateLimit('hq-igu-post', who.email, 60, 3600000, 'Try again in a little while.'); r = await igu.fromOwnPost(String(body.link || '')); }
      r.inDirectory = await igu.matchDirectory(r.usernames);
      return r;
    }
    case 'crm-tpl': case 'crm-list': case 'crm-detail': case 'crm-act': case 'crm-email': case 'crm-settings': {
      // 🏢 Business directory tracking (admin only) — Club invites moved here from Business Studio Admin
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can use this.');
      const crm = require('../crm'), invites = require('../invites');
      const slug = String(body.slug || '');
      if (body.action === 'crm-detail') return await crm.detail(slug);
      if (body.action === 'crm-tpl') { const st = await invites.load(); return { templates: invites.templates(st), perDay: st.settings.perDay }; }
      if (body.action === 'crm-act') {
        await invites.act(slug, String(body.act || ''), { days: body.days, notes: body.notes, via: body.via, email: body.email, date: body.date, text: body.text });
        if (body.act === 'joined') await require('../outreach').mark(slug, 'joined').catch(() => {});
        await core.audit(who.email, 'hq_crm_' + body.act, { slug });
        return await crm.detail(slug);
      }
      if (body.action === 'crm-email') { const r = await crm.sendEmail(slug, body.subject, body.body, who.email); await core.audit(who.email, 'hq_crm_email', { slug }); return Object.assign(await crm.detail(slug), { sentTo: r.to }); }
      if (body.action === 'crm-settings') { await invites.saveSettings(body.settings || {}); await core.audit(who.email, 'hq_crm_settings', {}); }
      return await crm.list();
    }
    case 'out-overview': case 'out-settings': case 'out-send': case 'out-hand': case 'out-hand-done': case 'out-mark': case 'out-preview': {
      // 📧 business email journeys (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can send outreach emails.');
      const out = require('../outreach');
      if (body.action === 'out-settings') { await out.saveSettings(body.settings || {}); await core.audit(who.email, 'hq_out_settings', body.settings || {}); }
      if (body.action === 'out-send') { const r = await out.sendBatch(25); await core.audit(who.email, 'hq_out_send', r); return r; }
      if (body.action === 'out-hand') return await out.handMessage(String(body.slug || ''));
      if (body.action === 'out-hand-done') await out.markHand(String(body.slug || ''));
      if (body.action === 'out-mark') { await out.mark(String(body.slug || ''), ['joined', 'stop', 'restart', 'start-new', 'start-c', 'start-u'].includes(body.what) ? body.what : 'stop'); await core.audit(who.email, 'hq_out_mark', { slug: body.slug, what: body.what }); }
      if (body.action === 'out-preview') return await out.previewFor(String(body.slug || ''), String(body.step || ''));
      return await out.overview();
    }
    case 'mail-list': case 'mail-save': case 'mail-restore': case 'mail-test': case 'mail-preview': case 'mail-add': case 'mail-remove': case 'mail-wel': case 'mail-wel-preview': case 'mail-wel-test': {
      // 📝 email templates (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can change the emails.');
      const emails = require('../emails');
      const id = String(body.id || '');
      if (body.action === 'mail-save') { const t = await emails.save(id, body.subject, body.body, who.email); await core.audit(who.email, 'hq_mail_save', { id }); return { item: t }; }
      if (body.action === 'mail-restore') { const t = await emails.restore(id); await core.audit(who.email, 'hq_mail_restore', { id }); return { item: t }; }
      if (body.action === 'mail-add') {
        if (body.series) { await require('../welcome').save({ add: { days: body.day, subject: body.name, text: '' } }, String(body.series)); await core.audit(who.email, 'hq_mail_add', { series: body.series }); }
        else { const nid = await emails.addExtra(String(body.j || ''), body.day, body.name, who.email); await core.audit(who.email, 'hq_mail_add', { id: nid }); }
        return await emails.list();
      }
      if (body.action === 'mail-remove') {
        if (body.series) await require('../welcome').save({ remove: id }, String(body.series)); else if (/^x/.test(id)) await emails.removeExtra(id);
        else if (body.undo) await emails.restoreBuiltIn(id); else await emails.removeBuiltIn(id);
        await core.audit(who.email, 'hq_mail_remove', { id, series: body.series || '' });
        return await emails.list();
      }
      if (body.action === 'mail-wel-preview' || body.action === 'mail-wel-test') {
        const st = body.step || {}, pv = require('../welcome').welcomeEmailPreview({ subject: String(st.subject || ''), text: String(st.text || ''), emailBody: String(st.emailBody || '') }, 'Ada’s Kitchen', String(body.series || 'free'));
        if (body.action === 'mail-wel-preview') return Object.assign(pv, { business: 'Ada’s Kitchen (sample)' });
        await core.rateLimit('hq-mailtest', who.email, 20, 3600000, 'That’s a lot of test emails — try again in an hour.');
        if (!(await core.sendEmail([who.email], '[TEST] ' + pv.subject, pv.text, pv.html))) throw new HttpError(502, 'send_failed', 'The test email didn’t send.');
        return { to: who.email, business: 'Ada’s Kitchen (sample)' };
      }
      if (body.action === 'mail-wel') {
        // a Business Studio welcome message (same settings as Business Studio Admin → Messages)
        const st = body.step || {};
        await require('../welcome').save({ steps: [{ id: String(st.id || ''), days: st.days, text: st.text, subject: st.subject, on: st.on !== false, email: st.email !== false, emailBody: typeof st.emailBody === 'string' ? st.emailBody : undefined }] }, String(body.series || ''));
        await core.audit(who.email, 'hq_mail_wel', { series: body.series, id: st.id });
        return await emails.list();
      }
      if (body.action === 'mail-preview' && emails.T[id] && emails.T[id].sys) {
        const SAMPLE = { name: 'Ada', until: '3 November 2027', studio_link: core.appUrl(), email: 'ada@example.com', marketplace_link: core.siteBase() + '/marketplace/list', code: '482913', brand: 'Auntie Tobi Business Studio', credits: 300, expires: '3 November 2027', plan: 'Business Studio Plus', credits_per_day: 50, price: '£50', date: '10 November 2026', period: 'year', cancel_link: core.appUrl() + '?cancel=1', keep_link: core.appUrl(), after_plan: 'the Free plan', number: '12345678', note: 'Your note appears here.', message: 'Thank you for your message! Here is my reply…', idea: 'Please add a stock list', reply: 'Great idea — it’s on our list.', status: 'Planned', listing: 'Party jollof tray', link: core.siteBase() + '/marketplace', how_to_update: 'Update it in your Business Studio.', outcome: 'We’re not able to list it at the moment.' };
        return Object.assign(emails.renderWith({ subject: String(body.subject || emails.T[id].subject), body: String(body.body || emails.T[id].body) }, SAMPLE, ''), { business: 'sample details' });
      }
      if (body.action === 'mail-test' && emails.T[id] && emails.T[id].sys) {
        await core.rateLimit('hq-mailtest', who.email, 20, 3600000, 'That’s a lot of test emails — try again in an hour.');
        const pv = await handlerSelf({ action: 'mail-preview', id, subject: body.subject, body: body.body });
        if (!(await core.sendEmail([who.email], '[TEST] ' + pv.subject, pv.text, pv.html))) throw new HttpError(502, 'send_failed', 'The test email didn’t send.');
        return { to: who.email, business: 'sample details' };
      }
      if (body.action === 'mail-preview') {
        const t = await emails.def(id); if (!t) throw new HttpError(404, 'not_found', 'Unknown email.');
        const dir = await require('../bizdir').all(), b = dir.find(x => !x.featured && !x.hidden && x.email && x.desc) || dir[0];
        const v = { business_name: b.name, category: String((b.cats && b.cats[0]) || b.cat || '').split('>').pop().trim(), town: b.loc || 'the UK', listing_link: core.siteBase() + '/biz/' + b.slug, claim_link: core.siteBase() + '/claim/' + encodeURIComponent(b.slug), remove_link: core.siteBase() + '/remove/…', unsubscribe_link: core.siteBase() + '/u/…', studio_link: core.siteBase() + '/business-studio', club_link: core.siteBase() + '/business-club', personal_line: body.personal ? 'Your ' + (b.cat || 'work') + ' looks lovely.' : '' };
        return Object.assign(emails.renderWith({ subject: String(body.subject || t.subject), body: String(body.body || t.body) }, v, emails.FOOTER_OUT), { business: b.name });
      }
      async function handlerSelf(b2) {
        const SAMPLE = { name: 'Ada', until: '3 November 2027', studio_link: core.appUrl(), email: 'ada@example.com', marketplace_link: core.siteBase() + '/marketplace/list', code: '482913', brand: 'Auntie Tobi Business Studio', credits: 300, expires: '3 November 2027', plan: 'Business Studio Plus', credits_per_day: 50, price: '£50', date: '10 November 2026', period: 'year', cancel_link: core.appUrl() + '?cancel=1', keep_link: core.appUrl(), after_plan: 'the Free plan', number: '12345678', note: 'Your note appears here.', message: 'Thank you for your message! Here is my reply…', idea: 'Please add a stock list', reply: 'Great idea — it’s on our list.', status: 'Planned', listing: 'Party jollof tray', link: core.siteBase() + '/marketplace', how_to_update: 'Update it in your Business Studio.', outcome: 'We’re not able to list it at the moment.' };
        return emails.renderWith({ subject: String(b2.subject || emails.T[b2.id].subject), body: String(b2.body || emails.T[b2.id].body) }, SAMPLE, '');
      }
      if (body.action === 'mail-test') { await core.rateLimit('hq-mailtest', who.email, 20, 3600000, 'That’s a lot of test emails — try again in an hour.'); return await require('../outreach').sendTest(id, who.email, String(body.slug || ''), body.subject && body.body ? { subject: String(body.subject), body: String(body.body) } : null); }
      return await emails.list();
    }
    case 'find-img': case 'find-list': case 'find-more': case 'find-quick': case 'find-decide': case 'find-csv': case 'find-uploaded': {
      // 🔎 Business Finder (admin only)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can use the Business Finder.');
      const finder = require('../finder');
      let note = null;
      if (body.action === 'find-img') return await finder.pictureFor(String(body.id || ''));
      if (body.action === 'find-more') note = { ran: await finder.more() };
      if (body.action === 'find-quick') { await core.rateLimit('hq-findq', who.email, 40, 3600000, 'That’s a lot of quick adds — try again in an hour.'); note = { ran: [await finder.quickAdd(String(body.input || ''))] }; }
      if (body.action === 'find-decide') { const c = await finder.decide(String(body.id || ''), String(body.decision || ''), body.edits || null, who.email); await core.audit(who.email, 'hq_find_' + body.decision, { name: c.name }); }
      if (body.action === 'find-csv') return await finder.exportCsv();
      if (body.action === 'find-uploaded') { const n = await finder.markUploaded(); await core.audit(who.email, 'hq_find_uploaded', { n }); }
      return Object.assign({ finder: await finder.summary() }, note || {});
    }
    case 'facts-get': case 'facts-save': {
      // ✅ the fact sheet the app chat always uses (it overrides the AI's out-of-date memory)
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can change the fact sheet.');
      if (body.action === 'facts-save') {
        const text = String(body.text || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean).join('\n');
        if (text.length > 8000) throw new HttpError(400, 'too_long', 'The fact sheet is too long — keep it under 8,000 characters.');
        await core.setJson('app/facts', { text, at: core.nowIso(), by: who.email });
        await core.audit(who.email, 'hq_facts_save', { chars: text.length });
      }
      const f = (await core.getJson('app/facts')) || { text: 'Companies House — registering a private limited company costs £100 online or £124 by post (GOV.UK fees, checked November 2026).', at: '' };
      return { facts: f };
    }
    case 'team-save': {
      if (!who.isAdmin) throw new HttpError(403, 'forbidden', 'Only Auntie Tobi can change who has access.');
      const t = await hq.setTeam(body.emails, body.names, body.access);
      await core.audit(who.email, 'hq_team', { n: t.emails.length });
      return { team: t };
    }
    default: throw new HttpError(400, 'unknown_action', 'Unknown action.');
  }
}, { allowGet: true, maxBody: 2.5 * 1024 * 1024 });
