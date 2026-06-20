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

// Must exactly match the normalise() function in visa-jobs.js
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
  if (!match) throw new Error('Could not find CSV URL on GOV.UK page');

  const csvUrl = match[0];
  console.log('Downloading CSV:', csvUrl);
  const csv = await httpsGet(csvUrl);

  console.log('Parsing CSV...');
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

  const outputPath = path.join(__dirname, '..', 'netlify', 'functions', 'sponsors.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output));
  console.log(`✅ Done — ${sponsors.size} sponsors saved to sponsors.json`);

  // Show a few examples
  const sample = output.sponsors.slice(0, 5);
  console.log('Sample entries:', sample);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
