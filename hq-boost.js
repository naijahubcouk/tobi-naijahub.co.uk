/*
 * 🚀 After posting (Auntie Tobi HQ) — a timed checklist to help each Instagram post get seen:
 * share to Story, send by DM (sends matter most for reaching new people), pin a real question, reply in the first hour,
 * a second Story, then the 24-hour numbers (compared with your usual) and what to do next.
 * Used by Discovery posts and the Content Hub. Nothing is posted for you; no engagement-bait tricks.
 *   HQBoost.init(X)                      X = { api, sheet, toast, esc, S }
 *   HQBoost.open({ key, kind, title, url, postedAt, biz: [{ name, handle }], what: 'caterer', where: 'Manchester' })
 *   HQBoost.bestHtml() / HQBoost.bind(root)   "🏆 Your best posts" card
 */
(function () {
  'use strict';
  var X = null;
  function $(q, r) { return (r || document).querySelector(q); }
  function $$(q, r) { return Array.prototype.slice.call((r || document).querySelectorAll(q)); }
  function esc(s) { return X.esc(s); }

  async function load(force) {
    if (!X.S.boost || force) X.S.boost = (await X.api('boost-list').catch(function () { return { items: [] }; })).items || [];
    return X.S.boost;
  }
  function find(key) { return (X.S.boost || []).filter(function (b) { return b.key === key; })[0] || null; }
  async function save(item) {
    var r = await X.api('boost-save', { item: item });
    var L = X.S.boost || (X.S.boost = []), i = L.findIndex(function (b) { return b.key === r.item.key; });
    if (i >= 0) L[i] = r.item; else L.unshift(r.item);
    return r.item;
  }

  // ── the steps (minutes after posting) ──
  var STEPS = [
    { id: 'story', at: 0, t: '📲 Share it to your Story', d: 'Tap the paper plane under the post → <b>Add to story</b>. Add a <b>“New post”</b> or poll sticker so people tap through.' },
    { id: 'dmbiz', at: 0, t: '💬 Send it to the businesses in it', d: 'Ask them to share it to their Story and send it to a few friends. Sends reach new people more than anything else.', disc: true },
    { id: 'pages', at: 0, t: '📣 Your marketing pages: send it to 10 people each', d: 'One tap sets up <b>📨 DM Outreach</b> so each page has 10 Nigerians in the UK to message today, with this post’s link in a different message for each page. Each page also shares it to its Story.' },
    { id: 'pin', at: 0, t: '📌 Pin a comment with a real question', d: 'Comment on your own post, then press and hold → <b>Pin</b>. A real question gets real replies.' },
    { id: 'wa', at: 10, t: '🟢 Share on WhatsApp (Status and groups)', d: 'People who don’t follow you yet can find it this way.' },
    { id: 'reply', at: 0, t: '🙌🏾 Reply to every comment in the first hour', d: 'A few real words or a question back — not just an emoji. Like the comments too. Don’t post anything else for a few hours, so this post gets the attention.' },
    { id: 'story2', at: 360, t: '🌙 This evening: a second Story', d: 'Bring people back to the post with a poll or a “did you see this?”.' },
    { id: 'stats', at: 1440, t: '📊 After 24 hours: add the numbers', d: 'On the post: <b>View insights</b>. Copy the numbers here so HQ can compare it with your usual.' },
    { id: 'next', at: 2880, t: '🔁 After 48 hours: what next', d: '' },
  ];
  function ago(min) { if (min < 60) return min + ' min'; var h = Math.round(min / 60); return h < 48 ? h + ' hour' + (h === 1 ? '' : 's') : Math.round(h / 24) + ' days'; }
  function when(st, b) {
    if (b.steps && b.steps[st.id]) return '<span style="color:#057A44;font-weight:800">Done ✓</span>';
    var since = Math.floor((Date.now() - Date.parse(b.postedAt)) / 60000);
    if (st.id === 'reply') return since <= 60 ? '<span style="color:#B03A2E;font-weight:800">Now · ' + Math.max(0, 60 - since) + ' min left</span>' : '<span class="muted">Keep going today</span>';
    return since >= st.at ? '<span style="color:#B03A2E;font-weight:800">Now</span>' : '<span class="muted">In ' + ago(st.at - since) + '</span>';
  }

  // ── messages (with the link) ──
  function L(info) { return info.url || '[post link]'; }
  function msgs(info) {
    var t = info.title, u = L(info);
    return {
      story: 'New post 💚 ' + t + ' — tap to see it 👆🏾',
      biz: function (b) { return 'Hi ' + (b.name || '@' + b.handle) + ' 👋🏾 Auntie Tobi here! You’re in our new post “' + t + '” 💚 Please share it to your Story and send it to a few friends — it really helps more people find you: ' + u; },
      pages: 'New Auntie Tobi post is live 🙌🏾 “' + t + '”. Please share it to your Story and send it to 3 friends who’d love it: ' + u,
      wa: '🇳🇬 ' + t + ' 💚 Have a look and share it with someone who’d love it: ' + u,
      pins: info.kind === 'disc'
        ? ['Which of these have you tried? Tell us what you ordered 👇🏾', 'Which one are you trying first? 👇🏾', 'Which Nigerian ' + (info.what || 'business') + (info.where ? ' in ' + info.where : '') + ' should we feature next? Tell us below 👇🏾']
        : ['What do you think? Tell us below 👇🏾', 'Have you tried this? 👇🏾', 'What should we post about next? 👇🏾'],
      story2: info.kind === 'disc'
        ? ['Poll sticker: “Which would you try first?” with two of the businesses', '“Swipe to see who’s in it 👉🏾” over a screenshot of the post', 'Question sticker: “Who should we feature next?”']
        : ['Poll sticker about the post (“Yes / Not yet”)', '“Did you see this? 👀” over a screenshot of the post', 'Question sticker: “What would you add?”'],
    };
  }

  // ── 24-hour comparison ──
  function median(a) { a = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(a.length / 2); return a.length ? (a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2) : 0; }
  function compare(b) {
    if (!b.stats || b.stats.views == null) return null;
    var others = (X.S.boost || []).filter(function (o) { return o.key !== b.key && o.stats && o.stats.views != null; });
    if (others.length < 2) return { text: 'Saved. After a few more posts, HQ will tell you how each one compares with your usual.', good: null };
    var mv = median(others.map(function (o) { return o.stats.views; })), ms = median(others.map(function (o) { return o.stats.shares || 0; }));
    var r = mv ? b.stats.views / mv : 1;
    var sh = (b.stats.shares || 0) > ms ? ' and more shares than usual (' + b.stats.shares + ' vs ' + Math.round(ms) + ')' : '';
    if (r >= 1.2) return { text: '📈 ' + r.toFixed(1) + '× your usual views' + sh + '. This one is working.', good: true };
    if (r <= 0.8) return { text: '📉 Below your usual views (' + b.stats.views + ' vs about ' + Math.round(mv) + ').', good: false };
    return { text: '➖ About your usual views' + sh + '.', good: null };
  }
  function nextTip(b, info) {
    var c = compare(b);
    if (!c) return 'Add the 24-hour numbers first — then HQ suggests what to do next.';
    if (c.good) return '🔥 It’s doing well — follow up within a day while interest is high: ' + (info.kind === 'disc' ? 'start the next part, or make a short Reel showing 3 of the businesses.' : 'post a follow-up or a short Reel on the same topic.');
    if (c.good === false) return '🧪 Try the same idea as a <b>trial Reel</b> — Instagram shows it to people who don’t follow you first, so you can test a new hook without it going to your followers.';
    return '👍🏾 Steady. Try a stronger first line or first slide next time, and keep sending it to the businesses and pages.';
  }

  // ── the sheet ──
  async function open(info) {
    await load();
    var b = find(info.key);
    if (!b) b = await save({ key: info.key, title: info.title, url: info.url || '', postedAt: info.postedAt || new Date().toISOString() });
    else if ((info.url && !b.url) || (info.title && b.title !== info.title)) b = await save({ key: info.key, title: info.title, url: b.url || info.url || '' });
    info.url = b.url || info.url || '';
    var s = X.sheet('<div id="bsBody"></div>');
    var copies = {};
    function cp(id, text, label) { copies[id] = text; return '<button class="btn ghost sm" data-cp="' + id + '">📋 ' + (label || 'Copy') + '</button>'; }
    function draw() {
      var m = msgs(info), done = STEPS.filter(function (st) { return (!st.disc || info.kind === 'disc') && b.steps && b.steps[st.id]; }).length, total = STEPS.filter(function (st) { return !st.disc || info.kind === 'disc'; }).length;
      var open = b.url ? '<a class="btn ghost sm" href="' + esc(b.url) + '" target="_blank" rel="noopener">↗️ Open post</a>' : '';
      var body = function (st) {
        if (st.id === 'story') return cp('story', m.story, 'Copy Story text') + open;
        if (st.id === 'dmbiz') return (info.biz || []).map(function (x, i) { return '<div class="row" style="gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap"><b style="min-width:140px">@' + esc(x.handle) + '</b>' + cp('biz' + i, m.biz(x), 'Copy message') + '<a class="btn ghost sm" href="https://ig.me/m/' + encodeURIComponent(x.handle) + '" target="_blank" rel="noopener">💬 Open DM</a></div>'; }).join('') || '<span class="muted">No businesses in this post.</span>';
        if (st.id === 'pages') return (X.go ? '<button class="btn primary sm" id="bsDm">📨 Send via DM Outreach (10 per page)</button> ' : '') + cp('pages', m.pages, 'Copy message for the pages’ Stories');
        if (st.id === 'pin') return m.pins.map(function (p, i) { return '<div class="row" style="gap:6px;align-items:center;margin-top:4px"><span style="flex:1">“' + esc(p) + '”</span>' + cp('pin' + i, p) + '</div>'; }).join('') + '<div style="margin-top:6px">' + open + '</div>';
        if (st.id === 'wa') return '<a class="btn ghost sm" href="https://wa.me/?text=' + encodeURIComponent(m.wa) + '" target="_blank" rel="noopener">🟢 Share on WhatsApp</a> ' + cp('wa', m.wa);
        if (st.id === 'reply') return open;
        if (st.id === 'story2') return '<ul style="margin:4px 0 0 18px;padding:0">' + m.story2.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
        if (st.id === 'stats') {
          var v = b.stats || {}, c = compare(b);
          return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:6px;margin-top:4px">' + [['views', '👁️ Views'], ['likes', '❤️ Likes'], ['comments', '💬 Comments'], ['shares', '📤 Shares'], ['saves', '🔖 Saves']].map(function (f) {
            return '<div><label for="bs_' + f[0] + '" style="font-size:12.5px">' + f[1] + '</label><input id="bs_' + f[0] + '" inputmode="numeric" value="' + (v[f[0]] == null ? '' : v[f[0]]) + '"></div>'; }).join('') + '</div>' +
            '<div class="row" style="margin-top:8px;gap:8px;align-items:center"><button class="btn primary sm" id="bsStat">Save numbers</button>' + open + '</div>' + (c ? '<p style="margin:8px 0 0;font-weight:700">' + c.text + '</p>' : '');
        }
        if (st.id === 'next') return '<p style="margin:2px 0 0">' + nextTip(b, info) + '</p>';
        return '';
      };
      $('#bsBody', s).innerHTML = '<h2>🚀 After posting</h2><p class="muted" style="margin:4px 0 10px">' + esc(info.title) + ' · posted ' + esc(ago(Math.max(1, Math.floor((Date.now() - Date.parse(b.postedAt)) / 60000)))) + ' ago · ' + done + ' of ' + total + ' done</p>' +
        '<div class="card" style="padding:10px 12px;margin-bottom:10px"><label for="bsUrl">Instagram post link</label><div class="row" style="gap:6px"><input id="bsUrl" placeholder="https://www.instagram.com/p/…" value="' + esc(b.url || '') + '" style="flex:1"><button class="btn ghost sm" id="bsUrlS">Save</button></div>' +
        (b.url ? '' : '<p class="muted" style="font-size:12.5px;margin:6px 0 0">Add the link and every message below includes it.</p>') + '</div>' +
        STEPS.filter(function (st) { return !st.disc || info.kind === 'disc'; }).map(function (st) {
          var on = !!(b.steps && b.steps[st.id]);
          return '<div class="card" style="padding:10px 12px;margin-bottom:8px' + (on && st.id !== 'stats' && st.id !== 'next' ? ';opacity:.65' : '') + '"><div class="row" style="gap:10px;align-items:flex-start"><input type="checkbox" data-st="' + st.id + '"' + (on ? ' checked' : '') + ' aria-label="Done: ' + esc(st.t.replace(/^\S+\s/, '')) + '" style="width:22px;height:22px;flex:none;margin-top:2px">' +
            '<div style="flex:1;min-width:0"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><b>' + esc(st.t) + '</b><span style="font-size:13px">' + when(st, b) + '</span></div>' + (st.d ? '<div class="muted" style="font-size:13px;margin:2px 0 4px">' + st.d + '</div>' : '') + body(st) + '</div></div></div>';
        }).join('') +
        '<p class="muted" style="font-size:12.5px;margin:8px 0 0">No “comment YES” or “like to win” — Instagram stops showing posts like that on Explore and Reels.</p>' +
        '<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn primary" id="bsX">Close</button></div>';
      $('#bsX', s).onclick = function () { s.remove(); };
      $('#bsUrlS', s).onclick = async function () { try { b = await save({ key: b.key, url: $('#bsUrl', s).value.trim() }); info.url = b.url; if (info.onUrl) info.onUrl(b.url); X.toast(b.url ? 'Link saved — it’s in every message now' : 'Link removed'); draw(); } catch (e) { X.toast(e.message); } };
      $$('[data-st]', s).forEach(function (cb) { cb.onchange = async function () { var st = {}; st[cb.dataset.st] = cb.checked; try { b = await save({ key: b.key, steps: st }); draw(); } catch (e) { X.toast(e.message); cb.checked = !cb.checked; } }; });
      $$('[data-cp]', s).forEach(function (btn) { btn.onclick = function () { var t = copies[btn.dataset.cp]; try { navigator.clipboard.writeText(t); X.toast(b.url ? 'Copied' : 'Copied — add the post link above to include it'); } catch (e) { X.toast('Press and hold to copy'); } }; });
      var bdm = $('#bsDm', s);
      if (bdm) bdm.onclick = async function () {
        var u = ($('#bsUrl', s).value || b.url || '').trim();
        if (!u) { X.toast('Add the Instagram post link first'); $('#bsUrl', s).focus(); return; }
        bdm.disabled = true;
        try {
          if (u !== b.url) b = await save({ key: b.key, url: u });
          var r = await X.api('dm-share', { url: u, title: info.title, perPage: 10 });
          X.S.dmToday = r; X.S.dmAll = null; X.S.dmTab = 'today';
          var n = (r.pages || []).reduce(function (a, o) { return a + o.todo.length; }, 0);
          b = await save({ key: b.key, steps: { pages: true } });
          s.remove(); X.toast(n ? n + ' messages ready in DM Outreach — 10 per page' : 'Sharing set up — add people in DM Outreach first'); X.go('dm');
        } catch (e) { X.toast(e.message); bdm.disabled = false; }
      };
      var bst = $('#bsStat', s);
      if (bst) bst.onclick = async function () {
        var st = {}; ['views', 'likes', 'comments', 'shares', 'saves'].forEach(function (f) { st[f] = $('#bs_' + f, s).value; });
        try { b = await save({ key: b.key, stats: st, steps: { stats: true } }); X.toast('Numbers saved'); draw(); } catch (e) { X.toast(e.message); }
      };
    }
    draw();
  }

  // ── 🏆 your best posts ──
  function bestHtml() {
    var L = (X.S.boost || []).filter(function (b) { return b.stats && (b.stats.views != null || b.stats.shares != null); })
      .sort(function (a, b) { return ((b.stats.shares || 0) - (a.stats.shares || 0)) || ((b.stats.views || 0) - (a.stats.views || 0)); }).slice(0, 10);
    var n = function (v) { return v == null ? '—' : Number(v).toLocaleString('en-GB'); };
    return '<div class="card" style="padding:12px 14px;margin-bottom:12px"><b>🏆 Your best posts</b> <span class="muted" style="font-size:13px">— by shares, then views (from the 24-hour numbers)</span>' +
      (L.length ? L.map(function (b, i) {
        return '<div class="row" style="gap:10px;padding:8px 0;border-bottom:1px solid var(--line,#eee);align-items:center;flex-wrap:wrap"><b style="width:22px">' + (i + 1) + '</b><div style="flex:1;min-width:180px">' + (b.url ? '<a href="' + esc(b.url) + '" target="_blank" rel="noopener" style="font-weight:700;color:inherit">' + esc(b.title || 'Post') + '</a>' : '<b>' + esc(b.title || 'Post') + '</b>') +
          '<div class="muted" style="font-size:12.5px">' + esc(new Date(b.postedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) + '</div></div><span style="font-size:13.5px">📤 ' + n(b.stats.shares) + ' · 👁️ ' + n(b.stats.views) + ' · ❤️ ' + n(b.stats.likes) + ' · 🔖 ' + n(b.stats.saves) + '</span><button class="btn ghost sm" data-boost="' + esc(b.key) + '">🚀</button></div>';
      }).join('') : '<p class="muted" style="margin:6px 0 0;font-size:13.5px">After posting, add each post’s 24-hour numbers in 🚀 After posting — your best posts will show here.</p>') + '</div>';
  }
  function bind(root, infoFor) {
    $$('[data-boost]', root).forEach(function (btn) { btn.onclick = function (e) { e.preventDefault(); e.stopPropagation(); var b = find(btn.dataset.boost); var info = (infoFor && infoFor(btn.dataset.boost)) || { key: btn.dataset.boost, kind: btn.dataset.boost.split(':')[0], title: b ? b.title : 'Post' }; open(info); }; });
  }

  window.HQBoost = { init: function (x) { X = x; }, open: open, load: load, bestHtml: bestHtml, bind: bind, find: find };
})();
