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

  function merge(a, b) {
    var tags = a.hashtags.slice(); (b.hashtags || []).forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); });
    return { title: a.title, type: a.type, topic: a.topic, caption: [a.caption, (b.title && b.title !== 'Untitled idea' ? b.title + '\n' : '') + b.caption].filter(Boolean).join('\n\n'), hashtags: tags, keywords: [a.keywords, b.keywords].filter(Boolean).join(' · ') };
  }

  // Caption, keyword line and hashtags together — what you paste into Instagram.
  function fullCaption(c) {
    return [String(c.caption || '').trim(), c.keywords ? String(c.keywords).trim() : '', (c.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
  }

  var api = { split: split, merge: merge, fullCaption: fullCaption, detectType: detectType, detectTopic: detectTopic, TYPES: TYPES, TOPICS: TOPICS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HQSplit = api;
})(this);
