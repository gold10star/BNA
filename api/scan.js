export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, imageMime } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
  if (!MISTRAL_KEY) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `You are extracting data from an Indian Overseas Bank ATM/BNA Host Total receipt.

The receipt may be rotated — read in any orientation.

MACHINE TYPE DETECTION:
- Look for ATM ID field. If it starts with "IOBC" → machine_type = "BNA"
- If ATM ID starts with "IOBD" → machine_type = "ATM"

For BNA (IOBC): TWO cassette blocks with TYPE 1, TYPE 2 (block 1) and TYPE 3, TYPE 4 (block 2).
Each type has rows: LOADED, DEPOSITED, DISPENSED, REMAINING
- TYPE 1 = ignore (zeros)
- TYPE 2 = 100 rupees
- TYPE 3 = 500 rupees
- TYPE 4 = 200 rupees

For ATM (IOBD): TWO cassette blocks with TYPE 1, TYPE 2 (block 1) and TYPE 3, TYPE 4 (block 2).
Each type has rows: LOADED, REMAINING, DISPENSED (NO DEPOSITED row)
- TYPE 1 = 100 rupees
- TYPE 2 = 500 rupees
- TYPE 3 = 200 rupees
- TYPE 4 = 500 rupees

Extract: date (e.g. "09 May 2024"), ATM ID, REF NO, machine_type.
For each type extract: loaded, deposited (0 if ATM), dispensed, remaining as integers.
Do NOT mix up TYPE columns or rows.

Return ONLY valid JSON no markdown:
{"machine_type":"BNA","date":"DD Mon YYYY","atm_id":"IOBC1689","ref_no":"XXXXX","type1":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},"type2":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},"type3":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},"type4":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0}}`;

  const callMistral = async () => fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_KEY}` },
    body: JSON.stringify({
      model: 'pixtral-12b-2409',
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: `data:${imageMime || 'image/jpeg'};base64,${imageBase64}` },
        { type: 'text', text: prompt }
      ]}],
      temperature: 0, max_tokens: 1024
    })
  });

  try {
    let r = await callMistral();
    if (r.status === 429) { await new Promise(x => setTimeout(x, 62000)); r = await callMistral(); }
    const json = await r.json();
    if (!r.ok) {
      const msg = json.error?.message || json.message || 'Mistral error';
      if (r.status === 429 || msg.toLowerCase().includes('rate')) return res.status(429).json({ error: 'Rate limit. Please wait 60s and retry.' });
      return res.status(r.status).json({ error: msg });
    }
    const raw = (json.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
    try { return res.status(200).json(JSON.parse(raw)); }
    catch { return res.status(500).json({ error: 'Could not parse AI response. Try again.', raw }); }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
