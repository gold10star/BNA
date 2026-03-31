export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, imageMime } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  const MISTRAL_KEY = process.env.MISTRAL_API_KEY;
  if (!MISTRAL_KEY) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `You are validating and extracting data from an Indian Overseas Bank (IOB) ATM/BNA Host Total receipt.

The receipt may be rotated — read in any orientation.

== STEP 1: VALIDATE FIRST ==
Before extracting anything, check if this image is a genuine IOB ATM/BNA Host Total receipt.

A valid receipt MUST have ALL of the following:
- An ATM ID field starting with "IOBC" (BNA) or "IOBD" (ATM)
- A REF NO field
- Cassette TYPE blocks (TYPE 1, TYPE 2, TYPE 3, TYPE 4) with rows like LOADED, DISPENSED, REMAINING
- Numeric cassette values in those rows

If the image is NOT a valid IOB Host Total receipt (e.g. it is a random photo, a different bank's receipt, a transaction slip, a selfie, a document, blank, blurry/unreadable, or missing the required fields), return ONLY this JSON:
{"valid":false,"reason":"<one short sentence describing why it was rejected>"}

Examples of rejection reasons:
- "This appears to be a transaction receipt, not a Host Total report."
- "No IOB ATM ID (IOBC/IOBD) was detected in the image."
- "The image is too blurry or unclear to read."
- "This does not appear to be an ATM/BNA receipt."
- "The cassette TYPE blocks with LOADED/DISPENSED/REMAINING rows are missing."

== STEP 2: EXTRACT (only if valid) ==

MACHINE TYPE DETECTION:
- ATM ID starts with "IOBC" → machine_type = "BNA"
- ATM ID starts with "IOBD" → machine_type = "ATM"

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

Return ONLY valid JSON, no markdown:
{"valid":true,"machine_type":"BNA","date":"DD Mon YYYY","atm_id":"IOBC1689","ref_no":"XXXXX","type1":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},"type2":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},"type3":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},"type4":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0}}`;

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
    try {
      const parsed = JSON.parse(raw);
      // Validation failed — AI rejected the image
      if (parsed.valid === false) {
        return res.status(422).json({ error: 'invalid_receipt', reason: parsed.reason || 'This does not appear to be a valid IOB Host Total receipt.' });
      }
      return res.status(200).json(parsed);
    }
    catch { return res.status(500).json({ error: 'Could not parse AI response. Try again.', raw }); }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
