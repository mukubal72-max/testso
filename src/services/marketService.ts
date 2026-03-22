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
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'undefined') {
      console.warn('Gemini API Key is missing, using fallback rates');
      return getFallbackRates();
    }

    const ai = new GoogleGenAI({ apiKey });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: "What are the current live market rates for Gold (24K and 22K per 10 grams) and Silver (per 1 kg) in India today? Provide the latest prices in INR." }] }],
        config: {
          systemInstruction: "You are a precise financial data assistant. Search for the latest gold and silver prices in India. Return ONLY a JSON object with keys: gold24k, gold22k, silver, trend (up/down/stable), and change (percentage).",
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
        try {
          const data = JSON.parse(response.text.trim());
          return {
            ...data,
            lastUpdated: new Date().toISOString()
          };
        } catch (parseError) {
          console.error('Error parsing Gemini response:', parseError);
          // Try to extract JSON if it's wrapped in markdown
          const jsonMatch = response.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            return { ...data, lastUpdated: new Date().toISOString() };
          }
          throw parseError;
        }
      }
      throw new Error('No response from AI');
    } catch (apiError) {
      console.error('Gemini API Error, using fallback:', apiError);
      return getFallbackRates();
    }
  } catch (error) {
    console.error('Error in fetchMarketRates:', error);
    return getFallbackRates();
  }
};

const getFallbackRates = (): MarketRatesData => {
  return {
    gold24k: 72500,
    gold22k: 66450,
    silver: 91000,
    trend: 'stable',
    change: 0,
    lastUpdated: new Date().toISOString()
  };
};
