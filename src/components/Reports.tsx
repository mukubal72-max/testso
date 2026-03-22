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
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isBefore } from 'date-fns';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';

const COLORS = ['#2C5AA0', '#E6C200', '#10b981', '#f43f5e'];

import { supabase } from '../lib/supabase';

export default function Reports() {
  const [loans, setLoans] = React.useState<any[]>([]);
  const [payments, setPayments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [settings, setSettings] = React.useState<any>(null);
  const [previewData, setPreviewData] = React.useState<{
    title: string;
    headers: string[];
    data: any[][];
    filename: string;
  } | null>(null);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const { data: loansData } = await supabase
          .from('loans')
          .select('*, customers(full_name), items(*)');
        
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*, loans(loan_number, loan_amount, interest_rate, start_date, customers(full_name))');

        const { data: settingsData } = await supabase.from('settings').select('*');

        if (settingsData) {
          const settingsObj = settingsData.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {});
          setSettings(settingsObj);
        }

        setLoans(loansData?.map(l => ({ 
          ...l, 
          customer_name: l.customers?.full_name,
          amount: l.loan_amount 
        })) || []);
        
        setPayments(paymentsData?.map(p => ({ 
          ...p, 
          loan_number: p.loans?.loan_number, 
          customer_name: p.loans?.customers?.full_name,
          date: p.payment_date,
          mode: p.payment_mode
        })) || []);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const [reportFilters, setReportFilters] = React.useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    let startYear = year;
    if (month < 4) startYear = year - 1;
    return {
      startDate: `${startYear}-04-01`,
      endDate: format(today, 'yyyy-MM-dd'),
      mode: 'all'
    };
  });

  const setFinancialYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    let startYear = year;
    if (month < 4) startYear = year - 1;
    
    setReportFilters({
      startDate: `${startYear}-04-01`,
      endDate: format(today, 'yyyy-MM-dd'),
      mode: 'all'
    });
  };

  const [isPaymentReportOpen, setIsPaymentReportOpen] = React.useState(false);

  const filteredPayments = React.useMemo(() => {
    return payments.filter(p => {
      const dateMatch = p.date >= reportFilters.startDate && p.date <= reportFilters.endDate;
      const modeMatch = reportFilters.mode === 'all' || p.mode?.toLowerCase() === reportFilters.mode.toLowerCase();
      return dateMatch && modeMatch;
    }).map(p => ({
      date: p.date,
      loan_number: p.loan_number,
      customer_name: p.customer_name,
      mode: p.mode,
      type: p.payment_type,
      amount: p.amount
    }));
  }, [payments, reportFilters]);

  const assetData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    loans.forEach(l => {
      l.items?.forEach((item: any) => {
        counts[item.category] = (counts[item.category] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [loans]);

  const { totalInterest, totalDisbursed, principalRecovered } = React.useMemo(() => {
    const filteredP = payments.filter(p => p.date >= reportFilters.startDate && p.date <= reportFilters.endDate);
    const filteredL = loans.filter(l => l.start_date >= reportFilters.startDate && l.start_date <= reportFilters.endDate);
    
    return {
      totalInterest: filteredP.filter(p => p.payment_type === 'interest').reduce((sum, p) => sum + p.amount, 0),
      totalDisbursed: filteredL.reduce((sum, l) => sum + l.amount, 0),
      principalRecovered: filteredP.filter(p => p.payment_type === 'principal' || p.payment_type === 'full_settlement').reduce((sum, p) => sum + p.amount, 0)
    };
  }, [payments, loans, reportFilters]);

  const exportAllToExcel = () => {
    const data = loans.map(l => ({
      'Loan #': l.loan_number,
      'Customer': l.customer_name,
      'Amount': l.amount,
      'Interest Rate': l.interest_rate,
      'Status': l.status,
      'Maturity': l.maturity_date
    }));
    exportToExcel(data, 'All_Loans_Report');
  };

  const generateActiveLoansReport = () => {
    const headers = ['Loan #', 'Customer', 'Principal', 'Accrued Int.', 'Paid', 'Outstanding', 'Maturity'];
    const data = loans
      .filter(l => l.status === 'active' && l.start_date <= reportFilters.endDate)
      .map(l => {
        const principal = l.amount;
        
        // Calculate Accrued Interest
        const startDate = new Date(l.start_date);
        const endDate = new Date(reportFilters.endDate);
        let accruedInterest = 0;
        let currentAccrualDate = addMonths(startDate, 1);
        while (isBefore(currentAccrualDate, endDate) || format(currentAccrualDate, 'yyyy-MM-dd') === reportFilters.endDate) {
          accruedInterest += (principal * l.interest_rate) / 100;
          currentAccrualDate = addMonths(currentAccrualDate, 1);
        }

        const loanPayments = payments.filter(p => p.loan_id === l.id && p.date <= reportFilters.endDate);
        const totalPaid = loanPayments.reduce((sum, p) => sum + p.amount, 0);
        const outstanding = principal + accruedInterest - totalPaid;

        return [
          l.loan_number,
          l.customer_name,
          `₹${principal.toLocaleString()}`,
          `₹${accruedInterest.toLocaleString()}`,
          `₹${totalPaid.toLocaleString()}`,
          `₹${outstanding.toLocaleString()}`,
          format(new Date(l.maturity_date), 'dd MMM yyyy')
        ];
      });
    
    setPreviewData({
      title: `Active Loans Report (As of ${format(new Date(reportFilters.endDate), 'dd MMM yyyy')})`,
      headers,
      data,
      filename: 'Active_Loans_Report'
    });
  };

  const generateInterestCollectionReport = () => {
    const headers = ['Date', 'Loan #', 'Customer', 'Monthly Interest Due', 'Interest Received', 'Mode'];
    const data = payments
      .filter(p => {
        const pDate = p.date.split('T')[0];
        return p.payment_type === 'interest' && pDate >= reportFilters.startDate && pDate <= reportFilters.endDate;
      })
      .map(p => {
        const monthlyInterest = p.loans ? (p.loans.loan_amount * p.loans.interest_rate) / 100 : 0;
        return [
          format(new Date(p.date), 'dd MMM yyyy'),
          p.loan_number || 'N/A',
          p.customer_name || 'N/A',
          `₹${monthlyInterest.toLocaleString()}`,
          `₹${p.amount.toLocaleString()}`,
          p.mode
        ];
      });
    
    setPreviewData({
      title: `Interest Collection Report (${reportFilters.startDate} to ${reportFilters.endDate})`,
      headers,
      data,
      filename: 'Interest_Collection_Report'
    });
  };

  const generateClosedLoansReport = async () => {
    try {
      const { data: closedLoans, error } = await supabase
        .from('loans')
        .select('*, customers(full_name)')
        .eq('status', 'closed')
        .gte('updated_at', `${reportFilters.startDate}T00:00:00`)
        .lte('updated_at', `${reportFilters.endDate}T23:59:59`);
      
      if (error) throw error;
      
      const headers = ['Loan #', 'Customer', 'Amount', 'Closed Date', 'Maturity'];
      const data = (closedLoans || []).map((l: any) => [
        l.loan_number,
        l.customers?.full_name,
        `₹${Number(l.loan_amount).toLocaleString()}`,
        format(new Date(l.updated_at), 'dd MMM yyyy'),
        format(new Date(l.maturity_date), 'dd MMM yyyy')
      ]);
      
      setPreviewData({
        title: `Closed Loans Report (${reportFilters.startDate} to ${reportFilters.endDate})`,
        headers,
        data,
        filename: 'Closed_Loans_Report'
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate closed loans report');
    }
  };

  const generateConsolidatedReport = async () => {
    try {
      const { data: pData } = await supabase
        .from('payments')
        .select('*')
        .gte('payment_date', `${reportFilters.startDate}T00:00:00`)
        .lte('payment_date', `${reportFilters.endDate}T23:59:59`);
      
      const { data: lData } = await supabase
        .from('loans')
        .select('*')
        .gte('start_date', `${reportFilters.startDate}T00:00:00`)
        .lte('start_date', `${reportFilters.endDate}T23:59:59`);

      const interestReceived = pData?.filter(p => p.payment_type === 'interest').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const interestPaid = 0; // Assuming no data for interest paid by business
      const penalty = pData?.filter(p => p.payment_type === 'penalty').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const principal = pData?.filter(p => p.payment_type === 'principal' || p.payment_type === 'full_settlement').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const disbursed = lData?.reduce((sum, l) => sum + Number(l.loan_amount), 0) || 0;

      const headers = ['Description', 'Amount'];
      const data = [
        ['Total Loans Disbursed (Outflow)', `₹${disbursed.toLocaleString()}`],
        ['Total Principal Recovered (Inflow)', `₹${principal.toLocaleString()}`],
        ['Total Interest Received (Inflow)', `₹${interestReceived.toLocaleString()}`],
        ['Total Interest Paid (Outflow)', `₹${interestPaid.toLocaleString()}`],
        ['Total Penalty Collected (Inflow)', `₹${penalty.toLocaleString()}`],
        ['', ''],
        ['Total Inflow (Receipts)', `₹${(principal + interestReceived + penalty).toLocaleString()}`],
        ['Total Outflow (Payments)', `₹${(disbursed + interestPaid).toLocaleString()}`],
        ['Net Cash Flow', `₹${(principal + interestReceived + penalty - disbursed - interestPaid).toLocaleString()}`],
        ['', ''],
        ['Profit & Loss Summary', ''],
        ['Total Income (Interest + Penalty)', `₹${(interestReceived + penalty).toLocaleString()}`],
        ['Total Expenses (Interest Paid)', `₹${interestPaid.toLocaleString()}`],
        ['Net Profit', `₹${(interestReceived - interestPaid + penalty).toLocaleString()}`]
      ];
      
      setPreviewData({
        title: `Consolidated Accounting Report (${reportFilters.startDate} to ${reportFilters.endDate})`,
        headers,
        data,
        filename: 'Consolidated_Report'
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate consolidated report');
    }
  };

  const generateReleasedItemsReport = async () => {
    try {
      const { data: releasedLoans, error } = await supabase
        .from('loans')
        .select('*, customers(full_name), items(*)')
        .eq('status', 'closed')
        .gte('updated_at', `${reportFilters.startDate}T00:00:00`)
        .lte('updated_at', `${reportFilters.endDate}T23:59:59`);
      
      if (error) throw error;
      
      const headers = ['Loan #', 'Customer', 'Items Released', 'Total Weight', 'Amount', 'Closed Date'];
      const data = (releasedLoans || []).map((l: any) => {
        const itemNames = l.items?.map((i: any) => i.item_name).join(', ') || 'N/A';
        const totalWeight = l.items?.reduce((sum: number, i: any) => sum + Number(i.weight), 0) || 0;
        return [
          l.loan_number,
          l.customers?.full_name,
          itemNames,
          `${totalWeight}g`,
          `₹${Number(l.loan_amount).toLocaleString()}`,
          format(new Date(l.updated_at), 'dd MMM yyyy')
        ];
      });
      
      setPreviewData({
        title: `Released Items Report (${reportFilters.startDate} to ${reportFilters.endDate})`,
        headers,
        data,
        filename: 'Released_Items_Report'
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate released items report');
    }
  };

  const generateDayBookReport = async () => {
    try {
      const { data: paymentsRange, error: pError } = await supabase
        .from('payments')
        .select('*, loans(loan_number)')
        .gte('payment_date', `${reportFilters.startDate}T00:00:00`)
        .lte('payment_date', `${reportFilters.endDate}T23:59:59`);
      
      if (pError) throw pError;

      const { data: loansRange, error: lError } = await supabase
        .from('loans')
        .select('*')
        .gte('start_date', `${reportFilters.startDate}T00:00:00`)
        .lte('start_date', `${reportFilters.endDate}T23:59:59`);
      
      if (lError) throw lError;

      let runningBalance = 0;
      const headers = ['Date', 'Type', 'Reference', 'Receipt (Dr)', 'Payment (Cr)', 'Balance'];
      const data = [
        ...(paymentsRange || []).map(p => ({
          time: p.payment_date,
          type: `Payment (${p.payment_type})`,
          ref: p.loans?.loan_number || '-',
          dr: p.amount,
          cr: 0
        })),
        ...(loansRange || []).map(l => ({
          time: l.start_date,
          type: 'Disbursement',
          ref: l.loan_number || '-',
          dr: 0,
          cr: l.loan_amount
        }))
      ]
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map(t => {
        runningBalance += (t.dr - t.cr);
        return [
          format(new Date(t.time), 'dd MMM yyyy'),
          t.type,
          t.ref,
          t.dr > 0 ? `₹${t.dr.toLocaleString()}` : '-',
          t.cr > 0 ? `₹${t.cr.toLocaleString()}` : '-',
          `₹${runningBalance.toLocaleString()}`
        ];
      });
      
      setPreviewData({
        title: `Day Book Report (${reportFilters.startDate} to ${reportFilters.endDate})`,
        headers,
        data,
        filename: 'Day_Book_Report'
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate day book report');
    }
  };

  const generateProfitLossReport = async () => {
    try {
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select('*')
        .gte('payment_date', `${reportFilters.startDate}T00:00:00`)
        .lte('payment_date', `${reportFilters.endDate}T23:59:59`);
      
      if (error) throw error;

      const interestReceived = paymentsData?.filter(p => p.payment_type === 'interest').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const interestPaid = 0; // Assuming no data for interest paid by business
      const penalty = paymentsData?.filter(p => p.payment_type === 'penalty').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      const headers = ['Category', 'Amount'];
      const data = [
        ['Interest Received (Income)', `₹${interestReceived.toLocaleString()}`],
        ['Penalty Income', `₹${penalty.toLocaleString()}`],
        ['Total Income', `₹${(interestReceived + penalty).toLocaleString()}`],
        ['Interest Paid (Expense)', `₹${interestPaid.toLocaleString()}`],
        ['Total Expenses', `₹${interestPaid.toLocaleString()}`],
        ['Net Profit', `₹${(interestReceived - interestPaid + penalty).toLocaleString()}`]
      ];
      
      setPreviewData({
        title: `Profit & Loss Statement (${reportFilters.startDate} to ${reportFilters.endDate})`,
        headers,
        data,
        filename: 'Profit_Loss_Report'
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate P&L report');
    }
  };

  const generateCashBookReport = async () => {
    try {
      // Fetch all cash payments (IN)
      const { data: paymentsData, error: pError } = await supabase
        .from('payments')
        .select('*, loans(loan_number, customers(full_name))')
        .ilike('payment_mode', 'cash')
        .gte('payment_date', `${reportFilters.startDate}T00:00:00`)
        .lte('payment_date', `${reportFilters.endDate}T23:59:59`);
      
      if (pError) throw pError;

      // Fetch all cash disbursements (OUT)
      const { data: loansData, error: lError } = await supabase
        .from('loans')
        .select('*, customers(full_name)')
        .ilike('disbursement_mode', 'cash')
        .gte('start_date', `${reportFilters.startDate}T00:00:00`)
        .lte('start_date', `${reportFilters.endDate}T23:59:59`);
      
      if (lError) throw lError;

      let runningBalance = 0;
      const headers = ['Date', 'Type', 'Customer', 'Receipt (Dr)', 'Payment (Cr)', 'Balance'];
      const data = [
        ...(paymentsData || []).map(p => ({
          date: p.payment_date,
          type: `Payment (${p.payment_type})`,
          customer_name: p.loans?.customers?.full_name || '-',
          dr: p.amount,
          cr: 0
        })),
        ...(loansData || []).map(l => ({
          date: l.start_date,
          type: 'Disbursement (Loan)',
          customer_name: l.customers?.full_name || '-',
          dr: 0,
          cr: l.loan_amount
        }))
      ]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => {
        runningBalance += (t.dr - t.cr);
        return [
          format(new Date(t.date), 'dd MMM yyyy'),
          t.type,
          t.customer_name,
          t.dr > 0 ? `₹${t.dr.toLocaleString()}` : '-',
          t.cr > 0 ? `₹${t.cr.toLocaleString()}` : '-',
          `₹${runningBalance.toLocaleString()}`
        ];
      });
      
      setPreviewData({
        title: `Cash Book Report (${reportFilters.startDate} to ${reportFilters.endDate})`,
        headers,
        data,
        filename: 'Cash_Book_Report'
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate cash book report');
    }
  };

  const generateBankBookReport = async () => {
    try {
      // Fetch all non-cash payments (IN)
      const { data: paymentsData, error: pError } = await supabase
        .from('payments')
        .select('*, loans(loan_number, customers(full_name))')
        .not('payment_mode', 'ilike', 'cash')
        .gte('payment_date', `${reportFilters.startDate}T00:00:00`)
        .lte('payment_date', `${reportFilters.endDate}T23:59:59`);
      
      if (pError) throw pError;

      // Fetch all non-cash disbursements (OUT)
      const { data: loansData, error: lError } = await supabase
        .from('loans')
        .select('*, customers(full_name)')
        .not('disbursement_mode', 'ilike', 'cash')
        .gte('start_date', `${reportFilters.startDate}T00:00:00`)
        .lte('start_date', `${reportFilters.endDate}T23:59:59`);
      
      if (lError) throw lError;

      let runningBalance = 0;
      const headers = ['Date', 'Type', 'Customer', 'Mode', 'Ref', 'Receipt (Dr)', 'Payment (Cr)', 'Balance'];
      const data = [
        ...(paymentsData || []).map(p => ({
          date: p.payment_date,
          type: `Payment (${p.payment_type})`,
          customer_name: p.loans?.customers?.full_name || '-',
          mode: p.payment_mode,
          ref: p.transaction_id,
          dr: p.amount,
          cr: 0
        })),
        ...(loansData || []).map(l => ({
          date: l.start_date,
          type: 'Disbursement (Loan)',
          customer_name: l.customers?.full_name || '-',
          mode: l.disbursement_mode,
          ref: l.disbursement_transaction_id,
          dr: 0,
          cr: l.loan_amount
        }))
      ]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => {
        runningBalance += (t.dr - t.cr);
        return [
          format(new Date(t.date), 'dd MMM yyyy'),
          t.type,
          t.customer_name,
          t.mode,
          t.ref || '-',
          t.dr > 0 ? `₹${t.dr.toLocaleString()}` : '-',
          t.cr > 0 ? `₹${t.cr.toLocaleString()}` : '-',
          `₹${runningBalance.toLocaleString()}`
        ];
      });
      
      setPreviewData({
        title: `Bank Book Report (${reportFilters.startDate} to ${reportFilters.endDate})`,
        headers,
        data,
        filename: 'Bank_Book_Report'
      });
    } catch (err) {
      console.error(err);
      alert('Failed to generate bank book report');
    }
  };

  const generateOverdueReport = () => {
    const overdue = loans.filter(l => 
      l.status === 'active' && 
      new Date(l.maturity_date) < new Date() &&
      l.maturity_date <= reportFilters.endDate
    );
    const headers = ['Loan #', 'Customer', 'Principal', 'Accrued Int.', 'Paid', 'Outstanding', 'Days Overdue'];
    const data = overdue.map(l => {
      const principal = l.amount;
      const days = Math.floor((new Date().getTime() - new Date(l.maturity_date).getTime()) / (1000 * 3600 * 24));
      
      // Calculate Accrued Interest
      const startDate = new Date(l.start_date);
      const endDate = new Date();
      let accruedInterest = 0;
      let currentAccrualDate = addMonths(startDate, 1);
      while (isBefore(currentAccrualDate, endDate) || format(currentAccrualDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
        accruedInterest += (principal * l.interest_rate) / 100;
        currentAccrualDate = addMonths(currentAccrualDate, 1);
      }

      const loanPayments = payments.filter(p => p.loan_id === l.id);
      const totalPaid = loanPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = principal + accruedInterest - totalPaid;

      return [
        l.loan_number,
        l.customer_name,
        `₹${principal.toLocaleString()}`,
        `₹${accruedInterest.toLocaleString()}`,
        `₹${totalPaid.toLocaleString()}`,
        `₹${outstanding.toLocaleString()}`,
        `${days} days`
      ];
    });
    
    setPreviewData({
      title: `Overdue Loans Report (As of ${format(new Date(reportFilters.endDate), 'dd MMM yyyy')})`,
      headers,
      data,
      filename: 'Overdue_Loans_Report'
    });
  };

  const [isLedgerModalOpen, setIsLedgerModalOpen] = React.useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState('');

  const generateLedgerReport = async () => {
    if (!selectedCustomerId) return alert('Please select a customer');
    try {
      const { data: paymentsData, error: pError } = await supabase
        .from('payments')
        .select('*, loans!inner(loan_number, customer_id)')
        .eq('loans.customer_id', selectedCustomerId)
        .order('payment_date', { ascending: true });
      
      if (pError) throw pError;

      const { data: loansData, error: lError } = await supabase
        .from('loans')
        .select('*')
        .eq('customer_id', selectedCustomerId)
        .order('start_date', { ascending: true });

      if (lError) throw lError;

      const customer = customers.find(c => c.id === Number(selectedCustomerId));
      
      const transactions: any[] = [];
      
      // 1. Add Loan Disbursements
      (loansData || []).forEach(l => {
        transactions.push({
          date: l.start_date,
          type: 'Loan Disbursement',
          ref: l.loan_number,
          debit: l.loan_amount,
          credit: 0,
          remarks: `Principal Amount: ₹${l.loan_amount.toLocaleString()} @ ${l.interest_rate}% p.m.`
        });

        // 2. Generate Monthly Interest Accruals
        const startDate = new Date(l.start_date);
        const endDate = new Date(reportFilters.endDate);
        const monthlyInterest = (l.loan_amount * l.interest_rate) / 100;
        
        let currentAccrualDate = addMonths(startDate, 1);
        while (isBefore(currentAccrualDate, endDate) || format(currentAccrualDate, 'yyyy-MM-dd') === reportFilters.endDate) {
          transactions.push({
            date: format(currentAccrualDate, 'yyyy-MM-dd'),
            type: 'Interest Accrual',
            ref: l.loan_number,
            debit: monthlyInterest,
            credit: 0,
            remarks: `Monthly Interest Accrual (${l.interest_rate}%)`
          });
          currentAccrualDate = addMonths(currentAccrualDate, 1);
        }
      });

      // 3. Add Payments
      (paymentsData || []).forEach(p => {
        const loanData = Array.isArray(p.loans) ? p.loans[0] : p.loans;
        transactions.push({
          date: p.payment_date,
          type: `Payment (${p.payment_type?.replace('_', ' ')})`,
          ref: loanData?.loan_number || p.transaction_id || '-',
          debit: 0,
          credit: p.amount,
          remarks: `${p.remarks || ''} (Mode: ${p.payment_mode})`.trim()
        });
      });

      // 4. Sort by Date
      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // 5. Calculate Running Balance
      let runningBalance = 0;
      const headers = ['Date', 'Type', 'Ref #', 'Debit (Dr)', 'Credit (Cr)', 'Balance', 'Remarks'];
      const data = transactions.map((t: any) => {
        runningBalance += (t.debit - t.credit);
        return [
          format(new Date(t.date), 'dd MMM yyyy'),
          t.type,
          t.ref,
          t.debit > 0 ? `₹${t.debit.toLocaleString()}` : '-',
          t.credit > 0 ? `₹${t.credit.toLocaleString()}` : '-',
          `₹${runningBalance.toLocaleString()}`,
          t.remarks || '-'
        ];
      });
      
      setPreviewData({
        title: `Customer Ledger - ${customer?.full_name}`,
        headers,
        data,
        filename: `Ledger_${customer?.full_name}`
      });
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
    { id: 'interest', title: 'Interest Collection', description: 'Summary of all interest collected from customers.', icon: TrendingUp, action: generateInterestCollectionReport },
    { id: 'payments', title: 'Transaction Report', description: 'Detailed payment report with date and mode filters.', icon: BarChart3, action: () => setIsPaymentReportOpen(true) },
    { id: 'released', title: 'Released Items', description: 'History of items released back to customers.', icon: Download, action: generateReleasedItemsReport },
    { id: 'closed', title: 'Closed Loans', description: 'List of loans closed in the selected period.', icon: FileText, action: generateClosedLoansReport },
    { id: 'consolidated', title: 'Consolidated Accounting', description: 'Full accounting summary matching P&L.', icon: BarChart3, action: generateConsolidatedReport },
    { id: 'daybook', title: 'Day Book', description: 'Daily transaction summary of all cash flows.', icon: Share2, action: generateDayBookReport },
    { id: 'pl', title: 'Profit & Loss', description: 'Income and expense summary for the selected period.', icon: TrendingUp, action: generateProfitLossReport },
    { id: 'cashbook', title: 'Cash Book', description: 'All cash-based transactions (Debit/Credit).', icon: FileText, action: generateCashBookReport },
    { id: 'bankbook', title: 'Bank Book', description: 'All bank and UPI transactions (Debit/Credit).', icon: FileText, action: generateBankBookReport },
    { id: 'overdue', title: 'Overdue Loans', description: 'List of loans that have passed their maturity date.', icon: AlertCircle, action: generateOverdueReport },
    { id: 'ledger', title: 'Customer Ledger', description: 'Full transaction history with interest calculation.', icon: Users, action: () => setIsLedgerModalOpen(true) },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Global Date Filter */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-400" />
          <span className="font-bold text-gray-700">Global Report Filter:</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Start Date</label>
            <input 
              type="date" 
              className="input-field py-1 px-3 text-sm" 
              value={reportFilters.startDate}
              onChange={(e) => setReportFilters({...reportFilters, startDate: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">End Date</label>
            <input 
              type="date" 
              className="input-field py-1 px-3 text-sm" 
              value={reportFilters.endDate}
              onChange={(e) => setReportFilters({...reportFilters, endDate: e.target.value})}
            />
          </div>
          <button 
            onClick={setFinancialYear}
            className="mt-4 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600 transition-colors"
          >
            Financial Year
          </button>
        </div>
        <div className="text-xs text-gray-400 max-w-xs">
          This filter applies to all reports except "Active Loans" and "Overdue Loans" which show current status.
        </div>
      </div>

      {/* Report Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-6xl max-h-[90vh] flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">{previewData.title}</h2>
                <p className="text-gray-500 text-sm">Preview of the generated report</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => exportToPDF(previewData.title, previewData.headers, previewData.data, previewData.filename, settings)}
                  className="btn-primary flex items-center gap-2 px-4 py-2"
                >
                  <Download size={18} />
                  PDF
                </button>
                <button 
                  onClick={() => exportToExcel(previewData.data.map(row => {
                    const obj: any = {};
                    previewData.headers.forEach((h, i) => obj[h] = row[i]);
                    return obj;
                  }), previewData.filename)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-colors"
                >
                  <Download size={18} />
                  Excel
                </button>
                <button onClick={() => setPreviewData(null)} className="p-2 hover:bg-gray-100 rounded-full ml-4">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold sticky top-0 z-10">
                  <tr>
                    {previewData.headers.map((h, i) => (
                      <th key={i} className="px-4 py-3 border-b border-gray-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewData.data.length === 0 ? (
                    <tr>
                      <td colSpan={previewData.headers.length} className="px-4 py-8 text-center text-gray-400">
                        No data found for this report.
                      </td>
                    </tr>
                  ) : (
                    previewData.data.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-3">{cell}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

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
                onClick={() => {
                  const headers = ['Date', 'Loan #', 'Customer', 'Mode', 'Type', 'Amount'];
                  const data = filteredPayments.map(p => [
                    format(new Date(p.date), 'dd MMM yyyy'),
                    p.loan_number || 'N/A',
                    p.customer_name || 'N/A',
                    p.mode,
                    p.type,
                    `₹${p.amount.toLocaleString()}`
                  ]);
                  exportToPDF(`Payment Report (${reportFilters.startDate} to ${reportFilters.endDate})`, headers, data, 'Payment_Report', settings);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Download size={18} />
                Download PDF
              </button>
              <button 
                onClick={() => {
                  const data = filteredPayments.map(p => ({
                    'Date': format(new Date(p.date), 'dd MMM yyyy'),
                    'Loan #': p.loan_number || 'N/A',
                    'Customer': p.customer_name || 'N/A',
                    'Mode': p.mode,
                    'Type': p.type,
                    'Amount': p.amount
                  }));
                  exportToExcel(data, 'Payment_Report');
                }}
                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors"
              >
                <Download size={18} />
                Download Excel
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
