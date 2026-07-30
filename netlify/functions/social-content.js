'use strict';
const https = require('https');

exports.handler = async function(event) {
  // CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const body = JSON.parse(event.body);
    const { businessName, businessDesc, businessCat, businessLoc, businessUrl, whatsapp, tone, wantPosts, wantStories, wantReels } = body;

    if (!businessName) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Business name required' }) };

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };

    const toneDescriptions = {
      professional: 'polished, trustworthy and authoritative — like a confident Nigerian UK entrepreneur',
      vibrant: 'energetic, exciting and full of life — like your favourite hype person in the community',
      luxury: 'elevated, exclusive and aspirational — high-end brands that speak to quality and status',
      friendly: 'warm, conversational and approachable — like a trusted friend recommending a business',
      bold: 'direct, powerful and unapologetic — confident Nigerian energy that commands attention',
      cultural: 'proudly Nigerian UK — weaving in community references, Yoruba phrases, diaspora pride and cultural celebration'
    };

    const prompt = `You are an elite Nigerian UK social media strategist with 10 years of experience growing Black-owned businesses on Instagram. Your content always feels authentic, culturally resonant and drives real engagement.

BUSINESS:
- Name: ${businessName}
- Category: ${businessCat || 'Nigerian business'}
- Location: ${businessLoc || 'UK'}
- Description: ${businessDesc || 'A quality Nigerian-owned business serving the UK community'}
- Listing URL: ${businessUrl || 'auntietobi.co.uk'}
${whatsapp ? `- WhatsApp: ${whatsapp}` : ''}

BRAND TONE: ${toneDescriptions[tone] || toneDescriptions.professional}

AUDIENCE: Nigerian diaspora in the UK — professionals, families, entrepreneurs aged 25-45 who are proud of their heritage and building their lives in Britain.

GOLDEN RULES:
1. Every caption must have a HOOK first line that stops the scroll
2. Mix content themes: transformation, behind-the-scenes, cultural moments, tips, testimonials, community, seasonal UK events
3. CTAs are specific: "DM us NOW", "Click the link in bio", "Send us a WhatsApp", "Tag someone who needs this"
4. Hashtags: mix niche (#NigerianMUA), location (#NigerianLondon), community (#NigeriansinUK #NaijaUK), trending Black business (#SupportBlackBusiness)
5. Captions feel real — not AI-generated. Punchy. Nigerian English where it fits.
6. Every piece of content is SPECIFICALLY about ${businessName} — never generic

${wantPosts ? `
===INSTAGRAM POSTS===
Generate exactly 30 Instagram posts. Spread across these themes (5-6 posts each):
1. INTRODUCTION / BRAND STORY
2. SERVICE SHOWCASE (highlight specific services)
3. CUSTOMER TRANSFORMATION / RESULTS
4. BEHIND THE SCENES
5. COMMUNITY & CULTURE (Nigerian UK moments)
6. TIPS & EDUCATION (position as expert)

Return as JSON:
{
  "posts": [
    {
      "post_number": 1,
      "theme": "theme name",
      "hook": "first line of caption — the scroll-stopper",
      "caption": "full caption with emojis, line breaks, storytelling and CTA. 100-180 words.",
      "hashtags": "25-30 hashtags as a single string",
      "image_prompt": "Canva/photo brief: what the image should show, colours, mood, style"
    }
  ]
}` : ''}

${wantStories ? `
===INSTAGRAM STORIES===
Generate 15 story ideas. Mix types: Poll, Q&A, This or That, Tutorial, Countdown, Behind the scenes, Testimonial, Quiz, Swipe up.

Return as JSON:
{
  "stories": [
    {
      "story_number": 1,
      "type": "type e.g. Poll",
      "title": "What the story is about",
      "visual": "What to show on screen — photo, video, graphic description",
      "text_overlay": "Text to display on the story",
      "interactive": "Poll options / Question sticker / Quiz answer as applicable",
      "duration_tip": "How long to run this story e.g. 1 slide, 3 slides"
    }
  ]
}` : ''}

${wantReels ? `
===REEL SCRIPTS===
Generate 5 reel scripts. Each 30-60 seconds when spoken. Include hooks that work in the first 2 seconds.

Return as JSON:
{
  "reels": [
    {
      "reel_number": 1,
      "concept": "What this reel is about",
      "hook": "Exact first words spoken or on-screen text — must be irresistible",
      "script": "Full script with [VISUAL: description] cues and [TEXT ON SCREEN: text] markers. Scene by scene.",
      "voiceover_notes": "Tone, pace, energy for delivery",
      "music": "Music vibe e.g. Afrobeats, RnB instrumental, motivational, trending audio suggestion",
      "cta": "End screen call to action — spoken and on-screen"
    }
  ]
}` : ''}

Return ONLY a single valid JSON object containing the requested sections (posts, stories, reels). No markdown, no explanation, no preamble. Just the JSON.`;

    // Call OpenRouter API
    const requestBody = JSON.stringify({
      model: 'openai/gpt-4o',
      max_tokens: 10000,
      temperature: 0.85,
      messages: [
        {
          role: 'system',
          content: 'You are an expert social media strategist. Return only valid JSON as instructed. Never add markdown formatting or explanation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://auntietobi.co.uk',
          'X-Title': 'Auntie Tobi Social Content',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch(e) { reject(new Error('Invalid JSON from API: ' + data.substring(0, 200))); }
        });
      });
      req.on('error', reject);
      req.setTimeout(55000, () => { req.destroy(); reject(new Error('Request timeout')); });
      req.write(requestBody);
      req.end();
    });

    const rawContent = result.choices?.[0]?.message?.content || '';
    if (!rawContent) throw new Error('No content from API');

    // Strip any markdown fences
    const cleaned = rawContent.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();

    // Validate JSON
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch(e) {
      // Try to extract JSON
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Could not parse JSON from response');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, content: parsed })
    };

  } catch(err) {
    console.error('Social content error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Generation failed' })
    };
  }
};
