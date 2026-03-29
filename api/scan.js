export default async function handler(req, res) {

try {

```
if (req.method !== "POST") {
  return res.status(405).json({ success:false, error:"Only POST allowed" });
}

const { imageBase64 } = req.body || {};

if (!imageBase64) {
  return res.status(400).json({ success:false, error:"No image provided" });
}

const prompt = `Extract ATM cassette data.
```

Return ONLY JSON:
{
"type2":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},
"type3":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},
"type4":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0}
}`;

```
const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.MISTRAL_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "pixtral-12b-2409",
    temperature: 0,
    max_tokens: 800,
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: `data:image/jpeg;base64,${imageBase64}` },
        { type: "text", text: prompt }
      ]
    }]
  })
});

const text = await response.text();

let data;
try {
  data = JSON.parse(text);
} catch {
  return res.status(500).json({
    success:false,
    error:"Invalid response from AI",
    raw:text
  });
}

if (!response.ok) {
  return res.status(500).json({
    success:false,
    error:data?.error?.message || "API error"
  });
}

return res.status(200).json({
  success:true,
  data
});
```

} catch (err) {
return res.status(500).json({
success:false,
error: err.message || "Server error"
});
}
}
