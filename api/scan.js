export default async function handler(req, res) {

if (req.method !== "POST") {
return res.status(405).json({ error: "Only POST allowed" });
}

try {

```
const { imageBase64 } = req.body;

if (!imageBase64) {
  return res.status(400).json({ error: "No image provided" });
}

// 🔥 STRONG PROMPT (VERY IMPORTANT)
const prompt = `
```

You are reading an Indian Overseas Bank ATM receipt.

There are TWO tables:

TABLE 1:
TYPE 1 | TYPE 2

TABLE 2:
TYPE 3 | TYPE 4

Each table has rows:
LOADED
DEPOSITED
DISPENSED
REMAINING

MAPPING:
TYPE 1 = ignore
TYPE 2 = ₹100
TYPE 3 = ₹500
TYPE 4 = ₹200

CRITICAL RULES:

* Read each TYPE column vertically (top to bottom)
* TYPE 2 is the SECOND column in first table
* Even if TYPE 1 is zero, TYPE 2 will have values
* Do NOT skip TYPE 2
* Extract exact numbers from receipt

Return ONLY JSON (no text, no explanation):
{
"type2":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},
"type3":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0},
"type4":{"loaded":0,"deposited":0,"dispensed":0,"remaining":0}
}
`;

```
// 🔥 CALL MISTRAL API
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
        {
          type: "image_url",
          image_url: `data:image/jpeg;base64,${imageBase64}`
        },
        {
          type: "text",
          text: prompt
        }
      ]
    }]
  })
});

const data = await response.json();

// 🔍 DEBUG (optional - can remove later)
console.log("MISTRAL RESPONSE:", JSON.stringify(data));

if (!response.ok) {
  return res.status(500).json({
    error: data.error?.message || "Mistral API error"
  });
}

return res.status(200).json(data);
```

} catch (err) {
console.error("SERVER ERROR:", err);
return res.status(500).json({
error: err.message || "Server error"
});
}
}
