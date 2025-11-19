import { GoogleGenAI } from "@google/genai";

export const analyzeLeadWithGemini = async (leadNotes: string, leadSource: string) => {
  if (!process.env.API_KEY) {
    // Fallback mock if no API key is present in environment for demo purposes
    console.warn("No API_KEY found. Using mock response.");
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "Based on the user's interest in the enterprise plan and their origin from a high-intent Meta form, this lead has a **High Probability** of conversion. Recommend scheduling a demo within 24 hours.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a sales expert. Analyze this lead based on the following data.
      Source: ${leadSource}
      Notes: ${leadNotes}
      
      Provide a concise 2-sentence summary of the lead quality and a recommended next step.`,
    });
    
    return response.text;
  } catch (error) {
    console.error("Gemini API Error", error);
    return "Could not generate analysis at this time.";
  }
};