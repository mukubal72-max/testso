import React from 'react';
import { 
  Calculator, 
  Search, 
  History, 
  ArrowRight, 
  Calendar, 
  HandCoins,
  TrendingUp,
  AlertTriangle,
  Download,
  Clock,
  User,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays, addMonths } from 'date-fns';
import { exportToPDF } from '../lib/exportUtils';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

import { supabase } from '../lib/supabase';

export default function InterestEngine() {
  const [loanId, setLoanId] = React.useState('');
  const [loanData, setLoanData] = React.useState<any>(null);
  const [calculation, setCalculation] = React.useState<any>(null);
  const [numInstallments, setNumInstallments] = React.useState(12);
  const [schedule, setSchedule] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [inflationRate, setInflationRate] = React.useState(0);
  const [customRate, setCustomRate] = React.useState<number | null>(null);
  const [graphData, setGraphData] = React.useState<any[]>([]);
  const [isSimulation, setIsSimulation] = React.useState(false);
  const [simData, setSimData] = React.useState({
    amount: 10000,
    interest_rate: 2.0,
    penalty_rate: 1.0,
    start_date: new Date().toISOString().split('T')[0],
    maturity_date: format(addMonths(new Date(), 12), 'yyyy-MM-dd')
  });
  const [settings, setSettings] = React.useState<any>(null);

  React.useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      if (data) {
        const settingsObj = data.reduce((acc: any, curr: any) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});
        setSettings(settingsObj);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const calculateInterest = () => {
    if (!loanData) return;

    const today = new Date();
    const startDate = new Date(loanData.start_date);
    const maturityDate = new Date(loanData.maturity_date);
    const rate = customRate !== null ? customRate : loanData.interest_rate;

    // Combine payments and top-ups into a timeline of principal changes
    const transactions = [
      ...(loanData.payments || [])
        .filter((p: any) => p.type === 'principal' || p.type === 'full_settlement')
        .map((p: any) => ({ date: new Date(p.date), amount: -p.amount })),
      ...(loanData.top_ups || [])
        .map((t: any) => ({ date: new Date(t.date), amount: t.amount }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate initial principal
    let initialPrincipal = loanData.amount;
    (loanData.top_ups || []).forEach((t: any) => initialPrincipal -= t.amount);
    (loanData.payments || []).forEach((p: any) => {
      if (p.type === 'principal' || p.type === 'full_settlement') initialPrincipal += p.amount;
    });

    let lastDate = startDate;
    let runningPrincipal = initialPrincipal;
    let accruedInterest = 0;

    transactions.forEach(tx => {
      const days = differenceInDays(tx.date, lastDate);
      if (days > 0) {
        accruedInterest += (runningPrincipal * (rate / 100) * days) / 30;
      }
      runningPrincipal += tx.amount;
      lastDate = tx.date;
    });

    const finalDays = differenceInDays(today, lastDate);
    if (finalDays > 0) {
      accruedInterest += (runningPrincipal * (rate / 100) * finalDays) / 30;
    }

    let penalty = 0;
    if (today > maturityDate) {
      const overdueDays = differenceInDays(today, maturityDate);
      penalty = (runningPrincipal * (loanData.penalty_rate / 100) * overdueDays) / 30;
    }

    // Apply inflation adjustment to total
    const subtotal = runningPrincipal + accruedInterest + penalty;
    const inflationAdjustment = subtotal * (inflationRate / 100);
    const total = Math.round(subtotal + inflationAdjustment);

    setCalculation({
      days: differenceInDays(today, startDate),
      interest: Math.round(accruedInterest),
      penalty: Math.round(penalty),
      inflation: Math.round(inflationAdjustment),
      total,
      currentPrincipal: runningPrincipal,
      rate
    });

    generateSchedule(total);
    generateGraphData(runningPrincipal, rate, inflationRate);
  };

  const generateGraphData = (principal: number, rate: number, inflation: number) => {
    const data = [];
    let currentTotal = principal;
    const monthlyRate = rate / 100;
    const monthlyInflation = inflation / 100 / 12;

    for (let i = 0; i <= 12; i++) {
      const interest = principal * monthlyRate * i;
      const inflationAdj = (principal + interest) * (monthlyInflation * i);
      data.push({
        month: i === 0 ? 'Start' : `M${i}`,
        total: Math.round(principal + interest + inflationAdj),
        interest: Math.round(interest),
        principal: Math.round(principal)
      });
    }
    setGraphData(data);
  };

  const generateSchedule = (totalAmount: number) => {
    const perInstallment = totalAmount / numInstallments;
    const newSchedule = [];
    const today = new Date();

    for (let i = 1; i <= numInstallments; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(today.getMonth() + i);
      newSchedule.push({
        installment: i,
        dueDate,
        amount: Math.round(perInstallment)
      });
    }
    setSchedule(newSchedule);
  };

  const downloadSchedulePDF = () => {
    if (!loanData || schedule.length === 0) return;
    
    const headers = ['Installment', 'Due Date', 'Amount', 'Status'];
    const data = schedule.map(item => [
      `#${item.installment.toString().padStart(2, '0')}`,
      format(item.dueDate, 'dd MMM yyyy'),
      `₹${item.amount.toLocaleString()}`,
      'Scheduled'
    ]);
    
    exportToPDF(
      `Payment Schedule - Loan ${loanData.loan_number}`,
      headers,
      data,
      `Schedule_Loan_${loanData.loan_number}`,
      settings
    );
  };

  const fetchLoan = async () => {
    if (!loanId) return;
    setLoading(true);
    try {
      const { data: loan, error: lError } = await supabase
        .from('loans')
        .select('*, customers(full_name)')
        .or(`id.eq.${isNaN(Number(loanId)) ? -1 : loanId},loan_number.eq.${loanId}`)
        .single();

      if (lError) throw new Error('Loan not found');

      const { data: payments, error: pError } = await supabase
        .from('payments')
        .select('*')
        .eq('loan_id', loan.id);
      
      if (pError) throw pError;

      const { data: topUps, error: tError } = await supabase
        .from('top_ups')
        .select('*')
        .eq('loan_id', loan.id);
      
      if (tError) throw tError;

      setLoanData({
        ...loan,
        customer_name: loan.customers?.full_name,
        amount: loan.loan_amount,
        payments: payments?.map(p => ({ ...p, date: p.payment_date, type: p.payment_type })) || [],
        top_ups: topUps?.map(t => ({ ...t, date: t.top_up_date })) || []
      });
      setCalculation(null);
      setSchedule([]);
    } catch (err: any) {
      alert(err.message);
      setLoanData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-dark tracking-tight">Interest Engine</h1>
          <p className="text-gray-500 mt-1">Automated interest, penalty, and installment planning</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
          <TrendingUp size={16} className="text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Live Engine Active</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Lookup & Info */}
        <div className="lg:col-span-4 space-y-6">
          <section className="card p-6 space-y-4 shadow-sm border-t-4 border-primary">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Search size={20} className="text-primary" />
                {isSimulation ? 'Simulation Mode' : 'Lookup Loan'}
              </h3>
              <button 
                onClick={() => {
                  setIsSimulation(!isSimulation);
                  if (!isSimulation) setLoanData(null);
                }}
                className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
              >
                {isSimulation ? 'Switch to Lookup' : 'Switch to Simulation'}
              </button>
            </div>
            
            {!isSimulation ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Loan ID or Number</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. 1" 
                    value={loanId}
                    onChange={(e) => setLoanId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLoan()}
                  />
                  <button 
                    onClick={fetchLoan}
                    disabled={loading}
                    className="btn-primary px-6 disabled:opacity-50"
                  >
                    {loading ? '...' : 'Fetch'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Principal Amount (₹)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="10000" 
                    value={simData.amount}
                    onChange={(e) => setSimData({...simData, amount: Number(e.target.value)})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rate (%/mo)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="2.0" 
                      value={simData.interest_rate}
                      onChange={(e) => setSimData({...simData, interest_rate: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Penalty (%/mo)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="1.0" 
                      value={simData.penalty_rate}
                      onChange={(e) => setSimData({...simData, penalty_rate: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start Date</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={simData.start_date}
                      onChange={(e) => setSimData({...simData, start_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Maturity Date</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={simData.maturity_date}
                      onChange={(e) => setSimData({...simData, maturity_date: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setLoanData({
                      ...simData,
                      customer_name: 'Simulation User',
                      loan_number: 'SIM-001',
                      payments: [],
                      top_ups: []
                    });
                    setCalculation(null);
                  }}
                  className="w-full btn-primary py-2"
                >
                  Set Simulation Data
                </button>
              </div>
            )}
          </section>

          <AnimatePresence mode="wait">
            {loanData && (
              <motion.section 
                key="loan-details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="card p-6 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Loan Details</h3>
                  <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">Active</span>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Customer</span>
                      <span className="font-bold">{loanData.customer_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Principal</span>
                      <span className="font-bold">₹{(loanData.amount ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rate</span>
                      <span className="font-bold text-primary">{loanData.interest_rate}% / month</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border border-gray-100 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Start Date</p>
                      <p className="text-sm font-bold mt-1">
                        {loanData.start_date ? format(new Date(loanData.start_date), 'dd MMM yyyy') : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 border border-gray-100 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Maturity</p>
                      <p className="text-sm font-bold mt-1 text-rose-500">
                        {loanData.maturity_date ? format(new Date(loanData.maturity_date), 'dd MMM yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Adjust Interest Rate (%)</label>
                      <span className="text-xs font-bold text-primary">{customRate !== null ? customRate : loanData.interest_rate}%</span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full accent-primary" 
                      value={customRate !== null ? customRate : loanData.interest_rate}
                      onChange={(e) => setCustomRate(Number(e.target.value))}
                      min="0"
                      max="10"
                      step="0.1"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inflation Adjustment (%)</label>
                      <span className="text-xs font-bold text-amber-600">{inflationRate}%</span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full accent-amber-500" 
                      value={inflationRate}
                      onChange={(e) => setInflationRate(Number(e.target.value))}
                      min="0"
                      max="20"
                      step="0.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Installment Plan</label>
                      <span className="text-xs font-bold text-primary">{numInstallments} Months</span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full accent-primary" 
                      value={numInstallments}
                      onChange={(e) => setNumInstallments(Number(e.target.value))}
                      min="1"
                      max="60"
                    />
                  </div>

                  <button 
                    onClick={calculateInterest}
                    className="w-full btn-secondary py-3 flex items-center justify-center gap-2 group"
                  >
                    <Calculator size={18} className="group-hover:rotate-12 transition-transform" />
                    Calculate & Plan
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Results & Schedule */}
        <div className="lg:col-span-8 space-y-8">
          {!calculation ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl p-12 bg-gray-50/30">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm mb-6">
                <Calculator size={40} className="opacity-20" />
              </div>
              <h4 className="text-lg font-bold text-gray-500">No Calculation Active</h4>
              <p className="text-sm text-center max-w-xs mt-2">Select a loan from the lookup panel and click calculate to generate interest breakdown and installment plans.</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-4 bg-primary text-white relative overflow-hidden">
                  <TrendingUp size={60} className="absolute -right-2 -bottom-2 opacity-10" />
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Interest</p>
                  <h4 className="text-2xl font-bold mt-1">₹{(calculation.interest ?? 0).toLocaleString()}</h4>
                </div>
                <div className={`card p-4 text-white relative overflow-hidden ${calculation.penalty > 0 ? 'bg-rose-500' : 'bg-gray-800'}`}>
                  <AlertTriangle size={60} className="absolute -right-2 -bottom-2 opacity-10" />
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Penalty</p>
                  <h4 className="text-2xl font-bold mt-1">₹{(calculation.penalty ?? 0).toLocaleString()}</h4>
                </div>
                <div className="card p-4 bg-amber-500 text-white relative overflow-hidden">
                  <TrendingUp size={60} className="absolute -right-2 -bottom-2 opacity-10" />
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Inflation</p>
                  <h4 className="text-2xl font-bold mt-1">₹{(calculation.inflation ?? 0).toLocaleString()}</h4>
                </div>
                <div className="card p-4 bg-secondary text-primary relative overflow-hidden border border-primary/10">
                  <HandCoins size={60} className="absolute -right-2 -bottom-2 opacity-10" />
                  <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Total</p>
                  <h4 className="text-2xl font-bold mt-1">₹{(calculation.total ?? 0).toLocaleString()}</h4>
                </div>
              </div>

              {/* Graph Visualization */}
              <section className="card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <TrendingUp size={20} className="text-primary" />
                    Projected Growth (12 Months)
                  </h3>
                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span>Total Payable</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span>Principal</span>
                    </div>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={graphData}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                        tickFormatter={(value) => `₹${(value / 1000)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                      <Area type="monotone" dataKey="principal" stroke="#10b981" strokeWidth={2} fillOpacity={0} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Detailed Breakdown & Plan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="card p-8 space-y-6">
                  <h3 className="font-bold text-xl flex items-center gap-2">
                    <History size={22} className="text-primary" />
                    Calculation Breakdown
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                          <TrendingUp size={14} className="text-gray-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Current Principal</span>
                      </div>
                      <span className="font-bold">₹{calculation.currentPrincipal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <TrendingUp size={14} className="text-primary" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Interest ({calculation.days} days)</span>
                      </div>
                      <span className="font-bold">₹{calculation.interest.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                          <AlertTriangle size={14} className="text-rose-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Penalty Charges</span>
                      </div>
                      <span className="font-bold text-rose-500">₹{calculation.penalty.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4">
                      <span className="text-lg font-bold text-text-dark">Grand Total</span>
                      <span className="text-2xl font-bold text-primary">₹{calculation.total.toLocaleString()}</span>
                    </div>
                  </div>
                </section>

                <section className="card p-8 space-y-6 bg-emerald-50/30 border border-emerald-100">
                  <h3 className="font-bold text-xl flex items-center gap-2">
                    <HandCoins size={22} className="text-emerald-500" />
                    Installment Planner
                  </h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-2xl shadow-sm border border-emerald-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</p>
                        <p className="text-xl font-bold text-emerald-600 mt-1">{numInstallments} Mo</p>
                      </div>
                      <div className="p-4 bg-white rounded-2xl shadow-sm border border-emerald-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Monthly EMI</p>
                        <p className="text-xl font-bold text-emerald-600 mt-1">₹{Math.round(calculation.total / numInstallments).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                      <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                        This simulation calculates equal monthly installments based on the current total outstanding. Interest is frozen at the time of calculation for this plan.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button className="flex-1 btn-primary py-3 text-sm">Apply Plan</button>
                      <button className="px-4 py-3 border border-emerald-200 text-emerald-600 rounded-xl hover:bg-emerald-50 transition-colors">
                        <History size={18} />
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              {/* Schedule Table */}
              {schedule.length > 0 && (
                <section className="card overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Calendar size={20} className="text-primary" />
                      Projected Payment Schedule
                    </h3>
                    <button 
                      onClick={downloadSchedulePDF}
                      className="text-xs font-bold text-primary uppercase tracking-widest hover:underline"
                    >
                      Download PDF
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                        <tr>
                          <th className="px-8 py-4">Installment</th>
                          <th className="px-8 py-4">Due Date</th>
                          <th className="px-8 py-4">Amount</th>
                          <th className="px-8 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {schedule.map((item) => (
                          <tr key={item.installment} className="text-sm hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-5 font-bold text-gray-400">#{item.installment.toString().padStart(2, '0')}</td>
                            <td className="px-8 py-5 font-medium text-gray-600">{format(item.dueDate, 'dd MMM yyyy')}</td>
                            <td className="px-8 py-5 font-bold text-text-dark">₹{item.amount.toLocaleString()}</td>
                            <td className="px-8 py-5">
                              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-400 text-[10px] font-bold uppercase tracking-wider">Scheduled</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
