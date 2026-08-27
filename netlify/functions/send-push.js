'use strict';
const https = require('https');

const ONESIGNAL_APP_ID = '34d14bd0-a5fe-40c4-9b8e-56c1f178cebe';
const GITHUB_REPO = 'naijahubcouk/tobi-naijahub.co.uk';
const GITHUB_FILE = '_redirects';
const UPDATES_FILE = 'tobi-updates.json';
const MAX_UPDATES = 50; // keep last 50 updates

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function getRedirectsFile(githubToken) {
  const res = await httpsRequest({
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'User-Agent': 'AuntieTobi-PushTool',
      'Accept': 'application/vnd.github.v3+json',
    }
  });
  if (res.status !== 200) throw new Error(`GitHub GET failed: ${res.status}`);
  return {
    content: Buffer.from(res.data.content, 'base64').toString('utf8'),
    sha: res.data.sha
  };
}

async function updateRedirectsFile(githubToken, content, sha, message) {
  const body = JSON.stringify({
    message,
    content: Buffer.from(content).toString('base64'),
    sha,
  });
  const res = await httpsRequest({
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'User-Agent': 'AuntieTobi-PushTool',
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  }, body);
  if (res.status !== 200 && res.status !== 201) throw new Error(`GitHub PUT failed: ${res.status} ${JSON.stringify(res.data)}`);
  return res.data;
}

async function getUpdatesFile(githubToken) {
  try {
    const res = await httpsRequest({
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/contents/${UPDATES_FILE}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'User-Agent': 'AuntieTobi-PushTool',
        'Accept': 'application/vnd.github.v3+json',
      }
    });
    if (res.status === 404) return { updates: [], sha: null };
    if (res.status !== 200) throw new Error(`GitHub GET updates failed: ${res.status}`);
    const content = Buffer.from(res.data.content, 'base64').toString('utf8');
    return { updates: JSON.parse(content), sha: res.data.sha };
  } catch(e) {
    if (e.message && e.message.includes('404')) return { updates: [], sha: null };
    throw e;
  }
}

async function saveUpdatesFile(githubToken, updates, sha) {
  const content = Buffer.from(JSON.stringify(updates, null, 2)).toString('base64');
  const body = JSON.stringify({
    message: `Add push update: ${updates[0] && updates[0].title || 'update'}`,
    content,
    ...(sha ? { sha } : {})
  });
  const res = await httpsRequest({
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_REPO}/contents/${UPDATES_FILE}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'User-Agent': 'AuntieTobi-PushTool',
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  }, body);
  if (res.status !== 200 && res.status !== 201) throw new Error(`GitHub PUT updates failed: ${res.status}`);
  return res.data;
}

async function sendOneSignalPush(apiKey, title, message, url, sendAfterISO) {
  const scheduleFields = sendAfterISO ? { send_after: sendAfterISO } : {};
  const payload = JSON.stringify({
    app_id: ONESIGNAL_APP_ID,
    included_segments: ['Total Subscriptions'],
    headings: { en: title },
    contents: { en: message },
    web_url: url || 'https://auntietobi.co.uk',
    ...scheduleFields,
    chrome_web_icon: 'https://auntietobi.co.uk/icons/icon-192.png',
  });
  const res = await httpsRequest({
    hostname: 'onesignal.com',
    path: '/api/v1/notifications',
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    }
  }, payload);
  if (res.status !== 200) throw new Error(`OneSignal error ${res.status}: ${JSON.stringify(res.data)}`);
  return res.data;
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : (event.body || '{}');
    console.log('[send-push] rawBody:', rawBody.substring(0, 200));
    const parsed = JSON.parse(rawBody);
    console.log('[send-push] parsed keys:', Object.keys(parsed));
    const { title, message, mainMessage, type, slug, sourceUrl, b1, b2, b3, sendAfter, timezone } = parsed;
    const inAppContent = mainMessage || message; // mainMessage = in-app body, message = push notification text
    console.log('[send-push] title:', title, '| message:', message && message.substring(0,30));
    const apiKey = process.env.ONESIGNAL_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'ONESIGNAL_API_KEY not set' }) };
    if (!title || !message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'title and message are required' }) };
    if (!inAppContent) return { statusCode: 400, headers, body: JSON.stringify({ error: 'main message is required' }) };

    // 1. Build the deep link URL
    const encodedContent = encodeURIComponent(inAppContent);
    const encodedB1 = encodeURIComponent(b1 || 'How do I save money in the UK?');
    const encodedB2 = encodeURIComponent(b2 || 'Find a Nigerian business near me');
    const encodedB3 = encodeURIComponent(b3 || 'What benefits am I entitled to?');
    const encodedSrc = sourceUrl ? encodeURIComponent(sourceUrl) : '';
    // Use type directly so the app shows correct category label
    const validActions = ['update','news','tip','event','business','motivation','prayer','jobs','immigration','money','health','housing'];
    const action = validActions.includes(type) ? type : 'tip';

    // Use slug-based deep link to avoid URL length limits with rich HTML content
    const deepLink = `https://auntietobi.co.uk/?action=${action}&slug=${encodeURIComponent(shortSlug)}&content=${encodedContent}&b1=${encodedB1}&b2=${encodedB2}&b3=${encodedB3}${sourceUrl ? '&source=' + encodedSrc : ''}`;
    const shortSlug = slug || (type + '-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 25));
    const shortUrl = `https://auntietobi.co.uk/n/${shortSlug}`;

    // 2. Add redirect to GitHub _redirects (if GitHub token available)
    let githubResult = null;
    if (githubToken) {
      try {
        const { content, sha } = await getRedirectsFile(githubToken);
        const newLine = `/n/${shortSlug}   ${deepLink}   301`;
        if (!content.includes(`/n/${shortSlug}`)) {
          const catchAll = '/* /index.html 200';
          const updatedContent = content.includes(catchAll)
            ? content.replace(catchAll, newLine + '\n' + catchAll)
            : content.trimEnd() + '\n' + newLine + '\n';
          await updateRedirectsFile(githubToken, updatedContent, sha, `Add push notification deep link: /n/${shortSlug}`);
          githubResult = { added: true, slug: shortSlug };
          console.log(`[send-push] Added /n/${shortSlug} to _redirects`);
        } else {
          githubResult = { added: false, slug: shortSlug, note: 'Slug already exists' };
        }
      } catch(e) {
        console.log('[send-push] GitHub update failed (non-fatal):', e.message);
        githubResult = { error: e.message };
      }
    }

    // 3. Save to tobi-updates.json in GitHub
    let updatesResult = null;
    if (githubToken) {
      try {
        const { updates, sha: updatesSha } = await getUpdatesFile(githubToken);
        const newUpdate = {
          id: Date.now().toString(),
          title: title,
          message: inAppContent,
          pushMessage: message,
          type: type || 'update',
          sourceUrl: sourceUrl || null,
          date: new Date().toISOString(),
          slug: shortSlug
        };
        const updatedList = [newUpdate, ...updates].slice(0, MAX_UPDATES);
        await saveUpdatesFile(githubToken, updatedList, updatesSha);
        updatesResult = { saved: true, total: updatedList.length };
        console.log('[send-push] Saved to tobi-updates.json:', updatesResult);
      } catch(e) {
        console.log('[send-push] Updates save failed (non-fatal):', e.message);
        updatesResult = { error: e.message };
      }
    }

    // 4. Send OneSignal push with short URL
    const pushResult = await sendOneSignalPush(apiKey, title, message, shortUrl, sendAfter || null);
    console.log(`[send-push] ✅ Sent. ID: ${pushResult.id}, recipients: ${pushResult.recipients || 'queued'}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        notificationId: pushResult.id,
        shortUrl,
        deepLink,
        github: githubResult,
      })
    };

  } catch(e) {
    console.log('[send-push] Error:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
