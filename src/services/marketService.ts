import { GoogleGenAI } from "@google/genai";

export interface MarketRatesData {
  gold24k: number;
  gold22k: number;
  silver: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  lastUpdated: string;
}

export const fetchMarketRates = async (): Promise<MarketRatesData> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'undefined') {
      throw new Error('Gemini API Key is missing');
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: "Get current gold and silver rates in India for today." }] }],
      config: {
        systemInstruction: "You are a financial data assistant. Provide the current market rates for Gold (24K, 22K per 10g) and Silver (per 1kg) in India (INR). Return ONLY a JSON object.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            gold24k: { type: "number" },
            gold22k: { type: "number" },
            silver: { type: "number" },
            trend: { type: "string", enum: ["up", "down", "stable"] },
            change: { type: "number" }
          },
          required: ["gold24k", "gold22k", "silver", "trend", "change"]
        },
        tools: [{ googleSearch: {} }]
      }
    });

    if (response.text) {
      const cleanedText = response.text.replace(/```json\n?|\n?```/g, '').trim();
      const data = JSON.parse(cleanedText);
      return {
        ...data,
        lastUpdated: new Date().toISOString()
      };
    }
    throw new Error('No response from AI');
  } catch (error) {
    console.error('Error in fetchMarketRates:', error);
    throw error;
  }
};
