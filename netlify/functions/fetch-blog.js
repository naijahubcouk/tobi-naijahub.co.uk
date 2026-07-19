// Netlify function — fetches blog post content from auntietobi.com
const https = require('https');
const http = require('http');

function fetchUrl(url, redirectCount) {
  redirectCount = redirectCount || 0;
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));

  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Connection': 'close'
      }
    };

    const req = lib.get(url, options, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : new URL(res.headers.location, url).href;
        return resolve(fetchUrl(next, redirectCount + 1));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { if (data.length < 500000) data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, html: data, headers: res.headers }));
    });

    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractTitle(html) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
           || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  if (og) return og[1].trim();
  const h1 = html.match(/<h1[^>]*>([^<]{5,})<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, '').trim();
  const title = html.match(/<title>([^<]+)<\/title>/i);
  if (title) return title[1].replace(/ [|\-–] .*$/, '').trim();
  return '';
}

function extractImage(html) {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
           || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return og ? og[1].trim() : '';
}

function extractContent(html) {
  // Remove noise first
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '');

  // Try common blog content class names
  const classPatterns = [
    'blog-post-content', 'post-content', 'entry-content', 'article-content',
    'blog-content', 'main-content', 'content-body', 'post-body', 'article-body',
    'single-content', 'blog-single', 'post-single', 'ld-content', 'ld-blog',
    'wpb_content', 'site-content', 'page-content', 'td-post-content',
    'content-area', 'blog-detail', 'post-detail', 'article-detail'
  ];

  for (const cls of classPatterns) {
    const idx = clean.indexOf(`class="${cls}"`);
    if (idx === -1) continue;
    const tagStart = clean.lastIndexOf('<', idx);
    const tagEnd = clean.indexOf('>', idx);
    if (tagEnd === -1) continue;
    const tagName = clean.substring(tagStart + 1, clean.indexOf(/[\s>]/.exec(clean.substring(tagStart + 1)) ? clean.indexOf(' ', tagStart + 1) : tagEnd, tagStart + 1)).split(/[\s>]/)[0];
    
    // Find matching close tag
    let depth = 1, pos = tagEnd + 1;
    const closeTag = `</${tagName}`;
    const openTag = `<${tagName}`;
    while (depth > 0 && pos < clean.length && pos < tagStart + 100000) {
      const nextOpen = clean.indexOf(openTag, pos);
      const nextClose = clean.indexOf(closeTag, pos);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) { depth++; pos = nextOpen + 1; }
      else { depth--; pos = nextClose + closeTag.length; }
    }
    const content = clean.substring(tagStart, pos);
    const textLen = content.replace(/<[^>]+>/g, '').trim().length;
    if (textLen > 300) return content;
  }

  // Try article tag
  const articleMatch = clean.match(/<article[^>]*>([\s\S]{300,}?)<\/article>/i);
  if (articleMatch) return articleMatch[0];

  // Last resort — extract all paragraphs
  const paras = [];
  const pReg = /<p[^>]*>([\s\S]{20,}?)<\/p>/gi;
  let m;
  while ((m = pReg.exec(clean)) !== null) {
    const txt = m[1].replace(/<[^>]+>/g, '').trim();
    if (txt.length > 30) paras.push(`<p>${txt}</p>`);
  }
  return paras.length >= 3 ? paras.join('\n') : null;
}

function sanitize(html, baseUrl) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<link[^>]+>/gi, '')
    .replace(/<meta[^>]+>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    // Fix relative image URLs
    .replace(/src="\/([^"]+)"/g, `src="${baseUrl}/$1"`)
    .replace(/src='\/([^']+)'/g, `src='${baseUrl}/$1'`)
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const url = event.queryStringParameters && event.queryStringParameters.url;
  if (!url || !url.includes('auntietobi.com')) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid URL' }) };
  }

  try {
    const { status, html, headers: resHeaders } = await fetchUrl(url);
    
    // Log for debugging
    console.log('Fetch status:', status, '| HTML length:', html.length);
    console.log('X-Frame-Options:', resHeaders['x-frame-options'] || 'none');
    
    if (status !== 200 || html.length < 500) {
      return { statusCode: 200, headers, body: JSON.stringify({ 
        error: `Status ${status}, html length ${html.length}`, fallback: true 
      })};
    }

    const title = extractTitle(html);
    const image = extractImage(html);
    const rawContent = extractContent(html);

    console.log('Title:', title);
    console.log('Content found:', rawContent ? rawContent.length : 0);

    if (!rawContent) {
      // Return first 2000 chars of cleaned HTML for debugging
      const debug = html.replace(/<script[\s\S]*?<\/script>/gi,'').substring(0, 500);
      return { statusCode: 200, headers, body: JSON.stringify({ 
        error: 'No content extracted', fallback: true, title, debug 
      })};
    }

    const base = new URL(url).origin;
    const content = sanitize(rawContent, base);

    return { statusCode: 200, headers, body: JSON.stringify({ title, image, content, url }) };

  } catch (err) {
    console.log('Error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ error: err.message, fallback: true }) };
  }
};
