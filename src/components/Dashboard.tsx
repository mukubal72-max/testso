import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Gem, 
  HandCoins, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const data = [
  { name: 'Mon', loans: 4000, collection: 2400 },
  { name: 'Tue', loans: 3000, collection: 1398 },
  { name: 'Wed', loans: 2000, collection: 9800 },
  { name: 'Thu', loans: 2780, collection: 3908 },
  { name: 'Fri', loans: 1890, collection: 4800 },
  { name: 'Sat', loans: 2390, collection: 3800 },
  { name: 'Sun', loans: 3490, collection: 4300 },
];

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="card p-6 flex flex-col gap-4"
  >
    <div className="flex justify-between items-start">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="text-white" size={24} />
      </div>
      {trend && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", trend > 0 ? "text-emerald-500" : "text-rose-500")}>
          {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-text-dark mt-1">{value}</h3>
    </div>
  </motion.div>
);

import { useNavigate } from 'react-router-dom';
import MarketRates from './MarketRates';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch Active Loans
        const { data: activeLoansData, count: activeCount, error: activeError } = await supabase
          .from('loans')
          .select('loan_amount', { count: 'exact' })
          .eq('status', 'active');
        if (activeError) throw activeError;

        // Fetch Released Items
        const { count: releasedCount, error: releasedError } = await supabase
          .from('items')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'released');
        if (releasedError) throw releasedError;

        // Fetch Overdue Loans
        const { count: overdueCount, error: overdueError } = await supabase
          .from('loans')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .lt('maturity_date', today);
        if (overdueError) throw overdueError;

        // Fetch Upcoming Maturity
        const { data: upcomingMaturity, error: upcomingError } = await supabase
          .from('loans')
          .select('*, customers(full_name)')
          .eq('status', 'active')
          .gte('maturity_date', today)
          .order('maturity_date', { ascending: true })
          .limit(5);
        if (upcomingError) throw upcomingError;

        const totalActiveAmount = activeLoansData?.reduce((sum, l) => sum + Number(l.loan_amount), 0) || 0;

        setStats({
          activeLoans: activeCount || 0,
          totalActiveAmount,
          releasedItems: releasedCount || 0,
          overdueLoans: overdueCount || 0,
          upcomingMaturity: upcomingMaturity?.map(l => ({ ...l, customer_name: l.customers?.full_name, amount: l.loan_amount })) || []
        });
      } catch (err: any) {
        console.error(err);
        setError(err.message);
        setStats({
          activeLoans: 0,
          totalActiveAmount: 0,
          releasedItems: 0,
          overdueLoans: 0,
          upcomingMaturity: []
        });
      }
    }

    fetchStats();
  }, []);

  if (!stats && !error) return <div className="p-8 flex items-center justify-center min-h-[400px] text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, Super Admin</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none btn-secondary flex items-center justify-center gap-2">
            <Clock size={18} />
            History
          </button>
          <button 
            onClick={() => navigate('/loans')}
            className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-2"
          >
            <HandCoins size={18} />
            New Loan
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard 
            title="Active Girvi Loans" 
            value={stats.activeLoans} 
            icon={HandCoins} 
            trend={12} 
            color="bg-primary" 
          />
          <StatCard 
            title="Total Pledged Value" 
            value={`₹${(stats.totalActiveAmount ?? 0).toLocaleString()}`} 
            icon={Gem} 
            trend={8} 
            color="bg-secondary" 
          />
          <StatCard 
            title="Released Items" 
            value={stats.releasedItems} 
            icon={CheckCircle2} 
            trend={-2} 
            color="bg-emerald-500" 
          />
          <StatCard 
            title="Overdue Loans" 
            value={stats.overdueLoans} 
            icon={AlertCircle} 
            trend={5} 
            color="bg-rose-500" 
          />
        </div>
        <div className="lg:col-span-1">
          <MarketRates />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">Loan & Collection Trends</h3>
            <select className="text-sm border-none bg-gray-50 rounded-lg px-3 py-1 focus:ring-0">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2C5AA0" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2C5AA0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="loans" stroke="#2C5AA0" strokeWidth={2} fillOpacity={1} fill="url(#colorLoans)" />
                <Area type="monotone" dataKey="collection" stroke="#E6C200" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-6">Upcoming Maturity</h3>
          <div className="space-y-6">
            {stats && stats.upcomingMaturity && stats.upcomingMaturity.length > 0 ? (
              stats.upcomingMaturity.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-primary font-bold">
                    {item.customer_name?.charAt(0) || 'C'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{item.customer_name}</p>
                    <p className="text-xs text-gray-500">Loan #{item.loan_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-500">{new Date(item.maturity_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    <p className="text-xs text-gray-500">₹{(item.amount ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-400 text-sm italic">
                No upcoming maturities found.
              </div>
            )}
          </div>
          <button className="w-full mt-8 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-all">
            View All Alerts
          </button>
        </div>
      </div>
    </div>
  );
}
