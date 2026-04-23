const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { extractText } = require('unpdf');
const Policy = require('../models/Policy');
const auth = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

// 🔑 OpenRouter config
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// 🔧 Safe JSON parser
function safeParseJSON(text) {
  text = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/^#+.*$/gm, '')
    .trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1) {
    throw new Error("No valid JSON found");
  }

  return JSON.parse(text.slice(start, end + 1));
}

// 🔥 OpenRouter call
async function callOpenRouter(messages) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-5-nano",
      messages,
      temperature: 0
    })
  });

  const data = await res.json();

  if (!data.choices) {
    throw new Error("OpenRouter failed: " + JSON.stringify(data));
  }

  return data.choices[0].message.content;
}


// 📤 UPLOAD ROUTE (AUTH + USERID FIXED)
router.post('/upload', auth, upload.single('policy'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;

  try {
    const uint8Array = new Uint8Array(fs.readFileSync(filePath));
    const { text } = await extractText(uint8Array, { mergePages: true });

    if (!text || text.trim().length === 0) {
      throw new Error("No text extracted from PDF");
    }

    const prompt = `
Analyze this insurance policy.

Return TWO parts:

1) Markdown summary

2) After:
###JSON_SEPARATOR###

Return ONLY valid JSON:

{
  "insurerName": string | null,
  "policyName": string | null,
  "totalLimit": number[] | null,
  "deductible": number[] | null,
  "roomRentLimit": string | null,
  "waitingPeriods": {
    "general": "",
    "preExisting": "",
    "specificDiseases": "",
    "accident": ""
  },
  "excludedProcedures": [],
  "documents": string[]
}

IMPORTANT:
- Include cataract, hernia, etc
- JSON only
`;

    const rawOutput = await callOpenRouter([
      {
        role: "user",
        content: prompt + "\n\n" + text.slice(0, 20000)
      }
    ]);

    const parts = rawOutput.split('###JSON_SEPARATOR###');
    if (parts.length < 2) {
      throw new Error("Bad AI response");
    }

    const markdownData = parts[0].trim();
    const jsonData = safeParseJSON(parts[1]);

    // ✅ SAVE REAL USER ID HERE
    const newPolicy = new Policy({
      userId: req.user.id,  // 🔥 FIXED
      policyMarkdown: markdownData,

      insurerName: jsonData.insurerName,
      policyName: jsonData.policyName,

      totalLimit: jsonData.totalLimit,
      deductible: jsonData.deductible,
      roomRentLimit: jsonData.roomRentLimit,

      waitingPeriods: jsonData.waitingPeriods || {},
      excludedProcedures: jsonData.excludedProcedures || [],

      documents: jsonData.documents || []
    });

    await newPolicy.save();
    fs.unlinkSync(filePath);

    res.json({
      message: "Policy uploaded successfully",
      policyId: newPolicy._id,
      data: jsonData
    });

  } catch (error) {
    console.error("Upload Error:", error.message);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({ error: error.message });
  }
});


// 💬 CHAT ROUTE (AUTH ADDED)
router.post('/chat', auth, async (req, res) => {
  try {
    const { policyId, question } = req.body;

    if (!policyId || !question) {
      return res.status(400).json({ error: "policyId and question required" });
    }

    const policy = await Policy.findById(policyId);

    if (!policy) {
      return res.status(404).json({ error: "Policy not found" });
    }

    // 🔒 ensure user only accesses their own policy
    if (policy.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const prompt = `
You are a precise Indian health insurance assistant.

Use STRUCTURED DATA first, then POLICY TEXT.

-----------------------------------
STRUCTURED DATA:
${JSON.stringify({
  waitingPeriods: policy.waitingPeriods,
  excludedProcedures: policy.excludedProcedures,
  deductible: policy.deductible
}, null, 2)}

-----------------------------------
POLICY TEXT:
${policy.policyMarkdown}

-----------------------------------
QUESTION:
${question}

-----------------------------------
RULES:
- DO NOT guess
- DO NOT mix categories
- Use waitingPeriods correctly
- Be direct

-----------------------------------
FORMAT:

Verdict: VALID / NOT VALID / DEPENDS  
Reason: (short explanation)  
Rule Applied: (exact rule)
`;

    const answer = await callOpenRouter([
      {
        role: "user",
        content: prompt
      }
    ]);

    const parsed = parseAnswer(answer);

    res.json(parsed);

  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(500).json({ error: "Chat failed" });
  }
});


// 🔧 PARSER
function parseAnswer(text) {
  const verdict = text.match(/Verdict:\s*(.*)/i)?.[1]?.trim() || "";
  const reason = text.match(/Reason:\s*(.*)/i)?.[1]?.trim() || "";
  const rule = text.match(/Rule Applied:\s*(.*)/i)?.[1]?.trim() || "";

  return { verdict, reason, rule };
}

router.get('/', auth, async (req, res) => {
  try {
    const policies = await Policy.find({ userId: req.user.id })
      .sort({ uploadedAt: -1 });

    res.json(policies);
  } catch (err) {
    console.error("Fetch Policies Error:", err.message);
    res.status(500).json({ error: "Failed to fetch policies" });
  }
});

module.exports = router;