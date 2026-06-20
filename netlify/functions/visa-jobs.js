// v5
const https = require('https');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || 'e9267d1e';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || 'bcca8a8ff7d2a97044c4793a004d43f5';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('timeout')); });
  });
}

const CANNOT_SPONSOR = [
  'unable to offer certificate', 'cannot offer certificate',
  'unable to offer sponsorship', 'cannot offer sponsorship',
  'cannot sponsor', 'unable to sponsor', 'not able to sponsor',
  'no sponsorship', 'without sponsorship', 'do not offer sponsorship',
  'does not offer sponsorship', 'not provide sponsorship',
  'must have right to work', 'must already have the right to work',
  'you must have the right to work', 'applicants must have the right'
];

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Use Adzuna's sponsored_jobs flag to get visa sponsored jobs
    const adzunaRes = await httpsGet(
      `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&what=visa+sponsorship&content-type=application/json&sort_by=date&max_days_old=30`
    );

    const data = JSON.parse(adzunaRes.body);
    let results = data.results || [];
    console.log(`Adzuna returned ${results.length} jobs`);

    // If less than 20 results, fetch page 2 as well
    if (results.length < 20) {
      try {
        const page2Res = await httpsGet(
          `https://api.adzuna.com/v1/api/jobs/gb/search/2?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&what=visa+sponsorship&content-type=application/json&sort_by=date&max_days_old=30`
        );
        const page2Data = JSON.parse(page2Res.body);
        results = results.concat(page2Data.results || []);
        console.log(`After page 2: ${results.length} total jobs`);
      } catch(e) { console.log('Page 2 fetch failed:', e.message); }
    }

    const sponsored = results.filter(job => {
      // Use Adzuna's own visa_sponsorship field — only include if true/available
      const visaField = job.visa_sponsorship;
      if (visaField === false || visaField === 'Not available' || visaField === 'not available') return false;
      // Also filter description for negative phrases
      const desc = (job.description || '').toLowerCase();
      return !CANNOT_SPONSOR.some(p => desc.includes(p));
    }).slice(0, 6);

    console.log(`${sponsored.length} jobs passed filters`);

    const jobs = sponsored.map(job => ({
      title: job.title,
      company: job.company?.display_name || 'Employer',
      location: job.location?.display_name || 'UK',
      salary: job.salary_min
        ? `£${Math.round(job.salary_min / 1000)}k${job.salary_max ? '–£' + Math.round(job.salary_max / 1000) + 'k' : '+'}`
        : 'Salary not specified',
      url: job.redirect_url,
      posted: job.created ? new Date(job.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '',
      visa: true,
      verified: true
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs, total: jobs.length, isVisa: true })
    };

  } catch (err) {
    console.error('visa-jobs error:', err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ jobs: [], message: 'Could not load visa sponsored jobs right now — please try again shortly.' })
    };
  }
};
