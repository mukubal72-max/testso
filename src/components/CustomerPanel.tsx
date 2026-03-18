import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  History, 
  CreditCard, 
  ShieldCheck, 
  FileText, 
  Camera, 
  LogOut, 
  ChevronRight,
  IndianRupee,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  X,
  Package
} from 'lucide-react';
import { format, addMonths, isAfter, isBefore } from 'date-fns';

interface CustomerPanelProps {
  user: any;
  onLogout: () => void;
}

import { supabase } from '../lib/supabase';

export default function CustomerPanel({ user, onLogout }: CustomerPanelProps) {
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'loans' | 'payments' | 'kyc' | 'docs'>('dashboard');
  const [loans, setLoans] = React.useState<any[]>([]);
  const [payments, setPayments] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedLoan, setSelectedLoan] = React.useState<any>(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: loansData, error: lError } = await supabase
        .from('loans')
        .select('*')
        .eq('customer_id', user.id);
      
      if (lError) throw lError;

      const { data: paymentsData, error: pError } = await supabase
        .from('payments')
        .select('*, loans(loan_number)')
        .eq('customer_id', user.id);
      
      if (pError) throw pError;

      const { data: itemsData, error: iError } = await supabase
        .from('items')
        .select('*')
        .eq('customer_id', user.id);
      
      if (iError) throw iError;

      setLoans(loansData?.map(l => ({ ...l, amount: l.loan_amount })) || []);
      setPayments(paymentsData?.map(p => ({ 
        ...p, 
        loan_number: p.loans?.loan_number,
        date: p.payment_date,
        type: p.payment_type
      })) || []);
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClosureRequest = async (loanId: number) => {
    if (!confirm('Are you sure you want to request loan closure? Admin will review your request.')) return;
    
    try {
      const { error } = await supabase
        .from('loans')
        .update({ closure_requested: true })
        .eq('id', loanId);
      
      if (error) throw error;

      alert('Closure request sent successfully!');
      fetchData();
    } catch (error: any) {
      console.error('Closure request error:', error);
      alert('Failed to send closure request: ' + error.message);
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser or context.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      const message = err.name === 'NotAllowedError' 
        ? "Camera permission denied. Please allow camera access in your browser settings."
        : "Could not access camera: " + err.message;
      alert(message);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const calculateInterest = (loan: any) => {
    const principal = loan.amount;
    const rate = loan.interest_rate;
    const startDate = new Date(loan.start_date);
    const today = new Date();
    const months = Math.max(1, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    
    let interest = 0;
    if (loan.interest_type === 'simple') {
      interest = (principal * rate * months) / 100;
    } else {
      interest = principal * (Math.pow(1 + rate / 100, months) - 1);
    }
    
    // Penalty calculation
    let penalty = 0;
    if (isAfter(today, new Date(loan.maturity_date))) {
      const overdueDays = Math.ceil((today.getTime() - new Date(loan.maturity_date).getTime()) / (1000 * 60 * 60 * 24));
      penalty = (principal * (loan.penalty_rate || 2) * overdueDays) / (100 * 30);
    }

    return { interest, penalty, total: principal + interest + penalty };
  };

  const renderDashboard = () => {
    const activeLoans = loans.filter(l => l.status === 'active');
    const totalDue = activeLoans.reduce((sum, l) => sum + calculateInterest(l).total, 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Active Loans</p>
                <h3 className="text-2xl font-bold text-gray-900">{activeLoans.length}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Payable</p>
                <h3 className="text-2xl font-bold text-gray-900">₹{totalDue.toLocaleString()}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Next Payment</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {activeLoans.length > 0 ? format(new Date(activeLoans[0].maturity_date), 'dd MMM yyyy') : 'N/A'}
                </h3>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Active Loans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Loan ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Interest</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Maturity</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeLoans.map((loan) => {
                  const calc = calculateInterest(loan);
                  return (
                    <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{loan.loan_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">₹{loan.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{loan.interest_rate}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{format(new Date(loan.maturity_date), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          loan.closure_requested ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {loan.closure_requested ? 'Closure Requested' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={() => setSelectedLoan(loan)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderKYC = () => {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900">KYC Verification</h2>
              <p className="text-sm text-gray-500 mt-1">Complete your profile by uploading required documents</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              Pending Review
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">Aadhaar Card</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer group">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-blue-500" />
                <p className="text-sm text-gray-500">Click or drag to upload Aadhaar</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">PAN Card</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer group">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-blue-500" />
                <p className="text-sm text-gray-500">Click or drag to upload PAN</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">Live Photo</label>
              <div 
                onClick={startCamera}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer group"
              >
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-blue-500" />
                <p className="text-sm text-gray-500">Capture Live Photo</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700">Signature</label>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer group">
                <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-blue-500" />
                <p className="text-sm text-gray-500">Upload Digital Signature</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-end">
            <button className="px-8 py-3 bg-[#2C5AA0] text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-[#1e407a] transition-all">
              Submit for Verification
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#2C5AA0] rounded-xl flex items-center justify-center text-white font-bold">
              G
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Customer Portal</h1>
              <p className="text-xs text-gray-500">Welcome, {user.name}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'dashboard' ? 'bg-[#2C5AA0] text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-white hover:text-[#2C5AA0]'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('loans')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'loans' ? 'bg-[#2C5AA0] text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-white hover:text-[#2C5AA0]'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            My Loans
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'payments' ? 'bg-[#2C5AA0] text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-white hover:text-[#2C5AA0]'
            }`}
          >
            <History className="w-5 h-5" />
            Payment History
          </button>
          <button 
            onClick={() => setActiveTab('kyc')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'kyc' ? 'bg-[#2C5AA0] text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-white hover:text-[#2C5AA0]'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            KYC Status
          </button>
          <button 
            onClick={() => setActiveTab('docs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'docs' ? 'bg-[#2C5AA0] text-white shadow-lg shadow-blue-100' : 'text-gray-500 hover:bg-white hover:text-[#2C5AA0]'
            }`}
          >
            <FileText className="w-5 h-5" />
            Legal Documents
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2C5AA0]"></div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'kyc' && renderKYC()}
              {activeTab === 'loans' && (
                <div className="space-y-6">
                  {loans.map(loan => (
                    <div key={loan.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Loan {loan.loan_number}</h3>
                          <p className="text-sm text-gray-500">Disbursed on {format(new Date(loan.start_date), 'dd MMM yyyy')}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          loan.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {loan.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Principal</p>
                          <p className="text-lg font-bold text-gray-900">₹{loan.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Interest Rate</p>
                          <p className="text-lg font-bold text-gray-900">{loan.interest_rate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Total Due</p>
                          <p className="text-lg font-bold text-[#2C5AA0]">₹{calculateInterest(loan).total.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Maturity</p>
                          <p className="text-lg font-bold text-gray-900">{format(new Date(loan.maturity_date), 'dd MMM yyyy')}</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button 
                          onClick={() => setSelectedLoan(loan)}
                          className="flex-1 py-3 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                        >
                          <Package className="w-5 h-5" />
                          View Pledged Items
                        </button>
                        {loan.status === 'active' && !loan.closure_requested && (
                          <button 
                            onClick={() => handleClosureRequest(loan.id)}
                            className="flex-1 py-3 bg-[#2C5AA0] text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-[#1e407a] transition-all"
                          >
                            Request Loan Closure
                          </button>
                        )}
                        {loan.closure_requested && (
                          <div className="flex-1 py-3 bg-amber-50 text-amber-700 font-bold rounded-xl flex items-center justify-center gap-2">
                            <Clock className="w-5 h-5" />
                            Closure Pending Approval
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'payments' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Payment History</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Loan ID</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mode</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{format(new Date(payment.date), 'dd MMM yyyy')}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{payment.loan_number}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-emerald-600 font-bold">₹{payment.amount.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 uppercase text-xs">{payment.mode}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 capitalize">{payment.type.replace('_', ' ')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button 
                                onClick={() => alert('Payment receipt download feature coming soon!')}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === 'docs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div 
                    onClick={() => alert('Document download feature coming soon!')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Loan Agreement</h3>
                        <p className="text-xs text-gray-500">Standard terms and conditions</p>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                  </div>
                  <div 
                    onClick={() => alert('Document download feature coming soon!')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Pledge Certificate</h3>
                        <p className="text-xs text-gray-500">Proof of item security</p>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-gray-400 group-hover:text-emerald-600" />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Loan Items Modal */}
      <AnimatePresence>
        {selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900">Pledged Items - {selectedLoan.loan_number}</h3>
                <button onClick={() => setSelectedLoan(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                  {items.filter(i => i.loan_id === selectedLoan.id).map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-gray-900 capitalize">{item.type}</h4>
                          <p className="text-xs text-gray-500">Packet: {item.packet_number}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">
                          {item.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 text-[10px] uppercase font-bold">Purity</p>
                          <p className="font-medium">{item.purity}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-[10px] uppercase font-bold">Net Weight</p>
                          <p className="font-medium">{item.net_weight}g</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-[10px] uppercase font-bold">Valuation</p>
                          <p className="font-medium">₹{item.valuation.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setSelectedLoan(null)}
                  className="px-6 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Capture Photo</h3>
                <button onClick={stopCamera} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="aspect-video bg-black rounded-2xl overflow-hidden relative">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <div className="mt-6 flex gap-4">
                  <button 
                    onClick={stopCamera}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      alert('Photo captured successfully!');
                      stopCamera();
                    }}
                    className="flex-1 py-3 bg-[#2C5AA0] text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-[#1e407a] transition-all flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Capture
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
