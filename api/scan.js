export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {

    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.MISTRAL_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "pixtral-12b-2409",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: `data:image/jpeg;base64,${imageBase64}` },
            { type: "text", text: "Extract ATM cassette data and return JSON only" }
          ]
        }],
        temperature: 0
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "API error" });
    }

    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
