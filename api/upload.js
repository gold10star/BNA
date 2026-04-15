// api/upload.js — Server-side imgBB upload (avoids CORS + uses server API key)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, imageMime } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  const IMGBB_KEY = process.env.IMGBB_API_KEY;
  if (!IMGBB_KEY) return res.status(500).json({ error: 'IMGBB_API_KEY not configured' });

  try {
    // imgBB expects form-encoded data
    const params = new URLSearchParams();
    params.append('key', IMGBB_KEY);
    params.append('image', imageBase64);
    params.append('expiration', '86400'); // 24 hours

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: params
    });

    const json = await response.json();

    if (json.success) {
      return res.status(200).json({ url: json.data.url });
    } else {
      return res.status(400).json({ error: json.error?.message || 'imgBB upload failed' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
