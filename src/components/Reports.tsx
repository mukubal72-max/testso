import React from 'react';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Share2, 
  Filter,
  ArrowRight,
  PieChart as PieChartIcon,
  TrendingUp,
  AlertCircle,
  Users,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';

const COLORS = ['#2C5AA0', '#E6C200', '#10b981', '#f43f5e'];

import { supabase } from '../lib/supabase';

export default function Reports() {
  const [loans, setLoans] = React.useState<any[]>([]);
  const [payments, setPayments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const { data: loansData } = await supabase
          .from('loans')
          .select('*, customers(full_name), items(*)');
        
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*, loans(loan_number, customers(full_name))');

        setLoans(loansData?.map(l => ({ 
          ...l, 
          customer_name: l.customers?.full_name,
          amount: l.loan_amount 
        })) || []);
        
        setPayments(paymentsData?.map(p => ({ 
          ...p, 
          loan_number: p.loans?.loan_number, 
          customer_name: p.loans?.customers?.full_name,
          date: p.payment_date
        })) || []);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const generateActiveLoansReport = () => {
    const headers = ['Loan #', 'Customer', 'Amount', 'Interest', 'Maturity'];
    const data = loans
      .filter(l => l.status === 'active')
      .map(l => [
        l.loan_number,
        l.customer_name,
        `₹${l.amount.toLocaleString()}`,
        `${l.interest_rate}%`,
        format(new Date(l.maturity_date), 'dd MMM yyyy')
      ]);
    
    exportToPDF('Active Loans Report', headers, data, 'Active_Loans_Report');
  };

  const generateInterestCollectionReport = () => {
    const headers = ['Date', 'Loan #', 'Customer', 'Interest Paid'];
    const data = payments
      .filter(p => p.type === 'interest')
      .map(p => [
        format(new Date(p.date), 'dd MMM yyyy'),
        p.loan_number || 'N/A',
        p.customer_name || 'N/A',
        `₹${p.amount.toLocaleString()}`
      ]);
    
    exportToPDF('Interest Collection Report', headers, data, 'Interest_Collection_Report');
  };

  const exportAllToExcel = () => {
    const combinedData = loans.map(l => ({
      'Loan Number': l.loan_number,
      'Customer': l.customer_name,
      'Principal': l.amount,
      'Interest Rate': l.interest_rate,
      'Start Date': l.start_date,
      'Maturity Date': l.maturity_date,
      'Status': l.status
    }));
    exportToExcel(combinedData, 'Full_Loan_Database');
  };

  const [isPaymentReportOpen, setIsPaymentReportOpen] = React.useState(false);
  const [reportFilters, setReportFilters] = React.useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    mode: 'all'
  });

  const dateFilteredPayments = payments.filter(p => {
    const pDate = p.date?.substring(0, 10);
    const start = reportFilters.startDate;
    const end = reportFilters.endDate;
    return pDate && pDate >= start && pDate <= end;
  });

  const dateFilteredLoans = loans.filter(l => {
    const lDate = l.created_at?.substring(0, 10);
    const start = reportFilters.startDate;
    const end = reportFilters.endDate;
    return lDate && lDate >= start && lDate <= end;
  });

  const filteredPayments = dateFilteredPayments.filter(p => {
    const modeMatch = reportFilters.mode === 'all' || p.mode?.toLowerCase() === reportFilters.mode.toLowerCase();
    return modeMatch;
  });

  const assetData = [
    { name: 'Gold', value: loans.filter(l => l.items?.some((i: any) => i.type.toLowerCase().includes('gold'))).length || 400 },
    { name: 'Silver', value: loans.filter(l => l.items?.some((i: any) => i.type.toLowerCase().includes('silver'))).length || 300 },
    { name: 'Diamond', value: 100 },
    { name: 'Other', value: 50 },
  ];

  const totalInterest = dateFilteredPayments
    .filter(p => p.type === 'interest')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalDisbursed = dateFilteredLoans.reduce((sum, l) => sum + l.amount, 0);
  
  const principalRecovered = dateFilteredPayments
    .filter(p => p.type === 'principal' || p.type === 'full_settlement')
    .reduce((sum, p) => sum + p.amount, 0);

  const generateReleasedItemsReport = async () => {
    try {
      const { data: releasedLoans, error } = await supabase
        .from('loans')
        .select('*, customers(full_name)')
        .eq('status', 'closed');
      
      if (error) throw error;
      
      const headers = ['Loan #', 'Customer', 'Amount', 'Closed Date'];
      const data = (releasedLoans || []).map((l: any) => [
        l.loan_number,
        l.customers?.full_name,
        `₹${Number(l.loan_amount).toLocaleString()}`,
        format(new Date(l.updated_at), 'dd MMM yyyy')
      ]);
      
      exportToPDF('Released Items Report', headers, data, 'Released_Items_Report');
    } catch (err) {
      console.error(err);
      alert('Failed to generate released items report');
    }
  };

  const generateDayBookReport = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data: paymentsToday, error: pError } = await supabase
        .from('payments')
        .select('*, loans(loan_number)')
        .gte('payment_date', today);
      
      if (pError) throw pError;

      const { data: loansToday, error: lError } = await supabase
        .from('loans')
        .select('*')
        .gte('created_at', today);
      
      if (lError) throw lError;

      const transactions = [
        ...(paymentsToday || []).map(p => ({
          time: p.created_at,
          type: `Payment (${p.payment_type})`,
          ref: p.loans?.loan_number,
          amount: p.amount
        })),
        ...(loansToday || []).map(l => ({
          time: l.created_at,
          type: 'Disbursement',
          ref: l.loan_number,
          amount: -l.loan_amount
        }))
      ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      
      const headers = ['Time', 'Type', 'Reference', 'Amount'];
      const data = transactions.map((t: any) => [
        format(new Date(t.time), 'HH:mm'),
        t.type,
        t.ref,
        `₹${t.amount.toLocaleString()}`
      ]);
      
      exportToPDF(`Day Book Report - ${format(new Date(), 'dd MMM yyyy')}`, headers, data, 'Day_Book_Report');
    } catch (err) {
      console.error(err);
      alert('Failed to generate day book report');
    }
  };

  const generateFilteredPaymentReport = () => {
    const headers = ['Date', 'Loan #', 'Customer', 'Mode', 'Type', 'Amount'];
    const data = filteredPayments.map(p => [
      format(new Date(p.date), 'dd MMM yyyy'),
      p.loan_number || 'N/A',
      p.customer_name || 'N/A',
      p.mode,
      p.type,
      `₹${p.amount.toLocaleString()}`
    ]);
    
    exportToPDF(`Payment Report (${reportFilters.startDate} to ${reportFilters.endDate})`, headers, data, 'Payment_Report');
  };

  const generateProfitLossReport = async () => {
    try {
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select('*')
        .gte('payment_date', reportFilters.startDate)
        .lte('payment_date', reportFilters.endDate);
      
      if (error) throw error;

      const interest = paymentsData?.filter(p => p.payment_type === 'interest').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const penalty = paymentsData?.filter(p => p.payment_type === 'penalty').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      const headers = ['Category', 'Amount'];
      const data = [
        ['Interest Income', `₹${interest.toLocaleString()}`],
        ['Penalty Income', `₹${penalty.toLocaleString()}`],
        ['Total Income', `₹${(interest + penalty).toLocaleString()}`],
        ['Total Expenses', `₹0`],
        ['Net Profit', `₹${(interest + penalty).toLocaleString()}`]
      ];
      
      exportToPDF(`Profit & Loss Statement (${reportFilters.startDate} to ${reportFilters.endDate})`, headers, data, 'Profit_Loss_Report');
    } catch (err) {
      console.error(err);
      alert('Failed to generate P&L report');
    }
  };

  const generateCashBookReport = async () => {
    try {
      const { data: paymentsData, error: pError } = await supabase
        .from('payments')
        .select('*, loans(loan_number, customers(full_name))')
        .eq('mode', 'Cash')
        .gte('payment_date', reportFilters.startDate)
        .lte('payment_date', reportFilters.endDate);
      
      if (pError) throw pError;

      const { data: loansData, error: lError } = await supabase
        .from('loans')
        .select('*, customers(full_name)')
        .eq('disbursement_mode', 'Cash')
        .gte('created_at', reportFilters.startDate)
        .lte('created_at', reportFilters.endDate);
      
      if (lError) throw lError;

      const transactions = [
        ...(paymentsData || []).map(p => ({
          date: p.payment_date,
          type: p.payment_type,
          customer_name: p.loans?.customers?.full_name,
          direction: 'IN',
          amount: p.amount
        })),
        ...(loansData || []).map(l => ({
          date: l.created_at,
          type: 'Disbursement',
          customer_name: l.customers?.full_name,
          direction: 'OUT',
          amount: l.loan_amount
        }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const headers = ['Date', 'Type', 'Customer', 'Direction', 'Amount'];
      const data = transactions.map((t: any) => [
        format(new Date(t.date), 'dd MMM yyyy'),
        t.type,
        t.customer_name,
        t.direction,
        `₹${t.amount.toLocaleString()}`
      ]);
      
      exportToPDF(`Cash Book (${reportFilters.startDate} to ${reportFilters.endDate})`, headers, data, 'Cash_Book_Report');
    } catch (err) {
      console.error(err);
      alert('Failed to generate cash book report');
    }
  };

  const generateBankBookReport = async () => {
    try {
      const { data: paymentsData, error: pError } = await supabase
        .from('payments')
        .select('*, loans(loan_number, customers(full_name))')
        .neq('mode', 'Cash')
        .gte('payment_date', reportFilters.startDate)
        .lte('payment_date', reportFilters.endDate);
      
      if (pError) throw pError;

      const { data: loansData, error: lError } = await supabase
        .from('loans')
        .select('*, customers(full_name)')
        .neq('disbursement_mode', 'Cash')
        .gte('created_at', reportFilters.startDate)
        .lte('created_at', reportFilters.endDate);
      
      if (lError) throw lError;

      const transactions = [
        ...(paymentsData || []).map(p => ({
          date: p.payment_date,
          type: p.payment_type,
          customer_name: p.loans?.customers?.full_name,
          mode: p.mode,
          transaction_id: p.transaction_id,
          amount: p.amount
        })),
        ...(loansData || []).map(l => ({
          date: l.created_at,
          type: 'Disbursement',
          customer_name: l.customers?.full_name,
          mode: l.disbursement_mode,
          transaction_id: l.disbursement_transaction_id,
          amount: -l.loan_amount
        }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const headers = ['Date', 'Type', 'Customer', 'Mode', 'Ref', 'Amount'];
      const data = transactions.map((t: any) => [
        format(new Date(t.date), 'dd MMM yyyy'),
        t.type,
        t.customer_name,
        t.mode,
        t.transaction_id || '-',
        `₹${t.amount.toLocaleString()}`
      ]);
      
      exportToPDF(`Bank Book (${reportFilters.startDate} to ${reportFilters.endDate})`, headers, data, 'Bank_Book_Report');
    } catch (err) {
      console.error(err);
      alert('Failed to generate bank book report');
    }
  };

  const generateOverdueReport = () => {
    const overdue = loans.filter(l => l.status === 'active' && new Date(l.maturity_date) < new Date());
    const headers = ['Loan #', 'Customer', 'Amount', 'Maturity', 'Days Overdue'];
    const data = overdue.map(l => {
      const days = Math.floor((new Date().getTime() - new Date(l.maturity_date).getTime()) / (1000 * 3600 * 24));
      return [
        l.loan_number,
        l.customer_name,
        `₹${l.amount.toLocaleString()}`,
        format(new Date(l.maturity_date), 'dd MMM yyyy'),
        `${days} days`
      ];
    });
    
    exportToPDF('Overdue Loans Report', headers, data, 'Overdue_Loans_Report');
  };

  const [isLedgerModalOpen, setIsLedgerModalOpen] = React.useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState('');

  const generateLedgerReport = async () => {
    if (!selectedCustomerId) return alert('Please select a customer');
    try {
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select('*, loans(loan_number)')
        .eq('customer_id', selectedCustomerId)
        .order('payment_date', { ascending: true });
      
      if (error) throw error;

      const customer = customers.find(c => c.id === Number(selectedCustomerId));
      
      const headers = ['Date', 'Type', 'Loan #', 'Amount', 'Remarks'];
      const data = (paymentsData || []).map((p: any) => [
        format(new Date(p.payment_date), 'dd MMM yyyy'),
        p.payment_type,
        p.loans?.loan_number,
        `₹${p.amount.toLocaleString()}`,
        p.remarks || '-'
      ]);
      
      exportToPDF(`Customer Ledger - ${customer?.full_name}`, headers, data, `Ledger_${customer?.full_name}`);
      setIsLedgerModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to generate ledger report');
    }
  };

  const [customers, setCustomers] = React.useState<any[]>([]);
  React.useEffect(() => {
    async function fetchCustomers() {
      try {
        const { data, error } = await supabase.from('customers').select('*');
        if (error) throw error;
        setCustomers(data || []);
      } catch (err) {
        console.error('Error fetching customers for reports:', err);
      }
    }
    fetchCustomers();
  }, []);

  const reportTypes = [
    { id: 'active', title: 'Active Loans Report', description: 'Detailed list of all currently active Girvi loans.', icon: FileText, action: generateActiveLoansReport },
    { id: 'payments', title: 'Transaction Report', description: 'Detailed payment report with date and mode filters.', icon: BarChart3, action: () => setIsPaymentReportOpen(true) },
    { id: 'released', title: 'Released Items', description: 'History of items released back to customers.', icon: Download, action: generateReleasedItemsReport },
    { id: 'daybook', title: 'Day Book', description: 'Daily transaction summary of all cash flows.', icon: Share2, action: generateDayBookReport },
    { id: 'pl', title: 'Profit & Loss', description: 'Income and expense summary for the selected period.', icon: TrendingUp, action: generateProfitLossReport },
    { id: 'cashbook', title: 'Cash Book', description: 'All cash-based transactions (In/Out).', icon: FileText, action: generateCashBookReport },
    { id: 'bankbook', title: 'Bank Book', description: 'All bank and UPI transactions (In/Out).', icon: FileText, action: generateBankBookReport },
    { id: 'overdue', title: 'Overdue Loans', description: 'List of loans that have passed their maturity date.', icon: AlertCircle, action: generateOverdueReport },
    { id: 'ledger', title: 'Customer Ledger', description: 'Full transaction history for a specific customer.', icon: Users, action: () => setIsLedgerModalOpen(true) },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Ledger Selection Modal */}
      {isLedgerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Select Customer for Ledger</h2>
              <button onClick={() => setIsLedgerModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Customer</label>
                <select 
                  className="input-field"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">Choose a customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.mobile})</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={generateLedgerReport}
                className="w-full btn-primary py-3"
              >
                Generate Ledger PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Payment Report Modal */}
      {isPaymentReportOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Transaction / Payment Report</h2>
              <button onClick={() => setIsPaymentReportOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <ArrowRight className="rotate-180" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-gray-50 p-4 rounded-xl">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Start Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={reportFilters.startDate}
                  onChange={(e) => setReportFilters({...reportFilters, startDate: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">End Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={reportFilters.endDate}
                  onChange={(e) => setReportFilters({...reportFilters, endDate: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Payment Mode</label>
                <select 
                  className="input-field"
                  value={reportFilters.mode}
                  onChange={(e) => setReportFilters({...reportFilters, mode: e.target.value})}
                >
                  <option value="all">All Modes</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Loan #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{format(new Date(p.date), 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3 font-medium">{p.loan_number}</td>
                      <td className="px-4 py-3">{p.customer_name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold uppercase">
                          {p.mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize">{p.type}</td>
                      <td className="px-4 py-3 text-right font-bold">₹{p.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">
                        No transactions found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right">Total:</td>
                    <td className="px-4 py-3 text-right text-emerald-600">
                      ₹{filteredPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={generateFilteredPaymentReport}
                className="btn-primary flex items-center gap-2"
              >
                <Download size={18} />
                Download PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Generate and export business intelligence reports</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsPaymentReportOpen(true)}
            className="px-4 py-2 border border-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-50 font-medium"
          >
            <Filter size={18} />
            Date Range
          </button>
          <button 
            onClick={exportAllToExcel}
            className="btn-primary flex items-center gap-2"
          >
            <Download size={18} />
            Export All (Excel)
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Report Selection */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportTypes.map((report, i) => (
            <motion.div 
              key={i}
              whileHover={{ scale: 1.02 }}
              onClick={report.action}
              className="card p-6 flex flex-col justify-between group cursor-pointer"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                  <report.icon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{report.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm font-bold text-primary">
                Generate Report
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Distribution Chart */}
        <div className="card p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <PieChartIcon size={20} className="text-primary" />
            Asset Distribution
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={assetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {assetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {assetData.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-bold">{item.value} Items</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity / Audit Summary */}
      <div className="card">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg">Audit Summary ({format(new Date(reportFilters.startDate), 'dd MMM')} - {format(new Date(reportFilters.endDate), 'dd MMM yyyy')})</h3>
          <button 
            onClick={() => {
              setReportFilters({
                startDate: format(startOfMonth(subMonths(new Date(), 12)), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
                mode: 'all'
              });
            }}
            className="text-xs text-primary font-bold hover:underline"
          >
            Reset to All Time
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-1">
              <p className="text-gray-500 text-sm">Total Interest Collected</p>
              <h4 className="text-3xl font-bold text-emerald-600">₹{totalInterest.toLocaleString()}</h4>
            </div>
            <div className="text-center space-y-1 border-x border-gray-100">
              <p className="text-gray-500 text-sm">Total Loans Disbursed</p>
              <h4 className="text-3xl font-bold text-primary">₹{totalDisbursed.toLocaleString()}</h4>
            </div>
            <div className="text-center space-y-1">
              <p className="text-gray-500 text-sm">Principal Recovered</p>
              <h4 className="text-3xl font-bold text-secondary">₹{principalRecovered.toLocaleString()}</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
