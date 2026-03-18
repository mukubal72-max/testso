import React from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  AlertCircle, 
  PieChart as PieChartIcon,
  Search,
  Database,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";

import { format } from 'date-fns';

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

import { supabase } from '../lib/supabase';

export default function AIInsights() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'ai',
      content: "Hello! I'm your Girvi Business Intelligence Assistant. I can help you analyze your loan portfolio, calculate risks, and provide insights into your business performance. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState<any>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: loans, error } = await supabase
          .from('loans')
          .select('loan_amount, status, maturity_date');
        
        if (error) throw error;

        const activeLoans = loans.filter(l => l.status === 'active');
        const overdueLoans = activeLoans.filter(l => new Date(l.maturity_date) < new Date());
        const totalActiveAmount = activeLoans.reduce((sum, l) => sum + l.loan_amount, 0);

        setStats({
          activeLoans: activeLoans.length,
          totalActiveAmount,
          overdueLoans: overdueLoans.length,
          releasedItems: loans.filter(l => l.status === 'closed').length
        });
      } catch (err) {
        console.error('Error fetching stats for AI:', err);
      }
    };

    fetchStats();
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `
            You are a Business Intelligence Assistant for a Girvi (Pledge Loan) Management Software.
            Your goal is to help the business owner (Super Admin) understand their data and make better decisions.
            
            Context about the business:
            - Active Loans: ${stats?.activeLoans || 'Loading...'}
            - Total Pledged Value: ₹${(stats?.totalActiveAmount || 0).toLocaleString()}
            - Overdue Loans: ${stats?.overdueLoans || 0}
            - Released Items: ${stats?.releasedItems || 0}
            
            Database Schema:
            - customers: id, name, mobile, address, status, created_at
            - loans: id, customer_id, loan_number, amount, interest_rate, start_date, maturity_date, status
            - items: id, loan_id, type, purity, gross_weight, net_weight, valuation, status
            - payments: id, loan_id, date, amount, type (principal, interest, penalty)
            
            Guidelines:
            1. Be professional, analytical, and helpful.
            2. If asked for specific data you don't have, explain that you can analyze the general trends based on the provided stats.
            3. Provide actionable insights (e.g., "You have 5 overdue loans, consider sending reminders").
            4. Use Markdown for formatting.
            5. If the user asks for a specific calculation, perform it accurately.
          `,
        },
        contents: messages.concat(userMessage).map(m => ({
          role: m.role === 'ai' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      });

      const result = await model;
      const responseText = result.text || "I'm sorry, I couldn't process that request.";

      setMessages(prev => [...prev, {
        role: 'ai',
        content: responseText,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: "I encountered an error while processing your request. Please try again later.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Summarize my business health",
    "Analyze overdue loan risks",
    "How is my interest collection?",
    "Suggest ways to grow my portfolio"
  ];

  return (
    <div className="p-8 h-[calc(100vh-2rem)] flex flex-col max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-text-dark flex items-center gap-3">
            <Sparkles className="text-primary" />
            AI Business Insights
          </h1>
          <p className="text-gray-500 mt-1">Intelligent analysis of your Girvi portfolio</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
          <Bot size={16} className="text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Gemini 3 Flash Powered</span>
        </div>
      </header>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col card overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
          >
            {messages.map((msg, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i}
                className={cn(
                  "flex gap-4 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  msg.role === 'ai' ? "bg-primary text-white" : "bg-secondary text-primary"
                )}>
                  {msg.role === 'ai' ? <Bot size={20} /> : <User size={20} />}
                </div>
                <div className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'ai' 
                    ? "bg-gray-50 text-gray-800 border border-gray-100" 
                    : "bg-primary text-white shadow-lg shadow-primary/10"
                )}>
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                    {msg.content.split('\n').map((line, j) => (
                      <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>
                    ))}
                  </div>
                  <p className={cn(
                    "text-[10px] mt-2 font-medium",
                    msg.role === 'ai' ? "text-gray-400" : "text-white/60"
                  )}>
                    {format(msg.timestamp, 'HH:mm')}
                  </p>
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                  <Bot size={20} />
                </div>
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span className="text-sm text-gray-500 font-medium italic">Analyzing business data...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0">
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="whitespace-nowrap px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:border-primary hover:text-primary transition-all shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about your business performance, risks, or trends..."
                className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="w-80 space-y-6 shrink-0">
          <section className="card p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <TrendingUp size={14} />
              Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Active Portfolio</p>
                <p className="text-xl font-bold text-text-dark mt-1">₹{(stats?.totalActiveAmount || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Risk Exposure</p>
                <p className="text-xl font-bold text-text-dark mt-1">{stats?.overdueLoans || 0} Overdue</p>
              </div>
            </div>
          </section>

          <section className="card p-6 space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <AlertCircle size={14} />
              AI Capabilities
            </h3>
            <ul className="space-y-3">
              {[
                { icon: Search, text: "Portfolio Analysis" },
                { icon: PieChartIcon, text: "Risk Assessment" },
                { icon: Database, text: "Trend Prediction" },
                { icon: Sparkles, text: "Growth Suggestions" }
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-xs font-medium text-gray-600">
                  <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                    <item.icon size={12} />
                  </div>
                  {item.text}
                </li>
              ))}
            </ul>
          </section>

          <div className="p-6 bg-secondary/10 rounded-3xl border border-secondary/20">
            <p className="text-xs text-primary font-bold leading-relaxed">
              Tip: Ask "Which customers have the highest outstanding balance?" to identify your top accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
