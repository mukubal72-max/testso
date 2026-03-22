import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  UserPlus, 
  Filter, 
  MoreVertical, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  X, 
  Camera, 
  Upload, 
  FileText, 
  UserMinus, 
  List, 
  BookOpen, 
  CheckCircle2,
  Users,
  Printer,
  Download,
  Trash2,
  User,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addMonths, isBefore, differenceInDays } from 'date-fns';
import { exportToPDF, printTable } from '../lib/exportUtils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const submenus = [
  { id: 'add', label: 'Add New Customer', icon: UserPlus },
  { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck },
  { id: 'list', label: 'Customer List', icon: List },
  { id: 'ledger', label: 'Customer Ledger', icon: BookOpen },
  { id: 'blacklist', label: 'Blacklisted / Defaulters', icon: UserMinus },
];

const CameraCapture = ({ onCapture, onClose }: { onCapture: (base64: string) => void, onClose: () => void }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser or context.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      const message = err.name === 'NotAllowedError' 
        ? "Camera permission denied. Please allow camera access in your browser settings."
        : "Could not access camera: " + err.message;
      alert(message);
      onClose();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg');
      onCapture(base64);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Capture Photo</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <div className="aspect-video bg-black rounded-2xl overflow-hidden relative">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="mt-6 flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={capture}
              className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <Camera size={20} />
              Capture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FileUpload = ({ label, name, value, onFileChange }: { label: string, name: string, value?: string, onFileChange: (name: string, value: string) => void }) => {
  const [preview, setPreview] = React.useState<string | null>(value || null);
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);

  React.useEffect(() => {
    if (value) setPreview(value);
  }, [value]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreview(base64);
        onFileChange(name, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-4">
        <div 
          onClick={() => setIsCameraOpen(true)}
          className="relative w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center overflow-hidden bg-gray-50 hover:border-primary transition-all group cursor-pointer"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-gray-400 group-hover:text-primary">
              <Camera size={20} />
              <span className="text-[10px] mt-1">Capture</span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="relative">
            <input 
              type="file" 
              onChange={handleFile}
              className="hidden" 
              id={`file-${name}`}
              accept="image/*,application/pdf"
            />
            <label 
              htmlFor={`file-${name}`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-all"
            >
              <Upload size={16} />
              Upload Document
            </label>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">JPG, PNG or PDF (Max 2MB)</p>
        </div>
      </div>
      {isCameraOpen && (
        <CameraCapture 
          onCapture={(base64) => {
            setPreview(base64);
            onFileChange(name, base64);
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
};

export default function CustomerManagement() {
  const [activeTab, setActiveTab] = React.useState('list');
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [formData, setFormData] = React.useState<any>({
    attachments: []
  });
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);
  const [customerLoans, setCustomerLoans] = React.useState<any[]>([]);
  const [customerPayments, setCustomerPayments] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [viewingDoc, setViewingDoc] = React.useState<{ title: string, url: string } | null>(null);
  const [isCameraOpenForAttachments, setIsCameraOpenForAttachments] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<any>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const [settings, setSettings] = React.useState<any>(null);

  React.useEffect(() => {
    fetchCustomers();
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

  React.useEffect(() => {
    async function fetchCustomerData() {
      if (selectedCustomer) {
        console.log('Fetching data for customer:', selectedCustomer.id);
        try {
          const { data: loans, error: lError } = await supabase
            .from('loans')
            .select('*')
            .eq('customer_id', selectedCustomer.id);
          
          if (lError) throw lError;
          console.log('Fetched loans:', loans?.length || 0);
          setCustomerLoans(loans || []);

          const { data: payments, error: pError } = await supabase
            .from('payments')
            .select('*, loans!inner(loan_number, customer_id)')
            .eq('loans.customer_id', selectedCustomer.id);
          
          if (pError) throw pError;
          console.log('Fetched payments:', payments?.length || 0);
          setCustomerPayments(payments || []);
        } catch (err) {
          console.error('Error fetching customer data:', err);
        }
      }
    }
    fetchCustomerData();
  }, [selectedCustomer]);

  const ledgerTransactions = React.useMemo(() => {
    if (!selectedCustomer) return [];
    
    const transactions: any[] = [];
    
    console.log('Calculating ledger for:', selectedCustomer.full_name);
    console.log('Loans count:', customerLoans.length);
    console.log('Payments count:', customerPayments.length);

    // 1. Add Loan Disbursements
    customerLoans.forEach(l => {
      const principal = l.loan_amount || l.amount || 0;
      transactions.push({
        date: l.start_date || l.loan_date,
        type: 'Loan Disbursement',
        ref: l.loan_number,
        debit: principal,
        credit: 0,
        remarks: `Principal Amount: ₹${principal.toLocaleString()} @ ${l.interest_rate}% p.m.`
      });

      // 2. Generate Monthly Interest Accruals
      const startDate = new Date(l.start_date || l.loan_date);
      const endDate = new Date();
      const monthlyInterest = (principal * (l.interest_rate || 0)) / 100;
      
      let currentAccrualDate = addMonths(startDate, 1);
      while (isBefore(currentAccrualDate, endDate) || format(currentAccrualDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
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
    customerPayments.forEach(p => {
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
    const processed = transactions.map((t: any) => {
      runningBalance += (t.debit - t.credit);
      return {
        ...t,
        balance: runningBalance
      };
    });

    console.log('Total ledger transactions:', processed.length);
    return processed;
  }, [selectedCustomer, customerLoans, customerPayments]);

  const handleFileChange = (name: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const formValues = Object.fromEntries(data.entries());
    
    const finalData: any = {
      full_name: formValues.name,
      mobile_number: formValues.mobile,
      nominee_name: formValues.nominee,
      full_address: formValues.address,
      aadhaar_number: formValues.aadhaar,
      pan_number: formValues.pan,
      photo_url: formData.photo,
      aadhaar_card_url: formData.aadhaar_proof,
      pan_card_url: formData.pan_proof,
      signature_url: formData.signature,
      nominee_id_proof_url: formData.nominee_proof,
      other_attachments: JSON.stringify(formData.attachments || []),
      status: 'active',
      kyc_status: 'pending',
      registration_complete: true
    };

    if (formValues.username) finalData.portal_user_id = formValues.username;
    if (formValues.password) finalData.portal_password = formValues.password;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([finalData])
        .select();

      if (error) throw error;

      alert('Customer registered successfully!');
      setActiveTab('list');
      fetchCustomers();
    } catch (err: any) {
      console.error('Registration error:', err);
      alert('Registration failed: ' + err.message);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const name = c.full_name || '';
    const mobile = c.mobile_number || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || mobile.includes(search);
    if (activeTab === 'blacklist') return matchesSearch && c.status === 'blacklisted';
    if (activeTab === 'kyc') return matchesSearch; // Show all for KYC verification
    return matchesSearch;
  });

  const handlePrintCustomers = () => {
    const headers = ['ID', 'Name', 'Mobile', 'Address', 'Status'];
    const data = customers.map(c => [
      `CUST-${c.id.toString().padStart(4, '0')}`,
      c.full_name,
      c.mobile_number,
      c.full_address || 'N/A',
      c.status
    ]);
    printTable('Customer List', headers, data, settings);
  };

  const handleDownloadCustomers = () => {
    const headers = ['ID', 'Name', 'Mobile', 'Address', 'Status'];
    const data = customers.map(c => [
      `CUST-${c.id.toString().padStart(4, '0')}`,
      c.full_name,
      c.mobile_number,
      c.full_address || 'N/A',
      c.status
    ]);
    exportToPDF('Customer List', headers, data, 'Customer_List', settings);
  };

  const updateCustomerStatus = async (id: number, status: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCustomers(prev => prev.filter(c => c.id !== id));
      alert('Customer deleted successfully');
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      alert('Failed to delete customer: ' + err.message);
    }
  };

  const handlePrintLedger = () => {
    if (!selectedCustomer) return;
    const headers = ['Date', 'Type', 'Reference', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)', 'Remarks'];
    const data = ledgerTransactions.map(tx => [
      format(new Date(tx.date), 'dd MMM yyyy'),
      tx.type,
      tx.ref,
      tx.debit > 0 ? tx.debit.toLocaleString() : '-',
      tx.credit > 0 ? tx.credit.toLocaleString() : '-',
      tx.balance.toLocaleString(),
      tx.remarks || '-'
    ]);

    printTable(`Customer Ledger - ${selectedCustomer.full_name}`, headers, data, settings);
  };

  const handleDownloadLedger = () => {
    if (!selectedCustomer) return;
    const headers = ['Date', 'Type', 'Reference', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)', 'Remarks'];
    const data = ledgerTransactions.map(tx => [
      format(new Date(tx.date), 'dd MMM yyyy'),
      tx.type,
      tx.ref,
      tx.debit > 0 ? tx.debit.toLocaleString() : '-',
      tx.credit > 0 ? tx.credit.toLocaleString() : '-',
      tx.balance.toLocaleString(),
      tx.remarks || '-'
    ]);

    exportToPDF(`Customer Ledger - ${selectedCustomer.full_name}`, headers, data, `Ledger_${selectedCustomer.full_name}`, settings);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const formValues = Object.fromEntries(data.entries());
    
    const finalData: any = {
      full_name: formValues.name,
      mobile_number: formValues.mobile,
      nominee_name: formValues.nominee,
      full_address: formValues.address,
      aadhaar_number: formValues.aadhaar,
      pan_number: formValues.pan,
      photo_url: formData.photo || editingCustomer.photo_url,
      aadhaar_card_url: formData.aadhaar_proof || editingCustomer.aadhaar_card_url,
      pan_card_url: formData.pan_proof || editingCustomer.pan_card_url,
      signature_url: formData.signature || editingCustomer.signature_url,
      nominee_id_proof_url: formData.nominee_proof || editingCustomer.nominee_id_proof_url,
      other_attachments: JSON.stringify(formData.attachments || JSON.parse(editingCustomer.other_attachments || '[]')),
    };

    if (formValues.username) finalData.portal_user_id = formValues.username;
    if (formValues.password) finalData.portal_password = formValues.password;
    
    try {
      const { error } = await supabase
        .from('customers')
        .update(finalData)
        .eq('id', editingCustomer.id);

      if (error) throw error;

      alert('Customer updated successfully!');
      setIsEditModalOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      console.error('Update error:', err);
      alert('Update failed: ' + err.message);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">Customer Management</h1>
          <p className="text-gray-500 mt-1">KYC, Ledgers, and Defaulter Tracking</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {submenus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => {
                setActiveTab(menu.id);
                if (menu.id !== 'ledger') setSelectedCustomer(null);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === menu.id 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-primary"
              )}
            >
              <menu.icon size={16} />
              {menu.label}
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'add' && (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card p-8"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <UserPlus className="text-primary" />
                Register New Customer
              </h2>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Customer ID</p>
                <p className="text-lg font-bold text-primary">AUTO-GEN</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-3">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    Basic Information
                  </h3>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Customer Full Name</label>
                  <input name="name" required className="input-field" placeholder="e.g. Rajesh Kumar" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Mobile Number</label>
                  <input name="mobile" required className="input-field" placeholder="e.g. 9876543210" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nominee Name</label>
                  <input name="nominee" className="input-field" placeholder="e.g. Sneha Kumar" />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <label className="text-sm font-medium">Full Address</label>
                  <textarea name="address" className="input-field h-24" placeholder="Enter full permanent address"></textarea>
                </div>
              </div>

              {/* KYC Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={14} />
                    Identity Proofs
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Aadhaar Number</label>
                      <input name="aadhaar" className="input-field" placeholder="12-digit Aadhaar" />
                    </div>
                    <FileUpload label="Aadhaar Capture / Upload" name="aadhaar_proof" value={formData.aadhaar_proof} onFileChange={handleFileChange} />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">PAN Number (Optional)</label>
                      <input name="pan" className="input-field" placeholder="10-digit PAN" />
                    </div>
                    <FileUpload label="PAN Capture / Upload" name="pan_proof" value={formData.pan_proof} onFileChange={handleFileChange} />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Camera size={14} />
                    Biometrics & Verification
                  </h3>
                  <FileUpload label="Live Photo Capture" name="photo" value={formData.photo} onFileChange={handleFileChange} />
                  <FileUpload label="Signature Capture" name="signature" value={formData.signature} onFileChange={handleFileChange} />
                  <FileUpload label="Nominee ID Proof" name="nominee_proof" value={formData.nominee_proof} onFileChange={handleFileChange} />
                </div>
              </div>

              {/* Portal Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} />
                    Portal Access (Optional)
                  </h3>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Portal User ID</label>
                  <input name="username" className="input-field" placeholder="e.g. rajesh123" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Portal Password</label>
                  <input name="password" type="password" className="input-field" placeholder="Set a secure password" />
                </div>
              </div>

              {/* Additional Attachments */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} />
                  Other Attachments (Utility Bills, etc.)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.attachments?.map((file: any, index: number) => (
                    <div key={index} className="relative group border border-gray-200 rounded-xl p-3 bg-white flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded flex items-center justify-center text-primary overflow-hidden">
                        {file.data && file.data.startsWith('data:image') ? (
                          <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                        ) : (
                          <FileText size={20} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400">Uploaded</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setFormData((prev: any) => ({
                            ...prev,
                            attachments: prev.attachments.filter((_: any, i: number) => i !== index)
                          }));
                        }}
                        className="p-1 text-gray-400 hover:text-rose-500 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 w-full col-span-full">
                    <label className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group">
                      <Upload className="text-gray-400 group-hover:text-primary" size={24} />
                      <span className="text-xs font-bold text-gray-500 group-hover:text-primary text-center">Add Document</span>
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormData((prev: any) => ({
                                ...prev,
                                attachments: [...(prev.attachments || []), { name: file.name, data: reader.result as string }]
                              }));
                            };
                            reader.readAsDataURL(file);
                          });
                        }}
                      />
                    </label>
                    <button 
                      type="button"
                      onClick={() => setIsCameraOpenForAttachments(true)}
                      className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group"
                    >
                      <Camera className="text-gray-400 group-hover:text-primary" size={24} />
                      <span className="text-xs font-bold text-gray-500 group-hover:text-primary text-center">Capture Photo</span>
                    </button>
                  </div>
                </div>
              </div>

              {isCameraOpenForAttachments && (
                <CameraCapture 
                  onCapture={(base64) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      attachments: [...(prev.attachments || []), { name: `Capture_${Date.now()}.jpg`, data: base64 }]
                    }));
                  }}
                  onClose={() => setIsCameraOpenForAttachments(false)}
                />
              )}

              <div className="flex justify-end gap-4 pt-8 border-t border-gray-100">
                <button type="button" onClick={() => setActiveTab('list')} className="px-8 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" className="btn-primary px-12 py-3 flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  Complete Registration
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {(activeTab === 'list' || activeTab === 'blacklist' || activeTab === 'kyc') && (
          <motion.div
            key="customer-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex w-full md:flex-1 gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by name or mobile..." 
                    className="input-field pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="btn-primary px-4 flex items-center gap-2">
                  <Search size={18} />
                  Search
                </button>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button 
                  onClick={handlePrintCustomers}
                  className="flex-1 md:flex-none p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center"
                  title="Print List"
                >
                  <Printer size={18} />
                </button>
                <button 
                  onClick={handleDownloadCustomers}
                  className="flex-1 md:flex-none p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center"
                  title="Download PDF"
                >
                  <Download size={18} />
                </button>
                <button className="flex-1 md:flex-none px-4 py-2 border border-gray-200 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50">
                  <Filter size={18} />
                  Filters
                </button>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">Customer</th>
                      <th className="px-6 py-4 font-bold">Mobile</th>
                      <th className="px-6 py-4 font-bold text-center">Aadhaar</th>
                      <th className="px-6 py-4 font-bold text-center">PAN</th>
                      <th className="px-6 py-4 font-bold text-center">Photo</th>
                      <th className="px-6 py-4 font-bold text-center">Signature</th>
                      <th className="px-6 py-4 font-bold text-center">Docs</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={9} className="py-20 text-center text-gray-500">Loading customers...</td>
                      </tr>
                    ) : filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50 transition-all">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm overflow-hidden">
                                {customer.photo_url ? (
                                  <img src={customer.photo_url} alt={customer.full_name} className="w-full h-full object-cover" />
                                ) : (
                                  customer.full_name.charAt(0)
                                )}
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-gray-900">{customer.full_name}</h3>
                                <p className="text-[10px] text-gray-400">ID: CUST-{customer.id.toString().padStart(4, '0')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{customer.mobile_number}</td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => customer.aadhaar_card_url && setViewingDoc({ title: 'Aadhaar Proof', url: customer.aadhaar_card_url })}
                              className={cn(
                                "p-1.5 rounded-full transition-all mx-auto flex items-center justify-center",
                                customer.aadhaar_card_url ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 cursor-pointer" : "text-gray-300 bg-gray-50 cursor-not-allowed"
                              )}
                              title="Aadhaar"
                            >
                              {customer.aadhaar_card_url ? <CheckCircle2 size={16} /> : <X size={16} />}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => customer.pan_card_url && setViewingDoc({ title: 'PAN Proof', url: customer.pan_card_url })}
                              className={cn(
                                "p-1.5 rounded-full transition-all mx-auto flex items-center justify-center",
                                customer.pan_card_url ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 cursor-pointer" : "text-gray-300 bg-gray-50 cursor-not-allowed"
                              )}
                              title="PAN"
                            >
                              {customer.pan_card_url ? <CheckCircle2 size={16} /> : <X size={16} />}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => customer.photo_url && setViewingDoc({ title: 'Customer Photo', url: customer.photo_url })}
                              className={cn(
                                "p-1.5 rounded-full transition-all mx-auto flex items-center justify-center",
                                customer.photo_url ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 cursor-pointer" : "text-gray-300 bg-gray-50 cursor-not-allowed"
                              )}
                              title="Photo"
                            >
                              {customer.photo_url ? <CheckCircle2 size={16} /> : <X size={16} />}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => customer.signature_url && setViewingDoc({ title: 'Signature', url: customer.signature_url })}
                              className={cn(
                                "p-1.5 rounded-full transition-all mx-auto flex items-center justify-center",
                                customer.signature_url ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 cursor-pointer" : "text-gray-300 bg-gray-50 cursor-not-allowed"
                              )}
                              title="Signature"
                            >
                              {customer.signature_url ? <CheckCircle2 size={16} /> : <X size={16} />}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-1">
                              {(() => {
                                try {
                                  const attachments = JSON.parse(customer.other_attachments || '[]');
                                  return attachments.length > 0 ? (
                                    <button 
                                      onClick={() => setViewingDoc({ title: attachments[0].name, url: attachments[0].data })}
                                      className="p-1.5 rounded-full text-primary bg-primary/5 hover:bg-primary/10 transition-all"
                                      title={`${attachments.length} Other Documents`}
                                    >
                                      <FileText size={16} />
                                    </button>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  );
                                } catch (e) {
                                  return <span className="text-gray-300">-</span>;
                                }
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase",
                              customer.status === 'blacklisted' ? "bg-rose-50 text-rose-600" : 
                              customer.status === 'verified' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-600"
                            )}>
                              {customer.status === 'blacklisted' ? <UserMinus size={10} /> : <ShieldCheck size={10} />}
                              {customer.status}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {activeTab === 'kyc' && customer.status !== 'verified' && (
                                <button 
                                  onClick={() => updateCustomerStatus(customer.id, 'verified')}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="Verify KYC"
                                >
                                  <CheckCircle2 size={18} />
                                </button>
                              )}
                              {activeTab === 'list' && customer.status !== 'blacklisted' && (
                                <button 
                                  onClick={() => updateCustomerStatus(customer.id, 'blacklisted')}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Blacklist Customer"
                                >
                                  <UserMinus size={18} />
                                </button>
                              )}
                              {activeTab === 'blacklist' && (
                                <button 
                                  onClick={() => updateCustomerStatus(customer.id, 'active')}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="Whitelist Customer"
                                >
                                  <ShieldCheck size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setActiveTab('ledger');
                                }}
                                className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-all"
                                title="View Ledger"
                              >
                                <BookOpen size={18} />
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingCustomer(customer);
                                  setFormData({
                                    photo: customer.photo_url,
                                    aadhaar_proof: customer.aadhaar_card_url,
                                    pan_proof: customer.pan_card_url,
                                    signature: customer.signature_url,
                                    nominee_proof: customer.nominee_id_proof_url,
                                    attachments: JSON.parse(customer.other_attachments || '[]')
                                  });
                                  setIsEditModalOpen(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Edit Customer"
                              >
                                <FileText size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteCustomer(customer.id)}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Delete Customer"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-20 text-center">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300 mb-4">
                            <Users size={32} />
                          </div>
                          <h3 className="text-lg font-bold">No Customers Found</h3>
                          <p className="text-gray-500">Try adjusting your search or filters.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'ledger' && (
          <motion.div
            key="ledger-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {!selectedCustomer ? (
              <div className="card p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                  <BookOpen size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Select a Customer</h3>
                  <p className="text-gray-500">Please select a customer from the list to view their ledger.</p>
                </div>
                <button onClick={() => setActiveTab('list')} className="btn-primary px-6 py-2">Go to Customer List</button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="card p-6 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-bold">
                      {selectedCustomer.full_name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedCustomer.full_name}</h2>
                      <p className="text-gray-500">CUST-{selectedCustomer.id.toString().padStart(4, '0')} • {selectedCustomer.mobile_number}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-sm text-gray-400 hover:text-gray-600">Change Customer</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="card p-6 bg-primary text-white">
                    <p className="text-primary-foreground/70 text-sm font-medium">Total Loan Amount</p>
                    <h3 className="text-3xl font-bold mt-1">₹{customerLoans.reduce((sum, l) => sum + (l.loan_amount ?? 0), 0).toLocaleString()}</h3>
                  </div>
                  <div className="card p-6">
                    <p className="text-gray-500 text-sm font-medium">Active Loans</p>
                    <h3 className="text-3xl font-bold mt-1 text-text-dark">{customerLoans.filter(l => l.status === 'active').length}</h3>
                  </div>
                  <div className="card p-6">
                    <p className="text-gray-500 text-sm font-medium">Last Payment</p>
                    <h3 className="text-3xl font-bold mt-1 text-text-dark">
                      ₹{(customerPayments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]?.amount ?? 0).toLocaleString()}
                    </h3>
                  </div>
                </div>

                <div className="card overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Transaction History</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handlePrintLedger}
                        className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                        title="Print Ledger"
                      >
                        <Printer size={18} />
                      </button>
                      <button 
                        onClick={handleDownloadLedger}
                        className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                        title="Download PDF"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider">
                          <th className="px-6 py-4 font-bold">Date</th>
                          <th className="px-6 py-4 font-bold">Type</th>
                          <th className="px-6 py-4 font-bold">Reference / Mode</th>
                          <th className="px-6 py-4 font-bold">Remarks</th>
                          <th className="px-6 py-4 font-bold">Debit (₹)</th>
                          <th className="px-6 py-4 font-bold">Credit (₹)</th>
                          <th className="px-6 py-4 font-bold">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ledgerTransactions
                          .slice()
                          .reverse()
                          .map((tx, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm">{format(new Date(tx.date), 'dd MMM yyyy')}</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                  tx.type.includes('Loan') ? "bg-blue-50 text-blue-600" : 
                                  tx.type.includes('Interest') ? "bg-amber-50 text-amber-600" :
                                  "bg-emerald-50 text-emerald-600"
                                )}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium">
                                <div className="flex flex-col">
                                  <span>{tx.ref}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                                {tx.remarks || '-'}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-rose-600">
                                {tx.debit > 0 ? `₹${tx.debit.toLocaleString()}` : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                                {tx.credit > 0 ? `₹${tx.credit.toLocaleString()}` : '-'}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold">
                                ₹{tx.balance.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        {ledgerTransactions.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-400">No transactions found for this customer.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Customer Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Edit Customer</h2>
                  <p className="text-gray-500">Update customer information and KYC</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                    <User size={18} className="text-primary" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                      <input name="name" defaultValue={editingCustomer.full_name} required className="input-field" placeholder="Enter full name" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Mobile Number</label>
                      <input name="mobile" defaultValue={editingCustomer.mobile_number} required className="input-field" placeholder="Enter mobile number" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Nominee Name</label>
                      <input name="nominee" defaultValue={editingCustomer.nominee_name} className="input-field" placeholder="Enter nominee name" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Full Address</label>
                      <textarea name="address" defaultValue={editingCustomer.full_address} className="input-field min-h-[80px]" placeholder="Enter full address"></textarea>
                    </div>
                  </div>
                </div>

                {/* KYC Documents */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                    <ShieldCheck size={18} className="text-primary" />
                    KYC Documents
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Aadhaar Number</label>
                      <input name="aadhaar" defaultValue={editingCustomer.aadhaar_number} className="input-field" placeholder="12-digit Aadhaar number" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">PAN Number</label>
                      <input name="pan" defaultValue={editingCustomer.pan_number} className="input-field" placeholder="10-digit PAN number" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FileUpload 
                      label="Customer Photo" 
                      name="photo"
                      value={formData.photo}
                      onFileChange={(name, data) => setFormData({ ...formData, photo: data })}
                    />
                    <FileUpload 
                      label="Aadhaar Proof" 
                      name="aadhaar_proof"
                      value={formData.aadhaar_proof}
                      onFileChange={(name, data) => setFormData({ ...formData, aadhaar_proof: data })}
                    />
                    <FileUpload 
                      label="PAN Proof" 
                      name="pan_proof"
                      value={formData.pan_proof}
                      onFileChange={(name, data) => setFormData({ ...formData, pan_proof: data })}
                    />
                    <FileUpload 
                      label="Signature" 
                      name="signature"
                      value={formData.signature}
                      onFileChange={(name, data) => setFormData({ ...formData, signature: data })}
                    />
                    <FileUpload 
                      label="Nominee ID Proof" 
                      name="nominee_proof"
                      value={formData.nominee_proof}
                      onFileChange={(name, data) => setFormData({ ...formData, nominee_proof: data })}
                    />
                  </div>
                </div>

                {/* Portal Credentials */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                    <Lock size={18} className="text-primary" />
                    Portal Credentials (Optional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Portal Username</label>
                      <input name="username" defaultValue={editingCustomer.portal_user_id} className="input-field" placeholder="Auto-generated if empty" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Portal Password</label>
                      <input name="password" defaultValue={editingCustomer.portal_password} className="input-field" placeholder="Auto-generated if empty" type="password" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary px-6">Cancel</button>
                  <button type="submit" className="btn-primary px-8">Update Customer</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {viewingDoc && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{viewingDoc.title}</h3>
                <button 
                  onClick={() => setViewingDoc(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-100 rounded-xl flex items-center justify-center p-4">
                {viewingDoc.url.startsWith('data:application/pdf') ? (
                  <iframe src={viewingDoc.url} className="w-full h-full min-h-[600px]" />
                ) : (
                  <img src={viewingDoc.url} alt={viewingDoc.title} className="max-w-full max-h-full object-contain shadow-lg" />
                )}
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <a 
                  href={viewingDoc.url} 
                  download={viewingDoc.title.replace(/\s+/g, '_')}
                  className="btn-primary px-6 py-2 flex items-center gap-2"
                >
                  <Download size={18} />
                  Download
                </a>
                <button 
                  onClick={() => setViewingDoc(null)}
                  className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
