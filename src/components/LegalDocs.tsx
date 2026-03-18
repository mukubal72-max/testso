import React from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Shield, 
  Scale, 
  Signature,
  CheckCircle2,
  ArrowRight,
  Upload,
  Plus,
  X,
  Search,
  FileUp,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { exportToPDF } from '../lib/exportUtils';

const docTemplates = [
  { id: 'loan_agreement', title: 'Loan Agreement', icon: FileText, category: 'Mandatory' },
  { id: 'girvi_receipt', title: 'Girvi Pledge Receipt', icon: Receipt, category: 'Mandatory' },
  { id: 'kyc_sheet', title: 'KYC Declaration', icon: Shield, category: 'Compliance' },
  { id: 'valuation_sheet', title: 'Item Valuation Sheet', icon: Scale, category: 'Internal' },
  { id: 'indemnity_form', title: 'Customer Indemnity', icon: Signature, category: 'Legal' },
  { id: 'release_letter', title: 'Release Letter', icon: CheckCircle2, category: 'Post-Loan' },
];

import { supabase } from '../lib/supabase';

export default function LegalDocs() {
  const [documents, setDocuments] = React.useState<any[]>([]);
  const [loans, setLoans] = React.useState<any[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = React.useState(false);
  const [viewingDoc, setViewingDoc] = React.useState<any>(null);
  const [editingDoc, setEditingDoc] = React.useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = React.useState<any>(null);
  const [selectedLoanId, setSelectedLoanId] = React.useState('');
  const [uploadData, setUploadData] = React.useState({
    title: '',
    type: 'other',
    loan_id: '',
    file: null as File | null
  });

  React.useEffect(() => {
    fetchDocs();
    fetchLoans();
  }, []);

  const fetchDocs = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*, loans(loan_number), customers(full_name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDocuments(data?.map(d => ({
        ...d,
        loan_number: d.loans?.loan_number,
        customer_name: d.customers?.full_name
      })) || []);
    } catch (err) {
      console.error('Error fetching docs:', err);
    }
  };

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*, customers(full_name)');
      
      if (error) throw error;
      setLoans(data?.map(l => ({
        ...l,
        customer_name: l.customers?.full_name,
        amount: l.loan_amount
      })) || []);
    } catch (err) {
      console.error('Error fetching loans:', err);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const loan = loans.find(l => l.id.toString() === uploadData.loan_id);
        
        const { error } = await supabase
          .from('documents')
          .insert([{
            loan_id: uploadData.loan_id ? Number(uploadData.loan_id) : null,
            customer_id: loan?.customer_id || null,
            title: uploadData.title,
            type: uploadData.type,
            source: 'uploaded',
            file_data: base64
          }]);

        if (error) throw error;

        setIsUploadModalOpen(false);
        setUploadData({ title: '', type: 'other', loan_id: '', file: null });
        fetchDocs();
      } catch (error: any) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
      }
    };
    reader.readAsDataURL(uploadData.file);
  };

  const handleGenerateDoc = async () => {
    if (!selectedLoanId || !selectedTemplate) return;

    const loan = loans.find(l => l.id.toString() === selectedLoanId);
    if (!loan) return;

    // Generate PDF content
    const title = `${selectedTemplate.title} - ${loan.loan_number}`;
    const headers = ['Field', 'Value'];
    const data = [
      ['Loan Number', loan.loan_number],
      ['Customer Name', loan.customer_name],
      ['Principal Amount', `₹${loan.amount.toLocaleString()}`],
      ['Interest Rate', `${loan.interest_rate}% / month`],
      ['Start Date', format(new Date(loan.start_date), 'dd MMM yyyy')],
      ['Maturity Date', format(new Date(loan.maturity_date), 'dd MMM yyyy')],
      ['Status', loan.status],
    ];

    exportToPDF(title, headers, data, title.replace(/\s+/g, '_'));

    try {
      const { error } = await supabase
        .from('documents')
        .insert([{
          loan_id: Number(selectedLoanId),
          customer_id: loan.customer_id,
          title: title,
          type: selectedTemplate.id,
          source: 'generated',
          file_data: 'GENERATED_PDF_CONTENT'
        }]);

      if (error) throw error;

      setIsGenerateModalOpen(false);
      setSelectedLoanId('');
      fetchDocs();
    } catch (error: any) {
      console.error('Generation error:', error);
      alert('Failed to save generated document: ' + error.message);
    }
  };

  const handleUpdateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          title: editingDoc.title,
          type: editingDoc.type,
          loan_id: editingDoc.loan_id ? Number(editingDoc.loan_id) : null
        })
        .eq('id', editingDoc.id);

      if (error) throw error;

      setEditingDoc(null);
      fetchDocs();
    } catch (error: any) {
      console.error('Update error:', error);
      alert('Update failed: ' + error.message);
    }
  };

  const downloadDoc = (doc: any) => {
    if (doc.source === 'generated') {
      // Re-generate the PDF for download if it was generated
      const headers = ['Field', 'Value'];
      const data = [
        ['Loan Number', doc.loan_number || 'N/A'],
        ['Customer Name', doc.customer_name || 'N/A'],
        ['Document Type', doc.type.replace('_', ' ').toUpperCase()],
        ['Generated Date', format(new Date(doc.created_at), 'dd MMM yyyy')],
      ];
      exportToPDF(doc.title, headers, data, doc.title.replace(/\s+/g, '_'));
      return;
    }
    
    if (!doc.file_data) return;
    
    const link = document.createElement('a');
    link.href = doc.file_data;
    link.download = doc.title;
    link.click();
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">Legal Documentation</h1>
          <p className="text-gray-500 mt-1">Generate and manage legally compliant agreements</p>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload size={18} />
          Upload Document
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {docTemplates.map((doc) => (
          <motion.div 
            key={doc.id}
            whileHover={{ y: -5 }}
            className="card p-6 flex flex-col justify-between group"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-3 rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <doc.icon size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                  {doc.category}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-lg">{doc.title}</h3>
                <p className="text-xs text-gray-500 mt-1">Auto-fills with customer and loan data</p>
              </div>
            </div>
            
            <div className="mt-8 flex gap-2">
              <button 
                onClick={() => {
                  setSelectedTemplate(doc);
                  setIsGenerateModalOpen(true);
                }}
                className="flex-1 btn-primary py-2 text-sm flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Generate
              </button>
              <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-primary transition-all">
                <Printer size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Document Archive */}
      <div className="card">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg">Document Archive</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">Document Name</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Loan Ref</th>
                <th className="px-6 py-4 font-bold">Customer</th>
                <th className="px-6 py-4 font-bold">Date</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        doc.source === 'generated' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                      )}>
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{doc.title}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{doc.source}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500 capitalize">{doc.type.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-primary">{doc.loan_number || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium">{doc.customer_name || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {format(new Date(doc.created_at), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setViewingDoc(doc)}
                        className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-primary transition-all"
                        title="View"
                      >
                        <ArrowRight size={16} />
                      </button>
                      <button 
                        onClick={() => setEditingDoc({ ...doc })}
                        className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-primary transition-all"
                        title="Edit"
                      >
                        <Plus size={16} className="rotate-45" />
                      </button>
                      <button 
                        onClick={() => downloadDoc(doc)}
                        className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-primary transition-all"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center text-gray-400">
                      <FileUp size={48} className="mb-4 opacity-20" />
                      <p>No documents found in archive</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {viewingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">{viewingDoc.title}</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                    {viewingDoc.type.replace('_', ' ')} • {viewingDoc.source}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => downloadDoc(viewingDoc)}
                    className="p-2 hover:bg-gray-100 rounded-full text-primary"
                    title="Download"
                  >
                    <Download size={20} />
                  </button>
                  <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-8 bg-gray-50 flex justify-center">
                {viewingDoc.file_data && viewingDoc.file_data !== 'GENERATED_PDF_CONTENT' ? (
                  <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-8">
                    {viewingDoc.file_data.startsWith('data:image') ? (
                      <img src={viewingDoc.file_data} alt={viewingDoc.title} className="w-full h-auto" />
                    ) : viewingDoc.file_data.startsWith('data:application/pdf') ? (
                      <iframe src={viewingDoc.file_data} className="w-full h-[600px]" title={viewingDoc.title} />
                    ) : (
                      <div className="p-12 text-center text-gray-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Document content cannot be previewed directly.</p>
                        <button onClick={() => downloadDoc(viewingDoc)} className="mt-4 text-primary font-bold hover:underline">
                          Download to View
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full max-w-2xl bg-white shadow-lg rounded-lg p-12 space-y-8">
                    <div className="text-center border-b pb-8">
                      <h2 className="text-2xl font-bold uppercase tracking-tighter">{viewingDoc.title}</h2>
                      <p className="text-gray-500 mt-2">Girvi Management System - Legal Document</p>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Loan Reference</p>
                          <p className="font-bold">{viewingDoc.loan_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Customer Name</p>
                          <p className="font-bold">{viewingDoc.customer_name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Date Generated</p>
                          <p className="font-bold">{format(new Date(viewingDoc.created_at), 'dd MMM yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Document ID</p>
                          <p className="font-bold">DOC-{viewingDoc.id.toString().padStart(4, '0')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-8 border-t">
                      <p className="text-sm text-gray-600 leading-relaxed italic">
                        This is a system-generated document summary. The full legal agreement contains standard terms and conditions as per the regulatory guidelines of Girvi lending.
                      </p>
                    </div>
                    <div className="flex justify-between pt-20">
                      <div className="text-center">
                        <div className="w-32 h-px bg-gray-300 mb-2"></div>
                        <p className="text-[10px] font-bold uppercase">Customer Signature</p>
                      </div>
                      <div className="text-center">
                        <div className="w-32 h-px bg-gray-300 mb-2"></div>
                        <p className="text-[10px] font-bold uppercase">Authorized Signatory</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">Edit Document Info</h3>
                <button onClick={() => setEditingDoc(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateDoc} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Document Title</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    value={editingDoc.title}
                    onChange={(e) => setEditingDoc({...editingDoc, title: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Document Type</label>
                  <select 
                    className="input-field"
                    value={editingDoc.type}
                    onChange={(e) => setEditingDoc({...editingDoc, type: e.target.value})}
                  >
                    <option value="id_proof">ID Proof</option>
                    <option value="address_proof">Address Proof</option>
                    <option value="loan_agreement">Loan Agreement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Link to Loan</label>
                  <select 
                    className="input-field"
                    value={editingDoc.loan_id || ''}
                    onChange={(e) => setEditingDoc({...editingDoc, loan_id: e.target.value})}
                  >
                    <option value="">None</option>
                    {loans.map(loan => (
                      <option key={loan.id} value={loan.id}>{loan.loan_number} - {loan.customer_name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full btn-primary py-3 mt-4">
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">Upload Document</h3>
                <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleFileUpload} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Document Title</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Aadhaar Card, Signed Agreement"
                    value={uploadData.title}
                    onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Document Type</label>
                  <select 
                    className="input-field"
                    value={uploadData.type}
                    onChange={(e) => setUploadData({...uploadData, type: e.target.value})}
                  >
                    <option value="id_proof">ID Proof</option>
                    <option value="address_proof">Address Proof</option>
                    <option value="loan_agreement">Loan Agreement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Link to Loan (Optional)</label>
                  <select 
                    className="input-field"
                    value={uploadData.loan_id}
                    onChange={(e) => setUploadData({...uploadData, loan_id: e.target.value})}
                  >
                    <option value="">None</option>
                    {loans.map(loan => (
                      <option key={loan.id} value={loan.id}>{loan.loan_number} - {loan.customer_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Select File</label>
                  <input 
                    required
                    type="file" 
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    onChange={(e) => setUploadData({...uploadData, file: e.target.files?.[0] || null})}
                  />
                </div>
                <button type="submit" className="w-full btn-primary py-3 mt-4">
                  Upload to Archive
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generate Modal */}
      <AnimatePresence>
        {isGenerateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">Generate {selectedTemplate?.title}</h3>
                <button onClick={() => setIsGenerateModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="p-4 bg-primary/5 rounded-xl flex items-center gap-4">
                  <div className="p-3 bg-white rounded-lg text-primary shadow-sm">
                    {selectedTemplate && <selectedTemplate.icon size={24} />}
                  </div>
                  <div>
                    <p className="font-bold">{selectedTemplate?.title}</p>
                    <p className="text-xs text-gray-500">Will be pre-filled with loan details</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Select Loan</label>
                  <select 
                    className="input-field"
                    value={selectedLoanId}
                    onChange={(e) => setSelectedLoanId(e.target.value)}
                  >
                    <option value="">Select a loan...</option>
                    {loans.map(loan => (
                      <option key={loan.id} value={loan.id}>{loan.loan_number} - {loan.customer_name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                  <Shield className="text-amber-600 flex-shrink-0" size={20} />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    By generating this document, you confirm that all customer information is verified and legally accurate.
                  </p>
                </div>

                <button 
                  onClick={handleGenerateDoc}
                  disabled={!selectedLoanId}
                  className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Document
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
