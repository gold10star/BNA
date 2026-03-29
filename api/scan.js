export const config = {
api: {
bodyParser: {
sizeLimit: "10mb" // 🔥 important for image
}
}
};

export default async function handler(req, res) {

try {

```
if (req.method !== "POST") {
  return res.status(200).json({ success:false, error:"Only POST allowed" });
}

// 🔥 Safe body parsing
let body;
try {
  body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
} catch {
  return res.status(200).json({ success:false, error:"Invalid request body" });
}

const imageBase64 = body?.imageBase64;

if (!imageBase64) {
  return res.status(200).json({ success:false, error:"No image provided" });
}

// 🔥 TEMP TEST (avoid crash from Mistral)
return res.status(200).json({
  success:true,
  data:{
    choices:[{
      message:{
        content: JSON.stringify({
          type2:{deposited:126,dispensed:34,remaining:92},
          type3:{deposited:2987,dispensed:1610,remaining:1977},
          type4:{deposited:53,dispensed:52,remaining:1}
        })
      }
    }]
  }
});
```

} catch (err) {

```
return res.status(200).json({
  success:false,
  error: err.message || "Server crashed"
});
```

}
}
