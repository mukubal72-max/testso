import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Gem, 
  HandCoins, 
  Calculator, 
  CreditCard, 
  FileText, 
  PackageCheck, 
  BarChart3, 
  Bell, 
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: Gem, label: 'Girvi Items', path: '/items' },
  { icon: HandCoins, label: 'Loans', path: '/loans' },
  { icon: Calculator, label: 'Interest Engine', path: '/interest' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: FileText, label: 'Legal Docs', path: '/docs' },
  { icon: PackageCheck, label: 'Locker Mgmt', path: '/locker' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: Bell, label: 'Alerts', path: '/alerts' },
  { icon: Sparkles, label: 'AI Insights', path: '/ai-insights' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-sidebar text-white rounded-md shadow-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: isOpen ? 260 : 80,
          x: (typeof window !== 'undefined' && window.innerWidth < 1024 && !isOpen) ? -80 : 0
        }}
        className={cn(
          "h-screen bg-sidebar text-white flex flex-col z-40 transition-all duration-300",
          "lg:sticky lg:top-0",
          "fixed inset-y-0 left-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
            <Gem className="text-primary" size={24} />
          </div>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="font-bold text-lg leading-tight">GIRVI PRO</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest">Digital Communique</p>
            </motion.div>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group relative",
                      isActive 
                        ? "bg-secondary text-primary font-semibold" 
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon size={20} className={cn("flex-shrink-0", isActive ? "text-primary" : "text-white/70 group-hover:text-white")} />
                    {isOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10">
          {isOpen && (
            <div className="mb-4 px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Cloud Sync Active</span>
            </div>
          )}
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          >
            <LogOut size={20} />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
