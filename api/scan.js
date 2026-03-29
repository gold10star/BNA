export default async function handler(req, res) {

try {

```
if (req.method !== "POST") {
  return res.status(405).json({ success:false, error:"Only POST allowed" });
}

const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
const imageBase64 = body?.imageBase64;

if (!imageBase64) {
  return res.status(400).json({ success:false, error:"No image provided" });
}

const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.MISTRAL_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "mistral-small-latest",   // 🔥 safer model
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Extract ATM cassette data and return JSON only" }
      ]
    }],
    max_tokens: 500
  })
});

const text = await response.text();

let data;
try {
  data = JSON.parse(text);
} catch {
  return res.status(500).json({
    success:false,
    error:"Invalid API response",
    raw:text
  });
}

return res.status(200).json({
  success:true,
  data
});
```

} catch (err) {

```
return res.status(500).json({
  success:false,
  error: err.message || "Server crashed"
});
```

}
}
