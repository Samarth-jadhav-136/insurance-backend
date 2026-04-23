const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require("fs");

// 1. Put your actual Gemini API key here
const GEMINI_API_KEY = "AIzaSyDR-ZWvR4MEwS46qDMmTxnYlScWHiNCSiQ";

const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function dissolvePDFToMarkdown(pdfFilePath) {
  try {
    console.log("1. Uploading PDF to Gemini...");
    
    const uploadResult = await fileManager.uploadFile(pdfFilePath, {
      mimeType: "application/pdf",
      displayName: "Health Insurance Policy",
    });
    
    console.log(`Upload complete. File URI: ${uploadResult.file.uri}`);
    console.log("2. Dissolving PDF into Markdown (this takes a few seconds)...");

    // Using 1.5 Flash for speed and high context
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // The strict prompt to force Markdown tables
    const systemPrompt = `
      Read this entire document. 
      Convert all tables into strict Markdown format. 
      Retain all section headers, terms, conditions, and waiting periods exactly as written.
      Output the entire document as one massive, clean Markdown string. 
      Do not summarize or skip pages. Extract everything accurately.
    `;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri
        }
      },
      systemPrompt
    ]);

    const markdownOutput = result.response.text();
    
    console.log("\n--- EXTRACTION SUCCESSFUL ---");
    // Writing it to a file so you can easily review the formatted tables
    fs.writeFileSync("output.md", markdownOutput);
    console.log("Check the 'output.md' file in your folder to see the result!");

  } catch (error) {
    console.error("Extraction Failed:", error);
  }
}

// Replace with the name of your test PDF file
dissolvePDFToMarkdown("./sample-policy.pdf");