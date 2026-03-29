export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, imageMime } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
  if (!MISTRAL_KEY) return res.status(500).json({ error: 'API key not configured on server' });

  const prompt = `Extract cassette data from this Indian Overseas Bank ATM/BNA receipt image.
The receipt may be rotated — read in any orientation.

TWO cassette blocks:
Block 1: TYPE 1 and TYPE 2 columns — rows: LOADED, DEPOSITED, DISPENSED, REMAINING
Block 2: TYPE 3 and TYPE 4 columns — rows: LOADED, DEPOSITED, DISPENSED, REMAINING

DENOMINATION MAPPING:
- TYPE 1 = ignore (all zeros)
- TYPE 2 = 100 rupee notes
- TYPE 3 = 500 rupee notes
- TYPE 4 = 200 rupee notes

Extract for each type: loaded, deposited, dispensed, remaining as integers.
Extract from header: date (e.g. "18 Aug 2025"), ATM ID, REF NO.
Do NOT mix up columns or rows. Return 0 only if receipt shows 0.

Return ONLY valid JSON, no markdown, no explanation:
{"date":"DD Mon YYYY","atm_id":"IOBC1689","ref_no":"XXXXX","type2":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},"type3":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},"type4":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0}}`;

  const callMistral = async () => {
    return await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_KEY}`
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: `data:${imageMime || 'image/jpeg'};base64,${imageBase64}` },
            { type: 'text', text: prompt }
          ]
        }],
        temperature: 0,
        max_tokens: 1024
      })
    });
  };

  try {
    let mistralRes = await callMistral();

    // Auto-retry once if rate limited (429)
    if (mistralRes.status === 429) {
      console.log('Rate limited — retrying after 62 seconds...');
      await new Promise(r => setTimeout(r, 62000));
      mistralRes = await callMistral();
    }

    const json = await mistralRes.json();

    if (!mistralRes.ok) {
      const errMsg = json.error?.message || json.message || 'Mistral API error';
      // Check if rate limit in message
      if (mistralRes.status === 429 || errMsg.toLowerCase().includes('rate')) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment and try again.' });
      }
      return res.status(mistralRes.status).json({ error: errMsg });
    }

    const raw = json.choices?.[0]?.message?.content || '';
    const cleaned = raw.replace(/```json|```/g, '').trim();

    try {
      const data = JSON.parse(cleaned);
      return res.status(200).json(data);
    } catch {
      return res.status(500).json({ error: 'Could not parse AI response. Please try again.', raw });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
