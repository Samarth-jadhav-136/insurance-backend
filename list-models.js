// list-models.js
const API_KEY = "AIzaSyDR-ZWvR4MEwS46qDMmTxnYlScWHiNCSiQ"; // Paste your key here

async function showAvailableModels() {
  try {
    console.log("Fetching live models from Google...");
    // Direct REST call to the Gemini API models endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    // Filter and print only the models that support content generation
    const generationModels = data.models.filter(m => 
      m.supportedGenerationMethods.includes("generateContent")
    );

    console.log(`\nFound ${generationModels.length} models for generation:\n`);
    generationModels.forEach(m => {
      // Stripping out the "models/" prefix so you can copy-paste the exact string
      console.log(`- ${m.name.replace('models/', '')}`);
    });

  } catch (error) {
    console.error("Failed to fetch models:", error);
  }
}

showAvailableModels();