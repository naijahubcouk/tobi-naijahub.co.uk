/*
 * Auntie Tobi HQ — 💬 Community questions (admin only): what Nigerians in the UK are asking online.
 *  · Search everywhere or one place (Reddit, Nairaland, Quora, Facebook, X, TikTok, YouTube, Instagram, forums), by topic and time
 *  · Similar questions grouped · 💡 Save as content idea (HQ board) · ✍️ Draft an answer (to copy — never posted) · ⭐ Save
 *  · 🗓️ Top questions this week — built every Monday
 * HQ calls HQQs.init({ api, sheet, toast, esc, S }) once, then HQQs.view().
 */
(function () {
  'use strict';
  var X = null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return X.esc(s); }
  var TOPICS = [['', 'Any topic'], ['life', '🇬🇧 Life in the UK'], ['business', '💼 Business'], ['visa', '🛂 Visas & immigration'], ['housing', '🏠 Housing'], ['jobs', '👩🏾‍💼 Jobs & careers'], ['money', '💷 Money'], ['kids', '🎒 Kids & school'], ['health', '🩺 NHS & health'], ['food', '🍲 Food & culture']];
  var SRC = [['all', '🌍 Everywhere'], ['reddit', 'Reddit'], ['nairaland', 'Nairaland'], ['quora', 'Quora'], ['tweets', '🐦 Tweets'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['instagram', 'Instagram'], ['forums', 'Mumsnet & forums']];
  var TL = {}; TOPICS.forEach(function (t) { TL[t[0]] = t[1]; });
  var ICON = function (site) { return /reddit/.test(site) ? '🟠' : /nairaland/.test(site) ? '🟢' : /quora/.test(site) ? '🔴' : /facebook/.test(site) ? '🔵' : /(^x\.com|twitter)/.test(site) ? '🐦' : /tiktok/.test(site) ? '🎵' : /youtube/.test(site) ? '▶️' : /instagram/.test(site) ? '📸' : '💬'; };

  function pagesBox(pages) {
    return '<div style="background:#EEF7F1;border-radius:10px;padding:10px 12px;margin:0 0 10px"><b style="font-size:13.5px">📚 Where the answer is</b>' + (pages.length ? pages.map(function (x) { return '<div style="font-size:13.5px;margin-top:6px"><a href="' + esc(x.url) + '" target="_blank" rel="noopener"><b>' + esc(x.title) + '</b></a> <span class="muted" style="font-size:12px">' + esc(x.url.replace(/^https:\/\/(www\.)?/, '').split('/')[0]) + '</span><div style="color:#374151">' + esc(x.summary) + '</div></div>'; }).join('') : '<div class="muted" style="font-size:13px;margin-top:4px">No official page found for this one — check GOV.UK, NHS or Citizens Advice yourself.</div>') + '</div>';
  }
  function groupCard(g, i, list) {
    var on = (X.S.qsSaved || []).some(function (x) { return x.question.toLowerCase() === g.question.toLowerCase(); });
    return '<div class="card" style="padding:14px 16px;margin-bottom:10px"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:10px"><div style="flex:1;min-width:0"><b style="font-size:16px">' + esc(g.question) + '</b>' +
      '<div class="muted" style="font-size:12.5px;margin-top:2px">' + esc(TL[g.topic] || '') + (g.count > 1 ? ' · <b style="color:#B45309">asked in ' + g.count + ' places</b>' : '') + '</div></div>' +
      '<button class="btn ghost sm" data-qsv="' + list + ':' + i + '" title="' + (on ? 'Saved' : 'Save') + '">' + (on ? '⭐ Saved' : '☆ Save') + '</button></div>' +
      '<div style="margin:8px 0 10px">' + g.items.map(function (x) { return '<div style="font-size:13.5px;padding:5px 0;border-top:1px solid #F0ECE2">' + ICON(x.site) + ' <span style="color:#374151">“' + esc(x.quote) + '”</span> <span class="muted" style="font-size:12px">— ' + esc(x.site) + (x.date ? ' · ' + esc(x.date) : '') + '</span> <a href="' + esc(x.url) + '" target="_blank" rel="noopener" style="font-size:12.5px">Open ↗</a></div>'; }).join('') + '</div>' +
      (g.pages ? pagesBox(g.pages) : '') +
      '<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn primary sm" data-qsi="' + list + ':' + i + '">💡 Save as content idea</button>' + (g.pages ? '' : '<button class="btn ghost sm" data-qsa="' + list + ':' + i + '">📚 Find the answer</button>') + '<button class="btn ghost sm" data-qsd="' + list + ':' + i + '">✍️ Draft an answer</button></div><div data-qsout="' + list + ':' + i + '"></div></div>';
  }

  async function view() {
    $('#ttl').textContent = 'Community questions'; $('#topRight').innerHTML = '';
    var tab = X.S.qsTab || 'search';
    if (!X.S.qsBoot) { $('#view').innerHTML = '<div class="wrap"><p class="muted">Loading…</p></div>'; try { var b = await X.api('qs-weekly'); X.S.qsSaved = b.saved; X.S.qsWeek = b.weekly; X.S.qsBoot = 1; } catch (e) { $('#view').innerHTML = '<div class="wrap"><div class="err">' + esc(e.message) + '</div></div>'; return; } }
    var R = X.S.qsRes, W = X.S.qsWeek, F = X.S.qsF || { q: '', topic: '', src: 'all', when: 'month' };
    var lists = { und: R && R.undated ? R.undated : [], res: R ? R.groups : [], week: W ? W.groups : [], saved: X.S.qsSaved || [] };
    X.S.qsLists = lists;
    var body = '';
    if (tab === 'search') body =
      '<div class="card" style="padding:14px 16px;margin-bottom:12px"><div class="row" style="gap:8px;flex-wrap:wrap"><input id="qsQ" placeholder="🔎 What are people asking about? e.g. driving licence, renting, starting a catering business" value="' + esc(F.q) + '" style="flex:1;min-width:240px"><button class="btn primary" id="qsGo">Search</button><button class="btn ghost" id="qsPl" title="The busiest places where Nigerians in the UK ask about this">📍 Best places to answer</button></div>' +
      (F.place ? '<div class="note" style="margin-top:10px;font-size:13.5px">📍 Searching only <b>' + esc(F.place.name) + '</b> <button class="btn ghost sm" id="qsPlace0">Search everywhere again</button></div>' : '') +
      '<div style="margin-top:10px"><div class="muted" style="font-size:12.5px;margin-bottom:4px">Topic</div><div class="chipbar">' + TOPICS.map(function (t) { return '<button class="chip" data-qt="' + t[0] + '" aria-pressed="' + (F.topic === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div style="margin-top:8px"><div class="muted" style="font-size:12.5px;margin-bottom:4px">Where</div><div class="chipbar">' + SRC.map(function (t) { return '<button class="chip" data-qw="' + t[0] + '" aria-pressed="' + (F.src === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="row" style="gap:8px;margin-top:8px;align-items:center"><span class="muted" style="font-size:12.5px">When</span><select id="qsWhen" style="width:auto"><option value="week"' + (F.when === 'week' ? ' selected' : '') + '>Past week</option><option value="month"' + (F.when === 'month' ? ' selected' : '') + '>Past month</option><option value="year"' + (F.when === 'year' ? ' selected' : '') + '>Past year</option></select></div>' +
      '<p class="muted" style="font-size:12px;margin:8px 0 0">Finds <b>public</b> posts only — private Facebook/WhatsApp groups can’t be searched. Each search costs a few pence.</p></div>' +
      (X.S.qsPlaces ? '<div class="card" style="padding:14px 16px;margin-bottom:12px"><div class="row" style="justify-content:space-between;align-items:center"><b>📍 Best places to answer: ' + esc(X.S.qsPlaces.about) + '</b><button class="btn ghost sm" id="qsPlX">✕</button></div><div class="muted" style="font-size:12.5px;margin:2px 0 6px">Where Nigerians in the UK ask about this — reply there as Auntie Tobi to be seen. Updated ' + esc(new Date(X.S.qsPlaces.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) + '.</div>' +
        (X.S.qsPlaces.places.length ? X.S.qsPlaces.places.map(function (x) { return '<div style="font-size:14px;padding:6px 0;border-top:1px solid #F0ECE2"><a href="' + esc(x.url) + '" target="_blank" rel="noopener"><b>' + esc(x.name) + '</b></a> <span class="ak" style="background:#EEF0F3;color:#374151">' + esc(x.kind) + '</span><div class="muted" style="font-size:13px">' + esc(x.why) + '</div></div>'; }).join('') : '<div class="muted">No places found — try another topic.</div>') + '</div>' : '') +
      '<div id="qsRes">' + (R ? '<div class="muted" style="font-size:13px;margin-bottom:6px">' + R.groups.length + ' question' + (R.groups.length === 1 ? '' : 's') + ' from posts since <b>' + esc(R.since || '') + '</b>' + (R.old ? ' · ' + R.old + ' older post' + (R.old === 1 ? '' : 's') + ' left out' : '') + (R.tweetsFailed ? ' · <span style="color:#B45309">tweets couldn’t be searched this time</span>' : '') + '</div>' +
        (R.groups.length ? R.groups.map(function (g, i) { return groupCard(g, i, 'res'); }).join('') : '<div class="card muted" style="padding:16px">No dated questions from this time found — try other words, another place, or a longer time.</div>') +
        ((R.undated || []).length ? (X.S.qsUnd ? '<div class="muted" style="font-size:13px;margin:12px 0 6px">❔ <b>Date not shown</b> on these posts — they may be older. <button class="btn ghost sm" id="qsUnd">Hide them</button></div>' + R.undated.map(function (g, i) { return groupCard(g, i, 'und'); }).join('') : '<div style="margin-top:10px"><button class="btn ghost sm" id="qsUnd">❔ Also show ' + R.undated.length + ' question' + (R.undated.length === 1 ? '' : 's') + ' where the post has no date</button></div>') : '')
        : '') + '</div>';
    if (tab === 'week') body = '<div class="card" style="padding:12px 16px;margin-bottom:12px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div><b>🗓️ Top questions this week</b><div class="muted" style="font-size:12.5px">Built every Monday morning — one search per topic.' + (W && W.at ? ' Last updated ' + esc(new Date(W.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + (W.done && W.done.length < 9 ? ' · ' + W.done.length + ' of 9 topics so far' : '') : '') + '</div></div><button class="btn ghost sm" id="qsRun">↻ Run the next topic now</button></div></div>' +
      (lists.week.length ? lists.week.map(function (g, i) { return groupCard(g, i, 'week'); }).join('') : '<div class="card muted" style="padding:16px">Nothing yet — the first round-up runs on Monday morning. Or tap “Run the next topic now”.</div>');
    if (tab === 'where') {
      var Wh = X.S.qsWhere;
      if (!Wh) { body = '<div class="card muted" style="padding:16px">Loading…</div>'; X.api('qs-where', {}).then(function (r) { X.S.qsWhere = r; view(); }, function (e) { X.toast(e.message); }); }
      else {
        var BUSY = { high: ['🔥 Very busy', '#B42318'], medium: ['👍 Active', '#057A44'], low: ['💤 Quiet', '#6B7280'] }, ago = function (d) { if (!d) return ''; var n = Math.round((Date.now() - Date.parse(d)) / 864e5); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 30 ? n + ' days ago' : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
        var byKind = {}; Wh.places.forEach(function (x, i) { x._i = i; (byKind[x.kind] = byKind[x.kind] || []).push(x); });
        body = '<div class="card" style="padding:12px 16px;margin-bottom:12px"><div class="row" style="justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div><b>📍 Where Nigerians in the UK ask questions</b><div class="muted" style="font-size:12.5px">Grows by itself from every search, plus a look for new places once a month' + (Wh.discAt ? ' (last ' + esc(new Date(Wh.discAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) + ')' : '') + '. Public places only.</div></div><button class="btn ghost sm" id="qsFind">↻ Find more places now</button></div></div>' +
          (Wh.places.length ? Object.keys(Wh.kinds).filter(function (k) { return byKind[k]; }).map(function (k) {
            return '<div class="card" style="padding:12px 16px;margin-bottom:12px"><b style="font-size:16px">' + esc(Wh.kinds[k]) + '</b> <span class="muted" style="font-size:12.5px">· ' + byKind[k].length + ' place' + (byKind[k].length === 1 ? '' : 's') + '</span>' + byKind[k].slice(0, 12).map(function (x) {
              var b = BUSY[x.busy];
              return '<div style="padding:8px 0;border-top:1px solid #F0ECE2;margin-top:6px"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px"><div style="min-width:0"><a href="' + esc(x.url) + '" target="_blank" rel="noopener"><b>' + esc(x.name) + '</b></a> <span class="ak" style="background:' + b[1] + '">' + b[0] + '</span>' +
                '<div class="muted" style="font-size:12.5px">' + (x.topics.length ? x.topics.map(function (t) { return esc(TL[t] || t); }).join(' · ') : '') + (x.last ? (x.topics.length ? ' · ' : '') + 'last question seen ' + esc(ago(x.last)) : '') + (x.n ? ' · ' + x.n + ' question' + (x.n === 1 ? '' : 's') + ' found' : '') + '</div>' + (x.why ? '<div style="font-size:13px;color:#374151">' + esc(x.why) + '</div>' : '') + '</div>' +
                '<button class="btn ghost sm" data-qwp="' + x._i + '" style="flex:none">🔎 Search this place</button></div>' +
                (x.recent && x.recent.length ? '<div style="margin-top:4px">' + x.recent.map(function (r) { return '<div style="font-size:13px;padding:2px 0">' + ICON(x.kind === 'x' ? 'x.com' : '') + ' <span style="color:#374151">“' + esc(r.quote) + '”</span> <span class="muted" style="font-size:12px">' + esc(r.date || '') + '</span> <a href="' + esc(r.url) + '" target="_blank" rel="noopener" style="font-size:12.5px">Open ↗</a></div>'; }).join('') + '</div>' : '') + '</div>';
            }).join('') + '</div>';
          }).join('') : '<div class="card muted" style="padding:16px">No places yet — tap “Find more places now”, or run a few searches.</div>');
      }
    }
    if (tab === 'saved') body = lists.saved.length ? lists.saved.map(function (g, i) { return groupCard(g, i, 'saved'); }).join('') : '<div class="card muted" style="padding:16px">Tap ☆ Save on a question to keep it here.</div>';
    $('#view').innerHTML = '<div class="wrap"><p class="muted" style="margin:0 0 10px">What Nigerians in the UK are asking online — ideas for posts, articles and app features. Nothing is ever posted for you.</p>' +
      '<div class="chipbar" style="margin-bottom:12px">' + [['search', '🔎 Search'], ['where', '📍 Where they ask'], ['week', '🗓️ This week' + (lists.week.length ? ' (' + lists.week.length + ')' : '')], ['saved', '⭐ Saved' + (lists.saved.length ? ' (' + lists.saved.length + ')' : '')]].map(function (t) { return '<button class="chip" data-qtab="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' + body + '</div>';
    $$('[data-qtab]').forEach(function (b) { b.onclick = function () { X.S.qsTab = b.dataset.qtab; view(); }; });
    var keepF = function () { if ($('#qsQ')) { F.q = $('#qsQ').value; F.when = $('#qsWhen').value; } X.S.qsF = F; };
    $$('[data-qt]').forEach(function (b) { b.onclick = function () { keepF(); F.topic = b.dataset.qt; view(); }; });
    $$('[data-qw]').forEach(function (b) { b.onclick = function () { keepF(); F.src = b.dataset.qw; F.place = null; view(); }; });
    if ($('#qsGo')) {
      var go = async function () {
        keepF(); var btn = $('#qsGo'); if (!F.q.trim() && !F.topic && !F.place) { X.toast('Type what to look for, or pick a topic'); return; }
        btn.disabled = true; btn.textContent = 'Searching…'; $('#qsRes').innerHTML = '<div class="card muted" style="padding:16px">🔎 Looking across ' + esc((SRC.filter(function (s) { return s[0] === F.src; })[0] || [])[1] || 'the web') + '… (about 20 seconds)</div>';
        try { X.S.qsRes = await X.api('qs-search', F); } catch (e) { X.toast(e.message); X.S.qsRes = null; }
        view();
      };
      $('#qsGo').onclick = go; $('#qsQ').onkeydown = function (e) { if (e.key === 'Enter') go(); };
    }
    if ($('#qsPl')) $('#qsPl').onclick = async function () { keepF(); if (!F.q.trim() && !F.topic) { X.toast('Type a subject or pick a topic first'); return; } var b = this; b.disabled = true; b.textContent = 'Looking… (about 20 seconds)'; try { X.S.qsPlaces = await X.api('qs-places', { q: F.q, topic: F.topic }); } catch (e) { X.toast(e.message); } view(); };
    if ($('#qsPlX')) $('#qsPlX').onclick = function () { X.S.qsPlaces = null; view(); };
    $$('[data-qsa]').forEach(function (b) { b.onclick = async function () { var g = pick(b.dataset.qsa); b.disabled = true; b.textContent = 'Searching GOV.UK, NHS…'; try { g.pages = (await X.api('qs-answers', { question: g.question })).pages; view(); } catch (e) { X.toast(e.message); b.disabled = false; b.textContent = '📚 Find the answer'; } }; });
    if ($('#qsFind')) $('#qsFind').onclick = async function () { this.disabled = true; this.textContent = 'Looking for places… (about 20 seconds)'; try { X.S.qsWhere = await X.api('qs-where', { fresh: true }); } catch (e) { X.toast(e.message); } view(); };
    $$('[data-qwp]').forEach(function (b) { b.onclick = async function () {
      var x = X.S.qsWhere.places[+b.dataset.qwp]; F.place = { name: x.name, kind: x.kind, url: x.url }; X.S.qsF = F; X.S.qsTab = 'search'; X.S.qsRes = null; view();
      $('#qsRes').innerHTML = '<div class="card muted" style="padding:16px">🔎 Looking for recent questions on ' + esc(x.name) + '… (about 20 seconds)</div>';
      try { X.S.qsRes = await X.api('qs-search', F); } catch (e) { X.toast(e.message); }
      view();
    }; });
    if ($('#qsPlace0')) $('#qsPlace0').onclick = function () { F.place = null; X.S.qsF = F; view(); };
    if ($('#qsUnd')) $('#qsUnd').onclick = function () { X.S.qsUnd = !X.S.qsUnd; view(); };
    if ($('#qsRun')) $('#qsRun').onclick = async function () { this.disabled = true; this.textContent = 'Searching… (about 20 seconds)'; try { var r = await X.api('qs-weekly-run', {}); X.S.qsWeek = r.weekly; X.S.qsSaved = r.saved; } catch (e) { X.toast(e.message); } view(); };
    var pick = function (k) { var a = k.split(':'); return lists[a[0]][+a[1]]; };
    $$('[data-qsv]').forEach(function (b) { b.onclick = async function () { var g = pick(b.dataset.qsv), on = !(X.S.qsSaved || []).some(function (x) { return x.question.toLowerCase() === g.question.toLowerCase(); }); try { X.S.qsSaved = (await X.api('qs-save', { group: g, on: on })).items; X.toast(on ? '⭐ Saved' : 'Removed from saved'); view(); } catch (e) { X.toast(e.message); } }; });
    $$('[data-qsi]').forEach(function (b) { b.onclick = async function () { b.disabled = true; b.textContent = 'Making the idea…'; try { var r = await X.api('qs-idea', { group: pick(b.dataset.qsi) }); b.textContent = '✅ Added to your ideas'; X.toast('💡 “' + r.card.title + '” is in your ideas to review'); } catch (e) { X.toast(e.message); b.disabled = false; b.textContent = '💡 Save as content idea'; } }; });
    $$('[data-qsd]').forEach(function (b) { b.onclick = async function () {
      var g = pick(b.dataset.qsd), box = $('[data-qsout="' + b.dataset.qsd + '"]'); b.disabled = true; b.textContent = 'Writing…';
      try { var r = await X.api('qs-draft', { question: g.question, quote: g.items[0] ? g.items[0].quote : '', pages: g.pages || [] });
        box.innerHTML = '<div style="margin-top:10px"><textarea rows="6" style="font-size:14px">' + esc(r.text) + '</textarea><div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn primary sm" data-cp>📋 Copy answer</button>' + (g.items[0] ? '<a class="btn ghost sm" href="' + esc(g.items[0].url) + '" target="_blank" rel="noopener">Open the post to reply ↗</a>' : '') + '</div><div class="muted" style="font-size:12px;margin-top:4px">Check it, then paste it yourself — nothing is posted for you.</div></div>';
        $('[data-cp]', box).onclick = function () { try { navigator.clipboard.writeText($('textarea', box).value); X.toast('Copied'); } catch (e) {} };
      } catch (e) { X.toast(e.message); }
      b.disabled = false; b.textContent = '✍️ Draft again';
    }; });
  }
  window.HQQs = { init: function (o) { X = o; }, view: function () { view(); } };
})();
