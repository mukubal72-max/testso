import React from 'react';
import { 
  CreditCard, 
  Search, 
  Plus, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Receipt,
  Filter,
  CheckCircle2,
  X,
  TrendingUp,
  MessageSquare,
  Printer
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generatePaymentReceipt } from '../lib/exportUtils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function PaymentManagement() {
  const [loans, setLoans] = React.useState<any[]>([]);
  const [payments, setPayments] = React.useState<any[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = React.useState(true);
  const [isLoadingLoans, setIsLoadingLoans] = React.useState(true);
  const [settings, setSettings] = React.useState<any>(null);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [selectedLoan, setSelectedLoan] = React.useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastPayment, setLastPayment] = React.useState<any>(null);
  const [paymentMode, setPaymentMode] = React.useState('Cash');
  const [transactionId, setTransactionId] = React.useState('');
  const [isDuplicateTx, setIsDuplicateTx] = React.useState(false);

  const fetchPayments = async () => {
    setIsLoadingPayments(true);
    setFetchError(null);
    try {
      console.log('Fetching payments from database...');
      const { data, error } = await supabase
        .from('payments')
        .select('*, loans(*, customers(*))')
        .order('payment_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching payments:', error);
        setFetchError(error.message);
        throw error;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} payments.`);
      
      setPayments(data?.map(p => ({ 
        ...p, 
        loan_number: p.loans?.loan_number || 'N/A', 
        customer_name: p.loans?.customers?.full_name || 'Unknown',
        customer_mobile: p.loans?.customers?.mobile_number || 'N/A',
        customer_id: p.loans?.customers?.id || 'N/A',
        loan_data: p.loans,
        customer_data: p.loans?.customers,
        date: p.payment_date,
        mode: p.payment_mode,
        type: p.payment_type
      })) || []);
    } catch (err: any) {
      console.error('Error in fetchPayments:', err);
      setFetchError(err.message || 'Failed to connect to database');
    } finally {
      setIsLoadingPayments(false);
    }
  };

  React.useEffect(() => {
    async function fetchInitialData() {
      setIsLoadingLoans(true);
      try {
        // Fetch Settings
        const { data: settingsData } = await supabase.from('settings').select('*').single();
        setSettings(settingsData);

        console.log('Fetching loans for payment selection...');
        const { data: loansData, error } = await supabase
          .from('loans')
          .select('*, customers(full_name)')
          .eq('status', 'active');
        
        if (error) {
          console.error('Error fetching loans:', error);
        } else {
          console.log(`Found ${loansData?.length || 0} active loans.`);
          setLoans(loansData?.map(l => ({ ...l, customer_name: l.customers?.full_name })) || []);
        }
        fetchPayments();
      } catch (err) {
        console.error('Error fetching initial data:', err);
      } finally {
        setIsLoadingLoans(false);
      }
    }
    fetchInitialData();
  }, []);

  const handleShareWhatsApp = (p: any) => {
    const message = `*Payment Receipt - ${p.loan_number}*\n\nCustomer: ${p.customer_name}\nAmount Received: ₹${p.amount}\nType: ${p.type?.replace('_', ' ')}\nDate: ${format(new Date(p.date), 'dd MMM yyyy')}\nRef: ${p.transaction_id || `PAY-${p.id}`}\n\nThank you!`;
    const cleanMobile = p.customer_mobile?.replace(/\D/g, '');
    const mobileWithCode = cleanMobile?.length === 10 ? `91${cleanMobile}` : cleanMobile;
    const url = `https://wa.me/${mobileWithCode}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const checkDuplicateTransaction = async (txId: string) => {
    if (!txId) {
      setIsDuplicateTx(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .eq('transaction_id', txId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setIsDuplicateTx(true);
        alert('Duplicate Transaction ID detected! Please verify.');
      } else {
        setIsDuplicateTx(false);
      }
    } catch (err) {
      console.error('Error checking transaction:', err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">Payment Management</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-gray-500">Record collections and settlements</p>
            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">
              {isLoadingLoans ? '...' : loans.length} Active Loans
            </span>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => {
              setIsPaymentModalOpen(true);
              setPaymentMode('Cash');
              setTransactionId('');
              setIsDuplicateTx(false);
            }}
            className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            New Payment Entry
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Payments List */}
        <div className="lg:col-span-2 card">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg">Transaction History</h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchPayments}
                disabled={isLoadingPayments}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors disabled:opacity-50"
                title="Refresh History"
              >
                <TrendingUp size={18} className={cn(isLoadingPayments && "animate-spin")} />
              </button>
              <button className="text-sm text-primary font-medium hover:underline">View All</button>
            </div>
          </div>
          <div className="divide-y divide-gray-100 min-h-[300px] flex flex-col">
            {isLoadingPayments ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                <p>Loading transactions...</p>
              </div>
            ) : fetchError ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                  <X size={24} />
                </div>
                <h4 className="font-bold text-rose-600">Fetch Failed</h4>
                <p className="text-sm text-gray-500 mt-1 max-w-xs">{fetchError}</p>
                <button 
                  onClick={fetchPayments}
                  className="mt-4 text-sm font-bold text-primary hover:underline"
                >
                  Try Again
                </button>
              </div>
            ) : payments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
                <Receipt size={40} className="mx-auto mb-4 opacity-20" />
                <p>No transactions found</p>
                <p className="text-xs mt-1">New payments will appear here once recorded.</p>
              </div>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      p.type === 'interest' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                    )}>
                      <ArrowDownCircle size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">
                        {(p.type || 'Payment').charAt(0).toUpperCase() + (p.type || 'Payment').slice(1)} Payment - {p.loan_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(p.date), 'dd MMM yyyy')} • {p.mode}
                      </p>
                      <p className="text-[10px] text-gray-400 italic">{p.customer_name}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="font-bold text-emerald-600">+ ₹{p.amount.toLocaleString()}</p>
                    {(p.penalty > 0 || p.charges > 0) && (
                      <div className="flex gap-2 text-[10px] font-medium">
                        {p.penalty > 0 && <span className="text-rose-500">Penalty: ₹{p.penalty.toLocaleString()}</span>}
                        {p.charges > 0 && <span className="text-amber-600">Charges: ₹{p.charges.toLocaleString()}</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-gray-400">Ref: {p.transaction_id || `PAY-${p.id}`}</p>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => generatePaymentReceipt(p, p.loan_data, p.customer_data, settings)}
                          className="p-1 hover:bg-primary/10 rounded text-primary transition-colors"
                          title="Print Receipt"
                        >
                          <Printer size={14} />
                        </button>
                        <button 
                          onClick={() => handleShareWhatsApp(p)}
                          className="p-1 hover:bg-emerald-50 rounded text-emerald-600 transition-colors"
                          title="Share on WhatsApp"
                        >
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="card p-6 bg-primary text-white">
            <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Today's Collection</p>
            <h4 className="text-3xl font-bold mt-1">₹12,450</h4>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300">
              <TrendingUp size={14} />
              <span>15% increase from yesterday</span>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-lg mb-4">Payment Modes</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  Cash
                </div>
                <span className="font-bold text-sm">₹8,500</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  UPI / QR
                </div>
                <span className="font-bold text-sm">₹3,950</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  Bank Transfer
                </div>
                <span className="font-bold text-sm">₹0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{lastPayment ? 'Payment Successful' : 'Record Payment'}</h2>
              <button onClick={() => {
                setIsPaymentModalOpen(false);
                setLastPayment(null);
              }} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            {lastPayment ? (
              <div className="text-center py-8 space-y-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">₹{lastPayment.amount.toLocaleString()} Received</h3>
                  <p className="text-gray-500">Payment has been recorded successfully.</p>
                </div>
                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={() => generatePaymentReceipt(lastPayment, lastPayment.loan_data, lastPayment.customer_data, settings)}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    <Printer size={18} />
                    Print Receipt
                  </button>
                  <button 
                    onClick={() => handleShareWhatsApp(lastPayment)}
                    className="w-full py-3 border border-emerald-200 text-emerald-600 rounded-xl hover:bg-emerald-50 font-bold flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={18} />
                    Share on WhatsApp
                  </button>
                  <button 
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      setLastPayment(null);
                    }}
                    className="w-full py-3 border border-gray-200 rounded-xl hover:bg-gray-50 font-bold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={async (e) => {
                e.preventDefault();
              const form = e.currentTarget;
              
              console.log('--- PAYMENT SUBMISSION INITIATED ---');
              
              if (isSubmitting) {
                console.warn('Submission blocked: already in progress');
                return;
              }
              
              const formData = new FormData(form);
              const rawData = Object.fromEntries(formData.entries());
              console.log('Raw Form Data:', rawData);
              
              if (isDuplicateTx) {
                console.error('Submission blocked: Duplicate Transaction ID');
                alert('Cannot submit with duplicate Transaction ID');
                return;
              }

              // Capture values explicitly from state and form
              const loanId = rawData.loan_id;
              const amount = rawData.amount;
              const date = rawData.date;
              const mode = paymentMode; // Use state directly
              const type = rawData.type;
              const txId = transactionId; // Use state directly
              const remarks = rawData.remarks || null;

              console.log('Captured Values (State + Form):', { loanId, amount, date, mode, type, txId, remarks });

              if (!loanId || !amount || !date) {
                console.error('Validation failed: Missing required fields');
                alert('Please fill in all required fields (Loan, Amount, Date)');
                return;
              }

              const paymentData = {
                loan_id: Number(loanId),
                amount: Number(amount),
                payment_date: date,
                payment_mode: mode,
                payment_type: type,
                transaction_id: txId && String(txId).trim() !== "" ? String(txId).trim() : null,
                remarks: remarks && String(remarks).trim() !== "" ? String(remarks).trim() : null,
                penalty: Number(rawData.penalty) || 0,
                charges: Number(rawData.charges) || 0
              };

              console.log('Final Data Object for Supabase:');
              console.table(paymentData);

              if (isNaN(paymentData.loan_id) || paymentData.loan_id <= 0) {
                console.error('Validation failed: Invalid Loan ID', paymentData.loan_id);
                alert('Invalid Loan selection. Please select a valid loan from the list.');
                return;
              }

              if (isNaN(paymentData.amount) || paymentData.amount <= 0) {
                console.error('Validation failed: Invalid Amount', paymentData.amount);
                alert('Please enter a valid payment amount greater than zero.');
                return;
              }

              setIsSubmitting(true);

              try {
                console.log('Attempting Supabase Insert...');
                const { data: insertData, error } = await supabase
                  .from('payments')
                  .insert([paymentData])
                  .select();
                
                if (error) {
                  console.error('Supabase Insert Error:', error);
                  // Check if it's a schema error
                  if (error.message.includes('column') || error.message.includes('relation')) {
                    alert(`SCHEMA ERROR: ${error.message}\n\nThis usually means the database table or column is missing or named incorrectly.\n\nFIX: Click the "Repair Database" button at the top of this page to copy the fix script, then run it in your Supabase SQL Editor.`);
                  } else {
                    throw error;
                  }
                  return;
                }

                console.log('Insert Successful!', insertData);

                // Fetch full details for the receipt
                const { data: fullPayment } = await supabase
                  .from('payments')
                  .select('*, loans(*, customers(*))')
                  .eq('id', insertData[0].id)
                  .single();

                if (type === 'full_settlement') {
                  console.log('Executing Full Settlement Logic for Loan:', paymentData.loan_id);
                  
                  const { error: loanError } = await supabase
                    .from('loans')
                    .update({ status: 'closed' })
                    .eq('id', paymentData.loan_id);
                    
                  if (loanError) console.error('Error closing loan:', loanError);
                  
                  const { error: itemError } = await supabase
                    .from('items')
                    .update({ status: 'released' })
                    .eq('loan_id', paymentData.loan_id);
                    
                  if (itemError) console.error('Error releasing items:', itemError);
                }

                setLastPayment({
                  ...fullPayment,
                  loan_data: fullPayment.loans,
                  customer_data: fullPayment.loans?.customers
                });
                fetchPayments();
              } catch (err: any) {
                console.error('FATAL ERROR during payment submission:', err);
                const errorMessage = err.message || 'Unknown error';
                const errorDetails = typeof err === 'object' ? JSON.stringify(err, null, 2) : String(err);
                
                alert(`DATABASE ERROR: ${errorMessage}\n\nFull Details:\n${errorDetails}\n\nIf this persists, please ensure you have run the SQL Repair Script in your Supabase Dashboard.`);
              } finally {
                setIsSubmitting(false);
                console.log('--- PAYMENT SUBMISSION FINISHED ---');
              }
            }}>
              <div className="space-y-1">
                <label className="text-sm font-medium">Select Loan</label>
                <select name="loan_id" required className="input-field">
                  <option value="">{loans.length === 0 ? "No active loans found" : "Choose loan..."}</option>
                  {loans.map(l => (
                    <option key={l.id} value={l.id}>{l.loan_number} - {l.customer_name}</option>
                  ))}
                </select>
                {loans.length === 0 && !isLoadingLoans && (
                  <p className="text-[10px] text-rose-500 mt-1">
                    Warning: No active loans found in the database. You cannot record a payment without an active loan.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Amount Received (₹)</label>
                  <input name="amount" type="number" required className="input-field" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Payment Date</label>
                  <input name="date" type="date" required className="input-field" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Payment Mode</label>
                  <select 
                    name="mode" 
                    className="input-field"
                    value={paymentMode}
                    onChange={(e) => {
                      setPaymentMode(e.target.value);
                      if (e.target.value === 'Cash') {
                        setTransactionId('');
                        setIsDuplicateTx(false);
                      }
                    }}
                  >
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Payment Type</label>
                  <select name="type" className="input-field">
                    <option value="interest">Interest Only</option>
                    <option value="principal">Part Principal</option>
                    <option value="full_settlement">Full Settlement</option>
                    <option value="penalty">Penalty Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className={cn(
                  "text-sm font-medium transition-opacity",
                  paymentMode === 'Cash' ? "opacity-50" : "opacity-100"
                )}>
                  Transaction ID (for UPI/Bank)
                </label>
                <input 
                  name="transaction_id" 
                  className={cn(
                    "input-field transition-all",
                    paymentMode === 'Cash' ? "bg-gray-100 cursor-not-allowed opacity-50 grayscale" : "bg-white",
                    isDuplicateTx ? "border-rose-500 ring-rose-500" : ""
                  )} 
                  placeholder={paymentMode === 'Cash' ? "N/A for Cash" : "Enter Transaction ID"}
                  disabled={paymentMode === 'Cash'}
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  onBlur={(e) => checkDuplicateTransaction(e.target.value)}
                />
                {isDuplicateTx && <p className="text-[10px] text-rose-500 font-bold">This Transaction ID already exists!</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Penalty (₹)</label>
                  <input name="penalty" type="number" className="input-field" placeholder="0.00" defaultValue="0" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Other Charges (₹)</label>
                  <input name="charges" type="number" className="input-field" placeholder="0.00" defaultValue="0" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Remarks</label>
                <input name="remarks" className="input-field" placeholder="Optional notes" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isDuplicateTx || isSubmitting}
                  className="btn-primary px-8 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    )}
  </div>
);
}
