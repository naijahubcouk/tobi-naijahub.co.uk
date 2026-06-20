// v4
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

const POSITIVE_SPONSOR = [
  'visa sponsorship', 'sponsorship provided', 'we will sponsor',
  'certificate of sponsorship', 'skilled worker visa',
  'sponsorship available', 'able to sponsor', 'can sponsor',
  'offer sponsorship', 'provide sponsorship', 'happy to sponsor',
  'sponsor the successful', 'sponsorship will be', 'cos will be',
  'tier 2 visa', 'skilled worker route', 'visa support',
  'work visa', 'sponsorship package', 'immigration sponsorship'
];

const CANNOT_SPONSOR = [
  'unable to offer certificate', 'cannot offer certificate',
  'unable to offer sponsorship', 'cannot offer sponsorship',
  'cannot sponsor', 'unable to sponsor', 'not able to sponsor',
  'no sponsorship', 'without sponsorship', 'do not offer sponsorship',
  'does not offer sponsorship', 'not provide sponsorship',
  'must have right to work', 'must already have the right to work',
  'you must have the right to work', 'applicants must have the right',
  'no visa', 'sponsorship is not'
];

const EXCLUDED_TITLES = [
  'deliver with uber', 'uber eats', 'delivery opportunities',
  'sign up and start', 'earn with', 'become a courier',
  'freelance', 'self-employed', 'zero hours'
];

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    // Search Adzuna specifically for visa sponsorship jobs
    const adzunaRes = await httpsGet(
      `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=50&what=visa+sponsorship&content-type=application/json&sort_by=date&max_days_old=30`
    );

    const results = JSON.parse(adzunaRes.body).results || [];
    console.log(`Adzuna returned ${results.length} jobs for "visa sponsorship"`);

    const sponsored = results.filter(job => {
      const title = (job.title || '').toLowerCase();
      const desc = (job.description || '').toLowerCase();
      const full = title + ' ' + desc;

      // Exclude gig titles
      if (EXCLUDED_TITLES.some(t => title.includes(t))) return false;
      // Must mention sponsorship positively
      if (!POSITIVE_SPONSOR.some(p => full.includes(p))) return false;
      // Must not deny sponsorship
      if (CANNOT_SPONSOR.some(p => full.includes(p))) return false;
      return true;
    }).slice(0, 6);

    console.log(`${sponsored.length} jobs passed all filters`);

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
