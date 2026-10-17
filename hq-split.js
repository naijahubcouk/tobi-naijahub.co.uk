/*
 * Auntie Tobi HQ — free paste splitter (no AI).
 * Turns a ChatGPT reply into separate content cards by spotting where each idea starts.
 * Works in the browser (window.HQSplit) and in Node (module.exports) so it can be tested.
 *
 * split(text, { mode: 'auto' | 'one' }) → [ { title, type, topic, caption, hashtags: [], keywords } ]
 */
(function (root) {
  'use strict';
  var TYPES = ['post', 'reel', 'carousel', 'story', 'blog'];
  var TOPICS = ['discovery', 'uk-info', 'community', 'promo', 'event', 'motivation'];

  function clean(line) { return String(line || '').replace(/\*\*|__/g, '').replace(/^\s*#{1,6}\s+/, '').trim(); }
  var LABEL = /^(?:idea|post|reel|carousel|story|stories|blog(?:\s*post)?|caption|option|day|content|video|tiktok|instagram\s*post)\s*#?\s*\d{0,2}\s*(?:[:\-–—.)]|$)/i;
  var LABEL_NUM = /^(?:idea|post|reel|carousel|story|stories|blog(?:\s*post)?|caption|option|day|content|video)\s*#?\s*\d{1,2}\b/i;
  var NUM = /^(\d{1,2})[.)]\s+\S/;
  var HEAD = /^\s*#{1,4}\s+\S/;
  var BOLD = /^\s*\*\*[^*]{2,120}\*\*\s*:?\s*$/;
  var SEP = /^\s*(?:-{3,}|\*{3,}|_{3,}|—{2,}|═{3,})\s*$/;
  var OUTRO = /^(?:would you like|want me to|do you want|let me know|if you(?:'|’)d like|i can also|shall i|need (?:me|more)|happy to)/i;
  var INTRO = /^(?:here (?:are|is)|sure[!,.]|absolutely|great|of course|below (?:are|is)|okay|ok[,!])/i;

  function detectType(s) {
    s = String(s || '').toLowerCase();
    if (/\b(reel|reels|tiktok|video|voiceover|b-roll|scene\s*\d|hook\s*\(0)/.test(s)) return 'reel';
    if (/\b(carousel|slide\s*\d|slides)\b/.test(s)) return 'carousel';
    if (/\b(story|stories|story frame|poll sticker|frame\s*\d)\b/.test(s)) return 'story';
    if (/\b(blog|article|meta description|meta title|seo)\b/.test(s)) return 'blog';
    return 'post';
  }
  function detectTopic(s) {
    s = String(s || '').toLowerCase();
    if (/\b(business discovery|discover|spotlight|featured business|support (?:nigerian|black)[- ]owned|nigerian[- ]owned|small business)\b/.test(s)) return 'discovery';
    if (/\b(event|party|festival|meetup|meet-up|concert|tickets?|webinar|workshop)\b/.test(s)) return 'event';
    if (/\b(promo|promotion|discount|offer|sale|sponsor|advert|% off|giveaway)\b/.test(s)) return 'promo';
    if (/\b(visa|immigration|home office|nhs|hmrc|tax|council|universal credit|gov\.uk|jobs?|sponsorship|rent|tenancy|cost of living|ilr|brp|evisa|school|university)\b/.test(s)) return 'uk-info';
    if (/\b(motivation|monday|quote|inspiration|mindset|you(?:'|’)ve got this|keep going)\b/.test(s)) return 'motivation';
    return 'community';
  }

  // Which kind of line starts a new idea in this paste?
  function pickBoundary(lines) {
    var counts = { label: 0, head: 0, bold: 0, sep: 0, num: 0 };
    lines.forEach(function (l) {
      var c = clean(l);
      if (LABEL_NUM.test(c) && !/^\s+/.test(l)) counts.label++;
      if (HEAD.test(l)) counts.head++;
      if (BOLD.test(l)) counts.bold++;
      if (SEP.test(l)) counts.sep++;
      if (NUM.test(l) && !/^\s/.test(l)) counts.num++;
    });
    if (counts.label >= 2) return 'label';
    if (counts.head >= 2) return 'head';
    if (counts.sep >= 1) return 'sep';
    if (counts.bold >= 2) return 'bold';
    if (counts.num >= 2) return 'num';
    return 'none';
  }
  function isStart(kind, l) {
    var c = clean(l);
    if (kind === 'label') return LABEL_NUM.test(c) && !/^\s+/.test(l);
    if (kind === 'head') return HEAD.test(l);
    if (kind === 'bold') return BOLD.test(l);
    if (kind === 'num') return NUM.test(l) && !/^\s/.test(l);
    return false;
  }

  function titleFrom(line) {
    var t = clean(line).replace(/^\d{1,2}[.)]\s*/, '');
    t = t.replace(LABEL, '').replace(/^[:\-–—.\s]+/, '').replace(/[:\s]+$/, '').trim();
    return t;
  }

  function card(chunkLines, titleLine) {
    var hashtags = [], keywords = '', body = [];
    chunkLines.forEach(function (l) {
      var c = clean(l);
      var kw = /^(?:seo\s+)?(?:keyword\s*line|keywords?)\s*[:\-–—]\s*(.*)$/i.exec(c);
      if (kw) { keywords = kw[1].trim(); return; }
      var tags = c.match(/#[0-9A-Za-z_À-ɏ]+/g) || [];
      var onlyTags = tags.length && c.replace(/#[0-9A-Za-z_À-ɏ]+/g, '').replace(/^(?:hashtags?\s*[:\-–—]?)/i, '').replace(/[\s,·•|]+/g, '') === '';
      tags.forEach(function (t) { if (hashtags.indexOf(t) < 0) hashtags.push(t); });
      if (onlyTags) return;
      body.push(l.replace(/\s+$/, ''));
    });
    // Tidy the caption: drop a leading "Caption:" label and surrounding blank lines.
    while (body.length && !body[0].trim()) body.shift();
    while (body.length && (!body[body.length - 1].trim() || OUTRO.test(clean(body[body.length - 1])))) body.pop();
    if (body.length) body[0] = body[0].replace(/^\s*\**\s*caption\s*\**\s*[:\-–—]\s*\**\s*/i, '');
    var caption = body.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    var title = titleLine ? titleFrom(titleLine) : '';
    if (!title) {
      var first = (caption.split('\n').filter(function (x) { return x.trim(); })[0] || '').replace(/[*_#>]/g, '').trim();
      title = first.length > 70 ? first.slice(0, 68).replace(/\s+\S*$/, '') + '…' : first;
    }
    var hay = (titleLine || '') + '\n' + caption.slice(0, 400);
    return { title: title.slice(0, 120) || 'Untitled idea', type: detectType(hay), topic: detectTopic(hay + ' ' + hashtags.join(' ')), caption: caption.slice(0, 8000), hashtags: hashtags.slice(0, 40), keywords: keywords.slice(0, 300) };
  }

  function split(text, opts) {
    opts = opts || {};
    var lines = String(text || '').replace(/\r/g, '').split('\n');
    // Drop a chatty intro line and outro questions.
    while (lines.length && !lines[0].trim()) lines.shift();
    if (lines.length > 2 && INTRO.test(clean(lines[0])) && clean(lines[0]).length < 160) lines.shift();
    while (lines.length && (!lines[lines.length - 1].trim() || OUTRO.test(clean(lines[lines.length - 1])))) lines.pop();
    if (!lines.join('').trim()) return [];
    if (opts.mode !== 'one' && isBrief(lines)) { var bc = splitBrief(lines); if (bc.length >= 2) return bc; }
    var kind = opts.mode === 'one' ? 'none' : pickBoundary(lines);
    if (kind === 'num') {
      // A numbered list is only separate ideas if the items have their own text under them
      // (otherwise it's steps inside one idea, e.g. a Reel script).
      var starts = [], body = 0, preLines = 0, seen = false;
      lines.forEach(function (l, i) { if (isStart('num', l)) { starts.push(i); seen = true; } else if (!seen && l.trim()) preLines++; });
      starts.forEach(function (st, k) { var end = k + 1 < starts.length ? starts[k + 1] : lines.length; for (var j = st + 1; j < end; j++) if (lines[j].trim() && !/^#/.test(lines[j].trim())) { body++; break; } });
      if (body < Math.ceil(starts.length / 2) || preLines >= 2) kind = 'none';
    }
    if (kind === 'none') return [card(lines, '')];
    var chunks = [], cur = null, pre = [];
    lines.forEach(function (l) {
      if (kind === 'sep' && SEP.test(l)) { if (cur) chunks.push(cur); cur = { title: '', lines: [] }; return; }
      if (kind !== 'sep' && isStart(kind, l)) { if (cur) chunks.push(cur); var tl = titleFrom(l); cur = { title: l, lines: [] };
        // "Idea 1: Jollof wars poll" → keep text after the label as the title; nothing else on the line goes in the caption.
        if (!tl) cur.title = ''; return; }
      if (cur) cur.lines.push(l); else pre.push(l);
    });
    if (cur) chunks.push(cur);
    if (kind === 'sep') {
      // With separators, the text before the first one is an idea too (unless it's just an intro line).
      var preText = pre.join('\n').trim();
      if (preText && !(INTRO.test(clean(pre[0] || '')) && pre.filter(function (x) { return x.trim(); }).length < 2)) chunks.unshift({ title: '', lines: pre });
    }
    var out = chunks.map(function (c) { return card(c.lines, c.title); }).filter(function (c) { return c.caption || (c.title && c.title !== 'Untitled idea'); });
    return out.length ? out : [card(lines, '')];
  }

  // ───────────── content briefs (sections, numbered ideas, tables) ─────────────
  var KEEP_UP = ['UK', 'NHS', 'BST', 'GMT', 'CMA', 'HMRC', 'DFE', 'CTA', 'ILR', 'BRP', 'EU', 'DBS', 'GP', 'AI', 'FAQ', 'TV', 'DIY', 'ID', 'CV', 'PDF', 'SEO', 'Q&A', 'IG', 'NYSC', 'JAMB', 'WAEC', 'MP', 'MPS'];
  var SMALL = ['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'with', 'vs'];
  function niceCase(s) {
    s = String(s || '').trim();
    var letters = s.replace(/[^A-Za-z]/g, ''), upper = letters.replace(/[^A-Z]/g, '').length;
    if (letters.length < 4 || upper / letters.length < 0.7) return s;
    var first = true;
    return s.toLowerCase().replace(/[a-z][a-z'’&]*/g, function (w) {
      var up = w.toUpperCase(), out;
      if (KEEP_UP.indexOf(up) >= 0) out = up;
      else if (!first && SMALL.indexOf(w) >= 0) out = w;
      else out = w.charAt(0).toUpperCase() + w.slice(1);
      first = false; return out;
    }).replace(/([—–:-]\s+)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }
  var stripMd = function (t) { return String(t || '').replace(/\*\*|__/g, '').replace(/(^|\s)\*(?=\S)|(\S)\*(?=\s|$)/g, '$1$2').trim(); };
  var noUtm = function (u) { return u.replace(/[?&]utm_[a-z]+=[^&\s)#]*/gi, '').replace(/\?(?=#|$)/, ''); };
  var dropLead = function (t) { return String(t || '').replace(/^[\s\d.)]*/, '').replace(/^[^\w“"'‘£#@]+/u, '').trim(); };
  var isTable = function (l) { return /^\s*\|.*\|\s*$/.test(l); };
  var isTableSep = function (l) { return /^\s*\|[\s:|-]+\|\s*$/.test(l); };
  var cells = function (l) { return l.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); };
  var headLevel = function (l) { var m = /^(#{1,6})\s+\S/.exec(l); return m ? m[1].length : 0; };
  var boldOnly = function (l) { return /^\s*\*\*[^*]+\*\*\s*$/.test(l); };
  var quoteish = function (t) { return /^["“‘']/.test(t.trim()); };

  function isBrief(lines) {
    var big = lines.filter(function (l) { var h = headLevel(l); return h >= 1 && h <= 2; }).length;
    var tables = lines.filter(isTable).length;
    return big >= 2 || (big >= 1 && tables >= 3);
  }

  // Pull links out: inline [text](url) citations are removed from the text and kept as sources.
  function takeLinks(text, sources) {
    return text.replace(/\[([^\]]{1,120})\]\((https?:\/\/[^\s)]+)\)/g, function (m, t, u) { u = noUtm(u); if (sources.indexOf(u) < 0) sources.push(u); return ''; }).replace(/\s+([.,;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ').trimEnd();
  }

  // One idea written as a block of lines (HOOK / Format / CTA / body…).
  function ideaCard(heading, lines, ctx) {
    var hook = '', cta = '', type = '', notes = [], sources = [], body = [], hashtags = [], keywords = '';
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i], t = stripMd(raw);
      if (!t || SEP.test(t)) { if (body.length && body[body.length - 1] !== '') body.push(''); continue; }
      if (/^#[\wÀ-ɏ]+(\s+#[\wÀ-ɏ]+)*$/.test(t)) { (t.match(/#[\wÀ-ɏ]+/g) || []).forEach(function (h) { if (hashtags.indexOf(h) < 0) hashtags.push(h); }); continue; }
      var lab = /^([A-Za-z][A-Za-z ]{1,30}?)\s*:\s*(.*)$/.exec(t), key = lab ? lab[1].toLowerCase().trim() : '', val = lab ? lab[2].trim() : '';
      if (key === 'hook') { if (!val) { while (i + 1 < lines.length && !stripMd(lines[i + 1])) i++; val = stripMd(lines[++i] || ''); } hook = val; continue; }
      if (key === 'format' || key === 'post type') { type = mapType(val); continue; }
      if (key === 'cta' || key === 'call to action') { cta = val; continue; }
      if (/sponsor|tag|credit/.test(key) && val) { notes.push(lab[1].trim() + ': ' + val); continue; }
      if (key === 'keywords' || key === 'keyword line') { keywords = val; continue; }
      if (/^\[[^\]]+\]\(https?:\/\/[^)]+\)$/.test(t)) { takeLinks(t, sources); continue; }
      body.push(takeLinks(t, sources));
    }
    while (body.length && body[body.length - 1] === '') body.pop();
    while (body.length && body[0] === '') body.shift();
    var caption = [hook ? 'HOOK: ' + hook : '', body.join('\n'), cta ? 'CTA: ' + cta : ''].filter(Boolean).join('\n\n');
    var title = niceCase(dropLead(stripMd(heading)));
    var hay = heading + ' ' + caption.slice(0, 500);
    return { title: title.slice(0, 120) || 'Untitled idea', type: type || ctx.type || detectType(hay), topic: ctx.topic || topicFromLabel(heading) || detectTopic(hay), caption: caption.slice(0, 8000), hashtags: hashtags, keywords: keywords, notes: notesText(notes, sources), section: ctx.section, selected: ctx.selected !== false };
  }
  function notesText(notes, sources) { return notes.concat(sources.length ? ['Sources:\n' + sources.join('\n')] : []).join('\n\n'); }
  function mapType(v) {
    v = String(v || '').toLowerCase();
    if (/reel|video|tiktok/.test(v)) return 'reel';
    if (/carousel|slides/.test(v)) return 'carousel';
    if (/story|stories|poll|quiz|slider|question/.test(v)) return 'story';
    if (/blog|article/.test(v)) return 'blog';
    if (/static|post|image|graphic|photo/.test(v)) return 'post';
    return '';
  }
  function topicFromLabel(h) {
    var t = stripMd(h).toUpperCase();
    if (/BUSINESS DISCOVERY|DISCOVERY SERIES|SPOTLIGHT/.test(t)) return 'discovery';
    if (/\bEVENT|BLACK HISTORY|FESTIVAL\b/.test(t)) return 'event';
    if (/MOTIVATION|FAITH|MORNING|AFTERNOON|EVENING/.test(t)) return 'motivation';
    if (/FAMILY|IMMIGRATION|SCHOLARSHIP|JOBS?|SCHOOL|HOUSING|HEALTH|NHS|GOVERNMENT|DEADLINE|UK INFO|OPPORTUNIT/.test(t)) return 'uk-info';
    if (/PROMO|SPONSOR|OFFER/.test(t)) return 'promo';
    if (/COMMUNITY|ENGAGEMENT/.test(t)) return 'community';
    if (/DISCOVERY/.test(t)) return 'discovery';
    return '';
  }

  function tableCards(rows, header, ctx) {
    var h = header.map(function (x) { return stripMd(x).toLowerCase(); });
    var col = function (re) { for (var i = 0; i < h.length; i++) if (re.test(h[i])) return i; return -1; };
    var cTitle = col(/^(idea|title|post|topic|content idea)$/), cHook = col(/hook|ready-to-post|content|caption|text/), cFmt = col(/format|^type$|story type/), cCta = col(/cta|call to action/), cTime = col(/^time$/), cNum = col(/^(story|#|no\.?)$/);
    var out = [];
    if (ctx.combine) {
      // A Story plan: one card listing every frame.
      var linesOut = rows.map(function (r, i) {
        var bits = [];
        bits.push(cTime >= 0 ? stripMd(r[cTime]) : (cNum >= 0 ? stripMd(r[cNum]) + '.' : (i + 1) + '.'));
        var ty = cFmt >= 0 ? stripMd(r[cFmt]) : ''; if (ty) bits.push(ty + ' —');
        bits.push(takeLinks(stripMd(cHook >= 0 ? r[cHook] : r[r.length - 1]), []));
        return bits.join(' ');
      });
      return [{ title: ctx.title, type: 'story', topic: 'community', caption: linesOut.join('\n'), hashtags: [], keywords: '', notes: '', section: ctx.section, selected: true, combined: true }];
    }
    rows.forEach(function (r) {
      var title = cTitle >= 0 ? r[cTitle] : (cHook >= 0 ? r[cHook] : r[0]);
      var hook = cHook >= 0 && cHook !== cTitle ? stripMd(r[cHook]) : '';
      var cta = cCta >= 0 ? stripMd(r[cCta]) : '';
      var t = niceCase(dropLead(stripMd(title)));
      var caption = [hook ? 'HOOK: ' + hook : '', cta ? 'CTA: ' + cta : ''].filter(Boolean).join('\n\n');
      out.push({ title: t.slice(0, 120) || 'Untitled idea', type: (cFmt >= 0 && mapType(r[cFmt])) || ctx.type || detectType(t + ' ' + hook), topic: topicFromLabel(title) || detectTopic(t + ' ' + hook), caption: caption, hashtags: [], keywords: '', notes: '', section: ctx.section, selected: true });
    });
    return out;
  }

  function splitBrief(lines) {
    // Global hashtags / keywords (usually at the end) apply to every card without its own.
    var gTags = [], gKw = '';
    lines = lines.map(function (l) {
      var t = stripMd(l);
      var m = /^suggested hashtags?\s*:?\s*(.*)$/i.exec(t); if (m) { gTags = (m[1].match(/#[\wÀ-ɏ]+/g) || []); return ''; }
      var k = /^(?:suggested\s+)?keywords?\s*:\s*(.+)$/i.exec(t); if (k && !/^keyword line/i.test(t)) { gKw = k[1].trim(); return ''; }
      return l;
    });
    // Sections = # / ## headings.
    var sections = [], cur = null;
    lines.forEach(function (l) {
      var lv = headLevel(l);
      if (lv === 1 || lv === 2) { cur = { title: stripMd(l.replace(/^#+\s*/, '')), lines: [] }; sections.push(cur); return; }
      if (!cur) { cur = { title: '', lines: [] }; sections.push(cur); }
      cur.lines.push(l);
    });
    var cards = [], details = [];
    sections.forEach(function (sec, si) {
      var name = niceCase(dropLead(sec.title));
      var T = sec.title.toUpperCase();
      var isIntro = si === 0 && (/BRIEF|EDITION|DIGEST|ROUND-?UP|NEWSLETTER/.test(T) || !sec.title);
      var isPlan = /POSTING PLAN|SCHEDULE|TIMETABLE/.test(T);
      var isStory = /STOR(Y|IES)/.test(T);
      var isNote = /PRIORITY|SUMMARY|TAKEAWAY|RECOMMENDATION|STRATEGY|FOCUS/.test(T) && !/IDEA/.test(T);
      var ctx = { section: name || 'Ideas', type: isStory ? 'story' : '', topic: /MOTIVATION/.test(T) ? 'motivation' : '' };
      // Split the section into blocks: ### items, tables and loose text.
      var blocks = [], b = { head: '', lines: [], sub: false };
      sec.lines.forEach(function (l) {
        if (headLevel(l) >= 3) { blocks.push(b); b = { head: l.replace(/^#+\s*/, ''), lines: [] }; return; }
        b.lines.push(l);
      });
      blocks.push(b);
      blocks.forEach(function (blk, bi) {
        var hasText = blk.lines.some(function (l) { return l.trim(); });
        var tbl = blk.lines.filter(isTable);
        var bodyLines = blk.lines.filter(function (l) { return !isTable(l); });
        var H = stripMd(blk.head).toUpperCase();
        // "### Verified details…" → facts to attach to the matching ideas.
        if (/VERIFIED|DETAILS|SOURCES|FACT/.test(H) && !/^\d/.test(stripMd(blk.head))) {
          var curD = null;
          blk.lines.forEach(function (l) {
            var t = stripMd(l); if (!t) return;
            var m = /^([A-Z][A-Za-z' ]{1,40}):\s*(.+)$/.exec(t);
            if (m && /^\s*\*\*/.test(l)) { curD = { label: m[1].trim(), text: m[2], sources: [] }; curD.text = takeLinks(curD.text, curD.sources); details.push(curD); return; }
            if (curD) { var x = takeLinks(t, curD.sources); if (x.trim()) curD.text += ' ' + x; }
          });
          return;
        }
        if (isPlan && (tbl.length || !blk.head)) return; // the posting plan table only repeats ideas (dates ignored)
        if (isIntro && !/^\d{1,2}[.)]\s/.test(stripMd(blk.head))) return;
        // A ### that only names the section's day/date (e.g. "### Friday, 16 October") → part of the section name.
        if (blk.head && !hasText && bi === 0) return;
        if (blk.head && tbl.length && !bodyLines.some(function (l) { return stripMd(l) && !/^[*_]/.test(l.trim()) && !boldOnly(l); }) && /^(MON|TUE|WED|THU|FRI|SAT|SUN)/.test(H)) { ctx.sub = stripMd(blk.head); }
        if (tbl.length >= 2) {
          var rows = tbl.filter(function (l) { return !isTableSep(l); }).map(cells);
          var header = rows.shift();
          var combine = isStory;
          var title = name + (blk.head && /^(MON|TUE|WED|THU|FRI|SAT|SUN)/.test(H) ? ' — ' + stripMd(blk.head) : (ctx.sub && bi > 0 ? ' — ' + ctx.sub : ''));
          var tc = tableCards(rows, header, { section: ctx.section, type: ctx.type, combine: combine, title: title });
          // Loose lines after a Story table (e.g. "Quiz answer: …") belong to that card.
          var extra = bodyLines.map(stripMd).filter(Boolean).filter(function (t) { return !/^#/.test(t) && !SEP.test(t); });
          if (combine && extra.length) tc[0].caption += '\n\n' + extra.map(function (t) { return takeLinks(t, []); }).join('\n');
          cards = cards.concat(tc);
          return;
        }
        if (!blk.head) {
          if (isNote && hasText) {
            var nt = bodyLines.map(stripMd).filter(Boolean).join('\n');
            cards.push({ title: name || 'Notes', type: 'post', topic: 'community', caption: nt, hashtags: [], keywords: '', notes: '', section: ctx.section, selected: false, isNote: true });
          }
          return;
        }
        // A ### heading whose text is several bold titles = a container of ideas ("### Three posts to prepare next").
        var titlesInside = blk.lines.filter(function (l) { var t = stripMd(l); return boldOnly(l) && !/:$/.test(t) && !quoteish(t) && t.length < 80; });
        if (titlesInside.length >= 2) {
          var curI = null;
          blk.lines.forEach(function (l) {
            var t = stripMd(l);
            if (boldOnly(l) && !/:$/.test(t) && !quoteish(t) && t.length < 80) { curI = { head: t, lines: [] }; cards.push(curI); return; }
            if (curI) curI.lines.push(l);
          });
          var subCtx = { section: niceCase(dropLead(stripMd(blk.head))) || ctx.section, type: ctx.type, topic: ctx.topic };
          cards = cards.map(function (c) { return c.head !== undefined && c.lines ? ideaCard(c.head, c.lines, subCtx) : c; });
          return;
        }
        if (!hasText) return;
        var card = ideaCard(blk.head, blk.lines, ctx);
        if (isNote) { card.selected = false; card.isNote = true; }
        cards.push(card);
      });
    });
    // Attach verified details to the idea they're about.
    details.forEach(function (d) {
      var words = d.label.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 3; });
      var best = null, score = 0;
      cards.forEach(function (c) { var t = (c.title + ' ' + c.caption).toLowerCase(); var s = words.filter(function (w) { return t.indexOf(w.replace(/s$/, '')) >= 0; }).length; if (s > score) { score = s; best = c; } });
      var txt = d.label + ': ' + d.text.trim() + (d.sources.length ? '\nSources:\n' + d.sources.join('\n') : '');
      if (best) best.notes = (best.notes ? best.notes + '\n\n' : '') + 'Verified details — ' + txt;
    });
    cards.forEach(function (c) {
      if (!c.hashtags.length && gTags.length && c.type !== 'story') c.hashtags = gTags.slice();
      if (!c.keywords && gKw && c.type !== 'story') c.keywords = gKw;
      if (!c.caption && !c.title) c.selected = false;
    });
    return cards.filter(function (c) { return c.caption || (c.title && c.title !== 'Untitled idea'); });
  }

  function merge(a, b) {
    var tags = a.hashtags.slice(); (b.hashtags || []).forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); });
    return { title: a.title, type: a.type, topic: a.topic, caption: [a.caption, (b.title && b.title !== 'Untitled idea' ? b.title + '\n' : '') + b.caption].filter(Boolean).join('\n\n'), hashtags: tags, keywords: [a.keywords, b.keywords].filter(Boolean).join(' · ') };
  }

  // Caption, keyword line and hashtags together — what you paste into Instagram.
  function fullCaption(c) {
    return [String(c.caption || '').trim(), c.keywords ? String(c.keywords).trim() : '', (c.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
  }

  var api = { split: split, niceCase: niceCase, merge: merge, fullCaption: fullCaption, detectType: detectType, detectTopic: detectTopic, TYPES: TYPES, TOPICS: TOPICS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HQSplit = api;
})(this);
