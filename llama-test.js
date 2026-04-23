const fs = require("fs");

// Paste your OpenRouter API key here
const OPENROUTER_API_KEY = "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"; 

async function testLlamaDispute() {
  try {
    // 1. Read the dissolved policy we just generated with Gemini
    const markdownPolicy = fs.readFileSync("output.md", "utf8");

    // 2. A mock scenario to test its legal reasoning
    const rejectionReason = "Cataract surgery is not covered in the first year.";

    const systemPrompt = `
    You are an expert Indian Health Insurance Ombudsman.
    Here is the user's full policy document in Markdown:
    ${markdownPolicy}

    The insurer rejected the claim stating: "${rejectionReason}"

    Task:
    1. Cross-reference the rejection reason against the exact clauses in the provided policy.
    2. If the rejection is VALID according to the text, explain exactly which clause proves the insurer is right.
    3. If the rejection is INVALID, draft a professional, aggressive legal email to the Grievance Redressal Officer to dispute it based strictly on the policy terms.
    `;

    console.log("Reading output.md and sending to Llama 3.3 70B...");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct",
        messages: [{ role: "user", content: systemPrompt }],
        temperature: 0.1 // Low temperature for factual, legal accuracy
      })
    });

    const data = await response.json();
    
    console.log("\n--- LLAMA 3.3 70B RESPONSE ---");
    console.log(data.choices[0].message.content);

  } catch (error) {
    console.error("OpenRouter Test Failed:", error);
  }
}

testLlamaDispute();