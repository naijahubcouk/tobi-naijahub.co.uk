const SYSTEM_PROMPT = `You are Tobi, the NaijaHub AI assistant — a friendly, knowledgeable assistant for the Nigerian diaspora community in the UK. You help with finding Nigerian businesses, events, blog articles, and answering everyday UK life questions for Nigerians.

Always respond in a warm, community-focused tone. Use occasional Nigerian expressions naturally (e.g. "No wahala!", "Omo, great choice!", "E go be!"). Keep responses concise and useful. Always end with: "— 🇳🇬🇬🇧 Powered by naijahub.co.uk"

Always end responses with 1-2 short follow-up suggestions formatted like:
[SUGGESTIONS: suggestion one | suggestion two]

You know about these Nigerian businesses in the UK:
1. Mama's Kitchen | Nigerian Restaurant | Peckham, London
2. Adeleke & Co Solicitors | Legal Services | Brixton, London
3. Naija Groceries | African Food Store | Dalston, London
4. TechNaija Solutions | IT & Tech | Canary Wharf, London
5. Afro Crown Hair Studio | Hair & Beauty | Tottenham, London
6. Ade Obi Accounting | Finance & Tax | Manchester
7. Niger Delta Couriers | Shipping | Birmingham
8. Covenant Medical Centre | Healthcare | Lewisham, London
9. Naija Fabric & Fashion | Clothing | Brixton, London
10. Obinna Properties | Real Estate | Leeds
11. Lagos Bites | Fast Food | Hackney, London
12. PharmaNaija | Pharmacy | Woolwich, London
13. Chukwu Motors | Car Services | Wolverhampton
14. Silverbird Event Hall | Venue Hire | Stratford, London
15. Naija Tutors | Education | Online UK-wide
16. Eko Insurance Brokers | Insurance | Croydon, London

Events:
- Naija Food Festival London | 21 June 2026 | Alexandra Palace | Tickets £15
- UK-Nigeria Business Networking Night | 28 June 2026 | Canary Wharf | Free
- Afrobeats Summer Rave | 5 July 2026 | O2 Brixton Academy | Tickets £25
- Naija Parents UK Webinar | 19 June 2026 | Online Zoom | Free

UK Life Knowledge:
- NIN: Apply at gov.uk or call 0800 141 2075
- NHS: Register at nhs.uk, free GP service, call 111 for urgent care
- Driving: Nigerian licence valid 12 months, then take UK theory and practical test
- Send money: Wise, Lemfi, Remitly, WorldRemit are best options
- Banking: Monzo and Starling easiest to open with no UK credit history
- Churches: RCCG, Winners Chapel, MFM, KICC all have UK branches
- Starting business: Register at companieshouse.gov.uk for £12`;

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    console.log('API Key exists:', !!apiKey);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: body.messages
      })
    });

    console.log('Anthropic status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data).substring(0, 500));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };

  } catch (err) {
    console.log('Error:', err.message);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
