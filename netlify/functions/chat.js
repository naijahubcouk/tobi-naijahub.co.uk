exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: 'You are Tobi, the NaijaHub AI assistant for the Nigerian diaspora in the UK. Be warm and friendly. Use expressions like No wahala and Omo. End every response with: Powered by naijahub.co.uk and add [SUGGESTIONS: option one | option two]',
        messages: body.messages
      })
    });
    const data = await response.json();
    console.log('Status:', response.status);
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
