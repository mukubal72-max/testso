import React from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Gem, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

export default function MarketRates() {
  const [rates, setRates] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Get current gold and silver rates in India.",
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
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.gold24k) {
        setRates(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching market rates:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 3600000); // Update every hour
    return () => clearInterval(interval);
  }, []);

  if (!rates && loading) {
    return (
      <div className="card p-6 h-full flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="animate-spin text-primary" size={24} />
        <p className="text-xs text-gray-500 font-medium">Fetching live market rates...</p>
      </div>
    );
  }

  return (
    <div className="card p-6 h-full flex flex-col justify-between relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-5">
        <Gem size={120} />
      </div>
      
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" />
            Live Market Rates
          </h3>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">India (INR)</p>
        </div>
        <button 
          onClick={fetchRates}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-400 hover:text-primary"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-4 mt-6 relative z-10">
        <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl border border-amber-100">
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase">Gold 24K (10g)</p>
            <p className="text-lg font-bold text-amber-900">₹{rates?.gold24k?.toLocaleString() || '---'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-amber-600 uppercase">Gold 22K</p>
            <p className="text-sm font-bold text-amber-800">₹{rates?.gold22k?.toLocaleString() || '---'}</p>
          </div>
        </div>

        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Silver (1kg)</p>
            <p className="text-lg font-bold text-slate-900">₹{rates?.silver?.toLocaleString() || '---'}</p>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold",
            rates?.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'
          )}>
            {rates?.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {rates?.change}%
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 text-[10px] font-bold text-primary/60 bg-primary/5 px-2 py-1 rounded">
          <Sparkles size={12} />
          AI POWERED
        </div>
        {lastUpdated && (
          <p className="text-[10px] text-gray-400 font-medium">
            Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
