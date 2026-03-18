import React from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, User, ShieldCheck, ChevronRight } from 'lucide-react';

interface LoginPageProps {
  onLogin: (id: string, pass: string) => Promise<boolean>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [id, setId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const success = await onLogin(id, password);
      if (!success) {
        setError('Invalid Email or Password');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ 
        backgroundImage: 'url("https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&q=80&w=2070")',
        backgroundColor: '#1a1a1a'
      }}
    >
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-[480px] bg-white/80 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/30 overflow-hidden p-8 md:p-12"
      >
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] via-[#FFD700] to-[#B8860B] rounded-full flex items-center justify-center shadow-lg border-4 border-white/50">
                <span className="text-4xl font-black text-white drop-shadow-md">₹</span>
              </div>
              <div className="absolute -right-8 top-1/2 -translate-y-1/2">
                <span className="text-5xl font-bold text-[#8B6B23] tracking-tighter">DC</span>
              </div>
            </div>
          </div>
          <h1 className="text-xl font-bold text-[#8B6B23] mt-6">Gold & Silver Loan Management</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mt-2">Admin & Customer Login</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50/80 text-red-600 p-3 rounded-xl text-sm text-center border border-red-100 font-medium"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center border-r border-gray-200 text-gray-400 group-focus-within:text-[#B8860B] transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full pl-16 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all text-gray-700 placeholder:text-gray-400"
                placeholder="Email Address"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center border-r border-gray-200 text-gray-400 group-focus-within:text-[#B8860B] transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-16 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none transition-all text-gray-700 placeholder:text-gray-400"
                placeholder="Password"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="peer hidden" 
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                <div className="w-5 h-5 border-2 border-[#D4AF37] rounded flex items-center justify-center peer-checked:bg-[#D4AF37] transition-all">
                  <div className="w-2 h-2 bg-white rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-600 group-hover:text-[#8B6B23] transition-colors">Remember Me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B] hover:from-[#8B6B23] hover:to-[#8B6B23] text-white font-bold text-lg rounded-xl shadow-xl shadow-yellow-900/20 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            {loading ? 'Processing...' : 'Login'}
          </button>

          <div className="flex items-center justify-between pt-4">
            <button type="button" className="text-sm font-semibold text-gray-500 hover:text-[#8B6B23] transition-colors">
              Forgot Password?
            </button>
            <button type="button" className="text-sm font-semibold text-gray-500 hover:text-[#8B6B23] transition-colors">
              Switch Account
            </button>
          </div>
        </form>

        <div className="mt-12 pt-8 border-t border-gray-200/50 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
            <span>Software Developed by</span>
            <div className="flex items-center gap-1 text-[#2C5AA0]">
              <div className="w-5 h-5 bg-[#2C5AA0] rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">C</span>
              </div>
              <span className="font-bold">Digital Communique</span>
              <span className="text-gray-400">Private Limited</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
