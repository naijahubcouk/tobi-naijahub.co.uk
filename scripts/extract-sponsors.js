const https = require('https');
const fs = require('fs');
const path = require('path');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function normalise(name) {
  return (name || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  console.log('Fetching latest CSV URL from GOV.UK...');
  const page = await httpsGet('https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers');
  const match = page.body.match(/https:\/\/assets\.publishing\.service\.gov\.uk\/media\/[^"]+\.csv/);
  if (!match) throw new Error('Could not find CSV URL');

  console.log('Downloading CSV:', match[0]);
  const csv = await httpsGet(match[0]);

  const lines = csv.body.split('\n');
  const sponsors = new Set();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const firstComma = line.indexOf(',');
    if (firstComma === -1) continue;
    const rawName = line.substring(0, firstComma).replace(/^"|"$/g, '').trim();
    const norm = normalise(rawName);
    if (norm.length > 2) sponsors.add(norm);
  }

  const output = {
    updated: new Date().toISOString().split('T')[0],
    count: sponsors.size,
    sponsors: Array.from(sponsors)
  };

  // Save to public root so it's accessible as /sponsors.json
  const outputPath = path.join(__dirname, '..', 'sponsors.json');
  fs.writeFileSync(outputPath, JSON.stringify(output));
  console.log(`✅ Done — ${sponsors.size} sponsors saved to public sponsors.json`);
  console.log('Sample:', output.sponsors.slice(0, 3));
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
